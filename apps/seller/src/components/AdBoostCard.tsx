import { useState } from 'react'
import { sellerApi } from '../context/SellerContext'
import type { SellerTier } from '@style-yangu/types'

interface Props {
  tier: SellerTier
}

const SLOT_ALLOCATION: Partial<Record<SellerTier, string>> = {
  hustler: '5 boost slots/week',
  boutique: '15 boost slots/week',
  brand: '30 boost slots/week',
  enterprise: '30 boost slots/week',
}

const PACK_OPTIONS = [
  { name: 'Starter', price: 'KES 500/week' },
  { name: 'Growth', price: 'KES 1,200/week' },
  { name: 'Campaign', price: 'KES 3,000/week' },
]

export default function AdBoostCard({ tier }: Props) {
  const [joined, setJoined] = useState(false)

  if (tier === 'free_trial') return null

  async function handleJoinWaitlist() {
    await sellerApi.post('/seller/adboost/waitlist', {})
    setJoined(true)
  }

  return (
    <div className="border border-sand rounded-2xl p-4 space-y-3 bg-sand">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold font-display" style={{ color: '#8B4513' }}>Ad Boost</h3>
        <span className="text-xs bg-sand text-brand px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
      </div>

      <p className="text-sm text-mid">
        Reach consumers who match your style profile while they browse outfit suggestions.
      </p>

      {SLOT_ALLOCATION[tier] && (
        <p className="text-sm font-medium text-brand">{SLOT_ALLOCATION[tier]} included in your plan</p>
      )}

      <div className="space-y-2">
        {PACK_OPTIONS.map(pack => (
          <div
            key={pack.name}
            className="flex justify-between items-center border border-sand rounded-lg px-3 py-2 opacity-50"
          >
            <span className="text-sm font-medium">{pack.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-mid/70">{pack.price}</span>
              <span className="text-xs bg-sand/60 text-mid/70 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center border border-sand rounded-lg px-3 py-2 opacity-50">
          <span className="text-sm font-medium">Max Pack</span>
          <span className="text-xs bg-sand/60 text-mid/70 px-2 py-0.5 rounded-full">Coming Soon</span>
        </div>
      </div>

      {joined ? (
        <p className="text-sm text-green-700 font-medium text-center py-2">
          You're on the list. We'll notify you when Ad Boost launches.
        </p>
      ) : (
        <button
          onClick={handleJoinWaitlist}
          className="w-full border border-brand text-brand rounded-lg py-2 text-sm font-semibold"
        >
          Join the waitlist
        </button>
      )}
    </div>
  )
}
