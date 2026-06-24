import { useState } from 'react'
import { useOnboarding } from '../OnboardingContext'

const CATEGORIES = [
  { key: 'top',       label: 'Tops' },
  { key: 'bottom',    label: 'Bottoms' },
  { key: 'shoe',      label: 'Shoes' },
  { key: 'dress',     label: 'Dresses & Suits' },
  { key: 'accessory', label: 'Accessories' },
]

export default function Step09Budget() {
  const { state, dispatch } = useOnboarding()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      CATEGORIES.map(c => [c.key, state.budgets?.[c.key]?.toString() ?? ''])
    )
  )

  function handleChange(key: string, raw: string) {
    const next = { ...values, [key]: raw }
    setValues(next)
    const budgets: Record<string, number> = {}
    for (const [k, v] of Object.entries(next)) {
      const n = parseInt(v, 10)
      if (!isNaN(n) && n > 0) budgets[k] = n
    }
    dispatch({ type: 'SET_BUDGETS', budgets })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-dark">Your budget</h2>
        <p className="mt-1 text-sm text-dark/60">Optional. Leave blank to skip a category.</p>
      </div>
      <div className="flex flex-col gap-4">
        {CATEGORIES.map(c => (
          <div key={c.key}>
            <label htmlFor={`budget-${c.key}`} className="block text-sm font-medium text-dark mb-1">
              {c.label}
            </label>
            <div className="flex items-center border border-sand rounded-xl overflow-hidden bg-cream">
              <span className="px-3 py-3 text-sm text-dark/50 bg-sand">KES</span>
              <input
                id={`budget-${c.key}`}
                type="number"
                min="0"
                step="100"
                placeholder="0"
                value={values[c.key]}
                onChange={e => handleChange(c.key, e.target.value)}
                className="flex-1 px-3 py-3 bg-transparent text-dark focus:outline-none text-sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
