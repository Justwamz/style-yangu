import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { useProfileContext } from '../context/ProfileContext'
import DiscoverCard from '../components/DiscoverCard'
import type { DiscoverItem } from '@style-yangu/types'

export default function DiscoverTab() {
  const { profile } = useProfileContext()
  const [items, setItems] = useState<DiscoverItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<{ items: DiscoverItem[] }>('/consumer/discover')
      .then(data => setItems(data.items))
      .finally(() => setLoading(false))
  }, [])

  const stylistName = profile?.stylistName ?? 'amara'

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="font-display text-xl font-bold text-dark mb-4">Discover</h1>
      {loading ? (
        <p className="text-center text-sm text-dark/40 py-8">Finding items for you…</p>
      ) : (
        <div className="flex flex-col gap-4 pb-6">
          {items.map(item => (
            <DiscoverCard key={item.id} item={item} stylistName={stylistName} />
          ))}
        </div>
      )}
    </div>
  )
}
