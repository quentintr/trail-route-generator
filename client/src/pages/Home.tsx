import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutesStore } from '../store/routes-store'
import { RouteGenerationRequest } from '../types/route'

export const Home = () => {
  const [searchParams, setSearchParams] = useState<RouteGenerationRequest>({
    start_lat: 0,
    start_lon: 0,
    distance: 5,
    difficulty: 'medium',
    terrain_type: 'mixed',
  })
  const [isSearching, setIsSearching] = useState(false)
  const { generateRoutes, isLoading, error } = useRoutesStore()
  const navigate = useNavigate()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchParams.start_lat || !searchParams.start_lon) {
      alert('Veuillez entrer des coordonnées valides')
      return
    }

    setIsSearching(true)
    try {
      await generateRoutes(searchParams)
      navigate('/search-results')
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSearchParams(prev => ({
            ...prev,
            start_lat: position.coords.latitude,
            start_lon: position.coords.longitude,
          }))
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Impossible d\'obtenir votre position. Veuillez entrer les coordonnées manuellement.')
        }
      )
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.')
    }
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Découvrez vos
            <span className="text-green-600"> prochains itinéraires</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Générez des itinéraires de randonnée personnalisés près de chez vous. 
            Notre algorithme utilise des données OpenStreetMap pour vous proposer 
            les meilleurs parcours selon vos préférences.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Rechercher un itinéraire
            </h2>

            <div className="space-y-4">
              {/* Location Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position de départ
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={searchParams.start_lat || ''}
                      onChange={(e) => setSearchParams(prev => ({
                        ...prev,
                        start_lat: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={searchParams.start_lon || ''}
                      onChange={(e) => setSearchParams(prev => ({
                        ...prev,
                        start_lon: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLocationClick}
                  className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  📍 Utiliser ma position actuelle
                </button>
              </div>

              {/* Distance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance (km)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={searchParams.distance || 5}
                  onChange={(e) => setSearchParams(prev => ({
                    ...prev,
                    distance: parseInt(e.target.value) || 5
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulté
                </label>
                <select
                  value={searchParams.difficulty || 'medium'}
                  onChange={(e) => setSearchParams(prev => ({
                    ...prev,
                    difficulty: e.target.value as 'easy' | 'medium' | 'hard' | 'expert'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Terrain Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de terrain
                </label>
                <select
                  value={searchParams.terrain_type || 'mixed'}
                  onChange={(e) => setSearchParams(prev => ({
                    ...prev,
                    terrain_type: e.target.value as 'paved' | 'unpaved' | 'mixed'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="mixed">Mixte</option>
                  <option value="paved">Goudronné</option>
                  <option value="unpaved">Non goudronné</option>
                </select>
              </div>

              {/* Search Button */}
              <button
                type="submit"
                disabled={isLoading || isSearching}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isLoading || isSearching ? 'Recherche en cours...' : 'Générer des itinéraires'}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Données OpenStreetMap
            </h3>
            <p className="text-gray-600">
              Utilise des données cartographiques libres et à jour pour générer des itinéraires précis.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Algorithme intelligent
            </h3>
            <p className="text-gray-600">
              Notre algorithme optimise les itinéraires selon vos préférences et les conditions du terrain.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Personnalisation
            </h3>
            <p className="text-gray-600">
              Adapte les itinéraires à votre niveau de difficulté et vos préférences de terrain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}