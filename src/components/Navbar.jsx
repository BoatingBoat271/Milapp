import { Link, useLocation } from 'react-router-dom'
import { Map, Users, LogIn, User, Shield, UserCheck, List } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const location = useLocation()
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId')
    setUserId(currentUserId)
    if (currentUserId) {
      loadUserRole(currentUserId)
    }
  }, [])

  const loadUserRole = async (currentUserId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('id', currentUserId)
        .single()

      if (!error && data) {
        setUserRole(data.user_role)
      }
    } catch (error) {
      console.error('Error cargando rol:', error)
    }
  }

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
              to="/pets"
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                isActive('/pets') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List size={20} />
              <span className="hidden sm:inline">Mascotas</span>
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

            <Link
              to="/members"
              className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                isActive('/members') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserCheck size={20} />
              <span className="hidden sm:inline">Miembros</span>
            </Link>

            {userRole === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/admin') 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Shield size={20} />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            
            {userId ? (
              <Link
                to="/profile"
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/profile') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User size={20} />
                <span className="hidden sm:inline">Mi Perfil</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive('/login') 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <LogIn size={20} />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
