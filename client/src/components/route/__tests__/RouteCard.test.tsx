import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RouteCard } from '../RouteCard'
import { Route } from '../../../types/route'

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
    ],
  },
}

describe('RouteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders route information correctly', () => {
    render(<RouteCard route={mockRoute} />)
    
    expect(screen.getByText('Test Route')).toBeInTheDocument()
    expect(screen.getByText('10 km')).toBeInTheDocument()
    expect(screen.getByText('1h 0min')).toBeInTheDocument()
    expect(screen.getByText('100m')).toBeInTheDocument()
  })

  it('shows selected state when isSelected is true', () => {
    render(<RouteCard route={mockRoute} isSelected={true} />)
    
    const card = screen.getByTestId('route-card')
    expect(card).toHaveClass('ring-2', 'ring-indigo-500')
  })

  it('shows unselected state when isSelected is false', () => {
    render(<RouteCard route={mockRoute} isSelected={false} />)
    
    const card = screen.getByTestId('route-card')
    expect(card).not.toHaveClass('ring-2', 'ring-indigo-500')
  })

  it('calls onSelect when select button is clicked', () => {
    const mockOnSelect = vi.fn()
    render(<RouteCard route={mockRoute} onSelect={mockOnSelect} />)
    
    const selectButton = screen.getByRole('button', { name: /select this route/i })
    fireEvent.click(selectButton)
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockRoute)
  })

  it('calls onSave when save button is clicked', () => {
    const mockOnSave = vi.fn()
    render(<RouteCard route={mockRoute} onSave={mockOnSave} />)
    
    const saveButton = screen.getByRole('button', { name: /save for later/i })
    fireEvent.click(saveButton)
    
    expect(mockOnSave).toHaveBeenCalledWith(mockRoute)
  })

  it('displays difficulty badge with correct color', () => {
    render(<RouteCard route={mockRoute} />)
    
    const difficultyBadge = screen.getByText('Medium')
    expect(difficultyBadge).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('displays terrain type with correct icon', () => {
    render(<RouteCard route={mockRoute} />)
    
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('shows surface breakdown', () => {
    render(<RouteCard route={mockRoute} />)
    
    expect(screen.getByText('Surface')).toBeInTheDocument()
    expect(screen.getByText('Mixed')).toBeInTheDocument()
  })

  it('displays map thumbnail', () => {
    render(<RouteCard route={mockRoute} />)
    
    expect(screen.getByTestId('route-thumbnail')).toBeInTheDocument()
  })

  it('handles route without geometry', () => {
    const routeWithoutGeometry = { ...mockRoute, geometry: undefined }
    render(<RouteCard route={routeWithoutGeometry} />)
    
    expect(screen.getByText('Test Route')).toBeInTheDocument()
    expect(screen.queryByTestId('route-thumbnail')).not.toBeInTheDocument()
  })

  it('formats duration correctly for different values', () => {
    const longRoute = { ...mockRoute, duration: 125 }
    render(<RouteCard route={longRoute} />)
    
    expect(screen.getByText('2h 5min')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<RouteCard route={mockRoute} isLoading={true} />)
    
    expect(screen.getByTestId('route-card-loading')).toBeInTheDocument()
  })

  it('handles different difficulty levels', () => {
    const easyRoute = { ...mockRoute, difficulty: 'easy' as const }
    const { rerender } = render(<RouteCard route={easyRoute} />)
    
    expect(screen.getByText('Easy')).toHaveClass('bg-green-100', 'text-green-800')
    
    const hardRoute = { ...mockRoute, difficulty: 'hard' as const }
    rerender(<RouteCard route={hardRoute} />)
    
    expect(screen.getByText('Hard')).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('handles different terrain types', () => {
    const pavedRoute = { ...mockRoute, terrain_type: 'paved' as const }
    const { rerender } = render(<RouteCard route={pavedRoute} />)
    
    expect(screen.getByText('Paved')).toBeInTheDocument()
    
    const unpavedRoute = { ...mockRoute, terrain_type: 'unpaved' as const }
    rerender(<RouteCard route={unpavedRoute} />)
    
    expect(screen.getByText('Unpaved')).toBeInTheDocument()
  })

  it('shows elevation gain with correct formatting', () => {
    const highElevationRoute = { ...mockRoute, elevation: 1250 }
    render(<RouteCard route={highElevationRoute} />)
    
    expect(screen.getByText('1.25km')).toBeInTheDocument()
  })
})
