import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { artisanApi } from '../context/ArtisanContext'
import type { ArtisanOrder, ArtisanOrderStatus } from '@style-yangu/types'

export const STATUS_META: Record<ArtisanOrderStatus, { label: string; color: string }> = {
  received:             { label: 'Received',      color: '#6B4226' },
  in_progress:          { label: 'In progress',   color: '#A07830' },
  ready_for_collection: { label: 'Ready',         color: '#2F7D32' },
  collected:            { label: 'Collected',     color: '#8B4513' },
  auto_released:        { label: 'Auto-released',  color: '#8B4513' },
  disputed:             { label: 'Disputed',      color: '#B3261E' },
}

const FILTERS: { key: string; label: string }[] = [
  { key: 'all',                  label: 'All' },
  { key: 'received',             label: 'Received' },
  { key: 'in_progress',          label: 'In progress' },
  { key: 'ready_for_collection', label: 'Ready' },
  { key: 'collected',            label: 'Done' },
]

export default function OrdersTab() {
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['artisan-orders', filter],
    queryFn: () =>
      artisanApi.get<ArtisanOrder[]>(`/artisan/orders${filter === 'all' ? '' : `?status=${filter}`}`),
  })

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-light text-dark">Orders</h1>
        <button
          onClick={() => navigate('/orders/new')}
          className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold"
        >
          + New
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.key ? 'bg-brand text-white border-brand' : 'bg-white text-dark/60 border-sand'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-mid/60 py-8 text-center">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-4xl mb-3">🧵</p>
          <p className="text-sm text-mid/60">No orders yet.</p>
          <button onClick={() => navigate('/orders/new')} className="text-brand text-sm underline mt-2">
            Create your first order
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(o => {
            const meta = STATUS_META[o.status]
            return (
              <button
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-sand p-4 hover:border-brand transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-dark">{o.nickname || o.consumerUsername}</p>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                    style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs text-mid/60 line-clamp-1">
                  {o.brief?.silhouette || o.brief?.occasion || o.brief?.fabricDescription || 'Custom order'}
                </p>
                {o.balanceDueKES > 0 && (
                  <p className="text-xs text-brand mt-1">Balance: KES {o.balanceDueKES.toLocaleString()}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
