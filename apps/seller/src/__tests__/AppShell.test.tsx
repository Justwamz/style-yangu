import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'
import AppShell from '../components/AppShell'
import { useSellerContext } from '../context/SellerContext'
import { useTierGate } from '../hooks/useTierGate'

vi.mock('../context/SellerContext', () => ({
  useSellerContext: vi.fn(),
  sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

vi.mock('../hooks/useTierGate', () => ({
  useTierGate: vi.fn(),
}))

function renderShell(clientsAllowed = true) {
  vi.mocked(useSellerContext).mockReturnValue({
    profile: { businessName: 'Nairobi Threads', tier: 'hustler', onboardingDone: true } as any,
    loading: false,
    refresh: vi.fn(),
  })
  vi.mocked(useTierGate).mockReturnValue({ allowed: clientsAllowed, reason: '' })

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div>dashboard page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  it('renders all 5 nav tabs for hustler tier', () => {
    renderShell(true)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
    expect(screen.getByText('POS')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('hides Clients tab for free_trial', () => {
    renderShell(false)
    expect(screen.queryByText('Clients')).not.toBeInTheDocument()
  })
})
