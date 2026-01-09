import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ReportModal from './ReportModal'
import PetMarker from './PetMarker'
import ProximityAlerts from './ProximityAlerts'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix para iconos de Leaflet en React
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapView() {
  const navigate = useNavigate()
  const [pets, setPets] = useState([])
  const [sightings, setSightings] = useState([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([-37.4697, -72.3537]) // Los Ángeles, Chile por defecto
  const [petRoutes, setPetRoutes] = useState({}) // { petId: [sightings] }
  const [breedsMap, setBreedsMap] = useState({}) // { breedId: breedName }
  const [colorsMap, setColorsMap] = useState({}) // { colorId: colorInfo }

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])
          setMapCenter([latitude, longitude])
        },
        (error) => {
          console.warn('Ubicación no disponible:', error.message)
          // No es crítico, la app puede funcionar sin ubicación
        }
      )
    }
  }, [])

  // Cargar mascotas y avistamientos
  useEffect(() => {
    loadBreedsAndColors()
    loadPets()
    loadSightings()
    
    // Suscripción en tiempo real a mascotas
    const petsSubscription = supabase
      .channel('pets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
        loadPets()
      })
      .subscribe()

    // Suscripción en tiempo real a avistamientos
    const sightingsSubscription = supabase
      .channel('sightings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sightings' }, () => {
        loadSightings()
      })
      .subscribe()

    return () => {
      petsSubscription.unsubscribe()
      sightingsSubscription.unsubscribe()
    }
  }, [])

  // Agrupar avistamientos por mascota para mostrar rutas
  useEffect(() => {
    const routes = {}
    sightings.forEach(sighting => {
      if (!routes[sighting.pet_id]) {
        routes[sighting.pet_id] = []
      }
      routes[sighting.pet_id].push(sighting)
    })
    
    // Ordenar por fecha
    Object.keys(routes).forEach(petId => {
      routes[petId].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    })
    
    setPetRoutes(routes)
  }, [sightings])

  const loadBreedsAndColors = async () => {
    try {
      // Cargar todas las razas
      const { data: breedsData } = await supabase
        .from('pet_breeds')
        .select('id, name, name_es')
      
      if (breedsData) {
        const breeds = {}
        breedsData.forEach(breed => {
          breeds[breed.id] = breed.name_es || breed.name
        })
        setBreedsMap(breeds)
      }

      // Cargar todos los colores
      const { data: colorsData } = await supabase
        .from('pet_colors')
        .select('id, name, name_es, hex_code')
      
      if (colorsData) {
        const colors = {}
        colorsData.forEach(color => {
          colors[color.id] = {
            name: color.name_es || color.name,
            hex: color.hex_code
          }
        })
        setColorsMap(colors)
      }
    } catch (error) {
      console.error('Error cargando razas y colores:', error)
    }
  }

  const loadPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error cargando mascotas:', error)
        console.error('Detalles:', error.message, error.details, error.hint)
        throw error
      }
      setPets(data || [])
    } catch (error) {
      console.error('Error cargando mascotas:', error)
    }
  }

  const loadSightings = async () => {
    try {
      const { data, error } = await supabase
        .from('sightings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error cargando avistamientos:', error)
        console.error('Detalles:', error.message, error.details, error.hint)
        throw error
      }
      setSightings(data || [])
    } catch (error) {
      console.error('Error cargando avistamientos:', error)
    }
  }

  const handleReportSuccess = () => {
    setShowReportModal(false)
    loadPets()
    loadSightings()
  }

  const handleMarkerClick = (pet) => {
    setSelectedPet(pet)
    navigate(`/pet/${pet.id}`)
  }

  // Calcular distancia entre dos puntos (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Obtener mascotas dentro del radio de 5km
  const nearbyPets = userLocation 
    ? pets.filter(pet => {
        const latestSighting = sightings
          .filter(s => s.pet_id === pet.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        
        if (!latestSighting) return false
        
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          latestSighting.latitude,
          latestSighting.longitude
        )
        
        return distance <= 5
      })
    : []

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Ubicación del usuario */}
        {userLocation && (
          <Circle
            center={userLocation}
            radius={5000}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 }}
          />
        )}

        {/* Rutas de mascotas (polilíneas conectando avistamientos) */}
        {Object.entries(petRoutes).map(([petId, petSightings]) => {
          if (petSightings.length < 2) return null
          
          const positions = petSightings.map(s => [s.latitude, s.longitude])
          const pet = pets.find(p => p.id === petId)
          
          return (
            <Polyline
              key={`route-${petId}`}
              positions={positions}
              pathOptions={{
                color: pet?.status === 'lost' ? '#ef4444' : '#10b981',
                weight: 3,
                opacity: 0.6
              }}
            />
          )
        })}

        {/* Marcadores de avistamientos */}
        {sightings.map((sighting) => {
          const pet = pets.find(p => p.id === sighting.pet_id)
          if (!pet) return null

          // Obtener información de raza y color
          const breedName = pet.breed_id ? breedsMap[pet.breed_id] : pet.breed_custom
          const colorInfo = pet.color_id ? colorsMap[pet.color_id] : (pet.color_custom ? { name: pet.color_custom } : null)

          return (
            <PetMarker
              key={`sighting-${sighting.id}`}
              position={[sighting.latitude, sighting.longitude]}
              pet={pet}
              sighting={sighting}
              breedName={breedName}
              colorInfo={colorInfo}
              onClick={() => handleMarkerClick(pet)}
            />
          )
        })}
      </MapContainer>

      {/* Botón flotante de reportar */}
      <button
        onClick={() => setShowReportModal(true)}
        className="fixed bottom-8 right-8 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl transition-all transform hover:scale-110 flex items-center space-x-2"
        aria-label="Reportar avistamiento"
      >
        <Plus size={24} />
        <span className="font-semibold">Reportar ahora</span>
      </button>

      {/* Alertas de proximidad */}
      {userLocation && nearbyPets.length > 0 && (
        <ProximityAlerts 
        pets={nearbyPets} 
        userLocation={userLocation}
        breedsMap={breedsMap}
        colorsMap={colorsMap}
      />
      )}

      {/* Modal de reporte */}
      {showReportModal && (
        <ReportModal
          userLocation={userLocation}
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  )
}
