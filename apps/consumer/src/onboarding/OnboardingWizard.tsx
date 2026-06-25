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

const LANDING_URL = 'https://style-yangu-landing.onrender.com'

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
      {/* Branded header */}
      <div className="bg-dark px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <a href={LANDING_URL} className="font-display text-xl text-white tracking-wide leading-none">
            Style<span className="text-gold">Yangu</span>
          </a>
          <span className="text-white/40 text-[11px] tracking-[0.2em] uppercase font-body">
            {state.step}&thinsp;/&thinsp;11
          </span>
        </div>
        {/* Gold progress bar */}
        <div className="flex gap-0.5">
          {Array.from({ length: 11 }, (_, i) => (
            <div
              key={i}
              data-testid="progress-segment"
              className="h-px flex-1 rounded-full transition-all duration-500"
              style={{ backgroundColor: i < state.step ? '#D4A853' : 'rgba(255,255,255,0.10)' }}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div key={state.step} className={`flex-1 px-6 py-8 overflow-y-auto ${slideClass}`}>
        <Suspense fallback={<div className="flex-1" />}>
          <StepComponent />
        </Suspense>
      </div>

      {/* Navigation footer */}
      <div className="px-6 pb-8 pt-4 border-t border-sand/60 shrink-0">
        {state.step === 1 && (
          <a
            href={LANDING_URL}
            className="flex items-center gap-1.5 text-xs text-mid/40 hover:text-mid/70 transition-colors mb-4 tracking-wide"
          >
            <span className="text-base leading-none">←</span> Back to Style Yangu
          </a>
        )}
        <div className="flex gap-3">
          {showBack && (
            <button
              onClick={() => dispatch({ type: 'SET_STEP', step: state.step - 1 })}
              className="flex-1 border border-sand text-dark/60 rounded-lg py-3 text-sm font-medium tracking-wide hover:border-mid/40 transition-colors"
            >
              Back
            </button>
          )}
          {showNext && (
            <button
              disabled={!nextEnabled}
              onClick={() => dispatch({ type: 'SET_STEP', step: state.step + 1 })}
              className="flex-1 bg-brand text-white rounded-lg py-3 text-sm font-semibold tracking-wide disabled:opacity-30 transition-opacity"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
