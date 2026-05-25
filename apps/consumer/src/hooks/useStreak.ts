import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { StreakData } from '@style-yangu/types'

interface UseStreakResult {
  streak: StreakData | null
  loading: boolean
  error: string | null
}

export function useStreak(): UseStreakResult {
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<StreakData>('/consumer/streak')
      .then(setStreak)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { streak, loading, error }
}
