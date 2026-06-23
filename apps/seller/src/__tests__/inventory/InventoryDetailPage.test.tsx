import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InventoryDetailPage from '../../pages/InventoryDetailPage'
import { sellerApi, useSellerContext } from '../../context/SellerContext'
import { useGenerateShowcase } from '../../hooks/useGenerateShowcase'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    useSellerContext: vi.fn(),
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

vi.mock('../../hooks/useGenerateShowcase', () => ({
  useGenerateShowcase: vi.fn(),
}))

const ITEM = {
  id: 'item-1',
  sellerId: 's1',
  name: 'Blue Dress',
  category: 'dress',
  priceKES: 4500,
  occasionTags: ['casual'],
  sizes: [
    { size: 'S', quantity: 2 },
    { size: 'M', quantity: 3 },
  ],
  showcaseImageUrl: null,
  isLive: true,
  isSoldOut: false,
  discountPercent: null,
  discountExpiresAt: null,
  createdAt: '2025-01-01T00:00:00Z',
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/inventory/item-1']}>
        <Routes>
          <Route path="/inventory/:id" element={<InventoryDetailPage />} />
          <Route path="/inventory" element={<div>inventory list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InventoryDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(useSellerContext).mockReturnValue({
      profile: {
        id: 's1', businessName: 'Test Store', tier: 'hustler',
        generationsUsed: 5, generationsLimit: 20, onboardingDone: true,
      } as any,
      loading: false,
      refresh: vi.fn(),
    })
    vi.mocked(useGenerateShowcase).mockReturnValue({
      generate: vi.fn().mockResolvedValue('https://example.com/showcase.jpg'),
      generating: false,
    })
    vi.spyOn(sellerApi, 'get').mockResolvedValue(ITEM)
    vi.spyOn(sellerApi, 'patch').mockResolvedValue({})
  })

  it('shows edit button and saves name change via PATCH', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())

    // Click Edit
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    // Edit fields should appear
    const nameInput = screen.getByRole('textbox', { name: /item name/i })
    expect(nameInput).toBeInTheDocument()

    // Change name
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Red Dress')

    // Save
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() =>
      expect(sellerApi.patch).toHaveBeenCalledWith(
        '/seller/inventory/item-1',
        expect.objectContaining({ name: 'Red Dress' })
      )
    )
  })

  it('shows regenerate button when cap not reached', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())

    const regenButton = screen.getByRole('button', { name: /regenerate showcase/i })
    expect(regenButton).toBeInTheDocument()
    expect(regenButton).not.toBeDisabled()
  })

  it('shows adjust stock button', async () => {
    wrap()
    await waitFor(() => expect(screen.getByText('Blue Dress')).toBeInTheDocument())

    // Total stock = 2 + 3 = 5
    expect(screen.getByText(/total: 5 units/i)).toBeInTheDocument()

    const adjustButton = screen.getByRole('button', { name: /adjust/i })
    expect(adjustButton).toBeInTheDocument()

    // Click Adjust to show input
    await userEvent.click(adjustButton)
    expect(screen.getByRole('spinbutton', { name: /stock override/i })).toBeInTheDocument()
  })
})
