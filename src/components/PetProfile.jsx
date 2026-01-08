import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, CheckCircle, Pill } from 'lucide-react'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { supabase } from '../lib/supabase'
import Timeline from './Timeline'
import VerificationButton from './VerificationButton'

export default function PetProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pet, setPet] = useState(null)
  const [sightings, setSightings] = useState([])
  const [loading, setLoading] = useState(true)

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

      // Cargar avistamientos
      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('*')
        .eq('pet_id', id)
        .order('created_at', { ascending: false })

      if (sightingsError) throw sightingsError

      setPet(petData)
      setSightings(sightingsData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
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

  const latestSighting = sightings[0]
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
                  <p className="font-semibold capitalize">{pet.species}</p>
                </div>
                {pet.breed && (
                  <div>
                    <p className="text-sm text-gray-500">Raza</p>
                    <p className="font-semibold">{pet.breed}</p>
                  </div>
                )}
                {pet.color && (
                  <div>
                    <p className="text-sm text-gray-500">Color</p>
                    <p className="font-semibold capitalize">{pet.color}</p>
                  </div>
                )}
                {pet.size && (
                  <div>
                    <p className="text-sm text-gray-500">Tamaño</p>
                    <p className="font-semibold capitalize">{pet.size}</p>
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
                <p className="text-gray-700 capitalize">{pet.condition || 'Bueno'}</p>
              </div>

              {/* Última ubicación */}
              {latestSighting && (
                <div className="card mb-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
                    <MapPin size={20} className="text-primary-600" />
                    <span>Última Ubicación Reportada</span>
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <Clock size={14} className="inline mr-1" />
                      {format(new Date(latestSighting.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                    <p className="text-sm text-gray-600">
                      Coordenadas: {latestSighting.latitude.toFixed(6)}, {latestSighting.longitude.toFixed(6)}
                    </p>
                    {latestSighting.notes && (
                      <p className="text-gray-700 mt-2">{latestSighting.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Verificación comunitaria */}
              {latestSighting && (
                <div className="mb-6">
                  <VerificationButton sightingId={latestSighting.id} petId={pet.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Línea de tiempo de avistamientos */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Línea de Tiempo de Avistamientos</h2>
        <Timeline sightings={sightings} />
      </div>
    </div>
  )
}
