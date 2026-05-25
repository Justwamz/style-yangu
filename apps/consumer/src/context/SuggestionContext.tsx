import React, { createContext, useContext, useReducer, useState, useEffect, useCallback } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { unlockReducer, type UnlockState, type UnlockAction } from '../utils/unlockMachine'
import type { Suggestion, DailySuggestionResponse, UnlockResponse, AdPhaseNumber } from '@style-yangu/types'

interface SuggestionContextValue {
  suggestions: Suggestion[]
  unlockState: UnlockState
  phase: AdPhaseNumber
  loading: boolean
  error: string | null
  unlockByAd: () => Promise<void>
  unlockByWardrobe: (itemIds: [string, string]) => Promise<void>
  dispatchUnlock: React.Dispatch<UnlockAction>
}

const SuggestionContext = createContext<SuggestionContextValue | null>(null)

const initialUnlockState: UnlockState = {
  unlockCount: 1,
  adsWatched: 0,
  wardrobePairsUsed: 0,
  wardrobeProgress: 0,
  unlockMode: 'idle',
}

export function SuggestionProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [phase, setPhase] = useState<AdPhaseNumber>(2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlockState, dispatchUnlock] = useReducer(unlockReducer, initialUnlockState)

  useEffect(() => {
    apiClient.get<DailySuggestionResponse>('/consumer/suggestion/daily')
      .then(data => {
        setSuggestions(data.suggestions)
        setPhase(data.phase)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const unlockByAd = useCallback(async () => {
    const data = await apiClient.post<UnlockResponse>('/consumer/suggestion/unlock', { method: 'ad' })
    if (data.newSuggestion) setSuggestions(prev => [...prev, data.newSuggestion!])
    dispatchUnlock({ type: 'AD_WATCHED' })
  }, [])

  const unlockByWardrobe = useCallback(async (itemIds: [string, string]) => {
    const data = await apiClient.post<UnlockResponse>('/consumer/suggestion/unlock', {
      method: 'wardrobe',
      wardrobeItemIds: itemIds,
    })
    if (data.newSuggestion) setSuggestions(prev => [...prev, data.newSuggestion!])
  }, [])

  return (
    <SuggestionContext.Provider value={{ suggestions, unlockState, phase, loading, error, unlockByAd, unlockByWardrobe, dispatchUnlock }}>
      {children}
    </SuggestionContext.Provider>
  )
}

export function useSuggestionContext(): SuggestionContextValue {
  const ctx = useContext(SuggestionContext)
  if (!ctx) throw new Error('useSuggestionContext must be used within SuggestionProvider')
  return ctx
}
