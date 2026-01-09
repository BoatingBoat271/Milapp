import { useState, useEffect } from 'react'
import { MapPin, Users, CheckCircle, Clock, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function SearchZones({ petId, userId, isOwner }) {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    center_latitude: '',
    center_longitude: '',
    radius_km: 1
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (petId) {
      loadZones()
    }
  }, [petId])

  const loadZones = async () => {
    try {
      const { data, error } = await supabase
        .from('search_zones')
        .select(`
          *,
          assigned_volunteer:user_profiles!assigned_to (
            full_name
          ),
          creator:user_profiles!created_by (
            full_name
          )
        `)
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setZones(data || [])
    } catch (error) {
      console.error('Error cargando zonas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) {
      alert('Debes iniciar sesión para crear zonas')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('search_zones')
        .insert({
          pet_id: petId,
          created_by: userId,
          name: formData.name,
          description: formData.description,
          center_latitude: parseFloat(formData.center_latitude),
          center_longitude: parseFloat(formData.center_longitude),
          radius_km: parseFloat(formData.radius_km),
          status: 'pending'
        })

      if (error) throw error

      setShowModal(false)
      setFormData({
        name: '',
        description: '',
        center_latitude: '',
        center_longitude: '',
        radius_km: 1
      })
      loadZones()
      alert('Zona creada exitosamente')
    } catch (error) {
      console.error('Error creando zona:', error)
      alert('Error al crear zona. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || colors.pending
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled: 'Cancelada'
    }
    return labels[status] || status
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
          <MapPin className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            Zonas de Búsqueda
          </h3>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Crear Zona
          </button>
        )}
      </div>

      {zones.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MapPin className="mx-auto text-gray-400 mb-2" size={32} />
          <p>No hay zonas asignadas aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <div key={zone.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{zone.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(zone.status)}`}>
                    {getStatusLabel(zone.status)}
                  </span>
                </div>
              </div>

              {zone.description && (
                <p className="text-sm text-gray-600 mb-2">{zone.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                <div>
                  <span className="font-medium">Ubicación:</span>{' '}
                  {zone.center_latitude.toFixed(4)}, {zone.center_longitude.toFixed(4)}
                </div>
                <div>
                  <span className="font-medium">Radio:</span> {zone.radius_km} km
                </div>
              </div>

              {zone.assigned_volunteer ? (
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Users size={14} />
                  <span>
                    Asignado a: <strong>{zone.assigned_volunteer.full_name || 'Voluntario'}</strong>
                  </span>
                </div>
              ) : (
                <div className="text-sm text-yellow-600 mb-2">
                  ⚠️ Sin asignar
                </div>
              )}

              {zone.notes && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Notas:</p>
                  <p className="text-sm text-gray-700">{zone.notes}</p>
                </div>
              )}

              {zone.completed_at && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center space-x-2 text-sm text-green-600">
                  <CheckCircle size={14} />
                  <span>
                    Completada el {format(new Date(zone.completed_at), "dd MMM yyyy HH:mm", { locale: es })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear zona */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Crear Zona de Búsqueda</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Zona *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                    placeholder="Ej: Parque Central, Zona Norte"
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
                    placeholder="Detalles sobre esta zona..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitud *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.center_latitude}
                      onChange={(e) => setFormData({ ...formData, center_latitude: e.target.value })}
                      className="input-field"
                      required
                      placeholder="-36.1234"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitud *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.center_longitude}
                      onChange={(e) => setFormData({ ...formData, center_longitude: e.target.value })}
                      className="input-field"
                      required
                      placeholder="-72.5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Radio (km) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.radius_km}
                    onChange={(e) => setFormData({ ...formData, radius_km: e.target.value })}
                    className="input-field"
                    required
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
                    {submitting ? 'Creando...' : 'Crear Zona'}
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
