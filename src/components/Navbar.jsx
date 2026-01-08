import { Link, useLocation } from 'react-router-dom'
import { Map, Users, Home } from 'lucide-react'

export default function Navbar() {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">🐾 Milapp</span>
          </Link>
          
          <div className="flex space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                isActive('/') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Map size={20} />
              <span className="hidden sm:inline">Mapa</span>
            </Link>
            
            <Link
              to="/community"
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                isActive('/community') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users size={20} />
              <span className="hidden sm:inline">Comunidad</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
