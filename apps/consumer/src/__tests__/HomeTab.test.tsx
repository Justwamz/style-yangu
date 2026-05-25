import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import HomeTab from '../pages/HomeTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockProfile = {
  avatarUrl: null,
  stylistName: 'amara' as const,
  skinTone: null,
  bodyType: null,
  shoeSize: { uk: 6, eu: 39 },
  stylePrefs: [],
  budget: {},
  location: { lat: -1.29, lon: 36.82 },
  tier: 'free' as const,
}

const mockSuggestion = {
  id: 's1',
  outfit: 'White blouse, navy skirt',
  occasionTag: 'Smart Casual',
  stylistComment: 'Looks great with your undertone',
  clothingTags: ['blouse', 'skirt'],
}

const mockWeather = {
  temp: 24,
  condition: 'Clear',
  windSpeed: 8,
  humidity: 55,
  timeOfDay: 'morning' as const,
  simulated: false,
}

function renderHomeTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <HomeTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/profile') return Promise.resolve(mockProfile)
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [mockSuggestion], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    if (path === '/consumer/weather') return Promise.resolve(mockWeather)
    return Promise.resolve({})
  })
})

describe('HomeTab', () => {
  it('shows stylist greeting with name', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getAllByText(/amara/i).length).toBeGreaterThan(0))
  })

  it('shows the suggestion outfit text', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/white blouse/i)).toBeInTheDocument())
  })

  it('shows weather condition', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/24/)).toBeInTheDocument())
  })

  it('shows unlock mechanic after first suggestion', async () => {
    renderHomeTab()
    await waitFor(() => expect(screen.getByText(/want.*more/i)).toBeInTheDocument())
  })

  it('shows weather warning when condition matches clothing tags', async () => {
    vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
      if (path === '/consumer/profile') return Promise.resolve(mockProfile)
      if (path === '/consumer/suggestion/daily') return Promise.resolve({
        suggestions: [{ ...mockSuggestion, clothingTags: ['loose-skirt'] }],
        unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2,
      })
      if (path === '/consumer/weather') return Promise.resolve({ ...mockWeather, condition: 'Windy' })
      return Promise.resolve({})
    })
    renderHomeTab()
    await waitFor(() => expect(screen.getAllByText(/wind/i).length).toBeGreaterThan(0))
  })
})
