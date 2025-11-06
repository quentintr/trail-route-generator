import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SearchForm } from '../../src/components/search/SearchForm'
import * as apiService from '../../src/services/api'

// Mock de l'API
vi.mock('../../src/services/api', () => ({
  generateRoute: vi.fn()
}))

// Mock de useGenerateRoute
vi.mock('../../src/hooks/useGenerateRoute', () => ({
  useGenerateRoute: () => ({
    generateRoute: vi.fn().mockResolvedValue([
      {
        id: 'route_1',
        name: 'Boucle de 12 km',
        distance: 12,
        duration: 60,
        elevation_gain: 50,
        geometry: {
          type: 'LineString',
          coordinates: [[1.4516224, 43.5781632], [1.4526224, 43.5791632]]
        },
        quality_score: 0.85
      },
      {
        id: 'route_2',
        name: 'Boucle de 11.5 km',
        distance: 11.5,
        duration: 58,
        elevation_gain: 45,
        geometry: {
          type: 'LineString',
          coordinates: [[1.4516224, 43.5781632], [1.4526224, 43.5791632]]
        },
        quality_score: 0.82
      },
      {
        id: 'route_3',
        name: 'Boucle de 12.2 km',
        distance: 12.2,
        duration: 61,
        elevation_gain: 55,
        geometry: {
          type: 'LineString',
          coordinates: [[1.4516224, 43.5781632], [1.4526224, 43.5791632]]
        },
        quality_score: 0.80
      }
    ]),
    isLoading: false,
    error: null
  })
}))

// Mock de LocationPicker
vi.mock('../../src/components/search/LocationPicker', () => ({
  LocationPicker: ({ value, onChange }: any) => (
    <div data-testid="location-picker">
      <input
        data-testid="location-lat"
        value={value?.lat || 43.5781632}
        onChange={(e) => onChange({ ...value, lat: parseFloat(e.target.value) || 43.5781632 })}
      />
      <input
        data-testid="location-lng"
        value={value?.lng || 1.4516224}
        onChange={(e) => onChange({ ...value, lng: parseFloat(e.target.value) || 1.4516224 })}
      />
    </div>
  )
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('Route Generation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate routes when form is submitted', async () => {
    const onRouteGenerated = vi.fn()
    renderWithRouter(<SearchForm onRouteGenerated={onRouteGenerated} />)

    const durationInput = screen.getByLabelText(/durée/i)
    const paceInput = screen.getByLabelText(/allure/i)
    const submitButton = screen.getByRole('button', { name: /générer/i })

    fireEvent.change(durationInput, { target: { value: '60' } })
    fireEvent.change(paceInput, { target: { value: '5:00' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onRouteGenerated).toHaveBeenCalled()
    }, { timeout: 5000 })
  })

  it('should calculate distance correctly from duration and pace', async () => {
    renderWithRouter(<SearchForm />)

    const durationInput = screen.getByLabelText(/durée/i)
    const paceInput = screen.getByLabelText(/allure/i)

    // 60 minutes à 5:00 min/km = 12 km
    fireEvent.change(durationInput, { target: { value: '60' } })
    fireEvent.change(paceInput, { target: { value: '5:00' } })

    await waitFor(() => {
      // La distance calculée devrait être affichée
      expect(screen.getByText(/12/i) || screen.getByText(/km/i)).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const { useGenerateRoute } = await import('../../src/hooks/useGenerateRoute')
    vi.mocked(useGenerateRoute).mockReturnValue({
      generateRoute: vi.fn().mockRejectedValue(new Error('API Error')),
      isLoading: false,
      error: 'API Error'
    })

    renderWithRouter(<SearchForm />)

    // Le formulaire devrait gérer l'erreur sans planter
    expect(screen.getByRole('button', { name: /générer/i })).toBeInTheDocument()
  })

  it('should show loading state during generation', async () => {
    const { useGenerateRoute } = await import('../../src/hooks/useGenerateRoute')
    vi.mocked(useGenerateRoute).mockReturnValue({
      generateRoute: vi.fn(),
      isLoading: true,
      error: null
    })

    renderWithRouter(<SearchForm />)

    // Devrait afficher un état de chargement
    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).toBeDisabled()
  })
})

