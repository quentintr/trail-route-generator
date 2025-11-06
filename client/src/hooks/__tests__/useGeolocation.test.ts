import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGeolocation } from '../useGeolocation'

// Mock de l'API de géolocalisation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

describe('useGeolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useGeolocation())
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.position).toBe(null)
    expect(typeof result.current.getCurrentPosition).toBe('function')
  })

  it('successfully gets current position', async () => {
    const mockPosition = {
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        accuracy: 10,
      },
    }
    
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition)
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    await act(async () => {
      await result.current.getCurrentPosition()
    })
    
    expect(result.current.position).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
      accuracy: 10,
    })
    expect(result.current.error).toBe(null)
  })

  it('handles geolocation error', async () => {
    const mockError = {
      code: 1,
      message: 'Permission denied',
    }
    
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error(mockError)
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    await act(async () => {
      await result.current.getCurrentPosition()
    })
    
    expect(result.current.error).toBe('Permission denied')
    expect(result.current.position).toBe(null)
  })

  it('handles geolocation not supported', async () => {
    // Sauvegarder la valeur originale
    const originalGeolocation = global.navigator.geolocation
    
    // Simuler l'absence de geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    await act(async () => {
      try {
        await result.current.getCurrentPosition()
      } catch (error) {
        // Erreur attendue
      }
    })
    
    // Vérifier qu'une erreur est présente
    expect(result.current.error).toBeTruthy()
    expect(result.current.error).toContain('not supported')
    
    // Restaurer la valeur originale
    Object.defineProperty(global.navigator, 'geolocation', {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    })
  })

  it('sets loading state during geolocation request', async () => {
    let resolvePosition: (position: any) => void
    const positionPromise = new Promise((resolve) => {
      resolvePosition = resolve
    })
    
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      positionPromise.then(success)
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    act(() => {
      result.current.getCurrentPosition()
    })
    
    expect(result.current.isLoading).toBe(true)
    
    await act(async () => {
      resolvePosition!({
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 10,
        },
      })
    })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('handles timeout error', async () => {
    const mockError = {
      code: 3,
      message: 'Timeout',
    }
    
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error(mockError)
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    await act(async () => {
      await result.current.getCurrentPosition()
    })
    
    expect(result.current.error).toBe('Timeout')
  })

  it('handles position unavailable error', async () => {
    const mockError = {
      code: 2,
      message: 'Position unavailable',
    }
    
    mockGeolocation.getCurrentPosition.mockImplementation((_success, error) => {
      error(mockError)
    })
    
    const { result } = renderHook(() => useGeolocation())
    
    await act(async () => {
      await result.current.getCurrentPosition()
    })
    
    expect(result.current.error).toBe('Position unavailable')
  })
})
