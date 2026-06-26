import { useState } from 'react'
import { sellerApi } from '../context/SellerContext'
import type { ShowcaseMode } from './useShowcaseMode'

interface GenerateParams {
  itemId: string
  itemName?: string
  mode: ShowcaseMode
  faceId: string | null
}

export function useGenerateShowcase() {
  const [generating, setGenerating] = useState(false)

  async function generate({ itemId, mode, faceId }: GenerateParams): Promise<string> {
    setGenerating(true)
    try {
      const data = await sellerApi.post<{ resultUrl: string }>(
        `/seller/inventory/${itemId}/showcase`,
        { mode, faceId },
      )
      return data.resultUrl
    } finally {
      setGenerating(false)
    }
  }

  return { generate, generating }
}
