# Seller App — Plan 4: Dashboard + Profile + Ad Boost

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dashboard tab (greeting, stats row, quick actions, tier-gated analytics), the Profile tab (edit details, generation meter, subscription section, storefront link, sign out), and the Ad Boost card (Coming Soon treatment with waitlist CTA for paid tiers, hidden for free_trial).

**Architecture:** Dashboard fetches `GET /seller/dashboard` for stats. Profile patches `PATCH /seller/profile` inline. Ad Boost card renders inside the Profile tab. Tier-gated analytics sections use `useTierGate`. No new routes needed — all content lives in existing tab pages.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, React Query, sellerApi, useSellerContext.

## Global Constraints

- Dashboard greeting: "Good morning/afternoon/evening, [Business Name]" (time-of-day logic based on hour, passed via `args` or computed from `new Date().getHours()` in the component — NOT in tests)
- Analytics tiers: Hustler → aggregate weekly totals card. Boutique+ → item-level table. Brand+ → full funnel chart stub (placeholder `<div>`).
- Ad Boost: completely hidden for `free_trial`. Shown for `hustler`, `boutique`, `brand` as "Coming Soon" with waitlist CTA.
- Waitlist CTA: `POST /seller/adboost/waitlist` → toast "You're on the list. We'll notify you when Ad Boost launches."
- Profile sign out: clears `sy_seller_token`, navigates to `/auth`
- Generation meter: `X of Y showcase generations used this month`. Brand/enterprise: shows "Unlimited".
- TDD: write failing test → confirm fail → implement → confirm pass → commit

---

### Task 1: AdBoostCard component

**Files:**
- Create: `apps/seller/src/components/AdBoostCard.tsx`
- Create: `apps/seller/src/__tests__/profile/AdBoostCard.test.tsx`

**Interfaces:**
- Props: `{ tier: SellerTier }`
- Hidden entirely when `tier === 'free_trial'` (component returns null)
- Paid tiers: shows "Ad Boost — Coming Soon" card with pack options (all disabled), waitlist button
- On waitlist click: `POST /seller/adboost/waitlist` → sets success state → shows toast message "You're on the list. We'll notify you when Ad Boost launches."
- Tier allocation text: Hustler → "5 boost slots/week", Boutique → "15 boost slots/week", Brand → "30 boost slots/week"

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/profile/AdBoostCard.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AdBoostCard from '../../components/AdBoostCard'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

describe('AdBoostCard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders nothing for free_trial', () => {
    const { container } = render(<AdBoostCard tier="free_trial" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Coming Soon card for hustler', () => {
    render(<AdBoostCard tier="hustler" />)
    expect(screen.getByText(/ad boost/i)).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    expect(screen.getByText(/5 boost slots\/week/i)).toBeInTheDocument()
  })

  it('shows waitlist button for boutique', () => {
    render(<AdBoostCard tier="boutique" />)
    expect(screen.getByRole('button', { name: /join the waitlist/i })).toBeInTheDocument()
    expect(screen.getByText(/15 boost slots\/week/i)).toBeInTheDocument()
  })

  it('posts waitlist and shows confirmation toast', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<AdBoostCard tier="brand" />)
    await userEvent.click(screen.getByRole('button', { name: /join the waitlist/i }))
    await waitFor(() =>
      expect(screen.getByText(/you're on the list/i)).toBeInTheDocument()
    )
    expect(sellerApi.post).toHaveBeenCalledWith('/seller/adboost/waitlist', {})
  })

  it('disables waitlist button after joining', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<AdBoostCard tier="hustler" />)
    await userEvent.click(screen.getByRole('button', { name: /join the waitlist/i }))
    await waitFor(() => screen.getByText(/you're on the list/i))
    expect(screen.queryByRole('button', { name: /join the waitlist/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- AdBoostCard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement AdBoostCard.tsx**

Create `apps/seller/src/components/AdBoostCard.tsx`:

```typescript
import { useState } from 'react'
import { sellerApi } from '../context/SellerContext'
import type { SellerTier } from '@style-yangu/types'

interface Props {
  tier: SellerTier
}

const SLOT_ALLOCATION: Partial<Record<SellerTier, string>> = {
  hustler: '5 boost slots/week',
  boutique: '15 boost slots/week',
  brand: '30 boost slots/week',
  enterprise: '30 boost slots/week',
}

const PACK_OPTIONS = [
  { name: 'Starter', price: 'KES 500/week' },
  { name: 'Growth', price: 'KES 1,200/week' },
  { name: 'Campaign', price: 'KES 3,000/week' },
]

export default function AdBoostCard({ tier }: Props) {
  const [joined, setJoined] = useState(false)

  if (tier === 'free_trial') return null

  async function handleJoinWaitlist() {
    await sellerApi.post('/seller/adboost/waitlist', {})
    setJoined(true)
  }

  return (
    <div className="border border-amber-200 rounded-2xl p-4 space-y-3 bg-amber-50">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: '#8B4513' }}>Ad Boost</h3>
        <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
      </div>

      <p className="text-sm text-gray-600">
        Reach consumers who match your style profile while they browse outfit suggestions.
      </p>

      {SLOT_ALLOCATION[tier] && (
        <p className="text-sm font-medium text-amber-900">{SLOT_ALLOCATION[tier]} included in your plan</p>
      )}

      <div className="space-y-2">
        {PACK_OPTIONS.map(pack => (
          <div
            key={pack.name}
            className="flex justify-between items-center border border-gray-200 rounded-lg px-3 py-2 opacity-50"
          >
            <span className="text-sm font-medium">{pack.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{pack.price}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          </div>
        ))}
        <div className="flex justify-between items-center border border-gray-200 rounded-lg px-3 py-2 opacity-50">
          <span className="text-sm font-medium">Max Pack</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>
        </div>
      </div>

      {joined ? (
        <p className="text-sm text-green-700 font-medium text-center py-2">
          You're on the list. We'll notify you when Ad Boost launches.
        </p>
      ) : (
        <button
          onClick={handleJoinWaitlist}
          className="w-full border border-amber-700 text-amber-800 rounded-lg py-2 text-sm font-semibold"
        >
          Join the waitlist
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- AdBoostCard
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/AdBoostCard.tsx apps/seller/src/__tests__/profile/AdBoostCard.test.tsx
git commit -m "feat(seller): AdBoostCard — Coming Soon, tier-gated, waitlist CTA"
```

---

### Task 2: TierBadge component

**Files:**
- Create: `apps/seller/src/components/TierBadge.tsx`
- Create: `apps/seller/src/__tests__/profile/TierBadge.test.tsx`

**Interfaces:**
- Props: `{ tier: SellerTier }`
- Renders a coloured pill with tier name: Free Trial (gray), Hustler (amber), Boutique (amber-800), Brand (amber-900 + gold border)

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/profile/TierBadge.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TierBadge from '../../components/TierBadge'

describe('TierBadge', () => {
  it('renders Free Trial label', () => {
    render(<TierBadge tier="free_trial" />)
    expect(screen.getByText('Free Trial')).toBeInTheDocument()
  })

  it('renders Hustler label', () => {
    render(<TierBadge tier="hustler" />)
    expect(screen.getByText('Hustler')).toBeInTheDocument()
  })

  it('renders Boutique label', () => {
    render(<TierBadge tier="boutique" />)
    expect(screen.getByText('Boutique')).toBeInTheDocument()
  })

  it('renders Brand label', () => {
    render(<TierBadge tier="brand" />)
    expect(screen.getByText('Brand')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- TierBadge
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TierBadge.tsx**

Create `apps/seller/src/components/TierBadge.tsx`:

```typescript
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
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- TierBadge
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/TierBadge.tsx apps/seller/src/__tests__/profile/TierBadge.test.tsx
git commit -m "feat(seller): TierBadge component"
```

---

### Task 3: ProfileTab (full implementation)

**Files:**
- Modify: `apps/seller/src/pages/ProfileTab.tsx`
- Create: `apps/seller/src/__tests__/profile/ProfileTab.test.tsx`

**Interfaces:**
- Sections: business header (avatar circle + business name + TierBadge), edit details (bio, Instagram, WhatsApp, location), generation meter, subscription card, storefront link, sign out button, AdBoostCard
- Edit fields: inline `<input>` + save on blur → `PATCH /seller/profile` `{ bio, instagramHandle, whatsappNumber, location }`
- Generation meter: `generationsUsed / generationsLimit` progress bar. Brand/enterprise: text "Unlimited"
- Sign out: `localStorage.removeItem('sy_seller_token')` → navigate to `/auth`
- Storefront link: `<a href="https://styleyangu.com/shop/[businessName]" target="_blank">View my storefront</a>` — businessName slug is the profile businessName lowercased + spaces replaced with `-`

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/profile/ProfileTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProfileTab from '../../pages/ProfileTab'
import { useSellerContext, sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const PROFILE = {
  id: 's1', businessName: 'Nairobi Threads', sellerType: 'seller', tier: 'hustler',
  generationsUsed: 8, generationsLimit: 20, phone: '+254700000000',
  avatarUrl: null, instagramHandle: '@nairobi_threads', whatsappNumber: '+254700000000',
  location: 'Westlands, Nairobi', bio: 'Best fashion in town', onboardingDone: true,
  createdAt: '2025-01-01T00:00:00Z',
}

function wrap() {
  vi.mocked(useSellerContext).mockReturnValue({ profile: PROFILE as any, loading: false, refresh: vi.fn() })
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfileTab />} />
        <Route path="/auth" element={<div>auth page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProfileTab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows business name and tier badge', () => {
    wrap()
    expect(screen.getByText('Nairobi Threads')).toBeInTheDocument()
    expect(screen.getByText('Hustler')).toBeInTheDocument()
  })

  it('shows generation meter with used/total', () => {
    wrap()
    expect(screen.getByText(/8 of 20 showcase generations used/i)).toBeInTheDocument()
  })

  it('shows Unlimited for brand tier', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { ...PROFILE, tier: 'brand', generationsLimit: -1 } as any,
      loading: false,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter><Routes><Route path="/" element={<ProfileTab />} /></Routes></MemoryRouter>
    )
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument()
  })

  it('patches profile on bio field blur', async () => {
    vi.mocked(useSellerContext).mockReturnValue({ profile: PROFILE as any, loading: false, refresh: vi.fn() })
    vi.spyOn(sellerApi, 'patch').mockResolvedValue({})
    wrap()
    const bioInput = screen.getByDisplayValue('Best fashion in town')
    await userEvent.clear(bioInput)
    await userEvent.type(bioInput, 'New bio')
    await userEvent.tab()
    await waitFor(() =>
      expect(sellerApi.patch).toHaveBeenCalledWith('/seller/profile', expect.objectContaining({ bio: 'New bio' }))
    )
  })

  it('signs out and redirects to /auth', async () => {
    localStorage.setItem('sy_seller_token', 'jwt')
    wrap()
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(screen.getByText('auth page')).toBeInTheDocument())
    expect(localStorage.getItem('sy_seller_token')).toBeNull()
  })

  it('shows Ad Boost card for hustler', () => {
    wrap()
    expect(screen.getByText(/ad boost/i)).toBeInTheDocument()
  })

  it('hides Ad Boost card for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { ...PROFILE, tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter><Routes><Route path="/" element={<ProfileTab />} /></Routes></MemoryRouter>
    )
    expect(screen.queryByText(/ad boost/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- ProfileTab
```

Expected: FAIL — ProfileTab is a stub.

- [ ] **Step 3: Implement ProfileTab.tsx**

Replace `apps/seller/src/pages/ProfileTab.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import TierBadge from '../components/TierBadge'
import AdBoostCard from '../components/AdBoostCard'

export default function ProfileTab() {
  const navigate = useNavigate()
  const { profile, refresh } = useSellerContext()

  const [bio, setBio] = useState(profile?.bio ?? '')
  const [instagram, setInstagram] = useState(profile?.instagramHandle ?? '')
  const [whatsapp, setWhatsapp] = useState(profile?.whatsappNumber ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')

  if (!profile) return null

  const isUnlimited = profile.tier === 'brand' || profile.tier === 'enterprise'
  const storefrontSlug = profile.businessName.toLowerCase().replace(/\s+/g, '-')

  async function saveProfile() {
    await sellerApi.patch('/seller/profile', { bio, instagramHandle: instagram, whatsappNumber: whatsapp, location })
    refresh()
  }

  function handleSignOut() {
    localStorage.removeItem('sy_seller_token')
    navigate('/auth', { replace: true })
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Business header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.businessName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>🏪</span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.businessName}</h2>
          <TierBadge tier={profile.tier} />
        </div>
      </div>

      {/* Edit details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Business details</h3>
        {[
          { label: 'Bio', value: bio, setter: setBio, placeholder: 'Tell customers about your business' },
          { label: 'Instagram', value: instagram, setter: setInstagram, placeholder: '@handle' },
          { label: 'WhatsApp', value: whatsapp, setter: setWhatsapp, placeholder: '+254...' },
          { label: 'Location', value: location, setter: setLocation, placeholder: 'City, Neighbourhood' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
            <input
              value={value}
              onChange={e => setter(e.target.value)}
              onBlur={saveProfile}
              placeholder={placeholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
        ))}
      </div>

      {/* Generation meter */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">AI Showcase</h3>
        {isUnlimited ? (
          <p className="text-sm text-amber-900 font-medium">Unlimited showcase generations</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              {profile.generationsUsed} of {profile.generationsLimit} showcase generations used this month
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-amber-700 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, (profile.generationsUsed / profile.generationsLimit) * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Subscription */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Subscription</h3>
        <div className="border border-gray-200 rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium capitalize">{profile.tier.replace('_', ' ')}</p>
          </div>
          <button className="text-xs border border-amber-700 text-amber-800 px-3 py-1 rounded-full">
            Upgrade
          </button>
        </div>
      </div>

      {/* Storefront */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Storefront</h3>
        <a
          href={`https://styleyangu.com/shop/${storefrontSlug}`}
          target="_blank"
          rel="noreferrer"
          className="block border border-gray-200 rounded-xl p-3 text-sm text-amber-800 font-medium"
        >
          View my storefront →
        </a>
      </div>

      {/* Ad Boost */}
      <AdBoostCard tier={profile.tier} />

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full border border-red-200 text-red-600 rounded-xl py-3 font-semibold"
      >
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- ProfileTab
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/pages/ProfileTab.tsx apps/seller/src/__tests__/profile/ProfileTab.test.tsx
git commit -m "feat(seller): ProfileTab — edit details, generation meter, sign out, Ad Boost"
```

---

### Task 4: DashboardTab (full implementation)

**Files:**
- Modify: `apps/seller/src/pages/DashboardTab.tsx`
- Create: `apps/seller/src/__tests__/dashboard/DashboardTab.test.tsx`

**Interfaces:**
- `GET /seller/dashboard` → `{ todayRevenueKES: number, todayItemsSold: number, storefrontViews: number, weeklyAggregates?: { impressions, saves, follows, talkToSeller }, itemBreakdown?: ItemBreakdownRow[], greeting: string }`
- Greeting computed in component: `Good morning/afternoon/evening` based on `new Date().getHours()`
  - 5-11: morning, 12-17: afternoon, 18+: evening
- Analytics gating: `useTierGate('item_level_analytics')` — hustler sees aggregate card, boutique+ sees item table, brand+ also sees funnel stub
- Quick actions: "＋ Add Item" → `/inventory/new`, "Record Sale" → `/pos/new`, "View Storefront" → external link

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/dashboard/DashboardTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import DashboardTab from '../../pages/DashboardTab'
import { sellerApi, useSellerContext } from '../../context/SellerContext'
import { useTierGate } from '../../hooks/useTierGate'

vi.mock('../../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('../../hooks/useTierGate', () => ({
  useTierGate: vi.fn(),
}))

const DASHBOARD = {
  todayRevenueKES: 7800,
  todayItemsSold: 2,
  storefrontViews: 45,
  weeklyAggregates: { impressions: 320, saves: 18, follows: 5, talkToSeller: 3 },
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/inventory/new" element={<div>new inventory page</div>} />
          <Route path="/pos/new" element={<div>new sale page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(useSellerContext).mockReturnValue({
      profile: {
        businessName: 'Nairobi Threads', tier: 'hustler',
        generationsUsed: 5, generationsLimit: 20, onboardingDone: true,
      } as any,
      loading: false,
      refresh: vi.fn(),
    })
    vi.mocked(useTierGate).mockReturnValue({ allowed: false, reason: 'Upgrade to boutique' })
  })

  it('shows today revenue and items sold', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => expect(screen.getByText(/7,800/)).toBeInTheDocument())
    expect(screen.getByText(/2 items/i)).toBeInTheDocument()
  })

  it('shows storefront views', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => expect(screen.getByText(/45/)).toBeInTheDocument())
  })

  it('navigates to /inventory/new on Add Item click', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => screen.getByText(/7,800/))
    await userEvent.click(screen.getByRole('button', { name: /add item/i }))
    await waitFor(() => expect(screen.getByText('new inventory page')).toBeInTheDocument())
  })

  it('navigates to /pos/new on Record Sale click', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => screen.getByText(/7,800/))
    await userEvent.click(screen.getByRole('button', { name: /record sale/i }))
    await waitFor(() => expect(screen.getByText('new sale page')).toBeInTheDocument())
  })

  it('shows weekly aggregates for hustler', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => expect(screen.getByText(/320/)).toBeInTheDocument())
    expect(screen.getByText(/impressions/i)).toBeInTheDocument()
  })

  it('shows upgrade CTA for item-level analytics when not allowed', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(DASHBOARD)
    wrap()
    await waitFor(() => screen.getByText(/7,800/))
    expect(screen.getByText(/upgrade to boutique/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- DashboardTab
```

Expected: FAIL — DashboardTab is a stub.

- [ ] **Step 3: Implement DashboardTab.tsx**

Replace `apps/seller/src/pages/DashboardTab.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import { useTierGate } from '../hooks/useTierGate'

interface DashboardData {
  todayRevenueKES: number
  todayItemsSold: number
  storefrontViews: number
  weeklyAggregates?: {
    impressions: number
    saves: number
    follows: number
    talkToSeller: number
  }
  itemBreakdown?: { itemName: string; impressions: number; saves: number }[]
}

function timeGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardTab() {
  const navigate = useNavigate()
  const { profile } = useSellerContext()
  const { allowed: itemAnalyticsAllowed, reason: upgradeReason } = useTierGate('item_level_analytics')

  const { data } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => sellerApi.get('/seller/dashboard'),
  })

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#8B4513' }}>
          {timeGreeting()}, {profile?.businessName ?? '…'}
        </h1>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>
              KES {data.todayRevenueKES.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Today's revenue</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>{data.todayItemsSold} items</p>
            <p className="text-xs text-gray-500">Sold today</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold" style={{ color: '#8B4513' }}>{data.storefrontViews}</p>
            <p className="text-xs text-gray-500">Storefront views</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => navigate('/inventory/new')}
          className="flex-1 border border-amber-700 text-amber-800 rounded-xl py-2 text-sm font-semibold"
        >
          + Add item
        </button>
        <button
          onClick={() => navigate('/pos/new')}
          className="flex-1 border border-amber-700 text-amber-800 rounded-xl py-2 text-sm font-semibold"
        >
          Record sale
        </button>
      </div>

      {/* Weekly aggregates (hustler) */}
      {data?.weeklyAggregates && (
        <div className="border border-gray-100 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">This week</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Impressions</span>
              <span className="font-medium">{data.weeklyAggregates.impressions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saves</span>
              <span className="font-medium">{data.weeklyAggregates.saves}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Follows</span>
              <span className="font-medium">{data.weeklyAggregates.follows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Talk to Seller</span>
              <span className="font-medium">{data.weeklyAggregates.talkToSeller}</span>
            </div>
          </div>
        </div>
      )}

      {/* Item-level analytics (boutique+) */}
      {!itemAnalyticsAllowed ? (
        <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-400">{upgradeReason}</p>
        </div>
      ) : data?.itemBreakdown && data.itemBreakdown.length > 0 ? (
        <div className="border border-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Item breakdown</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 text-left">
                <th className="pb-2">Item</th>
                <th className="pb-2">Impressions</th>
                <th className="pb-2">Saves</th>
              </tr>
            </thead>
            <tbody>
              {data.itemBreakdown.map(row => (
                <tr key={row.itemName} className="border-t border-gray-50">
                  <td className="py-1.5">{row.itemName}</td>
                  <td className="py-1.5">{row.impressions}</td>
                  <td className="py-1.5">{row.saves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- DashboardTab
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/pages/DashboardTab.tsx apps/seller/src/__tests__/dashboard/DashboardTab.test.tsx
git commit -m "feat(seller): DashboardTab — greeting, stats, quick actions, tier-gated analytics"
```

---

### Task 5: Final integration + tsc clean-up

**Files:**
- Potentially modify: any file with remaining type errors
- Run all tests and fix any remaining failures

- [ ] **Step 1: Run full seller test suite**

```bash
cd apps/seller && pnpm test
```

Expected: all tests pass. If any test fails, fix the root cause before proceeding.

- [ ] **Step 2: Run type check**

```bash
cd apps/seller && pnpm lint
```

Expected: zero type errors. Fix any that appear.

- [ ] **Step 3: Run consumer test suite to confirm no regressions**

```bash
cd apps/consumer && pnpm test
```

Expected: all consumer tests pass (the `createApiClient` factory export is backwards-compatible).

- [ ] **Step 4: Run consumer lint**

```bash
cd apps/consumer && pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Smoke-test the seller app in browser**

```bash
cd apps/seller && pnpm dev
```

Open `http://localhost:5174`. Verify:
- Unauthenticated → redirects to `/auth` (phone entry screen visible)
- PhoneEntry screen renders with "+254" placeholder and "Send OTP" button
- Bottom nav is NOT visible on the auth screen

- [ ] **Step 6: Commit final clean-up if any changes made**

```bash
git add -p
git commit -m "fix(seller): type errors and lint clean-up after Plan 4"
```

(Skip this step if no changes were needed.)

---

### Task 6: Commit all 4 plans as a bundle

- [ ] **Step 1: Verify all 4 plan files exist**

```bash
ls docs/superpowers/plans/2026-06-23-seller-plan-*.md
```

Expected: 4 files listed.

- [ ] **Step 2: Commit plans**

```bash
git add docs/superpowers/plans/2026-06-23-seller-plan-*.md
git commit -m "docs: seller app implementation plans 1-4"
```

---

### Plan 4 Complete — Seller App Done

All 4 plans are implemented. Full seller app feature set:

| Feature | Status |
|---------|--------|
| Phone OTP auth | ✓ |
| Onboarding wizard | ✓ |
| AppShell 5-tab nav | ✓ |
| ProtectedRoute guard | ✓ |
| Inventory CRUD + wizard | ✓ |
| AI Showcase (3 modes, stub) | ✓ |
| Face library picker | ✓ |
| Watermark + generation cap | ✓ |
| POS home + record sale | ✓ |
| WhatsApp receipt | ✓ |
| Client list + search | ✓ |
| Try This On | ✓ |
| Dashboard + analytics | ✓ |
| Profile + edit | ✓ |
| Ad Boost (Coming Soon) | ✓ |
| Tier gating throughout | ✓ |

**Dev URLs:**
- Consumer: `http://localhost:5173`
- Seller: `http://localhost:5174`

**Auth flow:**
- Consumer: `/onboarding` → phone/email signup
- Seller: `/auth` → phone + OTP → onboarding wizard
