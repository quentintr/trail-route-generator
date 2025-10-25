import { useState } from 'react'
import { Search, Filter, MapPin, Star, Clock } from 'lucide-react'

export const Trails = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('all')

  // Données d'exemple - à remplacer par des appels API
  const trails = [
    {
      id: 1,
      name: 'Sentier des Crêtes',
      location: 'Vercors, Isère',
      difficulty: 'Moyen',
      duration: '4h30',
      distance: '12.5 km',
      elevation: '850m',
      rating: 4.5,
      image: '/api/placeholder/400/300',
      description: 'Magnifique sentier avec vue panoramique sur les Alpes.'
    },
    {
      id: 2,
      name: 'Tour du Mont Blanc',
      location: 'Haute-Savoie',
      difficulty: 'Difficile',
      duration: '3 jours',
      distance: '170 km',
      elevation: '10000m',
      rating: 4.8,
      image: '/api/placeholder/400/300',
      description: 'Le plus célèbre trek des Alpes françaises.'
    },
    {
      id: 3,
      name: 'GR20 Corse',
      location: 'Corse',
      difficulty: 'Très difficile',
      duration: '15 jours',
      distance: '180 km',
      elevation: '12000m',
      rating: 4.9,
      image: '/api/placeholder/400/300',
      description: 'Le sentier de grande randonnée le plus difficile d\'Europe.'
    }
  ]

  const difficulties = [
    { value: 'all', label: 'Tous les niveaux' },
    { value: 'easy', label: 'Facile' },
    { value: 'medium', label: 'Moyen' },
    { value: 'hard', label: 'Difficile' },
    { value: 'expert', label: 'Expert' }
  ]

  const filteredTrails = trails.filter(trail => {
    const matchesSearch = trail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trail.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDifficulty = selectedDifficulty === 'all' || 
                             trail.difficulty.toLowerCase().includes(selectedDifficulty)
    return matchesSearch && matchesDifficulty
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sentiers de randonnée
          </h1>
          <p className="text-gray-600">
            Découvrez les plus beaux sentiers de France
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher un sentier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="input pl-10 appearance-none"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-center text-gray-600">
              {filteredTrails.length} sentier{filteredTrails.length > 1 ? 's' : ''} trouvé{filteredTrails.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Trails Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrails.map(trail => (
            <div key={trail.id} className="card hover:shadow-lg transition-shadow">
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <img
                  src={trail.image}
                  alt={trail.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">
                    {trail.name}
                  </h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{trail.location}</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm">
                  {trail.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{trail.duration}</span>
                    </div>
                    <div>
                      <span>{trail.distance}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium">{trail.rating}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trail.difficulty === 'Facile' ? 'bg-success-100 text-success-800' :
                    trail.difficulty === 'Moyen' ? 'bg-warning-100 text-warning-800' :
                    trail.difficulty === 'Difficile' ? 'bg-error-100 text-error-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {trail.difficulty}
                  </span>
                  
                  <button className="btn btn-primary text-sm">
                    Voir les détails
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTrails.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun sentier trouvé
            </h3>
            <p className="text-gray-600">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
