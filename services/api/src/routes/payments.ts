import { Router, type IRouter } from 'express'
import { db } from '../db'
import { recordPaidConversion } from '../lib/referral'
import { sendEmail } from '../lib/notifications'
import { referralConvertedEmail } from '../lib/emailTemplates'

const router: IRouter = Router()

// ─────────────────────────────────────────────
// Dispatch a confirmed payment by its purpose
// ─────────────────────────────────────────────

async function onPaymentSuccess(payment: {
  id: string; purpose: string; ref_id: string | null; amount_kes: number
}): Promise<void> {
  try {
    if (payment.purpose === 'escrow_deposit' && payment.ref_id) {
      const order = await db.query('SELECT artisan_id FROM artisan_orders WHERE id = $1', [payment.ref_id])
      const artisanId = order.rows[0]?.artisan_id
      if (!artisanId) return
      await db.query(
        `INSERT INTO escrow_transactions (order_id, artisan_id, amount_kes) VALUES ($1, $2, $3)`,
        [payment.ref_id, artisanId, payment.amount_kes],
      )
      await db.query(
        `UPDATE artisan_orders SET deposit_paid_kes = deposit_paid_kes + $1, updated_at = NOW() WHERE id = $2`,
        [payment.amount_kes, payment.ref_id],
      )
    } else if (payment.purpose === 'subscription_consumer' && payment.ref_id) {
      await db.query(`UPDATE users SET tier = 'premium' WHERE id = $1`, [payment.ref_id])
      // Referral conversion: pays the referrer their commission
      const referrerId = await recordPaidConversion(payment.ref_id)
      if (referrerId) {
        const r = await db.query('SELECT email FROM users WHERE id = $1', [referrerId])
        if (r.rows[0]?.email) {
          const mail = referralConvertedEmail(50)
          void sendEmail(r.rows[0].email, mail.subject, mail.html)
        }
      }
    } else if (payment.purpose === 'subscription_seller' && payment.ref_id) {
      // ref_id encodes "<sellerId>:<tier>"
      const [sellerId, tier] = payment.ref_id.split(':')
      if (sellerId && tier) {
        await db.query(`UPDATE sellers SET tier = $1, updated_at = NOW() WHERE id = $2`, [tier, sellerId])
      }
    }
  } catch (err) {
    console.error('[payments] onPaymentSuccess dispatch failed:', err)
  }
}

// ─────────────────────────────────────────────
// STK Push callback (Lipa na M-Pesa Online)
// ─────────────────────────────────────────────

router.post('/payments/mpesa/stk-callback', async (req, res) => {
  // Always ack Daraja, even on our own errors
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  try {
    const cb = req.body?.Body?.stkCallback
    if (!cb?.CheckoutRequestID) return

    const found = await db.query(
      'SELECT * FROM payments WHERE checkout_request_id = $1',
      [cb.CheckoutRequestID],
    )
    const payment = found.rows[0]
    if (!payment || payment.status !== 'pending') return // unknown or already processed

    if (cb.ResultCode === 0) {
      const items: { Name: string; Value?: string | number }[] = cb.CallbackMetadata?.Item ?? []
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value?.toString() ?? null
      await db.query(
        `UPDATE payments SET status = 'success', mpesa_receipt = $1, result_desc = $2, updated_at = NOW() WHERE id = $3`,
        [receipt, cb.ResultDesc ?? 'Success', payment.id],
      )
      await onPaymentSuccess(payment)
    } else {
      await db.query(
        `UPDATE payments SET status = 'failed', result_desc = $1, updated_at = NOW() WHERE id = $2`,
        [cb.ResultDesc ?? 'Failed', payment.id],
      )
    }
  } catch (err) {
    console.error('[payments/stk-callback]', err)
  }
})

// ─────────────────────────────────────────────
// B2C payout result / timeout callbacks
// ─────────────────────────────────────────────

router.post('/payments/mpesa/b2c-result', (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  const r = req.body?.Result
  console.log(`[payments/b2c-result] ${r?.ConversationID ?? '?'} code=${r?.ResultCode ?? '?'} ${r?.ResultDesc ?? ''}`)
})

router.post('/payments/mpesa/b2c-timeout', (_req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' })
})

export { onPaymentSuccess }
export default router
