import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import WardrobeTab from '../pages/WardrobeTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockItems = [
  { id: 'w1', photoUrl: 'https://placehold.co/300x300', category: 'clothing', occasionTags: ['casual'], source: 'onboarding' as const },
  { id: 'w2', photoUrl: 'https://placehold.co/300x300', category: 'shoe', occasionTags: ['casual'], source: 'added' as const },
]

function renderWardrobeTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <WardrobeTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path.startsWith('/consumer/wardrobe')) return Promise.resolve({ items: mockItems, total: 2 })
    if (path === '/consumer/profile') return Promise.resolve({ stylistName: 'amara', avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' })
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
})

describe('WardrobeTab', () => {
  it('renders wardrobe items from API', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(2))
  })

  it('shows total item count', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByText(/2 item/i)).toBeInTheDocument())
  })

  it('shows filter chips', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument())
  })

  it('shows add item button', async () => {
    renderWardrobeTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument())
  })
})
