import { useQuery } from '@tanstack/react-query'
import { resellerApi } from '../api'
import type { ReferralCommission, CommissionStatus } from '@style-yangu/types'

const STATUS_COLOR: Record<CommissionStatus, string> = {
  pending: '#A07830', paid: '#2F7D32', forfeited: '#B3261E',
}

export default function EarningsPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['reseller-earnings'],
    queryFn: () => resellerApi.get<ReferralCommission[]>('/reseller/earnings'),
  })

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Earnings history</h1>
      <p className="text-sm text-mid/60 mb-6">Commissions from referred consumers who upgraded to paid plans.</p>

      {isLoading ? (
        <p className="text-sm text-mid/60">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sand p-8 text-center">
          <p className="text-3xl mb-2">💸</p>
          <p className="text-sm text-mid/60">No commissions yet. Share your link to start earning.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sand overflow-hidden">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-sand' : ''}`}>
              <div className="flex-1">
                <p className="text-sm font-semibold text-dark">KES {r.amountKES.toLocaleString()}</p>
                <p className="text-xs text-mid/50">
                  {new Date(r.createdAt).toLocaleDateString()}
                  {r.paidAt ? ` · paid ${new Date(r.paidAt).toLocaleDateString()}` : ''}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ color: STATUS_COLOR[r.status], backgroundColor: `${STATUS_COLOR[r.status]}1A` }}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
