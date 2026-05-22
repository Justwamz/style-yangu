import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Stylist, BodyType, SkinProfile, StylePreference } from '@style-yangu/types'

export interface WardrobeItem {
  id: string
  photoDataUrl: string
  prompt: string
  tag: 'owned' | 'purchased_planned'
}

export interface OnboardingState {
  step: number
  userId?: string
  token?: string
  stylist?: Stylist
  bodyType?: BodyType
  avatarCartoonUrl?: string
  skinProfile?: SkinProfile
  hennaDetected?: boolean
  stylePreferences?: StylePreference[]
  wardrobeItems?: WardrobeItem[]
  locationPermission?: 'granted' | 'denied'
  lat?: number
  lon?: number
  budgets?: Record<string, number>
  shoeSizeUK?: number
  shoeSizeEU?: number
}

export type OnboardingAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ACCOUNT'; userId: string; token: string }
  | { type: 'SET_STYLIST'; stylist: Stylist }
  | { type: 'SET_BODY'; bodyType: BodyType; avatarCartoonUrl: string }
  | { type: 'SET_SKIN'; skinProfile: SkinProfile; hennaDetected: boolean }
  | { type: 'SET_STYLE_PREFS'; stylePreferences: StylePreference[] }
  | { type: 'SET_WARDROBE'; wardrobeItems: WardrobeItem[] }
  | { type: 'SET_LOCATION'; locationPermission: 'granted' | 'denied'; lat?: number; lon?: number }
  | { type: 'SET_BUDGETS'; budgets: Record<string, number> }
  | { type: 'SET_SHOE_SIZE'; shoeSizeUK: number; shoeSizeEU: number }
  | { type: 'RESET' }

export const initialState: OnboardingState = { step: 1 }

export function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case 'SET_STEP': return { ...state, step: action.step }
    case 'SET_ACCOUNT': return { ...state, userId: action.userId, token: action.token }
    case 'SET_STYLIST': return { ...state, stylist: action.stylist }
    case 'SET_BODY': return { ...state, bodyType: action.bodyType, avatarCartoonUrl: action.avatarCartoonUrl }
    case 'SET_SKIN': return { ...state, skinProfile: action.skinProfile, hennaDetected: action.hennaDetected }
    case 'SET_STYLE_PREFS': return { ...state, stylePreferences: action.stylePreferences }
    case 'SET_WARDROBE': return { ...state, wardrobeItems: action.wardrobeItems }
    case 'SET_LOCATION': return { ...state, locationPermission: action.locationPermission, lat: action.lat, lon: action.lon }
    case 'SET_BUDGETS': return { ...state, budgets: action.budgets }
    case 'SET_SHOE_SIZE': return { ...state, shoeSizeUK: action.shoeSizeUK, shoeSizeEU: action.shoeSizeEU }
    case 'RESET': return initialState
    default: return state
  }
}

interface OnboardingContextValue {
  state: OnboardingState
  dispatch: React.Dispatch<OnboardingAction>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

const STORAGE_KEY = 'sy_onboarding'

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OnboardingState) : initialState
  } catch {
    return initialState
  }
}

interface OnboardingProviderProps {
  children: React.ReactNode
  testInitialState?: Partial<OnboardingState>
}

export function OnboardingProvider({ children, testInitialState }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(
    onboardingReducer,
    testInitialState ? { ...initialState, ...testInitialState } : loadState(),
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage unavailable — context lives in memory only
    }
  }, [state])

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
