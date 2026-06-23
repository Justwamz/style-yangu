import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { InventoryItem } from '@style-yangu/types'

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: item, isLoading } = useQuery<InventoryItem>({
    queryKey: ['inventory', id],
    queryFn: () => sellerApi.get(`/seller/inventory/${id}`),
  })

  async function handleDelete() {
    if (!confirm('Delete this item?')) return
    await sellerApi.delete(`/seller/inventory/${id}`)
    qc.invalidateQueries({ queryKey: ['inventory'] })
    navigate('/inventory')
  }

  if (isLoading || !item) return <p className="p-4 text-gray-400">Loading…</p>

  return (
    <div className="p-4 space-y-4">
      {item.showcaseImageUrl && (
        <img src={item.showcaseImageUrl} alt={item.name} className="w-full rounded-xl max-h-64 object-cover" />
      )}
      <h2 className="text-xl font-bold">{item.name}</h2>
      <p className="text-gray-500">KES {item.priceKES.toLocaleString()}</p>
      <p className="text-sm text-gray-400">Category: {item.category}</p>
      <button
        onClick={handleDelete}
        className="w-full border border-red-500 text-red-600 rounded-lg py-2 mt-4"
      >
        Delete item
      </button>
    </div>
  )
}
