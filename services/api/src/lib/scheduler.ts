import { db } from '../db'
import { releaseEscrow } from './escrow'
import { whatsAppSeller, sendPushToUser } from './notifications'

// Time-based jobs. All idempotent — safe to run repeatedly. Triggered via
// POST /internal/cron (external scheduler) and/or an in-process interval.

/** Auto-releases escrow 72h after an order is marked ready, if not disputed (§6.3). */
async function escrowAutoRelease(): Promise<number> {
  const due = await db.query(
    `SELECT id, artisan_id, consumer_username FROM artisan_orders
     WHERE status = 'ready_for_collection' AND updated_at < NOW() - INTERVAL '72 hours'`,
  )
  let n = 0
  for (const row of due.rows) {
    try {
      await db.query(`UPDATE artisan_orders SET status = 'auto_released', updated_at = NOW() WHERE id = $1`, [row.id])
      const r = await releaseEscrow(row.id)
      if (r.released) {
        void whatsAppSeller(row.artisan_id, 'An order was auto-released after 72 hours and your deposit is on its way to your M-Pesa.')
      }
      n++
    } catch (err) {
      console.error('[cron] escrowAutoRelease failed for order', row.id, err)
    }
  }
  return n
}

/** Marks referral codes expired past their 14-day window. */
async function expireReferralCodes(): Promise<number> {
  const r = await db.query(
    `UPDATE referral_codes SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()`,
  )
  return r.rowCount ?? 0
}

/** Purges referral attributions + clicks older than 12 months (privacy retention). */
async function purgeReferralData(): Promise<number> {
  const attr = await db.query(
    `DELETE FROM referral_attributions WHERE signed_up_at < NOW() - INTERVAL '12 months' AND status = 'pending'`,
  )
  await db.query(`DELETE FROM referral_clicks WHERE clicked_at < NOW() - INTERVAL '12 months'`)
  return attr.rowCount ?? 0
}

/** Lifts a 2nd-strike (suspended) account after 7 days; 3rd-strike bans stay. */
async function liftExpiredSuspensions(): Promise<number> {
  const users = await db.query(
    `UPDATE users SET status = 'active' WHERE status = 'suspended' AND id::text IN (
       SELECT subject_id FROM content_violations WHERE subject_type = 'user'
       GROUP BY subject_id HAVING COUNT(*) < 3 AND MAX(created_at) < NOW() - INTERVAL '7 days'
     )`,
  )
  const sellers = await db.query(
    `UPDATE sellers SET status = 'active' WHERE status = 'suspended' AND id::text IN (
       SELECT subject_id FROM content_violations WHERE subject_type = 'seller'
       GROUP BY subject_id HAVING COUNT(*) < 3 AND MAX(created_at) < NOW() - INTERVAL '7 days'
     )`,
  )
  return (users.rowCount ?? 0) + (sellers.rowCount ?? 0)
}

/** Re-engagement email for consumers inactive 7+ days (based on last daily suggestion). */
async function reEngagementEmails(): Promise<number> {
  const stale = await db.query(
    `SELECT u.id, u.email FROM users u
     WHERE u.status = 'active' AND u.email IS NOT NULL
       AND EXISTS (SELECT 1 FROM onboarding_profiles op WHERE op.user_id = u.id)
       AND COALESCE((SELECT MAX(date) FROM daily_suggestions ds WHERE ds.user_id = u.id), u.created_at::date)
           = (NOW() - INTERVAL '7 days')::date
     LIMIT 200`,
  )
  let n = 0
  for (const u of stale.rows) {
    // Non-transactional nudge — best-effort. (Push handled separately once SW ships.)
    void sendPushToUser(u.id, { title: 'Your stylist misses you', body: 'Amara has a fresh outfit idea for you today.', url: '/home' })
    n++
  }
  return n
}

export async function runDueJobs(): Promise<Record<string, number>> {
  const [escrow, expired, purged, lifted, reengaged] = await Promise.all([
    escrowAutoRelease().catch(e => { console.error('[cron] escrow', e); return 0 }),
    expireReferralCodes().catch(e => { console.error('[cron] expireCodes', e); return 0 }),
    purgeReferralData().catch(e => { console.error('[cron] purge', e); return 0 }),
    liftExpiredSuspensions().catch(e => { console.error('[cron] suspensions', e); return 0 }),
    reEngagementEmails().catch(e => { console.error('[cron] reengagement', e); return 0 }),
  ])
  const summary = { escrowAutoReleased: escrow, codesExpired: expired, attributionsPurged: purged, suspensionsLifted: lifted, reEngaged: reengaged }
  console.log('[cron] runDueJobs', summary)
  return summary
}
