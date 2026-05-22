import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../test-utils'
import Step08Location from '../../onboarding/steps/Step08Location'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step08Location', () => {
  beforeEach(() => mockDispatch.mockClear())

  it('renders Allow location button', () => {
    renderWithProviders(<Step08Location />)
    expect(screen.getByRole('button', { name: /allow location/i })).toBeInTheDocument()
  })

  it('on grant: dispatches SET_LOCATION granted + coords + SET_STEP(9)', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success: PositionCallback) =>
          success({ coords: { latitude: -1.2921, longitude: 36.8219 } } as GeolocationPosition)
        ),
      },
    })
    renderWithProviders(<Step08Location />)
    await userEvent.click(screen.getByRole('button', { name: /allow location/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOCATION', locationPermission: 'granted', lat: -1.2921, lon: 36.8219,
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 9 })
    })
    vi.unstubAllGlobals()
  })

  it('on deny: dispatches SET_LOCATION denied with Nairobi fallback + SET_STEP(9)', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1 } as GeolocationPositionError)
        ),
      },
    })
    renderWithProviders(<Step08Location />)
    await userEvent.click(screen.getByRole('button', { name: /allow location/i }))
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_LOCATION', locationPermission: 'denied', lat: -1.2921, lon: 36.8219,
      })
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STEP', step: 9 })
    })
    vi.unstubAllGlobals()
  })
})
