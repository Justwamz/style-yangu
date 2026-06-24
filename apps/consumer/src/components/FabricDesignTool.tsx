import { useRef, useState } from 'react'

const GARMENT_TYPES = [
  'Sundress', 'Maxi Dress', 'Skirt', 'Jumpsuit',
  'Shirt Dress', 'Co-ord Set', 'Buibui', 'Kitenge Wrap Dress', 'Leso', 'Other',
]

type Step = 'idle' | 'analysis' | 'garment-select' | 'render'

interface FabricAnalysis {
  pattern: string
  colours: string[]
  texture: string
  stylistComment: string
}

const STUB_ANALYSIS: FabricAnalysis = {
  pattern: 'Geometric Kitenge print',
  colours: ['Terracotta', 'Cream', 'Forest Green'],
  texture: 'Medium weight cotton',
  stylistComment: 'This warm terracotta print works beautifully with your undertone. A wrap silhouette will complement your proportions.',
}

export default function FabricDesignTool() {
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [analysis, setAnalysis] = useState<FabricAnalysis | null>(null)
  const [garment, setGarment] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('analysis')
    setTimeout(() => { setAnalysis(STUB_ANALYSIS); setStep('garment-select') }, 2000)
  }

  async function startCamera() {
    setStep('analysis')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setStep('idle')
      return
    }
    setTimeout(() => { setAnalysis(STUB_ANALYSIS); setStep('garment-select') }, 2000)
  }

  function selectGarment(type: string) {
    setGarment(type)
    setStep('render')
  }

  if (step === 'analysis') {
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
      </div>
    )
  }

  if (step === 'render' && analysis && garment) {
    const metres = garment.toLowerCase().includes('maxi') || garment.toLowerCase().includes('dress') ? '3.5m' : '2m'
    return (
      <div className="flex flex-col gap-4">
        <img
          src={`https://placehold.co/300x400/8B4513/FFFFFF?text=${encodeURIComponent(garment)}`}
          alt={`${garment} render`}
          className="w-full aspect-[3/4] object-cover rounded-2xl"
        />
        <div className="bg-white rounded-2xl border border-sand p-4">
          <p className="font-semibold text-dark">{garment}</p>
          <p className="text-sm text-dark/60 mt-1">{analysis.pattern}</p>
          <p className="text-sm text-dark/60 mt-0.5">Estimated fabric: {metres}</p>
          <p className="text-xs text-brand mt-2 italic">{analysis.stylistComment}</p>
        </div>
        <button
          className="w-full border border-sand rounded-xl py-3 text-sm text-dark/50"
          disabled
        >
          Send to Tailor — Coming soon
        </button>
        <button onClick={() => setStep('idle')} className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm">
          Start over
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
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
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
