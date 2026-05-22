import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OnboardingProvider } from '../onboarding/OnboardingContext'
import type { OnboardingState } from '../onboarding/OnboardingContext'
import type { ReactElement } from 'react'

interface WrapperOptions extends RenderOptions {
  initialState?: Partial<OnboardingState>
}

export function renderWithProviders(
  ui: ReactElement,
  { initialState, ...options }: WrapperOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter>
        <OnboardingProvider testInitialState={initialState}>
          {children}
        </OnboardingProvider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}
