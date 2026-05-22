import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'
import Step02Stylist from '../../onboarding/steps/Step02Stylist'

const mockDispatch = vi.fn()
let mockState = { step: 1 as number, stylist: undefined as string | undefined }

vi.mock('../../onboarding/OnboardingContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../onboarding/OnboardingContext')>()
  return {
    ...actual,
    useOnboarding: () => ({ state: mockState, dispatch: mockDispatch }),
  }
})

describe('Step02Stylist', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
    mockState = { step: 1, stylist: undefined }
  })

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

  it('selected stylist card has brand border class', () => {
    mockState = { step: 2, stylist: 'amara' }
    renderWithProviders(<Step02Stylist />)
    const amaraBtn = screen.getByText('Amara').closest('button')!
    expect(amaraBtn.className).toContain('border-[#8B4513]')
  })
})
