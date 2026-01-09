import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, CheckCircle, Pill, Trash2, AlertTriangle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { supabase } from '../lib/supabase'
import Timeline from './Timeline'
import VerificationButton from './VerificationButton'
import JoinSearchButton from './JoinSearchButton'
import VolunteersList from './VolunteersList'
import SearchUpdates from './SearchUpdates'
import CloseCaseButton from './CloseCaseButton'
import ConfirmClosureButton from './ConfirmClosureButton'
import RequestHelpButton from './RequestHelpButton'
import SearchZones from './SearchZones'
import OfficialUpdates from './OfficialUpdates'

export default function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState(null)
  const [sightings, setSightings] = useState([])
  const [evidenceClues, setEvidenceClues] = useState([])
  const [caseClosures, setCaseClosures] = useState([])
  const [loading, setLoading] = useState(true)
  const [breedInfo, setBreedInfo] = useState(null)
  const [colorInfo, setColorInfo] = useState(null)
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || null)
  const [isOwner, setIsOwner] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadPetData()
    
    // Suscripción en tiempo real
    const subscription = supabase
      .channel(`pet-${id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sightings', filter: `pet_id=eq.${id}` },
        () => {
          loadPetData()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  const loadPetData = async () => {
    try {
      // Cargar mascota
      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', id)
        .single()

      if (petError) throw petError

      // Cargar información de raza si existe breed_id
      if (petData.breed_id) {
        const { data: breedData } = await supabase
          .from('pet_breeds')
          .select('name, name_es')
          .eq('id', petData.breed_id)
          .single()
        
        if (breedData) {
          setBreedInfo(breedData.name_es || breedData.name)
        }
      }

      // Cargar información de color si existe color_id
      if (petData.color_id) {
        const { data: colorData } = await supabase
          .from('pet_colors')
          .select('name, name_es, hex_code')
          .eq('id', petData.color_id)
          .single()
        
        if (colorData) {
          setColorInfo({
            name: colorData.name_es || colorData.name,
            hex: colorData.hex_code
          })
        }
      }

      // Cargar avistamientos
      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('*')
        .eq('pet_id', id)
        .order('reported_at', { ascending: false })
        .order('created_at', { ascending: false })

      if (sightingsError) throw sightingsError

      // Cargar pistas con evidencia
      const { data: cluesData, error: cluesError } = await supabase
        .from('evidence_clues')
        .select('*')
        .eq('pet_id', id)
        .order('created_at', { ascending: false })

      // Ignorar error si la tabla no existe aún
      if (cluesError && cluesError.code !== '42P01') {
        console.warn('Error cargando pistas:', cluesError)
      }

      // Cargar cierres de caso
      const { data: closuresData, error: closuresError } = await supabase
        .from('case_closures')
        .select('*')
        .eq('pet_id', id)
        .order('closure_date', { ascending: false })

      // Ignorar error si la tabla no existe aún
      if (closuresError && closuresError.code !== '42P01') {
        console.warn('Error cargando cierres:', closuresError)
      }

      setPet(petData)
      setSightings(sightingsData || [])
      setEvidenceClues(cluesData || [])
      setCaseClosures(closuresData || [])
      
      // Verificar si el usuario puede eliminar esta mascota
      const currentUserId = localStorage.getItem('userId')
      if (currentUserId) {
        // Verificar si es admin
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_role')
          .eq('id', currentUserId)
          .single()
        
        const isAdmin = userProfile?.user_role === 'admin'
        
        // Puede eliminar si:
        // 1. Es admin
        // 2. Es quien registró la mascota
        // 3. O si no hay nadie registrado como dueño (mascota sin dueño - cualquiera puede eliminar)
        const canDeletePet = isAdmin || 
                            petData.registered_by === currentUserId || 
                            petData.registered_by === null
        setCanDelete(canDeletePet)
        setIsOwner(canDeletePet || isAdmin) // También es dueño si puede eliminar o es admin
      } else {
        setCanDelete(false)
        setIsOwner(false)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePet = async () => {
    if (!pet || !canDelete) return

    setDeleting(true)
    try {
      // Eliminar la mascota (los avistamientos y otros datos relacionados se eliminan en cascada)
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', pet.id)

      if (error) {
        console.error('Error eliminando mascota:', error)
        alert('Error al eliminar la mascota. Por favor, intenta nuevamente.')
        setDeleting(false)
        return
      }

      // Redirigir al mapa después de eliminar
      alert('Mascota eliminada correctamente')
      navigate('/')
    } catch (error) {
      console.error('Error eliminando mascota:', error)
      alert('Error al eliminar la mascota. Por favor, intenta nuevamente.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">Mascota no encontrada</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Volver al mapa
          </button>
        </div>
      </div>
    )
  }

  // Obtener el avistamiento más reciente (usando reported_at si existe, sino created_at)
  const latestSighting = sightings.length > 0 
    ? sightings.reduce((latest, current) => {
        const currentDate = new Date(current.reported_at || current.created_at)
        const latestDate = new Date(latest.reported_at || latest.created_at)
        return currentDate > latestDate ? current : latest
      })
    : null
  const statusColors = {
    lost: 'bg-red-100 text-red-800',
    found: 'bg-green-100 text-green-800',
    sighted: 'bg-blue-100 text-blue-800',
    returned: 'bg-purple-100 text-purple-800'
  }

  const statusLabels = {
    lost: 'Perdida',
    found: 'Encontrada',
    sighted: 'Avistada',
    returned: 'Devuelta'
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Volver al mapa</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            {/* Foto del perro */}
            {(pet.primary_image_url || (pet.image_urls && pet.image_urls.length > 0)) && (
              <div className="mb-6 md:mb-0 md:w-80 flex-shrink-0">
                <div className="rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={pet.primary_image_url || pet.image_urls[0]}
                    alt={pet.name || 'Mascota'}
                    className="w-full h-64 md:h-80 object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling?.classList.remove('hidden')
                    }}
                  />
                  <div className="hidden bg-gray-200 w-full h-64 md:h-80 flex items-center justify-center">
                    <span className="text-gray-400">Imagen no disponible</span>
                  </div>
                </div>
                {/* Galería de imágenes adicionales */}
                {pet.image_urls && pet.image_urls.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {pet.image_urls.slice(1, 5).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${pet.name || 'Mascota'} - Imagen ${index + 2}`}
                        className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
                        onClick={() => {
                          // Cambiar imagen principal al hacer clic
                          const newUrls = [url, ...pet.image_urls.filter((u, i) => i !== index + 1)]
                          setPet({ ...pet, image_urls: newUrls, primary_image_url: url })
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Información principal */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {pet.name || 'Mascota sin nombre'}
                  </h1>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColors[pet.status] || statusColors.sighted}`}>
                    {statusLabels[pet.status] || 'Avistada'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Especie</p>
                  <p className="font-semibold capitalize">
                    {pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : pet.species}
                  </p>
                </div>
                {(breedInfo || pet.breed_custom) && (
                  <div>
                    <p className="text-sm text-gray-500">Raza</p>
                    <p className="font-semibold">{breedInfo || pet.breed_custom}</p>
                  </div>
                )}
                {(colorInfo || pet.color_custom) && (
                  <div>
                    <p className="text-sm text-gray-500">Color</p>
                    <div className="flex items-center space-x-2">
                      {colorInfo?.hex && (
                        <span 
                          className="inline-block w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: colorInfo.hex }}
                          title={colorInfo.name}
                        ></span>
                      )}
                      <p className="font-semibold capitalize">{colorInfo?.name || pet.color_custom}</p>
                    </div>
                  </div>
                )}
                {pet.size && (
                  <div>
                    <p className="text-sm text-gray-500">Tamaño</p>
                    <p className="font-semibold capitalize">
                      {pet.size === 'small' ? 'Pequeño' : pet.size === 'medium' ? 'Mediano' : pet.size === 'large' ? 'Grande' : pet.size}
                    </p>
                  </div>
                )}
              </div>

              {pet.description && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2">Descripción</p>
                  <p className="text-gray-700">{pet.description}</p>
                </div>
              )}

              {/* Historial médico */}
              {pet.medical_history && (
                <div className="mb-6 card">
                  <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                    <Pill size={20} className="text-primary-600" />
                    <span>Historial Médico</span>
                  </h3>
                  <p className="text-gray-700 whitespace-pre-line">{pet.medical_history}</p>
                </div>
              )}

              {/* Estado actual */}
              <div className="mb-6 card">
                <h3 className="font-semibold text-lg mb-3">Estado Actual</h3>
                <p className="text-gray-700">
                  {pet.condition === 'good' ? 'Sano' : 
                   pet.condition === 'fair' ? 'Herido' : 
                   pet.condition === 'poor' ? 'Enfermo' : 
                   pet.condition === 'critical' ? 'Crítico' : 'Sano'}
                </p>
              </div>

              {/* Última ubicación */}
              {latestSighting && (() => {
                const lat = parseFloat(latestSighting.latitude)
                const lng = parseFloat(latestSighting.longitude)
                const isValidCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0
                
                return (
                  <div className="card mb-6">
                    <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                      <MapPin size={20} className="text-primary-600" />
                      <span>Última Ubicación Reportada</span>
                    </h3>
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        <Clock size={14} className="inline mr-1" />
                        {format(new Date(latestSighting.reported_at || latestSighting.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                      {latestSighting.notes && (
                        <p className="text-gray-700">{latestSighting.notes}</p>
                      )}
                      {isValidCoords ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-700 mb-1">Ubicación del avistamiento</p>
                                <p className="text-xs text-gray-500 font-mono">
                                  {lat.toFixed(6)}, {lng.toFixed(6)}
                                </p>
                                {latestSighting.address && (
                                  <p className="text-sm text-gray-600 mt-1">{latestSighting.address}</p>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  // Navegar al mapa principal con parámetros de ubicación
                                  navigate(`/?lat=${lat}&lng=${lng}&petId=${pet.id}&sightingId=${latestSighting.id}`)
                                }}
                                className="ml-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-md"
                              >
                                <MapPin size={18} />
                                <span className="font-medium">Ver en mapa</span>
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-red-500">
                            ⚠️ Coordenadas inválidas: {latestSighting.latitude}, {latestSighting.longitude}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Verificación comunitaria */}
              {latestSighting && (
                <div className="mb-6">
                  <VerificationButton sightingId={latestSighting.id} petId={pet.id} />
                </div>
              )}

              {/* Solicitar ayuda de voluntarios (solo para dueños) */}
              {pet.status === 'lost' && isOwner && latestSighting && (
                <div className="mb-6">
                  <RequestHelpButton petId={pet.id} userId={userId} latestSighting={latestSighting} />
                </div>
              )}

              {/* Botón para unirse a la búsqueda (solo para casos perdidos) */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <JoinSearchButton petId={pet.id} userId={userId} />
                </div>
              )}

              {/* Lista de voluntarios ayudando */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <VolunteersList petId={pet.id} />
                </div>
              )}

              {/* Actualizaciones oficiales (solo para dueños) */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <OfficialUpdates petId={pet.id} userId={userId} isOwner={isOwner} />
                </div>
              )}

              {/* Actualizaciones de búsqueda (voluntarios) */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <SearchUpdates petId={pet.id} userId={userId} />
                </div>
              )}

              {/* Zonas de búsqueda */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <SearchZones petId={pet.id} userId={userId} isOwner={isOwner} />
                </div>
              )}

              {/* Cerrar caso (solo para casos perdidos y si es el dueño) */}
              {pet.status === 'lost' && (
                <div className="mb-6">
                  <CloseCaseButton 
                    petId={pet.id} 
                    userId={userId}
                    onCaseClosed={() => {
                      loadPetData() // Recargar datos del pet
                    }}
                  />
                </div>
              )}

              {/* Confirmar cierre de caso */}
              {(pet.status === 'found' || pet.status === 'returned') && (
                <div className="mb-6">
                  <ConfirmClosureButton petId={pet.id} userId={userId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Línea de tiempo de avistamientos */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Línea de Tiempo de Avistamientos</h2>
        <Timeline 
          pet={pet}
          sightings={sightings} 
          evidenceClues={evidenceClues}
          caseClosures={caseClosures}
        />
      </div>

      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Eliminar Mascota</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                ¿Estás seguro de que deseas eliminar a <strong>{pet?.name || 'esta mascota'}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                Se eliminarán permanentemente:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mt-2 space-y-1">
                <li>El perfil de la mascota</li>
                <li>Todos los avistamientos registrados</li>
                <li>Todas las pistas con evidencia</li>
                <li>Los cierres de caso</li>
                <li>Las asignaciones de voluntarios</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePet}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
