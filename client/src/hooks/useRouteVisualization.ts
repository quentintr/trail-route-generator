import { useState, useCallback, useMemo } from 'react'
import { Route } from '../types/route'

interface UseRouteVisualizationReturn {
  selectedRoute: Route | null
  mapCenter: [number, number]
  mapZoom: number
  selectRoute: (route: Route) => void
  zoomToRoute: (route: Route) => void
  resetView: () => void
}

export const useRouteVisualization = (routes: Route[]): UseRouteVisualizationReturn => {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(routes[0] || null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]) // Paris default
  const [mapZoom, setMapZoom] = useState<number>(13)

  // Calculate center point from route geometry
  const calculateRouteCenter = useCallback((route: Route): [number, number] => {
    if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length === 0) {
      return [48.8566, 2.3522] // Default to Paris
    }

    const coordinates = route.geometry.coordinates
    if (coordinates.length === 1) {
      return [coordinates[0][1], coordinates[0][0]] // [lat, lng]
    }

    // Calculate bounds
    let minLat = coordinates[0][1]
    let maxLat = coordinates[0][1]
    let minLng = coordinates[0][0]
    let maxLng = coordinates[0][0]

    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    })

    // Return center point
    return [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
  }, [])

  // Calculate appropriate zoom level for route bounds
  const calculateRouteZoom = useCallback((route: Route): number => {
    if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length <= 1) {
      return 13
    }

    const coordinates = route.geometry.coordinates
    if (coordinates.length === 1) {
      return 15
    }

    // Calculate bounds
    let minLat = coordinates[0][1]
    let maxLat = coordinates[0][1]
    let minLng = coordinates[0][0]
    let maxLng = coordinates[0][0]

    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
    })

    // Calculate distance
    const latDiff = maxLat - minLat
    const lngDiff = maxLng - minLng
    const maxDiff = Math.max(latDiff, lngDiff)

    // Determine zoom level based on distance
    if (maxDiff > 0.1) return 10
    if (maxDiff > 0.05) return 11
    if (maxDiff > 0.02) return 12
    if (maxDiff > 0.01) return 13
    if (maxDiff > 0.005) return 14
    return 15
  }, [])

  const selectRoute = useCallback((route: Route) => {
    setSelectedRoute(route)
    const center = calculateRouteCenter(route)
    setMapCenter(center)
  }, [calculateRouteCenter])

  const zoomToRoute = useCallback((route: Route) => {
    const center = calculateRouteCenter(route)
    const zoom = calculateRouteZoom(route)
    setMapCenter(center)
    setMapZoom(zoom)
  }, [calculateRouteCenter, calculateRouteZoom])

  const resetView = useCallback(() => {
    setMapCenter([48.8566, 2.3522]) // Default to Paris
    setMapZoom(13)
  }, [])

  // Update selected route when routes array changes
  useMemo(() => {
    if (routes.length > 0 && (!selectedRoute || !routes.find(r => r.id === selectedRoute.id))) {
      setSelectedRoute(routes[0])
      const center = calculateRouteCenter(routes[0])
      setMapCenter(center)
    }
  }, [routes, selectedRoute, calculateRouteCenter])

  return {
    selectedRoute,
    mapCenter,
    mapZoom,
    selectRoute,
    zoomToRoute,
    resetView,
  }
}
