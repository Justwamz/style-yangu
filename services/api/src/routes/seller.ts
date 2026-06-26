import { Router, type IRouter, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'
import { JWT_SECRET } from '../config'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import {
  FACE_LIBRARY,
  buildPrompt,
  generateWithImagen3,
  uploadToR2,
  imagenConfigured,
  r2Configured,
  type ShowcaseMode,
} from '../services/showcase'

const router: IRouter = Router()

function requireSeller(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'seller') {
      res.status(403).json({ message: 'Seller access required' })
      return
    }
    next()
  })
}

async function getSeller(sellerId: string) {
  const r = await db.query('SELECT * FROM sellers WHERE id = $1', [sellerId])
  return r.rows[0] ?? null
}

// ─────────────────────────────────────────────
// AUTH: OTP
// ─────────────────────────────────────────────

router.post('/seller/auth/otp/send', async (req, res) => {
  const { phone } = req.body
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ message: 'phone required' })
    return
  }
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await db.query('UPDATE otp_codes SET used = true WHERE phone = $1 AND used = false', [phone])
    await db.query(
      'INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)',
      [phone, code, expiresAt],
    )

    // TODO Phase 2: send via Twilio / Safaricom Daraja
    console.log(`[OTP] ${phone} → ${code}`)

    res.json({ success: true })
  } catch (err) {
    console.error('[seller/auth/otp/send]', err)
    res.status(500).json({ message: 'Failed to send OTP' })
  }
})

router.post('/seller/auth/otp/verify', async (req, res) => {
  const { phone, code } = req.body
  if (!phone || !code) {
    res.status(400).json({ message: 'phone and code required' })
    return
  }
  try {
    const otpResult = await db.query(
      `SELECT id FROM otp_codes
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code],
    )

    if (!otpResult.rows[0]) {
      res.status(401).json({ message: 'Invalid or expired code' })
      return
    }

    await db.query('UPDATE otp_codes SET used = true WHERE id = $1', [otpResult.rows[0].id])

    let sellerResult = await db.query(
      'SELECT id, onboarding_done FROM sellers WHERE phone = $1',
      [phone],
    )
    if (!sellerResult.rows[0]) {
      sellerResult = await db.query(
        'INSERT INTO sellers (phone) VALUES ($1) RETURNING id, onboarding_done',
        [phone],
      )
    }

    const seller = sellerResult.rows[0]
    const token = jwt.sign({ sub: seller.id, role: 'seller' }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, onboardingDone: seller.onboarding_done })
  } catch (err) {
    console.error('[seller/auth/otp/verify]', err)
    res.status(500).json({ message: 'Verification failed' })
  }
})

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────

router.post('/seller/onboarding/complete', requireSeller, async (req: AuthRequest, res) => {
  const schema = z.object({
    businessName: z.string().min(1).max(80),
    sellerType: z.enum(['seller', 'tailor', 'cobbler', 'bag_maker', 'jewellery_maker']),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  try {
    await db.query(
      `UPDATE sellers
         SET business_name = $1, seller_type = $2, onboarding_done = true, updated_at = NOW()
       WHERE id = $3`,
      [parsed.data.businessName, parsed.data.sellerType, req.userId],
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[seller/onboarding/complete]', err)
    res.status(500).json({ message: 'Failed to save onboarding' })
  }
})

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

router.get('/seller/profile', requireSeller, async (req: AuthRequest, res) => {
  try {
    const seller = await getSeller(req.userId!)
    if (!seller) { res.status(404).json({ message: 'Seller not found' }); return }
    res.json({
      id: seller.id,
      phone: seller.phone,
      businessName: seller.business_name,
      sellerType: seller.seller_type,
      tier: seller.tier,
      bio: seller.bio ?? '',
      instagramHandle: seller.instagram_handle ?? '',
      whatsappNumber: seller.whatsapp_number ?? '',
      location: seller.location ?? '',
      onboardingDone: seller.onboarding_done,
    })
  } catch (err) {
    console.error('[seller/profile GET]', err)
    res.status(500).json({ message: 'Failed to load profile' })
  }
})

router.patch('/seller/profile', requireSeller, async (req: AuthRequest, res) => {
  const schema = z.object({
    bio:             z.string().max(300).optional(),
    instagramHandle: z.string().max(50).optional(),
    whatsappNumber:  z.string().max(20).optional(),
    location:        z.string().max(100).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { bio, instagramHandle, whatsappNumber, location } = parsed.data
  try {
    await db.query(
      `UPDATE sellers
         SET bio              = COALESCE($1, bio),
             instagram_handle = COALESCE($2, instagram_handle),
             whatsapp_number  = COALESCE($3, whatsapp_number),
             location         = COALESCE($4, location),
             updated_at       = NOW()
       WHERE id = $5`,
      [bio ?? null, instagramHandle ?? null, whatsappNumber ?? null, location ?? null, req.userId],
    )
    const seller = await getSeller(req.userId!)
    res.json({
      id: seller.id,
      businessName: seller.business_name,
      sellerType: seller.seller_type,
      tier: seller.tier,
      bio: seller.bio ?? '',
      instagramHandle: seller.instagram_handle ?? '',
      whatsappNumber: seller.whatsapp_number ?? '',
      location: seller.location ?? '',
    })
  } catch (err) {
    console.error('[seller/profile PATCH]', err)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// ─────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────

const InventorySchema = z.object({
  name:              z.string().min(1).max(120),
  category:          z.string().min(1),
  priceKES:          z.number().int().positive(),
  occasionTags:      z.array(z.string()).default([]),
  sizes:             z.array(z.object({ size: z.string(), quantity: z.number().int().min(0) })).default([]),
  discountPercent:   z.number().int().min(0).max(100).nullable().default(null),
  discountExpiresAt: z.string().nullable().default(null),
})

function mapItem(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    priceKES: r.price_kes,
    occasionTags: r.occasion_tags,
    sizes: r.sizes,
    showcaseImageUrl: r.showcase_image_url,
    isLive: r.is_live,
    discountPercent: r.discount_percent,
    discountExpiresAt: r.discount_expires_at,
    createdAt: r.created_at,
  }
}

router.get('/seller/inventory', requireSeller, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, category, price_kes, occasion_tags, sizes, showcase_image_url,
              is_live, discount_percent, discount_expires_at, created_at
       FROM inventory_items WHERE seller_id = $1 ORDER BY created_at DESC`,
      [req.userId],
    )
    res.json(result.rows.map(mapItem))
  } catch (err) {
    console.error('[seller/inventory GET]', err)
    res.status(500).json({ message: 'Failed to load inventory' })
  }
})

router.get('/seller/inventory/:id', requireSeller, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM inventory_items WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.userId],
    )
    if (!result.rows[0]) { res.status(404).json({ message: 'Item not found' }); return }
    res.json(mapItem(result.rows[0]))
  } catch (err) {
    console.error('[seller/inventory/:id GET]', err)
    res.status(500).json({ message: 'Failed to load item' })
  }
})

router.post('/seller/inventory', requireSeller, async (req: AuthRequest, res) => {
  const parsed = InventorySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { name, category, priceKES, occasionTags, sizes, discountPercent, discountExpiresAt } = parsed.data
  try {
    const result = await db.query(
      `INSERT INTO inventory_items
         (seller_id, name, category, price_kes, occasion_tags, sizes, discount_percent, discount_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.userId, name, category, priceKES, occasionTags, JSON.stringify(sizes), discountPercent, discountExpiresAt],
    )
    res.status(201).json({ id: result.rows[0].id })
  } catch (err) {
    console.error('[seller/inventory POST]', err)
    res.status(500).json({ message: 'Failed to create item' })
  }
})

router.patch('/seller/inventory/:id', requireSeller, async (req: AuthRequest, res) => {
  const schema = z.object({
    name:     z.string().min(1).max(120).optional(),
    priceKES: z.number().int().positive().optional(),
    isLive:   z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  try {
    const own = await db.query(
      'SELECT id FROM inventory_items WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.userId],
    )
    if (!own.rows[0]) { res.status(404).json({ message: 'Item not found' }); return }

    const { name, priceKES, isLive } = parsed.data
    await db.query(
      `UPDATE inventory_items
         SET name      = COALESCE($1, name),
             price_kes = COALESCE($2, price_kes),
             is_live   = COALESCE($3, is_live),
             updated_at = NOW()
       WHERE id = $4`,
      [name ?? null, priceKES ?? null, isLive ?? null, req.params.id],
    )
    const result = await db.query('SELECT * FROM inventory_items WHERE id = $1', [req.params.id])
    res.json(mapItem(result.rows[0]))
  } catch (err) {
    console.error('[seller/inventory/:id PATCH]', err)
    res.status(500).json({ message: 'Failed to update item' })
  }
})

router.delete('/seller/inventory/:id', requireSeller, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'DELETE FROM inventory_items WHERE id = $1 AND seller_id = $2 RETURNING id',
      [req.params.id, req.userId],
    )
    if (!result.rows[0]) { res.status(404).json({ message: 'Item not found' }); return }
    res.json({ success: true })
  } catch (err) {
    console.error('[seller/inventory/:id DELETE]', err)
    res.status(500).json({ message: 'Failed to delete item' })
  }
})

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

router.get('/seller/dashboard', requireSeller, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [todayStats, weeklyStats, itemBreakdown] = await Promise.all([
      db.query(
        `SELECT COALESCE(SUM(final_price_kes), 0) AS revenue, COUNT(*) AS items_sold
         FROM pos_transactions
         WHERE seller_id = $1 AND payment_status = 'paid' AND DATE(created_at) = $2`,
        [req.userId, today],
      ),
      db.query(
        `SELECT COALESCE(SUM(final_price_kes), 0) AS revenue
         FROM pos_transactions
         WHERE seller_id = $1 AND payment_status = 'paid'
           AND created_at >= NOW() - INTERVAL '7 days'`,
        [req.userId],
      ),
      db.query(
        `SELECT item_name, COUNT(*) AS count, SUM(final_price_kes) AS revenue
         FROM pos_transactions
         WHERE seller_id = $1 AND payment_status = 'paid'
           AND created_at >= NOW() - INTERVAL '7 days'
         GROUP BY item_name ORDER BY count DESC LIMIT 5`,
        [req.userId],
      ),
    ])
    res.json({
      todayRevenueKES:   parseInt(todayStats.rows[0].revenue),
      todayItemsSold:    parseInt(todayStats.rows[0].items_sold),
      storefrontViews:   0,
      weeklyRevenueKES:  parseInt(weeklyStats.rows[0].revenue),
      weeklyAggregates:  { impressions: 0, saves: 0, follows: 0, talkToSeller: 0 },
      itemBreakdown: itemBreakdown.rows.map(r => ({
        itemName:   r.item_name,
        count:      parseInt(r.count as string),
        revenueKES: parseInt(r.revenue as string),
      })),
    })
  } catch (err) {
    console.error('[seller/dashboard]', err)
    res.status(500).json({ message: 'Failed to load dashboard' })
  }
})

// ─────────────────────────────────────────────
// POS
// ─────────────────────────────────────────────

router.get('/seller/pos/summary', requireSeller, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN payment_status = 'paid' AND DATE(created_at) = $2 THEN final_price_kes END), 0)      AS today_revenue,
         COALESCE(COUNT(CASE WHEN payment_status = 'paid' AND DATE(created_at) = $2 THEN 1 END), 0)                  AS today_items_sold,
         COALESCE(COUNT(CASE WHEN payment_status IN ('partially_paid','owing') THEN 1 END), 0)                       AS outstanding_count,
         COALESCE(SUM(CASE WHEN payment_status IN ('partially_paid','owing') THEN final_price_kes END), 0)           AS outstanding_kes
       FROM pos_transactions WHERE seller_id = $1`,
      [req.userId, today],
    )
    const r = result.rows[0]
    res.json({
      todayRevenueKES:   parseInt(r.today_revenue),
      todayItemsSold:    parseInt(r.today_items_sold),
      outstandingCount:  parseInt(r.outstanding_count),
      outstandingKES:    parseInt(r.outstanding_kes),
    })
  } catch (err) {
    console.error('[seller/pos/summary]', err)
    res.status(500).json({ message: 'Failed to load POS summary' })
  }
})

const SCOPE_FILTERS: Record<string, string> = {
  today: 'DATE(created_at) = CURRENT_DATE',
  week:  "created_at >= NOW() - INTERVAL '7 days'",
  month: "created_at >= NOW() - INTERVAL '30 days'",
}

router.get('/seller/pos/transactions', requireSeller, async (req: AuthRequest, res) => {
  const scope = (req.query.scope as string) ?? 'today'
  const filter = SCOPE_FILTERS[scope] ?? SCOPE_FILTERS.today
  try {
    const result = await db.query(
      `SELECT id, item_id, item_name, listed_price_kes, final_price_kes,
              payment_method, payment_status, client_id, created_at
       FROM pos_transactions WHERE seller_id = $1 AND ${filter}
       ORDER BY created_at DESC`,
      [req.userId],
    )
    res.json(result.rows.map(r => ({
      id:             r.id,
      itemId:         r.item_id,
      itemName:       r.item_name,
      listedPriceKES: r.listed_price_kes,
      finalPriceKES:  r.final_price_kes,
      paymentMethod:  r.payment_method,
      paymentStatus:  r.payment_status,
      clientId:       r.client_id,
      createdAt:      r.created_at,
    })))
  } catch (err) {
    console.error('[seller/pos/transactions GET]', err)
    res.status(500).json({ message: 'Failed to load transactions' })
  }
})

const POSTransactionSchema = z.object({
  itemId:         z.string().uuid().nullable().default(null),
  itemName:       z.string().min(1),
  listedPriceKES: z.number().int().positive(),
  finalPriceKES:  z.number().int().min(0),
  paymentMethod:  z.enum(['mpesa', 'cash', 'bank_transfer', 'card']),
  paymentStatus:  z.enum(['paid', 'partially_paid', 'owing']),
  clientId:       z.string().uuid().nullable().default(null),
})

router.post('/seller/pos/transactions', requireSeller, async (req: AuthRequest, res) => {
  const parsed = POSTransactionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { itemId, itemName, listedPriceKES, finalPriceKES, paymentMethod, paymentStatus, clientId } = parsed.data
  try {
    const result = await db.query(
      `INSERT INTO pos_transactions
         (seller_id, item_id, item_name, listed_price_kes, final_price_kes, payment_method, payment_status, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.userId, itemId, itemName, listedPriceKES, finalPriceKES, paymentMethod, paymentStatus, clientId],
    )
    if (clientId && paymentStatus === 'paid') {
      await db.query(
        'UPDATE seller_clients SET last_purchase_date = NOW() WHERE id = $1',
        [clientId],
      )
    }
    res.status(201).json({ id: result.rows[0].id })
  } catch (err) {
    console.error('[seller/pos/transactions POST]', err)
    res.status(500).json({ message: 'Failed to record transaction' })
  }
})

// ─────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────

router.get('/seller/clients', requireSeller, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT id, consumer_username, nickname, whatsapp_number, last_purchase_date,
              try_on_sent, try_on_acted, created_at
       FROM seller_clients WHERE seller_id = $1 ORDER BY last_purchase_date DESC NULLS LAST`,
      [req.userId],
    )
    res.json(result.rows.map(r => ({
      id:               r.id,
      consumerUsername: r.consumer_username,
      nickname:         r.nickname,
      whatsappNumber:   r.whatsapp_number,
      lastPurchaseDate: r.last_purchase_date,
      tryOnSent:        r.try_on_sent,
      tryOnActed:       r.try_on_acted,
      createdAt:        r.created_at,
    })))
  } catch (err) {
    console.error('[seller/clients GET]', err)
    res.status(500).json({ message: 'Failed to load clients' })
  }
})

router.get('/seller/clients/:id', requireSeller, async (req: AuthRequest, res) => {
  try {
    const client = await db.query(
      'SELECT * FROM seller_clients WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.userId],
    )
    if (!client.rows[0]) { res.status(404).json({ message: 'Client not found' }); return }

    const purchases = await db.query(
      `SELECT id, item_name, final_price_kes, payment_method, payment_status, created_at
       FROM pos_transactions WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.id],
    )
    const c = client.rows[0]
    res.json({
      id:               c.id,
      sellerId:         c.seller_id,
      consumerUsername: c.consumer_username,
      nickname:         c.nickname,
      whatsappNumber:   c.whatsapp_number,
      lastPurchaseDate: c.last_purchase_date,
      tryOnSent:        c.try_on_sent,
      tryOnActed:       c.try_on_acted,
      purchaseHistory:  purchases.rows.map(p => ({
        id:             p.id,
        itemName:       p.item_name,
        finalPriceKES:  p.final_price_kes,
        paymentMethod:  p.payment_method,
        paymentStatus:  p.payment_status,
        createdAt:      p.created_at,
      })),
    })
  } catch (err) {
    console.error('[seller/clients/:id GET]', err)
    res.status(500).json({ message: 'Failed to load client' })
  }
})

router.post('/seller/clients', requireSeller, async (req: AuthRequest, res) => {
  const schema = z.object({
    consumerUsername: z.string().min(1).max(80),
    nickname:         z.string().min(1).max(80),
    whatsappNumber:   z.string().max(20).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  try {
    const result = await db.query(
      `INSERT INTO seller_clients (seller_id, consumer_username, nickname, whatsapp_number)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.userId, parsed.data.consumerUsername, parsed.data.nickname, parsed.data.whatsappNumber ?? null],
    )
    res.status(201).json({ id: result.rows[0].id })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'Client already exists' })
      return
    }
    console.error('[seller/clients POST]', err)
    res.status(500).json({ message: 'Failed to add client' })
  }
})

router.post('/seller/clients/:id/try-on', requireSeller, async (req: AuthRequest, res) => {
  const schema = z.object({
    itemId: z.string().uuid(),
    note:   z.string().max(300).nullable().default(null),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  try {
    const client = await db.query(
      'SELECT id FROM seller_clients WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.userId],
    )
    if (!client.rows[0]) { res.status(404).json({ message: 'Client not found' }); return }

    const item = await db.query(
      'SELECT id FROM inventory_items WHERE id = $1 AND seller_id = $2',
      [parsed.data.itemId, req.userId],
    )
    if (!item.rows[0]) { res.status(404).json({ message: 'Item not found' }); return }

    await db.query(
      'INSERT INTO try_ons (client_id, item_id, note) VALUES ($1, $2, $3)',
      [req.params.id, parsed.data.itemId, parsed.data.note],
    )
    await db.query(
      'UPDATE seller_clients SET try_on_sent = try_on_sent + 1 WHERE id = $1',
      [req.params.id],
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[seller/clients/:id/try-on]', err)
    res.status(500).json({ message: 'Failed to send try-on' })
  }
})

// ─────────────────────────────────────────────
// FACE LIBRARY
// ─────────────────────────────────────────────

router.get('/seller/faces', requireSeller, (_req, res) => {
  res.json(FACE_LIBRARY)
})

// ─────────────────────────────────────────────
// SHOWCASE GENERATION
// ─────────────────────────────────────────────

const ShowcaseSchema = z.object({
  mode:   z.enum(['full_body', 'face_neck', 'studio']),
  faceId: z.string().nullable().default(null),
})

router.post('/seller/inventory/:id/showcase', requireSeller, async (req: AuthRequest, res) => {
  const parsed = ShowcaseSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }

  if (!imagenConfigured() || !r2Configured()) {
    res.status(503).json({
      message: 'Showcase generation not yet configured. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_SERVICE_ACCOUNT_JSON, and Cloudflare R2 env vars on Render.',
    })
    return
  }

  const { mode, faceId } = parsed.data

  try {
    // Verify item belongs to this seller
    const itemResult = await db.query(
      'SELECT id, name, category, occasion_tags FROM inventory_items WHERE id = $1 AND seller_id = $2',
      [req.params.id, req.userId],
    )
    if (!itemResult.rows[0]) {
      res.status(404).json({ message: 'Item not found' })
      return
    }

    const item = itemResult.rows[0]
    const face = faceId ? (FACE_LIBRARY.find(f => f.id === faceId) ?? null) : null

    const prompt = buildPrompt(
      item.name as string,
      item.category as string,
      (item.occasion_tags as string[]) ?? [],
      mode as ShowcaseMode,
      face,
    )

    const imageBuffer = await generateWithImagen3(prompt)
    const r2Key = `showcase/${req.userId}/${item.id}/${Date.now()}.png`
    const resultUrl = await uploadToR2(imageBuffer, r2Key)

    // Persist the generated showcase URL on the item
    await db.query(
      'UPDATE inventory_items SET showcase_image_url = $1, updated_at = NOW() WHERE id = $2',
      [resultUrl, item.id],
    )

    res.json({ resultUrl })
  } catch (err) {
    console.error('[seller/inventory/:id/showcase]', err)
    res.status(500).json({ message: 'Showcase generation failed' })
  }
})

// ─────────────────────────────────────────────
// AD BOOST WAITLIST
// ─────────────────────────────────────────────

router.post('/seller/adboost/waitlist', requireSeller, async (req: AuthRequest, res) => {
  try {
    await db.query(
      'INSERT INTO adboost_waitlist (seller_id) VALUES ($1) ON CONFLICT (seller_id) DO NOTHING',
      [req.userId],
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[seller/adboost/waitlist]', err)
    res.status(500).json({ message: 'Failed to join waitlist' })
  }
})

export default router
