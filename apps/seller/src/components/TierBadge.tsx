import type { SellerTier } from '@style-yangu/types'

const TIER_LABEL: Record<SellerTier, string> = {
  free_trial: 'Free Trial',
  hustler: 'Hustler',
  boutique: 'Boutique',
  brand: 'Brand',
  enterprise: 'Enterprise',
}

const TIER_STYLE: Record<SellerTier, string> = {
  free_trial: 'bg-gray-100 text-gray-600',
  hustler: 'bg-amber-100 text-amber-800',
  boutique: 'bg-amber-200 text-amber-900',
  brand: 'bg-amber-900 text-amber-50 border border-yellow-400',
  enterprise: 'bg-amber-900 text-amber-50 border border-yellow-400',
}

export default function TierBadge({ tier }: { tier: SellerTier }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${TIER_STYLE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  )
}
