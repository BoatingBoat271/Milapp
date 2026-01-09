import { useState, useEffect } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function VolunteerToggle({ userId }) {
  const [isVolunteer, setIsVolunteer] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (userId) {
      loadVolunteerStatus()
    }
  }, [userId])

  const loadVolunteerStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_volunteer, volunteer_available')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
      
      if (data) {
        setIsVolunteer(data.is_volunteer || false)
        setIsAvailable(data.volunteer_available || false)
      }
    } catch (error) {
      console.error('Error cargando estado de voluntario:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVolunteer = async () => {
    if (!userId) return
    
    setUpdating(true)
    try {
      const newValue = !isVolunteer
      
      // Si se desactiva como voluntario, también desactivar disponibilidad
      const updateData = {
        is_volunteer: newValue,
        volunteer_available: newValue ? isAvailable : false
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          ...updateData
        }, {
          onConflict: 'id'
        })

      if (error) throw error
      
      setIsVolunteer(newValue)
      if (!newValue) setIsAvailable(false)
    } catch (error) {
      console.error('Error actualizando estado de voluntario:', error)
      alert('Error al actualizar. Asegúrate de tener un perfil creado.')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleAvailability = async () => {
    if (!userId || !isVolunteer) return
    
    setUpdating(true)
    try {
      const newValue = !isAvailable
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ volunteer_available: newValue })
        .eq('id', userId)

      if (error) throw error
      
      setIsAvailable(newValue)
    } catch (error) {
      console.error('Error actualizando disponibilidad:', error)
      alert('Error al actualizar disponibilidad')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-12 w-full"></div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isVolunteer ? (
            <UserCheck className="text-green-600" size={20} />
          ) : (
            <UserX className="text-gray-400" size={20} />
          )}
          <span className="font-semibold text-gray-900">
            {isVolunteer ? 'Soy Voluntario' : 'No soy Voluntario'}
          </span>
        </div>
        <button
          onClick={handleToggleVolunteer}
          disabled={updating}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isVolunteer
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } disabled:opacity-50`}
        >
          {updating ? 'Actualizando...' : isVolunteer ? 'Desactivar' : 'Activar como Voluntario'}
        </button>
      </div>

      {isVolunteer && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-700">
              {isAvailable ? 'Disponible para ayudar' : 'No disponible'}
            </span>
          </div>
          <button
            onClick={handleToggleAvailability}
            disabled={updating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isAvailable
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            } disabled:opacity-50`}
          >
            {updating ? '...' : isAvailable ? 'Marcar No Disponible' : 'Marcar Disponible'}
          </button>
        </div>
      )}
    </div>
  )
}
