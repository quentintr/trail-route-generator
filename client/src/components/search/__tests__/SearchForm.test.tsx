import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchForm } from '../SearchForm'
import { useGenerateRoute } from '../../../hooks/useGenerateRoute'

// Mock useGenerateRoute
vi.mock('../../../hooks/useGenerateRoute', () => ({
  useGenerateRoute: vi.fn(),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

const mockGenerateRoute = vi.fn()
const mockUseGenerateRoute = vi.mocked(useGenerateRoute)

describe('SearchForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseGenerateRoute.mockReturnValue({
      generateRoute: mockGenerateRoute,
      isLoading: false,
      error: null,
      routes: [],
    })
  })

  it('renders all form fields', () => {
    render(<SearchForm />)
    
    expect(screen.getByText('Distance: 10 km')).toBeInTheDocument()
    expect(screen.getByDisplayValue('5:00')).toBeInTheDocument()
    expect(screen.getByText('Terrain Type')).toBeInTheDocument()
    expect(screen.getByText('Starting Location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate my route/i })).toBeInTheDocument()
  })

  it('updates distance when slider is moved', () => {
    render(<SearchForm />)
    
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '15' } })
    
    expect(screen.getByText('Distance: 15 km')).toBeInTheDocument()
  })

  it('validates pace format', async () => {
    render(<SearchForm />)
    
    const paceInput = screen.getByDisplayValue('5:00')
    fireEvent.change(paceInput, { target: { value: 'invalid' } })
    
    const submitButton = screen.getByRole('button', { name: /generate my route/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Pace must be in format MM:SS')).toBeInTheDocument()
    })
  })

  it('validates distance range', async () => {
    render(<SearchForm />)
    
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '0' } })
    
    const submitButton = screen.getByRole('button', { name: /generate my route/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Distance must be at least 1km')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const mockRoutes = [
      {
        id: '1',
        name: 'Test Route',
        distance: 10,
        duration: 60,
        elevation: 100,
        difficulty: 'medium',
        terrain_type: 'mixed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ]
    
    mockGenerateRoute.mockResolvedValue(mockRoutes)
    
    render(<SearchForm />)
    
    const submitButton = screen.getByRole('button', { name: /generate my route/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockGenerateRoute).toHaveBeenCalledWith({
        start_lat: 48.8566,
        start_lon: 2.3522,
        distance: 10,
        terrain_type: 'mixed',
        pace: 5,
      })
    })
    
    expect(mockNavigate).toHaveBeenCalledWith('/routes/results', {
      state: { routes: mockRoutes },
    })
  })

  it('shows loading state when generating routes', () => {
    mockUseGenerateRoute.mockReturnValue({
      generateRoute: mockGenerateRoute,
      isLoading: true,
      error: null,
      routes: [],
    })
    
    render(<SearchForm />)
    
    expect(screen.getByText('Generating Routes...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generating routes/i })).toBeDisabled()
  })

  it('displays error message when route generation fails', () => {
    mockUseGenerateRoute.mockReturnValue({
      generateRoute: mockGenerateRoute,
      isLoading: false,
      error: 'Failed to generate routes',
      routes: [],
    })
    
    render(<SearchForm />)
    
    expect(screen.getByText('Error generating routes')).toBeInTheDocument()
    expect(screen.getByText('Failed to generate routes')).toBeInTheDocument()
  })

  it('allows terrain type selection', () => {
    render(<SearchForm />)
    
    const pavedOption = screen.getByLabelText(/paved/i)
    fireEvent.click(pavedOption)
    
    expect(pavedOption).toBeChecked()
  })

  it('handles location change', () => {
    const onLocationChange = vi.fn()
    render(<SearchForm onRouteGenerated={onLocationChange} />)
    
    // This would be tested with the LocationPicker component
    // For now, we'll just verify the component renders
    expect(screen.getByText('Starting Location')).toBeInTheDocument()
  })
})