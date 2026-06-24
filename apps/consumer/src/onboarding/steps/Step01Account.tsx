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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-dark">Create your account</h2>
        <p className="mt-1 text-sm text-brand">Style Yangu is just for you.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="border border-sand rounded-xl px-4 py-3 bg-cream text-dark focus:outline-none focus:border-brand"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={8}
          required
          className="border border-sand rounded-xl px-4 py-3 bg-cream text-dark focus:outline-none focus:border-brand"
        />
        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <button
        type="button"
        disabled
        title="Coming soon"
        className="border border-sand rounded-xl py-3 text-dark opacity-40 cursor-not-allowed"
      >
        Continue with Google
      </button>
    </div>
  )
}
