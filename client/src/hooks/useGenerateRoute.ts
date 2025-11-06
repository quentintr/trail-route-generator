import { useState, useCallback } from 'react'
import { RouteGenerationRequest, Route } from '../types/route'
import { apiService } from '../services/api'

export interface UseGenerateRouteReturn {
  routes: Route[]
  isLoading: boolean
  error: string | null
  generateRoute: (request: RouteGenerationRequest) => Promise<Route[]>
}

export const useGenerateRoute = (): UseGenerateRouteReturn => {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateRoute = useCallback(async (request: RouteGenerationRequest): Promise<Route[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.generateRoute(request)
      
      // The API returns { success: true, routes: [...], message: "..." }
      if (response && response.success && Array.isArray(response.routes)) {
        // ✅ Vérification critique : vérifier que les coordonnées sont présentes
        response.routes.forEach((route: Route, index: number) => {
          const coordCount = route.geometry?.coordinates?.length || 0
          console.log(`✅ useGenerateRoute: Route ${index + 1} has ${coordCount} coordinates`)
          
          if (coordCount < 10) {
            console.error(`❌ useGenerateRoute: Route ${index + 1} has only ${coordCount} coordinates!`)
            console.error('Route:', route)
          }
        })
        
        setRoutes(response.routes)
        return response.routes
      } else {
        // Fallback: if response is directly an array
        if (Array.isArray(response)) {
          setRoutes(response)
          return response
        }
        
        const errorMessage = response?.message || 'Failed to generate routes'
        setError(errorMessage)
        throw new Error(errorMessage)
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)
      setRoutes([])
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    routes,
    isLoading,
    error,
    generateRoute,
  }
}
