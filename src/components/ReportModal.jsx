import { useState, useEffect } from 'react'
import { X, MapPin, Camera, Save, Heart, AlertCircle, Cross, Upload, Link as LinkIcon, Image } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
// Google Maps se carga desde el contexto global, no necesitamos importar LoadScript aquí
import MapClickHandlerGoogle from './MapClickHandlerGoogle'
import { reverseGeocode, validateCoordinates } from '../lib/geocoding'

export default function ReportModal({ userLocation, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'sighting', // 'sighting', 'lost', 'found'
    petName: '',
    species: '',
    breed_id: '',
    breed_custom: '',
    color_id: '',
    color_custom: '',
    size: '',
    description: '',
    notes: '',
    status: 'sighted',
    latitude: userLocation?.[0] || '',
    longitude: userLocation?.[1] || '',
    medicalHistory: '',
    condition: 'good',
    wounds_description: '',
    has_wounds: false,
    image_url: '',
    image_urls: [],
    // Datos de contacto del reportante
    is_anonymous: false,
    reporter_name: '',
    reporter_contact: '',
    address: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [existingPets, setExistingPets] = useState([])
  const [selectedPetId, setSelectedPetId] = useState(null)
  
  // Limpiar selección cuando se cierra el modal
  useEffect(() => {
    // Resetear cuando el modal se monta
    setSelectedPetId(null)
    setFormData(prev => ({
      ...prev,
      petName: '',
      species: '',
      breed_id: '',
      color_id: '',
      status: 'sighted'
    }))
  }, [])
  const [breeds, setBreeds] = useState([])
  const [colors, setColors] = useState([])
  const [showBreedCustom, setShowBreedCustom] = useState(false)
  const [showColorCustom, setShowColorCustom] = useState(false)
  const [showMapSelector, setShowMapSelector] = useState(false)
  const [mapClickPosition, setMapClickPosition] = useState(null)
  const [imageInputType, setImageInputType] = useState('upload') // 'upload' o 'url'
  const [imagePreview, setImagePreview] = useState(null)

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

  useEffect(() => {
    // Cargar razas y colores cuando cambia la especie
    if (formData.species) {
      loadBreeds(formData.species)
      loadColors(formData.species)
      // Resetear raza y color cuando cambia la especie
      setFormData(prev => ({ 
        ...prev, 
        breed_id: '', 
        breed_custom: '',
        color_id: '',
        color_custom: ''
      }))
      setShowBreedCustom(false)
      setShowColorCustom(false)
    } else {
      // Si no hay especie, limpiar razas y colores
      setBreeds([{ id: 'custom', name: 'Other', name_es: 'Otra (personalizada)' }])
      setColors([{ id: 'custom', name: 'Other', name_es: 'Otro (personalizado)' }])
      setFormData(prev => ({ 
        ...prev, 
        breed_id: '', 
        breed_custom: '',
        color_id: '',
        color_custom: ''
      }))
      setShowBreedCustom(false)
      setShowColorCustom(false)
    }
  }, [formData.species])

  const loadExistingPets = async () => {
    try {
      const { data } = await supabase
        .from('pets')
        .select('id, name, species, breed_id, breed_custom, color_id, color_custom, status')
        .order('created_at', { ascending: false })
        .limit(20)
      
      setExistingPets(data || [])
    } catch (error) {
      console.error('Error cargando mascotas:', error)
    }
  }

  const loadBreeds = async (species = null) => {
    try {
      let query = supabase
        .from('pet_breeds')
        .select('id, name, name_es, species')
        .order('popular', { ascending: false })
        .order('name_es', { ascending: true })

      if (species) {
        // Los valores ya están en formato de BD (dog, cat, other)
        query = query.eq('species', species)
      }

      const { data, error: queryError } = await query
      
      if (queryError) {
        console.error('Error en query de razas:', queryError)
        throw queryError
      }
      
      if (data && data.length > 0) {
        // Agregar opción "Otra" al final
        setBreeds([...data, { id: 'custom', name: 'Other', name_es: 'Otra (personalizada)', species: null }])
      } else {
        console.warn('No se encontraron razas para la especie:', species)
        // Si no hay datos, usar lista básica con opción "Otra"
        setBreeds([
          { id: 'custom', name: 'Other', name_es: 'Otra (personalizada)', species: null }
        ])
      }
    } catch (error) {
      console.error('Error cargando razas:', error)
      console.error('Detalles del error:', error.message, error.details)
      // Si falla completamente, usar lista básica
      setBreeds([
        { id: 'custom', name: 'Other', name_es: 'Otra (personalizada)', species: null }
      ])
    }
  }

  const loadColors = async (species = null) => {
    try {
      let query = supabase
        .from('pet_colors')
        .select('id, name, name_es, hex_code, species')
        .order('popular', { ascending: false })
        .order('name_es', { ascending: true })

      if (species) {
        // Filtrar colores por especie (o colores que no tienen especie específica)
        query = query.or(`species.eq.${species},species.is.null`)
      }

      const { data, error: queryError } = await query
      
      if (queryError) {
        console.error('Error en query de colores:', queryError)
        // Si la tabla no existe, usar lista básica
        if (queryError.code === '42P01' || queryError.message?.includes('does not exist') || queryError.code === 'PGRST116') {
          console.warn('Tabla pet_colors no existe. Ejecuta el script SQL para crearla.')
          setColors([
            { id: 'custom', name: 'Other', name_es: 'Otro (personalizado)', species: null }
          ])
          return
        }
        throw queryError
      }
      
      if (data && data.length > 0) {
        // Agregar opción "Otro" al final
        setColors([...data, { id: 'custom', name: 'Other', name_es: 'Otro (personalizado)', species: null }])
      } else {
        console.warn('No se encontraron colores para la especie:', species)
        setColors([
          { id: 'custom', name: 'Other', name_es: 'Otro (personalizado)', species: null }
        ])
      }
    } catch (error) {
      console.error('Error cargando colores:', error)
      // Si falla, usar lista básica
      setColors([
        { id: 'custom', name: 'Other', name_es: 'Otro (personalizado)', species: null }
      ])
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
        // Validar que se haya ingresado información básica
        if (!formData.species) {
          throw new Error('Debes seleccionar la especie (perro/gato)')
        }
        
        // Preparar datos de raza y color (species ya está en formato BD)
        const petData = {
          name: formData.petName || 'Mascota sin nombre',
          species: formData.species,
          breed_id: formData.breed_id && formData.breed_id !== 'custom' && formData.breed_id !== '' ? formData.breed_id : null,
          breed_custom: formData.breed_id === 'custom' ? formData.breed_custom : null,
          color_id: formData.color_id && formData.color_id !== 'custom' && formData.color_id !== '' ? formData.color_id : null,
          color_custom: formData.color_id === 'custom' ? formData.color_custom : null,
          size: formData.size || null,
          description: formData.description,
          status: formData.status,
          medical_history: formData.medicalHistory || null,
          condition: formData.condition || 'good',
          has_wounds: formData.condition === 'fair' || formData.has_wounds || false,
          wounds_description: formData.wounds_description || null,
          primary_image_url: formData.image_url || null,
          image_urls: formData.image_url ? [formData.image_url] : []
        }

        console.log('🆕 Creando nueva mascota:', petData.name, petData.species)
        const { data: newPet, error: petError } = await supabase
          .from('pets')
          .insert(petData)
          .select()
          .single()

        if (petError) {
          console.error('❌ Error creando mascota:', petError)
          throw petError
        }
        petId = newPet.id
        console.log('✅ Nueva mascota creada con ID:', petId)
      } else {
        console.log('🔗 Usando mascota existente con ID:', petId)
      }

      // Obtener userId del usuario autenticado
      let reportedByUserId = null
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        reportedByUserId = sessionData?.session?.user?.id || localStorage.getItem('userId') || null
      } catch (err) {
        console.log('No hay sesión activa, se guardará como anónimo')
      }

      // Validar que petId existe
      if (!petId) {
        throw new Error('Error: No se pudo determinar la mascota para este avistamiento')
      }

      // Crear el avistamiento con el pet_id correcto
      const { data: newSighting, error: sightingError } = await supabase
        .from('sightings')
        .insert({
          pet_id: petId, // Asegurar que se usa el pet_id correcto
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          notes: formData.notes,
          image_url: formData.image_url || null,
          reported_at: new Date().toISOString(),
          reported_by: formData.is_anonymous ? null : reportedByUserId,
          is_anonymous: formData.is_anonymous,
          anonymous_contact: formData.is_anonymous ? formData.reporter_contact : null,
          address: formData.address || null
        })
        .select()
        .single()

      if (sightingError) {
        console.error('Error creando avistamiento:', sightingError)
        throw sightingError
      }
      
      console.log('✅ Avistamiento creado para mascota:', petId, 'Avistamiento ID:', newSighting?.id)

      // Actualizar estado de la mascota si es necesario
      if (formData.status !== 'sighted') {
        const updateData = { status: formData.status }
        
        // Si se marca como "perdida", guardar cuándo y dónde desapareció
        if (formData.status === 'lost') {
          updateData.lost_at = new Date().toISOString()
          updateData.lost_latitude = parseFloat(formData.latitude)
          updateData.lost_longitude = parseFloat(formData.longitude)
          updateData.lost_address = formData.address || null
        }
        
        await supabase
          .from('pets')
          .update(updateData)
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
                console.log('🔗 Seleccionando mascota:', petId ? 'ID ' + petId : 'Nueva mascota')
                setSelectedPetId(petId || null)
                
                if (petId) {
                  const pet = existingPets.find(p => p.id === petId)
                  if (pet) {
                    console.log('📋 Mascota encontrada:', pet.name, pet.species, 'ID:', pet.id)
                    setFormData(prev => ({
                      ...prev,
                      petName: pet.name || '',
                      species: pet.species || '',
                      breed_id: pet.breed_id || '',
                      breed_custom: pet.breed_custom || '',
                      color_id: pet.color_id || '',
                      color_custom: pet.color_custom || '',
                      status: pet.status || 'sighted'
                    }))
                  } else {
                    console.warn('⚠️ Mascota no encontrada con ID:', petId)
                    setSelectedPetId(null)
                  }
                } else {
                  // Si se deselecciona, limpiar campos para nueva mascota
                  console.log('🆕 Preparando para nueva mascota')
                  setFormData(prev => ({
                    ...prev,
                    petName: '',
                    species: '',
                    breed_id: '',
                    breed_custom: '',
                    color_id: '',
                    color_custom: '',
                    status: formData.type === 'sighting' ? 'sighted' : formData.type
                  }))
                }
              }}
              className="input-field"
            >
              <option value="">Nueva mascota</option>
              {existingPets.map(pet => {
                const breedText = pet.breed_custom || (pet.breed_id ? 'Raza seleccionada' : '')
                return (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} - {pet.species} {breedText ? `(${breedText})` : ''} - {pet.status}
                  </option>
                )
              })}
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
                    <option value="dog">Perro</option>
                    <option value="cat">Gato</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raza
                  </label>
                  {formData.species ? (
                    <>
                      <select
                        name="breed_id"
                        value={formData.breed_id}
                        onChange={(e) => {
                          const value = e.target.value
                          setFormData(prev => ({ ...prev, breed_id: value, breed_custom: '' }))
                          setShowBreedCustom(value === 'custom')
                        }}
                        className="input-field"
                      >
                        <option value="">Seleccionar raza...</option>
                        {breeds.length === 1 && breeds[0].id === 'custom' ? (
                          <option value="" disabled>
                            No hay razas cargadas. Ejecuta el SQL primero.
                          </option>
                        ) : (
                          breeds
                            .filter(breed => {
                              if (breed.id === 'custom') return true
                              if (!formData.species) return false
                              // species ya está en formato BD (dog, cat, other)
                              return breed.species === formData.species
                            })
                            .map(breed => (
                              <option key={breed.id} value={breed.id}>
                                {breed.name_es || breed.name}
                              </option>
                            ))
                        )}
                      </select>
                      {showBreedCustom && (
                        <input
                          type="text"
                          name="breed_custom"
                          value={formData.breed_custom}
                          onChange={handleChange}
                          className="input-field mt-2"
                          placeholder="Escribe la raza..."
                          required
                        />
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Primero selecciona la especie"
                      disabled
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <select
                    name="color_id"
                    value={formData.color_id}
                    onChange={(e) => {
                      const value = e.target.value
                      setFormData(prev => ({ ...prev, color_id: value, color_custom: '' }))
                      setShowColorCustom(value === 'custom')
                    }}
                    className="input-field"
                  >
                    <option value="">Seleccionar color...</option>
                    {colors.length === 1 && colors[0].id === 'custom' ? (
                      <option value="" disabled>
                        No hay colores cargados. Ejecuta el SQL primero.
                      </option>
                    ) : (
                      colors
                        .filter(color => {
                          if (color.id === 'custom') return true
                          if (!formData.species) return false
                          // Filtrar por especie: mostrar colores de la especie seleccionada o colores sin especie específica
                          return color.species === formData.species || !color.species
                        })
                        .map(color => (
                          <option key={color.id} value={color.id}>
                            {color.name_es || color.name}{color.hex_code ? ' ●' : ''}
                          </option>
                        ))
                    )}
                  </select>
                  {showColorCustom && (
                    <input
                      type="text"
                      name="color_custom"
                      value={formData.color_custom}
                      onChange={handleChange}
                      className="input-field mt-2"
                      placeholder="Escribe el color..."
                      required
                    />
                  )}
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
                    <option value="small">Pequeño</option>
                    <option value="medium">Mediano</option>
                    <option value="large">Grande</option>
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

              {/* Estado de salud */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de salud *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, condition: 'good', has_wounds: false })) // Sano
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      formData.condition === 'good'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Heart size={24} className={formData.condition === 'good' ? 'text-green-600' : 'text-gray-400'} />
                    <span className="mt-2 text-sm font-medium">Sano</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, condition: 'fair', has_wounds: true })) // Herido
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      formData.condition === 'fair'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <AlertCircle size={24} className={formData.condition === 'fair' ? 'text-yellow-600' : 'text-gray-400'} />
                    <span className="mt-2 text-sm font-medium">Herido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, condition: 'poor', has_wounds: false })) // Enfermo
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                      formData.condition === 'poor'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Cross size={24} className={formData.condition === 'poor' ? 'text-red-600' : 'text-gray-400'} />
                    <span className="mt-2 text-sm font-medium">Enfermo</span>
                  </button>
                </div>
                {formData.condition === 'fair' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción de heridas (opcional)
                    </label>
                    <textarea
                      name="wounds_description"
                      value={formData.wounds_description || ''}
                      onChange={handleChange}
                      className="input-field"
                      rows="2"
                      placeholder="Describe las heridas o lesiones observadas..."
                    />
                  </div>
                )}
                {formData.condition === 'poor' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Síntomas observados (opcional)
                    </label>
                    <textarea
                      name="wounds_description"
                      value={formData.wounds_description || ''}
                      onChange={handleChange}
                      className="input-field"
                      rows="2"
                      placeholder="Describe los síntomas o signos de enfermedad observados..."
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin size={16} className="inline mr-1" />
              Ubicación
            </label>
            <div className="space-y-3">
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
                La ubicación ya fue seleccionada en el paso anterior. Si necesitas cambiarla, cancela y vuelve a seleccionar.
              </p>
            </div>
          </div>

          {/* Imagen de la mascota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Image size={16} className="inline mr-1" />
              Imagen de la Mascota (opcional)
            </label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setImageInputType('upload')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                    imageInputType === 'upload'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Upload size={18} />
                  <span>Subir imagen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputType('url')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors flex items-center justify-center space-x-2 ${
                    imageInputType === 'url'
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <LinkIcon size={18} />
                  <span>Enlazar desde redes</span>
                </button>
              </div>

              {imageInputType === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Crear preview
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setImagePreview(reader.result)
                          setFormData(prev => ({ ...prev, image_url: reader.result }))
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="input-field"
                  />
                  {imagePreview && (
                    <div className="mt-3">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setFormData(prev => ({ ...prev, image_url: '' }))
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        Eliminar imagen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {imageInputType === 'url' && (
                <div>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Pega el enlace de la imagen (Instagram, Facebook, etc.)"
                  />
                  {formData.image_url && (
                    <div className="mt-3">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="max-w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
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

          {/* Información de contacto del reportante */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Información de Contacto</h3>
            
            {/* Checkbox para reporte anónimo */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_anonymous"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm text-gray-700">Reportar como anónimo</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Si marcas esta opción, solo se mostrará tu número de contacto
              </p>
            </div>

            {/* Nombre del reportante (solo si no es anónimo) */}
            {!formData.is_anonymous && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tu Nombre (opcional)
                </label>
                <input
                  type="text"
                  name="reporter_name"
                  value={formData.reporter_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Nombre completo"
                />
              </div>
            )}

            {/* Contacto (teléfono o email) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.is_anonymous ? 'Número de Contacto *' : 'Teléfono o Email'}
              </label>
              <input
                type="text"
                name="reporter_contact"
                value={formData.reporter_contact}
                onChange={handleChange}
                className="input-field"
                placeholder={formData.is_anonymous ? "Ej: +56912345678" : "Teléfono o email para contacto"}
                required={formData.is_anonymous}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.is_anonymous 
                  ? 'Este número será visible para que te puedan contactar'
                  : 'Opcional: para que otros puedan contactarte sobre este avistamiento'}
              </p>
            </div>

            {/* Dirección */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección o Referencia (opcional)
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="input-field"
                placeholder="Ej: Calle Principal 123, cerca del parque"
              />
            </div>
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
