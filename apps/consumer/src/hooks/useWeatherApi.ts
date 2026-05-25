import { useState, useEffect } from 'react'
import { apiClient } from '@style-yangu/api-client'
import type { WeatherData } from '@style-yangu/types'

interface UseWeatherApiResult {
  weather: WeatherData | null
  loading: boolean
  error: string | null
}

export function useWeatherApi(): UseWeatherApiResult {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<WeatherData>('/consumer/weather')
      .then(setWeather)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return { weather, loading, error }
}
