import { useState, useEffect } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CloseCaseButton({ petId, userId, onCaseClosed }) {
  const [showModal, setShowModal] = useState(false)
  const [closing, setClosing] = useState(false)
  const [formData, setFormData] = useState({
    closure_type: 'found', // 'found', 'returned', 'other'
    closure_reason: '',
    thank_you_message: '',
    volunteers_thanked: [] // Array de IDs de voluntarios
  })
  const [volunteers, setVolunteers] = useState([])
  const [loadingVolunteers, setLoadingVolunteers] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (showModal && petId) {
      loadVolunteers()
    }
  }, [showModal, petId])

  const loadVolunteers = async () => {
    setLoadingVolunteers(true)
    try {
      const { data, error } = await supabase
        .from('volunteer_assignments')
        .select(`
          volunteer_id,
          volunteer:user_profiles!volunteer_id (
            id,
            full_name
          )
        `)
        .eq('pet_id', petId)
        .eq('status', 'active')

      if (error) throw error
      
      const volunteersList = data
        .map(a => a.volunteer)
        .filter(v => v !== null)
      
      setVolunteers(volunteersList)
    } catch (error) {
      console.error('Error cargando voluntarios:', error)
    } finally {
      setLoadingVolunteers(false)
    }
  }

  const handleClose = async (e) => {
    e.preventDefault()
    if (!userId) {
      alert('Debes iniciar sesión para cerrar el caso')
      return
    }

    setClosing(true)
    setError(null)

    try {
      // Crear registro de cierre
      const { data: closure, error: closureError } = await supabase
        .from('case_closures')
        .insert({
          pet_id: petId,
          closed_by: userId,
          closure_type: formData.closure_type,
          closure_reason: formData.closure_reason || null,
          thank_you_message: formData.thank_you_message || null,
          volunteers_thanked: formData.volunteers_thanked.length > 0 ? formData.volunteers_thanked : null
        })
        .select()
        .single()

      if (closureError) {
        if (closureError.code === '23505') { // Unique constraint
          setError('Este caso ya ha sido cerrado')
        } else {
          throw closureError
        }
        return
      }

      // Actualizar estado de la mascota
      const newStatus = formData.closure_type === 'found' ? 'found' : 'returned'
      const { error: updateError } = await supabase
        .from('pets')
        .update({ status: newStatus })
        .eq('id', petId)

      if (updateError) throw updateError

      setShowModal(false)
      alert('Caso cerrado. Se requiere confirmación de la comunidad (2+ personas) para verificar el cierre.')
      
      if (onCaseClosed) {
        onCaseClosed()
      }
    } catch (error) {
      console.error('Error cerrando caso:', error)
      setError(error.message || 'Error al cerrar el caso')
    } finally {
      setClosing(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
      >
        <CheckCircle size={20} />
        <span>Cerrar Caso (Mascota Encontrada)</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Cerrar Caso</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleClose} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Cierre
                  </label>
                  <select
                    value={formData.closure_type}
                    onChange={(e) => setFormData({ ...formData, closure_type: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="found">Mascota Encontrada</option>
                    <option value="returned">Mascota Devuelta a su Dueño</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={formData.closure_reason}
                    onChange={(e) => setFormData({ ...formData, closure_reason: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Detalles adicionales sobre el cierre del caso..."
                  />
                </div>

                {loadingVolunteers ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Cargando voluntarios...</p>
                  </div>
                ) : volunteers.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agradecer a Voluntarios
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
                      {volunteers.map((volunteer) => (
                        <label key={volunteer.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.volunteers_thanked.includes(volunteer.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  volunteers_thanked: [...formData.volunteers_thanked, volunteer.id]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  volunteers_thanked: formData.volunteers_thanked.filter(id => id !== volunteer.id)
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">
                            {volunteer.full_name || 'Voluntario'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensaje de Agradecimiento (opcional)
                  </label>
                  <textarea
                    value={formData.thank_you_message}
                    onChange={(e) => setFormData({ ...formData, thank_you_message: e.target.value })}
                    className="input-field"
                    rows="3"
                    placeholder="Gracias a todos los voluntarios que ayudaron en la búsqueda..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Importante:</p>
                  <p>El cierre del caso requiere la confirmación de al menos 2 personas de la comunidad para ser verificado.</p>
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
                    disabled={closing}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {closing ? 'Cerrando...' : 'Cerrar Caso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
