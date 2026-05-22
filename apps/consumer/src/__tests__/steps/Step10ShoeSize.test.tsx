import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step10ShoeSize from '../../onboarding/steps/Step10ShoeSize'

const mockDispatch = vi.fn()
vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return { ...actual, useOnboarding: () => ({ state: actual.initialState, dispatch: mockDispatch }) }
})

describe('Step10ShoeSize', () => {
  beforeEach(() => mockDispatch.mockClear())

  it('renders UK and EU inputs', () => {
    renderWithProviders(<Step10ShoeSize />)
    expect(screen.getByLabelText(/uk/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/eu/i)).toBeInTheDocument()
  })

  it('typing UK auto-fills EU (UK + 33)', () => {
    renderWithProviders(<Step10ShoeSize />)
    fireEvent.change(screen.getByLabelText(/uk/i), { target: { value: '6' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SHOE_SIZE', shoeSizeUK: 6, shoeSizeEU: 39 })
  })

  it('typing EU auto-fills UK (EU - 33)', () => {
    renderWithProviders(<Step10ShoeSize />)
    fireEvent.change(screen.getByLabelText(/eu/i), { target: { value: '42' } })
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_SHOE_SIZE', shoeSizeUK: 9, shoeSizeEU: 42 })
  })
})
