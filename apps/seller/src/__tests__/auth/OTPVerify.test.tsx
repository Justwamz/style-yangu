import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import OTPVerify from '../../auth/OTPVerify'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const renderWithState = (phone = '+254700000001') =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/verify', state: { phone } }]}>
      <Routes>
        <Route path="/auth/verify" element={<OTPVerify />} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route path="/onboarding" element={<div>onboarding</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('OTPVerify', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('renders 6-digit code input and Verify button', () => {
    renderWithState()
    expect(screen.getByPlaceholderText(/6-digit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('stores token and redirects to dashboard when onboardingDone=true', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ token: 'jwt-xyz', onboardingDone: true })
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument())
    expect(localStorage.getItem('sy_seller_token')).toBe('jwt-xyz')
  })

  it('redirects to onboarding when onboardingDone=false', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ token: 'jwt-xyz', onboardingDone: false })
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '123456')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText('onboarding')).toBeInTheDocument())
  })

  it('shows inline error on wrong OTP', async () => {
    vi.spyOn(sellerApi, 'post').mockRejectedValue(new Error('Invalid code'))
    renderWithState()
    await userEvent.type(screen.getByPlaceholderText(/6-digit/i), '000000')
    await userEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() => expect(screen.getByText(/invalid code/i)).toBeInTheDocument())
  })
})
