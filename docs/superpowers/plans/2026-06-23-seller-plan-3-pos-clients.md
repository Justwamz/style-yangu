# Seller App — Plan 3: POS + Client List + Try This On

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the POS home (today's summary + outstanding + recent transactions), 4-step record-sale flow with WhatsApp receipt option, client list with search, add-client bottom sheet, client detail with purchase history, and "Try This On" send flow with monthly-limit enforcement.

**Architecture:** POS and Clients data fetched via React Query. POS record-sale flow uses local multi-step state (no sub-routes). Client list and detail use `/clients` and `/clients/:id` routes. Try This On uses a bottom sheet in the detail page — item picker + optional note + `POST /seller/clients/:id/try-on`. Monthly send limit displayed from client detail response.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, React Router v6, Vitest, @tanstack/react-query, sellerApi.

## Global Constraints

- POS payment methods: `mpesa | cash | bank_transfer | card`
- Payment statuses: `paid | partially_paid | owing`
- WhatsApp receipt: `wa.me/[number]?text=[encoded]`
- Try This On monthly limits — Hustler: 10, Boutique: 50, Brand: 200. Show "X of Y sends remaining this month"
- Client list hidden for `free_trial` (tab not rendered — enforced in AppShell via `useTierGate`)
- TDD: write failing test → confirm fail → implement → confirm pass → commit

---

### Task 1: POSTransactionCard component

**Files:**
- Create: `apps/seller/src/components/POSTransactionCard.tsx`
- Create: `apps/seller/src/__tests__/pos/POSTransactionCard.test.tsx`

**Interfaces:**
- Props: `{ tx: POSTransaction }`
- Shows: item name, finalPriceKES (formatted KES), payment method, payment status badge
- Status badge colours: `paid` → green, `partially_paid` → orange, `owing` → red

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/pos/POSTransactionCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import POSTransactionCard from '../../components/POSTransactionCard'
import type { POSTransaction } from '@style-yangu/types'

const BASE_TX: POSTransaction = {
  id: 'tx1', sellerId: 's1', itemId: 'i1', itemName: 'Blue Dress',
  listedPriceKES: 3500, finalPriceKES: 3200, paymentMethod: 'mpesa',
  paymentStatus: 'paid', clientNickname: 'Aisha', clientUsername: '@aisha_ke',
  whatsappNumber: '+254700000001', createdAt: '2025-06-20T10:00:00Z',
}

describe('POSTransactionCard', () => {
  it('shows item name and final price', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    expect(screen.getByText('Blue Dress')).toBeInTheDocument()
    expect(screen.getByText(/3,200/)).toBeInTheDocument()
  })

  it('shows payment method', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    expect(screen.getByText(/mpesa/i)).toBeInTheDocument()
  })

  it('shows green Paid badge for paid status', () => {
    render(<POSTransactionCard tx={BASE_TX} />)
    const badge = screen.getByText('Paid')
    expect(badge).toHaveClass('text-green-700')
  })

  it('shows red Owing badge for owing status', () => {
    render(<POSTransactionCard tx={{ ...BASE_TX, paymentStatus: 'owing' }} />)
    const badge = screen.getByText('Owing')
    expect(badge).toHaveClass('text-red-700')
  })

  it('shows orange Partially Paid badge', () => {
    render(<POSTransactionCard tx={{ ...BASE_TX, paymentStatus: 'partially_paid' }} />)
    const badge = screen.getByText('Partially Paid')
    expect(badge).toHaveClass('text-orange-700')
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- POSTransactionCard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement POSTransactionCard.tsx**

Create `apps/seller/src/components/POSTransactionCard.tsx`:

```typescript
import type { POSTransaction } from '@style-yangu/types'

const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-orange-100 text-orange-700',
  owing: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  owing: 'Owing',
}

export default function POSTransactionCard({ tx }: { tx: POSTransaction }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-semibold">{tx.itemName}</p>
        <p className="text-xs text-gray-500 capitalize">{tx.paymentMethod}</p>
        {tx.clientNickname && (
          <p className="text-xs text-gray-400">{tx.clientNickname}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="text-sm font-bold">KES {tx.finalPriceKES.toLocaleString()}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[tx.paymentStatus]}`}>
          {STATUS_LABEL[tx.paymentStatus]}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- POSTransactionCard
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/POSTransactionCard.tsx apps/seller/src/__tests__/pos/POSTransactionCard.test.tsx
git commit -m "feat(seller): POSTransactionCard component with status badges"
```

---

### Task 2: POSTab home (summary + transactions)

**Files:**
- Modify: `apps/seller/src/pages/POSTab.tsx`
- Create: `apps/seller/src/__tests__/pos/POSTab.test.tsx`

**Interfaces:**
- `useQuery(['pos', 'summary'], () => sellerApi.get<POSSummary>('/seller/pos/summary'))` → shows today's revenue + items sold + outstanding
- `useQuery(['pos', 'transactions'], () => sellerApi.get<POSTransaction[]>('/seller/pos/transactions?scope=today'))` → recent list
- FAB "Record Sale" → navigates to `/pos/new`

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/pos/POSTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import POSTab from '../../pages/POSTab'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const SUMMARY = { todayRevenueKES: 12500, todayItemsSold: 3, outstandingCount: 1, outstandingKES: 2000 }
const TXS = [
  { id: 'tx1', sellerId: 's1', itemId: 'i1', itemName: 'Blue Top', listedPriceKES: 1200, finalPriceKES: 1200, paymentMethod: 'mpesa', paymentStatus: 'paid', clientNickname: null, clientUsername: null, whatsappNumber: null, createdAt: '' },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route path="/pos" element={<POSTab />} />
          <Route path="/pos/new" element={<div>new sale page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('POSTab', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows today revenue and items sold', async () => {
    vi.spyOn(sellerApi, 'get').mockImplementation((path: string) => {
      if (path.includes('summary')) return Promise.resolve(SUMMARY)
      return Promise.resolve(TXS)
    })
    wrap()
    await waitFor(() => expect(screen.getByText(/12,500/)).toBeInTheDocument())
    expect(screen.getByText(/3 items/i)).toBeInTheDocument()
  })

  it('shows outstanding badge when outstandingCount > 0', async () => {
    vi.spyOn(sellerApi, 'get').mockImplementation((path: string) => {
      if (path.includes('summary')) return Promise.resolve(SUMMARY)
      return Promise.resolve(TXS)
    })
    wrap()
    await waitFor(() => expect(screen.getByText(/1 outstanding/i)).toBeInTheDocument())
  })

  it('navigates to /pos/new on Record Sale click', async () => {
    vi.spyOn(sellerApi, 'get').mockImplementation(() => Promise.resolve([]))
    wrap()
    await userEvent.click(screen.getByRole('button', { name: /record sale/i }))
    await waitFor(() => expect(screen.getByText('new sale page')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- POSTab
```

Expected: FAIL — POSTab is a stub.

- [ ] **Step 3: Implement POSTab.tsx**

Replace `apps/seller/src/pages/POSTab.tsx`:

```typescript
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import POSTransactionCard from '../components/POSTransactionCard'
import type { POSSummary, POSTransaction } from '@style-yangu/types'

export default function POSTab() {
  const navigate = useNavigate()
  const { data: summary } = useQuery<POSSummary>({
    queryKey: ['pos', 'summary'],
    queryFn: () => sellerApi.get('/seller/pos/summary'),
  })
  const { data: transactions = [] } = useQuery<POSTransaction[]>({
    queryKey: ['pos', 'transactions'],
    queryFn: () => sellerApi.get('/seller/pos/transactions?scope=today'),
  })

  return (
    <div className="p-4 space-y-4">
      {summary && (
        <div className="bg-amber-50 rounded-2xl p-4 space-y-1">
          <p className="text-2xl font-bold" style={{ color: '#8B4513' }}>
            KES {summary.todayRevenueKES.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">{summary.todayItemsSold} items sold today</p>
          {summary.outstandingCount > 0 && (
            <p className="text-sm text-orange-700">
              {summary.outstandingCount} outstanding · KES {summary.outstandingKES.toLocaleString()}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/pos/new')}
        className="w-full bg-amber-800 text-white rounded-xl py-3 font-semibold"
      >
        Record Sale
      </button>

      {transactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Today</p>
          {transactions.map(tx => (
            <POSTransactionCard key={tx.id} tx={tx} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- POSTab
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/pages/POSTab.tsx apps/seller/src/__tests__/pos/POSTab.test.tsx
git commit -m "feat(seller): POSTab — summary card, outstanding, transactions list"
```

---

### Task 3: Record Sale flow (POSNewPage — 4 steps)

**Files:**
- Create: `apps/seller/src/pages/POSNewPage.tsx`
- Create: `apps/seller/src/__tests__/pos/POSNewPage.test.tsx`
- Modify: `apps/seller/src/routes/index.tsx` — add `/pos/new`

**Interfaces:**
- Step 0 (Item): search/select from inventory (`GET /seller/inventory`) or type custom name
- Step 1 (Price): listed price pre-filled from selected item; seller edits for negotiated price
- Step 2 (Payment): method radio (M-Pesa / Cash / Bank Transfer / Card), status radio (Paid / Partially Paid / Owing)
- Step 3 (Client): search existing clients by nickname OR skip
- On confirm: `POST /seller/pos/transactions` `{ itemId, itemName, listedPriceKES, finalPriceKES, paymentMethod, paymentStatus, clientId }` → WhatsApp receipt option → navigate to `/pos`

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/pos/POSNewPage.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import POSNewPage from '../../pages/POSNewPage'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const INVENTORY = [
  { id: 'i1', name: 'Blue Dress', priceKES: 3500, category: 'dress', isLive: true, isSoldOut: false },
]
const CLIENTS = [
  { id: 'c1', sellerId: 's1', nickname: 'Aisha', consumerUsername: '@aisha', lastPurchaseDate: null, tryOnSent: 0, tryOnActed: 0 },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/pos/new']}>
        <Routes>
          <Route path="/pos/new" element={<POSNewPage />} />
          <Route path="/pos" element={<div>pos home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('POSNewPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(sellerApi, 'get').mockImplementation((path: string) => {
      if (path.includes('inventory')) return Promise.resolve(INVENTORY)
      if (path.includes('clients')) return Promise.resolve(CLIENTS)
      return Promise.resolve([])
    })
  })

  it('shows item search on step 1', async () => {
    wrap()
    await waitFor(() => expect(screen.getByPlaceholderText(/search or type item/i)).toBeInTheDocument())
  })

  it('advances to price step after selecting inventory item', async () => {
    wrap()
    await waitFor(() => screen.getByPlaceholderText(/search or type item/i))
    await userEvent.click(screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/negotiated price/i)).toBeInTheDocument())
  })

  it('posts transaction and navigates to /pos on confirm', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ id: 'tx-new' })
    wrap()
    // Step 0 — select item
    await waitFor(() => screen.getByPlaceholderText(/search or type item/i))
    await userEvent.click(screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    // Step 1 — price
    await waitFor(() => screen.getByText(/negotiated price/i))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    // Step 2 — payment
    await waitFor(() => screen.getByText(/payment method/i))
    await userEvent.click(screen.getByLabelText(/m-pesa/i))
    await userEvent.click(screen.getByLabelText(/^paid$/i))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    // Step 3 — client (skip)
    await waitFor(() => screen.getByText(/attach client/i))
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText('pos home')).toBeInTheDocument())
    expect(sellerApi.post).toHaveBeenCalledWith(
      '/seller/pos/transactions',
      expect.objectContaining({ itemName: 'Blue Dress', paymentMethod: 'mpesa', paymentStatus: 'paid' })
    )
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- POSNewPage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement POSNewPage.tsx**

Create `apps/seller/src/pages/POSNewPage.tsx`:

```typescript
import { useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { InventoryItem, SellerClient } from '@style-yangu/types'

type PaymentMethod = 'mpesa' | 'cash' | 'bank_transfer' | 'card'
type PaymentStatus = 'paid' | 'partially_paid' | 'owing'

interface State {
  step: number
  selectedItemId: string | null
  customItemName: string
  listedPriceKES: number
  finalPriceKES: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  selectedClientId: string | null
}

const INITIAL: State = {
  step: 0, selectedItemId: null, customItemName: '', listedPriceKES: 0,
  finalPriceKES: 0, paymentMethod: 'mpesa', paymentStatus: 'paid', selectedClientId: null,
}

type Action =
  | { type: 'SELECT_ITEM'; item: InventoryItem }
  | { type: 'SET_CUSTOM_NAME'; name: string }
  | { type: 'SET_FINAL_PRICE'; price: number }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_PAYMENT_STATUS'; status: PaymentStatus }
  | { type: 'SELECT_CLIENT'; id: string }
  | { type: 'NEXT_STEP' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_ITEM':
      return { ...state, selectedItemId: action.item.id, customItemName: action.item.name, listedPriceKES: action.item.priceKES, finalPriceKES: action.item.priceKES }
    case 'SET_CUSTOM_NAME':
      return { ...state, customItemName: action.name, selectedItemId: null }
    case 'SET_FINAL_PRICE':
      return { ...state, finalPriceKES: action.price }
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method }
    case 'SET_PAYMENT_STATUS':
      return { ...state, paymentStatus: action.status }
    case 'SELECT_CLIENT':
      return { ...state, selectedClientId: action.id }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    default:
      return state
  }
}

function buildWhatsAppReceipt(
  nickname: string,
  businessName: string,
  itemName: string,
  amount: number,
  method: string,
  date: string
): string {
  return encodeURIComponent(
    `Hi ${nickname}, thank you for your purchase from ${businessName}.\nItem: ${itemName}\nAmount paid: KES ${amount.toLocaleString()}\nPayment: ${method}\nDate: ${date}\nQuestions? Reply to this message.\nPowered by Style Yangu`
  )
}

export default function POSNewPage() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const [itemSearch, setItemSearch] = useState('')

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
  })
  const { data: clients = [] } = useQuery<SellerClient[]>({
    queryKey: ['clients'],
    queryFn: () => sellerApi.get('/seller/clients'),
  })

  const filteredInventory = inventory.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  )

  async function handleConfirm(clientId: string | null) {
    await sellerApi.post('/seller/pos/transactions', {
      itemId: state.selectedItemId,
      itemName: state.customItemName,
      listedPriceKES: state.listedPriceKES,
      finalPriceKES: state.finalPriceKES,
      paymentMethod: state.paymentMethod,
      paymentStatus: state.paymentStatus,
      clientId,
    })
    navigate('/pos')
  }

  // Step 0: Item selection
  if (state.step === 0) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">Step 1 of 4 — Item</p>
        <input
          placeholder="Search or type item name"
          value={itemSearch}
          onChange={e => {
            setItemSearch(e.target.value)
            if (e.target.value) dispatch({ type: 'SET_CUSTOM_NAME', name: e.target.value })
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredInventory.map(item => (
            <button
              key={item.id}
              onClick={() => dispatch({ type: 'SELECT_ITEM', item })}
              className={`w-full text-left p-2 rounded-lg border ${
                state.selectedItemId === item.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
            </button>
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.customItemName}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 1: Price
  if (state.step === 1) {
    return (
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">Step 2 of 4 — Price</p>
        <p className="text-sm text-gray-600">Listed price: KES {state.listedPriceKES.toLocaleString()}</p>
        <label className="block text-sm font-medium">Negotiated price (KES)</label>
        <input
          type="number"
          value={state.finalPriceKES || ''}
          onChange={e => dispatch({ type: 'SET_FINAL_PRICE', price: Number(e.target.value) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        />
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          disabled={!state.finalPriceKES}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 2: Payment
  if (state.step === 2) {
    return (
      <div className="p-4 space-y-4">
        <p className="text-xs text-gray-500">Step 3 of 4 — Payment</p>
        <div>
          <p className="text-sm font-medium mb-2">Payment method</p>
          {(['mpesa', 'cash', 'bank_transfer', 'card'] as PaymentMethod[]).map(method => (
            <label key={method} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="method"
                value={method}
                checked={state.paymentMethod === method}
                onChange={() => dispatch({ type: 'SET_PAYMENT_METHOD', method })}
                aria-label={method === 'mpesa' ? 'M-Pesa' : method === 'bank_transfer' ? 'Bank Transfer' : method.charAt(0).toUpperCase() + method.slice(1)}
              />
              <span className="text-sm capitalize">{method === 'mpesa' ? 'M-Pesa' : method.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Payment status</p>
          {([['paid', 'Paid'], ['partially_paid', 'Partially Paid'], ['owing', 'Owing']] as [PaymentStatus, string][]).map(([status, label]) => (
            <label key={status} className="flex items-center gap-2 mb-2">
              <input
                type="radio"
                name="status"
                value={status}
                checked={state.paymentStatus === status}
                onChange={() => dispatch({ type: 'SET_PAYMENT_STATUS', status })}
                aria-label={label}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => dispatch({ type: 'NEXT_STEP' })}
          className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold"
        >
          Next
        </button>
      </div>
    )
  }

  // Step 3: Client (optional)
  const selectedClient = clients.find(c => c.id === state.selectedClientId)
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-gray-500">Step 4 of 4 — Attach client (optional)</p>
      <p className="text-sm text-gray-600">Attach client to this sale</p>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {clients.map(client => (
          <button
            key={client.id}
            onClick={() => dispatch({ type: 'SELECT_CLIENT', id: client.id })}
            className={`w-full text-left p-2 rounded-lg border ${
              state.selectedClientId === client.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
            }`}
          >
            <p className="text-sm font-medium">{client.nickname}</p>
            <p className="text-xs text-gray-500">{client.consumerUsername}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleConfirm(state.selectedClientId)}
          className="flex-1 bg-amber-800 text-white rounded-lg py-3 font-semibold"
        >
          Confirm
        </button>
        <button
          onClick={() => handleConfirm(null)}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-3 font-semibold"
        >
          Skip
        </button>
      </div>
      {selectedClient?.whatsappNumber && (
        <button
          onClick={() => {
            const today = new Date().toLocaleDateString('en-KE')
            const text = buildWhatsAppReceipt(
              selectedClient.nickname, 'Your Store',
              state.customItemName, state.finalPriceKES, state.paymentMethod, today
            )
            window.open(`https://wa.me/${selectedClient.whatsappNumber}?text=${text}`, '_blank')
          }}
          className="w-full border border-green-600 text-green-700 rounded-lg py-2 text-sm"
        >
          Send WhatsApp Receipt
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Update routes/index.tsx — add /pos/new**

Add `import POSNewPage from '../pages/POSNewPage'` and `<Route path="/pos/new" element={<POSNewPage />} />` inside the AppShell route block.

Full updated routes/index.tsx (replace entire file):

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
import POSNewPage from '../pages/POSNewPage'
import ClientsTab from '../pages/ClientsTab'
import ClientDetailPage from '../pages/ClientDetailPage'
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
          <Route path="/pos/new" element={<POSNewPage />} />
          <Route path="/clients" element={<ClientsTab />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Route>
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 5: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- POSNewPage
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/seller/src/pages/POSNewPage.tsx apps/seller/src/routes/index.tsx apps/seller/src/__tests__/pos/POSNewPage.test.tsx
git commit -m "feat(seller): 4-step record sale flow with WhatsApp receipt option"
```

---

### Task 4: ClientCard component

**Files:**
- Create: `apps/seller/src/components/ClientCard.tsx`
- Create: `apps/seller/src/__tests__/clients/ClientCard.test.tsx`

**Interfaces:**
- Props: `{ client: SellerClient }`
- Shows: nickname (bold), consumerUsername (muted), last purchase date, try-on stats (sent / acted)

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/clients/ClientCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ClientCard from '../../components/ClientCard'
import type { SellerClient } from '@style-yangu/types'

const CLIENT: SellerClient = {
  id: 'c1', sellerId: 's1', nickname: 'Aisha',
  consumerUsername: '@aisha_ke', lastPurchaseDate: '2025-06-10T00:00:00Z',
  tryOnSent: 3, tryOnActed: 1,
}

describe('ClientCard', () => {
  it('shows nickname and username', () => {
    render(<ClientCard client={CLIENT} />)
    expect(screen.getByText('Aisha')).toBeInTheDocument()
    expect(screen.getByText('@aisha_ke')).toBeInTheDocument()
  })

  it('shows try-on stats', () => {
    render(<ClientCard client={CLIENT} />)
    expect(screen.getByText(/3 sent/i)).toBeInTheDocument()
    expect(screen.getByText(/1 acted/i)).toBeInTheDocument()
  })

  it('shows — when no last purchase date', () => {
    render(<ClientCard client={{ ...CLIENT, lastPurchaseDate: null }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- ClientCard
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ClientCard.tsx**

Create `apps/seller/src/components/ClientCard.tsx`:

```typescript
import type { SellerClient } from '@style-yangu/types'

export default function ClientCard({ client }: { client: SellerClient }) {
  const lastPurchase = client.lastPurchaseDate
    ? new Date(client.lastPurchaseDate).toLocaleDateString('en-KE')
    : '—'

  return (
    <div className="border border-gray-100 rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold">{client.nickname}</p>
          <p className="text-xs text-gray-400">{client.consumerUsername}</p>
        </div>
        <p className="text-xs text-gray-400">{lastPurchase}</p>
      </div>
      <div className="flex gap-4 mt-2">
        <p className="text-xs text-gray-500">{client.tryOnSent} sent</p>
        <p className="text-xs text-gray-500">{client.tryOnActed} acted</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- ClientCard
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/components/ClientCard.tsx apps/seller/src/__tests__/clients/ClientCard.test.tsx
git commit -m "feat(seller): ClientCard component"
```

---

### Task 5: ClientsTab (list + search + add client)

**Files:**
- Modify: `apps/seller/src/pages/ClientsTab.tsx`
- Create: `apps/seller/src/__tests__/clients/ClientsTab.test.tsx`

**Interfaces:**
- `useQuery(['clients'], () => sellerApi.get<SellerClient[]>('/seller/clients'))`
- Search bar filters list by nickname (client-side)
- "Add Client" button → bottom sheet: Style Yangu username input + nickname input → `POST /seller/clients` → invalidate query

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/clients/ClientsTab.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ClientsTab from '../../pages/ClientsTab'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const CLIENTS = [
  { id: 'c1', sellerId: 's1', nickname: 'Aisha', consumerUsername: '@aisha', lastPurchaseDate: null, tryOnSent: 0, tryOnActed: 0 },
  { id: 'c2', sellerId: 's1', nickname: 'Beatrice', consumerUsername: '@bea', lastPurchaseDate: null, tryOnSent: 0, tryOnActed: 0 },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/clients']}>
        <Routes>
          <Route path="/clients" element={<ClientsTab />} />
          <Route path="/clients/:id" element={<div>client detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClientsTab', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows all clients', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(CLIENTS)
    wrap()
    await waitFor(() => expect(screen.getByText('Aisha')).toBeInTheDocument())
    expect(screen.getByText('Beatrice')).toBeInTheDocument()
  })

  it('filters clients by nickname search', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue(CLIENTS)
    wrap()
    await waitFor(() => screen.getByText('Aisha'))
    await userEvent.type(screen.getByPlaceholderText(/search clients/i), 'bea')
    expect(screen.queryByText('Aisha')).not.toBeInTheDocument()
    expect(screen.getByText('Beatrice')).toBeInTheDocument()
  })

  it('opens add client sheet and posts new client', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue([])
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ id: 'c-new' })
    wrap()
    await userEvent.click(screen.getByRole('button', { name: /add client/i }))
    await waitFor(() => expect(screen.getByPlaceholderText(/@username/i)).toBeInTheDocument())
    await userEvent.type(screen.getByPlaceholderText(/@username/i), '@grace_ke')
    await userEvent.type(screen.getByPlaceholderText(/nickname/i), 'Grace')
    await userEvent.click(screen.getByRole('button', { name: /add$/i }))
    await waitFor(() =>
      expect(sellerApi.post).toHaveBeenCalledWith('/seller/clients', {
        consumerUsername: '@grace_ke',
        nickname: 'Grace',
      })
    )
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- ClientsTab
```

Expected: FAIL — ClientsTab is a stub.

- [ ] **Step 3: Implement ClientsTab.tsx**

Replace `apps/seller/src/pages/ClientsTab.tsx`:

```typescript
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import ClientCard from '../components/ClientCard'
import type { SellerClient } from '@style-yangu/types'

export default function ClientsTab() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [username, setUsername] = useState('')
  const [nickname, setNickname] = useState('')

  const { data: clients = [] } = useQuery<SellerClient[]>({
    queryKey: ['clients'],
    queryFn: () => sellerApi.get('/seller/clients'),
  })

  const filtered = clients.filter(c =>
    c.nickname.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAddClient() {
    await sellerApi.post('/seller/clients', { consumerUsername: username, nickname })
    qc.invalidateQueries({ queryKey: ['clients'] })
    setShowSheet(false)
    setUsername('')
    setNickname('')
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <input
          placeholder="Search clients"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={() => setShowSheet(true)}
          className="px-3 py-2 bg-amber-800 text-white rounded-lg text-sm font-semibold"
        >
          Add client
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(client => (
          <Link key={client.id} to={`/clients/${client.id}`}>
            <ClientCard client={client} />
          </Link>
        ))}
      </div>

      {showSheet && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowSheet(false)}>
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Add client</h3>
            <input
              placeholder="@username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <input
              placeholder="Nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleAddClient}
              disabled={!username || !nickname}
              className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- ClientsTab
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/seller/src/pages/ClientsTab.tsx apps/seller/src/__tests__/clients/ClientsTab.test.tsx
git commit -m "feat(seller): ClientsTab — list, search, add client bottom sheet"
```

---

### Task 6: ClientDetailPage + Try This On

**Files:**
- Create: `apps/seller/src/pages/ClientDetailPage.tsx`
- Create: `apps/seller/src/__tests__/clients/ClientDetailPage.test.tsx`

**Interfaces:**
- `GET /seller/clients/:id` → `SellerClient & { tryOnLimit: number; tryOnUsedThisMonth: number; purchaseHistory: POSTransaction[] }`
- "Send item" button → item picker (live inventory list) + optional note input → `POST /seller/clients/:id/try-on` `{ itemId, note }`
- Monthly limit display: "X of Y sends remaining this month". At 0: button disabled + upgrade CTA

- [ ] **Step 1: Write failing test**

Create `apps/seller/src/__tests__/clients/ClientDetailPage.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ClientDetailPage from '../../pages/ClientDetailPage'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const CLIENT_DETAIL = {
  id: 'c1', sellerId: 's1', nickname: 'Aisha', consumerUsername: '@aisha',
  lastPurchaseDate: null, tryOnSent: 3, tryOnActed: 1,
  tryOnLimit: 10, tryOnUsedThisMonth: 3, purchaseHistory: [],
}
const INVENTORY = [
  { id: 'i1', name: 'Blue Dress', priceKES: 3500, isLive: true, isSoldOut: false },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/clients/c1']}>
        <Routes>
          <Route path="/clients/:id" element={<ClientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClientDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(sellerApi, 'get').mockImplementation((path: string) => {
      if (path.includes('inventory')) return Promise.resolve(INVENTORY)
      return Promise.resolve(CLIENT_DETAIL)
    })
  })

  it('shows client nickname and try-on remaining count', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('Aisha')).toBeInTheDocument())
    expect(screen.getByText(/7 of 10 sends remaining/i)).toBeInTheDocument()
  })

  it('shows item picker when Send item clicked', async () => {
    wrap()
    await waitFor(() => screen.getByText('Aisha'))
    await userEvent.click(screen.getByRole('button', { name: /send item/i }))
    await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())
  })

  it('posts try-on and closes picker', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    wrap()
    await waitFor(() => screen.getByText('Aisha'))
    await userEvent.click(screen.getByRole('button', { name: /send item/i }))
    await waitFor(() => screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByRole('button', { name: /send$/i }))
    await waitFor(() =>
      expect(sellerApi.post).toHaveBeenCalledWith(
        '/seller/clients/c1/try-on',
        expect.objectContaining({ itemId: 'i1' })
      )
    )
  })

  it('disables Send item button when monthly limit reached', async () => {
    vi.spyOn(sellerApi, 'get').mockImplementation((path: string) => {
      if (path.includes('inventory')) return Promise.resolve(INVENTORY)
      return Promise.resolve({ ...CLIENT_DETAIL, tryOnUsedThisMonth: 10 })
    })
    wrap()
    await waitFor(() => screen.getByText('Aisha'))
    expect(screen.getByRole('button', { name: /send item/i })).toBeDisabled()
    expect(screen.getByText(/0 of 10 sends remaining/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm fail**

```bash
cd apps/seller && pnpm test -- ClientDetailPage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ClientDetailPage.tsx**

Create `apps/seller/src/pages/ClientDetailPage.tsx`:

```typescript
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { SellerClient, InventoryItem, POSTransaction } from '@style-yangu/types'

interface ClientDetail extends SellerClient {
  tryOnLimit: number
  tryOnUsedThisMonth: number
  purchaseHistory: POSTransaction[]
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const { data: client, isLoading } = useQuery<ClientDetail>({
    queryKey: ['clients', id],
    queryFn: () => sellerApi.get(`/seller/clients/${id}`),
  })

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
    enabled: showPicker,
  })

  if (isLoading || !client) return <p className="p-4 text-gray-400">Loading…</p>

  const remaining = client.tryOnLimit - client.tryOnUsedThisMonth
  const atLimit = remaining <= 0

  async function handleSend() {
    if (!selectedItemId) return
    await sellerApi.post(`/seller/clients/${id}/try-on`, { itemId: selectedItemId, note: note || null })
    qc.invalidateQueries({ queryKey: ['clients', id] })
    setShowPicker(false)
    setSelectedItemId(null)
    setNote('')
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">{client.nickname}</h2>
        <p className="text-sm text-gray-400">{client.consumerUsername}</p>
      </div>

      <div className="flex gap-4 text-sm text-gray-600">
        <span>{client.tryOnSent} try-ons sent</span>
        <span>{client.tryOnActed} acted</span>
      </div>

      <div className={`text-sm ${atLimit ? 'text-red-600' : 'text-gray-600'}`}>
        {remaining} of {client.tryOnLimit} sends remaining this month
      </div>

      <button
        onClick={() => setShowPicker(true)}
        disabled={atLimit}
        className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        Send item
      </button>

      {atLimit && (
        <p className="text-xs text-center text-gray-400">Upgrade your plan to send more items this month.</p>
      )}

      {client.purchaseHistory.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Purchase history</p>
          {client.purchaseHistory.map(tx => (
            <div key={tx.id} className="flex justify-between text-sm py-1 border-b border-gray-100">
              <span>{tx.itemName}</span>
              <span className="text-gray-500">KES {tx.finalPriceKES.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={() => setShowPicker(false)}>
          <div className="w-full bg-white rounded-t-2xl p-6 space-y-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Choose item to send</h3>
            <div className="space-y-2">
              {inventory.filter(i => i.isLive).map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    selectedItemId === item.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200'
                  }`}
                >
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
                </button>
              ))}
            </div>
            <textarea
              placeholder="Optional note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!selectedItemId}
              className="w-full bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test — confirm pass**

```bash
cd apps/seller && pnpm test -- ClientDetailPage
```

Expected: 4 tests PASS.

- [ ] **Step 5: Run full test suite + lint**

```bash
cd apps/seller && pnpm test && pnpm lint
```

Expected: all tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/seller/src/pages/ClientDetailPage.tsx apps/seller/src/__tests__/clients/ClientDetailPage.test.tsx
git commit -m "feat(seller): ClientDetailPage + Try This On send flow with monthly limit"
```

---

### Plan 3 Complete

Run `cd apps/seller && pnpm test` — all POS, client, and try-on tests pass. Ready for Plan 4 (Dashboard + Profile + Ad Boost).
