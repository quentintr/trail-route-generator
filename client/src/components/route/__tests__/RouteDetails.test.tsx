import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RouteDetails } from '../RouteDetails'
import { Route } from '../../../types/route'

// Mock de recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: any) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: any) => (
    <div data-testid="line" data-key={dataKey}>Line</div>
  ),
  XAxis: ({ dataKey }: any) => (
    <div data-testid="x-axis" data-key={dataKey}>X Axis</div>
  ),
  YAxis: ({ dataKey }: any) => (
    <div data-testid="y-axis" data-key={dataKey}>Y Axis</div>
  ),
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
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
  waypoints: [
    {
      id: '1',
      route_id: '1',
      name: 'Start Point',
      latitude: 48.8566,
      longitude: 2.3522,
      order: 0,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      route_id: '1',
      name: 'End Point',
      latitude: 48.8766,
      longitude: 2.3722,
      order: 1,
      created_at: '2023-01-01T00:00:00Z',
    },
  ],
}

describe('RouteDetails', () => {
  it('renders route details correctly', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Test Route')).toBeInTheDocument()
    expect(screen.getByText('10 km')).toBeInTheDocument()
    expect(screen.getByText('1h 0min')).toBeInTheDocument()
    expect(screen.getByText('100m')).toBeInTheDocument()
  })

  it('displays elevation profile chart', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Elevation Profile')).toBeInTheDocument()
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows turn-by-turn directions', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Directions')).toBeInTheDocument()
    expect(screen.getByText('Start Point')).toBeInTheDocument()
    expect(screen.getByText('End Point')).toBeInTheDocument()
  })

  it('displays surface breakdown', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Surface Breakdown')).toBeInTheDocument()
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('shows points of interest', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Points of Interest')).toBeInTheDocument()
  })

  it('handles route without waypoints', () => {
    const routeWithoutWaypoints = { ...mockRoute, waypoints: undefined }
    render(<RouteDetails route={routeWithoutWaypoints} />)
    
    expect(screen.getByText('Test Route')).toBeInTheDocument()
    expect(screen.queryByText('Start Point')).not.toBeInTheDocument()
  })

  it('displays difficulty information', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('shows route statistics', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Route Statistics')).toBeInTheDocument()
    expect(screen.getByText('Average Speed')).toBeInTheDocument()
    expect(screen.getByText('Max Elevation')).toBeInTheDocument()
  })

  it('handles empty route gracefully', () => {
    render(<RouteDetails route={null} />)
    
    expect(screen.getByText('No route selected')).toBeInTheDocument()
  })

  it('formats elevation correctly', () => {
    const highElevationRoute = { ...mockRoute, elevation: 1250 }
    render(<RouteDetails route={highElevationRoute} />)
    
    expect(screen.getByText('1.25km')).toBeInTheDocument()
  })

  it('displays terrain type with icon', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('shows route creation date', () => {
    render(<RouteDetails route={mockRoute} />)
    
    expect(screen.getByText('Created')).toBeInTheDocument()
  })

  it('handles different difficulty levels', () => {
    const easyRoute = { ...mockRoute, difficulty: 'easy' as const }
    const { rerender } = render(<RouteDetails route={easyRoute} />)
    
    expect(screen.getByText('Easy')).toBeInTheDocument()
    
    const hardRoute = { ...mockRoute, difficulty: 'hard' as const }
    rerender(<RouteDetails route={hardRoute} />)
    
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })
})
