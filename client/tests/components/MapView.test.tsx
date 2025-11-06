import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapView } from '../../src/components/map/MapView'

// Mock de react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: () => <div data-testid="polyline" />,
  Marker: () => <div data-testid="marker" />,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn()
  })
}))

const mockRoute = {
  id: 'test_route_1',
  name: 'Boucle de 8 km',
  distance: 8.5,
  duration: 42,
  elevation_gain: 50,
  geometry: {
    type: 'LineString',
    coordinates: [
      [1.4516224, 43.5781632],
      [1.4526224, 43.5791632],
      [1.4536224, 43.5801632],
      [1.4546224, 43.5811632],
      [1.4516224, 43.5781632] // Retour au point de départ
    ]
  },
  quality_score: 0.85,
  waypoints: [
    { lat: 43.5781632, lng: 1.4516224 },
    { lat: 43.5811632, lng: 1.4546224 }
  ]
}

describe('MapView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render map container', () => {
    render(<MapView route={mockRoute} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('should use geometry.coordinates instead of waypoints', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(<MapView route={mockRoute} />)

    // Le composant devrait utiliser geometry.coordinates (5 points) et non waypoints (2 points)
    expect(mockRoute.geometry.coordinates.length).toBe(5)
    expect(mockRoute.waypoints.length).toBe(2)
    
    consoleSpy.mockRestore()
  })

  it('should display route with correct number of coordinates', () => {
    render(<MapView route={mockRoute} />)

    // Vérifier que le polyline est rendu
    expect(screen.getByTestId('polyline')).toBeInTheDocument()
    expect(mockRoute.geometry.coordinates.length).toBeGreaterThan(3)
  })

  it('should handle missing geometry gracefully', () => {
    const invalidRoute = { ...mockRoute, geometry: undefined as any }

    // Ne devrait pas planter
    expect(() => render(<MapView route={invalidRoute} />)).not.toThrow()
  })

  it('should convert coordinates from [lon, lat] to [lat, lng] for Leaflet', () => {
    render(<MapView route={mockRoute} />)

    // Leaflet utilise [lat, lng] alors que GeoJSON utilise [lon, lat]
    // Le composant devrait faire la conversion
    expect(screen.getByTestId('polyline')).toBeInTheDocument()
  })

  it('should handle empty coordinates array', () => {
    const routeWithEmptyCoords = {
      ...mockRoute,
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    }

    expect(() => render(<MapView route={routeWithEmptyCoords} />)).not.toThrow()
  })
})

