import type { Suggestion } from '@style-yangu/types'

interface Props {
  suggestion: Suggestion
  index: number
  stylistName: string
}

export default function SuggestionCard({ suggestion, index, stylistName }: Props) {
  const name = stylistName.charAt(0).toUpperCase() + stylistName.slice(1)
  return (
    <div className="bg-white rounded-2xl border border-[#E8DDD5] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[#8B4513] bg-[#F5EDE5] px-2 py-0.5 rounded-full">
          {suggestion.occasionTag}
        </span>
        {index > 0 && (
          <span className="text-xs text-[#1A0A00]/40">Unlocked #{index + 1}</span>
        )}
      </div>
      <p className="font-semibold text-[#1A0A00] leading-snug">{suggestion.outfit}</p>
      <p className="mt-2 text-xs text-[#1A0A00]/70 leading-relaxed italic">
        "{suggestion.stylistComment}" — {name}
      </p>
    </div>
  )
}
