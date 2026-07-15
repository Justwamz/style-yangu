import { db } from '../db'
import { mpesaPayoutConfigured, b2cPayout, escrowFeePercent } from './payments'

/** Releases the escrow hold for an order. When M-Pesa B2C is configured, pays the
 *  artisan their net deposit (less the platform escrow fee) and stores the ref;
 *  otherwise the release is modelled (no money moves) until credentials are set. */
export async function releaseEscrow(
  orderId: string,
): Promise<{ released: boolean; payout: 'sent' | 'stubbed' | 'failed'; netKES?: number }> {
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
      console.error('[escrow] B2C payout failed (left holding for retry):', err)
      return { released: false, payout: 'failed', netKES }
    }
  }

  await db.query(`UPDATE escrow_transactions SET status = 'released', released_at = NOW() WHERE id = $1`, [row.id])
  return { released: true, payout: 'stubbed', netKES }
}
