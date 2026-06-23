import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import POSNewPage from '../../pages/POSNewPage'
import { sellerApi, useSellerContext } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    useSellerContext: vi.fn(),
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const INVENTORY = [
  { id: 'i1', name: 'Blue Dress', priceKES: 3500, category: 'dress', isLive: true, isSoldOut: false },
]
const CLIENTS = [
  { id: 'c1', sellerId: 's1', nickname: 'Aisha', consumerUsername: '@aisha', lastPurchaseDate: null, whatsappNumber: null, tryOnSent: 0, tryOnActed: 0 },
]

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
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
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { businessName: 'Test Store', tier: 'hustler' } as any,
      loading: false,
      refresh: vi.fn(),
    })
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
    await waitFor(() => screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByText('Blue Dress'))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => expect(screen.getByText(/negotiated price/i)).toBeInTheDocument())
  })

  it('posts transaction and navigates to /pos on confirm', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ id: 'tx-new' })
    wrap()
    // Step 0 — select item
    await waitFor(() => screen.getByPlaceholderText(/search or type item/i))
    await waitFor(() => screen.getByText('Blue Dress'))
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
    // Step 3 — client (skip) — wait for client list to settle
    await waitFor(() => {
      screen.getByText('Aisha') // confirms step 3 rendered and client query settled
    })
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText('pos home')).toBeInTheDocument())
    expect(sellerApi.post).toHaveBeenCalledWith(
      '/seller/pos/transactions',
      expect.objectContaining({ itemName: 'Blue Dress', paymentMethod: 'mpesa', paymentStatus: 'paid' })
    )
  })
})
