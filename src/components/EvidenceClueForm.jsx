import { useState } from 'react'
import { Camera, MapPin, Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import MapClickHandlerGoogle from './MapClickHandlerGoogle'

export default function EvidenceClueForm({ petId, userId, onSuccess }) {
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    location_description: '',
    address: '',
    latitude: null,
    longitude: null,
    is_anonymous: false,
    anonymous_contact: '',
    photo_urls: []
  })
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validar que sean imágenes
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length !== files.length) {
      alert('Solo se permiten archivos de imagen')
      return
    }

    // Limitar a 5 fotos
    const newFiles = [...photoFiles, ...imageFiles].slice(0, 5)
    setPhotoFiles(newFiles)

    // Crear previews
    const newPreviews = []
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target.result)
        if (newPreviews.length === newFiles.length) {
          setPhotoPreviews([...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index) => {
    const newFiles = photoFiles.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotoFiles(newFiles)
    setPhotoPreviews(newPreviews)
  }

  const handleLocationSelect = (location) => {
    setFormData({
      ...formData,
      latitude: location.lat,
      longitude: location.lng
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.latitude || !formData.longitude) {
      setError('Debes seleccionar una ubicación en el mapa')
      return
    }

    if (photoFiles.length === 0) {
      setError('Debes subir al menos una foto como evidencia')
      return
    }

    if (formData.is_anonymous && !formData.anonymous_contact) {
      setError('Si reportas como anónimo, debes proporcionar un contacto')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Subir fotos a Supabase Storage (o usar URLs si ya están en otro servicio)
      // Por ahora, asumimos que las fotos se subirán a un bucket de Supabase
      // En producción, deberías implementar la subida real
      const photoUrls = []
      
      // TODO: Implementar subida real de fotos a Supabase Storage
      // Por ahora, usamos URLs temporales o del input
      for (const file of photoFiles) {
        // Aquí iría la lógica de subida
        // const { data, error } = await supabase.storage
        //   .from('evidence-photos')
        //   .upload(`${petId}/${Date.now()}-${file.name}`, file)
        // photoUrls.push(data.path)
        
        // Por ahora, usamos un placeholder
        photoUrls.push(URL.createObjectURL(file))
      }

      // Crear la pista con evidencia
      const { error: insertError } = await supabase
        .from('evidence_clues')
        .insert({
          pet_id: petId,
          reported_by: formData.is_anonymous ? null : userId,
          is_anonymous: formData.is_anonymous,
          anonymous_contact: formData.is_anonymous ? formData.anonymous_contact : null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address || null,
          location_description: formData.location_description || null,
          description: formData.description,
          photo_urls: photoUrls,
          status: 'active'
        })

      if (insertError) throw insertError

      // Actualizar contador de pistas del usuario
      if (userId && !formData.is_anonymous) {
        await supabase.rpc('increment_user_clues', { user_id: userId })
        // O manualmente:
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('clues_submitted')
          .eq('id', userId)
          .single()

        if (userData) {
          await supabase
            .from('user_profiles')
            .update({ clues_submitted: (userData.clues_submitted || 0) + 1 })
            .eq('id', userId)
        }
      }

      setShowModal(false)
      setFormData({
        description: '',
        location_description: '',
        address: '',
        latitude: null,
        longitude: null,
        is_anonymous: false,
        anonymous_contact: '',
        photo_urls: []
      })
      setPhotoFiles([])
      setPhotoPreviews([])
      
      if (onSuccess) {
        onSuccess()
      }
      alert('¡Pista con evidencia enviada exitosamente!')
    } catch (error) {
      console.error('Error enviando pista:', error)
      setError(error.message || 'Error al enviar la pista. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
      >
        <Camera size={20} />
        <span>Enviar Pista con Evidencia</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Pista con Evidencia</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción de la Pista *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="4"
                    required
                    placeholder="Describe la pista o lo que observaste..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fotos de Evidencia * (mínimo 1, máximo 5)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="text-gray-400 mb-2" size={32} />
                      <span className="text-sm text-gray-600">
                        Haz clic para subir fotos o arrastra aquí
                      </span>
                    </label>
                  </div>

                  {photoPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {photoPreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Ubicación en el Mapa *
                  </label>
                  {formData.latitude && formData.longitude ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin size={16} />
                        <span>
                          {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, latitude: null, longitude: null })}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          Cambiar ubicación
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 border border-gray-300 rounded-lg overflow-hidden">
                      <MapClickHandlerGoogle
                        initialPosition={null}
                        onLocationSelect={handleLocationSelect}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección o Descripción del Lugar
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-field"
                    placeholder="Ej: Calle Principal 123, cerca del parque"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción Adicional del Lugar
                  </label>
                  <textarea
                    value={formData.location_description}
                    onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
                    className="input-field"
                    rows="2"
                    placeholder="Detalles sobre el lugar donde viste la pista..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_anonymous}
                      onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Reportar como anónimo
                    </span>
                  </label>
                </div>

                {formData.is_anonymous && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contacto (teléfono o email) *
                    </label>
                    <input
                      type="text"
                      value={formData.anonymous_contact}
                      onChange={(e) => setFormData({ ...formData, anonymous_contact: e.target.value })}
                      className="input-field"
                      required={formData.is_anonymous}
                      placeholder="Teléfono o email para contacto"
                    />
                  </div>
                )}

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
                    {submitting ? 'Enviando...' : 'Enviar Pista'}
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
