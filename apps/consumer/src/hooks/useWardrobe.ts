import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { WardrobeItem, WardrobeResponse } from '@style-yangu/types'

interface UseWardrobeResult {
  items: WardrobeItem[]
  total: number
  loading: boolean
  error: string | null
  addItem: (photoDataUrl: string) => Promise<WardrobeItem>
  refetch: () => void
}

export function useWardrobe(category = 'all'): UseWardrobeResult {
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    apiClient.get<WardrobeResponse>(`/consumer/wardrobe?category=${category}&page=1`)
      .then(data => { setItems(data.items); setTotal(data.total) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [category, tick])

  const addItem = useCallback(async (photoDataUrl: string): Promise<WardrobeItem> => {
    const data = await apiClient.post<{ item: WardrobeItem }>('/consumer/wardrobe/item', { photoDataUrl })
    setItems(prev => [data.item, ...prev])
    setTotal(prev => prev + 1)
    return data.item
  }, [])

  const refetch = useCallback(() => setTick(t => t + 1), [])

  return { items, total, loading, error, addItem, refetch }
}
