import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRoutesStore } from '../store/routes-store'
import { useAuth } from '../hooks/useAuth'

export const MyRoutes = () => {
  const { routes, isLoading, error, getUserRoutes } = useRoutesStore()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      getUserRoutes()
    }
  }, [isAuthenticated, getUserRoutes])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connexion requise
          </h1>
          <p className="text-gray-600 mb-6">
            Vous devez être connecté pour voir vos itinéraires sauvegardés.
          </p>
          <Link
            to="/login"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos itinéraires...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Erreur
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => getUserRoutes()}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mes itinéraires</h1>
          <p className="text-gray-600 mt-2">
            Vos itinéraires de randonnée sauvegardés
          </p>
        </div>

        {routes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🗺️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun itinéraire sauvegardé
            </h2>
            <p className="text-gray-600 mb-6">
              Commencez par générer des itinéraires depuis la page d'accueil.
            </p>
            <Link
              to="/"
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Générer des itinéraires
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map((route) => (
              <div key={route.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {route.name}
                  </h3>
                  {route.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {route.description}
                    </p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-500">Distance</span>
                      <p className="font-medium">{route.distance} km</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Durée</span>
                      <p className="font-medium">{route.duration} min</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Dénivelé</span>
                      <p className="font-medium">{route.elevation} m</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Difficulté</span>
                      <p className="font-medium capitalize">{route.difficulty}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {route.terrain_type}
                    </span>
                    <Link
                      to={`/routes/${route.id}`}
                      className="text-green-600 hover:text-green-700 font-medium text-sm"
                    >
                      Voir les détails →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
