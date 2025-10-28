import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGenerateRoute } from '../useGenerateRoute'
import { RouteGenerationRequest, RouteGenerationResponse } from '../../types/route'

// Mock du service API
const mockGenerateRoute = vi.fn()

vi.mock('../../services/api', () => ({
  apiService: {
    generateRoute: mockGenerateRoute,
  },
}))

describe('useGenerateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useGenerateRoute())
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.routes).toEqual([])
    expect(typeof result.current.generateRoute).toBe('function')
  })

  it('successfully generates routes', async () => {
    const mockResponse: RouteGenerationResponse = {
      success: true,
      routes: [
        {
          id: '1',
          name: 'Test Route',
          distance: 10,
          duration: 60,
          elevation: 100,
          difficulty: 'medium',
          terrain_type: 'paved',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
    }
    
    mockGenerateRoute.mockResolvedValue(mockResponse)
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
      terrain_type: 'paved',
    }
    
    await act(async () => {
      await result.current.generateRoute(request)
    })
    
    expect(result.current.routes).toEqual(mockResponse.routes)
    expect(result.current.error).toBe(null)
    expect(mockGenerateRoute).toHaveBeenCalledWith(request)
  })

  it('handles API error', async () => {
    const mockError = {
      message: 'Failed to generate route',
      status: 500,
    }
    
    mockGenerateRoute.mockRejectedValue(mockError)
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
    }
    
    await act(async () => {
      try {
        await result.current.generateRoute(request)
      } catch (err) {
        // Expected to throw
      }
    })
    
    expect(result.current.error).toBe('Failed to generate route')
    expect(result.current.routes).toEqual([])
  })

  it('sets loading state during request', async () => {
    let resolveRequest: (response: any) => void
    const requestPromise = new Promise((resolve) => {
      resolveRequest = resolve
    })
    
    mockGenerateRoute.mockReturnValue(requestPromise)
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
    }
    
    act(() => {
      result.current.generateRoute(request)
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      resolveRequest!({
        success: true,
        routes: [],
      })
    })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('handles network error', async () => {
    mockGenerateRoute.mockRejectedValue(new Error('Network error'))
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
    }
    
    await act(async () => {
      try {
        await result.current.generateRoute(request)
      } catch (err) {
        // Expected to throw
      }
    })
    
    expect(result.current.error).toBe('Network error')
  })

  it('clears error when new request starts', async () => {
    mockGenerateRoute.mockRejectedValueOnce(new Error('First error'))
    mockGenerateRoute.mockResolvedValueOnce({
      success: true,
      routes: [],
    })
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
    }
    
    // First request fails
    await act(async () => {
      try {
        await result.current.generateRoute(request)
      } catch (err) {
        // Expected to throw
      }
    })
    
    expect(result.current.error).toBe('First error')
    
    // Second request succeeds
    await act(async () => {
      await result.current.generateRoute(request)
    })
    
    expect(result.current.error).toBe(null)
  })

  it('handles empty routes response', async () => {
    const mockResponse: RouteGenerationResponse = {
      success: true,
      routes: [],
      message: 'No routes found',
    }
    
    mockGenerateRoute.mockResolvedValue(mockResponse)
    
    const { result } = renderHook(() => useGenerateRoute())
    
    const request: RouteGenerationRequest = {
      start_lat: 48.8566,
      start_lon: 2.3522,
      distance: 10,
    }
    
    await act(async () => {
      await result.current.generateRoute(request)
    })
    
    expect(result.current.routes).toEqual([])
    expect(result.current.error).toBe(null)
  })
})
