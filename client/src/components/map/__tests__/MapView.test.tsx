import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapView } from '../MapView'
import { Route } from '../../../types/route'

// Mock de react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom }: any) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom}>
      {children}
    </div>
  ),
  TileLayer: ({ url }: any) => (
    <div data-testid="tile-layer" data-url={url}>Tile Layer</div>
  ),
  Polyline: ({ positions }: any) => (
    <div data-testid="polyline" data-positions={JSON.stringify(positions)}>Polyline</div>
  ),
  Marker: ({ position }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>Marker</div>
  ),
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
  }),
}))

// Mock de leaflet
vi.mock('leaflet', () => ({
  icon: vi.fn(() => ({})),
  divIcon: vi.fn(() => ({})),
}))

const mockRoute: Route = {
  id: '1',
  name: 'Test Route',
  distance: 10,
  duration: 60,
  elevation: 100,
  difficulty: 'medium',
  terrain_type: 'mixed',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  geometry: {
    type: 'LineString',
    coordinates: [
      [2.3522, 48.8566],
      [2.3622, 48.8666],
      [2.3722, 48.8766],
    ],
  },
}

describe('MapView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders map container', () => {
    render(<MapView selectedRoute={mockRoute} />)
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('renders tile layer with OpenStreetMap', () => {
    render(<MapView selectedRoute={mockRoute} />)
    
    const tileLayer = screen.getByTestId('tile-layer')
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('renders polyline for route geometry', () => {
    render(<MapView selectedRoute={mockRoute} />)
    
    const polyline = screen.getByTestId('polyline')
    expect(polyline).toBeInTheDocument()
    
    const positions = JSON.parse(polyline.getAttribute('data-positions') || '[]')
    expect(positions).toHaveLength(3)
    expect(positions[0]).toEqual([48.8566, 2.3522])
  })

  it('renders start and end markers', () => {
    render(<MapView selectedRoute={mockRoute} />)
    
    const markers = screen.getAllByTestId('marker')
    expect(markers).toHaveLength(2)
    
    // Start marker
    const startPosition = JSON.parse(markers[0].getAttribute('data-position') || '[]')
    expect(startPosition).toEqual([48.8566, 2.3522])
    
    // End marker
    const endPosition = JSON.parse(markers[1].getAttribute('data-position') || '[]')
    expect(endPosition).toEqual([48.8766, 2.3722])
  })

  it('centers map on route when route changes', async () => {
    const { rerender } = render(<MapView selectedRoute={mockRoute} />)
    
    const mapContainer = screen.getByTestId('map-container')
    const initialCenter = JSON.parse(mapContainer.getAttribute('data-center') || '[]')
    
    const newRoute: Route = {
      ...mockRoute,
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.4000, 48.9000],
          [2.4100, 48.9100],
        ],
      },
    }
    
    rerender(<MapView selectedRoute={newRoute} />)
    
    await waitFor(() => {
      const newCenter = JSON.parse(mapContainer.getAttribute('data-center') || '[]')
      expect(newCenter).not.toEqual(initialCenter)
    })
  })

  it('handles empty route gracefully', () => {
    render(<MapView selectedRoute={null} />)
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument()
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument()
  })

  it('handles route without geometry', () => {
    const routeWithoutGeometry = { ...mockRoute, geometry: undefined }
    render(<MapView selectedRoute={routeWithoutGeometry} />)
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.queryByTestId('polyline')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<MapView selectedRoute={mockRoute} isLoading={true} />)
    
    expect(screen.getByTestId('map-loading')).toBeInTheDocument()
  })

  it('handles zoom controls', () => {
    render(<MapView selectedRoute={mockRoute} showZoomControls={true} />)
    
    const mapContainer = screen.getByTestId('map-container')
    expect(mapContainer).toHaveAttribute('data-zoom', '13')
  })

  it('handles custom center', () => {
    const customCenter = [48.8600, 2.3600] as [number, number]
    render(<MapView selectedRoute={mockRoute} center={customCenter} />)
    
    const mapContainer = screen.getByTestId('map-container')
    const center = JSON.parse(mapContainer.getAttribute('data-center') || '[]')
    expect(center).toEqual(customCenter)
  })

  it('handles map click events', () => {
    const mockOnMapClick = vi.fn()
    render(<MapView selectedRoute={mockRoute} onMapClick={mockOnMapClick} />)
    
    const mapContainer = screen.getByTestId('map-container')
    fireEvent.click(mapContainer)
    
    expect(mockOnMapClick).toHaveBeenCalled()
  })
})
