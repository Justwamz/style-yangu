import { Router, type IRouter } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { db } from '../db'
import { configured, geminiText, geminiVision, imagenGenerate, parseJsonResponse } from '../lib/vertexai'

const router: IRouter = Router()

// ── Curated fallback suggestions (used when Vertex AI is not configured) ────

interface Suggestion {
  id: string
  outfit: string
  occasionTag: string
  stylistComment: string
  clothingTags: string[]
}

const FALLBACK_FEMALE: Suggestion[] = [
  { id: 'f1', outfit: 'White linen blouse, navy midi skirt, tan block heels', occasionTag: 'Smart Casual', stylistComment: 'This palette works beautifully with your warm undertone — the navy grounds the look while the white lifts it.', clothingTags: ['blouse', 'midi-skirt', 'heels'] },
  { id: 'f2', outfit: 'Floral kitenge wrap dress, nude sandals, gold hoop earrings', occasionTag: 'Weekend', stylistComment: 'The wrap silhouette is flattering and the warm print adds personality without overwhelming your proportions.', clothingTags: ['wrap-dress', 'sandals'] },
  { id: 'f3', outfit: 'Fitted blazer, high-waist trousers, pointed-toe flats', occasionTag: 'Business Casual', stylistComment: 'Sharp and effortless. The high waist creates a clean line that works beautifully for your body type.', clothingTags: ['blazer', 'trousers', 'flats'] },
]

const FALLBACK_MALE: Suggestion[] = [
  { id: 'm1', outfit: 'Fitted white shirt, slim navy chinos, brown leather loafers', occasionTag: 'Smart Casual', stylistComment: 'Clean lines and a neutral palette that complement your body type and skin tone perfectly.', clothingTags: ['shirt', 'chinos', 'loafers'] },
  { id: 'm2', outfit: 'Olive bomber jacket, black slim-fit jeans, white sneakers', occasionTag: 'Weekend', stylistComment: 'The olive works with your undertone — earthy tones complement your complexion well.', clothingTags: ['bomber-jacket', 'jeans', 'sneakers'] },
  { id: 'm3', outfit: 'Navy kitenge shirt, dark chinos, brown suede loafers', occasionTag: 'Smart Casual', stylistComment: 'The kitenge brings cultural flair without sacrificing the clean silhouette your frame wears well.', clothingTags: ['kitenge-shirt', 'chinos', 'loafers'] },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

async function getProfile(userId: string): Promise<Record<string, unknown>> {
  const r = await db.query(`SELECT profile FROM onboarding_profiles WHERE user_id = $1`, [userId])
  return r.rows[0]?.profile ?? {}
}

async function generateSuggestions(
  profile: Record<string, unknown>,
  count = 3,
): Promise<Suggestion[]> {
  const isKofi = profile.stylist === 'kofi'
  const fallback = (isKofi ? FALLBACK_MALE : FALLBACK_FEMALE).slice(0, count)

  if (!configured()) return fallback

  const bodyType = (profile.bodyType as string) ?? 'rectangle'
  const skin = profile.skinProfile as Record<string, string> | undefined
  const depth = skin?.depth ?? 'medium'
  const undertone = skin?.undertone ?? 'warm'
  const prefs = ((profile.stylePreferences as string[]) ?? []).join(', ') || 'smart casual, weekend'
  const tod = getTimeOfDay()

  const prompt = `You are ${isKofi ? 'Kofi' : 'Amara'}, a personal stylist for Kenyan fashion.
Generate ${count} outfit suggestion${count !== 1 ? 's' : ''} for a ${isKofi ? 'male' : 'female'} client:
- Body type: ${bodyType}
- Skin tone: ${depth}, ${undertone} undertone
- Style preferences: ${prefs}
- Time of day: ${tod}

Return ONLY a valid JSON array (no markdown, no extra text):
[{"id":"s1","outfit":"specific outfit description","occasionTag":"one occasion tag","stylistComment":"one sentence referencing their body type or skin tone","clothingTags":["tag1","tag2"]}]

Use Kenyan context: kitenge, kanga, leso fabrics; Nairobi neighbourhoods (Westlands, CBD, Kilimani, Karen); local occasions.`

  try {
    const raw = await geminiText(prompt)
    const parsed = parseJsonResponse<Suggestion[]>(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, count)
    return fallback
  } catch (err) {
    console.error('[suggestions] Gemini generation failed, using fallback:', err)
    return fallback
  }
}

// ── GET /consumer/profile ────────────────────────────────────────────────────

router.get('/consumer/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT profile FROM onboarding_profiles WHERE user_id = $1`,
      [req.userId],
    )
    if (!result.rows[0]) { res.status(404).json({ message: 'Profile not found' }); return }
    const p = result.rows[0].profile
    res.json({
      avatarUrl: p.avatarCartoonUrl ?? null,
      stylistName: p.stylist ?? 'amara',
      skinTone: p.skinProfile ?? null,
      bodyType: p.bodyType ?? null,
      shoeSize: { uk: p.shoeSizeUK ?? null, eu: p.shoeSizeEU ?? null },
      stylePrefs: p.stylePreferences ?? [],
      budget: p.budgets ?? {},
      location: { lat: p.lat ?? null, lon: p.lon ?? null },
      tier: 'free',
    })
  } catch (err) {
    console.error('[consumer/profile]', err)
    res.status(500).json({ message: 'Failed to load profile' })
  }
})

// ── GET /consumer/suggestion/daily ──────────────────────────────────────────
// Generates all 3 suggestions upfront on first daily visit (Gemini or curated fallback).
// Stores them all in DB; unlocks reveal them one by one — no extra AI calls per unlock.

router.get('/consumer/suggestion/daily', requireAuth, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const existing = await db.query(
      `SELECT suggestions, unlock_count, ads_watched, wardrobe_pairs_used
       FROM daily_suggestions WHERE user_id = $1 AND date = $2`,
      [req.userId, today],
    )

    if (existing.rows[0]) {
      const r = existing.rows[0]
      const allSuggestions = r.suggestions as Suggestion[]
      res.json({
        suggestions: allSuggestions.slice(0, r.unlock_count),
        unlockCount: r.unlock_count,
        adsWatched: r.ads_watched,
        wardrobePairsUsed: r.wardrobe_pairs_used,
        phase: 2,
      })
      return
    }

    const profile = await getProfile(req.userId!)
    const allThree = await generateSuggestions(profile, 3)

    await db.query(
      `INSERT INTO daily_suggestions (user_id, date, suggestions, unlock_count)
       VALUES ($1, $2, $3, 1)`,
      [req.userId, today, JSON.stringify(allThree)],
    )

    res.json({ suggestions: [allThree[0]], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
  } catch (err) {
    console.error('[consumer/suggestion/daily]', err)
    res.status(500).json({ message: 'Failed to load suggestions' })
  }
})

// ── POST /consumer/suggestion/unlock ────────────────────────────────────────

router.post('/consumer/suggestion/unlock', requireAuth, async (req: AuthRequest, res) => {
  const { method, wardrobeItemIds } = req.body
  if (!['ad', 'wardrobe'].includes(method)) {
    res.status(400).json({ message: 'Invalid unlock method' }); return
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    const row = await db.query(
      `SELECT suggestions, unlock_count, ads_watched, wardrobe_pairs_used
       FROM daily_suggestions WHERE user_id = $1 AND date = $2`,
      [req.userId, today],
    )
    if (!row.rows[0]) { res.status(400).json({ message: 'No suggestion session for today' }); return }

    const {
      suggestions,
      unlock_count: unlockCount,
      ads_watched: adsWatched,
      wardrobe_pairs_used: wardrobePairsUsed,
    } = row.rows[0]

    if (unlockCount >= 3) { res.json({ unlockCount: 3, remaining: 0, newSuggestion: null }); return }

    // All suggestions were pre-generated — just reveal the next one
    const allSuggestions = suggestions as Suggestion[]
    const next = allSuggestions[unlockCount] ?? allSuggestions.at(-1)

    if (method === 'ad') {
      if (adsWatched >= 2) { res.status(400).json({ message: 'Ad unlock limit reached' }); return }
      await db.query(
        `UPDATE daily_suggestions SET unlock_count = $1, ads_watched = $2 WHERE user_id = $3 AND date = $4`,
        [unlockCount + 1, adsWatched + 1, req.userId, today],
      )
    } else {
      if (!Array.isArray(wardrobeItemIds) || wardrobeItemIds.length !== 2) {
        res.status(400).json({ message: 'wardrobe unlock requires exactly 2 item IDs' }); return
      }
      if (wardrobePairsUsed >= 2) { res.status(400).json({ message: 'Wardrobe unlock limit reached' }); return }
      await db.query(
        `UPDATE daily_suggestions SET unlock_count = $1, wardrobe_pairs_used = $2 WHERE user_id = $3 AND date = $4`,
        [unlockCount + 1, wardrobePairsUsed + 1, req.userId, today],
      )
    }

    res.json({ unlockCount: unlockCount + 1, remaining: 3 - (unlockCount + 1), newSuggestion: next })
  } catch (err) {
    console.error('[consumer/suggestion/unlock]', err)
    res.status(500).json({ message: 'Failed to unlock suggestion' })
  }
})

// ── POST /consumer/avatar/generate ──────────────────────────────────────────
// Generates a cartoon avatar via Imagen 3 based on the user's onboarding profile.
// Required env vars: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_JSON

router.post('/consumer/avatar/generate', requireAuth, async (req: AuthRequest, res) => {
  if (!configured()) {
    res.status(503).json({ message: 'Avatar generation not configured — add Vertex AI credentials to enable.' })
    return
  }

  try {
    const profile = await getProfile(req.userId!)
    const bodyType = (profile.bodyType as string) ?? 'rectangle'
    const skin = profile.skinProfile as Record<string, string> | undefined
    const depth = skin?.depth ?? 'medium'
    const undertone = skin?.undertone ?? 'warm'
    const isKofi = profile.stylist === 'kofi'

    const depthLabel: Record<string, string> = {
      light: 'fair', light_medium: 'light brown', medium: 'medium brown',
      medium_deep: 'deep brown', deep: 'very deep brown',
    }
    const bodyLabel: Record<string, string> = {
      hourglass: 'balanced hourglass figure', pear: 'pear-shaped figure with wider hips',
      apple: 'fuller midsection apple figure', rectangle: 'athletic rectangular build',
      inverted_triangle: 'broad-shouldered inverted triangle build',
    }

    const prompt = `Fashion illustration of a ${isKofi ? 'young Kenyan man' : 'young Kenyan woman'} with ${depthLabel[depth] ?? 'medium brown'} skin and ${undertone} undertones, ${bodyLabel[bodyType] ?? 'average build'}. Stylized cartoon avatar, full body, relaxed neutral pose, simple neutral outfit in beige and white. Warm earthy Kenyan aesthetic, soft illustration style, clean cream background. Portrait orientation, professional character design.`

    const avatarUrl = await imagenGenerate(prompt)
    res.json({ avatarUrl })
  } catch (err) {
    console.error('[consumer/avatar/generate]', err)
    res.status(500).json({ message: 'Avatar generation failed — please try again.' })
  }
})

// ── POST /consumer/rate-outfit ───────────────────────────────────────────────
// Rates an outfit photo across 5 categories using Gemini Vision.
// Required env vars: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_JSON

router.post('/consumer/rate-outfit', requireAuth, async (req: AuthRequest, res) => {
  const { photoDataUrl } = req.body
  if (!photoDataUrl || typeof photoDataUrl !== 'string') {
    res.status(400).json({ message: 'photoDataUrl required' }); return
  }
  if (!configured()) {
    res.status(503).json({ message: 'Outfit rating not configured — add Vertex AI credentials to enable.' })
    return
  }

  try {
    const [header, b64] = photoDataUrl.split(',')
    if (!b64) { res.status(400).json({ message: 'Invalid image data URL' }); return }
    const mimeType = header.includes('png') ? 'image/png' : 'image/jpeg'

    const prompt = `You are a professional Kenyan fashion stylist. Rate this outfit across 5 categories scored 0-10:
- Colour Harmony: how well colours work together and suit the wearer
- Fit: how well the clothing fits
- Occasion Match: how appropriate for a Nairobi context
- Weather Match: suitability for typical Nairobi weather (20-28°C)
- Cohesion: how well all elements work as a complete look

Return ONLY valid JSON (no markdown):
{"scores":{"Colour Harmony":N,"Fit":N,"Occasion Match":N,"Weather Match":N,"Cohesion":N},"overall":N,"stylistFeedback":"one encouraging sentence with a specific actionable observation"}`

    const raw = await geminiVision(prompt, b64, mimeType)
    const result = parseJsonResponse<{
      scores: Record<string, number>
      overall: number
      stylistFeedback: string
    }>(raw)

    res.json(result)
  } catch (err) {
    console.error('[consumer/rate-outfit]', err)
    res.status(500).json({ message: 'Rating failed — please try again.' })
  }
})

// ── POST /consumer/fabric-design ────────────────────────────────────────────
// Two-phase endpoint:
//   Phase 1 — { photoDataUrl }             → analyze fabric → return analysis
//   Phase 2 — { garmentType, analysis }    → generate render → return { renderUrl, metres }
// Required env vars: GOOGLE_CLOUD_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_JSON

router.post('/consumer/fabric-design', requireAuth, async (req: AuthRequest, res) => {
  if (!configured()) {
    res.status(503).json({ message: 'Fabric design not configured — add Vertex AI credentials to enable.' })
    return
  }

  const { photoDataUrl, garmentType, analysis } = req.body

  if (garmentType && analysis) {
    // Phase 2: generate garment render from analysis + garment type
    try {
      const colours = Array.isArray(analysis.colours)
        ? (analysis.colours as string[]).join(', ')
        : 'mixed colours'
      const prompt = `Fashion product illustration: a ${garmentType} garment made from ${analysis.pattern ?? 'patterned'} fabric in ${colours}. ${analysis.texture ?? 'medium weight'}. East African / Kenyan fashion aesthetic. Full body front view, professional editorial style, clean white studio background, detailed fabric texture visible.`

      const renderUrl = await imagenGenerate(prompt)
      const metres = (garmentType as string).toLowerCase().includes('maxi') ||
        (garmentType as string).toLowerCase().includes('dress') ? '3.5m' : '2m'

      res.json({ renderUrl, metres })
    } catch (err) {
      console.error('[consumer/fabric-design/render]', err)
      res.status(500).json({ message: 'Render failed — please try again.' })
    }
    return
  }

  // Phase 1: analyze fabric from photo
  if (!photoDataUrl || typeof photoDataUrl !== 'string') {
    res.status(400).json({ message: 'photoDataUrl required for fabric analysis' }); return
  }

  try {
    const [header, b64] = photoDataUrl.split(',')
    if (!b64) { res.status(400).json({ message: 'Invalid image data URL' }); return }
    const mimeType = header.includes('png') ? 'image/png' : 'image/jpeg'

    const prompt = `You are a textile expert and Kenyan fashion stylist. Analyze this fabric photo.
Return ONLY valid JSON (no markdown):
{"pattern":"describe pattern in 3-5 words","colours":["colour1","colour2","colour3"],"texture":"weight and material in 5-8 words","stylistComment":"one sentence about styling this fabric in a Kenyan context"}`

    const raw = await geminiVision(prompt, b64, mimeType)
    const result = parseJsonResponse<{
      pattern: string; colours: string[]; texture: string; stylistComment: string
    }>(raw)

    res.json(result)
  } catch (err) {
    console.error('[consumer/fabric-design/analyze]', err)
    res.status(500).json({ message: 'Fabric analysis failed — please try again.' })
  }
})

// ── GET /consumer/weather ────────────────────────────────────────────────────

router.get('/consumer/weather', requireAuth, async (req: AuthRequest, res) => {
  try {
    const simResult = await db.query(
      `SELECT active, simulation FROM weather_simulations WHERE user_id = $1`,
      [req.userId],
    )
    if (simResult.rows[0]?.active) {
      res.json({ ...simResult.rows[0].simulation, simulated: true }); return
    }
    const profileResult = await db.query(
      `SELECT profile FROM onboarding_profiles WHERE user_id = $1`,
      [req.userId],
    )
    const p = profileResult.rows[0]?.profile
    const lat = p?.lat ?? -1.2921
    const lon = p?.lon ?? 36.8219
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      res.json({ temp: 25, condition: 'Clear', windSpeed: 10, humidity: 60, timeOfDay: getTimeOfDay(), simulated: false }); return
    }
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
    )
    const data = await weatherRes.json() as { main: { temp: number; humidity: number }; weather: { main: string }[]; wind: { speed: number } }
    res.json({
      temp: Math.round(data.main.temp),
      condition: data.weather[0]?.main ?? 'Clear',
      windSpeed: Math.round((data.wind?.speed ?? 0) * 3.6),
      humidity: data.main.humidity,
      timeOfDay: getTimeOfDay(),
      simulated: false,
    })
  } catch (err) {
    console.error('[consumer/weather]', err)
    res.status(500).json({ message: 'Failed to load weather' })
  }
})

// ── GET /consumer/wardrobe ───────────────────────────────────────────────────

router.get('/consumer/wardrobe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const category = req.query.category as string | undefined
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1'))
    const limit = 20
    const offset = (page - 1) * limit

    const profileResult = await db.query(
      `SELECT profile FROM onboarding_profiles WHERE user_id = $1`,
      [req.userId],
    )
    const onboardingItems = ((profileResult.rows[0]?.profile?.wardrobeItems) ?? []).map(
      (item: { id: string; photoDataUrl: string; prompt: string }) => ({
        id: item.id,
        photoUrl: item.photoDataUrl,
        category: 'top',
        occasionTags: [item.prompt],
        source: 'onboarding',
      }),
    )

    const addedResult = await db.query(
      `SELECT id, photo_data_url, category, occasion_tags FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    )
    const addedItems = addedResult.rows.map(r => ({
      id: r.id,
      photoUrl: r.photo_data_url,
      category: r.category,
      occasionTags: r.occasion_tags,
      source: 'added',
    }))

    const all = [...addedItems, ...onboardingItems]
    const filtered = category && category !== 'all' ? all.filter(i => i.category === category) : all
    res.json({ items: filtered.slice(offset, offset + limit), total: filtered.length })
  } catch (err) {
    console.error('[consumer/wardrobe]', err)
    res.status(500).json({ message: 'Failed to load wardrobe' })
  }
})

// ── POST /consumer/wardrobe/item ─────────────────────────────────────────────
// Saves the item and classifies category + occasion tags with Gemini Vision when configured.

router.post('/consumer/wardrobe/item', requireAuth, async (req: AuthRequest, res) => {
  const { photoDataUrl } = req.body
  if (!photoDataUrl || typeof photoDataUrl !== 'string') {
    res.status(400).json({ message: 'photoDataUrl required' }); return
  }

  let category = 'top'
  let occasionTags: string[] = []

  if (configured()) {
    try {
      const [header, b64] = photoDataUrl.split(',')
      if (b64) {
        const mimeType = header.includes('png') ? 'image/png' : 'image/jpeg'
        const prompt = `Classify this clothing item. Return ONLY valid JSON (no markdown):
{"category":"top|bottom|dress|suit|outerwear|jumpsuit|shoe|hat|headwrap|bag|jewellery|accessory","occasionTags":["Smart Casual","Weekend"]}`
        const raw = await geminiVision(prompt, b64, mimeType)
        const result = parseJsonResponse<{ category: string; occasionTags: string[] }>(raw)
        if (result.category) category = result.category
        if (Array.isArray(result.occasionTags)) occasionTags = result.occasionTags
      }
    } catch {
      // Classification failed — keep defaults, item still saves
    }
  }

  try {
    const result = await db.query(
      `INSERT INTO wardrobe_items (user_id, photo_data_url, category, occasion_tags)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.userId, photoDataUrl, category, JSON.stringify(occasionTags)],
    )
    res.json({ item: { id: result.rows[0].id, photoUrl: photoDataUrl, category, occasionTags } })
  } catch (err) {
    console.error('[consumer/wardrobe/item]', err)
    res.status(500).json({ message: 'Failed to save item' })
  }
})

// ── GET /consumer/discover ───────────────────────────────────────────────────
// Queries live seller inventory matched to consumer style preferences.

router.get('/consumer/discover', requireAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProfile(req.userId!)
    const stylePrefs = ((profile.stylePreferences as string[]) ?? [])

    const occasionMap: Record<string, string[]> = {
      smart_casual:         ['Smart Casual', 'Weekend'],
      business_casual:      ['Business Casual', 'Office'],
      streetwear:           ['Streetwear', 'Weekend'],
      traditional_cultural: ['Traditional', 'Cultural'],
      evening_formal:       ['Evening', 'Formal'],
      athleisure:           ['Casual', 'Sport'],
    }
    const preferredTags = stylePrefs.flatMap(p => occasionMap[p] ?? [])

    const result = await db.query(`
      SELECT
        i.id,
        i.name,
        i.price_kes,
        i.showcase_image_url,
        i.occasion_tags,
        i.discount_percent,
        s.business_name AS seller_name,
        s.slug AS seller_slug,
        s.whatsapp_number
      FROM inventory_items i
      JOIN sellers s ON i.seller_id = s.id
      WHERE i.is_live = true
        AND NOT i.is_sold_out
        AND i.showcase_image_url IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 20
    `)

    const items = result.rows.map(r => {
      const itemTags = (r.occasion_tags as string[]) ?? []
      const matched = preferredTags.length > 0 &&
        preferredTags.some(t => itemTags.some(it => it.toLowerCase().includes(t.toLowerCase())))
      return {
        id: r.id,
        name: r.name,
        priceKES: r.price_kes,
        sellerName: r.seller_name,
        sellerSlug: r.seller_slug,
        photoUrl: r.showcase_image_url,
        sponsored: false,
        whatsappNumber: r.whatsapp_number,
        discountPercent: r.discount_percent,
        matchReason: matched ? 'Matches your style preferences' : 'Curated for you',
      }
    })

    res.json({ items })
  } catch (err) {
    console.error('[consumer/discover]', err)
    res.status(500).json({ message: 'Failed to load discover feed' })
  }
})

// ── GET /consumer/referral ───────────────────────────────────────────────────

router.get('/consumer/referral', requireAuth, async (req: AuthRequest, res) => {
  try {
    const existing = await db.query(
      `SELECT code, expires_at FROM referral_codes WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [req.userId],
    )
    let code: string, expiresAt: string
    if (existing.rows[0] && new Date(existing.rows[0].expires_at) > new Date()) {
      code = existing.rows[0].code
      expiresAt = existing.rows[0].expires_at
    } else {
      code = generateCode()
      const exp = new Date()
      exp.setDate(exp.getDate() + 14)
      expiresAt = exp.toISOString()
      await db.query(
        `INSERT INTO referral_codes (user_id, code, expires_at) VALUES ($1, $2, $3)`,
        [req.userId, code, expiresAt],
      )
    }

    // Query referral tracking if table exists; gracefully skip if not yet migrated
    let counters = { totalClicks: 0, totalJoined: 0, awaitingUpgrade: 0, upgradedThisMonth: 0 }
    try {
      const stats = await db.query(
        `SELECT
           COUNT(*)                                                     AS total_clicks,
           COUNT(*) FILTER (WHERE status = 'converted')                AS total_joined,
           COUNT(*) FILTER (WHERE status = 'pending')                  AS awaiting_upgrade,
           COUNT(*) FILTER (WHERE status = 'converted'
             AND updated_at >= date_trunc('month', NOW()))             AS upgraded_this_month
         FROM referral_attributions WHERE referral_code = $1`,
        [code],
      )
      const r = stats.rows[0]
      counters = {
        totalClicks: parseInt(r.total_clicks) || 0,
        totalJoined: parseInt(r.total_joined) || 0,
        awaitingUpgrade: parseInt(r.awaiting_upgrade) || 0,
        upgradedThisMonth: parseInt(r.upgraded_this_month) || 0,
      }
    } catch {
      // referral_attributions not yet created — counters stay at zero
    }

    const appUrl = process.env.APP_URL ?? 'https://styleyangu.app'
    res.json({ code, expiresAt, shareUrl: `${appUrl}/join/${code}`, counters })
  } catch (err) {
    console.error('[consumer/referral]', err)
    res.status(500).json({ message: 'Failed to load referral' })
  }
})

// ── GET /consumer/streak ─────────────────────────────────────────────────────

router.get('/consumer/streak', requireAuth, async (req: AuthRequest, res) => {
  try {
    const r = await db.query(`SELECT created_at FROM users WHERE id = $1`, [req.userId])
    const createdAt = r.rows[0]?.created_at ?? new Date()
    const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    const streakDays = Math.min(daysSince + 1, 7)
    const stylePoints = streakDays * 10 + 15

    // weeklyScore: unlocks from the past 7 days relative to 21 max (7 days × 3 unlocks)
    const activityResult = await db.query(
      `SELECT COALESCE(SUM(unlock_count), 0) AS total_unlocks
       FROM daily_suggestions
       WHERE user_id = $1 AND date >= (NOW() - INTERVAL '7 days')::date`,
      [req.userId],
    )
    const totalUnlocks = parseInt(activityResult.rows[0]?.total_unlocks ?? '0')
    const weeklyScore = Math.round(Math.min(10, (totalUnlocks / 21) * 10) * 10) / 10

    // leaderboardRank: position among all users by account age (older = more points = higher rank)
    const rankResult = await db.query(
      `SELECT COUNT(*) + 1 AS rank FROM users WHERE created_at < $1`,
      [createdAt],
    )
    const leaderboardRank = parseInt(rankResult.rows[0]?.rank ?? '1')

    res.json({ streakDays, stylePoints, weeklyScore, leaderboardRank })
  } catch (err) {
    console.error('[consumer/streak]', err)
    res.status(500).json({ message: 'Failed to load streak' })
  }
})

// ── PATCH /consumer/preferences ──────────────────────────────────────────────

router.patch('/consumer/preferences', requireAuth, async (req: AuthRequest, res) => {
  const { notificationFrequency } = req.body
  if (!['immediate', 'daily', 'weekly'].includes(notificationFrequency)) {
    res.status(400).json({ message: 'Invalid notification frequency' }); return
  }
  try {
    await db.query(
      `INSERT INTO user_preferences (user_id, notification_frequency) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET notification_frequency = $2`,
      [req.userId, notificationFrequency],
    )
    res.json({ ok: true })
  } catch (err) {
    console.error('[consumer/preferences]', err)
    res.status(500).json({ message: 'Failed to save preferences' })
  }
})

export default router
