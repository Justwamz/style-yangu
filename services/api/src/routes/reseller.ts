import { Router, type IRouter, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../db'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { computeReferralCounters, getOrCreateActiveCode, regenerateCode } from '../lib/referral'

const router: IRouter = Router()

function requireConsumer(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.userRole !== 'consumer') {
      res.status(403).json({ message: 'Consumer account required' })
      return
    }
    next()
  })
}

function appUrl(): string {
  return process.env.APP_URL ?? 'https://styleyangu.app'
}

// ─────────────────────────────────────────────
// PUBLIC: click tracking
// ─────────────────────────────────────────────

router.post('/referral/click', async (req, res) => {
  const schema = z.object({ code: z.string().min(1).max(16) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.json({ ok: true }); return } // never fail the client

  try {
    // Only count clicks on active, non-expired codes
    const valid = await db.query(
      `SELECT 1 FROM referral_codes WHERE code = $1 AND status = 'active' AND expires_at > NOW() LIMIT 1`,
      [parsed.data.code],
    )
    if (valid.rows[0]) {
      const ua = (req.headers['user-agent'] ?? '').toString().slice(0, 300)
      await db.query('INSERT INTO referral_clicks (code, user_agent) VALUES ($1, $2)', [parsed.data.code, ua])
    }
    res.json({ ok: true })
  } catch {
    res.json({ ok: true })
  }
})

// ─────────────────────────────────────────────
// ENROLLMENT
// ─────────────────────────────────────────────

router.post('/reseller/enroll', requireConsumer, async (req: AuthRequest, res) => {
  const schema = z.object({ payoutPhone: z.string().min(1).max(20) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: 'A valid M-Pesa phone number is required.' }); return }
  try {
    await db.query(
      `INSERT INTO reseller_profiles (user_id, payout_phone) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET payout_phone = $2`,
      [req.userId, parsed.data.payoutPhone],
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[reseller/enroll]', err)
    res.status(500).json({ message: 'Failed to enroll' })
  }
})

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

router.get('/reseller/dashboard', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const [member, code, counters, earnings] = await Promise.all([
      db.query('SELECT payout_phone FROM reseller_profiles WHERE user_id = $1', [req.userId]),
      getOrCreateActiveCode(req.userId!),
      computeReferralCounters(req.userId!),
      db.query(
        `SELECT
           COALESCE(SUM(amount_kes) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) AS month,
           COALESCE(SUM(amount_kes), 0)                                                          AS total,
           COALESCE(SUM(amount_kes) FILTER (WHERE status = 'paid'), 0)                           AS paid
         FROM referral_commissions WHERE referrer_id = $1`,
        [req.userId],
      ),
    ])

    const e = earnings.rows[0]
    const conversionRate = counters.totalJoined > 0
      ? Math.round((counters.upgradedThisMonth / counters.totalJoined) * 100)
      : 0

    res.json({
      enrolled: !!member.rows[0],
      payoutPhone: member.rows[0]?.payout_phone ?? null,
      code: code.code,
      shareUrl: `${appUrl()}/join/${code.code}`,
      expiresAt: code.expiresAt,
      counters,
      earnedThisMonthKES: parseInt(e.month),
      totalEarnedKES: parseInt(e.total),
      totalPaidKES: parseInt(e.paid),
      conversionRate,
    })
  } catch (err) {
    console.error('[reseller/dashboard]', err)
    res.status(500).json({ message: 'Failed to load dashboard' })
  }
})

// ─────────────────────────────────────────────
// REGENERATE CODE
// ─────────────────────────────────────────────

router.post('/reseller/code/regenerate', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const result = await regenerateCode(req.userId!)
    res.json({ code: result.code, expiresAt: result.expiresAt, shareUrl: `${appUrl()}/join/${result.code}` })
  } catch (err) {
    console.error('[reseller/code/regenerate]', err)
    res.status(500).json({ message: 'Failed to regenerate code' })
  }
})

// ─────────────────────────────────────────────
// EARNINGS HISTORY
// ─────────────────────────────────────────────

router.get('/reseller/earnings', requireConsumer, async (req: AuthRequest, res) => {
  try {
    const rows = await db.query(
      `SELECT id, amount_kes, status, created_at, paid_at
       FROM referral_commissions WHERE referrer_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [req.userId],
    )
    res.json(rows.rows.map(r => ({
      id: r.id,
      amountKES: r.amount_kes,
      status: r.status,
      createdAt: r.created_at,
      paidAt: r.paid_at,
    })))
  } catch (err) {
    console.error('[reseller/earnings]', err)
    res.status(500).json({ message: 'Failed to load earnings' })
  }
})

export default router
