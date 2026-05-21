import type { SponsoredCard as SponsoredCardType } from '@style-yangu/types'
import Badge from './Badge'

interface SponsoredCardProps {
  card: SponsoredCardType
  onCTA: (action: SponsoredCardType['cta']) => void
}

export default function SponsoredCard({ card, onCTA }: SponsoredCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
      <div className="relative">
        <img className="w-full aspect-[3/4] object-cover" src={card.showcaseImageUrl} alt={card.sellerStorefrontName} />
        <div className="absolute top-2 right-2"><Badge label="Sponsored" variant="sponsored" /></div>
      </div>
      <div className="p-3">
        <p className="font-medium text-sm">{card.sellerStorefrontName}</p>
        <p className="text-sm text-gray-500">KES {card.priceKES.toLocaleString()}</p>
        <button
          onClick={() => onCTA(card.cta)}
          className="mt-2 w-full py-2 bg-black text-white text-sm rounded-xl"
        >
          {card.isArtisanCard ? 'Book a Consultation' : 'Talk to Seller'}
        </button>
      </div>
    </div>
  )
}
