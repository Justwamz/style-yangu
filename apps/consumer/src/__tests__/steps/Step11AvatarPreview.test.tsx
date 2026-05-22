import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step11AvatarPreview from '../../onboarding/steps/Step11AvatarPreview'
import * as apiClientModule from '@style-yangu/api-client'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

const testState = {
  step: 11,
  userId: 'u1',
  token: 'tok123',
  stylist: 'amara' as const,
  bodyType: 'hourglass' as const,
  avatarCartoonUrl: 'data:image/svg+xml,test',
  skinProfile: { depth: 'medium' as const, undertone: 'warm' as const, userConfirmed: true },
  stylePreferences: ['smart_casual' as const],
}

describe('Step11AvatarPreview', () => {
  afterEach(() => { vi.unstubAllGlobals(); mockNavigate.mockClear(); localStorage.clear() })

  it('shows stylist name in CTA', () => {
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    expect(screen.getByRole('button', { name: /meet amara/i })).toBeInTheDocument()
  })

  it('shows avatar image', () => {
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    expect(screen.getByRole('img', { name: /avatar/i })).toBeInTheDocument()
  })

  it('on CTA tap: POSTs /onboarding/complete, clears localStorage, navigates /home', async () => {
    const postSpy = vi.spyOn(apiClientModule.apiClient, 'post').mockResolvedValue({ ok: true })
    localStorage.setItem('sy_onboarding', JSON.stringify(testState))
    renderWithProviders(<Step11AvatarPreview />, { initialState: testState })
    await userEvent.click(screen.getByRole('button', { name: /meet amara/i }))
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/onboarding/complete', expect.any(Object))
      expect(localStorage.getItem('sy_onboarding')).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith('/home')
    })
    postSpy.mockRestore()
  })
})
