import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@style-yangu/api-client'
import type { SponsoredCard } from '@style-yangu/types'

export function useAdBoost(consumerId: string) {
  return useQuery<SponsoredCard | null>({
    queryKey: ['ad-boost', 'sponsored-card', consumerId],
    queryFn: () => apiClient.get<SponsoredCard | null>(`/ads/sponsored-card/${consumerId}`),
    staleTime: 0,
  })
}
