import { MapPin, Route, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

export const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Découvrez vos prochaines aventures
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Générez des itinéraires de randonnée personnalisés et explorez 
              les plus beaux sentiers de France.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/generator"
                className="btn btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
              >
                Créer un itinéraire
              </Link>
              <Link
                to="/trails"
                className="btn border-2 border-white text-white hover:bg-white hover:text-primary-600 text-lg px-8 py-3"
              >
                Explorer les sentiers
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Pourquoi choisir notre plateforme ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des fonctionnalités avancées pour une expérience de randonnée optimale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Cartes interactives
              </h3>
              <p className="text-gray-600">
                Visualisez vos itinéraires sur des cartes détaillées avec 
                tous les points d'intérêt.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-success-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Route className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Génération intelligente
              </h3>
              <p className="text-gray-600">
                Créez des itinéraires adaptés à votre niveau et vos préférences 
                en quelques clics.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-warning-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Avis communautaire
              </h3>
              <p className="text-gray-600">
                Partagez vos expériences et découvrez les meilleurs sentiers 
                recommandés par la communauté.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Communauté active
              </h3>
              <p className="text-gray-600">
                Rejoignez une communauté passionnée de randonneurs et 
                partagez vos aventures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Prêt à commencer votre aventure ?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Rejoignez des milliers de randonneurs qui utilisent déjà notre plateforme 
            pour découvrir de nouveaux horizons.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn btn-primary text-lg px-8 py-3"
            >
              Créer un compte gratuit
            </Link>
            <Link
              to="/trails"
              className="btn btn-secondary text-lg px-8 py-3"
            >
              Explorer maintenant
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
