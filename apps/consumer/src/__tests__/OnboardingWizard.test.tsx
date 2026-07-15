import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingProvider } from '../onboarding/OnboardingContext'
import OnboardingWizard from '../onboarding/OnboardingWizard'

// Stub all lazy step imports so they render synchronously in tests
vi.mock('../onboarding/steps/Step01Account', () => ({
  default: () => <div data-testid="step-1">Step 1</div>,
}))
vi.mock('../onboarding/steps/Step02Stylist', () => ({
  default: () => <div data-testid="step-2">Step 2</div>,
}))
vi.mock('../onboarding/steps/Step03BodySelfie', () => ({
  default: () => <div data-testid="step-3">Step 3</div>,
}))
vi.mock('../onboarding/steps/Step05SkinTone', () => ({
  default: () => <div data-testid="step-5">Step 5</div>,
}))
vi.mock('../onboarding/steps/Step06StylePrefs', () => ({
  default: () => <div data-testid="step-6">Step 6</div>,
}))
vi.mock('../onboarding/steps/Step07Wardrobe', () => ({
  default: () => <div data-testid="step-7">Step 7</div>,
}))
vi.mock('../onboarding/steps/Step08Location', () => ({
  default: () => <div data-testid="step-8">Step 8</div>,
}))
vi.mock('../onboarding/steps/Step09Budget', () => ({
  default: () => <div data-testid="step-9">Step 9</div>,
}))
vi.mock('../onboarding/steps/Step10ShoeSize', () => ({
  default: () => <div data-testid="step-10">Step 10</div>,
}))
vi.mock('../onboarding/steps/Step11AvatarPreview', () => ({
  default: () => <div data-testid="step-11">Step 11</div>,
}))

function renderWizard(initialState = {}) {
  return render(
    <MemoryRouter>
      <OnboardingProvider testInitialState={initialState}>
        <OnboardingWizard />
      </OnboardingProvider>
    </MemoryRouter>,
  )
}

describe('OnboardingWizard', () => {
  it('renders 11 progress segments', () => {
    // The progress bar appears on the wizard layout (steps 2–11); step 1 is a
    // standalone split-screen with no progress bar.
    renderWizard({ step: 2 })
    expect(document.querySelectorAll('[data-testid="progress-segment"]').length).toBe(11)
  })

  it('renders step 1 by default', async () => {
    renderWizard()
    expect(await screen.findByTestId('step-1')).toBeInTheDocument()
  })

  it('renders step 2 when state.step is 2', async () => {
    renderWizard({ step: 2 })
    expect(await screen.findByTestId('step-2')).toBeInTheDocument()
  })

  it('Back button is hidden on step 1', () => {
    renderWizard()
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })

  it('Back button is visible on step 2', async () => {
    renderWizard({ step: 2 })
    expect(await screen.findByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('Next button is disabled on step 2 when no stylist selected', async () => {
    renderWizard({ step: 2 })
    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).toBeDisabled()
  })

  it('Next button is enabled on step 2 when stylist is selected', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    const next = await screen.findByRole('button', { name: /next/i })
    expect(next).not.toBeDisabled()
  })

  it('Next button advances step', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    const next = await screen.findByRole('button', { name: /next/i })
    await userEvent.click(next)
    expect(await screen.findByTestId('step-3')).toBeInTheDocument()
  })

  it('Back button goes to previous step', async () => {
    renderWizard({ step: 2, stylist: 'amara' })
    await userEvent.click(await screen.findByRole('button', { name: /back/i }))
    expect(await screen.findByTestId('step-1')).toBeInTheDocument()
  })
})
