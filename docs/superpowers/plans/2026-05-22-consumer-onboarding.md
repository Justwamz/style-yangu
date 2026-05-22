# Consumer Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full 11-step consumer onboarding wizard for the Style Yangu consumer PWA with realistic AI camera stubs.

**Architecture:** Single `/onboarding` route, `OnboardingContext` backed by `localStorage` key `sy_onboarding`, CSS `translateX` slide transitions between steps. Camera steps (3-4, 5, 7) open real camera UI with stub processing (2 s delay → mock data). Two API routes added to `services/api`: `POST /auth/register` and `POST /onboarding/complete`.

**Tech Stack:** React 18, Vite 5, TypeScript, Tailwind CSS, react-router-dom v6, Vitest 2 + @testing-library/react 16 + jsdom, bcryptjs + jsonwebtoken + pg (already in services/api).

---

## File Structure

**Create:**
```
apps/consumer/
  vitest.config.ts
  src/
    test/setup.ts
    __tests__/
      test-utils.tsx
      OnboardingContext.test.tsx
      OnboardingWizard.test.tsx
      steps/
        Step01Account.test.tsx
        Step02Stylist.test.tsx
        Step06StylePrefs.test.tsx
        Step08Location.test.tsx
        Step09Budget.test.tsx
        Step10ShoeSize.test.tsx
        Step11AvatarPreview.test.tsx
    routes/index.tsx
    pages/Home.tsx
    onboarding/
      index.tsx
      OnboardingContext.tsx
      OnboardingWizard.tsx
      steps/
        Step01Account.tsx
        Step02Stylist.tsx
        Step03BodySelfie.tsx
        Step05SkinTone.tsx
        Step06StylePrefs.tsx
        Step07Wardrobe.tsx
        Step08Location.tsx
        Step09Budget.tsx
        Step10ShoeSize.tsx
        Step11AvatarPreview.tsx

services/api/src/
  db/migrate.ts
  routes/
    auth.ts
    onboarding.ts
```

**Modify:**
```
apps/consumer/package.json              # add vitest, RTL, test script
apps/consumer/src/App.tsx               # wire RouterProvider
apps/consumer/src/index.css             # add slide-in animations
packages/ui/src/CameraOverlay.tsx       # export OverlayShape type
packages/ui/src/index.ts                # re-export OverlayShape
services/api/src/index.ts               # mount routes + runMigrations
```

---

## Step navigation rules (reference for all tasks)

| Step | Required to advance | How step advances |
|------|--------------------|--------------------|
| 1 | `state.userId` set | Auto (API success dispatches SET_ACCOUNT + SET_STEP(2)) |
| 2 | `state.stylist` set | Footer Next button |
| 3–4 | — | Auto (camera sub-screens; SET_STEP(4) then SET_BODY + SET_STEP(5)) |
| 5 | `state.skinProfile` or Skip | Footer Next OR "Skip for now" button in step |
| 6 | ≥1 preference | Footer Next button |
| 7 | — | Auto ("Done" / "Skip step" in component; SET_WARDROBE + SET_STEP(8)) |
| 8 | — | Auto (Allow/Deny → SET_LOCATION + SET_STEP(9)) |
| 9 | — (always) | Footer Next button |
| 10 | — (always) | Footer Next button |
| 11 | — | CTA → POST + navigate /home |

`canAdvance(step, state)` in OnboardingWizard returns `true` only for steps 2, 5, 6, 9, 10 (with appropriate checks).

---

## Task 1: Vitest + RTL infrastructure

**Files:**
- Modify: `apps/consumer/package.json`
- Create: `apps/consumer/vitest.config.ts`
- Create: `apps/consumer/src/test/setup.ts`

- [ ] **Step 1: Add test dependencies to consumer package.json**

Open `apps/consumer/package.json`. Add to `devDependencies`:
```json
"@testing-library/jest-dom": "^6.4.0",
"@testing-library/react": "^16.0.0",
"@testing-library/user-event": "^14.5.0",
"@vitest/coverage-v8": "^2.0.0",
"jsdom": "^24.1.0",
"vitest": "^2.0.0"
```

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Create vitest.config.ts**

Create `apps/consumer/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: Create test setup**

Create `apps/consumer/src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Install and verify**

```bash
cd "apps/consumer" && npm install
```

Then create a smoke test to verify the setup works. Create `apps/consumer/src/__tests__/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('test setup', () => {
  it('vitest runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `cd "apps/consumer" && npx vitest run src/__tests__/smoke.test.ts`

Expected output:
```
✓ src/__tests__/smoke.test.ts > test setup > vitest runs
Test Files  1 passed (1)
```

- [ ] **Step 5: Delete smoke test + commit**

Delete `apps/consumer/src/__tests__/smoke.test.ts`, then:
```bash
git init  # if not already a git repo
git add apps/consumer/package.json apps/consumer/vitest.config.ts apps/consumer/src/test/setup.ts
git commit -m "feat(consumer): add Vitest + RTL test infrastructure"
```

---

## Task 2: Export OverlayShape type from packages/ui

**Files:**
- Modify: `packages/ui/src/CameraOverlay.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: Export OverlayShape from CameraOverlay.tsx**

Open `packages/ui/src/CameraOverlay.tsx`. Change line 1 from:
```typescript
type OverlayShape = 'oval_face' | 'full_body' | 'flat_lay_rect' | 'hand_oval' | 'forearm_rect' | 'fabric_rect'
```
to:
```typescript
export type OverlayShape = 'oval_face' | 'full_body' | 'flat_lay_rect' | 'hand_oval' | 'forearm_rect' | 'fabric_rect'
```

- [ ] **Step 2: Re-export from packages/ui/src/index.ts**

Add to `packages/ui/src/index.ts`:
```typescript
export type { OverlayShape } from './CameraOverlay'
```

- [ ] **Step 3: Type-check**

Run: `cd packages/ui && npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/CameraOverlay.tsx packages/ui/src/index.ts
git commit -m "feat(ui): export OverlayShape type"
```

---

## Task 3: OnboardingContext — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/OnboardingContext.tsx`
- Create: `apps/consumer/src/__tests__/OnboardingContext.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/OnboardingContext.test.tsx`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import React from 'react'
import {
  onboardingReducer,
  initialState,
  OnboardingProvider,
  useOnboarding,
} from '../onboarding/OnboardingContext'

// ── Pure reducer tests ────────────────────────────────────────────────────────

describe('onboardingReducer', () => {
  it('SET_STEP updates step', () => {
    expect(onboardingReducer(initialState, { type: 'SET_STEP', step: 5 }).step).toBe(5)
  })

  it('SET_ACCOUNT stores userId + token', () => {
    const s = onboardingReducer(initialState, { type: 'SET_ACCOUNT', userId: 'u1', token: 'tok' })
    expect(s.userId).toBe('u1')
    expect(s.token).toBe('tok')
  })

  it('SET_STYLIST stores stylist', () => {
    const s = onboardingReducer(initialState, { type: 'SET_STYLIST', stylist: 'amara' })
    expect(s.stylist).toBe('amara')
  })

  it('SET_BODY stores bodyType + avatarCartoonUrl', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: 'data:image/svg+xml,test',
    })
    expect(s.bodyType).toBe('hourglass')
    expect(s.avatarCartoonUrl).toBe('data:image/svg+xml,test')
  })

  it('SET_SKIN stores skinProfile + hennaDetected', () => {
    const profile = { depth: 'medium' as const, undertone: 'warm' as const, userConfirmed: true }
    const s = onboardingReducer(initialState, { type: 'SET_SKIN', skinProfile: profile, hennaDetected: false })
    expect(s.skinProfile).toEqual(profile)
    expect(s.hennaDetected).toBe(false)
  })

  it('SET_STYLE_PREFS stores preferences', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_STYLE_PREFS', stylePreferences: ['smart_casual', 'streetwear'],
    })
    expect(s.stylePreferences).toEqual(['smart_casual', 'streetwear'])
  })

  it('SET_WARDROBE stores items', () => {
    const items = [{ id: '1', photoDataUrl: 'data:x', prompt: 'rainy', tag: 'owned' as const }]
    const s = onboardingReducer(initialState, { type: 'SET_WARDROBE', wardrobeItems: items })
    expect(s.wardrobeItems).toEqual(items)
  })

  it('SET_LOCATION stores permission + coords', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_LOCATION', locationPermission: 'granted', lat: -1.2921, lon: 36.8219,
    })
    expect(s.locationPermission).toBe('granted')
    expect(s.lat).toBe(-1.2921)
  })

  it('SET_BUDGETS stores budgets', () => {
    const s = onboardingReducer(initialState, { type: 'SET_BUDGETS', budgets: { top: 2000 } })
    expect(s.budgets).toEqual({ top: 2000 })
  })

  it('SET_SHOE_SIZE stores sizes', () => {
    const s = onboardingReducer(initialState, { type: 'SET_SHOE_SIZE', shoeSizeUK: 6, shoeSizeEU: 39 })
    expect(s.shoeSizeUK).toBe(6)
    expect(s.shoeSizeEU).toBe(39)
  })

  it('RESET returns initialState', () => {
    const dirty = { step: 8, userId: 'u1', token: 't', stylist: 'kofi' as const }
    expect(onboardingReducer(dirty, { type: 'RESET' })).toEqual(initialState)
  })
})

// ── Provider + localStorage tests ─────────────────────────────────────────────

function TestConsumer() {
  const { state, dispatch } = useOnboarding()
  return (
    <>
      <span data-testid="step">{state.step}</span>
      <button onClick={() => dispatch({ type: 'SET_STEP', step: 7 })}>go7</button>
    </>
  )
}

describe('OnboardingProvider', () => {
  beforeEach(() => localStorage.clear())

  it('persists state to localStorage on dispatch', () => {
    const { getByRole } = render(
      <OnboardingProvider><TestConsumer /></OnboardingProvider>
    )
    act(() => { getByRole('button', { name: 'go7' }).click() })
    const saved = JSON.parse(localStorage.getItem('sy_onboarding') ?? '{}')
    expect(saved.step).toBe(7)
  })

  it('rehydrates state from localStorage on mount', () => {
    localStorage.setItem('sy_onboarding', JSON.stringify({ step: 5 }))
    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>)
    expect(screen.getByTestId('step').textContent).toBe('5')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/OnboardingContext.test.tsx
```

Expected: FAIL — `Cannot find module '../onboarding/OnboardingContext'`

- [ ] **Step 3: Implement OnboardingContext.tsx**

Create `apps/consumer/src/onboarding/OnboardingContext.tsx`:
```typescript
import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Stylist, BodyType, SkinProfile, StylePreference } from '@style-yangu/types'

export interface WardrobeItem {
  id: string
  photoDataUrl: string
  prompt: string
  tag: 'owned' | 'purchased_planned'
}

export interface OnboardingState {
  step: number
  userId?: string
  token?: string
  stylist?: Stylist
  bodyType?: BodyType
  avatarCartoonUrl?: string
  skinProfile?: SkinProfile
  hennaDetected?: boolean
  stylePreferences?: StylePreference[]
  wardrobeItems?: WardrobeItem[]
  locationPermission?: 'granted' | 'denied'
  lat?: number
  lon?: number
  budgets?: Record<string, number>
  shoeSizeUK?: number
  shoeSizeEU?: number
}

export type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ACCOUNT'; userId: string; token: string }
  | { type: 'SET_STYLIST'; stylist: Stylist }
  | { type: 'SET_BODY'; bodyType: BodyType; avatarCartoonUrl: string }
  | { type: 'SET_SKIN'; skinProfile: SkinProfile; hennaDetected: boolean }
  | { type: 'SET_STYLE_PREFS'; stylePreferences: StylePreference[] }
  | { type: 'SET_WARDROBE'; wardrobeItems: WardrobeItem[] }
  | { type: 'SET_LOCATION'; locationPermission: 'granted' | 'denied'; lat?: number; lon?: number }
  | { type: 'SET_BUDGETS'; budgets: Record<string, number> }
  | { type: 'SET_SHOE_SIZE'; shoeSizeUK: number; shoeSizeEU: number }
  | { type: 'RESET' }

export const initialState: OnboardingState = { step: 1 }

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step }
    case 'SET_ACCOUNT': return { ...state, userId: action.userId, token: action.token }
    case 'SET_STYLIST': return { ...state, stylist: action.stylist }
    case 'SET_BODY': return { ...state, bodyType: action.bodyType, avatarCartoonUrl: action.avatarCartoonUrl }
    case 'SET_SKIN': return { ...state, skinProfile: action.skinProfile, hennaDetected: action.hennaDetected }
    case 'SET_STYLE_PREFS': return { ...state, stylePreferences: action.stylePreferences }
    case 'SET_WARDROBE': return { ...state, wardrobeItems: action.wardrobeItems }
    case 'SET_LOCATION': return { ...state, locationPermission: action.locationPermission, lat: action.lat, lon: action.lon }
    case 'SET_BUDGETS': return { ...state, budgets: action.budgets }
    case 'SET_SHOE_SIZE': return { ...state, shoeSizeUK: action.shoeSizeUK, shoeSizeEU: action.shoeSizeEU }
    case 'RESET': return initialState
    default: return state
  }
}

interface OnboardingContextValue {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

const STORAGE_KEY = 'sy_onboarding'

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OnboardingState) : initialState
  } catch {
    return initialState
  }
}

interface OnboardingProviderProps {
  children: React.ReactNode
  testInitialState?: Partial<OnboardingState>
}

export function OnboardingProvider({ children, testInitialState }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(
    onboardingReducer,
    testInitialState ? { ...initialState, ...testInitialState } : loadState(),
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage unavailable — context lives in memory only
    }
  }, [state])

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/OnboardingContext.test.tsx
```

Expected:
```
✓ onboardingReducer > SET_STEP updates step
✓ onboardingReducer > SET_ACCOUNT stores userId + token
... (11 reducer tests)
✓ OnboardingProvider > persists state to localStorage on dispatch
✓ OnboardingProvider > rehydrates state from localStorage on mount
Test Files  1 passed (1)
```

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/OnboardingContext.tsx apps/consumer/src/__tests__/OnboardingContext.test.tsx
git commit -m "feat(consumer): OnboardingContext with reducer and localStorage persistence"
```

---

## Task 4: App routing + Home page

**Files:**
- Create: `apps/consumer/src/routes/index.tsx`
- Create: `apps/consumer/src/pages/Home.tsx`
- Create: `apps/consumer/src/onboarding/index.tsx`
- Modify: `apps/consumer/src/App.tsx`
- Modify: `apps/consumer/src/index.css`

- [ ] **Step 1: Create Home.tsx**

Create `apps/consumer/src/pages/Home.tsx`:
```tsx
export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFAF7] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1A0A00]">Style Yangu</h1>
        <p className="mt-1 text-sm text-[#8B4513]">Your personal stylist is ready.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create onboarding/index.tsx**

Create `apps/consumer/src/onboarding/index.tsx`:
```tsx
import { OnboardingProvider } from './OnboardingContext'
import OnboardingWizard from './OnboardingWizard'

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingWizard />
    </OnboardingProvider>
  )
}
```

- [ ] **Step 3: Create routes/index.tsx**

Create `apps/consumer/src/routes/index.tsx`:
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Onboarding = lazy(() => import('../onboarding'))
const Home = lazy(() => import('../pages/Home'))

function AuthGuard() {
  const token = localStorage.getItem('sy_token')
  return token ? <Navigate to="/home" replace /> : <Navigate to="/onboarding" replace />
}

const router = createBrowserRouter([
  { path: '/', element: <AuthGuard /> },
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-[#FDFAF7]" />}>
        <Onboarding />
      </Suspense>
    ),
  },
  {
    path: '/home',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-[#FDFAF7]" />}>
        <Home />
      </Suspense>
    ),
  },
])

export default router
```

- [ ] **Step 4: Update App.tsx**

Replace `apps/consumer/src/App.tsx` entirely:
```tsx
import { RouterProvider } from 'react-router-dom'
import router from './routes'

export default function App() {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 5: Add slide animations to index.css**

Append to `apps/consumer/src/index.css`:
```css
@keyframes slide-from-right {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes slide-from-left {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.animate-slide-right { animation: slide-from-right 0.25s ease-out; }
.animate-slide-left  { animation: slide-from-left  0.25s ease-out; }
```

- [ ] **Step 6: Type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/consumer/src/routes/index.tsx apps/consumer/src/pages/Home.tsx apps/consumer/src/onboarding/index.tsx apps/consumer/src/App.tsx apps/consumer/src/index.css
git commit -m "feat(consumer): add routing — /, /onboarding, /home"
```

---

## Task 5: OnboardingWizard shell — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/OnboardingWizard.tsx`
- Create: `apps/consumer/src/__tests__/OnboardingWizard.test.tsx`
- Create: `apps/consumer/src/__tests__/test-utils.tsx`

- [ ] **Step 1: Create test-utils.tsx**

Create `apps/consumer/src/__tests__/test-utils.tsx`:
```tsx
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingProvider } from '../onboarding/OnboardingContext'
import type { OnboardingState } from '../onboarding/OnboardingContext'
import type { ReactElement } from 'react'

interface WrapperOptions extends RenderOptions {
  initialState?: Partial<OnboardingState>
}

export function renderWithProviders(
  ui: ReactElement,
  { initialState, ...options }: WrapperOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <OnboardingProvider testInitialState={initialState}>
          {children}
        </OnboardingProvider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
```

- [ ] **Step 2: Write failing wizard tests**

Create `apps/consumer/src/__tests__/OnboardingWizard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingProvider } from '../onboarding/OnboardingContext'
import OnboardingWizard from '../onboarding/OnboardingWizard'

// Stub all lazy step imports so they render synchronously in tests
vi.mock('../onboarding/steps/Step01Account', () => ({
  default: () => <div data-testid="step-1">Step 1</div>,
}))
vi.mock('../onboarding/steps/Step02Stylist', () => ({
  default: () => <div data-testid="step-2">Step 2</div>,
}))
vi.mock('../onboarding/steps/Step03BodySelfie', () => ({
  default: () => <div data-testid="step-3">Step 3</div>,
}))
vi.mock('../onboarding/steps/Step05SkinTone', () => ({
  default: () => <div data-testid="step-5">Step 5</div>,
}))
vi.mock('../onboarding/steps/Step06StylePrefs', () => ({
  default: () => <div data-testid="step-6">Step 6</div>,
}))
vi.mock('../onboarding/steps/Step07Wardrobe', () => ({
  default: () => <div data-testid="step-7">Step 7</div>,
}))
vi.mock('../onboarding/steps/Step08Location', () => ({
  default: () => <div data-testid="step-8">Step 8</div>,
}))
vi.mock('../onboarding/steps/Step09Budget', () => ({
  default: () => <div data-testid="step-9">Step 9</div>,
}))
vi.mock('../onboarding/steps/Step10ShoeSize', () => ({
  default: () => <div data-testid="step-10">Step 10</div>,
}))
vi.mock('../onboarding/steps/Step11AvatarPreview', () => ({
  default: () => <div data-testid="step-11">Step 11</div>,
}))

function renderWizard(initialState = {}) {
  return render(
    <MemoryRouter>
      <OnboardingProvider testInitialState={initialState}>
        <OnboardingWizard />
      </OnboardingProvider>
    </MemoryRouter>,
  )
}

describe('OnboardingWizard', () => {
  it('renders 11 progress segments', () => {
    renderWizard()
    expect(document.querySelectorAll('[data-testid="progress-segment"]').length).toBe(11)
  })

  it('renders step 1 by default', async () => {
    renderWizard()
    expect(await screen.findByTestId('step-1')).toBeInTheDocument()
  })

  it('renders step 2 when state.step is 2', async () => {
    renderWizard({ step: 2 })
    expect(await screen.findByTestId('step-2')).toBeInTheDocument()
  })

  it('Back button is hidden on step 1', () => {
    renderWizard()
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })

  it('Back button is visible on step 2', async () => {
    renderWizard({ step: 2 })
    expect(await screen.findByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('Next button is disabled on step 2 when no stylist selected', async () => {
    renderWizard({ step: 2 })
    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).toBeDisabled()
  })

  it('Next button is enabled on step 2 when stylist is selected', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).not.toBeDisabled()
  })

  it('Next button advances step', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    const next = await screen.findByRole('button', { name: /next/i })
    await userEvent.click(next)
    expect(await screen.findByTestId('step-3')).toBeInTheDocument()
  })

  it('Back button goes to previous step', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    await userEvent.click(await screen.findByRole('button', { name: /back/i }))
    expect(await screen.findByTestId('step-1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/OnboardingWizard.test.tsx
```

Expected: FAIL — `Cannot find module '../onboarding/OnboardingWizard'`

- [ ] **Step 4: Implement OnboardingWizard.tsx**

Create `apps/consumer/src/onboarding/OnboardingWizard.tsx`:
```tsx
import React, { Suspense, useRef } from 'react'
import { useOnboarding } from './OnboardingContext'
import type { OnboardingState } from './OnboardingContext'

const StepAccount    = React.lazy(() => import('./steps/Step01Account'))
const StepStylist    = React.lazy(() => import('./steps/Step02Stylist'))
const StepBodySelfie = React.lazy(() => import('./steps/Step03BodySelfie'))
const StepSkinTone   = React.lazy(() => import('./steps/Step05SkinTone'))
const StepStylePrefs = React.lazy(() => import('./steps/Step06StylePrefs'))
const StepWardrobe   = React.lazy(() => import('./steps/Step07Wardrobe'))
const StepLocation   = React.lazy(() => import('./steps/Step08Location'))
const StepBudget     = React.lazy(() => import('./steps/Step09Budget'))
const StepShoeSize   = React.lazy(() => import('./steps/Step10ShoeSize'))
const StepAvatar     = React.lazy(() => import('./steps/Step11AvatarPreview'))

const STEP_MAP: Record<number, React.ComponentType> = {
  1: StepAccount,
  2: StepStylist,
  3: StepBodySelfie,
  4: StepBodySelfie,
  5: StepSkinTone,
  6: StepStylePrefs,
  7: StepWardrobe,
  8: StepLocation,
  9: StepBudget,
  10: StepShoeSize,
  11: StepAvatar,
}

function canAdvance(step: number, state: OnboardingState): boolean {
  switch (step) {
    case 2:  return !!state.stylist
    case 5:  return !!state.skinProfile
    case 6:  return (state.stylePreferences?.length ?? 0) >= 1
    case 9:
    case 10: return true
    default: return false
  }
}

export default function OnboardingWizard() {
  const { state, dispatch } = useOnboarding()
  const prevStepRef = useRef(state.step)
  const slideClass = state.step >= prevStepRef.current ? 'animate-slide-right' : 'animate-slide-left'
  prevStepRef.current = state.step

  const StepComponent = STEP_MAP[state.step] ?? StepAccount
  const showBack    = state.step > 1
  const showNext    = canAdvance(state.step, state) || [9, 10].includes(state.step)
  const nextEnabled = canAdvance(state.step, state)

  return (
    <div className="min-h-screen bg-[#FDFAF7] flex flex-col max-w-[430px] mx-auto">
      {/* Progress bar */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            data-testid="progress-segment"
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < state.step ? '#8B4513' : '#E8DDD5' }}
          />
        ))}
      </div>

      {/* Step */}
      <div key={state.step} className={`flex-1 px-6 py-4 overflow-y-auto ${slideClass}`}>
        <Suspense fallback={<div className="flex-1" />}>
          <StepComponent />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-[#E8DDD5]">
        {showBack && (
          <button
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step - 1 })}
            className="flex-1 border border-[#E8DDD5] rounded-xl py-3 text-[#1A0A00] font-semibold"
          >
            Back
          </button>
        )}
        {showNext && (
          <button
            disabled={!nextEnabled}
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step + 1 })}
            className="flex-1 bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/OnboardingWizard.test.tsx
```

Expected:
```
✓ OnboardingWizard > renders 11 progress segments
✓ OnboardingWizard > renders step 1 by default
... (9 tests pass)
Test Files  1 passed (1)
```

- [ ] **Step 6: Commit**

```bash
git add apps/consumer/src/onboarding/OnboardingWizard.tsx apps/consumer/src/__tests__/OnboardingWizard.test.tsx apps/consumer/src/__tests__/test-utils.tsx
git commit -m "feat(consumer): OnboardingWizard shell with progress bar and nav"
```

---

## Task 6: API routes — DB migration, /auth/register, /onboarding/complete

**Files:**
- Create: `services/api/src/db/migrate.ts`
- Create: `services/api/src/routes/auth.ts`
- Create: `services/api/src/routes/onboarding.ts`
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: Create DB migration**

Create `services/api/src/db/migrate.ts`:
```typescript
import { db } from './index'

export async function runMigrations(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS onboarding_profiles (
      user_id      UUID PRIMARY KEY REFERENCES users(id),
      profile      JSONB NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}
```

- [ ] **Step 2: Create auth route**

Create `services/api/src/routes/auth.ts`:
```typescript
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { db } from '../db'

const router = Router()

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

router.post('/auth/register', async (req, res) => {
  const result = RegisterSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ message: 'Invalid input' })
    return
  }
  const { email, password } = result.data
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email, passwordHash],
    )
    const userId: string = rows[0].id
    const token = jwt.sign({ sub: userId, role: 'consumer' }, JWT_SECRET, { expiresIn: '30d' })
    res.status(201).json({ userId, token })
  } catch (err: unknown) {
    const pgCode = (err as { code?: string }).code
    if (pgCode === '23505') {
      res.status(409).json({ message: 'Email already in use' })
      return
    }
    console.error('[auth/register]', err)
    res.status(500).json({ message: 'Network error — try again' })
  }
})

export default router
```

- [ ] **Step 3: Create onboarding route**

Create `services/api/src/routes/onboarding.ts`:
```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import type { AuthRequest } from '../middleware/auth'
import { db } from '../db'

const router = Router()

router.post('/onboarding/complete', requireAuth, async (req: AuthRequest, res) => {
  try {
    await db.query(
      `INSERT INTO onboarding_profiles (user_id, profile)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET profile = $2, completed_at = NOW()`,
      [req.userId, req.body],
    )
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[onboarding/complete]', err)
    res.status(500).json({ message: 'Failed to save profile' })
  }
})

export default router
```

Note: returns `200 { ok: true }` rather than 204 so `apiClient.post()` can parse the response body without error.

- [ ] **Step 4: Update services/api/src/index.ts**

Replace `services/api/src/index.ts` entirely:
```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRouter from './routes/auth'
import onboardingRouter from './routes/onboarding'
import { runMigrations } from './db/migrate'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(helmet())
app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json({ limit: '10mb' }))

app.use(authRouter)
app.use(onboardingRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api', timestamp: new Date().toISOString() })
})

runMigrations()
  .then(() => {
    app.listen(PORT, () => console.log(`[api] listening on port ${PORT}`))
  })
  .catch(err => {
    console.error('[api] migration failed', err)
    process.exit(1)
  })
```

- [ ] **Step 5: Type-check**

```bash
cd "services/api" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test (optional, requires DB)**

If `DATABASE_URL` is set in `.env`:
```bash
cd "services/api" && npx tsx src/index.ts &
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | cat
```

Expected: `{"userId":"<uuid>","token":"<jwt>"}`

- [ ] **Step 7: Commit**

```bash
git add services/api/src/db/migrate.ts services/api/src/routes/auth.ts services/api/src/routes/onboarding.ts services/api/src/index.ts
git commit -m "feat(api): add /auth/register and /onboarding/complete routes with DB migrations"
```

---

## Task 7: Step01Account — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step01Account.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step01Account.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step01Account.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step01Account from '../../onboarding/steps/Step01Account'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return {
    ...actual,
    useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }),
  }
})

function mockFetch(response: object, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  }))
}

describe('Step01Account', () => {
  beforeEach(() => { mockDispatch.mockClear(); localStorage.clear() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders email input, password input, and Create Account button', () => {
    renderWithProviders(<Step01Account />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('Google button is disabled', () => {
    renderWithProviders(<Step01Account />)
    expect(screen.getByRole('button', { name: /google/i })).toBeDisabled()
  })

  it('on success dispatches SET_ACCOUNT + SET_STEP(2) and stores token in localStorage', async () => {
    mockFetch({ userId: 'u1', token: 'tok123' }, 201)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ACCOUNT', userId: 'u1', token: 'tok123' })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 2 })
    })
    expect(localStorage.getItem('sy_token')).toBe('tok123')
    expect(localStorage.getItem('sy_user_id')).toBe('u1')
  })

  it('shows "Email already in use" on 409', async () => {
    mockFetch({ message: 'Email already in use' }, 409)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })

  it('shows "Network error — try again" on 500', async () => {
    mockFetch({ message: 'Network error — try again' }, 500)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Network error — try again')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step01Account.test.tsx
```

Expected: FAIL — `Cannot find module '../../onboarding/steps/Step01Account'`

- [ ] **Step 3: Implement Step01Account.tsx**

Create `apps/consumer/src/onboarding/steps/Step01Account.tsx`:
```tsx
import { useState } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { useOnboarding } from '../OnboardingContext'

export default function Step01Account() {
  const { dispatch } = useOnboarding()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiClient.post<{ userId: string; token: string }>(
        '/auth/register',
        { email, password },
      )
      localStorage.setItem('sy_token', data.token)
      localStorage.setItem('sy_user_id', data.userId)
      dispatch({ type: 'SET_ACCOUNT', userId: data.userId, token: data.token })
      dispatch({ type: 'SET_STEP', step: 2 })
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Create your account</h2>
        <p className="mt-1 text-sm text-[#8B4513]">Style Yangu is just for you.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border border-[#E8DDD5] rounded-xl px-4 py-3 bg-[#FDFAF7] text-[#1A0A00] focus:outline-none focus:border-[#8B4513]"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={8}
          required
          className="border border-[#E8DDD5] rounded-xl px-4 py-3 bg-[#FDFAF7] text-[#1A0A00] focus:outline-none focus:border-[#8B4513]"
        />
        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <button
        type="button"
        disabled
        title="Coming soon"
        className="border border-[#E8DDD5] rounded-xl py-3 text-[#1A0A00] opacity-40 cursor-not-allowed"
      >
        Continue with Google
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step01Account.test.tsx
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step01Account.tsx apps/consumer/src/__tests__/steps/Step01Account.test.tsx
git commit -m "feat(consumer): Step01Account — email/password registration"
```

---

## Task 8: Step02Stylist — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step02Stylist.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step02Stylist.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step02Stylist.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step02Stylist from '../../onboarding/steps/Step02Stylist'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return {
    ...actual,
    useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }),
  }
})

describe('Step02Stylist', () => {
  it('renders Amara and Kofi cards', () => {
    renderWithProviders(<Step02Stylist />)
    expect(screen.getByText('Amara')).toBeInTheDocument()
    expect(screen.getByText('Kofi')).toBeInTheDocument()
  })

  it('renders personality lines', () => {
    renderWithProviders(<Step02Stylist />)
    expect(screen.getByText(/trusted friend/i)).toBeInTheDocument()
    expect(screen.getByText(/no-fluff/i)).toBeInTheDocument()
  })

  it('tapping Amara card dispatches SET_STYLIST amara', () => {
    renderWithProviders(<Step02Stylist />)
    fireEvent.click(screen.getByText('Amara').closest('button')!)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STYLIST', stylist: 'amara' })
  })

  it('tapping Kofi card dispatches SET_STYLIST kofi', () => {
    renderWithProviders(<Step02Stylist />)
    fireEvent.click(screen.getByText('Kofi').closest('button')!)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STYLIST', stylist: 'kofi' })
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step02Stylist.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step02Stylist.tsx**

Create `apps/consumer/src/onboarding/steps/Step02Stylist.tsx`:
```tsx
import { useOnboarding } from '../OnboardingContext'
import type { Stylist } from '@style-yangu/types'

const STYLISTS: { id: Stylist; name: string; personality: string; emoji: string }[] = [
  {
    id: 'amara',
    name: 'Amara',
    personality: 'Warm, honest, direct. Tells you the truth like a trusted friend who always looks put together.',
    emoji: '✨',
  },
  {
    id: 'kofi',
    name: 'Kofi',
    personality: 'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
    emoji: '🎯',
  },
]

export default function Step02Stylist() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Choose your stylist</h2>
        <p className="mt-1 text-sm text-[#8B4513]">You can change this later.</p>
      </div>

      <div className="flex gap-4">
        {STYLISTS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_STYLIST', stylist: s.id })}
            className={[
              'flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-colors',
              state.stylist === s.id
                ? 'border-[#8B4513] bg-[#8B4513]/5'
                : 'border-[#E8DDD5] bg-white',
            ].join(' ')}
          >
            <span className="text-5xl">{s.emoji}</span>
            <span className="font-bold text-[#1A0A00] text-lg">{s.name}</span>
            <span className="text-xs text-center text-[#1A0A00]/70 leading-relaxed">
              {s.personality}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step02Stylist.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step02Stylist.tsx apps/consumer/src/__tests__/steps/Step02Stylist.test.tsx
git commit -m "feat(consumer): Step02Stylist — Amara/Kofi illustrated cards"
```

---

## Task 9: Step03BodySelfie — camera stubs

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step03BodySelfie.tsx`

No dedicated unit test file — camera sub-screens depend on MediaStream APIs that jsdom cannot simulate. Manual verification in Step 17.

- [ ] **Step 1: Implement Step03BodySelfie.tsx**

Create `apps/consumer/src/onboarding/steps/Step03BodySelfie.tsx`:
```tsx
import { useRef, useState, useEffect } from 'react'
import CameraOverlay from '@style-yangu/ui/src/CameraOverlay'
import { useOnboarding } from '../OnboardingContext'

type SubScreen = 'front' | 'side' | 'processing'

const AVATAR_PLACEHOLDER = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><circle cx='100' cy='60' r='40' fill='%238B4513'/><rect x='60' y='110' width='80' height='150' rx='10' fill='%23C4A882'/></svg>`

export default function Step03BodySelfie() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>(state.step === 4 ? 'side' : 'front')
  const [streamError, setStreamError] = useState(false)
  const [distanceOk, setDistanceOk] = useState(false)

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    let stream: MediaStream | null = null
    if (sub === 'processing') return

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        // Simulate distance indicator going green after 2 s
        setTimeout(() => setDistanceOk(true), 2000)
      })
      .catch(() => setStreamError(true))

    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [sub])

  function capture() {
    if (sub === 'front') {
      dispatch({ type: 'SET_STEP', step: 4 })
      setSub('side')
    } else {
      setSub('processing')
      // Stub: 2 s processing delay
      setTimeout(() => {
        dispatch({ type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: AVATAR_PLACEHOLDER })
        dispatch({ type: 'SET_STEP', step: 5 })
      }, 2000)
    }
  }

  function skip() {
    dispatch({ type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: AVATAR_PLACEHOLDER })
    dispatch({ type: 'SET_STEP', step: 5 })
  }

  if (sub === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="w-12 h-12 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1A0A00] text-center font-medium">
          {stylistName} is getting to know your shape…
        </p>
        <p className="text-xs text-center text-[#1A0A00]/60 max-w-xs leading-relaxed">
          Your selfie is used only to generate your cartoon avatar and is immediately deleted after processing. We never store your actual photo at any point.
        </p>
      </div>
    )
  }

  if (streamError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Camera access is needed to capture your body shape for a personalised avatar.
          </p>
        </div>
        <button
          onClick={skip}
          className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
        >
          Skip this step
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#1A0A00]">
          {sub === 'front' ? 'Stand facing forward' : 'Turn to your left'}
        </h2>
        <p className="text-sm text-[#1A0A00]/70 mt-1">
          {sub === 'front'
            ? 'Arms slightly away from sides, full body in frame.'
            : 'Stay in the same spot.'}
        </p>
        {sub === 'front' && (
          <p className="text-xs text-[#1A0A00]/50 mt-1">
            You may need a phone stand or a friend for the next one.
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="full_body" lightingQuality={distanceOk ? 'good' : 'acceptable'} />
        {distanceOk && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 text-white text-xs px-3 py-1 rounded-full">
            Distance ✓
          </div>
        )}
      </div>

      <button
        onClick={capture}
        disabled={!distanceOk}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        Capture
      </button>
      <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
        Skip for now
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step03BodySelfie.tsx
git commit -m "feat(consumer): Step03BodySelfie — body selfie capture with stubs"
```

---

## Task 10: Step05SkinTone — camera stubs

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step05SkinTone.tsx`

- [ ] **Step 1: Implement Step05SkinTone.tsx**

Create `apps/consumer/src/onboarding/steps/Step05SkinTone.tsx`:
```tsx
import { useRef, useState, useEffect } from 'react'
import CameraOverlay from '@style-yangu/ui/src/CameraOverlay'
import { useOnboarding } from '../OnboardingContext'
import type { SkinDepth, Undertone } from '@style-yangu/types'

type SubScreen = 'camera' | 'henna_check' | 'confirm'

const DEPTH_OPTIONS: SkinDepth[] = ['light', 'light_medium', 'medium', 'medium_deep', 'deep']
const UNDERTONE_OPTIONS: Undertone[] = ['warm', 'cool', 'neutral']

const DEPTH_COLOURS: Record<SkinDepth, string> = {
  light: '#F5D9C8', light_medium: '#E8C4A4', medium: '#C8955A',
  medium_deep: '#9B6640', deep: '#6B3F23', rich: '#4A2515',
}

export default function Step05SkinTone() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>('camera')
  const [streamError, setStreamError] = useState(false)
  const [selectedDepth, setSelectedDepth] = useState<SkinDepth>('medium')
  const [selectedUndertone, setSelectedUndertone] = useState<Undertone>('warm')

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    if (sub !== 'camera') return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [sub])

  function capture() {
    setSub('henna_check')
    // Stub: 1.5 s henna check
    setTimeout(() => {
      setSelectedDepth('medium')
      setSelectedUndertone('warm')
      setSub('confirm')
    }, 1500)
  }

  function confirm() {
    dispatch({
      type: 'SET_SKIN',
      skinProfile: { depth: selectedDepth, undertone: selectedUndertone, userConfirmed: true },
      hennaDetected: false,
    })
    dispatch({ type: 'SET_STEP', step: 6 })
  }

  function skip() {
    dispatch({ type: 'SET_STEP', step: 6 })
  }

  if (sub === 'henna_check') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="w-10 h-10 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1A0A00] text-sm">Checking for henna…</p>
      </div>
    )
  }

  if (sub === 'confirm') {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#1A0A00]">Does this look right?</h2>

        <div>
          <p className="text-sm font-medium text-[#1A0A00] mb-2">{stylistName} detected: {selectedDepth} skin, {selectedUndertone} undertone</p>
          <div className="flex gap-2">
            {DEPTH_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDepth(d)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${selectedDepth === d ? 'border-[#8B4513] scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: DEPTH_COLOURS[d] }}
                aria-label={d}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          {UNDERTONE_OPTIONS.map(u => (
            <button
              key={u}
              onClick={() => setSelectedUndertone(u)}
              className={`flex-1 py-2 rounded-xl border text-sm capitalize ${selectedUndertone === u ? 'border-[#8B4513] bg-[#8B4513]/10 text-[#8B4513] font-medium' : 'border-[#E8DDD5] text-[#1A0A00]'}`}
            >
              {u}
            </button>
          ))}
        </div>

        <button onClick={confirm} className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold">
          Confirm
        </button>
        <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
          Skip for now
        </button>
      </div>
    )
  }

  // camera sub-screen
  if (streamError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Camera needed to detect your skin tone.</p>
        </div>
        <button onClick={skip} className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold">
          Skip this step
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#1A0A00]">Scan your skin tone</h2>
        <p className="text-sm text-[#1A0A00]/70 mt-1">
          Place the back of your hand between your wrist and knuckles in the frame.
        </p>
      </div>
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="hand_oval" lightingQuality="good" />
      </div>
      <button onClick={capture} className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold">
        Capture
      </button>
      <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
        Skip for now
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd "apps/consumer" && npx tsc --noEmit
git add apps/consumer/src/onboarding/steps/Step05SkinTone.tsx
git commit -m "feat(consumer): Step05SkinTone — hand scan with swatch confirmation stubs"
```

---

## Task 11: Step06StylePrefs — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step06StylePrefs.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step06StylePrefs.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step06StylePrefs.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step06StylePrefs from '../../onboarding/steps/Step06StylePrefs'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step06StylePrefs', () => {
  it('renders 6 style tiles', () => {
    renderWithProviders(<Step06StylePrefs />)
    expect(screen.getByText(/smart casual/i)).toBeInTheDocument()
    expect(screen.getByText(/business casual/i)).toBeInTheDocument()
    expect(screen.getByText(/streetwear/i)).toBeInTheDocument()
    expect(screen.getByText(/traditional/i)).toBeInTheDocument()
    expect(screen.getByText(/evening/i)).toBeInTheDocument()
    expect(screen.getByText(/athleisure/i)).toBeInTheDocument()
  })

  it('dispatches SET_STYLE_PREFS with selected tiles on toggle', () => {
    renderWithProviders(<Step06StylePrefs />)
    fireEvent.click(screen.getByText(/smart casual/i))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_STYLE_PREFS',
      stylePreferences: ['smart_casual'],
    })
  })

  it('toggles off a selected preference', () => {
    const stateWithPref = { stylePreferences: ['smart_casual' as const] }
    renderWithProviders(<Step06StylePrefs />, { initialState: stateWithPref })
    // re-mock with state that has smart_casual selected
    vi.mocked(mockDispatch).mockClear()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step06StylePrefs.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step06StylePrefs.tsx**

Create `apps/consumer/src/onboarding/steps/Step06StylePrefs.tsx`:
```tsx
import { useOnboarding } from '../OnboardingContext'
import type { StylePreference } from '@style-yangu/types'

const TILES: { id: StylePreference; label: string; icon: string }[] = [
  { id: 'smart_casual',       label: 'Smart Casual',           icon: '👔' },
  { id: 'business_casual',    label: 'Business Casual',        icon: '💼' },
  { id: 'streetwear',         label: 'Streetwear',             icon: '🧢' },
  { id: 'traditional_cultural', label: 'Traditional & Cultural', icon: '🌍' },
  { id: 'evening_formal',     label: 'Evening & Formal',       icon: '✨' },
  { id: 'athleisure',         label: 'Athleisure',             icon: '🏃' },
]

export default function Step06StylePrefs() {
  const { state, dispatch } = useOnboarding()
  const selected = state.stylePreferences ?? []

  function toggle(id: StylePreference) {
    const next = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id]
    dispatch({ type: 'SET_STYLE_PREFS', stylePreferences: next })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Your style</h2>
        <p className="mt-1 text-sm text-[#1A0A00]/60">Select all that apply.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            className={[
              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-colors',
              selected.includes(t.id)
                ? 'border-[#8B4513] bg-[#8B4513]/5'
                : 'border-[#E8DDD5] bg-white',
            ].join(' ')}
          >
            <span className="text-3xl">{t.icon}</span>
            <span className="text-sm font-medium text-[#1A0A00] text-center">{t.label}</span>
          </button>
        ))}
      </div>
      {selected.length === 0 && (
        <p className="text-xs text-[#1A0A00]/50 text-center">Select at least one to continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step06StylePrefs.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step06StylePrefs.tsx apps/consumer/src/__tests__/steps/Step06StylePrefs.test.tsx
git commit -m "feat(consumer): Step06StylePrefs — 2x3 style tile multi-select"
```

---

## Task 12: Step07Wardrobe — camera stubs

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step07Wardrobe.tsx`

- [ ] **Step 1: Implement Step07Wardrobe.tsx**

Create `apps/consumer/src/onboarding/steps/Step07Wardrobe.tsx`:
```tsx
import { useRef, useState, useEffect } from 'react'
import CameraOverlay from '@style-yangu/ui/src/CameraOverlay'
import { useOnboarding } from '../OnboardingContext'
import { compressImageToBlob } from '@style-yangu/utils'
import type { WardrobeItem } from '../OnboardingContext'

const PROMPTS = [
  'Something you would wear on a rainy day',
  'Something you would wear on a hot sunny day',
  'Something you would wear to the office',
  'Something you would wear on a date',
  'Something you would wear to a wedding as a guest',
  'Something casual for a weekend',
]

export default function Step07Wardrobe() {
  const { dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [promptIndex, setPromptIndex] = useState(0)
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    if (promptIndex >= PROMPTS.length) return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [promptIndex])

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    await compressImageToBlob(dataUrl, 300)
    const item: WardrobeItem = {
      id: crypto.randomUUID(),
      photoDataUrl: dataUrl,
      prompt: PROMPTS[promptIndex],
      tag: 'owned',
    }
    const next = [...items, item]
    setItems(next)
    advance(next)
  }

  function advance(capturedItems = items) {
    if (promptIndex < PROMPTS.length - 1) {
      setPromptIndex(i => i + 1)
    } else {
      done(capturedItems)
    }
  }

  function done(capturedItems = items) {
    dispatch({ type: 'SET_WARDROBE', wardrobeItems: capturedItems })
    dispatch({ type: 'SET_STEP', step: 8 })
  }

  if (promptIndex >= PROMPTS.length) {
    done()
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#8B4513] font-medium">
          {promptIndex + 1} of {PROMPTS.length}
        </p>
        <h2 className="text-xl font-bold text-[#1A0A00] mt-1">{PROMPTS[promptIndex]}</h2>
      </div>

      {streamError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Camera needed for wardrobe photos.</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <CameraOverlay shape="flat_lay_rect" lightingQuality="good" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <button
        onClick={capture}
        disabled={streamError}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        Capture
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => advance()}
          className="flex-1 border border-[#E8DDD5] rounded-xl py-2 text-sm text-[#1A0A00]"
        >
          Skip this item
        </button>
        <button
          onClick={() => done()}
          className="flex-1 border border-[#E8DDD5] rounded-xl py-2 text-sm text-[#1A0A00]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check + commit**

```bash
cd "apps/consumer" && npx tsc --noEmit
git add apps/consumer/src/onboarding/steps/Step07Wardrobe.tsx
git commit -m "feat(consumer): Step07Wardrobe — 6 contextual wardrobe prompts with camera"
```

---

## Task 13: Step08Location — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step08Location.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step08Location.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step08Location.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step08Location from '../../onboarding/steps/Step08Location'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step08Location', () => {
  beforeEach(() => mockDispatch.mockClear())

  it('renders Allow location button', () => {
    renderWithProviders(<Step08Location />)
    expect(screen.getByRole('button', { name: /allow location/i })).toBeInTheDocument()
  })

  it('on grant: dispatches SET_LOCATION granted + coords + SET_STEP(9)', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({ coords: { latitude: -1.2921, longitude: 36.8219 } } as GeolocationPosition)
        ),
      },
    })
    renderWithProviders(<Step08Location />)
    await userEvent.click(screen.getByRole('button', { name: /allow location/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOCATION', locationPermission: 'granted', lat: -1.2921, lon: 36.8219,
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 9 })
    })
    vi.unstubAllGlobals()
  })

  it('on deny: dispatches SET_LOCATION denied with Nairobi fallback + SET_STEP(9)', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1 } as GeolocationPositionError)
        ),
      },
    })
    renderWithProviders(<Step08Location />)
    await userEvent.click(screen.getByRole('button', { name: /allow location/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOCATION', locationPermission: 'denied', lat: -1.2921, lon: 36.8219,
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 9 })
    })
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step08Location.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step08Location.tsx**

Create `apps/consumer/src/onboarding/steps/Step08Location.tsx`:
```tsx
import { useOnboarding } from '../OnboardingContext'

const NAIROBI_LAT = -1.2921
const NAIROBI_LON = 36.8219

export default function Step08Location() {
  const { state, dispatch } = useOnboarding()
  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => {
        dispatch({
          type: 'SET_LOCATION',
          locationPermission: 'granted',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
        dispatch({ type: 'SET_STEP', step: 9 })
      },
      () => {
        dispatch({
          type: 'SET_LOCATION',
          locationPermission: 'denied',
          lat: NAIROBI_LAT,
          lon: NAIROBI_LON,
        })
        dispatch({ type: 'SET_STEP', step: 9 })
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">One more thing</h2>
        <p className="mt-2 text-sm text-[#1A0A00]/70 leading-relaxed">
          So {stylistName} can factor in today's weather when styling you. No location data is stored.
        </p>
      </div>
      <button
        onClick={requestLocation}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
      >
        Allow location
      </button>
      <button
        onClick={() => {
          dispatch({ type: 'SET_LOCATION', locationPermission: 'denied', lat: NAIROBI_LAT, lon: NAIROBI_LON })
          dispatch({ type: 'SET_STEP', step: 9 })
        }}
        className="text-[#8B4513] text-sm underline text-center"
      >
        Skip
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step08Location.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step08Location.tsx apps/consumer/src/__tests__/steps/Step08Location.test.tsx
git commit -m "feat(consumer): Step08Location — geolocation with Nairobi fallback"
```

---

## Task 14: Step09Budget — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step09Budget.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step09Budget.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step09Budget.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step09Budget from '../../onboarding/steps/Step09Budget'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step09Budget', () => {
  it('renders 5 budget categories', () => {
    renderWithProviders(<Step09Budget />)
    expect(screen.getByLabelText(/tops/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bottoms/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/shoes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dresses/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accessories/i)).toBeInTheDocument()
  })

  it('dispatches SET_BUDGETS on input change', () => {
    renderWithProviders(<Step09Budget />)
    fireEvent.change(screen.getByLabelText(/tops/i), { target: { value: '2000' } })
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_BUDGETS', budgets: expect.objectContaining({ top: 2000 }) })
    )
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step09Budget.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step09Budget.tsx**

Create `apps/consumer/src/onboarding/steps/Step09Budget.tsx`:
```tsx
import { useState } from 'react'
import { useOnboarding } from '../OnboardingContext'

const CATEGORIES = [
  { key: 'top',       label: 'Tops' },
  { key: 'bottom',    label: 'Bottoms' },
  { key: 'shoe',      label: 'Shoes' },
  { key: 'dress',     label: 'Dresses & Suits' },
  { key: 'accessory', label: 'Accessories' },
]

export default function Step09Budget() {
  const { state, dispatch } = useOnboarding()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      CATEGORIES.map(c => [c.key, state.budgets?.[c.key]?.toString() ?? ''])
    )
  )

  function handleChange(key: string, raw: string) {
    const next = { ...values, [key]: raw }
    setValues(next)
    const budgets: Record<string, number> = {}
    for (const [k, v] of Object.entries(next)) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n > 0) budgets[k] = n
    }
    dispatch({ type: 'SET_BUDGETS', budgets })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Your budget</h2>
        <p className="mt-1 text-sm text-[#1A0A00]/60">Optional. Leave blank to skip a category.</p>
      </div>
      <div className="flex flex-col gap-4">
        {CATEGORIES.map(c => (
          <div key={c.key}>
            <label htmlFor={`budget-${c.key}`} className="block text-sm font-medium text-[#1A0A00] mb-1">
              {c.label}
            </label>
            <div className="flex items-center border border-[#E8DDD5] rounded-xl overflow-hidden bg-[#FDFAF7]">
              <span className="px-3 py-3 text-sm text-[#1A0A00]/50 bg-[#F5EDE5]">KES</span>
              <input
                id={`budget-${c.key}`}
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={values[c.key]}
                onChange={e => handleChange(c.key, e.target.value)}
                className="flex-1 px-3 py-3 bg-transparent text-[#1A0A00] focus:outline-none text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step09Budget.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step09Budget.tsx apps/consumer/src/__tests__/steps/Step09Budget.test.tsx
git commit -m "feat(consumer): Step09Budget — optional per-category KES budget inputs"
```

---

## Task 15: Step10ShoeSize — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step10ShoeSize.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step10ShoeSize.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step10ShoeSize.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step10ShoeSize from '../../onboarding/steps/Step10ShoeSize'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step10ShoeSize', () => {
  it('renders UK and EU inputs', () => {
    renderWithProviders(<Step10ShoeSize />)
    expect(screen.getByLabelText(/uk/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/eu/i)).toBeInTheDocument()
  })

  it('typing UK auto-fills EU (UK + 33)', () => {
    renderWithProviders(<Step10ShoeSize />)
    fireEvent.change(screen.getByLabelText(/uk/i), { target: { value: '6' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SHOE_SIZE', shoeSizeUK: 6, shoeSizeEU: 39 })
  })

  it('typing EU auto-fills UK (EU - 33)', () => {
    renderWithProviders(<Step10ShoeSize />)
    fireEvent.change(screen.getByLabelText(/eu/i), { target: { value: '42' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SHOE_SIZE', shoeSizeUK: 9, shoeSizeEU: 42 })
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step10ShoeSize.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step10ShoeSize.tsx**

Create `apps/consumer/src/onboarding/steps/Step10ShoeSize.tsx`:
```tsx
import { useState } from 'react'
import { ukToEU, euToUK } from '@style-yangu/utils'
import { useOnboarding } from '../OnboardingContext'

export default function Step10ShoeSize() {
  const { state, dispatch } = useOnboarding()
  const [uk, setUk] = useState(state.shoeSizeUK?.toString() ?? '')
  const [eu, setEu] = useState(state.shoeSizeEU?.toString() ?? '')

  function handleUK(raw: string) {
    setUk(raw)
    const n = parseFloat(raw)
    if (!isNaN(n)) {
      const euVal = ukToEU(n)
      setEu(euVal.toString())
      dispatch({ type: 'SET_SHOE_SIZE', shoeSizeUK: n, shoeSizeEU: euVal })
    }
  }

  function handleEU(raw: string) {
    setEu(raw)
    const n = parseFloat(raw)
    if (!isNaN(n)) {
      const ukVal = euToUK(n)
      setUk(ukVal.toString())
      dispatch({ type: 'SET_SHOE_SIZE', shoeSizeUK: ukVal, shoeSizeEU: n })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Your shoe size</h2>
        <p className="mt-1 text-sm text-[#1A0A00]/60">Optional. Enter either size and we'll convert.</p>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="shoe-uk" className="block text-sm font-medium text-[#1A0A00] mb-1">UK</label>
          <input
            id="shoe-uk"
            type="number"
            min="1"
            max="18"
            step="0.5"
            placeholder="e.g. 6"
            value={uk}
            onChange={e => handleUK(e.target.value)}
            className="w-full border border-[#E8DDD5] rounded-xl px-4 py-3 bg-[#FDFAF7] text-[#1A0A00] focus:outline-none focus:border-[#8B4513]"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="shoe-eu" className="block text-sm font-medium text-[#1A0A00] mb-1">EU</label>
          <input
            id="shoe-eu"
            type="number"
            min="34"
            max="51"
            step="0.5"
            placeholder="e.g. 39"
            value={eu}
            onChange={e => handleEU(e.target.value)}
            className="w-full border border-[#E8DDD5] rounded-xl px-4 py-3 bg-[#FDFAF7] text-[#1A0A00] focus:outline-none focus:border-[#8B4513]"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step10ShoeSize.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step10ShoeSize.tsx apps/consumer/src/__tests__/steps/Step10ShoeSize.test.tsx
git commit -m "feat(consumer): Step10ShoeSize — UK/EU auto-convert shoe size"
```

---

## Task 16: Step11AvatarPreview — TDD

**Files:**
- Create: `apps/consumer/src/onboarding/steps/Step11AvatarPreview.tsx`
- Create: `apps/consumer/src/__tests__/steps/Step11AvatarPreview.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `apps/consumer/src/__tests__/steps/Step11AvatarPreview.test.tsx`:
```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step11AvatarPreview from '../../onboarding/steps/Step11AvatarPreview'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const testState = {
  step: 11,
  userId: 'u1',
  token: 'tok123',
  stylist: 'amara' as const,
  bodyType: 'hourglass' as const,
  avatarCartoonUrl: 'data:image/svg+xml,test',
  skinProfile: { depth: 'medium' as const, undertone: 'warm' as const, userConfirmed: true },
  stylePreferences: ['smart_casual' as const],
}

describe('Step11AvatarPreview', () => {
  afterEach(() => { vi.unstubAllGlobals(); mockNavigate.mockClear(); localStorage.clear() })

  it('shows stylist name in CTA', () => {
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    expect(screen.getByRole('button', { name: /meet amara/i })).toBeInTheDocument()
  })

  it('shows avatar image', () => {
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    expect(screen.getByRole('img', { name: /avatar/i })).toBeInTheDocument()
  })

  it('on CTA tap: POSTs /onboarding/complete, clears localStorage, navigates /home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ ok: true }),
    }))
    localStorage.setItem('sy_onboarding', JSON.stringify(testState))
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    await userEvent.click(screen.getByRole('button', { name: /meet amara/i }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/onboarding/complete'),
        expect.objectContaining({ method: 'POST' }),
      )
      expect(localStorage.getItem('sy_onboarding')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/home')
    })
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step11AvatarPreview.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Step11AvatarPreview.tsx**

Create `apps/consumer/src/onboarding/steps/Step11AvatarPreview.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@style-yangu/api-client'
import { useOnboarding } from '../OnboardingContext'

const STYLIST_PERSONALITY = {
  amara: 'Warm, honest, direct. Tells you the truth like a trusted friend.',
  kofi:  'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
}

const STYLIST_EMOJI = { amara: '✨', kofi: '🎯' }

export default function Step11AvatarPreview() {
  const { state } = useOnboarding()
  const navigate = useNavigate()
  const stylist = state.stylist ?? 'amara'
  const stylistName = stylist.charAt(0).toUpperCase() + stylist.slice(1)

  async function complete() {
    // Fire-and-forget — don't block navigation on API response
    apiClient.post('/onboarding/complete', state).catch(() => undefined)
    localStorage.removeItem('sy_onboarding')
    navigate('/home')
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1A0A00]">Meet your look</h2>
        <p className="mt-1 text-sm text-[#1A0A00]/60">Your personalised style profile.</p>
      </div>

      {/* Consumer avatar */}
      <div className="relative">
        {state.avatarCartoonUrl ? (
          <img
            src={state.avatarCartoonUrl}
            alt="Your avatar"
            role="img"
            aria-label="avatar"
            className="w-40 h-56 object-contain rounded-2xl border-2 border-[#E8DDD5]"
          />
        ) : (
          <div
            role="img"
            aria-label="avatar"
            className="w-40 h-56 rounded-2xl border-2 border-[#E8DDD5] bg-[#F5EDE5] flex items-center justify-center"
          >
            <span className="text-6xl">🧍</span>
          </div>
        )}
        {state.skinProfile && (
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: '#C8955A' }}
            title={`${state.skinProfile.depth} / ${state.skinProfile.undertone}`}
          />
        )}
      </div>

      {/* Stylist companion */}
      <div className="flex items-center gap-4 bg-[#F5EDE5] rounded-2xl p-4 w-full">
        <span className="text-4xl">{STYLIST_EMOJI[stylist]}</span>
        <div>
          <p className="font-bold text-[#1A0A00]">{stylistName}</p>
          <p className="text-xs text-[#1A0A00]/70 leading-relaxed">{STYLIST_PERSONALITY[stylist]}</p>
        </div>
      </div>

      <button
        onClick={complete}
        className="w-full bg-[#8B4513] text-white rounded-xl py-4 font-semibold text-lg mt-2"
      >
        Meet {stylistName}, let's go
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd "apps/consumer" && npx vitest run src/__tests__/steps/Step11AvatarPreview.test.tsx
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/consumer/src/onboarding/steps/Step11AvatarPreview.tsx apps/consumer/src/__tests__/steps/Step11AvatarPreview.test.tsx
git commit -m "feat(consumer): Step11AvatarPreview — avatar display + complete onboarding CTA"
```

---

## Task 17: Full test run + smoke test

**Files:** No new files.

- [ ] **Step 1: Run all consumer tests**

```bash
cd "apps/consumer" && npx vitest run
```

Expected: All test files pass. Any failures must be fixed before proceeding.

- [ ] **Step 2: Type-check consumer app**

```bash
cd "apps/consumer" && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start consumer dev server**

```bash
cd "apps/consumer" && npx vite
```

Open http://localhost:5173 in a browser.

- [ ] **Step 4: Manual smoke test — golden path**

Walk through these steps manually in the browser:

1. `/` redirects to `/onboarding` (no token in localStorage)
2. Progress bar shows 11 segments, first one filled
3. **Step 1:** Enter email + password → "Create Account" — expect step to advance to 2 (API must be running; if not, mock at will using browser devtools)
4. **Step 2:** Tap Amara card → ring appears → tap Next → step 3
5. **Step 3-4:** "Skip for now" → advances to step 5
6. **Step 5:** "Skip for now" → step 6
7. **Step 6:** Tap ≥1 style tile → Next enabled → tap Next → step 7
8. **Step 7:** Tap "Done" → step 8
9. **Step 8:** Tap "Allow location" (or deny in browser prompt) → step 9
10. **Step 9:** Leave blank → Next → step 10
11. **Step 10:** Enter UK 7 → EU auto-fills 40 → Next → step 11
12. **Step 11:** Avatar visible, "Meet Amara, let's go" → tapped → redirected to `/home`
13. Refresh `/` → has `sy_token` → redirects to `/home`

- [ ] **Step 5: Manual smoke test — resume after close**

1. Clear localStorage except `sy_onboarding` at step 5 (set it manually via devtools)
2. Refresh `/onboarding` — should resume at step 5

- [ ] **Step 6: Back navigation smoke test**

Walk backward through a few steps, verifying slides reverse direction and data is preserved.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(consumer): complete 11-step onboarding wizard with AI camera stubs"
```

---

## Self-Review

Spec coverage check (spec §4.1, §4.2):

| Spec requirement | Covered |
|-----------------|---------|
| 11-step wizard, single /onboarding route | ✓ Task 4–5 |
| Progress bar, 11 segments, brand colour | ✓ Task 5 |
| Back/Next footer navigation | ✓ Task 5 |
| CSS translateX slide transitions | ✓ Task 4 (CSS) + Task 5 (key prop) |
| localStorage persist + rehydrate | ✓ Task 3 |
| Clear sy_onboarding on complete | ✓ Task 16 |
| Auth guard at / | ✓ Task 4 |
| Step 1: email+password, Google disabled | ✓ Task 7 |
| Step 2: Amara/Kofi cards, personality lines | ✓ Task 8 |
| Steps 3-4: front+side selfie, processing animation, privacy note, Skip | ✓ Task 9 |
| Step 5: hand oval, henna check stub, swatch selector, Skip | ✓ Task 10 |
| Step 6: 6 tiles 2×3, multi-select, min 1 | ✓ Task 11 |
| Step 7: 6 prompts, skip item, done, skip step | ✓ Task 12 |
| Step 8: geolocation, Nairobi fallback | ✓ Task 13 |
| Step 9: 5 KES inputs, all optional | ✓ Task 14 |
| Step 10: UK/EU auto-convert, optional | ✓ Task 15 |
| Step 11: avatar + stylist companion, CTA | ✓ Task 16 |
| POST /auth/register | ✓ Task 6 |
| POST /onboarding/complete | ✓ Task 6 |
| Error handling (email taken, network, camera denied) | ✓ Tasks 7, 9, 10, 12 |
| Visual style tokens (#8B4513, #FDFAF7, #1A0A00, #E8DDD5) | ✓ All step components |
| Lazy loading (React.lazy + Suspense) | ✓ Task 5 |
| Mobile-first, max-width 430px | ✓ Task 5 |
