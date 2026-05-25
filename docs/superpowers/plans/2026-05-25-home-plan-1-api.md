# Consumer Home Screen — Plan 1: API Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all DB tables and Node/Express endpoints required by the consumer home screen.

**Architecture:** New `services/api/src/routes/consumer.ts` file holds all 10 consumer endpoints. DB migrations extend `migrate.ts`. The consumer router is registered in `index.ts`. All AI/suggestion logic is stubbed — gender-matched based on stylist choice (Amara → female stubs, Kofi → male stubs).

**Tech Stack:** Node/Express, PostgreSQL (pg), Zod, TypeScript, tsx

---

### Task 1: DB migrations — seven new tables

**Files:**
- Modify: `services/api/src/db/migrate.ts`

- [ ] **Step 1: Add the seven new tables to `runMigrations`**

Open `services/api/src/db/migrate.ts` and append these queries inside `runMigrations` after the existing two `CREATE TABLE` calls:

```typescript
  await db.query(`
    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       UUID NOT NULL REFERENCES users(id),
      photo_data_url TEXT NOT NULL,
      category      TEXT NOT NULL DEFAULT 'clothing',
      occasion_tags TEXT[] DEFAULT '{}',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS daily_suggestions (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id             UUID NOT NULL REFERENCES users(id),
      date                DATE NOT NULL DEFAULT CURRENT_DATE,
      suggestions         JSONB NOT NULL DEFAULT '[]',
      unlock_count        INT NOT NULL DEFAULT 1,
      ads_watched         INT NOT NULL DEFAULT 0,
      wardrobe_pairs_used INT NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      code       TEXT UNIQUE NOT NULL,
      status     TEXT NOT NULL DEFAULT 'active',
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS referral_attributions (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id  UUID NOT NULL REFERENCES users(id),
      referred_id  UUID NOT NULL REFERENCES users(id),
      clicked_at   TIMESTAMPTZ NOT NULL,
      signed_up_at TIMESTAMPTZ DEFAULT NOW(),
      status       TEXT NOT NULL DEFAULT 'pending'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id                UUID PRIMARY KEY REFERENCES users(id),
      notification_frequency TEXT NOT NULL DEFAULT 'immediate'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS weather_simulations (
      user_id    UUID PRIMARY KEY REFERENCES users(id),
      active     BOOLEAN NOT NULL DEFAULT false,
      simulation JSONB NOT NULL DEFAULT '{}'
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id),
      item_id    TEXT NOT NULL,
      item_data  JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, item_id)
    )
  `)
```

- [ ] **Step 2: Start the API and confirm migrations run without error**

```bash
cd services/api && npx tsx src/index.ts
```

Expected output: `[api] listening on port 3001` with no migration errors. Stop with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add services/api/src/db/migrate.ts
git commit -m "feat(api): add wardrobe, suggestions, referral, prefs, weather-sim, wishlist tables"
```

---

### Task 2: Consumer API routes file

**Files:**
- Create: `services/api/src/routes/consumer.ts`

- [ ] **Step 1: Create the file with stub data and all 10 endpoints**

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { db } from '../db'

const router = Router()

// ── Stub suggestion data ────────────────────────────────────────────────────

const FEMALE_STUBS = [
  { id: 's1', outfit: 'White linen blouse, navy midi skirt, tan block heels', occasionTag: 'Smart Casual', stylistComment: 'This palette works beautifully with your warm undertone — the navy grounds the look while the white lifts it.', clothingTags: ['blouse', 'midi-skirt', 'heels'] },
  { id: 's2', outfit: 'Floral wrap dress, nude sandals, gold hoop earrings', occasionTag: 'Weekend', stylistComment: 'The wrap silhouette is flattering for your body type and the print adds personality without overwhelming.', clothingTags: ['wrap-dress', 'sandals'] },
  { id: 's3', outfit: 'Fitted blazer, high-waist trousers, pointed-toe flats', occasionTag: 'Business Casual', stylistComment: 'Sharp, polished, and effortless. The high waist creates a clean line that works beautifully with your proportions.', clothingTags: ['blazer', 'trousers', 'flats'] },
]

const MALE_STUBS = [
  { id: 's1', outfit: 'Fitted white shirt, slim navy chinos, brown leather loafers', occasionTag: 'Smart Casual', stylistComment: 'Clean lines and a neutral palette that complement your body type and skin tone perfectly.', clothingTags: ['shirt', 'chinos', 'loafers'] },
  { id: 's2', outfit: 'Olive bomber jacket, black slim-fit jeans, white sneakers', occasionTag: 'Weekend', stylistComment: 'The olive works with your undertone — earthy tones complement your complexion well.', clothingTags: ['bomber-jacket', 'jeans', 'sneakers'] },
  { id: 's3', outfit: 'Navy suit, white pocket square, black oxford shoes', occasionTag: 'Business Formal', stylistComment: 'A well-structured suit in navy reads confidence. The classic white pocket square keeps it timeless.', clothingTags: ['suit', 'oxford-shoes'] },
]

const FEMALE_DISCOVER = [
  { id: 'd1', name: 'Emerald Wrap Dress', priceKES: 2800, sellerName: 'NairobiChic', photoUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Wrap+Dress', sponsored: false, matchReason: 'Matches your warm undertone and style preferences' },
  { id: 'd2', name: 'Beaded Maasai Sandals', priceKES: 1200, sellerName: 'KaribuCraft', photoUrl: 'https://placehold.co/400x500/5C3A1E/FFFFFF?text=Sandals', sponsored: true, matchReason: 'Traditional style you love, your shoe size available' },
  { id: 'd3', name: 'Kitenge Wrap Skirt', priceKES: 1800, sellerName: 'AfricanPride', photoUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Skirt', sponsored: false, matchReason: 'Perfect for your traditional cultural style preference' },
  { id: 'd4', name: 'Gold Hoop Earring Set', priceKES: 800, sellerName: 'AdornKe', photoUrl: 'https://placehold.co/400x500/C4834A/FFFFFF?text=Earrings', sponsored: false, matchReason: 'Complements your skin tone beautifully' },
  { id: 'd5', name: 'Linen Wide-Leg Trousers', priceKES: 2200, sellerName: 'ModernAfrika', photoUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Trousers', sponsored: true, matchReason: 'Your size available, matches your smart casual preference' },
]

const MALE_DISCOVER = [
  { id: 'd1', name: 'Slim Fit Linen Shirt', priceKES: 1500, sellerName: 'NairobiChic', photoUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Linen+Shirt', sponsored: false, matchReason: 'Matches your smart casual preference and warm undertone' },
  { id: 'd2', name: 'Classic Brown Derby', priceKES: 3200, sellerName: 'ShoeHaven', photoUrl: 'https://placehold.co/400x500/5C3A1E/FFFFFF?text=Derby+Shoes', sponsored: true, matchReason: 'Your shoe size available, complements your wardrobe' },
  { id: 'd3', name: 'Kitenge Shirt', priceKES: 2200, sellerName: 'AfricanPride', photoUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Kitenge+Shirt', sponsored: false, matchReason: 'Traditional cultural style you selected during onboarding' },
  { id: 'd4', name: 'Navy Chinos', priceKES: 2800, sellerName: 'ModernAfrika', photoUrl: 'https://placehold.co/400x500/1A0A00/FFFFFF?text=Chinos', sponsored: false, matchReason: 'Versatile piece matching your body type and style' },
  { id: 'd5', name: 'Leather Card Wallet', priceKES: 950, sellerName: 'LeatherKe', photoUrl: 'https://placehold.co/400x500/C4834A/FFFFFF?text=Wallet', sponsored: true, matchReason: 'Curated for your style profile' },
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

async function getStylist(userId: string): Promise<'amara' | 'kofi'> {
  const r = await db.query(`SELECT profile FROM onboarding_profiles WHERE user_id = $1`, [userId])
  return r.rows[0]?.profile?.stylist ?? 'amara'
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

router.get('/consumer/suggestion/daily', requireAuth, async (req: AuthRequest, res) => {
  try {
    const stylist = await getStylist(req.userId!)
    const stubs = stylist === 'kofi' ? MALE_STUBS : FEMALE_STUBS
    const today = new Date().toISOString().split('T')[0]

    const existing = await db.query(
      `SELECT suggestions, unlock_count, ads_watched, wardrobe_pairs_used
       FROM daily_suggestions WHERE user_id = $1 AND date = $2`,
      [req.userId, today],
    )

    if (existing.rows[0]) {
      const r = existing.rows[0]
      res.json({ suggestions: r.suggestions, unlockCount: r.unlock_count, adsWatched: r.ads_watched, wardrobePairsUsed: r.wardrobe_pairs_used, phase: 2 })
      return
    }

    const firstSuggestion = stubs[0]
    await db.query(
      `INSERT INTO daily_suggestions (user_id, date, suggestions, unlock_count) VALUES ($1, $2, $3, 1)`,
      [req.userId, today, JSON.stringify([firstSuggestion])],
    )
    res.json({ suggestions: [firstSuggestion], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
  } catch (err) {
    console.error('[consumer/suggestion/daily]', err)
    res.status(500).json({ message: 'Failed to load suggestions' })
  }
})

// ── POST /consumer/suggestion/unlock ────────────────────────────────────────

router.post('/consumer/suggestion/unlock', requireAuth, async (req: AuthRequest, res) => {
  const { method, wardrobeItemIds } = req.body
  if (!['ad', 'wardrobe'].includes(method)) { res.status(400).json({ message: 'Invalid unlock method' }); return }

  try {
    const stylist = await getStylist(req.userId!)
    const stubs = stylist === 'kofi' ? MALE_STUBS : FEMALE_STUBS
    const today = new Date().toISOString().split('T')[0]

    const row = await db.query(
      `SELECT suggestions, unlock_count, ads_watched, wardrobe_pairs_used
       FROM daily_suggestions WHERE user_id = $1 AND date = $2`,
      [req.userId, today],
    )
    if (!row.rows[0]) { res.status(400).json({ message: 'No suggestion session for today' }); return }

    const { suggestions, unlock_count: unlockCount, ads_watched: adsWatched, wardrobe_pairs_used: wardrobePairsUsed } = row.rows[0]

    if (unlockCount >= 3) { res.json({ unlockCount: 3, remaining: 0, newSuggestion: null }); return }

    if (method === 'ad') {
      if (adsWatched >= 2) { res.status(400).json({ message: 'Ad unlock limit reached' }); return }
      const next = stubs[unlockCount] ?? stubs[stubs.length - 1]
      const updated = [...suggestions, next]
      await db.query(
        `UPDATE daily_suggestions SET suggestions = $1, unlock_count = $2, ads_watched = $3 WHERE user_id = $4 AND date = $5`,
        [JSON.stringify(updated), unlockCount + 1, adsWatched + 1, req.userId, today],
      )
      res.json({ unlockCount: unlockCount + 1, remaining: 3 - (unlockCount + 1), newSuggestion: next })
      return
    }

    // wardrobe method
    if (!Array.isArray(wardrobeItemIds) || wardrobeItemIds.length !== 2) {
      res.status(400).json({ message: 'wardrobe unlock requires exactly 2 item IDs' }); return
    }
    if (wardrobePairsUsed >= 2) { res.status(400).json({ message: 'Wardrobe unlock limit reached' }); return }

    const next = stubs[unlockCount] ?? stubs[stubs.length - 1]
    const updated = [...suggestions, next]
    await db.query(
      `UPDATE daily_suggestions SET suggestions = $1, unlock_count = $2, wardrobe_pairs_used = $3 WHERE user_id = $4 AND date = $5`,
      [JSON.stringify(updated), unlockCount + 1, wardrobePairsUsed + 1, req.userId, today],
    )
    res.json({ unlockCount: unlockCount + 1, remaining: 3 - (unlockCount + 1), newSuggestion: next })
  } catch (err) {
    console.error('[consumer/suggestion/unlock]', err)
    res.status(500).json({ message: 'Failed to unlock suggestion' })
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
    const onboardingItems = ((profileResult.rows[0]?.profile?.wardrobeItems) ?? []).map((item: { id: string; photoDataUrl: string; prompt: string }) => ({
      id: item.id,
      photoUrl: item.photoDataUrl,
      category: 'clothing',
      occasionTags: [item.prompt],
      source: 'onboarding',
    }))

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

router.post('/consumer/wardrobe/item', requireAuth, async (req: AuthRequest, res) => {
  const { photoDataUrl } = req.body
  if (!photoDataUrl || typeof photoDataUrl !== 'string') {
    res.status(400).json({ message: 'photoDataUrl required' }); return
  }
  try {
    const result = await db.query(
      `INSERT INTO wardrobe_items (user_id, photo_data_url, category, occasion_tags) VALUES ($1, $2, 'clothing', '{}') RETURNING id`,
      [req.userId, photoDataUrl],
    )
    res.json({ item: { id: result.rows[0].id, photoUrl: photoDataUrl, category: 'clothing', occasionTags: [] } })
  } catch (err) {
    console.error('[consumer/wardrobe/item]', err)
    res.status(500).json({ message: 'Failed to save item' })
  }
})

// ── GET /consumer/discover ───────────────────────────────────────────────────

router.get('/consumer/discover', requireAuth, async (req: AuthRequest, res) => {
  try {
    const stylist = await getStylist(req.userId!)
    res.json({ items: stylist === 'kofi' ? MALE_DISCOVER : FEMALE_DISCOVER })
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
    const appUrl = process.env.APP_URL ?? 'https://styleyangu.app'
    res.json({
      code,
      expiresAt,
      shareUrl: `${appUrl}/join/${code}`,
      counters: { totalClicks: 0, totalJoined: 0, awaitingUpgrade: 0, upgradedThisMonth: 0 },
    })
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
    res.json({ streakDays, stylePoints: streakDays * 10 + 15, weeklyScore: 7.4, leaderboardRank: 12 })
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
```

- [ ] **Step 2: Type-check the new file**

```bash
cd services/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add services/api/src/routes/consumer.ts
git commit -m "feat(api): consumer routes — profile, suggestions, weather, wardrobe, discover, referral, streak, prefs"
```

---

### Task 3: Register consumer router + add PATCH to apiClient + new shared types

**Files:**
- Modify: `services/api/src/index.ts`
- Modify: `packages/api-client/src/index.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Register consumer router in `services/api/src/index.ts`**

Add after `import onboardingRouter`:

```typescript
import consumerRouter from './routes/consumer'
```

Add after `app.use(onboardingRouter)`:

```typescript
app.use(consumerRouter)
```

- [ ] **Step 2: Add `patch` and `multipart` to `packages/api-client/src/index.ts`**

Replace the entire file with:

```typescript
const BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sy_token') : null
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

export const apiClient = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

- [ ] **Step 3: Add new types to `packages/types/src/index.ts`**

Append at the end of the file:

```typescript
// ── Consumer Home Screen ───────────────────────────────────────────────────

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type UnlockMethod = 'ad' | 'wardrobe'
export type UnlockMode = 'idle' | 'wardrobe-unlock' | 'done'
export type AdPhaseNumber = 1 | 2

export interface UserProfile {
  avatarUrl: string | null
  stylistName: Stylist
  skinTone: SkinProfile | null
  bodyType: BodyType | null
  shoeSize: { uk: number | null; eu: number | null }
  stylePrefs: StylePreference[]
  budget: Record<string, number>
  location: { lat: number | null; lon: number | null }
  tier: 'free' | 'premium'
}

export interface Suggestion {
  id: string
  outfit: string
  occasionTag: string
  stylistComment: string
  clothingTags: string[]
}

export interface DailySuggestionResponse {
  suggestions: Suggestion[]
  unlockCount: number
  adsWatched: number
  wardrobePairsUsed: number
  phase: AdPhaseNumber
}

export interface UnlockResponse {
  unlockCount: number
  remaining: number
  newSuggestion: Suggestion | null
}

export interface WeatherData {
  temp: number
  condition: string
  windSpeed: number
  humidity: number
  timeOfDay: TimeOfDay
  simulated: boolean
}

export interface WardrobeItem {
  id: string
  photoUrl: string
  category: string
  occasionTags: string[]
  source?: 'onboarding' | 'added'
}

export interface WardrobeResponse {
  items: WardrobeItem[]
  total: number
}

export interface DiscoverItem {
  id: string
  name: string
  priceKES: number
  sellerName: string
  photoUrl: string
  sponsored: boolean
  matchReason: string
}

export interface ReferralCounters {
  totalClicks: number
  totalJoined: number
  awaitingUpgrade: number
  upgradedThisMonth: number
}

export interface ReferralData {
  code: string
  expiresAt: string
  shareUrl: string
  counters: ReferralCounters
}

export interface StreakData {
  streakDays: number
  stylePoints: number
  weeklyScore: number
  leaderboardRank: number
}
```

- [ ] **Step 4: Type-check everything**

```bash
cd services/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start the API and smoke-test two endpoints with curl**

In one terminal: `cd services/api && npx tsx src/index.ts`

In another:
```bash
# Register a test user and get a token first
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq .

# Then use that token (replace TOKEN below)
curl -s http://localhost:3001/consumer/weather \
  -H "Authorization: Bearer TOKEN" | jq .
```

Expected: weather JSON with temp, condition, timeOfDay fields.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/index.ts packages/api-client/src/index.ts packages/types/src/index.ts
git commit -m "feat: register consumer router, add apiClient.patch, add home screen shared types"
```
