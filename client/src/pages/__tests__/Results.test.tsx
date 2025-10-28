import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Results } from '../Results'
import { Route } from '../../types/route'

// Mock des composants enfants
vi.mock('../../components/map/MapView', () => ({
  MapView: ({ selectedRoute, onRouteSelect }: any) => (
    <div data-testid="map-view">
      <div>Map View</div>
      <div>Selected Route: {selectedRoute?.name || 'None'}</div>
      <button onClick={() => onRouteSelect && onRouteSelect(mockRoutes[0])}>
        Select Route 1
      </button>
    </div>
  ),
}))

vi.mock('../../components/route/RouteCard', () => ({
  RouteCard: ({ route, isSelected, onSelect, onSave }: any) => (
    <div data-testid={`route-card-${route.id}`} className={isSelected ? 'selected' : ''}>
      <h3>{route.name}</h3>
      <p>{route.distance}km</p>
      <button onClick={() => onSelect(route)}>Select</button>
      <button onClick={() => onSave(route)}>Save</button>
    </div>
  ),
}))

vi.mock('../../components/route/RouteDetails', () => ({
  RouteDetails: ({ route }: any) => (
    <div data-testid="route-details">
      <h2>Details for {route?.name}</h2>
    </div>
  ),
}))

// Mock des routes de test
const mockRoutes: Route[] = [
  {
    id: '1',
    name: 'Route 1',
    distance: 10,
    duration: 60,
    elevation: 100,
    difficulty: 'medium',
    terrain_type: 'mixed',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    geometry: {
      type: 'LineString',
      coordinates: [[2.3522, 48.8566], [2.3622, 48.8666]],
    },
  },
  {
    id: '2',
    name: 'Route 2',
    distance: 15,
    duration: 90,
    elevation: 200,
    difficulty: 'hard',
    terrain_type: 'unpaved',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    geometry: {
      type: 'LineString',
      coordinates: [[2.3522, 48.8566], [2.3722, 48.8766]],
    },
  },
]

describe('Results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton when routes are loading', () => {
    render(<Results routes={[]} isLoading={true} />)
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('results-content')).not.toBeInTheDocument()
  })

  it('renders routes when loaded', () => {
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    expect(screen.getByTestId('results-content')).toBeInTheDocument()
    expect(screen.getByTestId('route-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('route-card-2')).toBeInTheDocument()
    expect(screen.getByTestId('map-view')).toBeInTheDocument()
  })

  it('displays correct number of routes', () => {
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    expect(screen.getAllByTestId(/route-card-/)).toHaveLength(2)
  })

  it('shows first route as selected by default', () => {
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    const firstCard = screen.getByTestId('route-card-1')
    expect(firstCard).toHaveClass('selected')
  })

  it('handles route selection', async () => {
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    const secondCard = screen.getByTestId('route-card-2')
    const selectButton = secondCard.querySelector('button')
    
    fireEvent.click(selectButton!)
    
    await waitFor(() => {
      expect(screen.getByText('Selected Route: Route 2')).toBeInTheDocument()
    })
  })

  it('handles route saving', async () => {
    const mockOnSave = vi.fn()
    render(<Results routes={mockRoutes} isLoading={false} onSaveRoute={mockOnSave} />)
    
    const firstCard = screen.getByTestId('route-card-1')
    const saveButton = firstCard.querySelectorAll('button')[1]
    
    fireEvent.click(saveButton!)
    
    expect(mockOnSave).toHaveBeenCalledWith(mockRoutes[0])
  })

  it('displays route details when route is selected', () => {
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    expect(screen.getByTestId('route-details')).toBeInTheDocument()
    expect(screen.getByText('Details for Route 1')).toBeInTheDocument()
  })

  it('shows empty state when no routes', () => {
    render(<Results routes={[]} isLoading={false} />)
    
    expect(screen.getByText('No routes found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument()
  })

  it('handles mobile layout', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })
    
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    const resultsContent = screen.getByTestId('results-content')
    expect(resultsContent).toHaveClass('flex-col')
  })

  it('handles desktop layout', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    
    render(<Results routes={mockRoutes} isLoading={false} />)
    
    const resultsContent = screen.getByTestId('results-content')
    expect(resultsContent).toHaveClass('lg:flex-row')
  })
})
