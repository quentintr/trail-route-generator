import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useRoutesStore } from '../store/routes-store'

export const RouteDetails = () => {
  const { id } = useParams<{ id: string }>()
  const { currentRoute, isLoading, error, getRoute, saveRoute } = useRoutesStore()

  useEffect(() => {
    if (id) {
      getRoute(id)
    }
  }, [id, getRoute])

  const handleSaveRoute = async () => {
    if (id) {
      await saveRoute(id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'itinéraire...</p>
        </div>
      </div>
    )
  }

  if (error || !currentRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'Itinéraire non trouvé'}
          </p>
          <Link
            to="/"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="text-green-600 hover:text-green-700 font-medium mb-4 inline-flex items-center"
          >
            ← Retour à la recherche
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{currentRoute.name}</h1>
          {currentRoute.description && (
            <p className="text-gray-600 mt-2">{currentRoute.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Map Placeholder */}
            <div className="bg-gray-200 rounded-lg h-96 mb-6 flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl mb-2">🗺️</span>
                <p className="text-gray-600">Carte interactive</p>
                <p className="text-sm text-gray-500">(Intégration Leaflet à venir)</p>
              </div>
            </div>

            {/* Route Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Informations de l'itinéraire
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentRoute.distance}
                  </div>
                  <div className="text-sm text-gray-500">km</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentRoute.duration}
                  </div>
                  <div className="text-sm text-gray-500">minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {currentRoute.elevation}
                  </div>
                  <div className="text-sm text-gray-500">m de dénivelé</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentRoute.difficulty}
                  </div>
                  <div className="text-sm text-gray-500">difficulté</div>
                </div>
              </div>
            </div>

            {/* Waypoints */}
            {currentRoute.waypoints && currentRoute.waypoints.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Points d'intérêt
                </h2>
                <div className="space-y-3">
                  {currentRoute.waypoints
                    .sort((a, b) => a.order - b.order)
                    .map((waypoint, index) => (
                      <div key={waypoint.id} className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-medium text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {waypoint.name || `Point ${index + 1}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Actions
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={handleSaveRoute}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Sauvegarder cet itinéraire
                </button>
                
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors">
                  Exporter GPX
                </button>
                
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors">
                  Partager
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">Détails</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Type de terrain:</span>
                    <span className="font-medium capitalize">{currentRoute.terrain_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Créé le:</span>
                    <span className="font-medium">
                      {new Date(currentRoute.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
