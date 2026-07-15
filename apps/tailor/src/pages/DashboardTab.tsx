import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { artisanApi, useArtisanContext } from '../context/ArtisanContext'
import type { ArtisanDashboard } from '@style-yangu/types'

const KES = (n: number) => `KES ${n.toLocaleString()}`

export default function DashboardTab() {
  const { profile } = useArtisanContext()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['artisan-dashboard'],
    queryFn: () => artisanApi.get<ArtisanDashboard>('/artisan/dashboard'),
  })

  const firstName = (profile?.businessName ?? 'there').split(' ')[0]

  return (
    <div className="p-5 max-w-lg mx-auto flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold">Workshop</p>
        <h1 className="font-display text-3xl font-light text-dark leading-tight">
          Karibu, <em className="italic text-brand">{firstName}</em>.
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Active orders" value={isLoading ? '—' : String(data?.activeOrders ?? 0)} />
        <Stat label="Ready to collect" value={isLoading ? '—' : String(data?.readyForCollection ?? 0)} />
        <Stat label="Outstanding" value={isLoading ? '—' : KES(data?.outstandingBalanceKES ?? 0)} />
        <Stat label="In escrow" value={isLoading ? '—' : KES(data?.escrowHeldKES ?? 0)} />
      </div>

      <div className="bg-white rounded-2xl border border-sand p-4">
        <p className="text-sm text-dark/70">
          <span className="font-semibold text-dark">{data?.completedThisWeek ?? 0}</span> order
          {(data?.completedThisWeek ?? 0) === 1 ? '' : 's'} completed this week.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => navigate('/orders/new')}
          className="w-full bg-brand text-white rounded-xl py-4 font-semibold text-sm tracking-wider"
        >
          + New order
        </button>
        <button
          onClick={() => navigate('/orders')}
          className="w-full border border-sand rounded-xl py-3.5 text-sm text-dark"
        >
          View all orders
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-sand p-4">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-mid/50">{label}</p>
      <p className="font-display text-2xl text-dark mt-1 leading-none">{value}</p>
    </div>
  )
}
