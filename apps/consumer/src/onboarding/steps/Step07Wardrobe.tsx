import { useRef, useState, useEffect } from 'react'
import { CameraOverlay } from '@style-yangu/ui'
import { useOnboarding } from '../OnboardingContext'
import { compressImageToBlob } from '@style-yangu/utils'
import type { WardrobeItem } from '../OnboardingContext'

const PROMPTS = [
  'Something you would wear on a rainy day',
  'Something you would wear on a hot sunny day',
  'Something you would wear to the office',
  'Something you would wear on a date',
  'Something you would wear to a wedding as a guest',
  'Something casual for a weekend',
]

export default function Step07Wardrobe() {
  const { dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [promptIndex, setPromptIndex] = useState(0)
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    if (promptIndex >= PROMPTS.length) return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [promptIndex])

  async function capture(tag: 'owned' | 'purchased_planned' = 'owned') {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    const blob = await compressImageToBlob(dataUrl, 300)
    const compressedDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    const item: WardrobeItem = {
      id: crypto.randomUUID(),
      photoDataUrl: compressedDataUrl,
      prompt: PROMPTS[promptIndex],
      tag,
    }
    const next = [...items, item]
    setItems(next)
    advance(next)
  }

  function advance(capturedItems = items) {
    if (promptIndex < PROMPTS.length - 1) {
      setPromptIndex(i => i + 1)
    } else {
      done(capturedItems)
    }
  }

  function done(capturedItems = items) {
    dispatch({ type: 'SET_WARDROBE', wardrobeItems: capturedItems })
    dispatch({ type: 'SET_STEP', step: 8 })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-[#8B4513] font-medium">
          {promptIndex + 1} of {PROMPTS.length}
        </p>
        <h2 className="text-xl font-bold text-[#1A0A00] mt-1">{PROMPTS[promptIndex]}</h2>
      </div>

      {streamError ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">Camera needed for wardrobe photos.</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <CameraOverlay shape="flat_lay_rect" lightingQuality="good" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <button
        onClick={() => capture('owned')}
        disabled={streamError}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        Capture
      </button>

      <button
        onClick={() => capture('purchased_planned')}
        disabled={streamError}
        className="border border-[#E8DDD5] rounded-xl py-3 text-sm text-[#1A0A00]"
      >
        Use Instagram screenshot
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => advance()}
          className="flex-1 border border-[#E8DDD5] rounded-xl py-2 text-sm text-[#1A0A00]"
        >
          Skip this item
        </button>
        <button
          onClick={() => done()}
          className="flex-1 border border-[#E8DDD5] rounded-xl py-2 text-sm text-[#1A0A00]"
        >
          Done
        </button>
      </div>
    </div>
  )
}
