import type { Stylist, TimeOfDay } from '@style-yangu/types'

const GREETINGS: Record<TimeOfDay, string> = {
  morning:   'Good morning! I have an outfit idea for you today.',
  afternoon: 'Good afternoon! Ready to look great today?',
  evening:   'Good evening! Let me help you plan tomorrow.',
  night:     "Planning ahead? Here's what I'd suggest.",
}

interface Props {
  stylistName: Stylist
  timeOfDay: TimeOfDay
}

function AmaraAvatar() {
  return (
    <div className="w-12 h-12 rounded-full bg-mid flex items-center justify-center text-white font-bold text-lg shrink-0">
      A
    </div>
  )
}

function KofiAvatar() {
  return (
    <div className="w-12 h-12 rounded-full bg-deep flex items-center justify-center text-white font-bold text-lg shrink-0">
      K
    </div>
  )
}

export default function StylistGreetingCard({ stylistName, timeOfDay }: Props) {
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-sand">
      {stylistName === 'kofi' ? <KofiAvatar /> : <AmaraAvatar />}
      <div>
        <p className="font-bold text-dark text-sm">{name}</p>
        <p className="text-xs text-dark/70 leading-relaxed">{GREETINGS[timeOfDay]}</p>
      </div>
    </div>
  )
}
