import { useRef, useState, useEffect } from 'react'
import { CameraOverlay } from '@style-yangu/ui'
import { useOnboarding } from '../OnboardingContext'
import type { SkinDepth, Undertone } from '@style-yangu/types'

type SubScreen = 'camera' | 'henna_check' | 'confirm'

const DEPTH_COLOURS: Record<SkinDepth, string> = {
  light:        '#F5D9C8',
  light_medium: '#E8C4A4',
  medium:       '#C8955A',
  medium_deep:  '#9B6640',
  deep:         '#6B3F23',
}

const DEPTH_OPTIONS: { value: SkinDepth; label: string; bg: string }[] = [
  { value: 'light',        label: 'Light',        bg: DEPTH_COLOURS.light },
  { value: 'light_medium', label: 'Light Medium',  bg: DEPTH_COLOURS.light_medium },
  { value: 'medium',       label: 'Medium',        bg: DEPTH_COLOURS.medium },
  { value: 'medium_deep',  label: 'Medium Deep',   bg: DEPTH_COLOURS.medium_deep },
  { value: 'deep',         label: 'Deep',          bg: DEPTH_COLOURS.deep },
]

const UNDERTONE_OPTIONS: { value: Undertone; label: string; accent: string }[] = [
  { value: 'warm',    label: 'Warm',    accent: '#D97706' },
  { value: 'cool',    label: 'Cool',    accent: '#6366F1' },
  { value: 'neutral', label: 'Neutral', accent: '#6B7280' },
]

export default function Step05SkinTone() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>('camera')
  const [streamError, setStreamError] = useState(false)
  const [selectedDepth, setSelectedDepth] = useState<SkinDepth>('medium')
  const [selectedUndertone, setSelectedUndertone] = useState<Undertone>('warm')
  const [lightQuality, setLightQuality] = useState<'good' | 'acceptable' | 'poor'>('acceptable')

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    if (sub !== 'camera') return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        // Stub: simulate lighting becoming good after 1s
        setTimeout(() => setLightQuality('good'), 1000)
      })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [sub])

  function capture() {
    setSub('henna_check')
    setTimeout(() => {
      setSelectedDepth('medium')
      setSelectedUndertone('warm')
      setSub('confirm')
    }, 1500)
  }

  function confirm() {
    dispatch({
      type: 'SET_SKIN',
      skinProfile: { depth: selectedDepth, undertone: selectedUndertone, userConfirmed: true },
      hennaDetected: false,
    })
    dispatch({ type: 'SET_STEP', step: 6 })
  }

  function skip() {
    dispatch({ type: 'SET_STEP', step: 6 })
  }

  // ── Henna check spinner ──────────────────────────────────────────────────────
  if (sub === 'henna_check') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="w-12 h-12 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1A0A00] text-center font-medium">
          Checking for henna…
        </p>
        <p className="text-xs text-center text-[#1A0A00]/60 max-w-xs leading-relaxed">
          Your photo is analysed on-device and never stored or uploaded.
        </p>
      </div>
    )
  }

  // ── Confirm screen ───────────────────────────────────────────────────────────
  if (sub === 'confirm') {
    const depthChoice = DEPTH_OPTIONS.find(d => d.value === selectedDepth) ?? DEPTH_OPTIONS[2]
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[#1A0A00]">Does this look right?</h2>
          <p className="text-sm text-[#1A0A00]/70 mt-1">
            {stylistName} detected your skin tone — adjust if needed.
          </p>
        </div>

        {/* Preview swatch */}
        <div className="flex items-center gap-4 bg-[#FAF6F1] rounded-2xl p-4">
          <div
            className="w-16 h-16 rounded-full border-2 border-white shadow-md flex-shrink-0"
            style={{ backgroundColor: depthChoice.bg }}
            aria-label={`Skin depth swatch: ${depthChoice.label}`}
          />
          <div>
            <p className="font-semibold text-[#1A0A00]">{depthChoice.label}</p>
            <p className="text-sm text-[#1A0A00]/60 capitalize">{selectedUndertone} undertone</p>
          </div>
        </div>

        {/* Sample colour palette strip */}
        <div className="flex gap-2 mb-2">
          {DEPTH_OPTIONS.map(d => (
            <div
              key={d.value}
              className="flex-1 h-4 rounded-full"
              style={{ backgroundColor: DEPTH_COLOURS[d.value] }}
            />
          ))}
        </div>

        {/* Depth selector */}
        <div>
          <p className="text-xs font-semibold text-[#1A0A00]/60 uppercase tracking-wide mb-2">Depth</p>
          <div className="flex gap-2 flex-wrap">
            {DEPTH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedDepth(opt.value)}
                aria-label={opt.label}
                aria-pressed={selectedDepth === opt.value}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${
                  selectedDepth === opt.value
                    ? 'border-[#8B4513] scale-110'
                    : 'border-transparent hover:border-[#8B4513]/40'
                }`}
                style={{ backgroundColor: opt.bg }}
              />
            ))}
          </div>
        </div>

        {/* Undertone selector */}
        <div>
          <p className="text-xs font-semibold text-[#1A0A00]/60 uppercase tracking-wide mb-2">Undertone</p>
          <div className="flex gap-3">
            {UNDERTONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedUndertone(opt.value)}
                aria-pressed={selectedUndertone === opt.value}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  selectedUndertone === opt.value
                    ? 'text-white border-transparent'
                    : 'bg-white border-[#E5DDD5] text-[#1A0A00]/70 hover:border-[#8B4513]/40'
                }`}
                style={selectedUndertone === opt.value ? { backgroundColor: opt.accent } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={confirm}
          className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
        >
          Looks good — continue
        </button>
        <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
          Skip for now
        </button>
      </div>
    )
  }

  // ── Camera denied ────────────────────────────────────────────────────────────
  if (streamError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            Camera access is needed to read your skin tone for personalised colour recommendations.
          </p>
        </div>
        <button
          onClick={skip}
          className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
        >
          Skip this step
        </button>
      </div>
    )
  }

  // ── Camera screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#1A0A00]">Show us the back of your hand</h2>
        <p className="text-sm text-[#1A0A00]/70 mt-1">
          Place the back of your hand between your wrist and knuckles in the frame.
        </p>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="hand_oval" lightingQuality={lightQuality} />
      </div>

      <button
        onClick={capture}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
      >
        Capture
      </button>
      <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
        Skip for now
      </button>
    </div>
  )
}
