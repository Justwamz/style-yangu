import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api'
import type { AdminEscrowRow } from '@style-yangu/types'

const STATUS_COLOR: Record<string, string> = {
  holding: '#A07830', released: '#2F7D32', refunded: '#6B4226', disputed: '#B3261E',
}

export default function EscrowPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-escrow'],
    queryFn: () => adminApi.get<AdminEscrowRow[]>('/admin/escrow'),
  })

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Escrow oversight</h1>
      <p className="text-sm text-mid/60 mb-6">
        All deposit holds across artisans. Real M-Pesa payouts activate at launch (Phase 2).
      </p>

      {isLoading ? (
        <p className="text-sm text-mid/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-mid/60">No escrow transactions yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-sand overflow-hidden">
          {rows.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-sand' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark truncate">{e.artisanName}</p>
                <p className="text-xs text-mid/50">
                  @{e.consumerUsername} · held {new Date(e.heldAt).toLocaleDateString()}
                </p>
              </div>
              <p className="text-sm font-semibold text-dark shrink-0">KES {e.amountKES.toLocaleString()}</p>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={{ color: STATUS_COLOR[e.status], backgroundColor: `${STATUS_COLOR[e.status]}1A` }}
              >
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
