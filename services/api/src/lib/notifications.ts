import { Resend } from 'resend'
import webpush from 'web-push'
import { db } from '../db'

// Notifications are best-effort and fully guarded — every sender no-ops (and logs)
// when its channel isn't configured, so nothing breaks before credentials are set.
//
// Required env vars at go-live:
//   Email     : RESEND_API_KEY, RESEND_FROM (e.g. "Style Yangu <hello@styleyangu.co.ke>")
//   WhatsApp  : WHATSAPP_TOKEN, WHATSAPP_PHONE_ID   (Meta WhatsApp Cloud API)
//   Web push  : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:… or https URL)

export function resendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM)
}
export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
}
export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
}

let _resend: Resend | null = null
function resend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
  return _resend
}

let _vapidReady = false
function ensureVapid(): void {
  if (_vapidReady) return
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
  _vapidReady = true
}

// ── Channel senders ──────────────────────────────────────────────────────────

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resendConfigured()) {
    console.log(`[notify] email skipped (not configured): "${subject}"`)
    return false
  }
  try {
    await resend().emails.send({ from: process.env.RESEND_FROM!, to, subject, html })
    return true
  } catch (err) {
    console.error('[notify] email failed:', err)
    return false
  }
}

export async function sendWhatsApp(toPhone: string, text: string): Promise<boolean> {
  if (!whatsappConfigured()) {
    console.log('[notify] whatsapp skipped (not configured)')
    return false
  }
  const phone = toPhone.replace(/[^\d]/g, '') // E.164 digits only
  if (!phone) return false
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      },
    )
    if (!res.ok) {
      console.error('[notify] whatsapp failed:', res.status, (await res.text()).slice(0, 200))
      return false
    }
    return true
  } catch (err) {
    console.error('[notify] whatsapp failed:', err)
    return false
  }
}

interface PushSub { endpoint: string; keys: { p256dh: string; auth: string } }

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<number> {
  if (!pushConfigured()) {
    console.log('[notify] push skipped (not configured)')
    return 0
  }
  ensureVapid()
  let sent = 0
  try {
    const subs = await db.query('SELECT id, subscription FROM push_subscriptions WHERE user_id = $1', [userId])
    for (const row of subs.rows) {
      try {
        await webpush.sendNotification(row.subscription as PushSub, JSON.stringify(payload))
        sent++
      } catch (err) {
        // 404/410 → subscription expired; prune it
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await db.query('DELETE FROM push_subscriptions WHERE id = $1', [row.id])
        }
      }
    }
  } catch (err) {
    console.error('[notify] push failed:', err)
  }
  return sent
}

// ── High-level helpers ───────────────────────────────────────────────────────

const appUrl = (): string => process.env.CONSUMER_APP_URL ?? process.env.APP_URL ?? 'https://styleyangu.app'

/** Emails the consumer identified by their public handle (resolves handle → email). */
export async function emailConsumerByUsername(
  username: string,
  mail: { subject: string; html: string },
): Promise<boolean> {
  try {
    const r = await db.query('SELECT id, email FROM users WHERE username = $1', [username])
    const user = r.rows[0]
    if (!user?.email) return false
    return await sendEmail(user.email, mail.subject, mail.html)
  } catch (err) {
    console.error('[notify] emailConsumerByUsername failed:', err)
    return false
  }
}

/** Notifies an artisan/seller via WhatsApp (falls back to their account phone). */
export async function whatsAppSeller(sellerId: string, text: string): Promise<boolean> {
  try {
    const r = await db.query('SELECT whatsapp_number, phone FROM sellers WHERE id = $1', [sellerId])
    const s = r.rows[0]
    const number = s?.whatsapp_number || s?.phone
    if (!number) return false
    return await sendWhatsApp(number, text)
  } catch (err) {
    console.error('[notify] whatsAppSeller failed:', err)
    return false
  }
}

export { appUrl }
