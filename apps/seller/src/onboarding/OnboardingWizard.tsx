import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'
import type { SellerType } from '@style-yangu/types'

const SELLER_TYPES: { value: SellerType; label: string; description: string }[] = [
  { value: 'seller',          label: 'Seller',          description: 'Ready-to-wear & fashion retail' },
  { value: 'tailor',          label: 'Tailor',          description: 'Bespoke garments & alterations' },
  { value: 'cobbler',         label: 'Cobbler',         description: 'Footwear craft & repair' },
  { value: 'bag_maker',       label: 'Bag Maker',       description: 'Handcrafted bags & accessories' },
  { value: 'jewellery_maker', label: 'Jewellery Maker', description: 'Fine & artisan jewellery' },
]

export default function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleTypeSelect(sellerType: SellerType) {
    setLoading(true)
    try {
      await sellerApi.post('/seller/onboarding/complete', { businessName, sellerType })
      navigate('/inventory', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  /* ── Step 0: Business name ── */
  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">

        {/* Left: dark panel */}
        <div className="bg-dark relative flex flex-col justify-between px-8 py-10 md:flex-1 md:py-16 md:px-14 overflow-hidden">
          <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-gold/20 pointer-events-none" />

          <span className="font-display text-2xl text-white tracking-wide leading-none">
            Style<span className="text-gold">Yangu</span>
          </span>

          <div className="py-10 md:py-0">
            <p className="text-gold text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">
              Step 1 of 2
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-6">
              Name your<br />
              <em className="italic text-gold">business.</em>
            </h1>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              This is how customers will find you on Style Yangu.
            </p>
          </div>

        </div>

        {/* Right: form */}
        <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
          <div className="w-full max-w-sm">
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8"
            >
              ← Back
            </button>
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-4">
              Your business
            </p>
            <h2 className="font-display text-3xl font-light text-dark leading-tight mb-2">
              What's it called?
            </h2>
            <p className="text-sm text-mid/55 mb-10 leading-relaxed">
              You can change this later in your profile.
            </p>

            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
                Business name
              </label>
              <input
                autoFocus
                placeholder="e.g. Amara Threads"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="border-0 border-b border-sand bg-transparent text-dark py-2 text-base
                           focus:outline-none focus:border-brand transition-colors duration-200
                           placeholder:text-mid/25 w-full"
              />
            </div>

            <button
              onClick={() => setStep(1)}
              disabled={!businessName.trim()}
              className="w-full bg-brand text-white rounded-lg py-4 text-sm font-semibold
                         tracking-wider disabled:opacity-40 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Step 1: Seller type ── */
  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Left: dark panel */}
      <div className="bg-dark relative flex flex-col justify-between px-8 py-10 md:flex-1 md:py-16 md:px-14 overflow-hidden">
        <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-gold/20 pointer-events-none" />

        <span className="font-display text-2xl text-white tracking-wide leading-none">
          Style<span className="text-gold">Yangu</span>
        </span>

        <div className="py-10 md:py-0">
          <p className="text-gold text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">
            Step 2 of 2
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-6">
            What do<br />
            <em className="italic text-gold">you make?</em>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            We tailor your dashboard and AI tools to your craft.
          </p>
        </div>

      </div>

      {/* Right: seller type selection */}
      <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setStep(0)}
            className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8"
          >
            ← Back
          </button>
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-4">
            Your craft
          </p>
          <h2 className="font-display text-3xl font-light text-dark leading-tight mb-2">
            Choose your type.
          </h2>
          <p className="text-sm text-mid/55 mb-8 leading-relaxed">
            Select the one that best describes {businessName || 'your business'}.
          </p>

          <div className="flex flex-col gap-3">
            {SELLER_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => handleTypeSelect(t.value)}
                disabled={loading}
                className="w-full flex flex-col items-start px-4 py-4 border border-sand rounded-lg
                           text-left hover:border-brand hover:bg-sand/40 transition-all duration-200
                           disabled:opacity-40 group"
              >
                <span className="text-sm font-semibold text-dark group-hover:text-brand transition-colors">
                  {t.label}
                </span>
                <span className="text-xs text-mid/50 mt-0.5">{t.description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
