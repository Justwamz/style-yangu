import { Router, type IRouter, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { emailConsumerByUsername, whatsAppSeller } from '../lib/notifications'
import { orderReadyEmail } from '../lib/emailTemplates'
import { mpesaConfigured, mpesaPayoutConfigured, b2cPayout, stkPush, escrowFeePercent } from '../lib/payments'

const router: IRouter = Router()

// A tailor/artisan is a seller account (seller_type in tailor/cobbler/...).
function requireArtisan(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'seller') {
      res.status(403).json({ message: 'Artisan access required' })
      return
    }
    next()
  })
}

async function getSeller(id: string) {
  const r = await db.query('SELECT * FROM sellers WHERE id = $1', [id])
  return r.rows[0] ?? null
}

function mapOrder(r: Record<string, unknown>) {
  return {
    id: r.id,
    artisanId: r.artisan_id,
    consumerUsername: r.consumer_username,
    nickname: r.nickname ?? null,
    status: r.status,
    brief: r.brief ?? {},
    fabricSource: r.fabric_source ?? null,
    measurements: r.measurements ?? {},
    depositPaidKES: r.deposit_paid_kes,
    balanceDueKES: r.balance_due_kes,
    promisedDate: r.promised_date,
    notes: r.notes ?? null,
    completionPhotos: r.completion_photos ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** Releases the escrow hold for an order. When M-Pesa B2C is configured, pays the
 *  artisan their net deposit (less the platform escrow fee) and stores the ref;
 *  otherwise the release is modelled (no money moves) until credentials are set. */
async function releaseEscrow(orderId: string): Promise<{ released: boolean; payout: 'sent' | 'stubbed' | 'failed'; netKES?: number }> {
  const esc = await db.query(
    `SELECT id, amount_kes, artisan_id FROM escrow_transactions WHERE order_id = $1 AND status = 'holding' ORDER BY held_at DESC LIMIT 1`,
    [orderId],
  )
  const row = esc.rows[0]
  if (!row) return { released: false, payout: 'stubbed' }

  const fee = escrowFeePercent()
  const netKES = Math.max(0, Math.round((row.amount_kes as number) * (100 - fee) / 100))

  if (mpesaPayoutConfigured()) {
    try {
      const seller = await db.query('SELECT whatsapp_number, phone FROM sellers WHERE id = $1', [row.artisan_id])
      const phone = seller.rows[0]?.whatsapp_number || seller.rows[0]?.phone
      if (!phone) throw new Error('artisan has no payout phone')
      const { conversationId } = await b2cPayout({ phone, amountKES: netKES, remarks: 'Style Yangu order payout' })
      await db.query(
        `UPDATE escrow_transactions SET status = 'released', released_at = NOW(), mpesa_ref = $1 WHERE id = $2`,
        [conversationId, row.id],
      )
      return { released: true, payout: 'sent', netKES }
    } catch (err) {
      console.error('[artisan] escrow B2C payout failed (left holding for retry):', err)
      return { released: false, payout: 'failed', netKES }
    }
  }

  // Not configured — model the release
  await db.query(`UPDATE escrow_transactions SET status = 'released', released_at = NOW() WHERE id = $1`, [row.id])
  return { released: true, payout: 'stubbed', netKES }
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

function mapArtisanProfile(s: Record<string, unknown>) {
  const sellerType = (s.seller_type as string) ?? 'tailor'
  const artisanType = sellerType === 'seller' ? 'tailor' : sellerType
  return {
    id: s.id,
    slug: s.slug ?? '',
    businessName: s.business_name,
    artisanType,
    artisanTier: s.artisan_tier ?? 'free',
    phone: s.phone,
    bio: s.bio ?? null,
    instagramHandle: s.instagram_handle ?? null,
    whatsappNumber: s.whatsapp_number ?? null,
    location: s.location ?? null,
    specialisationTags: s.specialisation_tags ?? [],
    turnaroundDays: s.turnaround_days ?? null,
    priceRange: s.price_range ?? null,
    verified: s.verified ?? false,
    onboardingDone: s.onboarding_done,
    createdAt: s.created_at,
  }
}

router.get('/artisan/profile', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const s = await getSeller(req.userId!)
    if (!s) { res.status(404).json({ message: 'Artisan not found' }); return }
    res.json(mapArtisanProfile(s))
  } catch (err) {
    console.error('[artisan/profile GET]', err)
    res.status(500).json({ message: 'Failed to load profile' })
  }
})

router.patch('/artisan/profile', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({
    bio:                z.string().max(400).optional(),
    instagramHandle:    z.string().max(50).optional(),
    whatsappNumber:     z.string().max(20).optional(),
    location:           z.string().max(120).optional(),
    specialisationTags: z.array(z.string().max(40)).max(12).optional(),
    turnaroundDays:     z.number().int().min(1).max(365).nullable().optional(),
    priceRange:         z.string().max(40).optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  const d = parsed.data
  try {
    await db.query(
      `UPDATE sellers SET
         bio                 = COALESCE($1, bio),
         instagram_handle    = COALESCE($2, instagram_handle),
         whatsapp_number     = COALESCE($3, whatsapp_number),
         location            = COALESCE($4, location),
         specialisation_tags = COALESCE($5, specialisation_tags),
         turnaround_days     = COALESCE($6, turnaround_days),
         price_range         = COALESCE($7, price_range),
         updated_at          = NOW()
       WHERE id = $8`,
      [
        d.bio ?? null,
        d.instagramHandle ?? null,
        d.whatsappNumber ?? null,
        d.location ?? null,
        d.specialisationTags ?? null,
        d.turnaroundDays === undefined ? null : d.turnaroundDays,
        d.priceRange ?? null,
        req.userId,
      ],
    )
    const s = await getSeller(req.userId!)
    res.json(mapArtisanProfile(s))
  } catch (err) {
    console.error('[artisan/profile PATCH]', err)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

router.get('/artisan/dashboard', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const [orders, escrow] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('received','in_progress'))            AS active_orders,
           COUNT(*) FILTER (WHERE status = 'ready_for_collection')                 AS ready,
           COALESCE(SUM(balance_due_kes) FILTER (WHERE status IN ('received','in_progress','ready_for_collection')), 0) AS outstanding,
           COUNT(*) FILTER (WHERE status IN ('collected','auto_released')
             AND updated_at >= NOW() - INTERVAL '7 days')                          AS completed_week
         FROM artisan_orders WHERE artisan_id = $1`,
        [req.userId],
      ),
      db.query(
        `SELECT COALESCE(SUM(amount_kes), 0) AS held FROM escrow_transactions WHERE artisan_id = $1 AND status = 'holding'`,
        [req.userId],
      ),
    ])
    const o = orders.rows[0]
    res.json({
      activeOrders:          parseInt(o.active_orders),
      readyForCollection:    parseInt(o.ready),
      outstandingBalanceKES: parseInt(o.outstanding),
      escrowHeldKES:         parseInt(escrow.rows[0].held),
      completedThisWeek:     parseInt(o.completed_week),
    })
  } catch (err) {
    console.error('[artisan/dashboard]', err)
    res.status(500).json({ message: 'Failed to load dashboard' })
  }
})

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

const ORDER_STATUSES = ['received', 'in_progress', 'ready_for_collection', 'collected', 'auto_released', 'disputed'] as const

const BriefSchema = z.object({
  fabricDescription:   z.string().max(400).optional(),
  fabricPhotoUrl:      z.string().optional(),
  avatarRenderUrl:     z.string().optional(),
  silhouette:          z.string().max(80).optional(),
  occasion:            z.string().max(80).optional(),
  specialInstructions: z.string().max(600).optional(),
}).default({})

const MeasurementsSchema = z.object({
  bust:       z.number().optional(),
  waist:      z.number().optional(),
  hips:       z.number().optional(),
  length:     z.number().optional(),
  shoulder:   z.number().optional(),
  footLength: z.number().optional(),
  footWidth:  z.number().optional(),
  lastWidth:  z.number().optional(),
}).default({})

router.get('/artisan/orders', requireArtisan, async (req: AuthRequest, res) => {
  const status = req.query.status as string | undefined
  try {
    const rows = status && (ORDER_STATUSES as readonly string[]).includes(status)
      ? await db.query('SELECT * FROM artisan_orders WHERE artisan_id = $1 AND status = $2 ORDER BY created_at DESC', [req.userId, status])
      : await db.query('SELECT * FROM artisan_orders WHERE artisan_id = $1 ORDER BY created_at DESC', [req.userId])
    res.json(rows.rows.map(mapOrder))
  } catch (err) {
    console.error('[artisan/orders GET]', err)
    res.status(500).json({ message: 'Failed to load orders' })
  }
})

router.get('/artisan/orders/:id', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const r = await db.query('SELECT * FROM artisan_orders WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!r.rows[0]) { res.status(404).json({ message: 'Order not found' }); return }
    const escrow = await db.query('SELECT status, amount_kes FROM escrow_transactions WHERE order_id = $1 ORDER BY held_at DESC LIMIT 1', [req.params.id])
    res.json({ ...mapOrder(r.rows[0]), escrow: escrow.rows[0] ? { status: escrow.rows[0].status, amountKES: escrow.rows[0].amount_kes } : null })
  } catch (err) {
    console.error('[artisan/orders/:id GET]', err)
    res.status(500).json({ message: 'Failed to load order' })
  }
})

router.post('/artisan/orders', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({
    consumerUsername: z.string().min(1).max(80),
    nickname:         z.string().max(80).nullable().default(null),
    brief:            BriefSchema,
    fabricSource:     z.enum(['customer', 'artisan']).nullable().default(null),
    measurements:     MeasurementsSchema,
    depositPaidKES:   z.number().int().min(0).default(0),
    balanceDueKES:    z.number().int().min(0).default(0),
    promisedDate:     z.string().nullable().default(null),
    notes:            z.string().max(600).nullable().default(null),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  const d = parsed.data
  try {
    const result = await db.query(
      `INSERT INTO artisan_orders
         (artisan_id, consumer_username, nickname, brief, fabric_source, measurements, deposit_paid_kes, balance_due_kes, promised_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        req.userId, d.consumerUsername, d.nickname,
        JSON.stringify(d.brief), d.fabricSource, JSON.stringify(d.measurements),
        d.depositPaidKES, d.balanceDueKES, d.promisedDate, d.notes,
      ],
    )
    const orderId = result.rows[0].id
    // Hold any deposit in escrow
    if (d.depositPaidKES > 0) {
      await db.query(
        `INSERT INTO escrow_transactions (order_id, artisan_id, amount_kes) VALUES ($1, $2, $3)`,
        [orderId, req.userId, d.depositPaidKES],
      )
    }
    res.status(201).json({ id: orderId })
  } catch (err) {
    console.error('[artisan/orders POST]', err)
    res.status(500).json({ message: 'Failed to create order' })
  }
})

router.patch('/artisan/orders/:id', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({
    status:         z.enum(ORDER_STATUSES).optional(),
    measurements:   MeasurementsSchema.optional(),
    notes:          z.string().max(600).optional(),
    fabricSource:   z.enum(['customer', 'artisan']).optional(),
    depositPaidKES: z.number().int().min(0).optional(),
    balanceDueKES:  z.number().int().min(0).optional(),
    promisedDate:   z.string().nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  const d = parsed.data
  try {
    const existing = await db.query('SELECT * FROM artisan_orders WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!existing.rows[0]) { res.status(404).json({ message: 'Order not found' }); return }
    const current = existing.rows[0]

    // Completion photos mandatory before moving to ready_for_collection
    if (d.status === 'ready_for_collection') {
      const photos = (current.completion_photos as string[]) ?? []
      if (photos.length === 0) {
        res.status(400).json({ message: 'Add at least one completion photo before marking ready for collection.' })
        return
      }
    }

    await db.query(
      `UPDATE artisan_orders SET
         status           = COALESCE($1, status),
         measurements     = COALESCE($2, measurements),
         notes            = COALESCE($3, notes),
         fabric_source    = COALESCE($4, fabric_source),
         deposit_paid_kes = COALESCE($5, deposit_paid_kes),
         balance_due_kes  = COALESCE($6, balance_due_kes),
         promised_date    = COALESCE($7, promised_date),
         updated_at       = NOW()
       WHERE id = $8`,
      [
        d.status ?? null,
        d.measurements ? JSON.stringify(d.measurements) : null,
        d.notes ?? null,
        d.fabricSource ?? null,
        d.depositPaidKES ?? null,
        d.balanceDueKES ?? null,
        d.promisedDate === undefined ? null : d.promisedDate,
        req.params.id,
      ],
    )

    // Releasing escrow on collection / auto-release
    let payout: { released: boolean; payout: string } | null = null
    if (d.status === 'collected' || d.status === 'auto_released') {
      payout = await releaseEscrow(req.params.id)
    }

    const updated = await db.query('SELECT * FROM artisan_orders WHERE id = $1', [req.params.id])
    const order = updated.rows[0]

    // ── Notifications (fire-and-forget) ──
    if (d.status === 'ready_for_collection') {
      const shop = await db.query('SELECT business_name FROM sellers WHERE id = $1', [req.userId])
      const shopName = (shop.rows[0]?.business_name as string) || 'your tailor'
      void emailConsumerByUsername(order.consumer_username, orderReadyEmail(shopName, order.balance_due_kes ?? 0))
    }
    if (payout?.released) {
      void whatsAppSeller(req.userId!, 'A held deposit has been released to your M-Pesa on Style Yangu.')
    }

    res.json({ ...mapOrder(order), escrowRelease: payout })
  } catch (err) {
    console.error('[artisan/orders/:id PATCH]', err)
    res.status(500).json({ message: 'Failed to update order' })
  }
})

router.post('/artisan/orders/:id/photos', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({ photos: z.array(z.string()).min(1).max(6) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const own = await db.query('SELECT completion_photos FROM artisan_orders WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!own.rows[0]) { res.status(404).json({ message: 'Order not found' }); return }
    const existing = (own.rows[0].completion_photos as string[]) ?? []
    const merged = [...existing, ...parsed.data.photos].slice(0, 6)
    await db.query('UPDATE artisan_orders SET completion_photos = $1, updated_at = NOW() WHERE id = $2', [merged, req.params.id])
    res.json({ completionPhotos: merged })
  } catch (err) {
    console.error('[artisan/orders/:id/photos]', err)
    res.status(500).json({ message: 'Failed to add photos' })
  }
})

// ─────────────────────────────────────────────
// ESCROW
// ─────────────────────────────────────────────

router.get('/artisan/escrow', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const rows = await db.query(
      `SELECT e.id, e.order_id, e.amount_kes, e.status, e.mpesa_ref, e.held_at, e.released_at, o.consumer_username
       FROM escrow_transactions e JOIN artisan_orders o ON e.order_id = o.id
       WHERE e.artisan_id = $1 ORDER BY e.held_at DESC`,
      [req.userId],
    )
    res.json(rows.rows.map(r => ({
      id: r.id,
      orderId: r.order_id,
      amountKES: r.amount_kes,
      status: r.status,
      mpesaRef: r.mpesa_ref ?? null,
      heldAt: r.held_at,
      releasedAt: r.released_at,
      consumerUsername: r.consumer_username,
    })))
  } catch (err) {
    console.error('[artisan/escrow GET]', err)
    res.status(500).json({ message: 'Failed to load escrow' })
  }
})

router.post('/artisan/orders/:id/escrow/release', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const own = await db.query('SELECT id FROM artisan_orders WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!own.rows[0]) { res.status(404).json({ message: 'Order not found' }); return }
    const result = await releaseEscrow(req.params.id)
    if (!result.released) { res.status(400).json({ message: 'No escrow held for this order' }); return }
    void whatsAppSeller(req.userId!, 'A held deposit has been released to your M-Pesa on Style Yangu.')
    res.json(result)
  } catch (err) {
    console.error('[artisan/orders/:id/escrow/release]', err)
    res.status(500).json({ message: 'Failed to release escrow' })
  }
})

// Request a deposit from the customer's phone via M-Pesa STK Push. On successful
// payment the callback creates the escrow hold and updates the order.
router.post('/artisan/orders/:id/deposit/request', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({ phone: z.string().min(1).max(20), amountKES: z.number().int().positive() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }

  if (!mpesaConfigured()) {
    res.status(503).json({ message: 'M-Pesa not configured. Set MPESA_* env vars to enable deposits.' })
    return
  }
  try {
    const own = await db.query('SELECT id FROM artisan_orders WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!own.rows[0]) { res.status(404).json({ message: 'Order not found' }); return }

    const stk = await stkPush({
      phone: parsed.data.phone,
      amountKES: parsed.data.amountKES,
      accountRef: `SY-${(req.params.id as string).slice(0, 8)}`,
      description: 'Deposit',
    })
    await db.query(
      `INSERT INTO payments (purpose, ref_id, phone, amount_kes, checkout_request_id, merchant_request_id)
       VALUES ('escrow_deposit', $1, $2, $3, $4, $5)`,
      [req.params.id, parsed.data.phone, parsed.data.amountKES, stk.checkoutRequestId, stk.merchantRequestId],
    )
    res.status(201).json({ checkoutRequestId: stk.checkoutRequestId, status: 'pending' })
  } catch (err) {
    console.error('[artisan/orders/:id/deposit/request]', err)
    res.status(500).json({ message: 'Failed to request deposit' })
  }
})

// ─────────────────────────────────────────────
// PORTFOLIO
// ─────────────────────────────────────────────

router.get('/artisan/portfolio', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const rows = await db.query('SELECT * FROM artisan_portfolio WHERE artisan_id = $1 ORDER BY created_at DESC', [req.userId])
    res.json(rows.rows.map(r => ({
      id: r.id, artisanId: r.artisan_id, imageUrl: r.image_url, caption: r.caption ?? null, createdAt: r.created_at,
    })))
  } catch (err) {
    console.error('[artisan/portfolio GET]', err)
    res.status(500).json({ message: 'Failed to load portfolio' })
  }
})

router.post('/artisan/portfolio', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({ imageUrl: z.string().min(1), caption: z.string().max(120).nullable().default(null) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const r = await db.query(
      'INSERT INTO artisan_portfolio (artisan_id, image_url, caption) VALUES ($1, $2, $3) RETURNING id',
      [req.userId, parsed.data.imageUrl, parsed.data.caption],
    )
    res.status(201).json({ id: r.rows[0].id })
  } catch (err) {
    console.error('[artisan/portfolio POST]', err)
    res.status(500).json({ message: 'Failed to add portfolio item' })
  }
})

router.delete('/artisan/portfolio/:id', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const r = await db.query('DELETE FROM artisan_portfolio WHERE id = $1 AND artisan_id = $2 RETURNING id', [req.params.id, req.userId])
    if (!r.rows[0]) { res.status(404).json({ message: 'Item not found' }); return }
    res.json({ success: true })
  } catch (err) {
    console.error('[artisan/portfolio/:id DELETE]', err)
    res.status(500).json({ message: 'Failed to delete portfolio item' })
  }
})

// ─────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────

function mapAppt(r: Record<string, unknown>) {
  return {
    id: r.id,
    artisanId: r.artisan_id,
    consumerUsername: r.consumer_username ?? null,
    slotStart: r.slot_start,
    slotEnd: r.slot_end,
    status: r.status,
    location: r.location ?? null,
    createdAt: r.created_at,
  }
}

router.get('/artisan/appointments', requireArtisan, async (req: AuthRequest, res) => {
  try {
    const rows = await db.query('SELECT * FROM artisan_appointments WHERE artisan_id = $1 ORDER BY slot_start ASC', [req.userId])
    res.json(rows.rows.map(mapAppt))
  } catch (err) {
    console.error('[artisan/appointments GET]', err)
    res.status(500).json({ message: 'Failed to load appointments' })
  }
})

router.post('/artisan/appointments', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({
    slotStart: z.string().min(1),
    slotEnd:   z.string().min(1),
    location:  z.string().max(120).nullable().default(null),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const r = await db.query(
      'INSERT INTO artisan_appointments (artisan_id, slot_start, slot_end, location) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.userId, parsed.data.slotStart, parsed.data.slotEnd, parsed.data.location],
    )
    res.status(201).json({ id: r.rows[0].id })
  } catch (err) {
    console.error('[artisan/appointments POST]', err)
    res.status(500).json({ message: 'Failed to create appointment slot' })
  }
})

router.patch('/artisan/appointments/:id', requireArtisan, async (req: AuthRequest, res) => {
  const schema = z.object({
    status:           z.enum(['available', 'booked', 'completed', 'cancelled']).optional(),
    consumerUsername: z.string().max(80).nullable().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const own = await db.query('SELECT id FROM artisan_appointments WHERE id = $1 AND artisan_id = $2', [req.params.id, req.userId])
    if (!own.rows[0]) { res.status(404).json({ message: 'Appointment not found' }); return }
    await db.query(
      `UPDATE artisan_appointments SET
         status            = COALESCE($1, status),
         consumer_username = COALESCE($2, consumer_username)
       WHERE id = $3`,
      [parsed.data.status ?? null, parsed.data.consumerUsername ?? null, req.params.id],
    )
    const updated = await db.query('SELECT * FROM artisan_appointments WHERE id = $1', [req.params.id])
    res.json(mapAppt(updated.rows[0]))
  } catch (err) {
    console.error('[artisan/appointments/:id PATCH]', err)
    res.status(500).json({ message: 'Failed to update appointment' })
  }
})

export default router
