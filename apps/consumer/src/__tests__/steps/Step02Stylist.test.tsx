import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step02Stylist from '../../onboarding/steps/Step02Stylist'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return {
    ...actual,
    useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }),
  }
})

describe('Step02Stylist', () => {
  it('renders Amara and Kofi cards', () => {
    renderWithProviders(<Step02Stylist />)
    expect(screen.getByText('Amara')).toBeInTheDocument()
    expect(screen.getByText('Kofi')).toBeInTheDocument()
  })

  it('renders personality lines', () => {
    renderWithProviders(<Step02Stylist />)
    expect(screen.getByText(/trusted friend/i)).toBeInTheDocument()
    expect(screen.getByText(/no-fluff/i)).toBeInTheDocument()
  })

  it('tapping Amara card dispatches SET_STYLIST amara', () => {
    renderWithProviders(<Step02Stylist />)
    fireEvent.click(screen.getByText('Amara').closest('button')!)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STYLIST', stylist: 'amara' })
  })

  it('tapping Kofi card dispatches SET_STYLIST kofi', () => {
    renderWithProviders(<Step02Stylist />)
    fireEvent.click(screen.getByText('Kofi').closest('button')!)
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_STYLIST', stylist: 'kofi' })
  })
})
