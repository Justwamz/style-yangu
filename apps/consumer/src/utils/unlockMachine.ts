export interface UnlockState {
  unlockCount: number
  adsWatched: number
  wardrobePairsUsed: number
  wardrobeProgress: number
  unlockMode: 'idle' | 'wardrobe-unlock' | 'done'
}

export type UnlockAction =
  | { type: 'AD_WATCHED' }
  | { type: 'START_WARDROBE_UNLOCK' }
  | { type: 'WARDROBE_ITEM_CAPTURED' }
  | { type: 'CANCEL_WARDROBE_UNLOCK' }

export const MAX_SUGGESTIONS = 3
export const MAX_ADS = 2
export const MAX_WARDROBE_PAIRS = 2

export function unlockReducer(state: UnlockState, action: UnlockAction): UnlockState {
  switch (action.type) {
    case 'AD_WATCHED': {
      if (state.adsWatched >= MAX_ADS || state.unlockCount >= MAX_SUGGESTIONS) return state
      const next = { ...state, unlockCount: state.unlockCount + 1, adsWatched: state.adsWatched + 1 }
      return { ...next, unlockMode: next.unlockCount >= MAX_SUGGESTIONS ? 'done' : 'idle' }
    }
    case 'START_WARDROBE_UNLOCK': {
      if (state.wardrobePairsUsed >= MAX_WARDROBE_PAIRS || state.unlockCount >= MAX_SUGGESTIONS) return state
      return { ...state, unlockMode: 'wardrobe-unlock', wardrobeProgress: 0 }
    }
    case 'WARDROBE_ITEM_CAPTURED': {
      if (state.unlockMode !== 'wardrobe-unlock') return state
      if (state.wardrobeProgress < 1) return { ...state, wardrobeProgress: state.wardrobeProgress + 1 }
      const next = { ...state, unlockCount: state.unlockCount + 1, wardrobePairsUsed: state.wardrobePairsUsed + 1, wardrobeProgress: 0 }
      return { ...next, unlockMode: next.unlockCount >= MAX_SUGGESTIONS ? 'done' : 'idle' }
    }
    case 'CANCEL_WARDROBE_UNLOCK':
      return { ...state, unlockMode: 'idle', wardrobeProgress: 0 }
    default:
      return state
  }
}

export const canUnlockMore = (s: UnlockState) => s.unlockCount < MAX_SUGGESTIONS
export const canWatchAd    = (s: UnlockState) => s.adsWatched < MAX_ADS && s.unlockCount < MAX_SUGGESTIONS
export const canAddWardrobe = (s: UnlockState) => s.wardrobePairsUsed < MAX_WARDROBE_PAIRS && s.unlockCount < MAX_SUGGESTIONS
