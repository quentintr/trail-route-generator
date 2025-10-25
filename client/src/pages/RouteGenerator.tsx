import { useState } from 'react'
import { MapPin, Route, Settings, Play } from 'lucide-react'

export const RouteGenerator = () => {
  const [startPoint, setStartPoint] = useState('')
  const [endPoint, setEndPoint] = useState('')
  const [distance, setDistance] = useState('10')
  const [difficulty, setDifficulty] = useState('medium')

  const handleGenerateRoute = () => {
    // Logique de génération d'itinéraire
    console.log('Génération d\'itinéraire...', {
      startPoint,
      endPoint,
      distance,
      difficulty
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Générateur d'itinéraires
          </h1>
          <p className="text-gray-600">
            Créez des itinéraires personnalisés selon vos préférences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center mb-6">
                <Settings className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Paramètres
                </h2>
              </div>

              <div className="space-y-6">
                {/* Point de départ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Point de départ
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Adresse ou lieu..."
                      value={startPoint}
                      onChange={(e) => setStartPoint(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {/* Point d'arrivée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Point d'arrivée (optionnel)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Adresse ou lieu..."
                      value={endPoint}
                      onChange={(e) => setEndPoint(e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Distance souhaitée (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="input"
                  />
                </div>

                {/* Difficulté */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Niveau de difficulté
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="input"
                  >
                    <option value="easy">Facile</option>
                    <option value="medium">Moyen</option>
                    <option value="hard">Difficile</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                {/* Bouton de génération */}
                <button
                  onClick={handleGenerateRoute}
                  className="btn btn-primary w-full flex items-center justify-center space-x-2"
                >
                  <Play className="h-5 w-5" />
                  <span>Générer l'itinéraire</span>
                </button>
              </div>
            </div>
          </div>

          {/* Map and Results */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center mb-6">
                <Route className="h-6 w-6 text-primary-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Carte et itinéraire
                </h2>
              </div>

              {/* Map placeholder */}
              <div className="map-container bg-gray-100 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg font-medium">Carte interactive</p>
                  <p className="text-sm">La carte s'affichera ici après génération</p>
                </div>
              </div>

              {/* Route details placeholder */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Détails de l'itinéraire
                </h3>
                <p className="text-sm text-gray-600">
                  Les détails de votre itinéraire personnalisé apparaîtront ici.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
