import { useState, useEffect } from 'react'
import { Megaphone, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function OfficialUpdates({ petId, userId, isOwner }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    update_type: 'general',
    is_important: false
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (petId) {
      loadUpdates()
    }
  }, [petId])

  const loadUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('official_updates')
        .select(`
          *,
          author:user_profiles!posted_by (
            full_name
          )
        `)
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUpdates(data || [])
    } catch (error) {
      console.error('Error cargando actualizaciones oficiales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId || !isOwner) {
      alert('Solo el dueño puede publicar actualizaciones oficiales')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('official_updates')
        .insert({
          pet_id: petId,
          posted_by: userId,
          title: formData.title,
          content: formData.content,
          update_type: formData.update_type,
          is_important: formData.is_important
        })

      if (error) throw error

      setShowModal(false)
      setFormData({
        title: '',
        content: '',
        update_type: 'general',
        is_important: false
      })
      loadUpdates()
      alert('Actualización publicada')
    } catch (error) {
      console.error('Error publicando actualización:', error)
      alert('Error al publicar. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getUpdateTypeIcon = (type) => {
    switch (type) {
      case 'sighting':
        return <CheckCircle size={18} className="text-green-600" />
      case 'clue':
        return <AlertCircle size={18} className="text-yellow-600" />
      case 'important':
        return <AlertCircle size={18} className="text-red-600" />
      default:
        return <Megaphone size={18} className="text-blue-600" />
    }
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
          <Megaphone className="text-primary-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            Actualizaciones Oficiales
          </h3>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Publicar Actualización
          </button>
        )}
      </div>

      {updates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Megaphone className="mx-auto text-gray-400 mb-2" size={32} />
          <p>No hay actualizaciones oficiales aún</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className={`border rounded-lg p-4 ${
                update.is_important
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1">
                  {getUpdateTypeIcon(update.update_type)}
                  <h4 className="font-semibold text-gray-900">{update.title}</h4>
                  {update.is_important && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                      Importante
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(update.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                </div>
              </div>

              <p className="text-gray-700 mb-2 whitespace-pre-wrap">{update.content}</p>

              {update.author && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <span>Por: {update.author.full_name || 'Dueño'}</span>
                  <span>•</span>
                  <span>Actualización oficial</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para publicar actualización */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Publicar Actualización Oficial</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Ej: Nuevo avistamiento confirmado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Actualización
                  </label>
                  <select
                    value={formData.update_type}
                    onChange={(e) => setFormData({ ...formData, update_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="general">General</option>
                    <option value="sighting">Avistamiento</option>
                    <option value="clue">Nueva Pista</option>
                    <option value="important">Importante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contenido *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input-field"
                    rows="6"
                    required
                    placeholder="Escribe la actualización aquí..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_important}
                      onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Marcar como importante
                    </span>
                  </label>
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
                    {submitting ? 'Publicando...' : 'Publicar'}
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
