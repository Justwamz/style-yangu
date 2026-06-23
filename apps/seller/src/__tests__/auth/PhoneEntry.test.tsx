import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PhoneEntry from '../../auth/PhoneEntry'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

describe('PhoneEntry', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders phone input and Send OTP button', () => {
    render(<MemoryRouter><PhoneEntry /></MemoryRouter>)
    expect(screen.getByPlaceholderText(/\+254/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument()
  })

  it('calls otp/send and navigates to verify step', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<MemoryRouter initialEntries={['/auth']}><PhoneEntry /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText(/\+254/i), '+254700000001')
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() =>
      expect(sellerApi.post).toHaveBeenCalledWith('/seller/auth/otp/send', { phone: '+254700000001' })
    )
  })

  it('shows error message on OTP send failure', async () => {
    vi.spyOn(sellerApi, 'post').mockRejectedValue(new Error('Phone not found'))
    render(<MemoryRouter><PhoneEntry /></MemoryRouter>)
    await userEvent.type(screen.getByPlaceholderText(/\+254/i), '+254700000001')
    await userEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() => expect(screen.getByText(/phone not found/i)).toBeInTheDocument())
  })
})
