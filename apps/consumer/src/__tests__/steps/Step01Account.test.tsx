import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step01Account from '../../onboarding/steps/Step01Account'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return {
    ...actual,
    useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }),
  }
})

function mockFetch(response: object, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  }))
}

describe('Step01Account', () => {
  beforeEach(() => { mockDispatch.mockClear(); localStorage.clear() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('renders email input, password input, and Create Account button', () => {
    renderWithProviders(<Step01Account />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('Google button is disabled', () => {
    renderWithProviders(<Step01Account />)
    expect(screen.getByRole('button', { name: /google/i })).toBeDisabled()
  })

  it('on success dispatches SET_ACCOUNT + SET_STEP(2) and stores token in localStorage', async () => {
    mockFetch({ userId: 'u1', token: 'tok123' }, 201)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_ACCOUNT', userId: 'u1', token: 'tok123' })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 2 })
    })
    expect(localStorage.getItem('sy_token')).toBe('tok123')
    expect(localStorage.getItem('sy_user_id')).toBe('u1')
  })

  it('shows "Email already in use" on 409', async () => {
    mockFetch({ message: 'Email already in use' }, 409)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })

  it('shows "Network error — try again" on 500', async () => {
    mockFetch({ message: 'Network error — try again' }, 500)
    renderWithProviders(<Step01Account />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Network error — try again')).toBeInTheDocument()
  })
})
