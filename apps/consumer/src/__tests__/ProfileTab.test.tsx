import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as apiClientModule from '@style-yangu/api-client'
import ProfileTab from '../pages/ProfileTab'
import { ProfileProvider } from '../context/ProfileContext'
import { SuggestionProvider } from '../context/SuggestionContext'

const mockProfile = { stylistName: 'amara' as const, avatarUrl: null, skinTone: null, bodyType: null, shoeSize: { uk: 6, eu: 39 }, stylePrefs: [], budget: {}, location: { lat: null, lon: null }, tier: 'free' as const }
const mockStreak = { streakDays: 5, stylePoints: 65, weeklyScore: 7.4, leaderboardRank: 12 }
const mockReferral = { code: 'ABC12345', expiresAt: new Date(Date.now() + 86400000 * 13).toISOString(), shareUrl: 'https://styleyangu.app/join/ABC12345', counters: { totalClicks: 3, totalJoined: 1, awaitingUpgrade: 1, upgradedThisMonth: 0 } }

beforeEach(() => {
  vi.spyOn(apiClientModule.apiClient, 'get').mockImplementation((path: string) => {
    if (path === '/consumer/profile') return Promise.resolve(mockProfile)
    if (path === '/consumer/streak') return Promise.resolve(mockStreak)
    if (path === '/consumer/referral') return Promise.resolve(mockReferral)
    if (path === '/consumer/suggestion/daily') return Promise.resolve({ suggestions: [], unlockCount: 1, adsWatched: 0, wardrobePairsUsed: 0, phase: 2 })
    return Promise.resolve({})
  })
  vi.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({ ok: true })
})

function renderProfileTab() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <SuggestionProvider>
          <ProfileTab />
        </SuggestionProvider>
      </ProfileProvider>
    </MemoryRouter>,
  )
}

describe('ProfileTab', () => {
  it('shows stylist name', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText(/amara/i)).toBeInTheDocument())
  })

  it('shows streak count', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText('Day streak')).toBeInTheDocument())
  })

  it('shows referral code', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText('ABC12345')).toBeInTheDocument())
  })

  it('shows notification preference options', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByText(/immediate/i)).toBeInTheDocument())
  })

  it('calls PATCH on preference change', async () => {
    const patchSpy = vi.spyOn(apiClientModule.apiClient, 'patch').mockResolvedValue({ ok: true })
    renderProfileTab()
    await waitFor(() => screen.getByText(/daily digest/i))
    await userEvent.click(screen.getByText(/daily digest/i))
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/consumer/preferences', { notificationFrequency: 'daily' }))
  })

  it('shows sign out button', async () => {
    renderProfileTab()
    await waitFor(() => expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument())
  })
})
