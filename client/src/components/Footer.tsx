import { MapPin, Github, Mail } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="h-8 w-8 text-primary-400" />
              <span className="text-xl font-bold">Trail Route Generator</span>
            </div>
            <p className="text-gray-300 mb-4">
              Découvrez et créez des itinéraires de randonnée personnalisés 
              avec notre application moderne et intuitive.
            </p>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  Accueil
                </a>
              </li>
              <li>
                <a href="/trails" className="text-gray-300 hover:text-white transition-colors">
                  Sentiers
                </a>
              </li>
              <li>
                <a href="/generator" className="text-gray-300 hover:text-white transition-colors">
                  Générateur
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-2">
              <a
                href="mailto:contact@trailroute.com"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span>contact@trailroute.com</span>
              </a>
              <a
                href="https://github.com/trail-route-generator"
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Trail Route Generator. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}
