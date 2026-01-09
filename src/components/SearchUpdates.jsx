import { useState, useEffect } from 'react'
import { MessageSquare, MapPin, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function SearchUpdates({ petId, userId }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    update_type: 'sighted',
    title: '',
    description: '',
    location_description: ''
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (petId) {
      loadUpdates()
    }
  }, [petId])

  const loadUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('search_updates')
        .select(`
          *,
          volunteer:user_profiles!volunteer_id (
            full_name
          )
        `)
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpdates(data || [])
    } catch (error) {
      console.error('Error cargando actualizaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      alert('Debes iniciar sesión para compartir actualizaciones')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('search_updates')
        .insert({
          pet_id: petId,
          volunteer_id: userId,
          update_type: formData.update_type,
          title: formData.title,
          description: formData.description,
          location_description: formData.location_description || null
        })

      if (insertError) throw insertError

      setShowModal(false)
      setFormData({
        update_type: 'sighted',
        title: '',
        description: '',
        location_description: ''
      })
      loadUpdates()
      alert('Actualización compartida')
    } catch (error) {
      console.error('Error compartiendo actualización:', error)
      setError(error.message || 'Error al compartir actualización')
    } finally {
      setSubmitting(false)
    }
  }

  const getUpdateTypeLabel = (type) => {
    const labels = {
      sighted: 'Avistado',
      no_signs: 'Sin señales',
      zone_covered: 'Zona cubierta',
      other: 'Otro'
    }
    return labels[type] || type
  }

  const getUpdateTypeColor = (type) => {
    const colors = {
      sighted: 'bg-green-100 text-green-800',
      no_signs: 'bg-yellow-100 text-yellow-800',
      zone_covered: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[type] || colors.other
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-32 w-full"></div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            Actualizaciones de Búsqueda
          </h3>
        </div>
        {userId && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Compartir Actualización
          </button>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="mx-auto text-gray-400 mb-2" size={32} />
          <p>No hay actualizaciones aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div key={update.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUpdateTypeColor(update.update_type)}`}>
                      {getUpdateTypeLabel(update.update_type)}
                    </span>
                    {update.is_confirmed && (
                      <CheckCircle className="text-green-600" size={16} />
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900">{update.title}</h4>
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(update.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                </div>
              </div>

              {update.description && (
                <p className="text-gray-700 mb-2">{update.description}</p>
              )}

              {update.location_description && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <MapPin size={14} />
                  <span>{update.location_description}</span>
                </div>
              )}

              {update.volunteer && (
                <p className="text-xs text-gray-500">
                  Por: {update.volunteer.full_name || 'Voluntario'}
                </p>
              )}

              {update.confirmation_count > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Confirmado por {update.confirmation_count} persona{update.confirmation_count !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para compartir actualización */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Compartir Actualización</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Actualización
                  </label>
                  <select
                    value={formData.update_type}
                    onChange={(e) => setFormData({ ...formData, update_type: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="sighted">Avistado</option>
                    <option value="no_signs">Sin señales</option>
                    <option value="zone_covered">Zona cubierta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    required
                    placeholder="Ej: Visto en el parque central"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.location_description}
                    onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Parque Central, cerca del lago"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {submitting ? 'Compartiendo...' : 'Compartir'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
