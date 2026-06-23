import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import { useTierGate } from '../hooks/useTierGate'

interface DashboardData {
  todayRevenueKES: number
  todayItemsSold: number
  storefrontViews: number
  weeklyAggregates?: {
    impressions: number
    saves: number
    follows: number
    talkToSeller: number
  }
  itemBreakdown?: { itemName: string; impressions: number; saves: number }[]
}

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardTab() {
  const navigate = useNavigate()
  const { profile } = useSellerContext()
  const { allowed: itemAnalyticsAllowed, reason: upgradeReason } = useTierGate('item_level_analytics')

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => sellerApi.get('/seller/dashboard'),
  })

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#8B4513' }}>
          {timeGreeting()}, {profile?.businessName ?? '…'}
        </h1>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>
              KES {data.todayRevenueKES.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Today's revenue</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>{data.todayItemsSold} items</p>
            <p className="text-xs text-gray-500">Sold today</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>{data.storefrontViews}</p>
            <p className="text-xs text-gray-500">Storefront views</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/inventory/new')}
          className="flex-1 border border-amber-700 text-amber-800 rounded-xl py-2 text-sm font-semibold"
        >
          + Add item
        </button>
        <button
          onClick={() => navigate('/pos/new')}
          className="flex-1 border border-amber-700 text-amber-800 rounded-xl py-2 text-sm font-semibold"
        >
          Record sale
        </button>
      </div>

      {/* Weekly aggregates (hustler) */}
      {data?.weeklyAggregates && (
        <div className="border border-gray-100 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">This week</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Impressions</span>
              <span className="font-medium">{data.weeklyAggregates.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saves</span>
              <span className="font-medium">{data.weeklyAggregates.saves}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Follows</span>
              <span className="font-medium">{data.weeklyAggregates.follows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Talk to Seller</span>
              <span className="font-medium">{data.weeklyAggregates.talkToSeller}</span>
            </div>
          </div>
        </div>
      )}

      {/* Item-level analytics (boutique+) */}
      {!itemAnalyticsAllowed ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-400">{upgradeReason}</p>
        </div>
      ) : data?.itemBreakdown && data.itemBreakdown.length > 0 ? (
        <div className="border border-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Item breakdown</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pb-2">Item</th>
                <th className="pb-2">Impressions</th>
                <th className="pb-2">Saves</th>
              </tr>
            </thead>
            <tbody>
              {data.itemBreakdown.map(row => (
                <tr key={row.itemName} className="border-t border-gray-50">
                  <td className="py-1.5">{row.itemName}</td>
                  <td className="py-1.5">{row.impressions}</td>
                  <td className="py-1.5">{row.saves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
