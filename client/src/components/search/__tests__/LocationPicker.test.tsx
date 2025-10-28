import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocationPicker } from '../LocationPicker'
import { useGeolocation } from '../../../hooks/useGeolocation'

// Mock useGeolocation
vi.mock('../../../hooks/useGeolocation', () => ({
  useGeolocation: vi.fn(),
}))

const mockUseGeolocation = vi.mocked(useGeolocation)
const mockGetCurrentPosition = vi.fn()

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGeolocation.mockReturnValue({
      position: null,
      isLoading: false,
      error: null,
      getCurrentPosition: mockGetCurrentPosition,
    })
  })

  it('renders location picker with current location button', () => {
    render(<LocationPicker />)
    
    expect(screen.getByText('Use my current location')).toBeInTheDocument()
    expect(screen.getByText('Or enter location manually')).toBeInTheDocument()
  })

  it('shows manual input when toggle is clicked', () => {
    render(<LocationPicker />)
    
    const toggleButton = screen.getByText('Or enter location manually')
    fireEvent.click(toggleButton)
    
    expect(screen.getByPlaceholderText('Enter address or coordinates (lat, lng)')).toBeInTheDocument()
    expect(screen.getByText('Set Location')).toBeInTheDocument()
  })

  it('calls getCurrentPosition when use location button is clicked', async () => {
    const mockPosition = { latitude: 48.8566, longitude: 2.3522, accuracy: 10 }
    mockGetCurrentPosition.mockResolvedValue(mockPosition)
    
    const onLocationChange = vi.fn()
    render(<LocationPicker onLocationChange={onLocationChange} />)
    
    const useLocationButton = screen.getByText('Use my current location')
    fireEvent.click(useLocationButton)
    
    await waitFor(() => {
      expect(mockGetCurrentPosition).toHaveBeenCalled()
    })
    
    await waitFor(() => {
      expect(onLocationChange).toHaveBeenCalledWith({
        lat: 48.8566,
        lng: 2.3522,
        address: 'Current Location (48.8566, 2.3522)',
      })
    })
  })

  it('shows loading state when getting current position', () => {
    mockUseGeolocation.mockReturnValue({
      position: null,
      isLoading: true,
      error: null,
      getCurrentPosition: mockGetCurrentPosition,
    })
    
    render(<LocationPicker />)
    
    expect(screen.getByText('Getting location...')).toBeInTheDocument()
  })

  it('handles manual location input', () => {
    const onLocationChange = vi.fn()
    render(<LocationPicker onLocationChange={onLocationChange} />)
    
    // Show manual input
    const toggleButton = screen.getByText('Or enter location manually')
    fireEvent.click(toggleButton)
    
    // Enter coordinates
    const input = screen.getByPlaceholderText('Enter address or coordinates (lat, lng)')
    fireEvent.change(input, { target: { value: '48.8566, 2.3522' } })
    
    // Submit
    const setLocationButton = screen.getByText('Set Location')
    fireEvent.click(setLocationButton)
    
    expect(onLocationChange).toHaveBeenCalledWith({
      lat: 48.8566,
      lng: 2.3522,
      address: '48.8566, 2.3522',
    })
  })

  it('handles invalid manual input gracefully', () => {
    const onLocationChange = vi.fn()
    render(<LocationPicker onLocationChange={onLocationChange} />)
    
    // Show manual input
    const toggleButton = screen.getByText('Or enter location manually')
    fireEvent.click(toggleButton)
    
    // Enter invalid coordinates
    const input = screen.getByPlaceholderText('Enter address or coordinates (lat, lng)')
    fireEvent.change(input, { target: { value: 'invalid input' } })
    
    // Submit
    const setLocationButton = screen.getByText('Set Location')
    fireEvent.click(setLocationButton)
    
    // Should fallback to Paris coordinates
    expect(onLocationChange).toHaveBeenCalledWith({
      lat: 48.8566,
      lng: 2.3522,
      address: 'invalid input',
    })
  })

  it('displays selected location', () => {
    const initialLocation = {
      lat: 48.8566,
      lng: 2.3522,
      address: 'Paris, France',
    }
    
    render(<LocationPicker initialLocation={initialLocation} />)
    
    expect(screen.getByText('Selected Location')).toBeInTheDocument()
    expect(screen.getByText('Paris, France')).toBeInTheDocument()
    expect(screen.getByText('48.8566, 2.3522')).toBeInTheDocument()
  })

  it('displays error message when geolocation fails', () => {
    mockUseGeolocation.mockReturnValue({
      position: null,
      isLoading: false,
      error: 'Permission denied',
      getCurrentPosition: mockGetCurrentPosition,
    })
    
    render(<LocationPicker />)
    
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
  })
})