import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api'
import type { AdminAdBoostState, AdminWaitlistRow } from '@style-yangu/types'

export default function AdBoostPage() {
  const qc = useQueryClient()

  const { data: state } = useQuery({
    queryKey: ['admin-adboost'],
    queryFn: () => adminApi.get<AdminAdBoostState>('/admin/adboost'),
  })
  const { data: waitlist = [] } = useQuery({
    queryKey: ['admin-adboost-waitlist'],
    queryFn: () => adminApi.get<AdminWaitlistRow[]>('/admin/adboost/waitlist'),
  })

  async function update(activation: 'coming_soon' | 'live', phase: 1 | 2 | 3) {
    await adminApi.post('/admin/adboost/phase', { activation, phase })
    qc.invalidateQueries({ queryKey: ['admin-adboost'] })
  }

  const isLive = state?.activation === 'live'

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Ad Boost control</h1>
      <p className="text-sm text-mid/60 mb-6">
        Activate the ad ecosystem once the consumer base can support relevant, varied content.
      </p>

      {/* Activation */}
      <div className="bg-white rounded-2xl border border-sand p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim">Status</p>
            <p className="font-display text-2xl text-dark">
              {isLive ? 'Live' : 'Coming soon'}
            </p>
          </div>
          <button
            onClick={() => update(isLive ? 'coming_soon' : 'live', state?.phase ?? 1)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              isLive ? 'border border-sand text-mid' : 'bg-brand text-white'
            }`}
          >
            {isLive ? 'Revert to coming soon' : 'Activate ad boost'}
          </button>
        </div>

        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-2">Frequency phase</p>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map(p => (
            <button
              key={p}
              onClick={() => update(state?.activation ?? 'coming_soon', p)}
              className={`flex-1 py-2 rounded-lg text-sm border ${
                state?.phase === p ? 'bg-dark text-white border-dark' : 'bg-white text-dark/60 border-sand'
              }`}
            >
              Phase {p}
              <span className="block text-[10px] opacity-70">
                {p === 1 ? 'No ads' : p === 2 ? '1 ad / unlock' : '2 ads / unlock'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Waitlist */}
      <div className="bg-white rounded-2xl border border-sand p-5">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-3">
          Waitlist · {state?.waitlistCount ?? waitlist.length}
        </p>
        {waitlist.length === 0 ? (
          <p className="text-sm text-mid/50">No sellers on the waitlist yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {waitlist.map(w => (
              <div key={w.sellerId} className="flex justify-between text-sm">
                <span className="text-dark/80">{w.businessName}</span>
                <span className="text-mid/50 capitalize">{w.tier}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
