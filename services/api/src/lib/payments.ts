// M-Pesa Daraja integration — STK Push (deposits/subscriptions) + B2C (payouts).
// Fully guarded: callers check *Configured() and fall back to modelled behaviour
// until credentials are set (external-connections policy). Phase 2 activation.
//
// Required env vars at go-live:
//   Auth/STK : MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
//   B2C payout: MPESA_INITIATOR_NAME, MPESA_SECURITY_CREDENTIAL, MPESA_B2C_SHORTCODE
//   Common   : MPESA_ENV ("production" | "sandbox"), MPESA_CALLBACK_BASE (public API URL)

function base(): string {
  return process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
}

export function mpesaConfigured(): boolean {
  return !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY
  )
}

export function mpesaPayoutConfigured(): boolean {
  return mpesaConfigured() && !!(
    process.env.MPESA_INITIATOR_NAME &&
    process.env.MPESA_SECURITY_CREDENTIAL &&
    process.env.MPESA_B2C_SHORTCODE
  )
}

/** Normalises a Kenyan number to the 2547XXXXXXXX / 2541XXXXXXXX format Daraja expects. */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '254' + p.slice(1)
  else if (p.startsWith('7') || p.startsWith('1')) p = '254' + p
  else if (p.startsWith('254')) { /* already normalised */ }
  return p
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64')
  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

function callbackUrl(path: string): string {
  const b = (process.env.MPESA_CALLBACK_BASE ?? '').replace(/\/$/, '')
  return `${b}${path}`
}

export interface StkResult {
  checkoutRequestId: string
  merchantRequestId: string
}

/** Initiates a Lipa na M-Pesa Online (STK Push) prompt on the payer's phone. */
export async function stkPush(opts: {
  phone: string
  amountKES: number
  accountRef: string
  description: string
}): Promise<StkResult> {
  const token = await accessToken()
  const ts = timestamp()
  const shortcode = process.env.MPESA_SHORTCODE!
  const password = Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString('base64')

  const res = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(opts.amountKES)),
      PartyA: normalizePhone(opts.phone),
      PartyB: shortcode,
      PhoneNumber: normalizePhone(opts.phone),
      CallBackURL: callbackUrl('/payments/mpesa/stk-callback'),
      AccountReference: opts.accountRef.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  })
  if (!res.ok) throw new Error(`STK push failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { CheckoutRequestID?: string; MerchantRequestID?: string; ResponseCode?: string; errorMessage?: string }
  if (data.ResponseCode !== '0' || !data.CheckoutRequestID) {
    throw new Error(`STK push rejected: ${data.errorMessage ?? JSON.stringify(data).slice(0, 200)}`)
  }
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID ?? '' }
}

/** Sends a B2C payout to an artisan/reseller's M-Pesa. Returns the ConversationID. */
export async function b2cPayout(opts: {
  phone: string
  amountKES: number
  remarks: string
}): Promise<{ conversationId: string }> {
  const token = await accessToken()
  const res = await fetch(`${base()}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      InitiatorName: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      CommandID: 'BusinessPayment',
      Amount: Math.max(1, Math.round(opts.amountKES)),
      PartyA: process.env.MPESA_B2C_SHORTCODE,
      PartyB: normalizePhone(opts.phone),
      Remarks: opts.remarks.slice(0, 100),
      QueueTimeOutURL: callbackUrl('/payments/mpesa/b2c-timeout'),
      ResultURL: callbackUrl('/payments/mpesa/b2c-result'),
      Occasion: 'StyleYangu',
    }),
  })
  if (!res.ok) throw new Error(`B2C payout failed: ${res.status} ${(await res.text()).slice(0, 200)}`)
  const data = await res.json() as { ConversationID?: string; ResponseCode?: string; errorMessage?: string }
  if (data.ResponseCode !== '0' || !data.ConversationID) {
    throw new Error(`B2C payout rejected: ${data.errorMessage ?? JSON.stringify(data).slice(0, 200)}`)
  }
  return { conversationId: data.ConversationID }
}

/** Platform escrow fee (§9.5). Net payout to artisan = amount − fee. */
export function escrowFeePercent(): number {
  const v = parseInt(process.env.ESCROW_FEE_PERCENT ?? '6')
  return Number.isFinite(v) && v >= 0 && v <= 20 ? v : 6
}

// ── Paystack (cards) — Phase 2, thin guarded wrapper ─────────────────────────
export function paystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY
}
