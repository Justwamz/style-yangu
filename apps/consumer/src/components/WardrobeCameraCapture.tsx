import { useRef, useState, useEffect } from 'react'

interface Props {
  onCapture: (photoDataUrl: string) => void
  onCancel: () => void
}

export default function WardrobeCameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streamError, setStreamError] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s })
      .catch(() => setStreamError(true))
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [])

  async function capture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    onCapture(canvas.toDataURL('image/jpeg', 0.7))
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {streamError ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white text-sm">Camera access required to add wardrobe items.</p>
        </div>
      ) : (
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-[15%] border-2 border-white/60 rounded-lg" />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
      <div className="flex gap-3 p-4 bg-black">
        <button
          onClick={onCancel}
          className="flex-1 border border-white/30 text-white rounded-xl py-3 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={capture}
          disabled={streamError}
          className="flex-1 bg-white text-black rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
        >
          Capture
        </button>
      </div>
    </div>
  )
}
