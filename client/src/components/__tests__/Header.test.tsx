import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Header } from '../layout/Header'
import { useAuthStore } from '../../store/auth-store'

// Mock the auth store
jest.mock('../../store/auth-store')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

const MockedHeader = () => (
  <BrowserRouter>
    <Header />
  </BrowserRouter>
)

describe('Header', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    })
  })

  it('renders logo and app name', () => {
    render(<MockedHeader />)
    
    expect(screen.getByText('C\'est la carte')).toBeInTheDocument()
    expect(screen.getByText('Trail Route Generator')).toBeInTheDocument()
  })

  it('renders navigation menu', () => {
    render(<MockedHeader />)
    
    expect(screen.getByText('Accueil')).toBeInTheDocument()
    expect(screen.getByText('Mes itinéraires')).toBeInTheDocument()
    expect(screen.getByText('À propos')).toBeInTheDocument()
  })

  it('shows login button when not authenticated', () => {
    render(<MockedHeader />)
    
    expect(screen.getByText('Se connecter')).toBeInTheDocument()
    expect(screen.getByText('S\'inscrire')).toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    })

    render(<MockedHeader />)
    
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Déconnexion')).toBeInTheDocument()
  })

  it('calls logout when logout button is clicked', () => {
    const mockLogout = jest.fn()
    mockUseAuthStore.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      clearError: jest.fn(),
    })

    render(<MockedHeader />)
    
    fireEvent.click(screen.getByText('Déconnexion'))
    expect(mockLogout).toHaveBeenCalled()
  })

  it('toggles mobile menu', () => {
    render(<MockedHeader />)
    
    const menuButton = screen.getByRole('button', { name: /menu/i })
    fireEvent.click(menuButton)
    
    // Check if mobile menu is visible
    expect(screen.getByRole('navigation')).toHaveClass('md:flex')
  })
})
