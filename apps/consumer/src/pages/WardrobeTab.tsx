import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWardrobe } from '../hooks/useWardrobe'
import { useSuggestionContext } from '../context/SuggestionContext'
import WardrobeCameraCapture from '../components/WardrobeCameraCapture'
import type { WardrobeItem } from '@style-yangu/types'

const CATEGORIES = ['all', 'clothing', 'shoe', 'hat', 'bag', 'accessory']

export default function WardrobeTab() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [showCamera, setShowCamera] = useState(false)
  const { items, total, loading, addItem } = useWardrobe(activeCategory)
  const { unlockState, dispatchUnlock, unlockByWardrobe } = useSuggestionContext()

  const isUnlockMode = unlockState.unlockMode === 'wardrobe-unlock'
  const [capturedInSession, setCapturedInSession] = useState<string[]>([])

  async function handleCapture(photoDataUrl: string) {
    setShowCamera(false)
    const item = await addItem(photoDataUrl)

    if (isUnlockMode) {
      const next = [...capturedInSession, item.id]
      setCapturedInSession(next)
      dispatchUnlock({ type: 'WARDROBE_ITEM_CAPTURED' })

      if (next.length >= 2) {
        await unlockByWardrobe([next[0], next[1]] as [string, string])
        setCapturedInSession([])
        navigate('/home')
      }
    }
  }

  function handleCancel() {
    setShowCamera(false)
    if (isUnlockMode) dispatchUnlock({ type: 'CANCEL_WARDROBE_UNLOCK' })
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {isUnlockMode && (
        <div className="mb-4 bg-[#F5EDE5] rounded-2xl p-3 border border-[#8B4513]/20">
          <p className="text-sm font-semibold text-[#8B4513]">
            Add 2 items to unlock a suggestion — {capturedInSession.length}/2 captured
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#1A0A00]">My Wardrobe</h1>
        <p className="text-sm text-[#1A0A00]/50">{total} item{total !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#8B4513] text-white'
                : 'bg-white border border-[#E8DDD5] text-[#1A0A00]'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-[#1A0A00]/40 py-8">Loading wardrobe...</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-[#1A0A00]/40 py-8">No items in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-20">
          {items.map((item: WardrobeItem) => (
            <div key={item.id} className="aspect-square rounded-2xl overflow-hidden border border-[#E8DDD5] bg-[#F5EDE5]">
              <img src={item.photoUrl} alt="Wardrobe item" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowCamera(true)}
        aria-label="Add item"
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#8B4513] text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
      >
        📷
      </button>

      {showCamera && (
        <WardrobeCameraCapture onCapture={handleCapture} onCancel={handleCancel} />
      )}
    </div>
  )
}
