import type { ArtisanTier } from '@style-yangu/types'
import { useArtisanContext } from '../context/ArtisanContext'

export type ArtisanFeature =
  | 'appointments'
  | 'pos'
  | 'escrow'
  | 'unlimited_portfolio'
  | 'verified_badge'

const TIER_ORDER: Record<ArtisanTier, number> = {
  free: 0,
  fundi: 1,
  master_artisan: 2,
}

const FEATURE_MIN_TIER: Record<ArtisanFeature, ArtisanTier> = {
  appointments: 'fundi',
  pos: 'fundi',
  unlimited_portfolio: 'fundi',
  escrow: 'master_artisan',
  verified_badge: 'master_artisan',
}

const TIER_LABEL: Record<ArtisanTier, string> = {
  free: 'Free',
  fundi: 'Fundi',
  master_artisan: 'Master Artisan',
}

export function useArtisanTier(feature: ArtisanFeature): { allowed: boolean; reason: string } {
  const { profile } = useArtisanContext()
  if (!profile) return { allowed: false, reason: 'Loading…' }

  const userLevel = TIER_ORDER[profile.artisanTier]
  const requiredLevel = TIER_ORDER[FEATURE_MIN_TIER[feature]]

  if (userLevel < requiredLevel) {
    return { allowed: false, reason: `Upgrade to ${TIER_LABEL[FEATURE_MIN_TIER[feature]]} to unlock this.` }
  }
  return { allowed: true, reason: '' }
}
