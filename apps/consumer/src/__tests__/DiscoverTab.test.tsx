import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import DiscoverTab from '../pages/DiscoverTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockItems = [
  { id: 'd1', name: 'Emerald Wrap Dress', priceKES: 2800, sellerName: 'NairobiChic', photoUrl: 'https://placehold.co/400x500', sponsored: false, matchReason: 'Matches your style' },
  { id: 'd2', name: 'Kitenge Skirt', priceKES: 1800, sellerName: 'AfricanPride', photoUrl: 'https://placehold.co/400x500', sponsored: true, matchReason: 'Traditional style preference' },
]

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/discover') return Promise.resolve({ items: mockItems })
    if (path === '/consumer/profile') return Promise.resolve({ stylistName: 'amara', avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' })
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
})

function renderDiscoverTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <DiscoverTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('DiscoverTab', () => {
  it('renders discover items from API', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText('Emerald Wrap Dress')).toBeInTheDocument())
  })

  it('shows seller name', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText(/NairobiChic/)).toBeInTheDocument())
  })

  it('shows price in KES', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText(/KES 2,800/)).toBeInTheDocument())
  })

  it('shows Sponsored badge on sponsored items', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getByText('Sponsored')).toBeInTheDocument())
  })

  it('shows Talk to Seller button', async () => {
    renderDiscoverTab()
    await waitFor(() => expect(screen.getAllByRole('button', { name: /talk to seller/i }).length).toBeGreaterThan(0))
  })
})
