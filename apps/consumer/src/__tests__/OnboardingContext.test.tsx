import { describe, it, expect, beforeEach } from 'vitest'
import { render, act, screen } from '@testing-library/react'
import React from 'react'
import {
  onboardingReducer,
  initialState,
  OnboardingProvider,
  useOnboarding,
} from '../onboarding/OnboardingContext'

// ── Pure reducer tests ────────────────────────────────────────────────────────

describe('onboardingReducer', () => {
  it('SET_STEP updates step', () => {
    expect(onboardingReducer(initialState, { type: 'SET_STEP', step: 5 }).step).toBe(5)
  })

  it('SET_ACCOUNT stores userId + token', () => {
    const s = onboardingReducer(initialState, { type: 'SET_ACCOUNT', userId: 'u1', token: 'tok' })
    expect(s.userId).toBe('u1')
    expect(s.token).toBe('tok')
  })

  it('SET_STYLIST stores stylist', () => {
    const s = onboardingReducer(initialState, { type: 'SET_STYLIST', stylist: 'amara' })
    expect(s.stylist).toBe('amara')
  })

  it('SET_BODY stores bodyType + avatarCartoonUrl', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: 'data:image/svg+xml,test',
    })
    expect(s.bodyType).toBe('hourglass')
    expect(s.avatarCartoonUrl).toBe('data:image/svg+xml,test')
  })

  it('SET_SKIN stores skinProfile + hennaDetected', () => {
    const profile = { depth: 'medium' as const, undertone: 'warm' as const, userConfirmed: true }
    const s = onboardingReducer(initialState, { type: 'SET_SKIN', skinProfile: profile, hennaDetected: false })
    expect(s.skinProfile).toEqual(profile)
    expect(s.hennaDetected).toBe(false)
  })

  it('SET_STYLE_PREFS stores preferences', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_STYLE_PREFS', stylePreferences: ['smart_casual', 'streetwear'],
    })
    expect(s.stylePreferences).toEqual(['smart_casual', 'streetwear'])
  })

  it('SET_WARDROBE stores items', () => {
    const items = [{ id: '1', photoDataUrl: 'data:x', prompt: 'rainy', tag: 'owned' as const }]
    const s = onboardingReducer(initialState, { type: 'SET_WARDROBE', wardrobeItems: items })
    expect(s.wardrobeItems).toEqual(items)
  })

  it('SET_LOCATION stores permission + coords', () => {
    const s = onboardingReducer(initialState, {
      type: 'SET_LOCATION', locationPermission: 'granted', lat: -1.2921, lon: 36.8219,
    })
    expect(s.locationPermission).toBe('granted')
    expect(s.lat).toBe(-1.2921)
  })

  it('SET_BUDGETS stores budgets', () => {
    const s = onboardingReducer(initialState, { type: 'SET_BUDGETS', budgets: { top: 2000 } })
    expect(s.budgets).toEqual({ top: 2000 })
  })

  it('SET_SHOE_SIZE stores sizes', () => {
    const s = onboardingReducer(initialState, { type: 'SET_SHOE_SIZE', shoeSizeUK: 6, shoeSizeEU: 39 })
    expect(s.shoeSizeUK).toBe(6)
    expect(s.shoeSizeEU).toBe(39)
  })

  it('RESET returns initialState', () => {
    const dirty = { step: 8, userId: 'u1', token: 't', stylist: 'kofi' as const }
    expect(onboardingReducer(dirty, { type: 'RESET' })).toEqual(initialState)
  })
})

// ── Provider + localStorage tests ─────────────────────────────────────────────

function TestConsumer() {
  const { state, dispatch } = useOnboarding()
  return (
    <>
      <span data-testid="step">{state.step}</span>
      <button onClick={() => dispatch({ type: 'SET_STEP', step: 7 })}>go7</button>
    </>
  )
}

describe('OnboardingProvider', () => {
  beforeEach(() => localStorage.clear())

  it('persists state to localStorage on dispatch', () => {
    const { getByRole } = render(
      <OnboardingProvider><TestConsumer /></OnboardingProvider>
    )
    act(() => { getByRole('button', { name: 'go7' }).click() })
    const saved = JSON.parse(localStorage.getItem('sy_onboarding') ?? '{}')
    expect(saved.step).toBe(7)
  })

  it('rehydrates state from localStorage on mount', () => {
    localStorage.setItem('sy_onboarding', JSON.stringify({ step: 5 }))
    render(<OnboardingProvider><TestConsumer /></OnboardingProvider>)
    expect(screen.getByTestId('step').textContent).toBe('5')
  })
})
