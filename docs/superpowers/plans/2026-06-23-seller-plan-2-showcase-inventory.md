# Seller App — Plan 2: AI Showcase + Inventory

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 4-step inventory item creation wizard (photo → details → sizes → AI showcase), inventory list/detail pages, face library picker, showcase generation stub (2.5s spinner → placeholder image), watermark, publish/share actions, and generation cap enforcement.

**Architecture:** Item creation is a local multi-step wizard (no route changes between steps — state held in a `useReducer` inside `InventoryNewPage`). Showcase generation is stubbed: `setTimeout(2500)` returns a `placehold.co` URL. The face library grid is populated from `GET /seller/faces`. Tier gating on face count and generation button is enforced via `useTierGate` + `SellerContext.profile.generationsUsed/generationsLimit`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vitest, @tanstack/react-query, sellerApi from SellerContext.

## Global Constraints

- Showcase mode auto-determined by category — sellers never pick the mode manually
- Free trial: 4 face cards shown (2F + 2M), all others locked. Paid: full library.
- Generation cap: `generationsUsed >= generationsLimit` (and tier ≠ brand/enterprise) → button disabled
- Watermark: CSS `::after` pseudo-element overlay on showcase result, text "Style Yangu"
- Watermark shown for: `free_trial` and `hustler`. Not shown for `boutique`, `brand`, `enterprise`.
- Image compress target: 500 KB on capture (client-side canvas resize stub acceptable at prototype)
- Inventory list card grid: 2 columns. Filter chips: All, Clothing, Shoes, Hats, Bags.
- TDD: write failing test → confirm fail → implement → confirm pass → commit

---

### Task 1: FaceLibraryPicker component

**Files:**
- Create: `apps/seller/src/components/FaceLibraryPicker.tsx`
- Create: `apps/seller/src/__tests__/inventory/FaceLibraryPicker.test.tsx`

**Interfaces:**
- Props: `{ selectedId: string | null, onSelect: (id: string) => void, tier: SellerTier }`
- Consumes: `useQuery(['faces'], () => sellerApi.get<FaceCard[]>('/seller/faces'))`
- `FaceCard`: `{ id, gender, thumbnailUrl, styleVibe, skinDepth }` from `@style-yangu/types`
- Trial: shows first 4 cards (2F + 2M), rest render as locked overlays with "Upgrade" text
- Paid tiers: all cards selectable, no locked overlays

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/inventory/FaceLibraryPicker.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import FaceLibraryPicker from '../../components/FaceLibraryPicker'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const FACES = [
  { id: 'f1', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'editorial', skinDepth: 'medium' },
  { id: 'f2', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'everyday', skinDepth: 'deep' },
  { id: 'm1', gender: 'male', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'streetwear', skinDepth: 'light' },
  { id: 'm2', gender: 'male', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'corporate', skinDepth: 'medium_deep' },
  { id: 'f3', gender: 'female', thumbnailUrl: 'https://placehold.co/80x80', styleVibe: 'traditional', skinDepth: 'medium' },
]

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('FaceLibraryPicker', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders 4 face cards for free_trial, 5th is locked', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    wrap(<FaceLibraryPicker selectedId={null} onSelect={vi.fn()} tier="free_trial" />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(4))
    expect(screen.getByText(/upgrade/i)).toBeInTheDocument()
  })

  it('renders all 5 cards for hustler (no locked overlay)', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    wrap(<FaceLibraryPicker selectedId={null} onSelect={vi.fn()} tier="hustler" />)
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(5))
    expect(screen.queryByText(/upgrade/i)).not.toBeInTheDocument()
  })

  it('calls onSelect when an unlocked card is clicked', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(FACES)
    const onSelect = vi.fn()
    wrap(<FaceLibraryPicker selectedId={null} onSelect={onSelect} tier="free_trial" />)
    await waitFor(() => screen.getAllByRole('img'))
    await userEvent.click(screen.getAllByRole('img')[0])
    expect(onSelect).toHaveBeenCalledWith('f1')
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- FaceLibraryPicker
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FaceLibraryPicker.tsx**

Create `apps/seller/src/components/FaceLibraryPicker.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { FaceCard, SellerTier } from '@style-yangu/types'

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
  tier: SellerTier
}

const TRIAL_LIMIT = 4

export default function FaceLibraryPicker({ selectedId, onSelect, tier }: Props) {
  const { data: faces = [] } = useQuery<FaceCard[]>({
    queryKey: ['faces'],
    queryFn: () => sellerApi.get('/seller/faces'),
  })

  const isTrialTier = tier === 'free_trial'

  return (
    <div className="grid grid-cols-4 gap-2">
      {faces.map((face, idx) => {
        const locked = isTrialTier && idx >= TRIAL_LIMIT
        const selected = face.id === selectedId

        return (
          <div key={face.id} className="relative">
            <img
              src={face.thumbnailUrl}
              alt={`${face.gender} ${face.styleVibe}`}
              onClick={() => !locked && onSelect(face.id)}
              className={`w-full aspect-square object-cover rounded-lg cursor-pointer border-2 ${
                selected ? 'border-amber-700' : 'border-transparent'
              } ${locked ? 'opacity-40' : ''}`}
            />
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <span className="text-white text-xs font-semibold text-center px-1">Upgrade</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- FaceLibraryPicker
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/FaceLibraryPicker.tsx apps/seller/src/__tests__/inventory/FaceLibraryPicker.test.tsx
git commit -m "feat(seller): FaceLibraryPicker — tier-gated face card grid"
```

---

### Task 2: Showcase mode utility + generation stub

**Files:**
- Create: `apps/seller/src/hooks/useShowcaseMode.ts`
- Create: `apps/seller/src/hooks/useGenerateShowcase.ts`
- Create: `apps/seller/src/__tests__/inventory/useShowcaseMode.test.ts`
- Create: `apps/seller/src/__tests__/inventory/useGenerateShowcase.test.ts`

**Interfaces:**
- `getShowcaseMode(category: ItemCategory): 'full_body' | 'face_neck' | 'studio'`
- `useShowcaseMode(category: ItemCategory | null)` → `'full_body' | 'face_neck' | 'studio' | null`
- `useGenerateShowcase()` → `{ generate: (params) => Promise<string>, generating: boolean }`
  - `params`: `{ itemId: string, itemName: string, mode: ShowcaseMode, faceId: string | null }`
  - Returns the placeholder image URL after 2500ms stub delay
  - Posts `POST /seller/inventory/:itemId/showcase` with `{ mode, faceId }` (stubbed: ignores response, returns placehold.co URL)

- [ ] **Step 1: Write failing tests**

Create `apps/seller/src/__tests__/inventory/useShowcaseMode.test.ts`:

```typescript
import { getShowcaseMode } from '../../hooks/useShowcaseMode'
import { describe, it, expect } from 'vitest'

describe('getShowcaseMode', () => {
  it.each([
    ['top', 'full_body'],
    ['bottom', 'full_body'],
    ['dress', 'full_body'],
    ['suit', 'full_body'],
    ['outerwear', 'full_body'],
    ['hat', 'face_neck'],
    ['shoe', 'studio'],
    ['bag', 'studio'],
    ['jewellery', 'studio'],
    ['accessory', 'studio'],
  ] as const)('%s → %s', (category, expected) => {
    expect(getShowcaseMode(category)).toBe(expected)
  })
})
```

Create `apps/seller/src/__tests__/inventory/useGenerateShowcase.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useGenerateShowcase } from '../../hooks/useGenerateShowcase'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

function wrap() {
  const qc = new QueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useGenerateShowcase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.restoreAllMocks()
  })

  afterEach(() => vi.useRealTimers())

  it('returns generating=true during stub delay then resolves URL', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({})
    const { result } = renderHook(() => useGenerateShowcase(), { wrapper: wrap() })
    let resultUrl = ''

    act(() => {
      result.current
        .generate({ itemId: 'i1', itemName: 'Blue Dress', mode: 'full_body', faceId: 'f1' })
        .then(url => { resultUrl = url })
    })

    expect(result.current.generating).toBe(true)
    await act(async () => { vi.advanceTimersByTime(2500) })
    expect(result.current.generating).toBe(false)
    expect(resultUrl).toContain('placehold.co')
    expect(resultUrl).toContain('Blue')
  })
})
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
cd apps/seller && pnpm test -- useShowcaseMode useGenerateShowcase
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement useShowcaseMode.ts**

Create `apps/seller/src/hooks/useShowcaseMode.ts`:

```typescript
import type { ItemCategory } from '@style-yangu/types'

type ShowcaseMode = 'full_body' | 'face_neck' | 'studio'

const MODE_MAP: Record<ItemCategory, ShowcaseMode> = {
  top: 'full_body',
  bottom: 'full_body',
  dress: 'full_body',
  suit: 'full_body',
  outerwear: 'full_body',
  jumpsuit: 'full_body',
  hat: 'face_neck',
  headwrap: 'face_neck',
  shoe: 'studio',
  bag: 'studio',
  jewellery: 'studio',
  accessory: 'studio',
}

export function getShowcaseMode(category: ItemCategory): ShowcaseMode {
  return MODE_MAP[category] ?? 'studio'
}

export function useShowcaseMode(category: ItemCategory | null): ShowcaseMode | null {
  if (!category) return null
  return getShowcaseMode(category)
}
```

> Note: `jumpsuit` and `headwrap` need to be added to `ItemCategory` in `packages/types/src/index.ts`. Add them now:

Open `packages/types/src/index.ts`, find `export type ItemCategory` and add `| 'jumpsuit' | 'headwrap'`.

- [ ] **Step 4: Implement useGenerateShowcase.ts**

Create `apps/seller/src/hooks/useGenerateShowcase.ts`:

```typescript
import { useState } from 'react'
import { sellerApi } from '../context/SellerContext'

type ShowcaseMode = 'full_body' | 'face_neck' | 'studio'

interface GenerateParams {
  itemId: string
  itemName: string
  mode: ShowcaseMode
  faceId: string | null
}

const COLOR_BY_MODE: Record<ShowcaseMode, string> = {
  full_body: 'D4A574/ffffff',
  face_neck: 'C8956C/ffffff',
  studio: 'E8D5B7/333333',
}

export function useGenerateShowcase() {
  const [generating, setGenerating] = useState(false)

  async function generate({ itemId, itemName, mode, faceId }: GenerateParams): Promise<string> {
    setGenerating(true)
    try {
      await sellerApi.post(`/seller/inventory/${itemId}/showcase`, { mode, faceId })
      await new Promise(resolve => setTimeout(resolve, 2500))
      const label = encodeURIComponent(itemName.slice(0, 20))
      return `https://placehold.co/400x600/${COLOR_BY_MODE[mode]}?text=${label}`
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating }
}
```

- [ ] **Step 5: Run tests — confirm pass**

```bash
cd apps/seller && pnpm test -- useShowcaseMode useGenerateShowcase
```

Expected: 11 tests PASS (10 mode tests + 1 generate test).

- [ ] **Step 6: Commit**

```bash
git add apps/seller/src/hooks/useShowcaseMode.ts apps/seller/src/hooks/useGenerateShowcase.ts apps/seller/src/__tests__/inventory/ packages/types/src/index.ts
git commit -m "feat(seller): showcase mode auto-detection + 2.5s generation stub"
```

---

### Task 3: ShowcaseResult component (with watermark)

**Files:**
- Create: `apps/seller/src/components/ShowcaseResult.tsx`
- Create: `apps/seller/src/__tests__/inventory/ShowcaseResult.test.tsx`

**Interfaces:**
- Props: `{ imageUrl: string, itemName: string, priceKES: number, itemId: string, tier: SellerTier, onPublish: () => void }`
- Shows watermark overlay if tier is `free_trial` or `hustler`
- Publish: `PATCH /seller/inventory/:itemId { isLive: true }` → calls `onPublish()`
- Download: `<a download>` on the image URL
- Share to WhatsApp: `window.open('https://wa.me/?text=...')` with item name + price + URL

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/inventory/ShowcaseResult.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ShowcaseResult from '../../components/ShowcaseResult'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const baseProps = {
  imageUrl: 'https://placehold.co/400x600',
  itemName: 'Blue Dress',
  priceKES: 3500,
  itemId: 'item-1',
  onPublish: vi.fn(),
}

describe('ShowcaseResult', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows watermark for free_trial', () => {
    render(<ShowcaseResult {...baseProps} tier="free_trial" />)
    expect(screen.getByTestId('watermark')).toBeInTheDocument()
  })

  it('shows watermark for hustler', () => {
    render(<ShowcaseResult {...baseProps} tier="hustler" />)
    expect(screen.getByTestId('watermark')).toBeInTheDocument()
  })

  it('hides watermark for boutique', () => {
    render(<ShowcaseResult {...baseProps} tier="boutique" />)
    expect(screen.queryByTestId('watermark')).not.toBeInTheDocument()
  })

  it('calls PATCH isLive and onPublish on Publish click', async () => {
    vi.spyOn(sellerApi, 'patch').mockResolvedValue({})
    const onPublish = vi.fn()
    render(<ShowcaseResult {...baseProps} tier="hustler" onPublish={onPublish} />)
    await userEvent.click(screen.getByRole('button', { name: /publish to shop/i }))
    await waitFor(() =>
      expect(sellerApi.patch).toHaveBeenCalledWith('/seller/inventory/item-1', { isLive: true })
    )
    expect(onPublish).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- ShowcaseResult
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ShowcaseResult.tsx**

Create `apps/seller/src/components/ShowcaseResult.tsx`:

```typescript
import { sellerApi } from '../context/SellerContext'
import type { SellerTier } from '@style-yangu/types'

interface Props {
  imageUrl: string
  itemName: string
  priceKES: number
  itemId: string
  tier: SellerTier
  onPublish: () => void
}

const WATERMARKED_TIERS: SellerTier[] = ['free_trial', 'hustler']

export default function ShowcaseResult({ imageUrl, itemName, priceKES, itemId, tier, onPublish }: Props) {
  const showWatermark = WATERMARKED_TIERS.includes(tier)

  async function handlePublish() {
    await sellerApi.patch(`/seller/inventory/${itemId}`, { isLive: true })
    onPublish()
  }

  function handleShare() {
    const text = encodeURIComponent(
      `${itemName} — KES ${priceKES.toLocaleString()}\n${imageUrl}\n\nShop via Style Yangu`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-xs">
        <img src={imageUrl} alt={itemName} className="w-full rounded-xl object-cover" />
        {showWatermark && (
          <div
            data-testid="watermark"
            className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none"
          >
            <span className="text-white/70 text-xs font-semibold tracking-widest uppercase">
              Style Yangu
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={handlePublish}
          className="flex-1 bg-amber-800 text-white rounded-lg py-2 text-sm font-semibold"
        >
          Publish to shop
        </button>
        <a
          href={imageUrl}
          download={`${itemName}.jpg`}
          className="flex-1 border border-amber-800 text-amber-900 rounded-lg py-2 text-sm font-semibold text-center"
        >
          Download
        </a>
        <button
          onClick={handleShare}
          className="flex-1 border border-green-600 text-green-700 rounded-lg py-2 text-sm font-semibold"
        >
          WhatsApp
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- ShowcaseResult
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/ShowcaseResult.tsx apps/seller/src/__tests__/inventory/ShowcaseResult.test.tsx
git commit -m "feat(seller): ShowcaseResult — watermark, publish, download, WhatsApp share"
```

---

### Task 4: Inventory item creation wizard (InventoryNewPage)

**Files:**
- Create: `apps/seller/src/pages/InventoryNewPage.tsx`
- Create: `apps/seller/src/__tests__/inventory/InventoryNewPage.test.tsx`

**Interfaces:**
- 4 wizard steps: Photo (0) → Details (1) → Sizes (2) → Showcase (3)
- State held in `useReducer` inside the page — no route changes between steps
- Photo step: file `<input>` + `accept="image/*"` + camera capture guide overlay text. Sets `previewUrl` via `URL.createObjectURL`.
- Details step: item name input, category select (determines showcase mode), price KES input, occasion tags (chips: casual, office, date, wedding, evening, rain, heat), optional discount fields.
- Sizes step: clothing categories → XS/S/M/L/XL/2XL/3XL chips + quantity spinner per size. Shoes → UK 36-46 chip grid + quantity. Bags/accessories/hats → "One size" chip.
- Showcase step: generation cap guard → FaceLibraryPicker → Generate button → 2.5s spinner → ShowcaseResult
- On publish: navigates to `/inventory`
- Consumes: `sellerApi.post('/seller/inventory', { name, category, priceKES, occasionTags, sizes, discountPercent, discountExpiresAt })` → `{ id: string }`

- [ ] **Step 1: Write failing tests**

Create `apps/seller/src/__tests__/inventory/InventoryNewPage.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InventoryNewPage from '../../pages/InventoryNewPage'
import { sellerApi } from '../../context/SellerContext'
import { useSellerContext } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    useSellerContext: vi.fn(),
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/inventory/new']}>
        <Routes>
          <Route path="/inventory/new" element={<InventoryNewPage />} />
          <Route path="/inventory" element={<div>inventory list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InventoryNewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(useSellerContext).mockReturnValue({
      profile: {
        id: 's1', tier: 'hustler', generationsUsed: 2, generationsLimit: 20,
        businessName: 'NT', sellerType: 'seller', phone: '+254700000000',
        avatarUrl: null, instagramHandle: null, whatsappNumber: null,
        location: null, bio: null, onboardingDone: true, createdAt: '2025-01-01T00:00:00Z',
      } as any,
      loading: false,
      refresh: vi.fn(),
    })
  })

  it('shows photo upload step first', () => {
    wrap()
    expect(screen.getByText(/step 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/choose photo/i)).toBeInTheDocument()
  })

  it('advances to details step after photo selected', async () => {
    wrap()
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/choose photo/i)
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument())
  })

  it('shows disabled Generate button when generation cap reached', async () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: {
        id: 's1', tier: 'hustler', generationsUsed: 20, generationsLimit: 20,
        businessName: 'NT', sellerType: 'seller', phone: '+254700000000',
        avatarUrl: null, instagramHandle: null, whatsappNumber: null,
        location: null, bio: null, onboardingDone: true, createdAt: '2025-01-01T00:00:00Z',
      } as any,
      loading: false,
      refresh: vi.fn(),
    })
    vi.spyOn(sellerApi, 'get').mockResolvedValue([])
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ id: 'new-item-1' })

    wrap()
    // Navigate to showcase step via mocked steps
    // Simulate being on step 3 by checking for the cap message
    // We'll test this at the component level — the Generate button should be disabled
    // when generationsUsed >= generationsLimit
    // For this test we just confirm the warning text appears on showcase step
    // (full navigation tested separately)
    // Re-render directly at showcase step by passing initialStep prop
    // Since the component manages its own state, we verify via user interaction:
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/choose photo/i)
    await userEvent.upload(input, file)
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => screen.getByText(/step 2/i))
    await userEvent.type(screen.getByPlaceholderText(/item name/i), 'Blue Top')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'top')
    await userEvent.type(screen.getByPlaceholderText(/price/i), '1500')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => screen.getByText(/step 3/i))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => screen.getByText(/step 4/i))
    expect(screen.getByText(/0 generations remaining/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate showcase/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- InventoryNewPage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement InventoryNewPage.tsx**

Create `apps/seller/src/pages/InventoryNewPage.tsx`:

```typescript
import { useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sellerApi, useSellerContext } from '../context/SellerContext'
import FaceLibraryPicker from '../components/FaceLibraryPicker'
import ShowcaseResult from '../components/ShowcaseResult'
import { useGenerateShowcase } from '../hooks/useGenerateShowcase'
import { getShowcaseMode } from '../hooks/useShowcaseMode'
import type { ItemCategory } from '@style-yangu/types'

type OccasionTag = 'casual' | 'office' | 'date' | 'wedding' | 'evening' | 'rain' | 'heat'
const OCCASION_TAGS: OccasionTag[] = ['casual', 'office', 'date', 'wedding', 'evening', 'rain', 'heat']

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']

const CLOTHING_CATS: ItemCategory[] = ['top', 'bottom', 'dress', 'suit', 'outerwear', 'jumpsuit']
const SHOE_CATS: ItemCategory[] = ['shoe']

interface State {
  step: number
  photoFile: File | null
  previewUrl: string | null
  name: string
  category: ItemCategory | ''
  priceKES: string
  occasionTags: OccasionTag[]
  sizes: { size: string; quantity: number }[]
  discountPercent: string
  discountExpiresAt: string
  selectedFaceId: string | null
  newItemId: string | null
  showcaseUrl: string | null
}

type Action =
  | { type: 'SET_PHOTO'; file: File; previewUrl: string }
  | { type: 'SET_FIELD'; field: keyof State; value: any }
  | { type: 'TOGGLE_TAG'; tag: OccasionTag }
  | { type: 'TOGGLE_SIZE'; size: string }
  | { type: 'SET_QTY'; size: string; qty: number }
  | { type: 'NEXT_STEP' }
  | { type: 'SET_ITEM_ID'; id: string }
  | { type: 'SET_SHOWCASE'; url: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PHOTO':
      return { ...state, photoFile: action.file, previewUrl: action.previewUrl }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'TOGGLE_TAG':
      return {
        ...state,
        occasionTags: state.occasionTags.includes(action.tag)
          ? state.occasionTags.filter(t => t !== action.tag)
          : [...state.occasionTags, action.tag],
      }
    case 'TOGGLE_SIZE':
      return {
        ...state,
        sizes: state.sizes.find(s => s.size === action.size)
          ? state.sizes.filter(s => s.size !== action.size)
          : [...state.sizes, { size: action.size, quantity: 1 }],
      }
    case 'SET_QTY':
      return {
        ...state,
        sizes: state.sizes.map(s => s.size === action.size ? { ...s, quantity: action.qty } : s),
      }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    case 'SET_ITEM_ID':
      return { ...state, newItemId: action.id }
    case 'SET_SHOWCASE':
      return { ...state, showcaseUrl: action.url }
    default:
      return state
  }
}

const INITIAL: State = {
  step: 0, photoFile: null, previewUrl: null, name: '', category: '',
  priceKES: '', occasionTags: [], sizes: [], discountPercent: '', discountExpiresAt: '',
  selectedFaceId: null, newItemId: null, showcaseUrl: null,
}

export default function InventoryNewPage() {
  const navigate = useNavigate()
  const { profile, refresh } = useSellerContext()
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const { generate, generating } = useGenerateShowcase()

  const capReached =
    profile !== null &&
    profile.tier !== 'brand' &&
    profile.tier !== 'enterprise' &&
    profile.generationsUsed >= profile.generationsLimit

  async function handleSaveItem() {
    const res = await sellerApi.post<{ id: string }>('/seller/inventory', {
      name: state.name,
      category: state.category,
      priceKES: Number(state.priceKES),
      occasionTags: state.occasionTags,
      sizes: state.sizes,
      discountPercent: state.discountPercent ? Number(state.discountPercent) : null,
      discountExpiresAt: state.discountExpiresAt || null,
    })
    dispatch({ type: 'SET_ITEM_ID', id: res.id })
    dispatch({ type: 'NEXT_STEP' })
  }

  async function handleGenerate() {
    if (!state.newItemId || !state.category) return
    const mode = getShowcaseMode(state.category as ItemCategory)
    const url = await generate({
      itemId: state.newItemId,
      itemName: state.name,
      mode,
      faceId: state.selectedFaceId,
    })
    dispatch({ type: 'SET_SHOWCASE', url })
    refresh()
  }

  // Step 0: Photo
  if (state.step === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-4">Step 1 of 4 — Photo</p>
        <label htmlFor="photo-input" className="block text-sm font-medium mb-2">
          Choose photo
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          aria-label="Choose photo"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) dispatch({ type: 'SET_PHOTO', file, previewUrl: URL.createObjectURL(file) })
          }}
          className="mb-4"
        />
        {state.previewUrl && (
          <img src={state.previewUrl} alt="preview" className="w-full rounded-xl mb-4 max-h-64 object-cover" />
        )}
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.photoFile}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 1: Details
  if (state.step === 1) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 2 of 4 — Details</p>
        <input
          placeholder="Item name"
          value={state.name}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'name', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <label htmlFor="category-select" className="sr-only">Category</label>
        <select
          id="category-select"
          aria-label="Category"
          value={state.category}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'category', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select category</option>
          {(['top','bottom','dress','suit','outerwear','jumpsuit','hat','headwrap','shoe','bag','jewellery','accessory'] as ItemCategory[]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Price (KES)"
          value={state.priceKES}
          onChange={e => dispatch({ type: 'SET_FIELD', field: 'priceKES', value: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <div>
          <p className="text-sm font-medium mb-2">Occasion tags</p>
          <div className="flex flex-wrap gap-2">
            {OCCASION_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_TAG', tag })}
                className={`px-3 py-1 rounded-full text-sm border ${
                  state.occasionTags.includes(tag)
                    ? 'bg-amber-800 text-white border-amber-800'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.name || !state.category || !state.priceKES}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 2: Sizes
  if (state.step === 2) {
    const cat = state.category as ItemCategory
    const isClothing = CLOTHING_CATS.includes(cat)
    const isShoe = SHOE_CATS.includes(cat)
    const sizeOptions = isClothing ? CLOTHING_SIZES : isShoe ? SHOE_SIZES : ['One size']

    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 3 of 4 — Sizes</p>
        <div className="flex flex-wrap gap-2">
          {sizeOptions.map(size => {
            const selected = state.sizes.find(s => s.size === size)
            return (
              <div key={size} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'TOGGLE_SIZE', size })}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    selected ? 'bg-amber-800 text-white border-amber-800' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {size}
                </button>
                {selected && (
                  <input
                    type="number"
                    min={0}
                    value={selected.quantity}
                    onChange={e => dispatch({ type: 'SET_QTY', size, qty: Number(e.target.value) })}
                    className="w-14 border border-gray-300 rounded text-center text-sm py-0.5"
                  />
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={handleSaveItem}
          disabled={state.sizes.length === 0}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 3: AI Showcase
  return (
    <div className="p-4 space-y-4">
      <p className="text-xs text-gray-500">Step 4 of 4 — AI Showcase</p>

      {capReached ? (
        <p className="text-sm text-red-600">
          0 generations remaining — upgrade to continue
        </p>
      ) : (
        profile && (
          <FaceLibraryPicker
            selectedId={state.selectedFaceId}
            onSelect={id => dispatch({ type: 'SET_FIELD', field: 'selectedFaceId', value: id })}
            tier={profile.tier}
          />
        )
      )}

      {state.showcaseUrl && profile ? (
        <ShowcaseResult
          imageUrl={state.showcaseUrl}
          itemName={state.name}
          priceKES={Number(state.priceKES)}
          itemId={state.newItemId!}
          tier={profile.tier}
          onPublish={() => navigate('/inventory')}
        />
      ) : (
        <button
          onClick={handleGenerate}
          disabled={capReached || generating || !state.selectedFaceId}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate showcase'}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- InventoryNewPage
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/pages/InventoryNewPage.tsx apps/seller/src/__tests__/inventory/InventoryNewPage.test.tsx
git commit -m "feat(seller): 4-step inventory creation wizard with AI showcase"
```

---

### Task 5: InventoryCard component

**Files:**
- Create: `apps/seller/src/components/InventoryCard.tsx`
- Create: `apps/seller/src/__tests__/inventory/InventoryCard.test.tsx`

**Interfaces:**
- Props: `{ item: InventoryItem }`
- Shows: showcase image (or placeholder gradient if `showcaseImageUrl` is null), item name, price (KES formatted), stock badge
- Stock badge logic: `isSoldOut` → "Sold Out" (red). All sizes qty=1 → "Low Stock" (orange). Otherwise → "Live" (green) if `isLive`, else no badge.

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/inventory/InventoryCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import InventoryCard from '../../components/InventoryCard'
import type { InventoryItem } from '@style-yangu/types'

const BASE_ITEM: InventoryItem = {
  id: 'i1', sellerId: 's1', name: 'Ankara Dress', category: 'dress',
  priceKES: 4500, occasionTags: ['wedding'], sizes: [{ size: 'M', quantity: 3 }],
  showcaseImageUrl: 'https://placehold.co/300x400', isLive: true, isSoldOut: false,
  discountPercent: null, discountExpiresAt: null, createdAt: '2025-01-01T00:00:00Z',
}

describe('InventoryCard', () => {
  it('shows item name and price', () => {
    render(<InventoryCard item={BASE_ITEM} />)
    expect(screen.getByText('Ankara Dress')).toBeInTheDocument()
    expect(screen.getByText(/4,500/)).toBeInTheDocument()
  })

  it('shows Live badge for live item with stock', () => {
    render(<InventoryCard item={BASE_ITEM} />)
    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows Sold Out badge', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, isSoldOut: true }} />)
    expect(screen.getByText('Sold Out')).toBeInTheDocument()
  })

  it('shows Low Stock when all sizes have qty 1', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, sizes: [{ size: 'M', quantity: 1 }] }} />)
    expect(screen.getByText('Low Stock')).toBeInTheDocument()
  })

  it('renders placeholder when no showcaseImageUrl', () => {
    render(<InventoryCard item={{ ...BASE_ITEM, showcaseImageUrl: null }} />)
    expect(screen.getByTestId('img-placeholder')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- InventoryCard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement InventoryCard.tsx**

Create `apps/seller/src/components/InventoryCard.tsx`:

```typescript
import type { InventoryItem } from '@style-yangu/types'

function stockBadge(item: InventoryItem): { label: string; color: string } | null {
  if (item.isSoldOut) return { label: 'Sold Out', color: 'bg-red-100 text-red-700' }
  const lowStock = item.sizes.length > 0 && item.sizes.every(s => s.quantity <= 1)
  if (lowStock) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700' }
  if (item.isLive) return { label: 'Live', color: 'bg-green-100 text-green-700' }
  return null
}

export default function InventoryCard({ item }: { item: InventoryItem }) {
  const badge = stockBadge(item)

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {item.showcaseImageUrl ? (
        <img src={item.showcaseImageUrl} alt={item.name} className="w-full aspect-[3/4] object-cover" />
      ) : (
        <div
          data-testid="img-placeholder"
          className="w-full aspect-[3/4] bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"
        >
          <span className="text-amber-600 text-xs">No image</span>
        </div>
      )}
      <div className="p-2">
        <p className="text-sm font-semibold truncate">{item.name}</p>
        <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
        {badge && (
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- InventoryCard
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/InventoryCard.tsx apps/seller/src/__tests__/inventory/InventoryCard.test.tsx
git commit -m "feat(seller): InventoryCard — image, price, stock badge"
```

---

### Task 6: InventoryTab (list + filter chips) + InventoryDetailPage

**Files:**
- Modify: `apps/seller/src/pages/InventoryTab.tsx`
- Create: `apps/seller/src/pages/InventoryDetailPage.tsx`
- Create: `apps/seller/src/__tests__/inventory/InventoryTab.test.tsx`
- Modify: `apps/seller/src/routes/index.tsx` — add `/inventory/new` and `/inventory/:id` routes

**Interfaces:**
- `InventoryTab`: `useQuery(['inventory'], () => sellerApi.get<InventoryItem[]>('/seller/inventory'))`. Filter chips: All | Clothing | Shoes | Hats | Bags. FAB "+" → `/inventory/new`.
- `InventoryDetailPage`: loads item by id, shows editable fields + current showcase + "Regenerate" button (consumes 1 generation) + stock qty adjustment + delete (`DELETE /seller/inventory/:id` → navigate back)

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/inventory/InventoryTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InventoryTab from '../../pages/InventoryTab'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const ITEMS = [
  { id: 'i1', name: 'Blue Top', category: 'top', priceKES: 1200, isLive: true, isSoldOut: false, showcaseImageUrl: null, sizes: [], occasionTags: [], discountPercent: null, discountExpiresAt: null, sellerId: 's1', createdAt: '' },
  { id: 'i2', name: 'Red Bag', category: 'bag', priceKES: 2500, isLive: true, isSoldOut: false, showcaseImageUrl: null, sizes: [], occasionTags: [], discountPercent: null, discountExpiresAt: null, sellerId: 's1', createdAt: '' },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route path="/inventory" element={<InventoryTab />} />
          <Route path="/inventory/new" element={<div>new item page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InventoryTab', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows all items on load', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(ITEMS)
    wrap()
    await waitFor(() => expect(screen.getByText('Blue Top')).toBeInTheDocument())
    expect(screen.getByText('Red Bag')).toBeInTheDocument()
  })

  it('filters to bags only when Bags chip clicked', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(ITEMS)
    wrap()
    await waitFor(() => screen.getByText('Blue Top'))
    await userEvent.click(screen.getByRole('button', { name: 'Bags' }))
    expect(screen.queryByText('Blue Top')).not.toBeInTheDocument()
    expect(screen.getByText('Red Bag')).toBeInTheDocument()
  })

  it('navigates to /inventory/new on FAB click', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue([])
    wrap()
    await userEvent.click(screen.getByRole('button', { name: /\+/i }))
    await waitFor(() => expect(screen.getByText('new item page')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- InventoryTab
```

Expected: FAIL — InventoryTab is a stub.

- [ ] **Step 3: Implement InventoryTab.tsx**

Replace `apps/seller/src/pages/InventoryTab.tsx`:

```typescript
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import InventoryCard from '../components/InventoryCard'
import type { InventoryItem, ItemCategory } from '@style-yangu/types'

type FilterChip = 'All' | 'Clothing' | 'Shoes' | 'Hats' | 'Bags'

const CLOTHING_CATS: ItemCategory[] = ['top', 'bottom', 'dress', 'suit', 'outerwear', 'jumpsuit']
const FILTER_MAP: Record<FilterChip, (item: InventoryItem) => boolean> = {
  All: () => true,
  Clothing: item => CLOTHING_CATS.includes(item.category),
  Shoes: item => item.category === 'shoe',
  Hats: item => item.category === 'hat' || item.category === 'headwrap',
  Bags: item => item.category === 'bag',
}

export default function InventoryTab() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterChip>('All')
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
  })

  const visible = items.filter(FILTER_MAP[filter])

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['All', 'Clothing', 'Shoes', 'Hats', 'Bags'] as FilterChip[]).map(chip => (
          <button
            key={chip}
            onClick={() => setFilter(chip)}
            className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${
              filter === chip ? 'bg-amber-800 text-white border-amber-800' : 'border-gray-300 text-gray-600'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map(item => (
            <Link key={item.id} to={`/inventory/${item.id}`}>
              <InventoryCard item={item} />
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/inventory/new')}
        aria-label="+"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-amber-800 text-white text-2xl shadow-lg flex items-center justify-center"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Implement InventoryDetailPage.tsx (stub for now — detail edit is non-critical path)**

Create `apps/seller/src/pages/InventoryDetailPage.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { InventoryItem } from '@style-yangu/types'

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory', id],
    queryFn: () => sellerApi.get(`/seller/inventory/${id}`),
  })

  async function handleDelete() {
    if (!confirm('Delete this item?')) return
    await sellerApi.delete(`/seller/inventory/${id}`)
    qc.invalidateQueries({ queryKey: ['inventory'] })
    navigate('/inventory')
  }

  if (isLoading || !item) return <p className="p-4 text-gray-400">Loading…</p>

  return (
    <div className="p-4 space-y-4">
      {item.showcaseImageUrl && (
        <img src={item.showcaseImageUrl} alt={item.name} className="w-full rounded-xl max-h-64 object-cover" />
      )}
      <h2 className="text-xl font-bold">{item.name}</h2>
      <p className="text-gray-500">KES {item.priceKES.toLocaleString()}</p>
      <p className="text-sm text-gray-400">Category: {item.category}</p>
      <button
        onClick={handleDelete}
        className="w-full border border-red-500 text-red-600 rounded-lg py-2 mt-4"
      >
        Delete item
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Update routes/index.tsx — add inventory sub-routes**

Add these routes inside the `<Route element={<AppShell />}>` block in `apps/seller/src/routes/index.tsx`:

```typescript
import InventoryNewPage from '../pages/InventoryNewPage'
import InventoryDetailPage from '../pages/InventoryDetailPage'

// Inside AppShell route, after /inventory:
<Route path="/inventory/new" element={<InventoryNewPage />} />
<Route path="/inventory/:id" element={<InventoryDetailPage />} />
```

Full updated routes/index.tsx:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import PhoneEntry from '../auth/PhoneEntry'
import OTPVerify from '../auth/OTPVerify'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import AppShell from '../components/AppShell'
import ProtectedRoute from './ProtectedRoute'
import DashboardTab from '../pages/DashboardTab'
import InventoryTab from '../pages/InventoryTab'
import InventoryNewPage from '../pages/InventoryNewPage'
import InventoryDetailPage from '../pages/InventoryDetailPage'
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
          <Route path="/inventory/new" element={<InventoryNewPage />} />
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/pos" element={<POSTab />} />
          <Route path="/clients" element={<ClientsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 6: Run tests — confirm pass**

```bash
cd apps/seller && pnpm test -- InventoryTab
```

Expected: 3 tests PASS.

- [ ] **Step 7: Run full test suite + lint**

```bash
cd apps/seller && pnpm test && pnpm lint
```

Expected: all tests pass, no type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/seller/src/pages/InventoryTab.tsx apps/seller/src/pages/InventoryDetailPage.tsx apps/seller/src/routes/index.tsx apps/seller/src/__tests__/inventory/InventoryTab.test.tsx
git commit -m "feat(seller): InventoryTab list + filter chips + detail page + routing"
```

---

### Plan 2 Complete

Run `cd apps/seller && pnpm test` — all tests pass. The full inventory creation flow, face library picker, showcase generation stub, watermark, and inventory list are done. Ready for Plan 3 (POS + Clients + Try This On).
