import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ShowcaseResult from '../../components/ShowcaseResult'
import { sellerApi } from '../../context/SellerContext'

vi.mock('../../context/SellerContext', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../context/SellerContext')>()
  return {
    ...real,
    sellerApi: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  }
})

const baseProps = {
  imageUrl: 'https://placehold.co/400x600',
  itemName: 'Blue Dress',
  priceKES: 3500,
  itemId: 'item-1',
  onPublish: vi.fn(),
}

describe('ShowcaseResult', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows watermark for free_trial', () => {
    render(<ShowcaseResult {...baseProps} tier="free_trial" />)
    expect(screen.getByTestId('watermark')).toBeInTheDocument()
  })

  it('shows watermark for hustler', () => {
    render(<ShowcaseResult {...baseProps} tier="hustler" />)
    expect(screen.getByTestId('watermark')).toBeInTheDocument()
  })

  it('hides watermark for boutique', () => {
    render(<ShowcaseResult {...baseProps} tier="boutique" />)
    expect(screen.queryByTestId('watermark')).not.toBeInTheDocument()
  })

  it('calls PATCH isLive and onPublish on Publish click', async () => {
    vi.spyOn(sellerApi, 'patch').mockResolvedValue({})
    const onPublish = vi.fn()
    render(<ShowcaseResult {...baseProps} tier="hustler" onPublish={onPublish} />)
    await userEvent.click(screen.getByRole('button', { name: /publish to shop/i }))
    await waitFor(() =>
      expect(sellerApi.patch).toHaveBeenCalledWith('/seller/inventory/item-1', { isLive: true })
    )
    expect(onPublish).toHaveBeenCalled()
  })
})
