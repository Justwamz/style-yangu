import { useState } from 'react'
import { sellerApi } from '../context/SellerContext'
import type { ShowcaseMode } from './useShowcaseMode'

interface GenerateParams {
  itemId: string
  itemName: string
  mode: ShowcaseMode
  faceId: string | null
}

const COLOR_BY_MODE: Record<ShowcaseMode, string> = {
  full_body: 'D4A574/ffffff',
  face_neck: 'C8956C/ffffff',
  studio: 'E8D5B7/333333',
}

export function useGenerateShowcase() {
  const [generating, setGenerating] = useState(false)

  async function generate({ itemId, itemName, mode, faceId }: GenerateParams): Promise<string> {
    setGenerating(true)
    try {
      await sellerApi.post(`/seller/inventory/${itemId}/showcase`, { mode, faceId })
      await new Promise(resolve => setTimeout(resolve, 2500))
      const label = encodeURIComponent(itemName.slice(0, 20))
      // STUB: replace with API response resultUrl once showcase job endpoint is live
      return `https://placehold.co/400x600/${COLOR_BY_MODE[mode]}?text=${label}`
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating }
}
