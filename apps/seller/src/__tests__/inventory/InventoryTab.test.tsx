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
