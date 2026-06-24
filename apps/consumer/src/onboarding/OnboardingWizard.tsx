import React, { Suspense, useRef } from 'react'
import { useOnboarding } from './OnboardingContext'
import type { OnboardingState } from './OnboardingContext'

const StepAccount    = React.lazy(() => import('./steps/Step01Account'))
const StepStylist    = React.lazy(() => import('./steps/Step02Stylist'))
const StepBodySelfie = React.lazy(() => import('./steps/Step03BodySelfie'))
const StepSkinTone   = React.lazy(() => import('./steps/Step05SkinTone'))
const StepStylePrefs = React.lazy(() => import('./steps/Step06StylePrefs'))
const StepWardrobe   = React.lazy(() => import('./steps/Step07Wardrobe'))
const StepLocation   = React.lazy(() => import('./steps/Step08Location'))
const StepBudget     = React.lazy(() => import('./steps/Step09Budget'))
const StepShoeSize   = React.lazy(() => import('./steps/Step10ShoeSize'))
const StepAvatar     = React.lazy(() => import('./steps/Step11AvatarPreview'))

const STEP_MAP: Record<number, React.ComponentType> = {
  1: StepAccount,
  2: StepStylist,
  3: StepBodySelfie,
  4: StepBodySelfie,
  5: StepSkinTone,
  6: StepStylePrefs,
  7: StepWardrobe,
  8: StepLocation,
  9: StepBudget,
  10: StepShoeSize,
  11: StepAvatar,
}

function canAdvance(step: number, state: OnboardingState): boolean {
  switch (step) {
    case 2:  return !!state.stylist
    case 5:  return !!state.skinProfile
    case 6:  return (state.stylePreferences?.length ?? 0) >= 1
    case 9:
    case 10: return true
    default: return false
  }
}

export default function OnboardingWizard() {
  const { state, dispatch } = useOnboarding()
  const prevStepRef = useRef(state.step)
  const slideClass = state.step >= prevStepRef.current ? 'animate-slide-right' : 'animate-slide-left'
  prevStepRef.current = state.step

  const StepComponent = STEP_MAP[state.step] ?? StepAccount
  const showBack    = state.step > 1
  const nextEnabled = canAdvance(state.step, state)
  const showNext    = nextEnabled || [9, 10].includes(state.step) || [2, 5, 6].includes(state.step)

  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-[430px] mx-auto">
      {/* Progress bar */}
      <div className="flex gap-1 px-4 pt-4 pb-2">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            data-testid="progress-segment"
            className="h-1 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < state.step ? '#8B4513' : '#F5EDE3' }}
          />
        ))}
      </div>

      {/* Step */}
      <div key={state.step} className={`flex-1 px-6 py-4 overflow-y-auto ${slideClass}`}>
        <Suspense fallback={<div className="flex-1" />}>
          <StepComponent />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="flex gap-3 px-6 py-4 border-t border-sand">
        {showBack && (
          <button
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step - 1 })}
            className="flex-1 border border-sand rounded-xl py-3 text-dark font-semibold"
          >
            Back
          </button>
        )}
        {showNext && (
          <button
            disabled={!nextEnabled}
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step + 1 })}
            className="flex-1 bg-brand text-white rounded-xl py-3 font-semibold disabled:opacity-40"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
