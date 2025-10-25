import { Link, useLocation } from 'react-router-dom'
import { MapPin, User, LogIn, UserPlus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export const Header = () => {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <MapPin className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">
              Trail Route Generator
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Accueil
            </Link>
            <Link
              to="/trails"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/trails') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Sentiers
            </Link>
            <Link
              to="/generator"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/generator') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              Générateur
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <span>{user.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Connexion</span>
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>S'inscrire</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
