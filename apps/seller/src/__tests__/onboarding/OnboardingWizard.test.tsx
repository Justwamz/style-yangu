import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import OnboardingWizard from '../../onboarding/OnboardingWizard'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/inventory" element={<div>inventory</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('OnboardingWizard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows business name step first', () => {
    renderWizard()
    expect(screen.getByPlaceholderText(/business name/i)).toBeInTheDocument()
  })

  it('advances to business type after entering name', async () => {
    renderWizard()
    await userEvent.type(screen.getByPlaceholderText(/business name/i), 'Nairobi Threads')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/what best describes/i)).toBeInTheDocument()
  })

  it('submits onboarding and redirects to inventory', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    renderWizard()
    await userEvent.type(screen.getByPlaceholderText(/business name/i), 'Nairobi Threads')
    await userEvent.click(screen.getByRole('button', { name: /next/i }))
    await userEvent.click(screen.getByRole('button', { name: /seller/i }))
    await waitFor(() => expect(screen.getByText('inventory')).toBeInTheDocument())
    expect(sellerApi.post).toHaveBeenCalledWith('/seller/onboarding/complete', {
      businessName: 'Nairobi Threads',
      sellerType: 'seller',
    })
  })
})
