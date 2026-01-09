import { useState, useEffect } from 'react'
import { Users, MapPin, Phone, Mail, MessageCircle, Clock, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function VolunteersList({ petId }) {
  const [volunteers, setVolunteers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (petId) {
      loadVolunteers()
    }
  }, [petId])

  const loadVolunteers = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_assignments')
        .select(`
          id,
          status,
          assigned_at,
          volunteer:user_profiles!volunteer_id (
            id,
            full_name,
            phone,
            contact_phone,
            contact_email,
            whatsapp,
            volunteer_coverage_location,
            volunteer_coverage_radius_km
          )
        `)
        .eq('pet_id', petId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })

      if (error) throw error
      setVolunteers(data || [])
    } catch (error) {
      console.error('Error cargando voluntarios:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-32 w-full"></div>
    )
  }

  if (volunteers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <Users className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="text-gray-600">Aún no hay voluntarios unidos a esta búsqueda</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Users className="text-primary-600" size={20} />
        <h3 className="text-lg font-semibold text-gray-900">
          Voluntarios ayudando ({volunteers.length})
        </h3>
      </div>

      <div className="space-y-4">
        {volunteers.map((assignment) => {
          const volunteer = assignment.volunteer
          if (!volunteer) return null

          // Determinar disponibilidad (activo ahora / fuera de horario)
          const isActiveNow = volunteer.volunteer_available === true
          const lastActive = volunteer.updated_at 
            ? new Date(volunteer.updated_at)
            : null
          const hoursSinceUpdate = lastActive 
            ? (new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60)
            : null
          const isRecentlyActive = hoursSinceUpdate !== null && hoursSinceUpdate < 2

          return (
            <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {volunteer.full_name || 'Voluntario Anónimo'}
                    </h4>
                    <div className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs ${
                      isActiveNow && isRecentlyActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isActiveNow && isRecentlyActive ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Activo ahora</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} />
                          <span>Fuera de horario</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    Se unió el {format(new Date(assignment.assigned_at), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              </div>

              {volunteer.volunteer_coverage_location && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <MapPin size={14} />
                  <span>{volunteer.volunteer_coverage_location}</span>
                  {volunteer.volunteer_coverage_radius_km && (
                    <span className="text-xs">({volunteer.volunteer_coverage_radius_km} km)</span>
                  )}
                </div>
              )}

              {volunteer.bio && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{volunteer.bio}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                {volunteer.contact_phone && (
                  <a
                    href={`tel:${volunteer.contact_phone}`}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors font-medium"
                  >
                    <Phone size={14} />
                    <span>Llamar</span>
                  </a>
                )}
                {volunteer.whatsapp && (
                  <a
                    href={`https://wa.me/${volunteer.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors font-medium"
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp</span>
                  </a>
                )}
                {volunteer.contact_email && (
                  <a
                    href={`mailto:${volunteer.contact_email}`}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors font-medium"
                  >
                    <Mail size={14} />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
