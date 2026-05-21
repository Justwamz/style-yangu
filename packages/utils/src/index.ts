export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`
}

export function ukToEU(ukSize: number): number {
  return ukSize + 33
}

export function euToUK(euSize: number): number {
  return euSize - 33
}

export function isValidMpesaNumber(phone: string): boolean {
  return /^(?:254|0)[17]\d{8}$/.test(phone.replace(/\s/g, ''))
}

export function formatMpesaNumber(phone: string): string {
  const clean = phone.replace(/\s/g, '')
  if (clean.startsWith('0')) return `254${clean.slice(1)}`
  if (clean.startsWith('+')) return clean.slice(1)
  return clean
}

export function compressImageToBlob(dataUrl: string, targetKB: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      const quality = Math.min(0.9, (targetKB * 1024) / (img.width * img.height * 3))
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('Compression failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

export function adFrequencyAdsPerSuggestion(phase: 'pre_activation' | 'launch' | 'growth'): number {
  return phase === 'pre_activation' ? 0 : phase === 'launch' ? 1 : 2
}
