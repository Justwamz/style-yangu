import type { SellerTier } from '@style-yangu/types'

const TIER_LABEL: Record<SellerTier, string> = {
  free_trial: 'Free Trial',
  hustler: 'Hustler',
  boutique: 'Boutique',
  brand: 'Brand',
  enterprise: 'Enterprise',
}

const TIER_STYLE: Record<SellerTier, string> = {
  free_trial: 'bg-sand/60 text-mid',
  hustler: 'bg-sand text-brand',
  boutique: 'bg-sand text-brand',
  brand: 'bg-deep text-sand border border-gold',
  enterprise: 'bg-deep text-sand border border-gold',
}

export default function TierBadge({ tier }: { tier: SellerTier }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${TIER_STYLE[tier]}`}>
      {TIER_LABEL[tier]}
    </span>
  )
}
