import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProfileTab from '../../pages/ProfileTab'
import { useSellerContext, sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const PROFILE = {
  id: 's1', businessName: 'Nairobi Threads', sellerType: 'seller', tier: 'hustler',
  generationsUsed: 8, generationsLimit: 20, phone: '+254700000000',
  avatarUrl: null, instagramHandle: '@nairobi_threads', whatsappNumber: '+254700000000',
  location: 'Westlands, Nairobi', bio: 'Best fashion in town', onboardingDone: true,
  createdAt: '2025-01-01T00:00:00Z',
}

function wrap() {
  vi.mocked(useSellerContext).mockReturnValue({ profile: PROFILE as any, loading: false, refresh: vi.fn() })
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<ProfileTab />} />
        <Route path="/auth" element={<div>auth page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProfileTab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows business name and tier badge', () => {
    wrap()
    expect(screen.getByText('Nairobi Threads')).toBeInTheDocument()
    expect(screen.getByText('Hustler')).toBeInTheDocument()
  })

  it('shows generation meter with used/total', () => {
    wrap()
    expect(screen.getByText(/8 of 20 showcase generations used/i)).toBeInTheDocument()
  })

  it('shows Unlimited for brand tier', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { ...PROFILE, tier: 'brand', generationsLimit: -1 } as any,
      loading: false,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter><Routes><Route path="/" element={<ProfileTab />} /></Routes></MemoryRouter>
    )
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument()
  })

  it('patches profile on bio field blur', async () => {
    vi.mocked(useSellerContext).mockReturnValue({ profile: PROFILE as any, loading: false, refresh: vi.fn() })
    vi.spyOn(sellerApi, 'patch').mockResolvedValue({})
    wrap()
    const bioInput = screen.getByDisplayValue('Best fashion in town')
    await userEvent.clear(bioInput)
    await userEvent.type(bioInput, 'New bio')
    await userEvent.tab()
    await waitFor(() =>
      expect(sellerApi.patch).toHaveBeenCalledWith('/seller/profile', expect.objectContaining({ bio: 'New bio' }))
    )
  })

  it('signs out and redirects to /auth', async () => {
    localStorage.setItem('sy_seller_token', 'jwt')
    wrap()
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(screen.getByText('auth page')).toBeInTheDocument())
    expect(localStorage.getItem('sy_seller_token')).toBeNull()
  })

  it('shows Ad Boost card for hustler', () => {
    wrap()
    expect(screen.getByText(/ad boost/i)).toBeInTheDocument()
  })

  it('hides Ad Boost card for free_trial', () => {
    vi.mocked(useSellerContext).mockReturnValue({
      profile: { ...PROFILE, tier: 'free_trial' } as any,
      loading: false,
      refresh: vi.fn(),
    })
    render(
      <MemoryRouter><Routes><Route path="/" element={<ProfileTab />} /></Routes></MemoryRouter>
    )
    expect(screen.queryByText(/ad boost/i)).not.toBeInTheDocument()
  })
})
