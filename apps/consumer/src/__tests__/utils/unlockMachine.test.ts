import { describe, it, expect } from 'vitest'
import {
  unlockReducer,
  canUnlockMore,
  canWatchAd,
  canAddWardrobe,
  type UnlockState,
} from '../../utils/unlockMachine'

const base: UnlockState = {
  unlockCount: 1,
  adsWatched: 0,
  wardrobePairsUsed: 0,
  wardrobeProgress: 0,
  unlockMode: 'idle',
}

describe('unlockReducer — AD_WATCHED', () => {
  it('increments unlockCount and adsWatched', () => {
    const next = unlockReducer(base, { type: 'AD_WATCHED' })
    expect(next.unlockCount).toBe(2)
    expect(next.adsWatched).toBe(1)
    expect(next.unlockMode).toBe('idle')
  })

  it('sets mode to done when cap reached', () => {
    const atCap = { ...base, unlockCount: 2, adsWatched: 1 }
    const next = unlockReducer(atCap, { type: 'AD_WATCHED' })
    expect(next.unlockCount).toBe(3)
    expect(next.unlockMode).toBe('done')
  })

  it('is a no-op when adsWatched >= 2', () => {
    const maxAds = { ...base, adsWatched: 2 }
    expect(unlockReducer(maxAds, { type: 'AD_WATCHED' })).toEqual(maxAds)
  })

  it('is a no-op when unlockCount >= 3', () => {
    const maxSuggestions = { ...base, unlockCount: 3 }
    expect(unlockReducer(maxSuggestions, { type: 'AD_WATCHED' })).toEqual(maxSuggestions)
  })
})

describe('unlockReducer — WARDROBE flow', () => {
  it('START_WARDROBE_UNLOCK sets mode and resets progress', () => {
    const next = unlockReducer(base, { type: 'START_WARDROBE_UNLOCK' })
    expect(next.unlockMode).toBe('wardrobe-unlock')
    expect(next.wardrobeProgress).toBe(0)
  })

  it('first WARDROBE_ITEM_CAPTURED increments progress only', () => {
    const started = { ...base, unlockMode: 'wardrobe-unlock' as const }
    const next = unlockReducer(started, { type: 'WARDROBE_ITEM_CAPTURED' })
    expect(next.wardrobeProgress).toBe(1)
    expect(next.unlockCount).toBe(1)
  })

  it('second WARDROBE_ITEM_CAPTURED awards the unlock', () => {
    const oneIn = { ...base, unlockMode: 'wardrobe-unlock' as const, wardrobeProgress: 1 }
    const next = unlockReducer(oneIn, { type: 'WARDROBE_ITEM_CAPTURED' })
    expect(next.unlockCount).toBe(2)
    expect(next.wardrobePairsUsed).toBe(1)
    expect(next.wardrobeProgress).toBe(0)
    expect(next.unlockMode).toBe('idle')
  })

  it('CANCEL_WARDROBE_UNLOCK returns to idle', () => {
    const started = { ...base, unlockMode: 'wardrobe-unlock' as const, wardrobeProgress: 1 }
    const next = unlockReducer(started, { type: 'CANCEL_WARDROBE_UNLOCK' })
    expect(next.unlockMode).toBe('idle')
    expect(next.wardrobeProgress).toBe(0)
  })

  it('START_WARDROBE_UNLOCK is no-op when wardrobePairsUsed >= 2', () => {
    const maxPairs = { ...base, wardrobePairsUsed: 2 }
    expect(unlockReducer(maxPairs, { type: 'START_WARDROBE_UNLOCK' })).toEqual(maxPairs)
  })
})

describe('canUnlockMore / canWatchAd / canAddWardrobe', () => {
  it('canUnlockMore is true when unlockCount < 3', () => {
    expect(canUnlockMore(base)).toBe(true)
  })
  it('canUnlockMore is false when unlockCount === 3', () => {
    expect(canUnlockMore({ ...base, unlockCount: 3 })).toBe(false)
  })
  it('canWatchAd is false when adsWatched === 2', () => {
    expect(canWatchAd({ ...base, adsWatched: 2 })).toBe(false)
  })
  it('canAddWardrobe is false when wardrobePairsUsed === 2', () => {
    expect(canAddWardrobe({ ...base, wardrobePairsUsed: 2 })).toBe(false)
  })
})
