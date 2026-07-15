import { GoogleAuth } from 'google-auth-library'
import { db } from '../db'
import { GOOGLE_SERVICE_ACCOUNT_JSON } from '../config'

// Content moderation (§11.2/§11.3): Google Cloud Vision Safe Search + three-strike
// enforcement. Guarded — when the Google service account isn't configured, checkImage
// allows everything (no-op) so nothing breaks before launch.
//
// Required env var at go-live: GOOGLE_SERVICE_ACCOUNT_JSON (Vision API enabled on the project).

const REJECTION_MESSAGE =
  "This photo does not meet Style Yangu's content guidelines. Please use a photo showing appropriate clothing. Appeals: support@styleyangu.co.ke"

export function moderationConfigured(): boolean {
  return !!GOOGLE_SERVICE_ACCOUNT_JSON
}

let _auth: GoogleAuth | null = null
function auth(): GoogleAuth {
  if (!_auth) {
    _auth = new GoogleAuth({
      credentials: JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
  }
  return _auth
}

type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY'
const RANK: Record<Likelihood, number> = {
  UNKNOWN: 0, VERY_UNLIKELY: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, VERY_LIKELY: 5,
}

function stripDataUrl(value: string): string {
  const m = /^data:[^;,]+;base64,(.+)$/s.exec(value)
  return m ? m[1] : value
}

/** Returns whether an image passes content guidelines. Allows everything when unconfigured. */
export async function checkImage(value: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!moderationConfigured()) return { allowed: true }
  const content = stripDataUrl(value)
  if (!content) return { allowed: true }

  try {
    const client = await auth().getClient()
    const token = (await client.getAccessToken()).token
    const res = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] }],
      }),
    })
    if (!res.ok) {
      console.error('[moderation] Vision error:', res.status)
      return { allowed: true } // fail-open: don't block users on our own outage
    }
    const data = await res.json() as { responses?: { safeSearchAnnotation?: Record<string, Likelihood> }[] }
    const s = data.responses?.[0]?.safeSearchAnnotation
    if (!s) return { allowed: true }

    // Nudity → reject at LIKELY+. Violence/racy (swimwear/lingerie proxy) → VERY_LIKELY.
    if (RANK[s.adult ?? 'UNKNOWN'] >= RANK.LIKELY) return { allowed: false, reason: 'nudity' }
    if (RANK[s.violence ?? 'UNKNOWN'] >= RANK.VERY_LIKELY) return { allowed: false, reason: 'violence' }
    if (RANK[s.racy ?? 'UNKNOWN'] >= RANK.VERY_LIKELY) return { allowed: false, reason: 'racy' }
    return { allowed: true }
  } catch (err) {
    console.error('[moderation] checkImage failed:', err)
    return { allowed: true } // fail-open
  }
}

type SubjectType = 'user' | 'seller'

/** Records a content violation and applies the three-strike policy (§11.3):
 *  1st = warning, 2nd = suspended, 3rd+ = banned. Returns strike count + action. */
export async function recordViolation(
  subjectType: SubjectType,
  subjectId: string,
  reason: string,
): Promise<{ strikes: number; action: 'warning' | 'suspended' | 'banned' }> {
  await db.query(
    `INSERT INTO content_violations (subject_type, subject_id, reason) VALUES ($1, $2, $3)`,
    [subjectType, subjectId, reason],
  )
  const count = await db.query(
    `SELECT COUNT(*) AS n FROM content_violations WHERE subject_type = $1 AND subject_id = $2`,
    [subjectType, subjectId],
  )
  const strikes = parseInt(count.rows[0].n) || 1

  let action: 'warning' | 'suspended' | 'banned' = 'warning'
  if (strikes >= 3) action = 'banned'
  else if (strikes === 2) action = 'suspended'

  if (action !== 'warning') {
    const table = subjectType === 'seller' ? 'sellers' : 'users'
    const status = action === 'banned' ? 'banned' : 'suspended'
    await db.query(`UPDATE ${table} SET status = $1 WHERE id = $2`, [status, subjectId])
  }
  return { strikes, action }
}

export interface EnforceResult {
  ok: boolean
  status?: number
  message?: string
}

/**
 * Moderates a user-supplied image before storage. On rejection, records a strike,
 * applies enforcement, and returns a 422 payload for the caller to send.
 */
export async function enforceImage(opts: {
  role: string | undefined
  userId: string | undefined
  value: string
}): Promise<EnforceResult> {
  const check = await checkImage(opts.value)
  if (check.allowed) return { ok: true }

  const subjectType: SubjectType = opts.role === 'seller' ? 'seller' : 'user'
  let note = ''
  if (opts.userId) {
    const { action } = await recordViolation(subjectType, opts.userId, check.reason ?? 'inappropriate')
    if (action === 'suspended') note = ' Your account has been suspended for 7 days.'
    else if (action === 'banned') note = ' Your account has been permanently banned.'
  }
  return { ok: false, status: 422, message: REJECTION_MESSAGE + note }
}
