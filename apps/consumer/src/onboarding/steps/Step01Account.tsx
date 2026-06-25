import { useState } from 'react'
import { apiClient } from '@style-yangu/api-client'
import { useOnboarding } from '../OnboardingContext'

export default function Step01Account() {
  const { dispatch } = useOnboarding()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await apiClient.post<{ userId: string; token: string }>(
        '/auth/register',
        { email, password },
      )
      localStorage.setItem('sy_token', data.token)
      localStorage.setItem('sy_user_id', data.userId)
      dispatch({ type: 'SET_ACCOUNT', userId: data.userId, token: data.token })
      dispatch({ type: 'SET_STEP', step: 2 })
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-gold mb-3">
          Welcome
        </p>
        <h2 className="font-display text-4xl font-light text-dark leading-[1.1] mb-3">
          Create your<br />
          <em className="italic">account.</em>
        </h2>
        <p className="text-sm text-mid/60 leading-relaxed">
          Your personal style journey starts here.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
            Email address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="border-0 border-b border-sand bg-transparent text-dark py-2 text-base
                       focus:outline-none focus:border-brand transition-colors duration-200
                       placeholder:text-mid/25"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold tracking-[0.2em] uppercase text-dark/40">
            Password
          </label>
          <input
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
            className="border-0 border-b border-sand bg-transparent text-dark py-2 text-base
                       focus:outline-none focus:border-brand transition-colors duration-200
                       placeholder:text-mid/25"
          />
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm -mt-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white rounded-lg py-3.5 text-sm font-semibold tracking-wider
                     disabled:opacity-40 transition-opacity"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>

        {/* Divider + Google grouped tight */}
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-sand" />
            <span className="text-[10px] text-mid/30 tracking-[0.2em] uppercase">or</span>
            <div className="flex-1 h-px bg-sand" />
          </div>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="border border-sand/60 rounded-lg py-3 text-dark/25 text-sm cursor-not-allowed tracking-wide"
          >
            Continue with Google
          </button>
        </div>
      </form>
    </div>
  )
}
