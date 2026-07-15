import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resellerApi, RESELLER_TOKEN_KEY } from '../api'

const LANDING_URL = 'https://style-yangu-landing.onrender.com'

export default function ResellerLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function login() {
    setError('')
    setLoading(true)
    try {
      const res = await resellerApi.post<{ token: string }>('/auth/login', { email, password })
      localStorage.setItem(RESELLER_TOKEN_KEY, res.token)
      navigate('/dashboard', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="bg-dark relative flex flex-col justify-between px-8 py-10 md:flex-1 md:py-16 md:px-14 overflow-hidden">
        <div className="absolute top-0 left-0 w-14 h-14 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-14 h-14 border-b-2 border-r-2 border-gold/20 pointer-events-none" />
        <a href={LANDING_URL} className="font-display text-2xl text-white tracking-wide leading-none">
          Style<span className="text-gold">Yangu</span>
        </a>
        <div className="py-10 md:py-0">
          <p className="text-gold text-[10px] font-semibold tracking-[0.25em] uppercase mb-5">Reseller programme</p>
          <h1 className="font-display text-4xl md:text-5xl font-light text-white leading-[1.1] mb-6">
            Earn by<br /><em className="italic text-gold">sharing style.</em>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Track your referrals, conversions, and commissions in one place.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-cream flex flex-col items-center justify-center px-8 py-14 md:flex-1 md:px-16">
        <div className="w-full max-w-sm">
          <a href={LANDING_URL} className="inline-flex items-center gap-2 text-sm text-mid/60 hover:text-dark transition-colors mb-8">← Back</a>
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-4">Sign in</p>
          <h2 className="font-display text-3xl font-light text-dark leading-tight mb-2">Welcome back.</h2>
          <p className="text-sm text-mid/55 mb-10 leading-relaxed">Use your Style Yangu account.</p>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">Email</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">Password</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()} className={inputCls} />
            </label>
          </div>

          {error && <p className="text-red-600 text-sm mt-4">{error}</p>}

          <button
            onClick={login}
            disabled={loading || !email || !password}
            className="w-full bg-brand text-white rounded-lg py-4 text-sm font-semibold tracking-wider disabled:opacity-40 transition-opacity mt-6"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls =
  'border-0 border-b border-sand bg-transparent text-dark py-2 text-base w-full focus:outline-none focus:border-brand transition-colors placeholder:text-mid/25'
