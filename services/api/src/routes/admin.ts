import { Router, type IRouter, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'
import { JWT_SECRET } from '../config'
import { requireAuth, type AuthRequest } from '../middleware/auth'

const router: IRouter = Router()

const ARTISAN_SQL_LIST = `('tailor','cobbler','bag_maker','jewellery_maker')`

// Admin credentials are configured via env at launch (external-connections policy):
//   ADMIN_EMAIL, ADMIN_PASSWORD
function adminConfigured(): boolean {
  return !!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'admin') {
      res.status(403).json({ message: 'Admin access required' })
      return
    }
    next()
  })
}

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

router.post('/admin/auth/login', (req, res) => {
  if (!adminConfigured()) {
    res.status(503).json({ message: 'Admin login not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD on the server.' })
    return
  }
  const schema = z.object({ email: z.string().min(1), password: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }

  const emailOk = parsed.data.email.trim().toLowerCase() === process.env.ADMIN_EMAIL!.trim().toLowerCase()
  const passOk = parsed.data.password === process.env.ADMIN_PASSWORD
  if (!emailOk || !passOk) {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }
  const token = jwt.sign({ sub: `admin:${parsed.data.email}`, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ token })
})

// ─────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────

router.get('/admin/users', requireAdmin, async (req: AuthRequest, res) => {
  const kind = (req.query.kind as string) ?? 'seller'
  try {
    if (kind === 'consumer') {
      const r = await db.query(
        `SELECT u.id, u.email, u.status, u.created_at,
                (op.user_id IS NOT NULL) AS onboarded
         FROM users u LEFT JOIN onboarding_profiles op ON op.user_id = u.id
         ORDER BY u.created_at DESC LIMIT 500`,
      )
      res.json(r.rows.map(u => ({
        id: u.id,
        kind: 'consumer',
        label: u.email,
        detail: u.onboarded ? 'Onboarded' : 'Signed up',
        status: u.status,
        createdAt: u.created_at,
      })))
      return
    }

    const isArtisan = kind === 'artisan'
    const r = await db.query(
      `SELECT id, business_name, phone, seller_type, tier, artisan_tier, status, verified, created_at
       FROM sellers
       WHERE seller_type ${isArtisan ? 'IN ' + ARTISAN_SQL_LIST : "= 'seller'"}
       ORDER BY created_at DESC LIMIT 500`,
    )
    res.json(r.rows.map(s => ({
      id: s.id,
      kind: isArtisan ? 'artisan' : 'seller',
      label: s.business_name || s.phone,
      detail: isArtisan
        ? `${s.seller_type} · ${s.artisan_tier}`
        : `${s.tier}`,
      status: s.status,
      verified: s.verified,
      createdAt: s.created_at,
    })))
  } catch (err) {
    console.error('[admin/users]', err)
    res.status(500).json({ message: 'Failed to load users' })
  }
})

router.post('/admin/accounts/:kind/:id/status', requireAdmin, async (req: AuthRequest, res) => {
  const schema = z.object({ status: z.enum(['active', 'suspended', 'banned']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  const { kind, id } = req.params
  const table = kind === 'consumer' ? 'users' : kind === 'seller' || kind === 'artisan' ? 'sellers' : null
  if (!table) { res.status(400).json({ message: 'Invalid account kind' }); return }
  try {
    const r = await db.query(`UPDATE ${table} SET status = $1 WHERE id = $2 RETURNING id`, [parsed.data.status, id])
    if (!r.rows[0]) { res.status(404).json({ message: 'Account not found' }); return }
    res.json({ success: true, status: parsed.data.status })
  } catch (err) {
    console.error('[admin/accounts/status]', err)
    res.status(500).json({ message: 'Failed to update status' })
  }
})

// ─────────────────────────────────────────────
// ARTISAN VERIFICATION QUEUE
// ─────────────────────────────────────────────

router.get('/admin/artisans/pending', requireAdmin, async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT id, business_name, phone, seller_type, location, created_at
       FROM sellers
       WHERE seller_type IN ${ARTISAN_SQL_LIST} AND verified = false AND onboarding_done = true
       ORDER BY created_at ASC`,
    )
    res.json(r.rows.map(s => ({
      id: s.id,
      businessName: s.business_name,
      phone: s.phone,
      sellerType: s.seller_type,
      location: s.location ?? null,
      createdAt: s.created_at,
    })))
  } catch (err) {
    console.error('[admin/artisans/pending]', err)
    res.status(500).json({ message: 'Failed to load verification queue' })
  }
})

router.post('/admin/artisans/:id/verify', requireAdmin, async (req: AuthRequest, res) => {
  const schema = z.object({ verified: z.boolean().default(true) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    const r = await db.query(
      `UPDATE sellers SET verified = $1, updated_at = NOW()
       WHERE id = $2 AND seller_type IN ${ARTISAN_SQL_LIST} RETURNING id`,
      [parsed.data.verified, req.params.id],
    )
    if (!r.rows[0]) { res.status(404).json({ message: 'Artisan not found' }); return }
    res.json({ success: true, verified: parsed.data.verified })
  } catch (err) {
    console.error('[admin/artisans/verify]', err)
    res.status(500).json({ message: 'Failed to verify artisan' })
  }
})

// ─────────────────────────────────────────────
// FINANCIAL OVERSIGHT
// ─────────────────────────────────────────────

router.get('/admin/finance/summary', requireAdmin, async (_req, res) => {
  try {
    const [sellerTiers, artisanTiers, escrow, outstanding, pending] = await Promise.all([
      db.query(`SELECT tier, COUNT(*) AS n FROM sellers WHERE seller_type = 'seller' GROUP BY tier`),
      db.query(`SELECT artisan_tier, COUNT(*) AS n FROM sellers WHERE seller_type IN ${ARTISAN_SQL_LIST} GROUP BY artisan_tier`),
      db.query(`SELECT
                  COALESCE(SUM(amount_kes) FILTER (WHERE status = 'holding'), 0)  AS held,
                  COALESCE(SUM(amount_kes) FILTER (WHERE status = 'released'), 0) AS released
                FROM escrow_transactions`),
      db.query(`SELECT COALESCE(SUM(balance_due_kes), 0) AS bal
                FROM artisan_orders WHERE status IN ('received','in_progress','ready_for_collection')`),
      db.query(`SELECT COUNT(*) AS n FROM sellers WHERE seller_type IN ${ARTISAN_SQL_LIST} AND verified = false AND onboarding_done = true`),
    ])
    const toMap = (rows: Record<string, unknown>[], key: string) =>
      rows.reduce((acc, r) => { acc[r[key] as string] = parseInt(r.n as string); return acc }, {} as Record<string, number>)

    res.json({
      sellersByTier: toMap(sellerTiers.rows, 'tier'),
      artisansByTier: toMap(artisanTiers.rows, 'artisan_tier'),
      escrowHeldKES: parseInt(escrow.rows[0].held),
      escrowReleasedKES: parseInt(escrow.rows[0].released),
      outstandingArtisanBalanceKES: parseInt(outstanding.rows[0].bal),
      pendingVerifications: parseInt(pending.rows[0].n),
    })
  } catch (err) {
    console.error('[admin/finance/summary]', err)
    res.status(500).json({ message: 'Failed to load finance summary' })
  }
})

router.get('/admin/escrow', requireAdmin, async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT e.id, e.order_id, e.artisan_id, e.amount_kes, e.status, e.held_at, e.released_at,
              s.business_name, o.consumer_username
       FROM escrow_transactions e
       JOIN sellers s ON e.artisan_id = s.id
       JOIN artisan_orders o ON e.order_id = o.id
       ORDER BY e.held_at DESC LIMIT 200`,
    )
    res.json(r.rows.map(e => ({
      id: e.id,
      orderId: e.order_id,
      artisanId: e.artisan_id,
      artisanName: e.business_name,
      consumerUsername: e.consumer_username,
      amountKES: e.amount_kes,
      status: e.status,
      heldAt: e.held_at,
      releasedAt: e.released_at,
    })))
  } catch (err) {
    console.error('[admin/escrow]', err)
    res.status(500).json({ message: 'Failed to load escrow' })
  }
})

// ─────────────────────────────────────────────
// AD BOOST CONTROL (coming-soon until consumer threshold reached)
// ─────────────────────────────────────────────

async function getAdBoostState(): Promise<{ activation: 'coming_soon' | 'live'; phase: 1 | 2 | 3 }> {
  const r = await db.query(`SELECT value FROM platform_settings WHERE key = 'adboost'`)
  const v = r.rows[0]?.value as { activation?: string; phase?: number } | undefined
  return {
    activation: v?.activation === 'live' ? 'live' : 'coming_soon',
    phase: (v?.phase === 2 || v?.phase === 3 ? v.phase : 1) as 1 | 2 | 3,
  }
}

router.get('/admin/adboost', requireAdmin, async (_req, res) => {
  try {
    const [state, waitlist] = await Promise.all([
      getAdBoostState(),
      db.query(`SELECT COUNT(*) AS n FROM adboost_waitlist`),
    ])
    res.json({ ...state, waitlistCount: parseInt(waitlist.rows[0].n) })
  } catch (err) {
    console.error('[admin/adboost]', err)
    res.status(500).json({ message: 'Failed to load ad boost state' })
  }
})

router.post('/admin/adboost/phase', requireAdmin, async (req: AuthRequest, res) => {
  const schema = z.object({
    activation: z.enum(['coming_soon', 'live']),
    phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'Invalid input' }); return }
  try {
    await db.query(
      `INSERT INTO platform_settings (key, value) VALUES ('adboost', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [JSON.stringify(parsed.data)],
    )
    res.json({ success: true, ...parsed.data })
  } catch (err) {
    console.error('[admin/adboost/phase]', err)
    res.status(500).json({ message: 'Failed to update ad boost phase' })
  }
})

router.get('/admin/adboost/waitlist', requireAdmin, async (_req, res) => {
  try {
    const r = await db.query(
      `SELECT w.seller_id, w.joined_at, s.business_name, s.seller_type, s.tier
       FROM adboost_waitlist w JOIN sellers s ON w.seller_id = s.id
       ORDER BY w.joined_at ASC`,
    )
    res.json(r.rows.map(w => ({
      sellerId: w.seller_id,
      businessName: w.business_name,
      sellerType: w.seller_type,
      tier: w.tier,
      joinedAt: w.joined_at,
    })))
  } catch (err) {
    console.error('[admin/adboost/waitlist]', err)
    res.status(500).json({ message: 'Failed to load waitlist' })
  }
})

export default router
