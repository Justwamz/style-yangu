import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step09Budget from '../../onboarding/steps/Step09Budget'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step09Budget', () => {
  beforeEach(() => mockDispatch.mockClear())

  it('renders 5 budget categories', () => {
    renderWithProviders(<Step09Budget />)
    expect(screen.getByLabelText(/tops/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bottoms/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/shoes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dresses/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accessories/i)).toBeInTheDocument()
  })

  it('dispatches SET_BUDGETS on input change', () => {
    renderWithProviders(<Step09Budget />)
    fireEvent.change(screen.getByLabelText(/tops/i), { target: { value: '2000' } })
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_BUDGETS', budgets: expect.objectContaining({ top: 2000 }) })
    )
  })
})
