import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api'

interface PendingArtisan {
  id: string
  businessName: string
  phone: string
  sellerType: string
  location: string | null
  createdAt: string
}

export default function VerificationPage() {
  const qc = useQueryClient()
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['admin-verification'],
    queryFn: () => adminApi.get<PendingArtisan[]>('/admin/artisans/pending'),
  })

  async function verify(id: string) {
    await adminApi.post(`/admin/artisans/${id}/verify`, { verified: true })
    qc.invalidateQueries({ queryKey: ['admin-verification'] })
    qc.invalidateQueries({ queryKey: ['admin-finance'] })
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Artisan verification</h1>
      <p className="text-sm text-mid/60 mb-6">
        Verify artisans before they gain the verified badge. Required for trusted escrow bookings.
      </p>

      {isLoading ? (
        <p className="text-sm text-mid/60">Loading…</p>
      ) : pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sand p-8 text-center">
          <p className="text-3xl mb-2">✓</p>
          <p className="text-sm text-mid/60">No artisans awaiting verification.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-sand p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark">{a.businessName}</p>
                <p className="text-xs text-mid/50 capitalize">
                  {a.sellerType.replace('_', ' ')} · {a.phone}{a.location ? ` · ${a.location}` : ''}
                </p>
              </div>
              <button
                onClick={() => verify(a.id)}
                className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-semibold shrink-0"
              >
                Verify
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
