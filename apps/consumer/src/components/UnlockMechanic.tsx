import { useState } from 'react'
import { canWatchAd, canAddWardrobe } from '../utils/unlockMachine'
import type { UnlockState } from '../utils/unlockMachine'
import type { SponsoredCard } from '@style-yangu/types'

const FEMALE_AD_STUB: SponsoredCard = {
  slotId: 'stub-1',
  itemId: 'stub-item-1',
  sellerStorefrontName: 'NairobiChic',
  showcaseImageUrl: 'https://placehold.co/400x500/8B4513/FFFFFF?text=Emerald+Wrap+Dress',
  priceKES: 2800,
  cta: 'talk_to_seller',
  isArtisanCard: false,
}

const MALE_AD_STUB: SponsoredCard = {
  slotId: 'stub-2',
  itemId: 'stub-item-2',
  sellerStorefrontName: 'ModernAfrika',
  showcaseImageUrl: 'https://placehold.co/400x500/5C3A1E/FFFFFF?text=Linen+Shirt',
  priceKES: 1500,
  cta: 'talk_to_seller',
  isArtisanCard: false,
}

interface Props {
  unlockState: UnlockState
  stylistName: 'amara' | 'kofi'
  onUnlockByAd: () => Promise<void>
  onStartWardrobeUnlock: () => void
}

export default function UnlockMechanic({ unlockState, stylistName, onUnlockByAd, onStartWardrobeUnlock }: Props) {
  const [showingAd, setShowingAd] = useState(false)
  const [adTimer, setAdTimer] = useState(3)

  if (unlockState.unlockMode === 'done' || unlockState.unlockCount >= 3) return null

  const adCard = stylistName === 'kofi' ? MALE_AD_STUB : FEMALE_AD_STUB

  async function watchAd() {
    setShowingAd(true)
    setAdTimer(3)
    const interval = setInterval(() => {
      setAdTimer(t => {
        if (t <= 1) {
          clearInterval(interval)
          setShowingAd(false)
          onUnlockByAd()
        }
        return t - 1
      })
    }, 1000)
  }

  if (showingAd) {
    return (
      <div className="bg-white rounded-2xl border border-[#E8DDD5] overflow-hidden">
        <div className="relative">
          <img src={adCard.showcaseImageUrl} alt={adCard.sellerStorefrontName} className="w-full aspect-[3/4] object-cover" />
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            Sponsored
          </div>
          <div className="absolute bottom-2 right-2 bg-[#8B4513] text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
            {adTimer}
          </div>
        </div>
        <div className="p-3">
          <p className="font-medium text-sm text-[#1A0A00]">{adCard.sellerStorefrontName}</p>
          <p className="text-sm text-[#1A0A00]/60">KES {adCard.priceKES.toLocaleString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F5EDE5] rounded-2xl p-4">
      <p className="text-sm font-semibold text-[#1A0A00] mb-3">
        Want {3 - unlockState.unlockCount} more {3 - unlockState.unlockCount === 1 ? 'idea' : 'ideas'} today?
      </p>
      <div className="flex gap-2">
        {canWatchAd(unlockState) && (
          <button
            onClick={watchAd}
            className="flex-1 bg-[#8B4513] text-white rounded-xl py-2.5 text-sm font-medium"
          >
            Watch a look
          </button>
        )}
        {canAddWardrobe(unlockState) && (
          <button
            onClick={onStartWardrobeUnlock}
            className="flex-1 border border-[#8B4513] text-[#8B4513] rounded-xl py-2.5 text-sm font-medium"
          >
            Add 2 items
          </button>
        )}
      </div>
      {unlockState.wardrobePairsUsed > 0 && (
        <p className="mt-2 text-xs text-[#1A0A00]/50 text-center">
          {unlockState.adsWatched}/{2} ads · {unlockState.wardrobePairsUsed}/{2} wardrobe pairs
        </p>
      )}
    </div>
  )
}
