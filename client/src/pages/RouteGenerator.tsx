import { useState } from 'react'
import { MapPin, Route, Settings, Play, Loader2 } from 'lucide-react'

export const RouteGenerator = () => {
  const [startPoint, setStartPoint] = useState('48.8566, 2.3522')
  const [endPoint, setEndPoint] = useState('')
  const [distance, setDistance] = useState('10')
  const [difficulty, setDifficulty] = useState('medium')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedRoutes, setGeneratedRoutes] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateRoute = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Parse coordinates from startPoint
      const coords = startPoint.split(',').map(coord => parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        throw new Error('Format de coordonnées invalide. Utilisez: latitude, longitude')
      }

      const response = await fetch('http://localhost:5000/api/v1/routes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: coords[0], // latitude
          lon: coords[1], // longitude
          distance: parseFloat(distance),
          difficulty: difficulty,
          terrain_type: 'mixed',
          pace: 'moderate',
          max_variants: 3
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la génération')
      }

      const data = await response.json()
      setGeneratedRoutes(data)
      console.log('Routes générées:', data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Erreur de génération:', err)
    } finally {
      setIsLoading(false)
    }
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
                  disabled={isLoading}
                  className="btn btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                  <span>{isLoading ? 'Génération...' : 'Générer l\'itinéraire'}</span>
                </button>

                {/* Message d'erreur */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
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
              <div className="map-container bg-gray-100 flex items-center justify-center" style={{ height: '400px' }}>
                {generatedRoutes ? (
                  <div className="text-center text-gray-500">
                    <Route className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium text-green-600">Itinéraires générés !</p>
                    <p className="text-sm">{generatedRoutes.data.variants.length} variantes disponibles</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">Carte interactive</p>
                    <p className="text-sm">La carte s'affichera ici après génération</p>
                  </div>
                )}
              </div>

              {/* Route details */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">
                  Détails des itinéraires
                </h3>
                {generatedRoutes ? (
                  <div className="space-y-4">
                    {generatedRoutes.data.variants.map((variant: any, index: number) => (
                      <div key={variant.id} className="p-3 bg-white rounded-lg border">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">Variante {index + 1}</h4>
                          <span className="text-sm text-gray-500">Qualité: {(variant.quality * 100).toFixed(0)}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Distance:</span>
                            <span className="ml-2 font-medium">{variant.distance.toFixed(1)} km</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Durée estimée:</span>
                            <span className="ml-2 font-medium">{variant.estimated_duration} min</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Difficulté:</span>
                            <span className="ml-2 font-medium capitalize">{variant.difficulty}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Terrain:</span>
                            <span className="ml-2 font-medium capitalize">{variant.terrain_type}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-gray-600 text-sm">Points de passage:</span>
                          <span className="ml-2 text-sm font-medium">{variant.path.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Les détails de vos itinéraires personnalisés apparaîtront ici.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
