import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

const LANDING_URL = 'https://style-yangu-landing.onrender.com'

const VALUE_PROPS = [
  'AI-generated product showcases',
  'Full storefront on your subdomain',
  'POS, inventory & WhatsApp receipts',
]

export default function PhoneEntry() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSend() {
    setError('')
    setLoading(true)
    try {
      const res = await sellerApi.post<{ success: boolean; devCode?: string }>(
        '/seller/auth/otp/send',
        { phone },
      )
      navigate('/auth/verify', { state: { phone, devCode: res.devCode } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left: dark brand panel ── */}
      <div className="bg-dark relative flex flex-col justify-between px-8 py-10 md:flex-1 md:py-16 md:px-14 overflow-hidden">

        {/* Kente corner brackets */}
        <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-gold/20 pointer-events-none" />

        {/* Logo */}
        <a href={LANDING_URL} className="font-display text-2xl text-white tracking-wide leading-none">
          Style<span className="text-gold">Yangu</span>
        </a>

        {/* Brand copy */}
        <div className="py-10 md:py-0">
          <p className="text-gold text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">
            For sellers &amp; artisans
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-8">
            Your business,<br />
            <em className="italic text-gold">beautifully</em><br />
            presented.
          </h1>
          <ul className="flex flex-col gap-4">
            {VALUE_PROPS.map(prop => (
              <li key={prop} className="flex items-center gap-3 text-white/50 text-sm">
                <span className="w-1 h-1 rounded-full bg-gold/70 shrink-0" />
                {prop}
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* ── Right: form panel ── */}
      <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
        <div className="w-full max-w-sm">

          {/* Visible back button */}
          <a
            href={LANDING_URL}
            className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8"
          >
            ← Back
          </a>

          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-4">
            Get started
          </p>

          <h2 className="font-display text-3xl font-light text-dark leading-tight mb-2">
            Enter your number.
          </h2>
          <p className="text-sm text-mid/55 mb-10 leading-relaxed">
            We'll send a one-time code to verify your identity.
          </p>

          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
              Phone number
            </label>
            <input
              type="tel"
              placeholder="+254 700 000 000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="border-0 border-b border-sand bg-transparent text-dark py-2 text-base
                         focus:outline-none focus:border-brand transition-colors duration-200
                         placeholder:text-mid/25 w-full"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleSend}
            disabled={loading || !phone.trim()}
            className="w-full bg-brand text-white rounded-lg py-4 text-sm font-semibold
                       tracking-wider disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}
