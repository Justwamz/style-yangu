import { sellerApi } from '../context/SellerContext'
import type { SellerTier } from '@style-yangu/types'

interface Props {
  imageUrl: string
  itemName: string
  priceKES: number
  itemId: string
  tier: SellerTier
  onPublish: () => void
}

const WATERMARKED_TIERS: SellerTier[] = ['free_trial', 'hustler']

export default function ShowcaseResult({ imageUrl, itemName, priceKES, itemId, tier, onPublish }: Props) {
  const showWatermark = WATERMARKED_TIERS.includes(tier)

  async function handlePublish() {
    await sellerApi.patch(`/seller/inventory/${itemId}`, { isLive: true })
    onPublish()
  }

  function handleShare() {
    const text = encodeURIComponent(
      `${itemName} — KES ${priceKES.toLocaleString()}\n${imageUrl}\n\nShop via Style Yangu`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-xs">
        <img src={imageUrl} alt={itemName} className="w-full rounded-xl object-cover" />
        {showWatermark && (
          <div
            data-testid="watermark"
            className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none"
          >
            <span className="text-white/70 text-xs font-semibold tracking-widest uppercase">
              Style Yangu
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={handlePublish}
          className="flex-1 bg-amber-800 text-white rounded-lg py-2 text-sm font-semibold"
        >
          Publish to shop
        </button>
        <a
          href={imageUrl}
          download={`${itemName}.jpg`}
          className="flex-1 border border-amber-800 text-amber-900 rounded-lg py-2 text-sm font-semibold text-center"
        >
          Download
        </a>
        <button
          onClick={handleShare}
          className="flex-1 border border-green-600 text-green-700 rounded-lg py-2 text-sm font-semibold"
        >
          WhatsApp
        </button>
      </div>
    </div>
  )
}
