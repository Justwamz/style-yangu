import { useState } from 'react'
import type { StylePreference } from '@style-yangu/types'
import { useOnboarding } from '../OnboardingContext'

const STYLE_TILES: { id: StylePreference; label: string; icon: string }[] = [
  { id: 'smart_casual', label: 'Smart Casual', icon: '👔' },
  { id: 'business_casual', label: 'Business Casual', icon: '💼' },
  { id: 'streetwear', label: 'Streetwear', icon: '🧢' },
  { id: 'traditional_cultural', label: 'Traditional & Cultural', icon: '🌍' },
  { id: 'evening_formal', label: 'Evening & Formal', icon: '✨' },
  { id: 'athleisure', label: 'Athleisure', icon: '🏃' },
]

export default function Step06StylePrefs() {
  const { state, dispatch } = useOnboarding()
  const [selected, setSelected] = useState<StylePreference[]>(state.stylePreferences ?? [])

  function toggle(id: StylePreference) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    setSelected(next)
    dispatch({ type: 'SET_STYLE_PREFS', stylePreferences: next })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="font-display text-xl font-semibold text-center">Your Style Preferences</h2>
      <p className="text-sm text-center text-gray-500">Pick all that resonate with you.</p>

      <div className="grid grid-cols-2 gap-3">
        {STYLE_TILES.map(({ id, label, icon }) => {
          const isSelected = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={[
                'flex flex-col items-center gap-1 rounded-lg border-2 p-4 text-center text-sm font-medium transition-colors',
                isSelected
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
              ].join(' ')}
              aria-pressed={isSelected}
            >
              <span className="text-3xl" aria-hidden="true">{icon}</span>
              {label}
            </button>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-center text-xs text-amber-600">
          Select at least one to continue.
        </p>
      )}
    </div>
  )
}
