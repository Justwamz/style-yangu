import type { SellerTier } from '@style-yangu/types'
import { useSellerContext } from '../context/SellerContext'

export type TierFeature =
  | 'clients_tab'
  | 'ad_boost'
  | 'full_face_library'
  | 'schedule_post'
  | 'item_level_analytics'

const TIER_ORDER: Record<SellerTier, number> = {
  free_trial: 0,
  hustler: 1,
  boutique: 2,
  brand: 3,
  enterprise: 4,
}

const FEATURE_MIN_TIER: Record<TierFeature, SellerTier> = {
  clients_tab: 'hustler',
  ad_boost: 'hustler',
  full_face_library: 'hustler',
  schedule_post: 'boutique',
  item_level_analytics: 'boutique',
}

export function useTierGate(feature: TierFeature): { allowed: boolean; reason: string } {
  const { profile } = useSellerContext()
  if (!profile) return { allowed: false, reason: 'Loading...' }

  const userLevel = TIER_ORDER[profile.tier]
  const requiredLevel = TIER_ORDER[FEATURE_MIN_TIER[feature]]

  if (userLevel < requiredLevel) {
    return { allowed: false, reason: `Upgrade to ${FEATURE_MIN_TIER[feature]} to unlock this feature.` }
  }
  return { allowed: true, reason: '' }
}
