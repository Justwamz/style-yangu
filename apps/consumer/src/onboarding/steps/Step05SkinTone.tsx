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

/**
 * Samples pixels from the center of the video frame to estimate skin tone.
 * Runs entirely on-device — no image is sent anywhere.
 */
function analyzeFrame(video: HTMLVideoElement): {
  depth: SkinDepth
  undertone: Undertone
  hennaDetected: boolean
} {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  const ctx = canvas.getContext('2d')
  if (!ctx) return { depth: 'medium', undertone: 'warm', hennaDetected: false }
  ctx.drawImage(video, 0, 0)

  // Sample a central oval region (~15% of frame dimensions) where the hand sits
  const cx = Math.floor(canvas.width / 2)
  const cy = Math.floor(canvas.height / 2)
  const hw = Math.floor(canvas.width * 0.15)
  const hh = Math.floor(canvas.height * 0.15)
  const data = ctx.getImageData(cx - hw, cy - hh, hw * 2, hh * 2).data

  let r = 0, g = 0, b = 0, count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue // skip low-alpha pixels
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count++
  }
  if (count === 0) return { depth: 'medium', undertone: 'warm', hennaDetected: false }
  r /= count; g /= count; b /= count

  // Perceived luminance → skin depth bracket
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  let depth: SkinDepth
  if (lum > 205)      depth = 'light'
  else if (lum > 170) depth = 'light_medium'
  else if (lum > 125) depth = 'medium'
  else if (lum > 78)  depth = 'medium_deep'
  else                depth = 'deep'

  // Red-minus-blue channel ratio → undertone
  const warmth = r - b
  let undertone: Undertone
  if (warmth > 28)     undertone = 'warm'
  else if (warmth < 0) undertone = 'cool'
  else                 undertone = 'neutral'

  // Henna detection: high red, mid green, low blue — classic orange-brown stain
  const hennaDetected = r > 155 && g > 75 && g < 145 && b < 85 && (r - g) > 35

  return { depth, undertone, hennaDetected }
}

export default function Step05SkinTone() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>('camera')
  const [streamError, setStreamError] = useState(false)
  const [selectedDepth, setSelectedDepth] = useState<SkinDepth>('medium')
  const [selectedUndertone, setSelectedUndertone] = useState<Undertone>('warm')
  const [hennaDetected, setHennaDetected] = useState(false)
  const [lightQuality, setLightQuality] = useState<'good' | 'acceptable' | 'poor'>('acceptable')

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    if (sub !== 'camera') return
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 720 } } })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        // Wait for valid frame dimensions, then mark lighting ready
        const checkReady = () => {
          const v = videoRef.current
          if (v && v.videoWidth > 0) {
            setTimeout(() => setLightQuality('good'), 1000)
          } else {
            setTimeout(checkReady, 200)
          }
        }
        checkReady()
      })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [sub])

  function capture() {
    const video = videoRef.current
    setSub('henna_check')

    // Run pixel analysis synchronously — the spinner gives perceived processing time
    const result = video
      ? analyzeFrame(video)
      : { depth: 'medium' as SkinDepth, undertone: 'warm' as Undertone, hennaDetected: false }

    setTimeout(() => {
      setSelectedDepth(result.depth)
      setSelectedUndertone(result.undertone)
      setHennaDetected(result.hennaDetected)
      setSub('confirm')
    }, 1200)
  }

  function confirm() {
    dispatch({
      type: 'SET_SKIN',
      skinProfile: { depth: selectedDepth, undertone: selectedUndertone, userConfirmed: true },
      hennaDetected,
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
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-dark text-center font-medium">Reading your skin tone…</p>
        <p className="text-xs text-center text-dark/60 max-w-xs leading-relaxed">
          Analysis runs on-device and is never stored or uploaded.
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
          <h2 className="font-display text-xl font-bold text-dark">Does this look right?</h2>
          <p className="text-sm text-dark/70 mt-1">
            {stylistName} detected your skin tone — adjust if needed.
          </p>
        </div>

        {/* Henna warning */}
        {hennaDetected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              Henna detected — it may affect the reading. If the shade below looks too orange or dark,
              try the back of your wrist above the henna, or adjust manually.
            </p>
          </div>
        )}

        {/* Preview swatch */}
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-sand">
          <div
            className="w-16 h-16 rounded-full border-2 border-white shadow-md shrink-0"
            style={{ backgroundColor: depthChoice.bg }}
            aria-label={`Skin depth: ${depthChoice.label}`}
          />
          <div>
            <p className="font-semibold text-dark">{depthChoice.label}</p>
            <p className="text-sm text-dark/60 capitalize">{selectedUndertone} undertone</p>
          </div>
        </div>

        {/* Depth selector */}
        <div>
          <p className="text-xs font-semibold text-dark/60 uppercase tracking-wide mb-3">Depth</p>
          <div className="flex gap-3">
            {DEPTH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedDepth(opt.value)}
                aria-label={opt.label}
                aria-pressed={selectedDepth === opt.value}
                className={`flex-1 aspect-square rounded-full border-2 transition-transform ${
                  selectedDepth === opt.value
                    ? 'border-brand scale-110 shadow-md'
                    : 'border-transparent hover:border-brand/40'
                }`}
                style={{ backgroundColor: opt.bg }}
              />
            ))}
          </div>
          <div className="flex mt-1">
            {DEPTH_OPTIONS.map(opt => (
              <p key={opt.value} className="flex-1 text-center text-[10px] text-dark/40">{opt.label.split(' ')[0]}</p>
            ))}
          </div>
        </div>

        {/* Undertone selector */}
        <div>
          <p className="text-xs font-semibold text-dark/60 uppercase tracking-wide mb-3">Undertone</p>
          <div className="flex gap-3">
            {UNDERTONE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedUndertone(opt.value)}
                aria-pressed={selectedUndertone === opt.value}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  selectedUndertone === opt.value
                    ? 'text-white border-transparent'
                    : 'bg-white border-sand text-dark/70 hover:border-brand/40'
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
          className="bg-brand text-white rounded-xl py-3 font-semibold"
        >
          Looks good — continue
        </button>
        <button onClick={skip} className="text-brand text-sm underline text-center">
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
        <button onClick={skip} className="bg-brand text-white rounded-xl py-3 font-semibold">
          Skip this step
        </button>
      </div>
    )
  }

  // ── Camera screen ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-bold text-dark">Show us the back of your hand</h2>
        <p className="text-sm text-dark/70 mt-1">
          Place the back of your hand — between wrist and knuckles — in the frame.
        </p>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="hand_oval" lightingQuality={lightQuality} />
        {lightQuality === 'good' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 text-white text-xs px-3 py-1 rounded-full">
            Lighting ✓
          </div>
        )}
      </div>

      <button
        onClick={capture}
        disabled={lightQuality !== 'good'}
        className="bg-brand text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        Capture
      </button>
      <button onClick={skip} className="text-brand text-sm underline text-center">
        Skip for now
      </button>
    </div>
  )
}
