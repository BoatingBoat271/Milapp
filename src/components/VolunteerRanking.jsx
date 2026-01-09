import { useState, useEffect } from 'react'
import { Trophy, Star, Award, Users, CheckCircle, Camera, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function VolunteerRanking() {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('reputation') // 'reputation', 'activity', 'clues'

  useEffect(() => {
    loadVolunteers()
  }, [sortBy])

  const loadVolunteers = async () => {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('is_volunteer', true)
        .not('reputation_points', 'is', null)

      // Ordenar según criterio
      if (sortBy === 'reputation') {
        query = query.order('reputation_points', { ascending: false })
      } else if (sortBy === 'activity') {
        query = query.order('last_activity_at', { ascending: false, nullsFirst: false })
      } else if (sortBy === 'clues') {
        query = query.order('clues_submitted', { ascending: false })
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      setVolunteers(data || [])
    } catch (error) {
      console.error('Error cargando ranking:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'platinum':
        return <Trophy className="text-purple-600" size={20} />
      case 'gold':
        return <Award className="text-yellow-500" size={20} />
      case 'silver':
        return <Award className="text-gray-400" size={20} />
      case 'bronze':
        return <Award className="text-orange-600" size={20} />
      default:
        return null
    }
  }

  const getBadgeLabel = (badge) => {
    const labels = {
      platinum: 'Platino',
      gold: 'Oro',
      silver: 'Plata',
      bronze: 'Bronce'
    }
    return labels[badge] || ''
  }

  const getBadgeColor = (badge) => {
    const colors = {
      platinum: 'bg-purple-100 text-purple-800 border-purple-300',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      silver: 'bg-gray-100 text-gray-800 border-gray-300',
      bronze: 'bg-orange-100 text-orange-800 border-orange-300'
    }
    return colors[badge] || ''
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-64 w-full"></div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Trophy className="text-primary-600" size={24} />
          <h2 className="text-2xl font-bold text-gray-900">Ranking de Voluntarios</h2>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
        >
          <option value="reputation">Por Reputación</option>
          <option value="activity">Por Actividad</option>
          <option value="clues">Por Pistas Enviadas</option>
        </select>
      </div>

      {volunteers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="mx-auto text-gray-400 mb-2" size={48} />
          <p>No hay voluntarios con reputación aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {volunteers.map((volunteer, index) => (
            <div
              key={volunteer.id}
              className={`border rounded-lg p-4 ${
                index < 3
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Posición */}
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                    index === 0
                      ? 'bg-yellow-400 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-300 text-gray-800'
                      : index === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Información del voluntario */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {volunteer.full_name || 'Voluntario Anónimo'}
                      </h3>
                      {volunteer.reputation_badge && (
                        <div className={`flex items-center space-x-1 px-2 py-1 rounded border ${getBadgeColor(volunteer.reputation_badge)}`}>
                          {getBadgeIcon(volunteer.reputation_badge)}
                          <span className="text-xs font-medium">
                            {getBadgeLabel(volunteer.reputation_badge)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Star className="text-yellow-500" size={16} />
                        <div>
                          <p className="font-semibold text-gray-900">{volunteer.reputation_points || 0}</p>
                          <p className="text-xs text-gray-500">Puntos</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Camera className="text-purple-500" size={16} />
                        <div>
                          <p className="font-semibold text-gray-900">{volunteer.clues_submitted || 0}</p>
                          <p className="text-xs text-gray-500">Pistas</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="text-green-500" size={16} />
                        <div>
                          <p className="font-semibold text-gray-900">{volunteer.clues_verified || 0}</p>
                          <p className="text-xs text-gray-500">Verificadas</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="text-blue-500" size={16} />
                        <div>
                          <p className="font-semibold text-gray-900">{volunteer.cases_helped || 0}</p>
                          <p className="text-xs text-gray-500">Casos</p>
                        </div>
                      </div>
                    </div>

                    {volunteer.last_activity_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Última actividad: {format(new Date(volunteer.last_activity_at), "dd MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Cómo ganar puntos de reputación:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Enviar pista con evidencia: +5 puntos</li>
          <li>• Pista verificada: +10 puntos</li>
          <li>• Confirmar avistamiento: +3 puntos</li>
          <li>• Ayudar en caso: +15 puntos</li>
        </ul>
        <div className="mt-3 text-sm text-gray-600">
          <p><strong>Badges:</strong> Bronce (50+), Plata (100+), Oro (200+), Platino (500+)</p>
        </div>
      </div>
    </div>
  )
}
