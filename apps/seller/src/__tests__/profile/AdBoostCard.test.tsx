import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import AdBoostCard from '../../components/AdBoostCard'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

describe('AdBoostCard', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders nothing for free_trial', () => {
    const { container } = render(<AdBoostCard tier="free_trial" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Coming Soon card for hustler', () => {
    render(<AdBoostCard tier="hustler" />)
    expect(screen.getByText(/ad boost/i)).toBeInTheDocument()
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/5 boost slots\/week/i)).toBeInTheDocument()
  })

  it('shows waitlist button for boutique', () => {
    render(<AdBoostCard tier="boutique" />)
    expect(screen.getByRole('button', { name: /join the waitlist/i })).toBeInTheDocument()
    expect(screen.getByText(/15 boost slots\/week/i)).toBeInTheDocument()
  })

  it('posts waitlist and shows confirmation toast', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<AdBoostCard tier="brand" />)
    await userEvent.click(screen.getByRole('button', { name: /join the waitlist/i }))
    await waitFor(() =>
      expect(screen.getByText(/you're on the list/i)).toBeInTheDocument()
    )
    expect(sellerApi.post).toHaveBeenCalledWith('/seller/adboost/waitlist', {})
  })

  it('disables waitlist button after joining', async () => {
    vi.spyOn(sellerApi, 'post').mockResolvedValue({ success: true })
    render(<AdBoostCard tier="hustler" />)
    await userEvent.click(screen.getByRole('button', { name: /join the waitlist/i }))
    await waitFor(() => screen.getByText(/you're on the list/i))
    expect(screen.queryByRole('button', { name: /join the waitlist/i })).not.toBeInTheDocument()
  })
})
