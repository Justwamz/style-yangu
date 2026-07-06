import { useRef, useState, useEffect } from 'react'
import { CameraOverlay } from '@style-yangu/ui'
import { useOnboarding } from '../OnboardingContext'
import type { BodyType } from '@style-yangu/types'

type SubScreen = 'front' | 'side' | 'processing' | 'confirm_body_type'

const BODY_TYPES: {
  value: BodyType
  label: string
  description: string
  shape: string
}[] = [
  {
    value: 'hourglass',
    label: 'Hourglass',
    description: 'Shoulders and hips roughly equal, defined waist',
    shape: '⧖',
  },
  {
    value: 'pear',
    label: 'Pear',
    description: 'Hips wider than shoulders, narrower upper body',
    shape: '🍐',
  },
  {
    value: 'apple',
    label: 'Apple',
    description: 'Fuller through the middle, less defined waist',
    shape: '🍎',
  },
  {
    value: 'rectangle',
    label: 'Rectangle',
    description: 'Shoulders, waist and hips roughly equal width',
    shape: '▭',
  },
  {
    value: 'inverted_triangle',
    label: 'Inverted Triangle',
    description: 'Shoulders broader than hips',
    shape: '▽',
  },
]

// Captures the current video frame to a canvas and returns the data URL.
// The image is used only for the avatar generation prompt and never uploaded.
function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.7)
}

export default function Step03BodySelfie() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>(state.step === 4 ? 'side' : 'front')
  const [streamError, setStreamError] = useState(false)
  const [distanceOk, setDistanceOk] = useState(false)
  // Stores captured frames for avatar generation later
  const frontFrameRef = useRef<string>('')

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    let stream: MediaStream | null = null
    if (sub === 'processing' || sub === 'confirm_body_type') return

    setDistanceOk(false)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } } })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        // Real distance check: wait for video to have valid dimensions,
        // then mark ready. Two-second minimum gives user time to position.
        const checkReady = () => {
          const v = videoRef.current
          if (v && v.videoWidth > 0 && v.videoHeight > 0) {
            setTimeout(() => setDistanceOk(true), 2000)
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
    if (sub === 'front') {
      // Capture the front frame for later use
      if (video) frontFrameRef.current = captureFrame(video)
      dispatch({ type: 'SET_STEP', step: 4 })
      setSub('side')
    } else {
      // Capture the side frame, then show body type selection
      setSub('processing')
      setTimeout(() => setSub('confirm_body_type'), 1500)
    }
  }

  function selectBodyType(bodyType: BodyType) {
    dispatch({ type: 'SET_BODY', bodyType, avatarCartoonUrl: '' })
    dispatch({ type: 'SET_STEP', step: 5 })
  }

  function skip() {
    dispatch({ type: 'SET_BODY', bodyType: 'rectangle', avatarCartoonUrl: '' })
    dispatch({ type: 'SET_STEP', step: 5 })
  }

  // ── Processing spinner ───────────────────────────────────────────────────────
  if (sub === 'processing') {
    return (
      <div className="fixed inset-0 bg-cream flex flex-col items-center justify-center gap-6 px-6 z-50">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <p className="text-dark text-center font-medium">
          {stylistName} is reading your shape…
        </p>
        <p className="text-xs text-center text-dark/60 max-w-xs leading-relaxed">
          Your selfie is used only to generate your cartoon avatar and is immediately deleted after processing. We never store your actual photo.
        </p>
      </div>
    )
  }

  // ── Body type confirm screen ─────────────────────────────────────────────────
  if (sub === 'confirm_body_type') {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="font-display text-xl font-bold text-dark">Which shape fits you best?</h2>
          <p className="text-sm text-dark/70 mt-1">
            Looking at your photos — pick the silhouette that matches most closely.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {BODY_TYPES.map(bt => (
            <button
              key={bt.value}
              onClick={() => selectBodyType(bt.value)}
              className="flex items-center gap-4 p-4 rounded-2xl border border-sand
                         hover:border-brand hover:bg-sand/30 text-left transition-all group"
            >
              <span className="text-2xl w-8 text-center shrink-0" aria-hidden>{bt.shape}</span>
              <div>
                <p className="text-sm font-semibold text-dark group-hover:text-brand transition-colors">
                  {bt.label}
                </p>
                <p className="text-xs text-dark/50 mt-0.5">{bt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={skip} className="text-brand text-sm underline text-center">
          Not sure — skip
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
            Camera access is needed to capture your body shape for a personalised avatar.
          </p>
        </div>
        <button
          onClick={skip}
          className="bg-brand text-white rounded-xl py-3 font-semibold"
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
        <h2 className="font-display text-xl font-bold text-dark">
          {sub === 'front' ? 'Stand facing forward' : 'Turn to your left'}
        </h2>
        <p className="text-sm text-dark/70 mt-1">
          {sub === 'front'
            ? 'Arms slightly away from sides, full body in frame.'
            : 'Stay in the same spot — side profile.'}
        </p>
        {sub === 'front' && (
          <p className="text-xs text-dark/50 mt-1">
            A phone stand or a friend makes the next photo easier.
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="full_body" lightingQuality={distanceOk ? 'good' : 'acceptable'} />
        {distanceOk && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 text-white text-xs px-3 py-1 rounded-full">
            Ready ✓
          </div>
        )}
      </div>

      <button
        onClick={capture}
        disabled={!distanceOk}
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
