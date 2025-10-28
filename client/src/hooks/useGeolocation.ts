import { useState, useCallback } from 'react'

export interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface UseGeolocationReturn {
  position: GeolocationPosition | null
  isLoading: boolean
  error: string | null
  getCurrentPosition: () => Promise<GeolocationPosition>
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMessage = 'Geolocation is not supported by this browser'
        setError(errorMessage)
        reject(new Error(errorMessage))
        return
      }

      setIsLoading(true)
      setError(null)

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          
          setPosition(newPosition)
          setIsLoading(false)
          resolve(newPosition)
        },
        (err) => {
          let errorMessage: string
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permission denied'
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Position unavailable'
              break
            case err.TIMEOUT:
              errorMessage = 'Timeout'
              break
            default:
              errorMessage = err.message || 'Unknown error occurred'
              break
          }
          
          setError(errorMessage)
          setIsLoading(false)
          reject(new Error(errorMessage))
        },
        options
      )
    })
  }, [])

  return {
    position,
    isLoading,
    error,
    getCurrentPosition,
  }
}
