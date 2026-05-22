import { useOnboarding } from '../OnboardingContext'

const NAIROBI_LAT = -1.2921
const NAIROBI_LON = 36.8219

export default function Step08Location() {
  const { state, dispatch } = useOnboarding()
  const stylistName = state.stylist === 'kofi' ? 'Kofi' : 'Amara'

  function requestLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => {
        dispatch({
          type: 'SET_LOCATION',
          locationPermission: 'granted',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
        dispatch({ type: 'SET_STEP', step: 9 })
      },
      () => {
        dispatch({
          type: 'SET_LOCATION',
          locationPermission: 'denied',
          lat: NAIROBI_LAT,
          lon: NAIROBI_LON,
        })
        dispatch({ type: 'SET_STEP', step: 9 })
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1A0A00]">One more thing</h2>
        <p className="mt-2 text-sm text-[#1A0A00]/70 leading-relaxed">
          So {stylistName} can factor in today's weather when styling you. No location data is stored.
        </p>
      </div>
      <button
        onClick={requestLocation}
        className="bg-[#8B4513] text-white rounded-xl py-3 font-semibold"
      >
        Allow location
      </button>
      <button
        onClick={() => {
          dispatch({ type: 'SET_LOCATION', locationPermission: 'denied', lat: NAIROBI_LAT, lon: NAIROBI_LON })
          dispatch({ type: 'SET_STEP', step: 9 })
        }}
        className="text-[#8B4513] text-sm underline text-center"
      >
        Skip
      </button>
    </div>
  )
}
