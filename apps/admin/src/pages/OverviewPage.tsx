import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api'
import type { AdminFinanceSummary } from '@style-yangu/types'

const KES = (n: number) => `KES ${n.toLocaleString()}`

export default function OverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: () => adminApi.get<AdminFinanceSummary>('/admin/finance/summary'),
  })

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-display text-3xl font-light text-dark mb-1">Platform overview</h1>
      <p className="text-sm text-mid/60 mb-6">Operational snapshot across all accounts.</p>

      {error && <p className="text-red-600 text-sm">Failed to load. Check you're signed in.</p>}
      {isLoading && <p className="text-sm text-mid/60">Loading…</p>}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tile label="Escrow held" value={KES(data.escrowHeldKES)} accent />
            <Tile label="Escrow released" value={KES(data.escrowReleasedKES)} />
            <Tile label="Outstanding balances" value={KES(data.outstandingArtisanBalanceKES)} />
            <Tile label="Pending verifications" value={String(data.pendingVerifications)} accent={data.pendingVerifications > 0} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Breakdown title="Sellers by tier" data={data.sellersByTier} />
            <Breakdown title="Artisans by tier" data={data.artisansByTier} />
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-gold bg-gold/10' : 'border-sand bg-white'}`}>
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-mid/50">{label}</p>
      <p className="font-display text-2xl text-dark mt-1 leading-none">{value}</p>
    </div>
  )
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data)
  return (
    <div className="bg-white rounded-2xl border border-sand p-5">
      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-dim mb-3">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-mid/50">No accounts yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(([tier, n]) => (
            <div key={tier} className="flex justify-between text-sm">
              <span className="capitalize text-dark/70">{tier.replace('_', ' ')}</span>
              <span className="font-semibold text-dark">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
