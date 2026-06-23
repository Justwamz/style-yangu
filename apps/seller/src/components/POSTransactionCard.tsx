import type { POSTransaction } from '@style-yangu/types'

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  owing: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  owing: 'Owing',
}

export default function POSTransactionCard({ tx }: { tx: POSTransaction }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-semibold">{tx.itemName}</p>
        <p className="text-xs text-gray-500 capitalize">{tx.paymentMethod}</p>
        {tx.clientNickname && (
          <p className="text-xs text-gray-400">{tx.clientNickname}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm font-bold">KES {tx.finalPriceKES.toLocaleString()}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[tx.paymentStatus]}`}>
          {STATUS_LABEL[tx.paymentStatus]}
        </span>
      </div>
    </div>
  )
}
