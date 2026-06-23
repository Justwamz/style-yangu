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
