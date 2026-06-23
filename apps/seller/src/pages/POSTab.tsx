import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import POSTransactionCard from '../components/POSTransactionCard'
import type { POSSummary, POSTransaction } from '@style-yangu/types'

export default function POSTab() {
  const navigate = useNavigate()
  const { data: summary } = useQuery<POSSummary>({
    queryKey: ['pos', 'summary'],
    queryFn: () => sellerApi.get('/seller/pos/summary'),
  })
  const { data: transactions = [] } = useQuery<POSTransaction[]>({
    queryKey: ['pos', 'transactions'],
    queryFn: () => sellerApi.get('/seller/pos/transactions?scope=today'),
  })

  return (
    <div className="p-4 space-y-4">
      {summary && typeof summary.todayRevenueKES === 'number' && (
        <div className="bg-amber-50 rounded-2xl p-4 space-y-1">
          <p className="text-2xl font-bold" style={{ color: '#8B4513' }}>
            KES {summary.todayRevenueKES.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">{summary.todayItemsSold} items sold today</p>
          {summary.outstandingCount > 0 && (
            <p className="text-sm text-orange-700">
              {summary.outstandingCount} outstanding · KES {summary.outstandingKES.toLocaleString()}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/pos/new')}
        className="w-full bg-amber-800 text-white rounded-xl py-3 font-semibold"
      >
        Record Sale
      </button>

      {transactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today</p>
          {transactions.map(tx => (
            <POSTransactionCard key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  )
}
