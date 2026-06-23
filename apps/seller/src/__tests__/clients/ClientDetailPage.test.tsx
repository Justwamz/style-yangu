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
