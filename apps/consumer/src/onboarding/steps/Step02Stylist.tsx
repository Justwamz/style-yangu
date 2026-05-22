import { useOnboarding } from '../OnboardingContext'
import type { Stylist } from '@style-yangu/types'

function AmaraAvatar() {
  return (
    <svg width="80" height="96" viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <circle cx="40" cy="28" r="22" fill="#C4834A" />
      <ellipse cx="40" cy="80" rx="28" ry="20" fill="#8B4513" />
    </svg>
  )
}

function KofiAvatar() {
  return (
    <svg width="80" height="96" viewBox="0 0 80 96" fill="none" aria-hidden="true">
      <circle cx="40" cy="28" r="22" fill="#7B5B3A" />
      <ellipse cx="40" cy="80" rx="28" ry="20" fill="#5C3A1E" />
    </svg>
  )
}

const STYLISTS: { id: Stylist; name: string; personality: string; Avatar: () => JSX.Element }[] = [
  {
    id: 'amara',
    name: 'Amara',
    personality: 'Warm, honest, direct. Tells you the truth like a trusted friend who always looks put together.',
    Avatar: AmaraAvatar,
  },
  {
    id: 'kofi',
    name: 'Kofi',
    personality: 'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
    Avatar: KofiAvatar,
  },
]

export default function Step02Stylist() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">Choose your stylist</h2>
        <p className="mt-1 text-sm text-[#8B4513]">You can change this later.</p>
      </div>

      <div className="flex gap-4">
        {STYLISTS.map(s => (
          <button
            key={s.id}
            type="button"
            aria-pressed={state.stylist === s.id}
            onClick={() => dispatch({ type: 'SET_STYLIST', stylist: s.id })}
            className={[
              'flex-1 flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-colors',
              state.stylist === s.id
                ? 'border-[#8B4513] bg-[#8B4513]/5'
                : 'border-[#E8DDD5] bg-white',
            ].join(' ')}
          >
            <s.Avatar />
            <span className="font-bold text-[#1A0A00] text-lg">{s.name}</span>
            <span className="text-xs text-center text-[#1A0A00]/70 leading-relaxed">
              {s.personality}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
