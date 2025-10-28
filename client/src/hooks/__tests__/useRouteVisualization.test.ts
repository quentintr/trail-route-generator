import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouteVisualization } from '../useRouteVisualization'
import { Route } from '../../types/route'

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

describe('useRouteVisualization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useRouteVisualization(mockRoutes))
    
    expect(result.current.selectedRoute).toBe(mockRoutes[0])
    expect(result.current.mapCenter).toEqual([48.8566, 2.3522])
    expect(result.current.mapZoom).toBe(13)
    expect(typeof result.current.selectRoute).toBe('function')
    expect(typeof result.current.zoomToRoute).toBe('function')
    expect(typeof result.current.resetView).toBe('function')
  })

  it('selects route correctly', () => {
    const { result } = renderHook(() => useRouteVisualization(mockRoutes))
    
    act(() => {
      result.current.selectRoute(mockRoutes[1])
    })
    
    expect(result.current.selectedRoute).toBe(mockRoutes[1])
  })

  it('calculates map center from route geometry', () => {
    const { result } = renderHook(() => useRouteVisualization(mockRoutes))
    
    act(() => {
      result.current.selectRoute(mockRoutes[1])
    })
    
    // Center should be calculated from route geometry
    const expectedCenter = [48.8666, 2.3622] // Middle of the route
    expect(result.current.mapCenter).toEqual(expectedCenter)
  })

  it('handles route without geometry', () => {
    const routeWithoutGeometry = { ...mockRoutes[0], geometry: undefined }
    const { result } = renderHook(() => useRouteVisualization([routeWithoutGeometry]))
    
    act(() => {
      result.current.selectRoute(routeWithoutGeometry)
    })
    
    expect(result.current.selectedRoute).toBe(routeWithoutGeometry)
    expect(result.current.mapCenter).toEqual([48.8566, 2.3522]) // Default center
  })

  it('zooms to route bounds', () => {
    const { result } = renderHook(() => useRouteVisualization(mockRoutes))
    
    act(() => {
      result.current.zoomToRoute(mockRoutes[1])
    })
    
    expect(result.current.mapZoom).toBe(12) // Should zoom out to fit route
  })

  it('resets view to default', () => {
    const { result } = renderHook(() => useRouteVisualization(mockRoutes))
    
    // First change the view
    act(() => {
      result.current.zoomToRoute(mockRoutes[1])
    })
    
    expect(result.current.mapZoom).toBe(12)
    
    // Then reset
    act(() => {
      result.current.resetView()
    })
    
    expect(result.current.mapZoom).toBe(13)
    expect(result.current.mapCenter).toEqual([48.8566, 2.3522])
  })

  it('handles empty routes array', () => {
    const { result } = renderHook(() => useRouteVisualization([]))
    
    expect(result.current.selectedRoute).toBe(null)
    expect(result.current.mapCenter).toEqual([48.8566, 2.3522]) // Default center
  })

  it('calculates bounds correctly for complex route', () => {
    const complexRoute: Route = {
      ...mockRoutes[0],
      geometry: {
        type: 'LineString',
        coordinates: [
          [2.3522, 48.8566],
          [2.3622, 48.8666],
          [2.3722, 48.8766],
          [2.3822, 48.8866],
        ],
      },
    }
    
    const { result } = renderHook(() => useRouteVisualization([complexRoute]))
    
    act(() => {
      result.current.selectRoute(complexRoute)
    })
    
    // Center should be in the middle of the bounds
    const expectedCenter = [48.8716, 2.3672] // Calculated center
    expect(result.current.mapCenter).toEqual(expectedCenter)
  })

  it('handles single coordinate route', () => {
    const singlePointRoute: Route = {
      ...mockRoutes[0],
      geometry: {
        type: 'LineString',
        coordinates: [[2.3522, 48.8566]],
      },
    }
    
    const { result } = renderHook(() => useRouteVisualization([singlePointRoute]))
    
    act(() => {
      result.current.selectRoute(singlePointRoute)
    })
    
    expect(result.current.mapCenter).toEqual([48.8566, 2.3522])
  })

  it('maintains selected route when routes array changes', () => {
    const { result, rerender } = renderHook(
      ({ routes }) => useRouteVisualization(routes),
      { initialProps: { routes: mockRoutes } }
    )
    
    // Select second route
    act(() => {
      result.current.selectRoute(mockRoutes[1])
    })
    
    expect(result.current.selectedRoute).toBe(mockRoutes[1])
    
    // Update routes array
    const newRoutes = [...mockRoutes, { ...mockRoutes[0], id: '3', name: 'Route 3' }]
    rerender({ routes: newRoutes })
    
    // Selected route should still be the same (by ID)
    expect(result.current.selectedRoute?.id).toBe('2')
  })
})
