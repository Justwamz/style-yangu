import { useOnboarding } from '../OnboardingContext'
import type { Stylist } from '@style-yangu/types'
import amaraImg from '../../assets/amara.png'
import kofiImg from '../../assets/kofi2.png'

const STYLISTS: { id: Stylist; name: string; personality: string; image: string }[] = [
  {
    id: 'amara',
    name: 'Amara',
    personality: 'Warm, honest, direct. Tells you the truth like a trusted friend who always looks put together.',
    image: amaraImg,
  },
  {
    id: 'kofi',
    name: 'Kofi',
    personality: 'Confident, knowledgeable, no-fluff. Gives you reasons not just verdicts.',
    image: kofiImg,
  },
]

export default function Step02Stylist() {
  const { state, dispatch } = useOnboarding()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-dark">Choose your stylist</h2>
        <p className="mt-1 text-sm text-brand">You can change this later.</p>
      </div>

      <div className="flex gap-4">
        {STYLISTS.map(s => (
          <button
            key={s.id}
            type="button"
            aria-pressed={state.stylist === s.id}
            onClick={() => dispatch({ type: 'SET_STYLIST', stylist: s.id })}
            className={[
              'flex-1 flex flex-col items-center gap-3 rounded-2xl border-2 transition-colors overflow-hidden',
              state.stylist === s.id
                ? 'border-brand bg-brand/5'
                : 'border-sand bg-white',
            ].join(' ')}
          >
            <img
              src={s.image}
              alt={s.name}
              className="w-full aspect-[3/4] object-cover object-top"
            />
            <div className="px-4 pb-5 flex flex-col items-center gap-2">
              <span className="font-bold text-dark text-lg">{s.name}</span>
              <span className="text-xs text-center text-dark/70 leading-relaxed">
                {s.personality}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
