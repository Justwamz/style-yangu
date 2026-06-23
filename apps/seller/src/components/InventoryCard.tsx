import type { InventoryItem } from '@style-yangu/types'

function stockBadge(item: InventoryItem): { label: string; color: string } | null {
  if (item.isSoldOut) return { label: 'Sold Out', color: 'bg-red-100 text-red-700' }
  const lowStock = item.sizes.length > 0 && item.sizes.every(s => s.quantity <= 1)
  if (lowStock) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700' }
  if (item.isLive) return { label: 'Live', color: 'bg-green-100 text-green-700' }
  return null
}

export default function InventoryCard({ item }: { item: InventoryItem }) {
  const badge = stockBadge(item)

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
      {item.showcaseImageUrl ? (
        <img src={item.showcaseImageUrl} alt={item.name} className="w-full aspect-[3/4] object-cover" />
      ) : (
        <div
          data-testid="img-placeholder"
          className="w-full aspect-[3/4] bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center"
        >
          <span className="text-amber-600 text-xs">No image</span>
        </div>
      )}
      <div className="p-2">
        <p className="text-sm font-semibold truncate">{item.name}</p>
        <p className="text-xs text-gray-500">KES {item.priceKES.toLocaleString()}</p>
        {badge && (
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  )
}
