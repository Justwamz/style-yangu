import { useNavigate } from 'react-router-dom'
import { apiClient } from '@style-yangu/api-client'
import { useOnboarding, ONBOARDING_STORAGE_KEY } from '../OnboardingContext'

const STYLIST_PERSONALITY: Record<string, string> = {
  amara: 'Warm, honest, direct. Tells you the truth like a trusted friend.',
  kofi:  'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
}

function BodySilhouette({ bodyType }: { bodyType?: string }) {
  // Hourglass: wider shoulders/hips, nipped waist
  // Other types: slightly different proportions
  const isHourglass = bodyType === 'hourglass'
  return (
    <svg width="160" height="224" viewBox="0 0 160 224" fill="none" aria-hidden="true">
      {/* Head */}
      <circle cx="80" cy="40" r="30" fill="#C4834A" />
      {/* Body — hourglass vs. default proportions */}
      {isHourglass ? (
        <path d="M40 80 Q80 110 120 80 L110 150 Q80 135 50 150 Z" fill="#8B4513" />
      ) : (
        <rect x="45" y="80" width="70" height="80" rx="8" fill="#8B4513" />
      )}
      {/* Legs */}
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
  const { state } = useOnboarding()
  const navigate = useNavigate()
  const stylist = state.stylist ?? 'amara'
  const stylistName = stylist.charAt(0).toUpperCase() + stylist.slice(1)

  async function complete() {
    // Fire-and-forget — don't block navigation on API response
    apiClient.post('/onboarding/complete', state).catch(() => undefined)
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    navigate('/home')
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#1A0A00]">Meet your look</h2>
        <p className="mt-1 text-sm text-[#1A0A00]/60">Your personalised style profile.</p>
      </div>

      {/* Consumer avatar */}
      <div className="relative">
        {state.avatarCartoonUrl ? (
          <img
            src={state.avatarCartoonUrl}
            alt="Your avatar"
            role="img"
            aria-label="avatar"
            className="w-40 h-56 object-contain rounded-2xl border-2 border-[#E8DDD5]"
          />
        ) : (
          <div
            role="img"
            aria-label="avatar"
            className="w-40 h-56 rounded-2xl border-2 border-[#E8DDD5] bg-[#F5EDE5] flex items-center justify-center"
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
      <div className="flex items-center gap-4 bg-[#F5EDE5] rounded-2xl p-4 w-full">
        {stylist === 'kofi' ? <KofiCompanion /> : <AmaraCompanion />}
        <div>
          <p className="font-bold text-[#1A0A00]">{stylistName}</p>
          <p className="text-xs text-[#1A0A00]/70 leading-relaxed">
            {STYLIST_PERSONALITY[stylist] ?? ''}
          </p>
        </div>
      </div>

      <button
        onClick={complete}
        className="w-full bg-[#8B4513] text-white rounded-xl py-4 font-semibold text-lg mt-2"
      >
        Meet {stylistName}, let's go
      </button>
    </div>
  )
}
