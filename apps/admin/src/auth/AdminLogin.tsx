import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, ADMIN_TOKEN_KEY } from '../api'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function login() {
    setError('')
    setLoading(true)
    try {
      const res = await adminApi.post<{ token: string }>('/admin/auth/login', { email, password })
      localStorage.setItem(ADMIN_TOKEN_KEY, res.token)
      navigate('/dashboard', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-gold/20" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-gold/20" />

      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <span className="font-display text-3xl text-white tracking-wide">
            Style<span className="text-gold">Yangu</span>
          </span>
          <p className="text-gold text-[10px] font-semibold tracking-[0.3em] uppercase mt-2">Admin Console</p>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Email</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg text-white px-3 py-2.5 text-sm
                         focus:outline-none focus:border-gold/50 transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="bg-white/5 border border-white/10 rounded-lg text-white px-3 py-2.5 text-sm
                         focus:outline-none focus:border-gold/50 transition-colors"
            />
          </label>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={login}
            disabled={loading || !email || !password}
            className="w-full bg-gold text-dark rounded-lg py-3 text-sm font-semibold tracking-wider
                       disabled:opacity-40 transition-opacity mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
