import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sellerApi } from '../context/SellerContext'

export default function PhoneEntry() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSend() {
    setError('')
    setLoading(true)
    try {
      await sellerApi.post('/seller/auth/otp/send', { phone })
      navigate('/auth/verify', { state: { phone } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#8B4513' }}>Style Yangu Seller</h1>
      <p className="text-sm text-gray-500 mb-8">Enter your phone number to continue</p>
      <input
        type="tel"
        placeholder="+254 700 000 000"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-3 text-base mb-2 focus:outline-none focus:ring-2 focus:ring-amber-700"
      />
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        onClick={handleSend}
        disabled={loading || !phone}
        className="w-full max-w-sm bg-amber-800 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Send OTP'}
      </button>
    </div>
  )
}
