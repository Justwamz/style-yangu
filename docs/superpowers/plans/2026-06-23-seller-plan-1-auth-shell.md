# Seller App — Plan 1: Auth, AppShell, Vitest Setup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the seller app with Vitest, install auth screens (phone OTP + verify), onboarding wizard, AppShell with 5-tab bottom nav, and routing with a `ProtectedRoute` guard.

**Architecture:** The seller app is a standalone Vite PWA at port 5174. Auth state lives in localStorage under `sy_seller_token`. `SellerContext` provides the authenticated profile globally. `ProtectedRoute` reads the token and redirects unauthenticated users to `/auth`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vitest 2, @testing-library/react 16, jsdom, @tanstack/react-query 5, @style-yangu/api-client (extended with `createApiClient` factory).

## Global Constraints

- Port: `5174` — `vite.config.ts` must set `server: { port: 5174 }`
- Token key: `sy_seller_token` — never `sy_token`
- Tailwind active tab colour: `#8B4513` — inactive: `#1A0A00` at 40% opacity
- Earth-tone design language — match consumer app aesthetic
- All test files go in `apps/seller/src/__tests__/` (mirroring consumer pattern)
- TDD: write failing test → confirm fail → implement → confirm pass → commit

---

### Task 0: Add Vitest + testing deps + fix Vite port

**Files:**
- Modify: `apps/seller/package.json`
- Create: `apps/seller/vitest.config.ts`
- Create: `apps/seller/src/test/setup.ts`
- Create: `apps/seller/src/vite-env.d.ts`
- Modify: `apps/seller/vite.config.ts`

**Interfaces:**
- Produces: `vitest` test runner available via `pnpm test` in seller workspace; port 5174

- [ ] **Step 1: Add test devDependencies to seller package.json**

Open `apps/seller/package.json`. Replace the `"devDependencies"` block with:

```json
"devDependencies": {
  "@testing-library/jest-dom": "^6.4.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/user-event": "^14.5.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "@vitejs/plugin-react": "^4.3.0",
  "@vitest/coverage-v8": "^2.0.0",
  "autoprefixer": "^10.4.19",
  "jsdom": "^24.1.0",
  "postcss": "^8.4.38",
  "tailwindcss": "^3.4.4",
  "typescript": "^5.4.0",
  "vite": "^5.3.0",
  "vite-plugin-pwa": "^0.20.0",
  "vitest": "^2.0.0"
}
```

Also add `"test": "vitest run"` and `"test:watch": "vitest"` to the `"scripts"` block.

- [ ] **Step 2: Install new deps**

```bash
cd apps/seller && pnpm install
```

Expected: lock file updates, no errors.

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 4: Create src/test/setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create src/vite-env.d.ts**

```typescript
/// <reference types="vite/client" />
```

- [ ] **Step 6: Update vite.config.ts — add port + PWA**

Replace the entire file:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Style Yangu Seller',
        short_name: 'SY Seller',
        description: 'AI showcase. POS. Storefront.',
        theme_color: '#8B4513',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5174 },
})
```

- [ ] **Step 7: Run tsc --noEmit to confirm clean**

```bash
cd apps/seller && pnpm lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/seller/package.json apps/seller/vitest.config.ts apps/seller/src/test/setup.ts apps/seller/src/vite-env.d.ts apps/seller/vite.config.ts
git commit -m "feat(seller): add Vitest, testing-library, PWA manifest, port 5174"
```

---

### Task 1: Extend api-client with `createApiClient` factory

**Files:**
- Modify: `packages/api-client/src/index.ts`

**Interfaces:**
- Produces: `createApiClient(tokenKey: string)` — returns same shape as `apiClient`
- Produces: `apiClient` export unchanged (uses `'sy_token'` — backwards compat)
- Consumes: nothing new

- [ ] **Step 1: Write failing test for createApiClient**

Create `apps/seller/src/__tests__/apiClientFactory.test.ts`:

```typescript
import { createApiClient } from '@style-yangu/api-client'
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('createApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('reads the specified token key from localStorage', async () => {
    localStorage.setItem('sy_seller_token', 'seller-jwt-abc')
    const sellerClient = createApiClient('sy_seller_token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    await sellerClient.get('/seller/profile')
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/seller/profile'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer seller-jwt-abc' }),
      })
    )
  })

  it('does not send Authorization header when token absent', async () => {
    const sellerClient = createApiClient('sy_seller_token')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    await sellerClient.get('/seller/profile')
    const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers?.Authorization).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/seller && pnpm test -- apiClientFactory
```

Expected: FAIL — `createApiClient is not a function` or import error.

- [ ] **Step 3: Refactor api-client to export factory**

Replace `packages/api-client/src/index.ts` entirely:

```typescript
const BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:3001'

function makeRequest(tokenKey: string) {
  return async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem(tokenKey) : null
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message ?? 'Request failed')
    }
    return res.json() as Promise<T>
  }
}

export function createApiClient(tokenKey: string) {
  const request = makeRequest(tokenKey)
  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}

export const apiClient = createApiClient('sy_token')
```

- [ ] **Step 4: Run seller test — confirm pass**

```bash
cd apps/seller && pnpm test -- apiClientFactory
```

Expected: 2 tests PASS.

- [ ] **Step 5: Run consumer tests — confirm no regressions**

```bash
cd apps/consumer && pnpm test
```

Expected: all tests still pass (consumer imports `apiClient` which is now `createApiClient('sy_token')`).

- [ ] **Step 6: Run tsc --noEmit on both apps**

```bash
cd apps/consumer && pnpm lint
cd apps/seller && pnpm lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/api-client/src/index.ts apps/seller/src/__tests__/apiClientFactory.test.ts
git commit -m "feat(api-client): export createApiClient factory; seller uses sy_seller_token"
```

---

### Task 2: Add seller types to @style-yangu/types

**Files:**
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Produces: `SellerProfile`, `ShowcaseJob`, `POSTransaction`, `SellerClient`, `TryOnSend`, `FaceCard`, `POSSummary`, `SellerType` (exported from types package)
- Consumes: existing `SellerTier`, `PaymentMethod`, `PaymentStatus`, `SkinDepth` already in types

- [ ] **Step 1: Append seller types to packages/types/src/index.ts**

Add the following block at the end of the file (after the last existing export):

```typescript
// ── Seller ────────────────────────────────────────────────────────────────────
export type SellerType = 'seller' | 'cobbler' | 'tailor' | 'bag_maker' | 'jewellery_maker'

export interface SellerProfile {
  id: string
  businessName: string
  sellerType: SellerType
  tier: SellerTier
  generationsUsed: number
  generationsLimit: number
  phone: string
  avatarUrl: string | null
  instagramHandle: string | null
  whatsappNumber: string | null
  location: string | null
  bio: string | null
  onboardingDone: boolean
  createdAt: string
}

export interface ShowcaseJob {
  id: string
  itemId: string
  mode: 'full_body' | 'face_neck' | 'studio'
  faceId: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  resultUrl: string | null
  watermarked: boolean
  createdAt: string
}

export interface POSTransaction {
  id: string
  sellerId: string
  itemId: string | null
  itemName: string
  listedPriceKES: number
  finalPriceKES: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  clientNickname: string | null
  clientUsername: string | null
  whatsappNumber: string | null
  createdAt: string
}

export interface SellerClient {
  id: string
  sellerId: string
  nickname: string
  consumerUsername: string
  lastPurchaseDate: string | null
  tryOnSent: number
  tryOnActed: number
}

export interface TryOnSend {
  clientId: string
  itemId: string
  note: string | null
}

export interface FaceCard {
  id: string
  gender: 'female' | 'male'
  thumbnailUrl: string
  styleVibe: 'editorial' | 'everyday' | 'corporate' | 'streetwear' | 'traditional'
  skinDepth: SkinDepth
}

export interface POSSummary {
  todayRevenueKES: number
  todayItemsSold: number
  outstandingCount: number
  outstandingKES: number
}
```

- [ ] **Step 2: Run tsc across packages**

```bash
cd packages/types && pnpm exec tsc --noEmit
cd apps/consumer && pnpm lint
cd apps/seller && pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add seller types — SellerProfile, ShowcaseJob, POSTransaction, etc."
```

---

### Task 3: SellerContext + createApiClient wiring

**Files:**
- Create: `apps/seller/src/context/SellerContext.tsx`
- Create: `apps/seller/src/__tests__/SellerContext.test.tsx`

**Interfaces:**
- Produces: `SellerProvider` (wrap entire app), `useSellerContext()` hook returning `{ profile: SellerProfile | null, loading: boolean, refresh: () => void }`
- Produces: `sellerApi` — `createApiClient('sy_seller_token')` instance, re-exported from this file for use by all seller hooks/pages

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/SellerContext.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellerProvider, useSellerContext } from '../context/SellerContext'
import { sellerApi } from '../context/SellerContext'

function TestConsumer() {
  const { profile, loading } = useSellerContext()
  if (loading) return <div>loading</div>
  return <div>{profile?.businessName ?? 'no-profile'}</div>
}

describe('SellerContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows profile after fetch', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue({
      id: 's1',
      businessName: 'Nairobi Threads',
      sellerType: 'seller',
      tier: 'free_trial',
      generationsUsed: 0,
      generationsLimit: 5,
      phone: '+254700000000',
      avatarUrl: null,
      instagramHandle: null,
      whatsappNumber: null,
      location: null,
      bio: null,
      onboardingDone: true,
      createdAt: '2025-01-01T00:00:00Z',
    })
    render(
      <SellerProvider>
        <TestConsumer />
      </SellerProvider>
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Nairobi Threads')).toBeInTheDocument())
  })

  it('renders no-profile on fetch error', async () => {
    vi.spyOn(sellerApi, 'get').mockRejectedValue(new Error('401'))
    render(
      <SellerProvider>
        <TestConsumer />
      </SellerProvider>
    )
    await waitFor(() => expect(screen.getByText('no-profile')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- SellerContext
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement SellerContext.tsx**

Create `apps/seller/src/context/SellerContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createApiClient } from '@style-yangu/api-client'
import type { SellerProfile } from '@style-yangu/types'

export const sellerApi = createApiClient('sy_seller_token')

interface SellerContextValue {
  profile: SellerProfile | null
  loading: boolean
  refresh: () => void
}

const SellerContext = createContext<SellerContextValue | null>(null)

export function SellerProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await sellerApi.get<SellerProfile>('/seller/profile')
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <SellerContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </SellerContext.Provider>
  )
}

export function useSellerContext() {
  const ctx = useContext(SellerContext)
  if (!ctx) throw new Error('useSellerContext must be used inside SellerProvider')
  return ctx
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- SellerContext
```

Expected: 2 tests PASS.

- [ ] **Step 5: Run tsc --noEmit**

```bash
cd apps/seller && pnpm lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/seller/src/context/SellerContext.tsx apps/seller/src/__tests__/SellerContext.test.tsx
git commit -m "feat(seller): SellerContext with sellerApi (sy_seller_token)"
```

---

### Task 4: useTierGate hook

**Files:**
- Create: `apps/seller/src/hooks/useTierGate.ts`
- Create: `apps/seller/src/__tests__/useTierGate.test.ts`

**Interfaces:**
- Produces: `useTierGate(feature: TierFeature)` → `{ allowed: boolean, reason: string }`
- `TierFeature` type: `'clients_tab' | 'ad_boost' | 'full_face_library' | 'schedule_post' | 'item_level_analytics'`

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/useTierGate.test.ts`:

```typescript
import { renderHook } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { useTierGate } from '../hooks/useTierGate'
import { useSellerContext } from '../context/SellerContext'

vi.mock('../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('useTierGate', () => {
  it('blocks clients_tab for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(false)
    expect(result.current.reason).toMatch(/upgrade/i)
  })

  it('allows clients_tab for hustler', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'hustler' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(true)
    expect(result.current.reason).toBe('')
  })

  it('blocks ad_boost for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('ad_boost'))
    expect(result.current.allowed).toBe(false)
  })

  it('returns allowed when profile is null (loading state)', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: null,
      loading: true,
      refresh: vi.fn(),
    })
    const { result } = renderHook(() => useTierGate('clients_tab'))
    expect(result.current.allowed).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- useTierGate
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useTierGate.ts**

Create `apps/seller/src/hooks/useTierGate.ts`:

```typescript
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
  if (!profile) return { allowed: true, reason: '' }

  const userLevel = TIER_ORDER[profile.tier]
  const requiredLevel = TIER_ORDER[FEATURE_MIN_TIER[feature]]

  if (userLevel < requiredLevel) {
    return { allowed: false, reason: `Upgrade to ${FEATURE_MIN_TIER[feature]} to unlock this feature.` }
  }
  return { allowed: true, reason: '' }
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- useTierGate
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/hooks/useTierGate.ts apps/seller/src/__tests__/useTierGate.test.ts
git commit -m "feat(seller): useTierGate hook with tier hierarchy"
```

---

### Task 5: Auth screens — PhoneEntry + OTPVerify

**Files:**
- Create: `apps/seller/src/auth/PhoneEntry.tsx`
- Create: `apps/seller/src/auth/OTPVerify.tsx`
- Create: `apps/seller/src/__tests__/auth/PhoneEntry.test.tsx`
- Create: `apps/seller/src/__tests__/auth/OTPVerify.test.tsx`

**Interfaces:**
- Consumes: `sellerApi.post('/seller/auth/otp/send', { phone })` → `{ success: true }`
- Consumes: `sellerApi.post('/seller/auth/otp/verify', { phone, code })` → `{ token: string, onboardingDone: boolean }`
- Produces: on verify success — stores JWT at `sy_seller_token`, redirects to `/dashboard` or `/onboarding`

- [ ] **Step 1: Write failing tests — PhoneEntry**

Create `apps/seller/src/__tests__/auth/PhoneEntry.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PhoneEntry from '../../auth/PhoneEntry'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

describe('PhoneEntry', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders phone input and Send OTP button', () => {
    render(<MemoryRouter><PhoneEntry /></MemoryRouter>)
    expect(screen.getByPlaceholderText(/\+254/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument()
  })

  it('calls otp/send and navigates to verify step', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<MemoryRouter initialEntries={['/auth']}><PhoneEntry /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText(/\+254/i), '+254700000001')
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() =>
      expect(sellerApi.post).toHaveBeenCalledWith('/seller/auth/otp/send', { phone: '+254700000001' })
    )
  })

  it('shows error message on OTP send failure', async () => {
    vi.spyOn(sellerApi, 'post').mockRejectedValue(new Error('Phone not found'))
    render(<MemoryRouter><PhoneEntry /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText(/\+254/i), '+254700000001')
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() => expect(screen.getByText(/phone not found/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Write failing tests — OTPVerify**

Create `apps/seller/src/__tests__/auth/OTPVerify.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import OTPVerify from '../../auth/OTPVerify'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const renderWithState = (phone = '+254700000001') =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/verify', state: { phone } }]}>
      <Routes>
        <Route path="/auth/verify" element={<OTPVerify />} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route path="/onboarding" element={<div>onboarding</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('OTPVerify', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders 6-digit code input and Verify button', () => {
    renderWithState()
    expect(screen.getByPlaceholderText(/6-digit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('stores token and redirects to dashboard when onboardingDone=true', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ token: 'jwt-xyz', onboardingDone: true })
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument())
    expect(localStorage.getItem('sy_seller_token')).toBe('jwt-xyz')
  })

  it('redirects to onboarding when onboardingDone=false', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ token: 'jwt-xyz', onboardingDone: false })
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText('onboarding')).toBeInTheDocument())
  })

  it('shows inline error on wrong OTP', async () => {
    vi.spyOn(sellerApi, 'post').mockRejectedValue(new Error('Invalid code'))
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText(/invalid code/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd apps/seller && pnpm test -- auth
```

Expected: FAIL — auth modules not found.

- [ ] **Step 4: Implement PhoneEntry.tsx**

Create `apps/seller/src/auth/PhoneEntry.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

export default function PhoneEntry() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSend() {
    setError('')
    setLoading(true)
    try {
      await sellerApi.post('/seller/auth/otp/send', { phone })
      navigate('/auth/verify', { state: { phone } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#8B4513' }}>Style Yangu Seller</h1>
      <p className="text-sm text-gray-500 mb-8">Enter your phone number to continue</p>
      <input
        type="tel"
        placeholder="+254 700 000 000"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-amber-700"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleSend}
        disabled={loading || !phone}
        className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send OTP'}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Implement OTPVerify.tsx**

Create `apps/seller/src/auth/OTPVerify.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

export default function OTPVerify() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { phone: string } }

  async function handleVerify() {
    setError('')
    setLoading(true)
    try {
      const res = await sellerApi.post<{ token: string; onboardingDone: boolean }>(
        '/seller/auth/otp/verify',
        { phone: state?.phone, code }
      )
      localStorage.setItem('sy_seller_token', res.token)
      navigate(res.onboardingDone ? '/dashboard' : '/onboarding', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#8B4513' }}>Verify your number</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the 6-digit code sent to {state?.phone}
      </p>
      <input
        type="text"
        placeholder="6-digit code"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 text-base mb-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-700"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
cd apps/seller && pnpm test -- auth
```

Expected: 7 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/seller/src/auth/ apps/seller/src/__tests__/auth/
git commit -m "feat(seller): PhoneEntry + OTPVerify auth screens with TDD"
```

---

### Task 6: Onboarding wizard

**Files:**
- Create: `apps/seller/src/onboarding/BusinessName.tsx`
- Create: `apps/seller/src/onboarding/BusinessType.tsx`
- Create: `apps/seller/src/onboarding/OnboardingWizard.tsx`
- Create: `apps/seller/src/__tests__/onboarding/OnboardingWizard.test.tsx`

**Interfaces:**
- Consumes: `sellerApi.post('/seller/onboarding/complete', { businessName, sellerType })` → `{ success: true }`
- Produces: on success → navigates to `/inventory`

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/onboarding/OnboardingWizard.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import OnboardingWizard from '../../onboarding/OnboardingWizard'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/inventory" element={<div>inventory</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OnboardingWizard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows business name step first', () => {
    renderWizard()
    expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument()
  })

  it('advances to business type after entering name', async () => {
    renderWizard()
    await userEvent.type(screen.getByPlaceholderText(/business name/i), 'Nairobi Threads')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/what best describes/i)).toBeInTheDocument()
  })

  it('submits onboarding and redirects to inventory', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    renderWizard()
    await userEvent.type(screen.getByPlaceholderText(/business name/i), 'Nairobi Threads')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await userEvent.click(screen.getByRole('button', { name: /seller/i }))
    await waitFor(() => expect(screen.getByText('inventory')).toBeInTheDocument())
    expect(sellerApi.post).toHaveBeenCalledWith('/seller/onboarding/complete', {
      businessName: 'Nairobi Threads',
      sellerType: 'seller',
    })
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- OnboardingWizard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement OnboardingWizard.tsx**

Create `apps/seller/src/onboarding/OnboardingWizard.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'
import type { SellerType } from '@style-yangu/types'

const SELLER_TYPES: { value: SellerType; label: string }[] = [
  { value: 'seller', label: 'Seller' },
  { value: 'tailor', label: 'Tailor' },
  { value: 'cobbler', label: 'Cobbler' },
  { value: 'bag_maker', label: 'Bag Maker' },
  { value: 'jewellery_maker', label: 'Jewellery Maker' },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const navigate = useNavigate()

  async function handleTypeSelect(sellerType: SellerType) {
    await sellerApi.post('/seller/onboarding/complete', { businessName, sellerType })
    navigate('/inventory', { replace: true })
  }

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#8B4513' }}>What's your business called?</h1>
        <input
          placeholder="Business name"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-700"
        />
        <button
          onClick={() => setStep(1)}
          disabled={!businessName.trim()}
          className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-xl font-bold mb-2" style={{ color: '#8B4513' }}>What best describes you?</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your seller type</p>
      <div className="w-full max-w-sm space-y-3">
        {SELLER_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => handleTypeSelect(t.value)}
            className="w-full border border-amber-800 text-amber-900 rounded-lg py-3 font-medium hover:bg-amber-50"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- OnboardingWizard
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/onboarding/ apps/seller/src/__tests__/onboarding/
git commit -m "feat(seller): onboarding wizard — business name + type selection"
```

---

### Task 7: AppShell + ProtectedRoute + routing

**Files:**
- Create: `apps/seller/src/components/AppShell.tsx`
- Create: `apps/seller/src/routes/ProtectedRoute.tsx`
- Create: `apps/seller/src/routes/index.tsx`
- Modify: `apps/seller/src/App.tsx`
- Modify: `apps/seller/src/main.tsx`
- Create: `apps/seller/src/__tests__/AppShell.test.tsx`
- Create: `apps/seller/src/__tests__/ProtectedRoute.test.tsx`
- Create placeholder pages: `DashboardTab.tsx`, `InventoryTab.tsx`, `POSTab.tsx`, `ClientsTab.tsx`, `ProfileTab.tsx` (in `apps/seller/src/pages/`)

**Interfaces:**
- `ProtectedRoute` reads `sy_seller_token` from localStorage. If absent → redirect `/auth`. If present + profile.onboardingDone=false → redirect `/onboarding`.
- `AppShell` renders bottom nav (Dashboard, Inventory, POS, Clients, Profile) + `<Outlet />`
- Clients tab hidden when `useTierGate('clients_tab').allowed === false`

- [ ] **Step 1: Write failing tests**

Create `apps/seller/src/__tests__/ProtectedRoute.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'
import ProtectedRoute from '../routes/ProtectedRoute'

vi.mock('../context/SellerContext', () => ({
  SellerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { useSellerContext } from '../context/SellerContext'

function renderGuard(token: string | null, profile: any | null) {
  if (token) localStorage.setItem('sy_seller_token', token)
  else localStorage.removeItem('sy_seller_token')
  vi.mocked(useSellerContext).mockReturnValue({ profile, loading: false, refresh: vi.fn() })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>protected</div>} />
        </Route>
        <Route path="/auth" element={<div>auth</div>} />
        <Route path="/onboarding" element={<div>onboarding</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear())

  it('redirects to /auth when no token', () => {
    renderGuard(null, null)
    expect(screen.getByText('auth')).toBeInTheDocument()
  })

  it('redirects to /onboarding when onboardingDone=false', () => {
    renderGuard('jwt', { onboardingDone: false })
    expect(screen.getByText('onboarding')).toBeInTheDocument()
  })

  it('renders protected content when authenticated + onboarded', () => {
    renderGuard('jwt', { onboardingDone: true })
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
```

Create `apps/seller/src/__tests__/AppShell.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'
import AppShell from '../components/AppShell'
import { useSellerContext } from '../context/SellerContext'
import { useTierGate } from '../hooks/useTierGate'

vi.mock('../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('../hooks/useTierGate', () => ({
  useTierGate: vi.fn(),
}))

function renderShell(clientsAllowed = true) {
  vi.mocked(useSellerContext).mockReturnValue({
    profile: { businessName: 'Nairobi Threads', tier: 'hustler', onboardingDone: true } as any,
    loading: false,
    refresh: vi.fn(),
  })
  vi.mocked(useTierGate).mockReturnValue({ allowed: clientsAllowed, reason: '' })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div>dashboard page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  it('renders all 5 nav tabs for hustler tier', () => {
    renderShell(true)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('hides Clients tab for free_trial', () => {
    renderShell(false)
    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
cd apps/seller && pnpm test -- AppShell ProtectedRoute
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create placeholder pages**

Create each of these files with minimal stubs (they'll be fleshed out in Plans 2-4):

`apps/seller/src/pages/DashboardTab.tsx`:
```typescript
export default function DashboardTab() {
  return <div className="p-4"><h2 className="text-lg font-bold">Dashboard</h2></div>
}
```

`apps/seller/src/pages/InventoryTab.tsx`:
```typescript
export default function InventoryTab() {
  return <div className="p-4"><h2 className="text-lg font-bold">Inventory</h2></div>
}
```

`apps/seller/src/pages/POSTab.tsx`:
```typescript
export default function POSTab() {
  return <div className="p-4"><h2 className="text-lg font-bold">POS</h2></div>
}
```

`apps/seller/src/pages/ClientsTab.tsx`:
```typescript
export default function ClientsTab() {
  return <div className="p-4"><h2 className="text-lg font-bold">Clients</h2></div>
}
```

`apps/seller/src/pages/ProfileTab.tsx`:
```typescript
export default function ProfileTab() {
  return <div className="p-4"><h2 className="text-lg font-bold">Profile</h2></div>
}
```

- [ ] **Step 4: Implement ProtectedRoute.tsx**

Create `apps/seller/src/routes/ProtectedRoute.tsx`:

```typescript
import { Navigate, Outlet } from 'react-router-dom'
import { useSellerContext } from '../context/SellerContext'

export default function ProtectedRoute() {
  const token = localStorage.getItem('sy_seller_token')
  const { profile, loading } = useSellerContext()

  if (!token) return <Navigate to="/auth" replace />
  if (loading) return null
  if (profile && !profile.onboardingDone) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
```

- [ ] **Step 5: Implement AppShell.tsx**

Create `apps/seller/src/components/AppShell.tsx`:

```typescript
import { Outlet, NavLink } from 'react-router-dom'
import { useTierGate } from '../hooks/useTierGate'

const ACTIVE = '#8B4513'
const INACTIVE = 'rgba(26,10,0,0.4)'

const navStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? ACTIVE : INACTIVE,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  fontSize: '0.65rem',
  fontWeight: isActive ? 600 : 400,
  textDecoration: 'none',
  gap: '2px',
})

export default function AppShell() {
  const { allowed: clientsAllowed } = useTierGate('clients_tab')

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
        <NavLink to="/dashboard" style={navStyle}>
          <span>🏠</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inventory" style={navStyle}>
          <span>👗</span>
          <span>Inventory</span>
        </NavLink>
        <NavLink to="/pos" style={navStyle}>
          <span>💳</span>
          <span>POS</span>
        </NavLink>
        {clientsAllowed && (
          <NavLink to="/clients" style={navStyle}>
            <span>👥</span>
            <span>Clients</span>
          </NavLink>
        )}
        <NavLink to="/profile" style={navStyle}>
          <span>👤</span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}
```

- [ ] **Step 6: Implement routes/index.tsx**

Create `apps/seller/src/routes/index.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import PhoneEntry from '../auth/PhoneEntry'
import OTPVerify from '../auth/OTPVerify'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import AppShell from '../components/AppShell'
import ProtectedRoute from './ProtectedRoute'
import DashboardTab from '../pages/DashboardTab'
import InventoryTab from '../pages/InventoryTab'
import POSTab from '../pages/POSTab'
import ClientsTab from '../pages/ClientsTab'
import ProfileTab from '../pages/ProfileTab'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PhoneEntry />} />
      <Route path="/auth/verify" element={<OTPVerify />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/inventory" element={<InventoryTab />} />
          <Route path="/pos" element={<POSTab />} />
          <Route path="/clients" element={<ClientsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 7: Update App.tsx**

Replace `apps/seller/src/App.tsx`:

```typescript
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SellerProvider } from './context/SellerContext'
import AppRoutes from './routes'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SellerProvider>
          <AppRoutes />
        </SellerProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 8: Update main.tsx**

Replace `apps/seller/src/main.tsx` (read it first to get current content, then replace):

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 9: Run tests — confirm pass**

```bash
cd apps/seller && pnpm test -- AppShell ProtectedRoute
```

Expected: 5 tests PASS.

- [ ] **Step 10: Run full test suite**

```bash
cd apps/seller && pnpm test
```

Expected: all seller tests pass.

- [ ] **Step 11: Run tsc --noEmit**

```bash
cd apps/seller && pnpm lint
```

Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add apps/seller/src/components/ apps/seller/src/routes/ apps/seller/src/pages/ apps/seller/src/App.tsx apps/seller/src/main.tsx apps/seller/src/__tests__/AppShell.test.tsx apps/seller/src/__tests__/ProtectedRoute.test.tsx
git commit -m "feat(seller): AppShell 5-tab nav, ProtectedRoute, routing wired up"
```

---

### Plan 1 Complete

Run `cd apps/seller && pnpm test` — all tests should pass. Run `pnpm dev` — seller opens at `http://localhost:5174`. Unauthenticated users see `/auth`. All routing, context, and tier gating are in place for Plans 2-4.
