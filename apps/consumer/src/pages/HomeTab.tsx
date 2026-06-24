import { useNavigate } from 'react-router-dom'
import { useProfileContext } from '../context/ProfileContext'
import { useSuggestionContext } from '../context/SuggestionContext'
import { useWeatherApi } from '../hooks/useWeatherApi'
import StylistGreetingCard from '../components/StylistGreetingCard'
import WeatherBanner from '../components/WeatherBanner'
import SuggestionCard from '../components/SuggestionCard'
import UnlockMechanic from '../components/UnlockMechanic'

export default function HomeTab() {
  const navigate = useNavigate()
  const { profile, loading: profileLoading } = useProfileContext()
  const { suggestions, unlockState, unlockByAd, dispatchUnlock } = useSuggestionContext()
  const { weather } = useWeatherApi()

  if (profileLoading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center">
      <p className="text-sm text-dark/50">Loading...</p>
    </div>
  }

  const stylistName = profile?.stylistName ?? 'amara'
  const timeOfDay = weather?.timeOfDay ?? 'morning'
  const currentSuggestion = suggestions[suggestions.length - 1]
  const clothingTags = currentSuggestion?.clothingTags ?? []

  function handleStartWardrobeUnlock() {
    dispatchUnlock({ type: 'START_WARDROBE_UNLOCK' })
    navigate('/home/wardrobe')
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      <StylistGreetingCard stylistName={stylistName} timeOfDay={timeOfDay} />

      {weather && (
        <WeatherBanner
          weather={weather}
          clothingTags={clothingTags}
          stylistName={stylistName}
        />
      )}

      {suggestions.map((s, i) => (
        <SuggestionCard key={s.id} suggestion={s} index={i} stylistName={stylistName} />
      ))}

      <UnlockMechanic
        unlockState={unlockState}
        stylistName={stylistName}
        onUnlockByAd={unlockByAd}
        onStartWardrobeUnlock={handleStartWardrobeUnlock}
      />
    </div>
  )
}
