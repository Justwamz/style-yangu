import { OnboardingProvider } from './OnboardingContext'
import OnboardingWizard from './OnboardingWizard'

export default function Onboarding() {
  return (
    <OnboardingProvider>
      <OnboardingWizard />
    </OnboardingProvider>
  )
}
