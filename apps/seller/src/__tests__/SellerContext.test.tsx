import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SellerProvider, useSellerContext } from '../context/SellerContext'
import { sellerApi } from '../context/SellerContext'

function TestConsumer() {
  const { profile, loading } = useSellerContext()
  if (loading) return <div>loading</div>
  return <div>{profile?.businessName ?? 'no-profile'}</div>
}

describe('SellerContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows profile after fetch', async () => {
    vi.spyOn(sellerApi, 'get').mockResolvedValue({
      id: 's1',
      businessName: 'Nairobi Threads',
      sellerType: 'seller',
      tier: 'free_trial',
      generationsUsed: 0,
      generationsLimit: 5,
      phone: '+254700000000',
      avatarUrl: null,
      instagramHandle: null,
      whatsappNumber: null,
      location: null,
      bio: null,
      onboardingDone: true,
      createdAt: '2025-01-01T00:00:00Z',
    })
    render(
      <SellerProvider>
        <TestConsumer />
      </SellerProvider>
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Nairobi Threads')).toBeInTheDocument())
  })

  it('renders no-profile on fetch error', async () => {
    vi.spyOn(sellerApi, 'get').mockRejectedValue(new Error('401'))
    render(
      <SellerProvider>
        <TestConsumer />
      </SellerProvider>
    )
    await waitFor(() => expect(screen.getByText('no-profile')).toBeInTheDocument())
  })
})
