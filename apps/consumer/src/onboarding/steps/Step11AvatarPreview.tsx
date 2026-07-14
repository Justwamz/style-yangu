import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '@style-yangu/api-client'
import { useOnboarding, ONBOARDING_STORAGE_KEY } from '../OnboardingContext'

const STYLIST_PERSONALITY: Record<string, string> = {
  amara: 'Warm, honest, direct. Tells you the truth like a trusted friend.',
  kofi:  'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
}

function BodySilhouette({ bodyType }: { bodyType?: string }) {
  const isHourglass = bodyType === 'hourglass'
  return (
    <svg width="160" height="224" viewBox="0 0 160 224" fill="none" aria-hidden="true">
      <circle cx="80" cy="40" r="30" fill="#C4834A" />
      {isHourglass ? (
        <path d="M40 80 Q80 110 120 80 L110 150 Q80 135 50 150 Z" fill="#8B4513" />
      ) : (
        <rect x="45" y="80" width="70" height="80" rx="8" fill="#8B4513" />
      )}
      <rect x="50" y="155" width="25" height="60" rx="6" fill="#C4834A" />
      <rect x="85" y="155" width="25" height="60" rx="6" fill="#C4834A" />
    </svg>
  )
}

function AmaraCompanion() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" aria-hidden="true">
      <circle cx="24" cy="18" r="14" fill="#C4834A" />
      <ellipse cx="24" cy="46" rx="16" ry="12" fill="#8B4513" />
    </svg>
  )
}

function KofiCompanion() {
  return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" aria-hidden="true">
      <circle cx="24" cy="18" r="14" fill="#7B5B3A" />
      <ellipse cx="24" cy="46" rx="16" ry="12" fill="#5C3A1E" />
    </svg>
  )
}

export default function Step11AvatarPreview() {
  const { state, dispatch } = useOnboarding()
  const navigate = useNavigate()
  const stylist = state.stylist ?? 'amara'
  const stylistName = stylist.charAt(0).toUpperCase() + stylist.slice(1)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [generatingAvatar, setGeneratingAvatar] = useState(false)

  // Generate avatar on mount if we have a body type but no avatar yet
  useEffect(() => {
    if (state.avatarCartoonUrl || !state.bodyType) return

    let cancelled = false
    setGeneratingAvatar(true)

    apiClient.post<{ avatarUrl: string }>('/consumer/avatar/generate', {})
      .then(res => {
        if (!cancelled && res.avatarUrl) {
          dispatch({ type: 'SET_BODY', bodyType: state.bodyType!, avatarCartoonUrl: res.avatarUrl })
        }
      })
      .catch(() => {
        // 503 = not configured, any other error — silently fall back to SVG silhouette
      })
      .finally(() => {
        if (!cancelled) setGeneratingAvatar(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function complete() {
    setSaving(true)
    setError('')
    try {
      await apiClient.post('/onboarding/complete', state)
      localStorage.removeItem(ONBOARDING_STORAGE_KEY)
      navigate('/home')
    } catch {
      setError('Something went wrong — please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold text-dark">Meet your look</h2>
        <p className="mt-1 text-sm text-dark/60">Your personalised style profile.</p>
      </div>

      {/* Consumer avatar */}
      <div className="relative">
        {generatingAvatar ? (
          <div className="w-40 h-56 rounded-2xl border-2 border-sand bg-sand flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-dark/50 text-center px-2">Creating your avatar…</p>
          </div>
        ) : state.avatarCartoonUrl ? (
          <img
            src={state.avatarCartoonUrl}
            alt="Your avatar"
            role="img"
            aria-label="avatar"
            className="w-40 h-56 object-contain rounded-2xl border-2 border-sand"
          />
        ) : (
          <div
            role="img"
            aria-label="avatar"
            className="w-40 h-56 rounded-2xl border-2 border-sand bg-sand flex items-center justify-center"
          >
            <BodySilhouette bodyType={state.bodyType} />
          </div>
        )}
        {state.skinProfile && (
          <div
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: '#C8955A' }}
            title={`${state.skinProfile.depth} / ${state.skinProfile.undertone}`}
          />
        )}
      </div>

      {/* Stylist companion */}
      <div className="flex items-center gap-4 bg-sand rounded-2xl p-4 w-full">
        {stylist === 'kofi' ? <KofiCompanion /> : <AmaraCompanion />}
        <div>
          <p className="font-bold text-dark">{stylistName}</p>
          <p className="text-xs text-dark/70 leading-relaxed">
            {STYLIST_PERSONALITY[stylist] ?? ''}
          </p>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}
      <button
        onClick={complete}
        disabled={saving || generatingAvatar}
        className="w-full bg-brand text-white rounded-xl py-4 font-semibold text-lg mt-2 disabled:opacity-50"
      >
        {saving ? 'Setting up your profile…' : `Meet ${stylistName}, let's go`}
      </button>
    </div>
  )
}
