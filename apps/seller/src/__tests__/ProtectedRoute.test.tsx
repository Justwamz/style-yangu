import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ProtectedRoute from '../routes/ProtectedRoute'

vi.mock('../context/SellerContext', () => ({
  SellerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { useSellerContext } from '../context/SellerContext'

function renderGuard(token: string | null, profile: any | null) {
  if (token) localStorage.setItem('sy_seller_token', token)
  else localStorage.removeItem('sy_seller_token')
  vi.mocked(useSellerContext).mockReturnValue({ profile, loading: false, refresh: vi.fn() })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>protected</div>} />
        </Route>
        <Route path="/auth" element={<div>auth</div>} />
        <Route path="/onboarding" element={<div>onboarding</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => localStorage.clear())

  it('redirects to /auth when no token', () => {
    renderGuard(null, null)
    expect(screen.getByText('auth')).toBeInTheDocument()
  })

  it('redirects to /onboarding when onboardingDone=false', () => {
    renderGuard('jwt', { onboardingDone: false })
    expect(screen.getByText('onboarding')).toBeInTheDocument()
  })

  it('renders protected content when authenticated + onboarded', () => {
    renderGuard('jwt', { onboardingDone: true })
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
