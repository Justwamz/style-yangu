import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createApiClient } from '@style-yangu/api-client'
import type { SellerProfile } from '@style-yangu/types'

export const sellerApi = createApiClient('sy_seller_token')

interface SellerContextValue {
  profile: SellerProfile | null
  loading: boolean
  refresh: () => Promise<void>
}

const SellerContext = createContext<SellerContextValue | null>(null)

export function SellerProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<SellerProfile | null>(null)
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
      const data = await sellerApi.get<SellerProfile>('/seller/profile')
      setProfile(data)
    } catch {
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <SellerContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </SellerContext.Provider>
  )
}

export function useSellerContext() {
  const ctx = useContext(SellerContext)
  if (!ctx) throw new Error('useSellerContext must be used inside SellerProvider')
  return ctx
}
