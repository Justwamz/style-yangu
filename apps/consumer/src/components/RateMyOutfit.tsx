import { useRef, useState } from 'react'

const CATEGORIES = ['Colour Harmony', 'Fit', 'Occasion Match', 'Weather Match', 'Cohesion'] as const

interface RatingResult {
  scores: Record<typeof CATEGORIES[number], number>
  overall: number
  stylistFeedback: string
  photoDataUrl: string
}

const STUB_RESULT: RatingResult = {
  scores: { 'Colour Harmony': 8, 'Fit': 7, 'Occasion Match': 8, 'Weather Match': 9, 'Cohesion': 7 },
  overall: 8,
  stylistFeedback: 'The palette works really well together. The layering adds depth without overwhelming the look.',
  photoDataUrl: 'https://placehold.co/300x400/8B4513/FFFFFF?text=Your+Outfit',
}

export default function RateMyOutfit() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<'idle' | 'camera' | 'processing' | 'result'>('idle')
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

  function captureAndProcess() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const stream = video.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())
    setStep('processing')
    setTimeout(() => {
      setResult(STUB_RESULT)
      setStep('result')
    }, 2500)
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
        <div className="w-16 h-16 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#1A0A00]/70">Your stylist is reviewing your look…</p>
      </div>
    )
  }

  if (step === 'result' && result) {
    return (
      <div className="flex flex-col gap-4">
        <img src={result.photoDataUrl} alt="Your outfit" className="w-full aspect-[3/4] object-cover rounded-2xl" />
        <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-[#1A0A00] text-lg">Overall: {result.overall}/10</p>
            <button onClick={() => setStep('idle')} className="text-xs text-[#1A0A00]/50">Retake</button>
          </div>
          {CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center justify-between py-1.5 border-b border-[#E8DDD5] last:border-0">
              <span className="text-sm text-[#1A0A00]">{cat}</span>
              <span className="text-sm font-medium text-[#8B4513]">{result.scores[cat]}/10</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#1A0A00]/70 italic px-1">"{result.stylistFeedback}"</p>
        <button onClick={share} className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold">
          Share my score
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startCamera}
      className="w-full bg-[#8B4513] text-white rounded-xl py-3 font-semibold text-sm"
    >
      Take a photo to rate
    </button>
  )
}
