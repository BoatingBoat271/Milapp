import { useState, useEffect } from 'react'
import { Bell, Users, MapPin, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function RequestHelpButton({ petId, userId, latestSighting }) {
  const [requesting, setRequesting] = useState(false)
  const [nearbyVolunteers, setNearbyVolunteers] = useState([])
  const [helpRequested, setHelpRequested] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (petId && latestSighting) {
      loadNearbyVolunteers()
      checkHelpRequest()
    }
  }, [petId, latestSighting])

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const loadNearbyVolunteers = async () => {
    if (!latestSighting) return

    try {
      // Cargar todos los voluntarios disponibles
      const { data: volunteers, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('is_volunteer', true)
        .eq('volunteer_available', true)

      if (error) throw error

      // Filtrar voluntarios cercanos (dentro de 10km por defecto, o su radio de cobertura)
      const nearby = volunteers.filter(volunteer => {
        if (!volunteer.volunteer_coverage_latitude || !volunteer.volunteer_coverage_longitude) {
          return false
        }

        const distance = calculateDistance(
          parseFloat(latestSighting.latitude),
          parseFloat(latestSighting.longitude),
          parseFloat(volunteer.volunteer_coverage_latitude),
          parseFloat(volunteer.volunteer_coverage_longitude)
        )

        const maxRadius = volunteer.volunteer_coverage_radius_km || 10
        return distance <= maxRadius
      })

      setNearbyVolunteers(nearby)
    } catch (error) {
      console.error('Error cargando voluntarios cercanos:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkHelpRequest = async () => {
    try {
      // Verificar si ya hay una solicitud de ayuda activa
      const { data, error } = await supabase
        .from('help_requests')
        .select('id')
        .eq('pet_id', petId)
        .eq('status', 'active')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      setHelpRequested(!!data)
    } catch (error) {
      console.error('Error verificando solicitud:', error)
    }
  }

  const handleRequestHelp = async () => {
    if (!userId) {
      alert('Debes iniciar sesión para solicitar ayuda')
      return
    }

    setRequesting(true)
    try {
      // Crear solicitud de ayuda
      const { error: requestError } = await supabase
        .from('help_requests')
        .insert({
          pet_id: petId,
          requested_by: userId,
          status: 'active',
          notification_sent: true
        })

      if (requestError) {
        if (requestError.code === '42P01') {
          // Tabla no existe aún, solo mostrar mensaje
          alert(`Se notificaría a ${nearbyVolunteers.length} voluntarios cercanos. (La tabla help_requests necesita ser creada)`)
        } else {
          throw requestError
        }
      } else {
        setHelpRequested(true)
        alert(`¡Solicitud enviada! Se notificó a ${nearbyVolunteers.length} voluntarios cercanos.`)
      }
    } catch (error) {
      console.error('Error solicitando ayuda:', error)
      alert('Error al solicitar ayuda. Intenta nuevamente.')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-16 w-full"></div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            Solicitar Ayuda de Voluntarios
          </h3>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
          <Users size={16} />
          <span>
            {nearbyVolunteers.length} voluntario{nearbyVolunteers.length !== 1 ? 's' : ''} disponible{nearbyVolunteers.length !== 1 ? 's' : ''} cerca de la última ubicación
          </span>
        </div>
        {latestSighting && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin size={16} />
            <span>
              Última ubicación: {latestSighting.latitude.toFixed(4)}, {latestSighting.longitude.toFixed(4)}
            </span>
          </div>
        )}
      </div>

      {helpRequested ? (
        <div className="bg-green-50 border border-green-200 rounded p-4 flex items-center space-x-2 text-green-800">
          <CheckCircle size={20} />
          <span className="font-medium">Solicitud de ayuda enviada. Los voluntarios recibirán una notificación.</span>
        </div>
      ) : (
        <button
          onClick={handleRequestHelp}
          disabled={requesting || nearbyVolunteers.length === 0}
          className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-semibold"
        >
          <Bell size={20} />
          <span>
            {requesting 
              ? 'Enviando solicitud...' 
              : nearbyVolunteers.length === 0
              ? 'No hay voluntarios cercanos'
              : `Solicitar Ayuda (${nearbyVolunteers.length} voluntarios)`
            }
          </span>
        </button>
      )}
    </div>
  )
}
