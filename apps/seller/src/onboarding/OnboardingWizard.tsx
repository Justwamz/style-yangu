import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'
import type { SellerType } from '@style-yangu/types'

const SELLER_TYPES: { value: SellerType; label: string }[] = [
  { value: 'seller', label: 'Seller' },
  { value: 'tailor', label: 'Tailor' },
  { value: 'cobbler', label: 'Cobbler' },
  { value: 'bag_maker', label: 'Bag Maker' },
  { value: 'jewellery_maker', label: 'Jewellery Maker' },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const navigate = useNavigate()

  async function handleTypeSelect(sellerType: SellerType) {
    await sellerApi.post('/seller/onboarding/complete', { businessName, sellerType })
    navigate('/inventory', { replace: true })
  }

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
        <h1 className="text-xl font-bold mb-6" style={{ color: '#8B4513' }}>What's your business called?</h1>
        <input
          placeholder="Business name"
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-700"
        />
        <button
          onClick={() => setStep(1)}
          disabled={!businessName.trim()}
          className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-xl font-bold mb-2" style={{ color: '#8B4513' }}>What best describes you?</h1>
      <p className="text-sm text-gray-500 mb-6">Choose your seller type</p>
      <div className="w-full max-w-sm space-y-3">
        {SELLER_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => handleTypeSelect(t.value)}
            className="w-full border border-amber-800 text-amber-900 rounded-lg py-3 font-medium hover:bg-amber-50"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
