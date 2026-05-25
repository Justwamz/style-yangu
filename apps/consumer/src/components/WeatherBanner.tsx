import { getWeatherWarning } from '../utils/weatherWarning'
import type { WeatherData, Stylist } from '@style-yangu/types'

const CONDITION_ICON: Record<string, string> = {
  Clear: '☀️', Clouds: '☁️', Rain: '🌧️', Drizzle: '🌦️',
  Thunderstorm: '⛈️', Snow: '❄️', Windy: '💨', Extreme: '🌡️',
  Humid: '💧', Cold: '🥶', Fog: '🌫️',
}

interface Props {
  weather: WeatherData
  clothingTags: string[]
  stylistName: Stylist
}

export default function WeatherBanner({ weather, clothingTags, stylistName }: Props) {
  const warning = getWeatherWarning(weather.condition, clothingTags, stylistName)
  const icon = CONDITION_ICON[weather.condition] ?? '🌤️'

  return (
    <div className={`rounded-2xl p-3 border ${warning ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E8DDD5]'}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#1A0A00]">
            {weather.temp}°C · {weather.condition}
          </p>
          {weather.simulated && (
            <span className="text-xs text-amber-600">Simulated weather</span>
          )}
        </div>
      </div>
      {warning && (
        <p className="mt-2 text-xs text-amber-800 leading-relaxed">{warning.message}</p>
      )}
    </div>
  )
}
