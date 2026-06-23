import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#8B4513' }}>Verify your number</h1>
      <p className="text-sm text-gray-500 mb-8">
        Enter the 6-digit code sent to {state?.phone}
      </p>
      <input
        type="text"
        placeholder="6-digit code"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 text-base mb-2 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-amber-700"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Verifying…' : 'Verify'}
      </button>
    </div>
  )
}
