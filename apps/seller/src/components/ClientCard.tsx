import type { SellerClient } from '@style-yangu/types'

export default function ClientCard({ client }: { client: SellerClient }) {
  const lastPurchase = client.lastPurchaseDate
    ? new Date(client.lastPurchaseDate).toLocaleDateString('en-KE')
    : '—'

  return (
    <div className="border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">{client.nickname}</p>
          <p className="text-xs text-gray-400">{client.consumerUsername}</p>
        </div>
        <p className="text-xs text-gray-400">{lastPurchase}</p>
      </div>
      <div className="flex gap-4 mt-2">
        <p className="text-xs text-gray-500">{client.tryOnSent} sent</p>
        <p className="text-xs text-gray-500">{client.tryOnActed} acted</p>
      </div>
    </div>
  )
}
