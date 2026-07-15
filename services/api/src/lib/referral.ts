import { db } from '../db'

export interface ReferralCounters {
  totalClicks: number
  totalJoined: number
  awaitingUpgrade: number
  upgradedThisMonth: number
}

function genCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

/** Returns the user's active, non-expired referral code, creating one if needed. */
export async function getOrCreateActiveCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  const existing = await db.query(
    `SELECT code, expires_at FROM referral_codes
     WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  )
  if (existing.rows[0]) {
    return { code: existing.rows[0].code, expiresAt: existing.rows[0].expires_at }
  }
  const code = genCode()
  const exp = new Date()
  exp.setDate(exp.getDate() + 14)
  await db.query(
    `INSERT INTO referral_codes (user_id, code, expires_at) VALUES ($1, $2, $3)`,
    [userId, code, exp.toISOString()],
  )
  return { code, expiresAt: exp.toISOString() }
}

/** Mutes all active codes (forward-only) and issues a fresh 14-day code. */
export async function regenerateCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  await db.query(`UPDATE referral_codes SET status = 'muted' WHERE user_id = $1 AND status = 'active'`, [userId])
  const code = genCode()
  const exp = new Date()
  exp.setDate(exp.getDate() + 14)
  await db.query(
    `INSERT INTO referral_codes (user_id, code, expires_at) VALUES ($1, $2, $3)`,
    [userId, code, exp.toISOString()],
  )
  return { code, expiresAt: exp.toISOString() }
}

export async function computeReferralCounters(userId: string): Promise<ReferralCounters> {
  try {
    const [clicks, joined, awaiting, upgraded] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS n FROM referral_clicks c
         JOIN referral_codes rc ON c.code = rc.code
         WHERE rc.user_id = $1 AND rc.status = 'active'`,
        [userId],
      ),
      db.query(`SELECT COUNT(*) AS n FROM referral_attributions WHERE referrer_id = $1`, [userId]),
      db.query(
        `SELECT COUNT(*) AS n FROM referral_attributions
         WHERE referrer_id = $1 AND status = 'pending' AND signed_up_at > NOW() - INTERVAL '12 months'`,
        [userId],
      ),
      db.query(
        `SELECT COUNT(*) AS n FROM referral_commissions
         WHERE referrer_id = $1 AND created_at >= date_trunc('month', NOW())`,
        [userId],
      ),
    ])
    return {
      totalClicks: parseInt(clicks.rows[0].n) || 0,
      totalJoined: parseInt(joined.rows[0].n) || 0,
      awaitingUpgrade: parseInt(awaiting.rows[0].n) || 0,
      upgradedThisMonth: parseInt(upgraded.rows[0].n) || 0,
    }
  } catch {
    return { totalClicks: 0, totalJoined: 0, awaitingUpgrade: 0, upgradedThisMonth: 0 }
  }
}

/** Records an attribution linking a newly-signed-up user to the owner of a referral code. */
export async function attributeSignup(referralCode: string, referredId: string): Promise<void> {
  const owner = await db.query(
    `SELECT user_id FROM referral_codes
     WHERE code = $1 AND status = 'active' AND expires_at > NOW() LIMIT 1`,
    [referralCode],
  )
  const referrerId = owner.rows[0]?.user_id
  if (!referrerId || referrerId === referredId) return
  await db.query(
    `INSERT INTO referral_attributions (referrer_id, referred_id, clicked_at, status)
     VALUES ($1, $2, NOW(), 'pending')`,
    [referrerId, referredId],
  )
}
