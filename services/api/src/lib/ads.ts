import { db } from '../db'

// Ad Boost engine (§7). Activation + frequency phase are controlled by admins via
// platform_settings; the engine stays dormant (coming_soon) until flipped live.

export type AdActivation = 'coming_soon' | 'live'
export type AdPhase = 1 | 2 | 3

// Base weekly boost-slot allocation by subscription tier (§7.3).
const SELLER_BASE_SLOTS: Record<string, number> = {
  free_trial: 0, hustler: 2, boutique: 6, brand: 15, enterprise: 0,
}
const ARTISAN_BASE_SLOTS: Record<string, number> = {
  free: 0, fundi: 1, master_artisan: 3,
}

const ARTISAN_TYPES = new Set(['tailor', 'cobbler', 'bag_maker', 'jewellery_maker'])

export async function adBoostState(): Promise<{ activation: AdActivation; phase: AdPhase }> {
  try {
    const r = await db.query(`SELECT value FROM platform_settings WHERE key = 'adboost'`)
    const v = r.rows[0]?.value as { activation?: string; phase?: number } | undefined
    return {
      activation: v?.activation === 'live' ? 'live' : 'coming_soon',
      phase: (v?.phase === 2 || v?.phase === 3 ? v.phase : 1) as AdPhase,
    }
  } catch {
    return { activation: 'coming_soon', phase: 1 }
  }
}

/** Base weekly slot allocation for a seller/artisan account. */
export function baseSlots(sellerType: string, sellerTier: string, artisanTier: string): number {
  if (ARTISAN_TYPES.has(sellerType)) return ARTISAN_BASE_SLOTS[artisanTier] ?? 0
  return SELLER_BASE_SLOTS[sellerTier] ?? 0
}

export function isPaidSeller(sellerType: string, sellerTier: string, artisanTier: string): boolean {
  if (ARTISAN_TYPES.has(sellerType)) return artisanTier !== 'free'
  return sellerTier !== 'free_trial'
}
