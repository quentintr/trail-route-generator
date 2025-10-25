import { User, Mail, Calendar, MapPin, Star } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export const Profile = () => {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à votre profil.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mon profil
          </h1>
          <p className="text-gray-600">
            Gérez vos informations personnelles et vos préférences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-12 w-12 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {user.name}
                </h2>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <button className="btn btn-secondary text-sm">
                  Modifier le profil
                </button>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Informations personnelles
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-600">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Membre depuis</p>
                      <p className="text-gray-600">Janvier 2024</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Statistiques
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600 mb-1">
                      12
                    </div>
                    <p className="text-sm text-gray-600">Itinéraires créés</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success-600 mb-1">
                      45
                    </div>
                    <p className="text-sm text-gray-600">Kilomètres parcourus</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-warning-600 mb-1">
                      8
                    </div>
                    <p className="text-sm text-gray-600">Avis laissés</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Activité récente
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary-600 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Nouvel itinéraire créé
                      </p>
                      <p className="text-xs text-gray-600">
                        Sentier des Crêtes - Il y a 2 jours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Star className="h-5 w-5 text-warning-600 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        Avis ajouté
                      </p>
                      <p className="text-xs text-gray-600">
                        Tour du Mont Blanc - Il y a 5 jours
                      </p>
                    </div>
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
