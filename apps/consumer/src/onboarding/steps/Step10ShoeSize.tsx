import { useState } from 'react'
import { ukToEU, euToUK } from '@style-yangu/utils'
import { useOnboarding } from '../OnboardingContext'

export default function Step10ShoeSize() {
  const { state, dispatch } = useOnboarding()
  const [uk, setUk] = useState(state.shoeSizeUK?.toString() ?? '')
  const [eu, setEu] = useState(state.shoeSizeEU?.toString() ?? '')

  function handleUK(raw: string) {
    setUk(raw)
    const n = parseFloat(raw)
    if (!isNaN(n)) {
      const euVal = ukToEU(n)
      setEu(euVal.toString())
      dispatch({ type: 'SET_SHOE_SIZE', shoeSizeUK: n, shoeSizeEU: euVal })
    }
  }

  function handleEU(raw: string) {
    setEu(raw)
    const n = parseFloat(raw)
    if (!isNaN(n)) {
      const ukVal = euToUK(n)
      setUk(ukVal.toString())
      dispatch({ type: 'SET_SHOE_SIZE', shoeSizeUK: ukVal, shoeSizeEU: n })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-dark">Your shoe size</h2>
        <p className="mt-1 text-sm text-dark/60">Optional. Enter either size and we'll convert.</p>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="shoe-uk" className="block text-sm font-medium text-dark mb-1">UK</label>
          <input
            id="shoe-uk"
            type="number"
            min="1"
            max="18"
            step="0.5"
            placeholder="e.g. 6"
            value={uk}
            onChange={e => handleUK(e.target.value)}
            className="w-full border border-sand rounded-xl px-4 py-3 bg-cream text-dark focus:outline-none focus:border-brand"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="shoe-eu" className="block text-sm font-medium text-dark mb-1">EU</label>
          <input
            id="shoe-eu"
            type="number"
            min="34"
            max="51"
            step="0.5"
            placeholder="e.g. 39"
            value={eu}
            onChange={e => handleEU(e.target.value)}
            className="w-full border border-sand rounded-xl px-4 py-3 bg-cream text-dark focus:outline-none focus:border-brand"
          />
        </div>
      </div>
    </div>
  )
}
