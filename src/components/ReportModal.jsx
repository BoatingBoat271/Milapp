import { useState, useEffect } from 'react'
import { X, MapPin, Camera, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

export default function ReportModal({ userLocation, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'sighting', // 'sighting', 'lost', 'found'
    petName: '',
    species: '',
    breed: '',
    color: '',
    size: '',
    description: '',
    notes: '',
    status: 'sighted',
    latitude: userLocation?.[0] || '',
    longitude: userLocation?.[1] || '',
    medicalHistory: '',
    condition: 'good'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [existingPets, setExistingPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)

  useEffect(() => {
    if (userLocation) {
      setFormData(prev => ({
        ...prev,
        latitude: userLocation[0],
        longitude: userLocation[1]
      }))
    }
    loadExistingPets()
  }, [userLocation])

  const loadExistingPets = async () => {
    try {
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed, status')
        .order('created_at', { ascending: false })
        .limit(20)
      
      setExistingPets(data || [])
    } catch (error) {
      console.error('Error cargando mascotas:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      let petId = selectedPetId

      // Si no hay mascota seleccionada, crear una nueva
      if (!petId) {
        const { data: newPet, error: petError } = await supabase
          .from('pets')
          .insert({
            name: formData.petName || 'Mascota sin nombre',
            species: formData.species,
            breed: formData.breed,
            color: formData.color,
            size: formData.size,
            description: formData.description,
            status: formData.status,
            medical_history: formData.medicalHistory,
            condition: formData.condition
          })
          .select()
          .single()

        if (petError) throw petError
        petId = newPet.id
      }

      // Crear el avistamiento
      const { error: sightingError } = await supabase
        .from('sightings')
        .insert({
          pet_id: petId,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          notes: formData.notes,
          reported_at: new Date().toISOString()
        })

      if (sightingError) throw sightingError

      // Actualizar estado de la mascota si es necesario
      if (formData.status !== 'sighted') {
        await supabase
          .from('pets')
          .update({ status: formData.status })
          .eq('id', petId)
      }

      onSuccess()
    } catch (error) {
      console.error('Error reportando:', error)
      setError(error.message || 'Error al guardar el reporte')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Reportar Avistamiento</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Tipo de reporte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Reporte
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['sighting', 'lost', 'found'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      type,
                      status: type === 'sighting' ? 'sighted' : type
                    }))
                    setSelectedPetId(null)
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.type === type
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type === 'sighting' ? 'Avistamiento' : type === 'lost' ? 'Perdida' : 'Encontrada'}
                </button>
              ))}
            </div>
          </div>

          {/* Seleccionar mascota existente o nueva */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mascota
            </label>
            <select
              value={selectedPetId || ''}
              onChange={(e) => {
                const petId = e.target.value
                setSelectedPetId(petId || null)
                if (petId) {
                  const pet = existingPets.find(p => p.id === petId)
                  if (pet) {
                    setFormData(prev => ({
                      ...prev,
                      petName: pet.name,
                      species: pet.species || '',
                      breed: pet.breed || ''
                    }))
                  }
                }
              }}
              className="input-field"
            >
              <option value="">Nueva mascota</option>
              {existingPets.map(pet => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} - {pet.species} {pet.breed ? `(${pet.breed})` : ''} - {pet.status}
                </option>
              ))}
            </select>
          </div>

          {/* Información de la mascota (solo si es nueva) */}
          {!selectedPetId && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    name="petName"
                    value={formData.petName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especie *
                  </label>
                  <select
                    name="species"
                    value={formData.species}
                    onChange={handleChange}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="perro">Perro</option>
                    <option value="gato">Gato</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raza
                  </label>
                  <input
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño
                </label>
                <select
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Seleccionar...</option>
                  <option value="pequeño">Pequeño</option>
                  <option value="mediano">Mediano</option>
                  <option value="grande">Grande</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="input-field"
                  rows="3"
                  placeholder="Características distintivas, collar, etc."
                />
              </div>
            </>
          )}

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Ubicación
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="any"
                  className="input-field"
                  placeholder="Latitud"
                  required
                />
              </div>
              <div>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="any"
                  className="input-field"
                  placeholder="Longitud"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Se usa tu ubicación actual automáticamente
            </p>
          </div>

          {/* Notas del avistamiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas del Avistamiento
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input-field"
              rows="3"
              placeholder="Condición observada, comportamiento, hora aproximada, etc."
            />
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save size={20} />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Reporte'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
