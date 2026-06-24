import type { SellerClient } from '@style-yangu/types'

export default function ClientCard({ client }: { client: SellerClient }) {
  const lastPurchase = client.lastPurchaseDate
    ? new Date(client.lastPurchaseDate).toLocaleDateString('en-KE')
    : '—'

  return (
    <div className="border border-sand/60 rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">{client.nickname}</p>
          <p className="text-xs text-mid/50">{client.consumerUsername}</p>
        </div>
        <p className="text-xs text-mid/50">{lastPurchase}</p>
      </div>
      <div className="flex gap-4 mt-2">
        <p className="text-xs text-mid/70">{client.tryOnSent} sent</p>
        <p className="text-xs text-mid/70">{client.tryOnActed} acted</p>
      </div>
    </div>
  )
}
