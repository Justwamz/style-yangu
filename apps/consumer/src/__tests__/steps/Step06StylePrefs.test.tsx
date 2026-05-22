import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step06StylePrefs from '../../onboarding/steps/Step06StylePrefs'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step06StylePrefs', () => {
  beforeEach(() => mockDispatch.mockClear())

  it('renders 6 style tiles', () => {
    renderWithProviders(<Step06StylePrefs />)
    expect(screen.getByText(/smart casual/i)).toBeInTheDocument()
    expect(screen.getByText(/business casual/i)).toBeInTheDocument()
    expect(screen.getByText(/streetwear/i)).toBeInTheDocument()
    expect(screen.getByText(/traditional/i)).toBeInTheDocument()
    expect(screen.getByText(/evening/i)).toBeInTheDocument()
    expect(screen.getByText(/athleisure/i)).toBeInTheDocument()
  })

  it('dispatches SET_STYLE_PREFS with selected tile on first tap', () => {
    renderWithProviders(<Step06StylePrefs />)
    fireEvent.click(screen.getByText(/smart casual/i))
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_STYLE_PREFS', stylePreferences: expect.arrayContaining(['smart_casual']) })
    )
  })

  it('shows hint when nothing selected', () => {
    renderWithProviders(<Step06StylePrefs />)
    expect(screen.getByText(/select at least one/i)).toBeInTheDocument()
  })
})
