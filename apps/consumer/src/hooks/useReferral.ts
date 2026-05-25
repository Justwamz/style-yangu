import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { ReferralData } from '@style-yangu/types'

interface UseReferralResult {
  referral: ReferralData | null
  loading: boolean
  error: string | null
}

export function useReferral(): UseReferralResult {
  const [referral, setReferral] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<ReferralData>('/consumer/referral')
      .then(setReferral)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { referral, loading, error }
}
