# Consumer Home Screen — Plan 2: App Shell + Home Tab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated app shell (bottom nav + routing), shared contexts, custom hooks, and the complete Home tab with weather warning logic and unlock mechanic.

**Architecture:** `AppShell.tsx` renders a fixed bottom nav and `<Outlet />`. `ProfileContext` and `SuggestionContext` wrap the shell and make user data + suggestion state available to all tabs. Home tab composes `StylistGreetingCard`, `WeatherBanner`, `SuggestionCard`, and `UnlockMechanic`. Weather warning logic and the unlock state machine live in pure utility files so they can be unit-tested in isolation.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vitest, Testing Library

**Prerequisite:** Plan 1 (API layer) must be complete.

---

### Task 1: Weather warning utility (TDD)

**Files:**
- Create: `apps/consumer/src/utils/weatherWarning.ts`
- Create: `apps/consumer/src/__tests__/utils/weatherWarning.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/utils/weatherWarning.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getWeatherWarning } from '../../utils/weatherWarning'

describe('getWeatherWarning', () => {
  it('returns null when no clothing tags match the condition', () => {
    expect(getWeatherWarning('Clear', ['shirt', 'chinos'], 'amara')).toBeNull()
  })

  it('warns about loose skirts in windy conditions — amara voice', () => {
    const result = getWeatherWarning('Windy', ['loose-skirt', 'heels'], 'amara')
    expect(result).not.toBeNull()
    expect(result!.level).toBe(1)
    expect(result!.message).toMatch(/wind/i)
  })

  it('warns about loose skirts in windy conditions — kofi voice', () => {
    const result = getWeatherWarning('Windy', ['loose-skirt'], 'kofi')
    expect(result).not.toBeNull()
    expect(result!.message).toMatch(/agenda/i)
  })

  it('warns about suede shoes in rainy conditions', () => {
    const result = getWeatherWarning('Rain', ['suede', 'trousers'], 'amara')
    expect(result).not.toBeNull()
    expect(result!.level).toBe(2)
  })

  it('warns about heavy layers in extreme heat', () => {
    const result = getWeatherWarning('Extreme', ['heavy-layer', 'shirt'], 'kofi')
    expect(result).not.toBeNull()
  })

  it('warns about bare legs in cold conditions', () => {
    const result = getWeatherWarning('Cold', ['bare-legs'], 'amara')
    expect(result).not.toBeNull()
  })

  it('returns null when condition matches but no clothing tag triggers', () => {
    expect(getWeatherWarning('Rain', ['shirt', 'chinos'], 'amara')).toBeNull()
  })

  it('is case-insensitive on condition', () => {
    const result = getWeatherWarning('WINDY', ['loose-skirt'], 'amara')
    expect(result).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/utils/weatherWarning.test.ts
```

Expected: FAIL — `../../utils/weatherWarning` not found.

- [ ] **Step 3: Implement `apps/consumer/src/utils/weatherWarning.ts`**

```typescript
export type StylistName = 'amara' | 'kofi'
export type WarningLevel = 1 | 2 | 3

export interface WeatherWarning {
  level: WarningLevel
  message: string
}

const RULES: Array<{
  conditions: string[]
  tags: string[]
  level: WarningLevel
  message: Record<StylistName, string>
}> = [
  {
    conditions: ['wind', 'windy'],
    tags: ['loose-skirt', 'wide-leg-trousers', 'oversized-shirt'],
    level: 1,
    message: {
      amara: "Bestie, this wind and that skirt are not friends.",
      kofi:  "That skirt has its own agenda today.",
    },
  },
  {
    conditions: ['rain', 'drizzle', 'thunderstorm'],
    tags: ['suede', 'white-linen', 'open-toe', 'flared-hem'],
    level: 2,
    message: {
      amara: "Girl, it's going to rain — put the suede away.",
      kofi:  "Rain's on the way. Suede and wet pavement don't mix.",
    },
  },
  {
    conditions: ['extreme', 'hot'],
    tags: ['heavy-layer', 'dark-colour', 'synthetic'],
    level: 1,
    message: {
      amara: "It's so hot today — those layers will have you melting.",
      kofi:  "It's scorching out there. Heavy layers will drain you.",
    },
  },
  {
    conditions: ['cold', 'snow', 'fog'],
    tags: ['bare-legs', 'thin-fabric'],
    level: 1,
    message: {
      amara: "It's chilly! You'll be freezing in those bare legs.",
      kofi:  "Cold out there — bare legs aren't the move today.",
    },
  },
  {
    conditions: ['humid'],
    tags: ['natural-hair-style', 'non-breathable'],
    level: 1,
    message: {
      amara: "Humidity alert! Linen is your best friend right now.",
      kofi:  "High humidity today. Breathable fabrics will keep you comfortable.",
    },
  },
]

export function getWeatherWarning(
  condition: string,
  clothingTags: string[],
  stylist: StylistName,
): WeatherWarning | null {
  const condLower = condition.toLowerCase()
  for (const rule of RULES) {
    if (!rule.conditions.some(c => condLower.includes(c))) continue
    if (clothingTags.some(t => rule.tags.includes(t))) {
      return { level: rule.level, message: rule.message[stylist] }
    }
  }
  return null
}
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/utils/weatherWarning.test.ts
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/utils/weatherWarning.ts apps/consumer/src/__tests__/utils/weatherWarning.test.ts
git commit -m "feat(consumer): weather warning utility with full test coverage"
```

---

### Task 2: Unlock state machine utility (TDD)

**Files:**
- Create: `apps/consumer/src/utils/unlockMachine.ts`
- Create: `apps/consumer/src/__tests__/utils/unlockMachine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/consumer/src/__tests__/utils/unlockMachine.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/utils/unlockMachine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `apps/consumer/src/utils/unlockMachine.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm PASS**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/utils/unlockMachine.test.ts
```

Expected: 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/utils/unlockMachine.ts apps/consumer/src/__tests__/utils/unlockMachine.test.ts
git commit -m "feat(consumer): unlock state machine with full test coverage"
```

---

### Task 3: ProfileContext + SuggestionContext

**Files:**
- Create: `apps/consumer/src/context/ProfileContext.tsx`
- Create: `apps/consumer/src/context/SuggestionContext.tsx`

- [ ] **Step 1: Create `apps/consumer/src/context/ProfileContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { UserProfile } from '@style-yangu/types'

interface ProfileContextValue {
  profile: UserProfile | null
  loading: boolean
  error: string | null
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<UserProfile>('/consumer/profile')
      .then(setProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, error }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
```

- [ ] **Step 2: Create `apps/consumer/src/context/SuggestionContext.tsx`**

```typescript
import React, { createContext, useContext, useReducer, useState, useEffect, useCallback } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { unlockReducer, type UnlockState, type UnlockAction } from '../utils/unlockMachine'
import type { Suggestion, DailySuggestionResponse, UnlockResponse, AdPhaseNumber } from '@style-yangu/types'

interface SuggestionContextValue {
  suggestions: Suggestion[]
  unlockState: UnlockState
  phase: AdPhaseNumber
  loading: boolean
  error: string | null
  unlockByAd: () => Promise<void>
  unlockByWardrobe: (itemIds: [string, string]) => Promise<void>
  dispatchUnlock: React.Dispatch<UnlockAction>
}

const SuggestionContext = createContext<SuggestionContextValue | null>(null)

const initialUnlockState: UnlockState = {
  unlockCount: 1,
  adsWatched: 0,
  wardrobePairsUsed: 0,
  wardrobeProgress: 0,
  unlockMode: 'idle',
}

export function SuggestionProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [phase, setPhase] = useState<AdPhaseNumber>(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockState, dispatchUnlock] = useReducer(unlockReducer, initialUnlockState)

  useEffect(() => {
    apiClient.get<DailySuggestionResponse>('/consumer/suggestion/daily')
      .then(data => {
        setSuggestions(data.suggestions)
        setPhase(data.phase)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const unlockByAd = useCallback(async () => {
    const data = await apiClient.post<UnlockResponse>('/consumer/suggestion/unlock', { method: 'ad' })
    if (data.newSuggestion) setSuggestions(prev => [...prev, data.newSuggestion!])
    dispatchUnlock({ type: 'AD_WATCHED' })
  }, [])

  const unlockByWardrobe = useCallback(async (itemIds: [string, string]) => {
    const data = await apiClient.post<UnlockResponse>('/consumer/suggestion/unlock', {
      method: 'wardrobe',
      wardrobeItemIds: itemIds,
    })
    if (data.newSuggestion) setSuggestions(prev => [...prev, data.newSuggestion!])
    dispatchUnlock({ type: 'WARDROBE_ITEM_CAPTURED' })
    dispatchUnlock({ type: 'WARDROBE_ITEM_CAPTURED' })
  }, [])

  return (
    <SuggestionContext.Provider value={{ suggestions, unlockState, phase, loading, error, unlockByAd, unlockByWardrobe, dispatchUnlock }}>
      {children}
    </SuggestionContext.Provider>
  )
}

export function useSuggestionContext(): SuggestionContextValue {
  const ctx = useContext(SuggestionContext)
  if (!ctx) throw new Error('useSuggestionContext must be used within SuggestionProvider')
  return ctx
}
```

- [ ] **Step 3: Type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/consumer/src/context/
git commit -m "feat(consumer): ProfileContext and SuggestionContext"
```

---

### Task 4: Consumer-specific hooks

**Files:**
- Create: `apps/consumer/src/hooks/useWeatherApi.ts`
- Create: `apps/consumer/src/hooks/useWardrobe.ts`
- Create: `apps/consumer/src/hooks/useReferral.ts`
- Create: `apps/consumer/src/hooks/useStreak.ts`

- [ ] **Step 1: Create `apps/consumer/src/hooks/useWeatherApi.ts`**

```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { WeatherData } from '@style-yangu/types'

interface UseWeatherApiResult {
  weather: WeatherData | null
  loading: boolean
  error: string | null
}

export function useWeatherApi(): UseWeatherApiResult {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<WeatherData>('/consumer/weather')
      .then(setWeather)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { weather, loading, error }
}
```

- [ ] **Step 2: Create `apps/consumer/src/hooks/useWardrobe.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { WardrobeItem, WardrobeResponse } from '@style-yangu/types'

interface UseWardrobeResult {
  items: WardrobeItem[]
  total: number
  loading: boolean
  error: string | null
  addItem: (photoDataUrl: string) => Promise<WardrobeItem>
  refetch: () => void
}

export function useWardrobe(category = 'all'): UseWardrobeResult {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    apiClient.get<WardrobeResponse>(`/consumer/wardrobe?category=${category}&page=1`)
      .then(data => { setItems(data.items); setTotal(data.total) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [category, tick])

  const addItem = useCallback(async (photoDataUrl: string): Promise<WardrobeItem> => {
    const data = await apiClient.post<{ item: WardrobeItem }>('/consumer/wardrobe/item', { photoDataUrl })
    setItems(prev => [data.item, ...prev])
    setTotal(prev => prev + 1)
    return data.item
  }, [])

  const refetch = useCallback(() => setTick(t => t + 1), [])

  return { items, total, loading, error, addItem, refetch }
}
```

- [ ] **Step 3: Create `apps/consumer/src/hooks/useReferral.ts`**

```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { ReferralData } from '@style-yangu/types'

interface UseReferralResult {
  referral: ReferralData | null
  loading: boolean
  error: string | null
}

export function useReferral(): UseReferralResult {
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<ReferralData>('/consumer/referral')
      .then(setReferral)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { referral, loading, error }
}
```

- [ ] **Step 4: Create `apps/consumer/src/hooks/useStreak.ts`**

```typescript
import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { StreakData } from '@style-yangu/types'

interface UseStreakResult {
  streak: StreakData | null
  loading: boolean
  error: string | null
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<StreakData>('/consumer/streak')
      .then(setStreak)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { streak, loading, error }
}
```

- [ ] **Step 5: Type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/hooks/
git commit -m "feat(consumer): useWeatherApi, useWardrobe, useReferral, useStreak hooks"
```

---

### Task 5: Update test-utils + AppShell + routing

**Files:**
- Modify: `apps/consumer/src/__tests__/test-utils.tsx`
- Create: `apps/consumer/src/AppShell.tsx`
- Modify: `apps/consumer/src/routes/index.tsx`

- [ ] **Step 1: Add `renderWithAppProviders` to test-utils**

Open `apps/consumer/src/__tests__/test-utils.tsx` and add at the bottom (keeping `renderWithProviders` intact):

```typescript
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

export function renderWithAppProviders(
  ui: ReactElement,
  options: RenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <ProfileProvider>
          <SuggestionProvider>
            {children}
          </SuggestionProvider>
        </ProfileProvider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
```

- [ ] **Step 2: Create `apps/consumer/src/AppShell.tsx`**

```typescript
import { Outlet, NavLink } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import { SuggestionProvider } from './context/SuggestionContext'

const NAV_ITEMS = [
  { to: '/home/',         label: 'Home',     icon: '🏠' },
  { to: '/home/wardrobe', label: 'Wardrobe', icon: '👕' },
  { to: '/home/style',    label: 'Style',    icon: '⭐' },
  { to: '/home/discover', label: 'Discover', icon: '🧭' },
  { to: '/home/profile',  label: 'Profile',  icon: '👤' },
]

export default function AppShell() {
  return (
    <ProfileProvider>
      <SuggestionProvider>
        <div className="min-h-screen bg-[#FDFAF7] flex flex-col">
          <main className="flex-1 overflow-y-auto pb-20">
            <Outlet />
          </main>
          <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E8DDD5] flex z-50">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/home/'}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
                    isActive ? 'text-[#8B4513]' : 'text-[#1A0A00]/40'
                  }`
                }
              >
                <span className="text-xl leading-none">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </SuggestionProvider>
    </ProfileProvider>
  )
}
```

- [ ] **Step 3: Update `apps/consumer/src/routes/index.tsx`**

Replace the entire file:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Onboarding = lazy(() => import('../onboarding'))
const AppShell   = lazy(() => import('../AppShell'))
const HomeTab     = lazy(() => import('../pages/HomeTab'))
const WardrobeTab = lazy(() => import('../pages/WardrobeTab'))
const StyleTab    = lazy(() => import('../pages/StyleTab'))
const DiscoverTab = lazy(() => import('../pages/DiscoverTab'))
const ProfileTab  = lazy(() => import('../pages/ProfileTab'))

const loading = <div className="min-h-screen bg-[#FDFAF7]" />

function AuthGuard() {
  const token = localStorage.getItem('sy_token')
  return token ? <Navigate to="/home/" replace /> : <Navigate to="/onboarding" replace />
}

const router = createBrowserRouter([
  { path: '/', element: <AuthGuard /> },
  {
    path: '/onboarding',
    element: <Suspense fallback={loading}><Onboarding /></Suspense>,
  },
  {
    path: '/home',
    element: <Suspense fallback={loading}><AppShell /></Suspense>,
    children: [
      { index: true, element: <Navigate to="/home/" replace /> },
      { path: '',        element: <Suspense fallback={loading}><HomeTab /></Suspense> },
      { path: 'wardrobe', element: <Suspense fallback={loading}><WardrobeTab /></Suspense> },
      { path: 'style',    element: <Suspense fallback={loading}><StyleTab /></Suspense> },
      { path: 'discover', element: <Suspense fallback={loading}><DiscoverTab /></Suspense> },
      { path: 'profile',  element: <Suspense fallback={loading}><ProfileTab /></Suspense> },
    ],
  },
])

export default router
```

- [ ] **Step 4: Create placeholder tab pages so the router doesn't crash**

Create these four files (HomeTab comes in Task 6):

`apps/consumer/src/pages/WardrobeTab.tsx`:
```typescript
export default function WardrobeTab() {
  return <div className="p-6"><h1 className="text-xl font-bold text-[#1A0A00]">Wardrobe</h1></div>
}
```

`apps/consumer/src/pages/StyleTab.tsx`:
```typescript
export default function StyleTab() {
  return <div className="p-6"><h1 className="text-xl font-bold text-[#1A0A00]">Style</h1></div>
}
```

`apps/consumer/src/pages/DiscoverTab.tsx`:
```typescript
export default function DiscoverTab() {
  return <div className="p-6"><h1 className="text-xl font-bold text-[#1A0A00]">Discover</h1></div>
}
```

`apps/consumer/src/pages/ProfileTab.tsx`:
```typescript
export default function ProfileTab() {
  return <div className="p-6"><h1 className="text-xl font-bold text-[#1A0A00]">Profile</h1></div>
}
```

- [ ] **Step 5: Type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/__tests__/test-utils.tsx apps/consumer/src/AppShell.tsx apps/consumer/src/routes/index.tsx apps/consumer/src/pages/
git commit -m "feat(consumer): AppShell bottom nav, nested routing, placeholder tab pages"
```

---

### Task 6: Home tab components + HomeTab page (TDD)

**Files:**
- Create: `apps/consumer/src/components/StylistGreetingCard.tsx`
- Create: `apps/consumer/src/components/WeatherBanner.tsx`
- Create: `apps/consumer/src/components/SuggestionCard.tsx`
- Create: `apps/consumer/src/components/UnlockMechanic.tsx`
- Create: `apps/consumer/src/pages/HomeTab.tsx`
- Create: `apps/consumer/src/__tests__/HomeTab.test.tsx`

- [ ] **Step 1: Write the failing HomeTab tests**

Create `apps/consumer/src/__tests__/HomeTab.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import HomeTab from '../pages/HomeTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockProfile = {
  avatarUrl: null,
  stylistName: 'amara' as const,
  skinTone: null,
  bodyType: null,
  shoeSize: { uk: 6, eu: 39 },
  stylePrefs: [],
  budget: {},
  location: { lat: -1.29, lon: 36.82 },
  tier: 'free' as const,
}

const mockSuggestion = {
  id: 's1',
  outfit: 'White blouse, navy skirt',
  occasionTag: 'Smart Casual',
  stylistComment: 'Looks great with your undertone',
  clothingTags: ['blouse', 'skirt'],
}

const mockWeather = {
  temp: 24,
  condition: 'Clear',
  windSpeed: 8,
  humidity: 55,
  timeOfDay: 'morning' as const,
  simulated: false,
}

function renderHomeTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <HomeTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/profile') return Promise.resolve(mockProfile)
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [mockSuggestion], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    if (path === '/consumer/weather') return Promise.resolve(mockWeather)
    return Promise.resolve({})
  })
})

describe('HomeTab', () => {
  it('shows stylist greeting with name', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/amara/i)).toBeInTheDocument())
  })

  it('shows the suggestion outfit text', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/white blouse/i)).toBeInTheDocument())
  })

  it('shows weather condition', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/24/)).toBeInTheDocument())
  })

  it('shows unlock mechanic after first suggestion', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/want.*more/i)).toBeInTheDocument())
  })

  it('shows weather warning when condition matches clothing tags', async () => {
    vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
      if (path === '/consumer/profile') return Promise.resolve(mockProfile)
      if (path === '/consumer/suggestion/daily') return Promise.resolve({
        suggestions: [{ ...mockSuggestion, clothingTags: ['loose-skirt'] }],
        unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2,
      })
      if (path === '/consumer/weather') return Promise.resolve({ ...mockWeather, condition: 'Windy' })
      return Promise.resolve({})
    })
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/wind/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run to confirm FAIL**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/HomeTab.test.tsx
```

Expected: FAIL — HomeTab not found.

- [ ] **Step 3: Create `apps/consumer/src/components/StylistGreetingCard.tsx`**

```typescript
import type { Stylist, TimeOfDay } from '@style-yangu/types'

const GREETINGS: Record<TimeOfDay, string> = {
  morning:   'Good morning! I have an outfit idea for you today.',
  afternoon: 'Good afternoon! Ready to look great today?',
  evening:   'Good evening! Let me help you plan tomorrow.',
  night:     'Planning ahead? Here\'s what I\'d suggest.',
}

interface Props {
  stylistName: Stylist
  timeOfDay: TimeOfDay
}

function AmaraAvatar() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#C4834A] flex items-center justify-center text-white font-bold text-lg shrink-0">
      A
    </div>
  )
}

function KofiAvatar() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#5C3A1E] flex items-center justify-center text-white font-bold text-lg shrink-0">
      K
    </div>
  )
}

export default function StylistGreetingCard({ stylistName, timeOfDay }: Props) {
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-[#E8DDD5]">
      {stylistName === 'kofi' ? <KofiAvatar /> : <AmaraAvatar />}
      <div>
        <p className="font-bold text-[#1A0A00] text-sm">{name}</p>
        <p className="text-xs text-[#1A0A00]/70 leading-relaxed">{GREETINGS[timeOfDay]}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `apps/consumer/src/components/WeatherBanner.tsx`**

```typescript
import { getWeatherWarning } from '../utils/weatherWarning'
import type { WeatherData } from '@style-yangu/types'
import type { Stylist } from '@style-yangu/types'

const CONDITION_ICON: Record<string, string> = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Windy: '💨', Extreme: '🌡️',
  Humid: '💧', Cold: '🥶', Fog: '🌫️',
}

interface Props {
  weather: WeatherData
  clothingTags: string[]
  stylistName: Stylist
}

export default function WeatherBanner({ weather, clothingTags, stylistName }: Props) {
  const warning = getWeatherWarning(weather.condition, clothingTags, stylistName)
  const icon = CONDITION_ICON[weather.condition] ?? '🌤️'

  return (
    <div className={`rounded-2xl p-3 border ${warning ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E8DDD5]'}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#1A0A00]">
            {weather.temp}°C · {weather.condition}
          </p>
          {weather.simulated && (
            <span className="text-xs text-amber-600">Simulated weather</span>
          )}
        </div>
      </div>
      {warning && (
        <p className="mt-2 text-xs text-amber-800 leading-relaxed">{warning.message}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `apps/consumer/src/components/SuggestionCard.tsx`**

```typescript
import type { Suggestion } from '@style-yangu/types'

interface Props {
  suggestion: Suggestion
  index: number
  stylistName: string
}

export default function SuggestionCard({ suggestion, index, stylistName }: Props) {
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)
  return (
    <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#8B4513] bg-[#F5EDE5] px-2 py-0.5 rounded-full">
          {suggestion.occasionTag}
        </span>
        {index > 0 && (
          <span className="text-xs text-[#1A0A00]/40">Unlocked #{index + 1}</span>
        )}
      </div>
      <p className="font-semibold text-[#1A0A00] leading-snug">{suggestion.outfit}</p>
      <p className="mt-2 text-xs text-[#1A0A00]/70 leading-relaxed italic">
        "{suggestion.stylistComment}" — {name}
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Create `apps/consumer/src/components/UnlockMechanic.tsx`**

```typescript
import { useState } from 'react'
import { canWatchAd, canAddWardrobe } from '../utils/unlockMachine'
import type { UnlockState } from '../utils/unlockMachine'
import type { SponsoredCard } from '@style-yangu/types'

const FEMALE_AD_STUB: SponsoredCard = {
  slotId: 'stub-1',
  itemId: 'stub-item-1',
  sellerStorefrontName: 'NairobiChic',
  showcaseImageUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Emerald+Wrap+Dress',
  priceKES: 2800,
  cta: 'talk_to_seller',
  isArtisanCard: false,
}

const MALE_AD_STUB: SponsoredCard = {
  slotId: 'stub-2',
  itemId: 'stub-item-2',
  sellerStorefrontName: 'ModernAfrika',
  showcaseImageUrl: 'https://placehold.co/400x500/5C3A1E/FFFFFF?text=Linen+Shirt',
  priceKES: 1500,
  cta: 'talk_to_seller',
  isArtisanCard: false,
}

interface Props {
  unlockState: UnlockState
  stylistName: 'amara' | 'kofi'
  onUnlockByAd: () => Promise<void>
  onStartWardrobeUnlock: () => void
}

export default function UnlockMechanic({ unlockState, stylistName, onUnlockByAd, onStartWardrobeUnlock }: Props) {
  const [showingAd, setShowingAd] = useState(false)
  const [adTimer, setAdTimer] = useState(3)

  if (unlockState.unlockMode === 'done' || unlockState.unlockCount >= 3) return null

  const adCard = stylistName === 'kofi' ? MALE_AD_STUB : FEMALE_AD_STUB

  async function watchAd() {
    setShowingAd(true)
    setAdTimer(3)
    const interval = setInterval(() => {
      setAdTimer(t => {
        if (t <= 1) {
          clearInterval(interval)
          setShowingAd(false)
          onUnlockByAd()
        }
        return t - 1
      })
    }, 1000)
  }

  if (showingAd) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DDD5] overflow-hidden">
        <div className="relative">
          <img src={adCard.showcaseImageUrl} alt={adCard.sellerStorefrontName} className="w-full aspect-[3/4] object-cover" />
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            Sponsored
          </div>
          <div className="absolute bottom-2 right-2 bg-[#8B4513] text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
            {adTimer}
          </div>
        </div>
        <div className="p-3">
          <p className="font-medium text-sm text-[#1A0A00]">{adCard.sellerStorefrontName}</p>
          <p className="text-sm text-[#1A0A00]/60">KES {adCard.priceKES.toLocaleString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F5EDE5] rounded-2xl p-4">
      <p className="text-sm font-semibold text-[#1A0A00] mb-3">
        Want {3 - unlockState.unlockCount} more {3 - unlockState.unlockCount === 1 ? 'idea' : 'ideas'} today?
      </p>
      <div className="flex gap-2">
        {canWatchAd(unlockState) && (
          <button
            onClick={watchAd}
            className="flex-1 bg-[#8B4513] text-white rounded-xl py-2.5 text-sm font-medium"
          >
            Watch a look
          </button>
        )}
        {canAddWardrobe(unlockState) && (
          <button
            onClick={onStartWardrobeUnlock}
            className="flex-1 border border-[#8B4513] text-[#8B4513] rounded-xl py-2.5 text-sm font-medium"
          >
            Add 2 items
          </button>
        )}
      </div>
      {unlockState.wardrobePairsUsed > 0 && (
        <p className="mt-2 text-xs text-[#1A0A00]/50 text-center">
          {unlockState.adsWatched}/{2} ads · {unlockState.wardrobePairsUsed}/{2} wardrobe pairs
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create `apps/consumer/src/pages/HomeTab.tsx`**

```typescript
import { useNavigate } from 'react-router-dom'
import { useProfileContext } from '../context/ProfileContext'
import { useSuggestionContext } from '../context/SuggestionContext'
import { useWeatherApi } from '../hooks/useWeatherApi'
import StylistGreetingCard from '../components/StylistGreetingCard'
import WeatherBanner from '../components/WeatherBanner'
import SuggestionCard from '../components/SuggestionCard'
import UnlockMechanic from '../components/UnlockMechanic'

export default function HomeTab() {
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useProfileContext()
  const { suggestions, unlockState, unlockByAd, dispatchUnlock } = useSuggestionContext()
  const { weather } = useWeatherApi()

  if (profileLoading) {
    return <div className="min-h-screen bg-[#FDFAF7] flex items-center justify-center">
      <p className="text-sm text-[#1A0A00]/50">Loading...</p>
    </div>
  }

  const stylistName = profile?.stylistName ?? 'amara'
  const timeOfDay = weather?.timeOfDay ?? 'morning'
  const currentSuggestion = suggestions[suggestions.length - 1]
  const clothingTags = currentSuggestion?.clothingTags ?? []

  function handleStartWardrobeUnlock() {
    dispatchUnlock({ type: 'START_WARDROBE_UNLOCK' })
    navigate('/home/wardrobe')
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      <StylistGreetingCard stylistName={stylistName} timeOfDay={timeOfDay} />

      {weather && (
        <WeatherBanner
          weather={weather}
          clothingTags={clothingTags}
          stylistName={stylistName}
        />
      )}

      {suggestions.map((s, i) => (
        <SuggestionCard key={s.id} suggestion={s} index={i} stylistName={stylistName} />
      ))}

      <UnlockMechanic
        unlockState={unlockState}
        stylistName={stylistName}
        onUnlockByAd={unlockByAd}
        onStartWardrobeUnlock={handleStartWardrobeUnlock}
      />
    </div>
  )
}
```

- [ ] **Step 8: Run tests**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/HomeTab.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 9: Run full test suite**

```bash
cd "apps/consumer" && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/consumer/src/components/ apps/consumer/src/pages/HomeTab.tsx apps/consumer/src/__tests__/HomeTab.test.tsx
git commit -m "feat(consumer): Home tab — stylist greeting, weather banner, suggestion cards, unlock mechanic"
```
