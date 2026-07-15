import { Router, type IRouter, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { adBoostState, baseSlots, isPaidSeller } from '../lib/ads'
import { getOrCreateUsername } from '../lib/username'

const router: IRouter = Router()

const ARTISAN_TYPES = new Set(['tailor', 'cobbler', 'bag_maker', 'jewellery_maker'])

function requireSeller(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'seller') { res.status(403).json({ message: 'Seller access required' }); return }
    next()
  })
}
function requireConsumer(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'consumer') { res.status(403).json({ message: 'Consumer account required' }); return }
    next()
  })
}

const PACKS = [
  { type: 'starter',  slots: 2,  priceKES: 100, status: 'active' },
  { type: 'growth',   slots: 5,  priceKES: 220, status: 'active' },
  { type: 'campaign', slots: 10, priceKES: 400, status: 'active' },
  { type: 'max',      slots: 20, priceKES: 700, status: 'coming_soon' },
]

// ─────────────────────────────────────────────
// SELLER: boost management
// ─────────────────────────────────────────────

router.get('/seller/adboost/status', requireSeller, async (req: AuthRequest, res) => {
  try {
    const s = await db.query('SELECT seller_type, tier, artisan_tier FROM sellers WHERE id = $1', [req.userId])
    if (!s.rows[0]) { res.status(404).json({ message: 'Seller not found' }); return }
    const { seller_type, tier, artisan_tier } = s.rows[0]

    const [state, used] = await Promise.all([
      adBoostState(),
      db.query(
        `SELECT COUNT(*) AS n FROM boost_slots WHERE seller_id = $1 AND week_starting = date_trunc('week', NOW())::date`,
        [req.userId],
      ),
    ])
    const base = baseSlots(seller_type, tier, artisan_tier)
    const usedN = parseInt(used.rows[0].n) || 0

    res.json({
      activation: state.activation,
      phase: state.phase,
      paid: isPaidSeller(seller_type, tier, artisan_tier),
      baseSlots: base,
      usedThisWeek: usedN,
      remaining: Math.max(0, base - usedN),
      packs: PACKS,
    })
  } catch (err) {
    console.error('[seller/adboost/status]', err)
    res.status(500).json({ message: 'Failed to load ad boost status' })
  }
})

router.post('/seller/adboost/boost', requireSeller, async (req: AuthRequest, res) => {
  const parsed = z.object({ itemId: z.string().uuid() }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const s = await db.query('SELECT seller_type, tier, artisan_tier FROM sellers WHERE id = $1', [req.userId])
    if (!s.rows[0]) { res.status(404).json({ message: 'Seller not found' }); return }
    const { seller_type, tier, artisan_tier } = s.rows[0]
    if (!isPaidSeller(seller_type, tier, artisan_tier)) {
      res.status(403).json({ message: 'Ad Boost is available to paid tiers only.' }); return
    }

    const item = await db.query(
      'SELECT id FROM inventory_items WHERE id = $1 AND seller_id = $2 AND is_live = true',
      [parsed.data.itemId, req.userId],
    )
    if (!item.rows[0]) { res.status(404).json({ message: 'Live item not found' }); return }

    const base = baseSlots(seller_type, tier, artisan_tier)
    const used = await db.query(
      `SELECT COUNT(*) AS n FROM boost_slots WHERE seller_id = $1 AND week_starting = date_trunc('week', NOW())::date`,
      [req.userId],
    )
    if ((parseInt(used.rows[0].n) || 0) >= base) {
      res.status(400).json({ message: 'No boost slots remaining this week. Top up with a pack (coming soon).' }); return
    }

    const r = await db.query(
      `INSERT INTO boost_slots (seller_id, item_id, week_starting, pack)
       VALUES ($1, $2, date_trunc('week', NOW())::date, 'base') RETURNING id`,
      [req.userId, parsed.data.itemId],
    )
    res.status(201).json({ id: r.rows[0].id })
  } catch (err) {
    console.error('[seller/adboost/boost]', err)
    res.status(500).json({ message: 'Failed to boost item' })
  }
})

router.get('/seller/adboost/analytics', requireSeller, async (req: AuthRequest, res) => {
  try {
    const [totals, byItem] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(impressions),0) impressions, COALESCE(SUM(wishlist_saves),0) saves,
                COALESCE(SUM(follows),0) follows, COALESCE(SUM(talk_taps),0) talks
         FROM boost_slots WHERE seller_id = $1 AND week_starting = date_trunc('week', NOW())::date`,
        [req.userId],
      ),
      db.query(
        `SELECT i.name, bs.impressions, bs.wishlist_saves, bs.follows, bs.talk_taps
         FROM boost_slots bs JOIN inventory_items i ON i.id = bs.item_id
         WHERE bs.seller_id = $1 AND bs.week_starting = date_trunc('week', NOW())::date
         ORDER BY bs.impressions DESC`,
        [req.userId],
      ),
    ])
    const t = totals.rows[0]
    res.json({
      week: {
        impressions: parseInt(t.impressions),
        wishlistSaves: parseInt(t.saves),
        follows: parseInt(t.follows),
        talkToSellerTaps: parseInt(t.talks),
      },
      byItem: byItem.rows.map(r => ({
        itemName: r.name,
        impressions: r.impressions,
        wishlistSaves: r.wishlist_saves,
        follows: r.follows,
        talkToSellerTaps: r.talk_taps,
      })),
    })
  } catch (err) {
    console.error('[seller/adboost/analytics]', err)
    res.status(500).json({ message: 'Failed to load analytics' })
  }
})

// ─────────────────────────────────────────────
// CONSUMER: sponsored card serving
// ─────────────────────────────────────────────

router.get('/consumer/sponsored-card', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const state = await adBoostState()
    if (state.activation !== 'live') { res.json({ status: 'coming_soon', card: null }); return }

    // Eligible slots this week, honouring frequency caps (1/seller/day, 3/seller/week).
    const eligible = await db.query(
      `SELECT bs.id AS slot_id, bs.seller_id, bs.item_id,
              i.name, i.price_kes, i.showcase_image_url, i.occasion_tags,
              s.business_name, s.slug, s.seller_type,
              (f.user_id IS NOT NULL) AS followed
       FROM boost_slots bs
       JOIN inventory_items i ON i.id = bs.item_id AND i.is_live = true AND i.showcase_image_url IS NOT NULL
       JOIN sellers s ON s.id = bs.seller_id AND s.status = 'active'
       LEFT JOIN seller_follows f ON f.seller_id = bs.seller_id AND f.user_id = $1
       WHERE bs.week_starting = date_trunc('week', NOW())::date
         AND bs.seller_id NOT IN (
           SELECT seller_id FROM ad_impressions WHERE consumer_id = $1 AND shown_at::date = CURRENT_DATE
         )
         AND bs.seller_id NOT IN (
           SELECT seller_id FROM ad_impressions WHERE consumer_id = $1 AND shown_at >= NOW() - INTERVAL '7 days'
           GROUP BY seller_id HAVING COUNT(*) >= 3
         )
       ORDER BY RANDOM() LIMIT 12`,
      [req.userId],
    )
    if (eligible.rows.length === 0) { res.json({ status: 'live', card: null }); return }

    // Priority stack: wishlist/follow (warm) > profile match > category affinity.
    const profile = await db.query(`SELECT profile FROM onboarding_profiles WHERE user_id = $1`, [req.userId])
    const prefs: string[] = (profile.rows[0]?.profile?.stylePreferences ?? []).map((p: string) => p.toLowerCase())

    const score = (row: Record<string, unknown>): number => {
      let n = 0
      if (row.followed) n += 2
      const tags = ((row.occasion_tags as string[]) ?? []).map(t => t.toLowerCase())
      if (prefs.length && tags.some(t => prefs.some(p => t.includes(p) || p.includes(t)))) n += 1
      return n
    }
    const chosen = [...eligible.rows].sort((a, b) => score(b) - score(a))[0]

    await db.query(
      `INSERT INTO ad_impressions (slot_id, seller_id, consumer_id) VALUES ($1, $2, $3)`,
      [chosen.slot_id, chosen.seller_id, req.userId],
    )
    await db.query(`UPDATE boost_slots SET impressions = impressions + 1 WHERE id = $1`, [chosen.slot_id])

    const isArtisan = ARTISAN_TYPES.has(chosen.seller_type as string)
    res.json({
      status: 'live',
      card: {
        slotId: chosen.slot_id,
        itemId: chosen.item_id,
        sellerStorefrontName: chosen.business_name,
        sellerSlug: chosen.slug,
        showcaseImageUrl: chosen.showcase_image_url,
        priceKES: chosen.price_kes,
        cta: isArtisan ? 'book_consultation' : 'talk_to_seller',
        isArtisanCard: isArtisan,
      },
    })
  } catch (err) {
    console.error('[consumer/sponsored-card]', err)
    res.status(500).json({ message: 'Failed to load sponsored card' })
  }
})

async function loadSlot(slotId: string) {
  const r = await db.query(
    `SELECT bs.id, bs.seller_id, bs.item_id, i.name AS item_name, s.slug, s.whatsapp_number,
            i.price_kes, i.showcase_image_url
     FROM boost_slots bs JOIN inventory_items i ON i.id = bs.item_id JOIN sellers s ON s.id = bs.seller_id
     WHERE bs.id = $1`,
    [slotId],
  )
  return r.rows[0] ?? null
}

router.post('/consumer/sponsored-card/:slotId/talk', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const slot = await loadSlot(req.params.slotId)
    if (!slot) { res.status(404).json({ message: 'Slot not found' }); return }
    await db.query(`UPDATE boost_slots SET talk_taps = talk_taps + 1 WHERE id = $1`, [req.params.slotId])

    // Log the lead in the seller's client list as "From Ad Boost" (§4.4.1 attribution)
    const username = await getOrCreateUsername(req.userId!)
    await db.query(
      `INSERT INTO seller_clients (seller_id, consumer_username, nickname)
       VALUES ($1, $2, $3) ON CONFLICT (seller_id, consumer_username) DO NOTHING`,
      [slot.seller_id, username, `From Ad Boost — ${(slot.item_name as string).slice(0, 40)}`],
    )
    res.json({ sellerSlug: slot.slug, whatsappNumber: slot.whatsapp_number ?? null, itemName: slot.item_name })
  } catch (err) {
    console.error('[sponsored-card/talk]', err)
    res.status(500).json({ message: 'Failed to record' })
  }
})

router.post('/consumer/sponsored-card/:slotId/follow', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const slot = await loadSlot(req.params.slotId)
    if (!slot) { res.status(404).json({ message: 'Slot not found' }); return }
    const ins = await db.query(
      `INSERT INTO seller_follows (user_id, seller_id) VALUES ($1, $2)
       ON CONFLICT (user_id, seller_id) DO NOTHING RETURNING id`,
      [req.userId, slot.seller_id],
    )
    if (ins.rows[0]) await db.query(`UPDATE boost_slots SET follows = follows + 1 WHERE id = $1`, [req.params.slotId])
    res.json({ following: true })
  } catch (err) {
    console.error('[sponsored-card/follow]', err)
    res.status(500).json({ message: 'Failed to follow' })
  }
})

router.post('/consumer/sponsored-card/:slotId/wishlist', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const slot = await loadSlot(req.params.slotId)
    if (!slot) { res.status(404).json({ message: 'Slot not found' }); return }
    const itemData = {
      name: slot.item_name, priceKES: slot.price_kes,
      showcaseImageUrl: slot.showcase_image_url, sellerSlug: slot.slug,
    }
    const ins = await db.query(
      `INSERT INTO wishlists (user_id, item_id, item_data) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_id) DO NOTHING RETURNING id`,
      [req.userId, slot.item_id, JSON.stringify(itemData)],
    )
    if (ins.rows[0]) await db.query(`UPDATE boost_slots SET wishlist_saves = wishlist_saves + 1 WHERE id = $1`, [req.params.slotId])
    res.json({ saved: true })
  } catch (err) {
    console.error('[sponsored-card/wishlist]', err)
    res.status(500).json({ message: 'Failed to save' })
  }
})

export default router
