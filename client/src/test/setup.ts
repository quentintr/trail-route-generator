import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Cleanup après chaque test
afterEach(() => {
  cleanup()
})

// Mock complet de react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/routes/results',
      search: '',
      hash: '',
      state: { routes: [] },
      key: 'default'
    }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    useMatch: () => null,
    useResolvedPath: (to: string) => ({ pathname: to, search: '', hash: '' }),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
    Routes: ({ children }: { children: React.ReactNode }) => children,
    Route: ({ children }: { children: React.ReactNode }) => children,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
    Navigate: ({ to }: { to: string }) => <div>Navigate to {to}</div>,
    Outlet: () => <div>Outlet</div>
  }
})

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => 
    success({ coords: { latitude: 48.8566, longitude: 2.3522 } })
  ),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
  configurable: true,
})

// Mock Leaflet
vi.mock('leaflet', () => ({
  map: vi.fn(() => ({
    setView: vi.fn(),
    addLayer: vi.fn(),
    remove: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  })),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn()
  })),
  polyline: vi.fn(() => ({
    addTo: vi.fn(),
    getBounds: vi.fn(() => ({
      getCenter: vi.fn(() => ({ lat: 48.8566, lng: 2.3522 }))
    }))
  })),
  marker: vi.fn(() => ({
    addTo: vi.fn(),
    bindPopup: vi.fn()
  })),
  icon: vi.fn(() => ({}))
}))

// Mock react-leaflet
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: () => <div data-testid="polyline" />,
  Marker: () => <div data-testid="marker" />,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn()
  })
}))

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock de ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))
