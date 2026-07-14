import { useRef, useState } from 'react'
import { apiClient } from '@style-yangu/api-client'

const GARMENT_TYPES = [
  'Sundress', 'Maxi Dress', 'Skirt', 'Jumpsuit',
  'Shirt Dress', 'Co-ord Set', 'Buibui', 'Kitenge Wrap Dress', 'Leso', 'Other',
]

type Step = 'idle' | 'camera' | 'analyzing' | 'garment-select' | 'rendering' | 'render' | 'unavailable'

interface FabricAnalysis {
  pattern: string
  colours: string[]
  texture: string
  stylistComment: string
}

export default function FabricDesignTool() {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [analysis, setAnalysis] = useState<FabricAnalysis | null>(null)
  const [garment, setGarment] = useState<string | null>(null)
  const [renderUrl, setRenderUrl] = useState<string | null>(null)
  const [renderMetres, setRenderMetres] = useState<string>('2m')
  const [error, setError] = useState('')

  async function analyzeFabric(photoDataUrl: string) {
    setStep('analyzing')
    setError('')
    try {
      const result = await apiClient.post<FabricAnalysis>('/consumer/fabric-design', { photoDataUrl })
      setAnalysis(result)
      setStep('garment-select')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('not configured') || msg.includes('503')) {
        setStep('unavailable')
      } else {
        setError(msg || 'Analysis failed — please try again.')
        setStep('idle')
      }
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 } },
      })
      if (videoRef.current) videoRef.current.srcObject = stream
      setStep('camera')
    } catch {
      setError('Camera access denied — please use the upload option instead.')
    }
  }

  function captureFromCamera() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    const stream = video.srcObject as MediaStream | null
    stream?.getTracks().forEach(t => t.stop())

    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8)
    analyzeFabric(photoDataUrl)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const photoDataUrl = ev.target?.result as string
      if (photoDataUrl) analyzeFabric(photoDataUrl)
    }
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  async function selectGarment(type: string) {
    if (!analysis) return
    setGarment(type)
    setStep('rendering')
    setError('')
    try {
      const result = await apiClient.post<{ renderUrl: string; metres: string }>(
        '/consumer/fabric-design',
        { garmentType: type, analysis },
      )
      setRenderUrl(result.renderUrl)
      setRenderMetres(result.metres)
      setStep('render')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg || 'Render failed — please try again.')
      setStep('garment-select')
    }
  }

  function sendToTailor() {
    if (!analysis || !garment) return
    const text = `Hi, I'd like a ${garment} made from this fabric:\n\nPattern: ${analysis.pattern}\nColours: ${analysis.colours.join(', ')}\nTexture: ${analysis.texture}\n\nStylist note: ${analysis.stylistComment}\n\nEstimated fabric needed: ${renderMetres}\n\nGenerated via Style Yangu`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (step === 'unavailable') {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-sand rounded-2xl p-5 text-center">
          <p className="text-2xl mb-2">🪡</p>
          <p className="font-semibold text-dark">Coming soon</p>
          <p className="text-sm text-dark/60 mt-1">
            The fabric design tool is being set up. Check back soon.
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/60 rounded-xl" />
          </div>
          <p className="absolute bottom-24 inset-x-0 text-center text-white/70 text-xs">
            Frame the fabric flat with good lighting
          </p>
        </div>
        <div className="flex gap-3 p-4 bg-black">
          <button
            onClick={() => {
              const s = videoRef.current?.srcObject as MediaStream | null
              s?.getTracks().forEach(t => t.stop())
              setStep('idle')
            }}
            className="flex-1 border border-white/30 text-white rounded-xl py-3 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={captureFromCamera}
            className="flex-1 bg-white text-black rounded-xl py-3 font-semibold text-sm"
          >
            Capture
          </button>
        </div>
      </div>
    )
  }

  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-dark/70">Analysing your fabric…</p>
      </div>
    )
  }

  if (step === 'garment-select' && analysis) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-sand rounded-2xl p-4">
          <p className="font-semibold text-dark text-sm">{analysis.pattern}</p>
          <p className="text-xs text-dark/60 mt-1">{analysis.colours.join(', ')} · {analysis.texture}</p>
          <p className="text-xs text-brand mt-2 italic">{analysis.stylistComment}</p>
        </div>
        <p className="text-sm font-semibold text-dark">Choose a garment type:</p>
        <div className="grid grid-cols-2 gap-2">
          {GARMENT_TYPES.map(type => (
            <button
              key={type}
              onClick={() => selectGarment(type)}
              className="border border-sand rounded-xl py-2.5 text-sm text-dark hover:border-brand hover:text-brand transition-colors"
            >
              {type}
            </button>
          ))}
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      </div>
    )
  }

  if (step === 'rendering') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-dark/70">Rendering your {garment}…</p>
      </div>
    )
  }

  if (step === 'render' && analysis && garment) {
    return (
      <div className="flex flex-col gap-4">
        {renderUrl && (
          <img
            src={renderUrl}
            alt={`${garment} render`}
            className="w-full aspect-[3/4] object-cover rounded-2xl"
          />
        )}
        <div className="bg-white rounded-2xl border border-sand p-4">
          <p className="font-semibold text-dark">{garment}</p>
          <p className="text-sm text-dark/60 mt-1">{analysis.pattern}</p>
          <p className="text-sm text-dark/60 mt-0.5">Estimated fabric: {renderMetres}</p>
          <p className="text-xs text-brand mt-2 italic">{analysis.stylistComment}</p>
        </div>
        <button
          onClick={sendToTailor}
          className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm"
        >
          Send brief to a Tailor via WhatsApp
        </button>
        <button onClick={() => setStep('idle')} className="w-full border border-sand rounded-xl py-3 text-sm text-dark">
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        onClick={startCamera}
        className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm"
      >
        Photograph fabric
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full border border-sand rounded-xl py-3 text-sm text-dark"
      >
        Upload screenshot
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
