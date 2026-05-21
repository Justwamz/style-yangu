import { useQuery } from '@tanstack/react-query'

interface WeatherData {
  tempC: number
  condition: string
  windSpeedKmh: number
  humidity: number
}

export function useWeather(lat: number, lon: number) {
  return useQuery<WeatherData>({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const apiKey = import.meta.env?.VITE_OPENWEATHER_KEY
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`,
      )
      const data = await res.json()
      return {
        tempC: Math.round(data.main.temp),
        condition: data.weather[0].main,
        windSpeedKmh: Math.round(data.wind.speed * 3.6),
        humidity: data.main.humidity,
      }
    },
    staleTime: 3 * 60 * 60 * 1000,
  })
}
