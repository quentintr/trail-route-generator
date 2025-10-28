import React from 'react'
import { useLocation } from 'react-router-dom'
import { Route } from '../types/route'
import { MapView } from '../components/map/MapView'
import { RouteCard } from '../components/route/RouteCard'
import { RouteDetails } from '../components/route/RouteDetails'
import { useRouteVisualization } from '../hooks/useRouteVisualization'

interface ResultsProps {
  routes?: Route[]
  isLoading?: boolean
  onSaveRoute?: (route: Route) => void
}

export const Results: React.FC<ResultsProps> = ({
  routes: propRoutes,
  isLoading = false,
  onSaveRoute,
}) => {
  console.log('Results component loaded!')
  const location = useLocation()
  const stateRoutes = location.state?.routes as Route[] | undefined
  const routes = stateRoutes || propRoutes || []
  
  console.log('Results page - location.state:', location.state)
  console.log('Results page - stateRoutes:', stateRoutes)
  console.log('Results page - propRoutes:', propRoutes)
  console.log('Results page - final routes:', routes)
  console.log('Results page - routes.length:', routes.length)
  console.log('Results page - Array.isArray(routes):', Array.isArray(routes))

  const {
    selectedRoute,
    mapCenter,
    mapZoom,
    selectRoute,
    zoomToRoute,
  } = useRouteVisualization(routes)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div 
          data-testid="loading-skeleton"
          className="max-w-7xl mx-auto"
        >
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Routes sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Map skeleton */}
            <div className="lg:col-span-2">
              <div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No routes found</h2>
          <p className="text-gray-600 mb-6">Try adjusting your search criteria</p>
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
            Search Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Found {routes.length} route{routes.length > 1 ? 's' : ''}
          </h1>
          <p className="text-gray-600">
            Select a route to view details and see it on the map
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div 
        data-testid="results-content"
        className="max-w-7xl mx-auto p-4"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Routes Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Routes</h2>
              {routes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  isSelected={selectedRoute?.id === route.id}
                  onSelect={(route) => {
                    selectRoute(route)
                    zoomToRoute(route)
                  }}
                  onSave={onSaveRoute}
                />
              ))}
            </div>
          </div>

          {/* Map and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <div className="h-96 rounded-lg overflow-hidden shadow-lg">
              <MapView
                selectedRoute={selectedRoute}
                center={mapCenter}
                zoom={mapZoom}
              />
            </div>

            {/* Route Details */}
            <RouteDetails route={selectedRoute} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Results