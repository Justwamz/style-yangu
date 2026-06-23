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
