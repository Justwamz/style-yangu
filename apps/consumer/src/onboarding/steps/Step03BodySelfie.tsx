import { useRef, useState, useEffect } from 'react'
import { CameraOverlay } from '@style-yangu/ui'
import { useOnboarding } from '../OnboardingContext'

type SubScreen = 'front' | 'side' | 'processing'

const AVATAR_PLACEHOLDER = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><circle cx='100' cy='60' r='40' fill='%238B4513'/><rect x='60' y='110' width='80' height='150' rx='10' fill='%23C4A882'/></svg>`

export default function Step03BodySelfie() {
  const { state, dispatch } = useOnboarding()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [sub, setSub] = useState<SubScreen>(state.step === 4 ? 'side' : 'front')
  const [streamError, setStreamError] = useState(false)
  const [distanceOk, setDistanceOk] = useState(false)

  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  useEffect(() => {
    let stream: MediaStream | null = null
    if (sub === 'processing') return

    setDistanceOk(false)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setTimeout(() => setDistanceOk(true), 2000)
      })
      .catch(() => setStreamError(true))

    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [sub])

  function capture() {
    if (sub === 'front') {
      dispatch({ type: 'SET_STEP', step: 4 })
      setSub('side')
    } else {
      setSub('processing')
      setTimeout(() => {
        dispatch({ type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: AVATAR_PLACEHOLDER })
        dispatch({ type: 'SET_STEP', step: 5 })
      }, 2000)
    }
  }

  function skip() {
    dispatch({ type: 'SET_BODY', bodyType: 'hourglass', avatarCartoonUrl: AVATAR_PLACEHOLDER })
    dispatch({ type: 'SET_STEP', step: 5 })
  }

  if (sub === 'processing') {
    return (
      <div className="fixed inset-0 bg-[#FDFAF7] flex flex-col items-center justify-center gap-6 px-6 z-50">
        <div className="w-12 h-12 border-4 border-[#8B4513] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1A0A00] text-center font-medium">
          {stylistName} is getting to know your shape…
        </p>
        <p className="text-xs text-center text-[#1A0A00]/60 max-w-xs leading-relaxed">
          Your selfie is used only to generate your cartoon avatar and is immediately deleted after processing. We never store your actual photo at any point.
        </p>
      </div>
    )
  }

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
          className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
        >
          Skip this step
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#1A0A00]">
          {sub === 'front' ? 'Stand facing forward' : 'Turn to your left'}
        </h2>
        <p className="text-sm text-[#1A0A00]/70 mt-1">
          {sub === 'front'
            ? 'Arms slightly away from sides, full body in frame.'
            : 'Stay in the same spot.'}
        </p>
        {sub === 'front' && (
          <p className="text-xs text-[#1A0A00]/50 mt-1">
            You may need a phone stand or a friend for the next one.
          </p>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16]">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        <CameraOverlay shape="full_body" lightingQuality={distanceOk ? 'good' : 'acceptable'} />
        {distanceOk && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/80 text-white text-xs px-3 py-1 rounded-full">
            Distance ✓
          </div>
        )}
      </div>

      <button
        onClick={capture}
        disabled={!distanceOk}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold disabled:opacity-40"
      >
        Capture
      </button>
      <button onClick={skip} className="text-[#8B4513] text-sm underline text-center">
        Skip for now
      </button>
    </div>
  )
}
