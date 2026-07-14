import { useRef, useState } from 'react'
import { apiClient } from '@style-yangu/api-client'

const CATEGORIES = ['Colour Harmony', 'Fit', 'Occasion Match', 'Weather Match', 'Cohesion'] as const

interface RatingResult {
  scores: Record<typeof CATEGORIES[number], number>
  overall: number
  stylistFeedback: string
  photoDataUrl: string
}

export default function RateMyOutfit() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<'idle' | 'camera' | 'processing' | 'result' | 'unavailable'>('idle')
  const [result, setResult] = useState<RatingResult | null>(null)

  async function startCamera() {
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setStep('idle')
    }
  }

  async function captureAndProcess() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)

    const stream = video.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())

    setStep('processing')

    try {
      const data = await apiClient.post<{
        scores: Record<string, number>
        overall: number
        stylistFeedback: string
      }>('/consumer/rate-outfit', { photoDataUrl })

      const scores = CATEGORIES.reduce((acc, cat) => {
        acc[cat] = Math.round(Math.max(0, Math.min(10, data.scores[cat] ?? 7)))
        return acc
      }, {} as Record<typeof CATEGORIES[number], number>)

      setResult({ scores, overall: Math.round(data.overall), stylistFeedback: data.stylistFeedback, photoDataUrl })
      setStep('result')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('not configured') || msg.includes('503')) {
        setStep('unavailable')
      } else {
        // Retry-able error — go back to idle
        setStep('idle')
      }
    }
  }

  async function share() {
    if (!result) return
    const text = `My outfit scored ${result.overall}/10 on Style Yangu! ✨`
    if (navigator.share) {
      await navigator.share({ title: 'My Style Score', text }).catch(() => undefined)
    } else {
      await navigator.clipboard.writeText(text).catch(() => undefined)
    }
  }

  if (step === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-sand rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">✨</p>
          <p className="font-semibold text-dark">Coming soon</p>
          <p className="text-sm text-dark/60 mt-1">
            Your stylist's AI eye is being set up. Check back soon.
          </p>
        </div>
        <button onClick={() => setStep('idle')} className="text-brand text-sm underline text-center">
          Try again
        </button>
      </div>
    )
  }

  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="flex gap-3 p-4 bg-black">
          <button onClick={() => setStep('idle')} className="flex-1 border border-white/30 text-white rounded-xl py-3 text-sm">Cancel</button>
          <button onClick={captureAndProcess} className="flex-1 bg-white text-black rounded-xl py-3 font-semibold text-sm">Capture</button>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-dark/70">Your stylist is reviewing your look…</p>
      </div>
    )
  }

  if (step === 'result' && result) {
    return (
      <div className="flex flex-col gap-4">
        <img src={result.photoDataUrl} alt="Your outfit" className="w-full aspect-[3/4] object-cover rounded-2xl" />
        <div className="bg-white rounded-2xl border border-sand p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-dark text-lg">Overall: {result.overall}/10</p>
            <button onClick={() => setStep('idle')} className="text-xs text-dark/50">Retake</button>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center justify-between py-1.5 border-b border-sand last:border-0">
              <span className="text-sm text-dark">{cat}</span>
              <span className="text-sm font-medium text-brand">{result.scores[cat]}/10</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-dark/70 italic px-1">"{result.stylistFeedback}"</p>
        <button onClick={share} className="w-full bg-brand text-white rounded-xl py-3 font-semibold">
          Share my score
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startCamera}
      className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm"
    >
      Take a photo to rate
    </button>
  )
}
