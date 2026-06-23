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
