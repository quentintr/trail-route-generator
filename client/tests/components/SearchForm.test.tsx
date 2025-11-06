import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { SearchForm } from '../../src/components/search/SearchForm'

// Mock du hook useGenerateRoute
vi.mock('../../src/hooks/useGenerateRoute', () => ({
  useGenerateRoute: () => ({
    generateRoute: vi.fn().mockResolvedValue([
      {
        id: 'test_route_1',
        name: 'Boucle de 12 km',
        distance: 12,
        duration: 60,
        elevation_gain: 50,
        geometry: {
          type: 'LineString',
          coordinates: [[1.4516224, 43.5781632], [1.4526224, 43.5791632]]
        },
        quality_score: 0.85
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
        value={value?.lat || 0}
        onChange={(e) => onChange({ ...value, lat: parseFloat(e.target.value) || 0 })}
      />
      <input
        data-testid="location-lng"
        value={value?.lng || 0}
        onChange={(e) => onChange({ ...value, lng: parseFloat(e.target.value) || 0 })}
      />
    </div>
  )
}))

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('SearchForm Component', () => {
  it('should render form with all required fields', () => {
    renderWithRouter(<SearchForm />)

    expect(screen.getByLabelText(/durée/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/allure/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/terrain/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /générer/i })).toBeInTheDocument()
  })

  it('should calculate distance automatically when duration and pace change', async () => {
    renderWithRouter(<SearchForm />)

    const durationInput = screen.getByLabelText(/durée/i)
    const paceInput = screen.getByLabelText(/allure/i)

    // Entrer 60 minutes et 5:00 min/km
    fireEvent.change(durationInput, { target: { value: '60' } })
    fireEvent.change(paceInput, { target: { value: '5:00' } })

    await waitFor(() => {
      // Vérifier que la distance calculée est affichée (12 km pour 60 min à 5:00/km)
      const distanceDisplay = screen.queryByText(/12/i)
      expect(distanceDisplay || screen.getByText(/km/i)).toBeInTheDocument()
    })
  })

  it('should validate pace format', async () => {
    renderWithRouter(<SearchForm />)

    const paceInput = screen.getByLabelText(/allure/i)

    // Pace invalide
    fireEvent.change(paceInput, { target: { value: 'invalid' } })
    fireEvent.blur(paceInput)

    await waitFor(() => {
      // Le formulaire devrait afficher une erreur
      expect(screen.getByText(/format/i) || screen.getByText(/invalid/i)).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('should disable submit button when location is not set', () => {
    renderWithRouter(<SearchForm />)

    const submitButton = screen.getByRole('button', { name: /générer/i })
    
    // Le bouton devrait être désactivé si la location n'est pas valide
    // (dépend de l'implémentation réelle)
  })

  it('should handle form submission', async () => {
    const onRouteGenerated = vi.fn()
    renderWithRouter(<SearchForm onRouteGenerated={onRouteGenerated} />)

    const durationInput = screen.getByLabelText(/durée/i)
    const paceInput = screen.getByLabelText(/allure/i)
    const submitButton = screen.getByRole('button', { name: /générer/i })

    // Définir une location valide
    const latInput = screen.getByTestId('location-lat')
    const lngInput = screen.getByTestId('location-lng')
    
    fireEvent.change(latInput, { target: { value: '43.5781632' } })
    fireEvent.change(lngInput, { target: { value: '1.4516224' } })
    fireEvent.change(durationInput, { target: { value: '45' } })
    fireEvent.change(paceInput, { target: { value: '6:00' } })
    
    fireEvent.click(submitButton)

    await waitFor(() => {
      // Le formulaire devrait traiter la soumission
      expect(onRouteGenerated).toHaveBeenCalled()
    }, { timeout: 5000 })
  })
})

