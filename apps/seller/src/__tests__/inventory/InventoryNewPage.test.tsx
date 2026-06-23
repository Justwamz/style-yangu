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
    await userEvent.click(screen.getByRole('button', { name: /^M$/ }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await waitFor(() => screen.getByText(/step 4/i))
    expect(screen.getByText(/0 generations remaining/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate showcase/i })).toBeDisabled()
  })
})
