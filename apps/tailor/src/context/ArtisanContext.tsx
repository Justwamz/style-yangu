import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createApiClient } from '@style-yangu/api-client'
import type { ArtisanProfile } from '@style-yangu/types'

// Tailors reuse the seller account/auth — same OTP login and token.
export const artisanApi = createApiClient('sy_seller_token')

interface ArtisanContextValue {
  profile: ArtisanProfile | null
  loading: boolean
  refresh: () => Promise<void>
}

const ArtisanContext = createContext<ArtisanContextValue | null>(null)

export function ArtisanProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ArtisanProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('sy_seller_token')
    if (!token) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await artisanApi.get<ArtisanProfile>('/artisan/profile')
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <ArtisanContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </ArtisanContext.Provider>
  )
}

export function useArtisanContext() {
  const ctx = useContext(ArtisanContext)
  if (!ctx) throw new Error('useArtisanContext must be used inside ArtisanProvider')
  return ctx
}
