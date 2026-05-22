export type OverlayShape = 'oval_face' | 'full_body' | 'flat_lay_rect' | 'hand_oval' | 'forearm_rect' | 'fabric_rect'

interface CameraOverlayProps {
  shape: OverlayShape
  lightingQuality?: 'good' | 'acceptable' | 'poor'
}

const lightingColours = { good: '#22c55e', acceptable: '#f59e0b', poor: '#ef4444' }

export default function CameraOverlay({ shape, lightingQuality = 'good' }: CameraOverlayProps) {
  const dotColour = lightingColours[lightingQuality]
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {(shape === 'oval_face' || shape === 'hand_oval') && (
        <div className="border-2 border-white/70 rounded-full w-32 h-44 opacity-80" />
      )}
      {shape === 'full_body' && (
        <div className="border-2 border-green-400 rounded-lg w-40 h-96 opacity-80" />
      )}
      {(shape === 'flat_lay_rect' || shape === 'fabric_rect' || shape === 'forearm_rect') && (
        <div className="border-2 border-white/70 rounded-lg w-72 h-80 opacity-80" />
      )}
      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColour }} />
        <span className="text-white text-xs">
          {lightingQuality === 'good' ? 'Good light' : lightingQuality === 'acceptable' ? 'Acceptable' : 'Too dark'}
        </span>
      </div>
    </div>
  )
}
