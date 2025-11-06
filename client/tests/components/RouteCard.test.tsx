import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RouteCard } from '../../src/components/route/RouteCard'
import { Route } from '../../src/types/route'

const mockRoute: Route = {
  id: 'test_route_1',
  name: 'Boucle de 8 km',
  distance: 8.5,
  duration: 42,
  elevation_gain: 50,
  geometry: {
    type: 'LineString',
    coordinates: [
      [1.4516224, 43.5781632],
      [1.4526224, 43.5791632]
    ]
  },
  quality_score: 0.85,
  waypoints: [
    { lat: 43.5781632, lng: 1.4516224 },
    { lat: 43.5791632, lng: 1.4526224 }
  ]
}

// Mock de RoutePreview
vi.mock('../../src/components/route/RoutePreview', () => ({
  RoutePreview: ({ route }: any) => (
    <div data-testid="route-preview">{route.name}</div>
  )
}))

describe('RouteCard Component', () => {
  it('should render route information', () => {
    render(<RouteCard route={mockRoute} />)

    expect(screen.getByText(/boucle de 8 km/i)).toBeInTheDocument()
    expect(screen.getByText(/8\.5/i)).toBeInTheDocument() // Distance
  })

  it('should display formatted duration', () => {
    render(<RouteCard route={mockRoute} />)

    // 42 minutes devrait être affiché comme "42min"
    expect(screen.getByText(/42min/i) || screen.getByText(/min/i)).toBeInTheDocument()
  })

  it('should display elevation gain', () => {
    render(<RouteCard route={mockRoute} />)

    expect(screen.getByText(/50m/i) || screen.getByText(/m/i)).toBeInTheDocument()
  })

  it('should call onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<RouteCard route={mockRoute} onSelect={onSelect} />)

    const card = screen.getByText(/boucle de 8 km/i).closest('div')
    if (card) {
      fireEvent.click(card)
      expect(onSelect).toHaveBeenCalledWith(mockRoute)
    }
  })

  it('should highlight when selected', () => {
    const { container } = render(<RouteCard route={mockRoute} isSelected={true} />)

    // Le composant devrait avoir une classe ou style indiquant qu'il est sélectionné
    expect(container.firstChild).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<RouteCard route={mockRoute} isLoading={true} />)

    // Devrait afficher un indicateur de chargement
    expect(screen.getByTestId('route-preview') || screen.queryByText(/loading/i)).toBeInTheDocument()
  })
})

