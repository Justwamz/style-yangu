import { useQuery } from '@tanstack/react-query'
import { sellerApi } from '../context/SellerContext'
import type { FaceCard, SellerTier } from '@style-yangu/types'

interface Props {
  selectedId: string | null
  onSelect: (id: string) => void
  tier: SellerTier
}

export default function FaceLibraryPicker({ selectedId, onSelect, tier }: Props) {
  const { data: faces = [] } = useQuery<FaceCard[]>({
    queryKey: ['faces'],
    queryFn: () => sellerApi.get('/seller/faces'),
  })

  const allowedIds = new Set<string>()
  if (tier === 'free_trial') {
    const females = faces.filter(f => f.gender === 'female').slice(0, 2)
    const males = faces.filter(f => f.gender === 'male').slice(0, 2)
    ;[...females, ...males].forEach(f => allowedIds.add(f.id))
  }
  const isLocked = (face: FaceCard) => tier === 'free_trial' && !allowedIds.has(face.id)

  return (
    <div className="grid grid-cols-4 gap-2">
      {faces.map((face) => {
        const locked = isLocked(face)
        const selected = face.id === selectedId

        return (
          <div key={face.id} className="relative">
            <img
              src={face.thumbnailUrl}
              alt={`${face.gender} ${face.styleVibe}`}
              onClick={() => !locked && onSelect(face.id)}
              className={`w-full aspect-square object-cover rounded-lg cursor-pointer border-2 ${
                selected ? 'border-brand' : 'border-transparent'
              } ${locked ? 'opacity-40' : ''}`}
            />
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <span className="text-white text-xs font-semibold text-center px-1">Upgrade</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
