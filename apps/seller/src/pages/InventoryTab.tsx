import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import InventoryCard from '../components/InventoryCard'
import type { InventoryItem, ItemCategory } from '@style-yangu/types'

type FilterChip = 'All' | 'Clothing' | 'Shoes' | 'Hats' | 'Bags'

const CLOTHING_CATS: ItemCategory[] = ['top', 'bottom', 'dress', 'suit', 'outerwear', 'jumpsuit']
const FILTER_MAP: Record<FilterChip, (item: InventoryItem) => boolean> = {
  All: () => true,
  Clothing: item => CLOTHING_CATS.includes(item.category),
  Shoes: item => item.category === 'shoe',
  Hats: item => item.category === 'hat' || item.category === 'headwrap',
  Bags: item => item.category === 'bag',
}

export default function InventoryTab() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterChip>('All')
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => sellerApi.get('/seller/inventory'),
  })

  const visible = items.filter(FILTER_MAP[filter])

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['All', 'Clothing', 'Shoes', 'Hats', 'Bags'] as FilterChip[]).map(chip => (
          <button
            key={chip}
            onClick={() => setFilter(chip)}
            className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${
              filter === chip ? 'bg-brand text-white border-brand' : 'border-sand text-mid'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-mid/50 py-8">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {visible.map(item => (
            <Link key={item.id} to={`/inventory/${item.id}`}>
              <InventoryCard item={item} />
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/inventory/new')}
        aria-label="+"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-brand text-white text-2xl shadow-lg flex items-center justify-center"
      >
        +
      </button>
    </div>
  )
}
