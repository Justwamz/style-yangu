import { useState } from 'react'
import type { DiscoverItem } from '@style-yangu/types'

interface Props {
  item: DiscoverItem
  stylistName: string
}

export default function DiscoverCard({ item, stylistName }: Props) {
  const [wishlisted, setWishlisted] = useState(false)
  const [followed, setFollowed] = useState(false)
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)

  function talkToSeller() {
    const msg = encodeURIComponent(
      `Hi, I'm enquiring about "${item.name}" (KES ${item.priceKES.toLocaleString()}) that I found on Style Yangu.`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <div className="bg-white rounded-2xl border border-sand overflow-hidden shadow-sm">
      <div className="relative">
        <img src={item.photoUrl} alt={item.name} className="w-full aspect-[4/5] object-cover" />
        {item.sponsored && (
          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            Sponsored
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-brand mb-1">{name} found this for you</p>
        <p className="font-semibold text-dark text-sm">{item.name}</p>
        <p className="text-sm text-dark/60">KES {item.priceKES.toLocaleString()} · {item.sellerName}</p>
        <p className="text-xs text-dark/50 mt-1">{item.matchReason}</p>
        <button
          onClick={talkToSeller}
          className="mt-3 w-full bg-brand text-white rounded-xl py-2 text-sm font-medium"
        >
          Talk to Seller
        </button>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setFollowed(f => !f)}
            className={`flex-1 border rounded-xl py-1.5 text-xs transition-colors ${followed ? 'border-brand text-brand' : 'border-sand text-dark/60'}`}
          >
            {followed ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={() => setWishlisted(w => !w)}
            className={`flex-1 border rounded-xl py-1.5 text-xs transition-colors ${wishlisted ? 'border-brand text-brand' : 'border-sand text-dark/60'}`}
          >
            {wishlisted ? '♥ Saved' : '♡ Wishlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
