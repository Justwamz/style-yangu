import { useState } from 'react'
import RateMyOutfit from '../components/RateMyOutfit'
import FabricDesignTool from '../components/FabricDesignTool'

type ActiveTool = null | 'rate' | 'fabric'

export default function StyleTab() {
  const [active, setActive] = useState<ActiveTool>(null)

  if (active === 'rate') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => setActive(null)} className="mb-4 text-sm text-brand">← Back</button>
        <h1 className="font-display text-xl font-bold text-dark mb-4">Rate My Outfit</h1>
        <RateMyOutfit />
      </div>
    )
  }

  if (active === 'fabric') {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <button onClick={() => setActive(null)} className="mb-4 text-sm text-brand">← Back</button>
        <h1 className="font-display text-xl font-bold text-dark mb-4">Fabric Design Tool</h1>
        <FabricDesignTool />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-4">
      <h1 className="font-display text-xl font-bold text-dark">Style</h1>

      <button
        onClick={() => setActive('rate')}
        className="w-full bg-white rounded-2xl border border-sand p-5 text-left shadow-sm"
      >
        <p className="text-2xl mb-2">⭐</p>
        <p className="font-bold text-dark">Rate My Outfit</p>
        <p className="text-sm text-dark/60 mt-1">
          Get your photo rated across 5 style categories by your personal stylist.
        </p>
      </button>

      <button
        onClick={() => setActive('fabric')}
        className="w-full bg-white rounded-2xl border border-sand p-5 text-left shadow-sm"
      >
        <p className="text-2xl mb-2">🪡</p>
        <p className="font-bold text-dark">Fabric Design Tool</p>
        <p className="text-sm text-dark/60 mt-1">
          Photograph any fabric and see it turned into a garment — then send the brief to a tailor.
        </p>
      </button>
    </div>
  )
}
