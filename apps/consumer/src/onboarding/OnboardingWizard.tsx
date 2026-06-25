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

const CONSUMER_VALUE_PROPS = [
  'AI-matched outfits, every day',
  'Virtual try-on with your selfie',
  'Stylists who know East Africa',
]

export default function OnboardingWizard() {
  const { state, dispatch } = useOnboarding()
  const prevStepRef = useRef(state.step)
  const slideClass = state.step >= prevStepRef.current ? 'animate-slide-right' : 'animate-slide-left'
  prevStepRef.current = state.step

  const StepComponent = STEP_MAP[state.step] ?? StepAccount
  const nextEnabled = canAdvance(state.step, state)
  const showNext    = nextEnabled || [9, 10].includes(state.step) || [2, 5, 6].includes(state.step)

  /* ── Step 1: full split-screen (matches seller auth aesthetic) ── */
  if (state.step === 1) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">

        {/* Left: dark brand panel */}
        <div className="bg-dark relative flex flex-col justify-between px-8 py-10 md:flex-1 md:py-16 md:px-14 overflow-hidden">
          <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-gold/20 pointer-events-none" />

          <a href={LANDING_URL} className="font-display text-2xl text-white tracking-wide leading-none">
            Style<span className="text-gold">Yangu</span>
          </a>

          <div className="py-10 md:py-0">
            <p className="text-gold text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">
              For you
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-8">
              Your style,<br />
              <em className="italic text-gold">beautifully</em><br />
              curated.
            </h1>
            <ul className="flex flex-col gap-4">
              {CONSUMER_VALUE_PROPS.map(prop => (
                <li key={prop} className="flex items-center gap-3 text-white/50 text-sm">
                  <span className="w-1 h-1 rounded-full bg-gold/70 shrink-0" />
                  {prop}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={LANDING_URL}
            className="text-white/25 text-xs tracking-wide hover:text-white/55 transition-colors self-start"
          >
            ← Back to Style Yangu
          </a>
        </div>

        {/* Right: form panel */}
        <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
          <div className="w-full max-w-sm">
            <a
              href={LANDING_URL}
              className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8"
            >
              ← Back
            </a>
            <Suspense fallback={<div />}>
              <StepAccount />
            </Suspense>
          </div>
        </div>
      </div>
    )
  }

  /* ── Steps 2–11: wizard layout ── */
  return (
    <div className="min-h-screen bg-cream flex flex-col max-w-[430px] mx-auto">
      {/* Branded header */}
      <div className="bg-dark px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step - 1 })}
            aria-label="Back"
            className="text-white/70 hover:text-white transition-colors text-lg leading-none pr-1"
          >
            ←
          </button>
          <span className="font-display text-xl text-white tracking-wide leading-none flex-1">
            Style<span className="text-gold">Yangu</span>
          </span>
          <span className="text-white/40 text-[11px] tracking-[0.2em] uppercase font-body">
            {state.step} / 11
          </span>
        </div>
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

      <div key={state.step} className={`flex-1 px-6 py-8 overflow-y-auto ${slideClass}`}>
        <Suspense fallback={<div className="flex-1" />}>
          <StepComponent />
        </Suspense>
      </div>

      {showNext && (
        <div className="px-6 pb-8 pt-4 border-t border-sand/60 shrink-0">
          <button
            disabled={!nextEnabled}
            onClick={() => dispatch({ type: 'SET_STEP', step: state.step + 1 })}
            className="w-full bg-brand text-white rounded-lg py-3 text-sm font-semibold tracking-wide disabled:opacity-30 transition-opacity"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
