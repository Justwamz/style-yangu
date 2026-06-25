import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

const LANDING_URL = 'https://style-yangu-landing.onrender.com'

export default function OTPVerify() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { state } = useLocation() as { state: { phone: string } }

  async function handleVerify() {
    setError('')
    setLoading(true)
    try {
      const res = await sellerApi.post<{ token: string; onboardingDone: boolean }>(
        '/seller/auth/otp/verify',
        { phone: state?.phone, code }
      )
      localStorage.setItem('sy_seller_token', res.token)
      navigate(res.onboardingDone ? '/dashboard' : '/onboarding', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
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
            Almost there
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-8">
            Check your<br />
            <em className="italic text-gold">messages.</em>
          </h1>
          {state?.phone && (
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              We sent a 6-digit code to {state.phone}. It expires in 10 minutes.
            </p>
          )}
        </div>

      </div>

      {/* ── Right: form panel ── */}
      <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
        <div className="w-full max-w-sm">

          {/* Visible back button */}
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8"
          >
            ← Back
          </button>

          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-4">
            Verification
          </p>

          <h2 className="font-display text-3xl font-light text-dark leading-tight mb-2">
            Enter your code.
          </h2>
          <p className="text-sm text-mid/55 mb-10 leading-relaxed">
            {state?.phone ? `Sent to ${state.phone}` : 'Enter the 6-digit code from your SMS.'}
          </p>

          <div className="flex flex-col gap-1.5 mb-6">
            <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
              6-digit code
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="— — — — — —"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              className="border-0 border-b border-sand bg-transparent text-dark py-2
                         text-2xl tracking-[0.4em] font-display
                         focus:outline-none focus:border-brand transition-colors duration-200
                         placeholder:text-mid/20 placeholder:tracking-[0.3em] w-full"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full bg-brand text-white rounded-lg py-4 text-sm font-semibold
                       tracking-wider disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
