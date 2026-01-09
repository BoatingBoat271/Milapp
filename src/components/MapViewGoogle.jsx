import { useState, useEffect, useCallback, useRef } from 'react'
import { GoogleMap, Marker, Polyline, Circle, InfoWindow } from '@react-google-maps/api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Filter, Dog, Cat, Pill, DollarSign, X, HelpCircle, Check, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PublishModal from './PublishModal'
import ProximityAlerts from './ProximityAlerts'
import ConnectionDiagnostic from './ConnectionDiagnostic'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
import { geocode } from '../lib/geocoding'

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const defaultCenter = {
  lat: -37.4697,
  lng: -72.3537
}

// Opciones del mapa
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }]
    }
  ]
}

export default function MapViewGoogle() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mapRef = useRef(null)
  const [pets, setPets] = useState([])
  const [sightings, setSightings] = useState([])
  const [showReportModal, setShowReportModal] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState(defaultCenter)
  const [mapZoom, setMapZoom] = useState(13)
  const [petRoutes, setPetRoutes] = useState({})
  const [breedsMap, setBreedsMap] = useState({})
  const [colorsMap, setColorsMap] = useState({})
  const [selectedPet, setSelectedPet] = useState(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false) // Estado adicional para verificar que el mapa esté completamente listo
  const [highlightedLocation, setHighlightedLocation] = useState(null) // Ubicación destacada desde URL
  
  // Filtros de visualización
  const [showFilters, setShowFilters] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [filters, setFilters] = useState({
    animals: false, // Mostrar animales
    dogs: false, // Solo perros
    cats: false, // Solo gatos
    medications: false, // Donaciones de medicamentos
    donations: false // Otras donaciones
  })
  const [activeFilters, setActiveFilters] = useState({
    animals: false,
    dogs: false,
    cats: false,
    medications: false,
    donations: false
  })
  const [communityOffers, setCommunityOffers] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  
  // Usar el contexto de Google Maps
  const { isLoaded, loadError, googleMapsApiKey } = useGoogleMaps()
  
  // Verificar periódicamente que window.google esté disponible
  useEffect(() => {
    if (isLoaded && !isMapReady) {
      const checkGoogle = setInterval(() => {
        if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Map) {
          setIsMapReady(true)
          clearInterval(checkGoogle)
        }
      }, 50)
      
      return () => clearInterval(checkGoogle)
    }
  }, [isLoaded, isMapReady])

  // Verificar si hay parámetros de URL para centrar el mapa
  useEffect(() => {
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    const petIdParam = searchParams.get('petId')
    const sightingIdParam = searchParams.get('sightingId')

    if (latParam && lngParam) {
      const lat = parseFloat(latParam)
      const lng = parseFloat(lngParam)
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Guardar la ubicación destacada en el estado local para que persista
        setHighlightedLocation({ lat, lng })
        
        // Centrar el mapa inmediatamente
        setMapCenter({ lat, lng })
        setMapZoom(16) // Zoom más cercano para mostrar la ubicación específica
        
        // Si el mapa está listo, moverlo inmediatamente
        if (mapRef.current && isMapReady) {
          mapRef.current.panTo({ lat, lng })
          mapRef.current.setZoom(16)
        }
        
        // Si hay petId y sightingId, seleccionar ese avistamiento cuando se carguen los datos
        if (petIdParam && sightingIdParam) {
          // Cargar datos si no están cargados
          if (pets.length === 0) {
            loadPets()
            loadSightings()
          }
          
          // Esperar a que se carguen los datos
          const checkAndSelect = () => {
            const pet = pets.find(p => p.id === petIdParam)
            if (pet) {
              setSelectedPet({ ...pet, sightingId: sightingIdParam })
              // Limpiar los parámetros de URL después de usarlos, pero mantener highlightedLocation
              setTimeout(() => setSearchParams({}), 2000) // Esperar 2 segundos antes de limpiar
            }
          }
          
          // Intentar inmediatamente si ya hay datos, sino esperar
          if (pets.length > 0) {
            checkAndSelect()
          } else {
            // Intentar varias veces hasta que los datos estén cargados
            let attempts = 0
            const maxAttempts = 20 // 10 segundos máximo
            const interval = setInterval(() => {
              attempts++
              const pet = pets.find(p => p.id === petIdParam)
              if (pet || attempts >= maxAttempts) {
                clearInterval(interval)
                if (pet) {
                  checkAndSelect()
                }
              }
            }, 500)
          }
        } else {
          // Limpiar los parámetros de URL después de usarlos, pero mantener highlightedLocation
          setTimeout(() => setSearchParams({}), 2000)
        }
      }
    }
  }, [searchParams, pets, setSearchParams, isMapReady])

  // Obtener ubicación del usuario (solo si no hay parámetros de URL)
  useEffect(() => {
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')
    
    // Solo obtener ubicación del usuario si no hay parámetros de URL
    if (!latParam && !lngParam && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setUserLocation(location)
          // Solo actualizar el centro si no se ha establecido desde parámetros de URL
          if (mapCenter.lat === defaultCenter.lat && mapCenter.lng === defaultCenter.lng) {
            setMapCenter(location)
          }
        },
        (error) => {
          console.warn('Ubicación no disponible:', error.message)
        }
      )
    }
  }, [searchParams, mapCenter])

  // Cargar razas y colores siempre (necesarios para InfoWindows)
  useEffect(() => {
    loadBreedsAndColors()
  }, [])

  const loadCommunityOffers = useCallback(async () => {
    try {
      if (!supabase) {
        console.error('Supabase no está configurado. Verifica tu archivo .env')
        setCommunityOffers([])
        return
      }

      let query = supabase
        .from('community_offers')
        .select('*')
        .eq('active', true)
        .in('status', ['active', null])

      // Filtrar por tipo
      const types = []
      if (activeFilters.medications) types.push('medications')
      if (activeFilters.donations) types.push('donations')
      
      if (types.length > 0) {
        query = query.in('type', types)
      } else {
        setCommunityOffers([])
        return
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error cargando ofertas comunitarias:', error)
        setCommunityOffers([])
        return
      }

      // Geocodificar ubicaciones si tienen location pero no coordenadas
      const offersWithCoords = await Promise.all(
        (data || []).map(async (offer) => {
          if (offer.location && !offer.latitude && !offer.longitude) {
            try {
              const geocodeResult = await geocode(offer.location)
              if (geocodeResult) {
                return {
                  ...offer,
                  latitude: geocodeResult.lat,
                  longitude: geocodeResult.lng
                }
              }
            } catch (error) {
              console.warn(`Error geocodificando ${offer.location}:`, error)
            }
          }
          return offer
        })
      )

      setCommunityOffers(offersWithCoords.filter(o => o.latitude && o.longitude))
    } catch (error) {
      console.error('Error inesperado cargando ofertas comunitarias:', error)
      setCommunityOffers([])
    }
  }, [activeFilters.medications, activeFilters.donations])

  // Cargar datos solo cuando hay filtros activos aplicados
  useEffect(() => {
    const hasActiveFilters = Object.values(activeFilters).some(v => v === true)
    
    if (hasActiveFilters) {
      setLoadingData(true)
      
      // Cargar animales si el filtro está activo
      if (activeFilters.animals || activeFilters.dogs || activeFilters.cats) {
        loadPets()
        loadSightings()
      }
      
      // Cargar ofertas comunitarias si el filtro está activo
      if (activeFilters.medications || activeFilters.donations) {
        loadCommunityOffers()
      }
      
      setLoadingData(false)
    } else {
      // Si no hay filtros activos, limpiar datos
      setPets([])
      setSightings([])
      setCommunityOffers([])
    }
  }, [activeFilters, loadCommunityOffers])

  // Suscripción en tiempo real (solo si hay filtros activos aplicados)
  useEffect(() => {
    const hasActiveFilters = Object.values(activeFilters).some(v => v === true)
    if (!hasActiveFilters) return

    const petsSubscription = supabase
      .channel('pets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
        if (activeFilters.animals || activeFilters.dogs || activeFilters.cats) {
          loadPets()
        }
      })
      .subscribe()

    const sightingsSubscription = supabase
      .channel('sightings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sightings' }, () => {
        if (activeFilters.animals || activeFilters.dogs || activeFilters.cats) {
          loadSightings()
        }
      })
      .subscribe()

    const offersSubscription = supabase
      .channel('offers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_offers' }, () => {
        if (activeFilters.medications || activeFilters.donations) {
          loadCommunityOffers()
        }
      })
      .subscribe()

    return () => {
      petsSubscription.unsubscribe()
      sightingsSubscription.unsubscribe()
      offersSubscription.unsubscribe()
    }
  }, [activeFilters, loadCommunityOffers])

  // Agrupar avistamientos por mascota
  useEffect(() => {
    const routes = {}
    sightings.forEach(sighting => {
      if (!routes[sighting.pet_id]) {
        routes[sighting.pet_id] = []
      }
      routes[sighting.pet_id].push(sighting)
    })
    
    Object.keys(routes).forEach(petId => {
      routes[petId].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    })
    
    setPetRoutes(routes)
  }, [sightings])

  const loadBreedsAndColors = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase no está configurado. No se pueden cargar razas y colores.')
        return
      }

      const { data: breedsData, error: breedsError } = await supabase
        .from('pet_breeds')
        .select('id, name, name_es')
      
      if (breedsError) {
        console.error('Error cargando razas:', breedsError)
        // Si la tabla no existe, continuar sin errores
        if (breedsError.code === '42P01' || breedsError.message?.includes('does not exist')) {
          console.warn('Tabla pet_breeds no existe. Ejecuta el script SQL para crearla.')
          return
        }
        throw breedsError
      }
      
      if (breedsData) {
        const breeds = {}
        breedsData.forEach(breed => {
          breeds[breed.id] = breed.name_es || breed.name
        })
        setBreedsMap(breeds)
      }

      const { data: colorsData, error: colorsError } = await supabase
        .from('pet_colors')
        .select('id, name, name_es, hex_code, species')
      
      if (colorsError) {
        console.error('Error cargando colores:', colorsError)
        // Si la tabla no existe, continuar sin errores
        if (colorsError.code === '42P01' || colorsError.message?.includes('does not exist')) {
          console.warn('Tabla pet_colors no existe. Ejecuta el script SQL para crearla.')
          return
        }
        throw colorsError
      }
      
      if (colorsData) {
        const colors = {}
        colorsData.forEach(color => {
          colors[color.id] = {
            name: color.name_es || color.name,
            hex: color.hex_code,
            species: color.species
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
      if (!supabase) {
        console.error('Supabase no está configurado. Verifica tu archivo .env')
        setPets([])
        return
      }

      let query = supabase
        .from('pets')
        .select('*')

      // Aplicar filtros de especie
      if (activeFilters.dogs && !activeFilters.cats) {
        query = query.eq('species', 'dog')
      } else if (activeFilters.cats && !activeFilters.dogs) {
        query = query.eq('species', 'cat')
      }
      // Si ambos están activos o solo animals, no filtrar por especie

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100) // Limitar resultados para evitar sobrecarga

      if (error) {
        console.error('Error cargando mascotas:', error)
        // Si es error de red, no lanzar excepción
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.warn('Problema de conexión. Verifica tu conexión a internet y las variables de entorno.')
          setPets([])
          return
        }
        setPets([])
        return
      }
      setPets(data || [])
    } catch (error) {
      console.error('Error cargando mascotas:', error)
      // Si es error de red, mostrar mensaje más claro
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('⚠️ No se pudo conectar a Supabase. Verifica:')
        console.warn('1. Tu conexión a internet')
        console.warn('2. Que el archivo .env esté configurado correctamente')
        console.warn('3. Que hayas reiniciado el servidor después de crear/editar .env')
      }
      setPets([])
    }
  }

  const loadSightings = async () => {
    try {
      if (!supabase) {
        console.error('Supabase no está configurado. Verifica tu archivo .env')
        setSightings([])
        return
      }

      const { data, error } = await supabase
        .from('sightings')
        .select('*, pets(*)')
        .order('reported_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200) // Limitar resultados para evitar sobrecarga

      if (error) {
        console.error('Error cargando avistamientos:', error)
        // Si es error de red, no lanzar excepción
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
          console.warn('Problema de conexión. Verifica tu conexión a internet y las variables de entorno.')
          setSightings([])
          return
        }
        setSightings([])
        return
      }
      setSightings(data || [])
    } catch (error) {
      console.error('Error cargando avistamientos:', error)
      // Si es error de red, mostrar mensaje más claro
      if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
        console.warn('⚠️ No se pudo conectar a Supabase. Verifica:')
        console.warn('1. Tu conexión a internet')
        console.warn('2. Que el archivo .env esté configurado correctamente')
        console.warn('3. Que hayas reiniciado el servidor después de crear/editar .env')
      }
      setSightings([])
    }
  }

  const handleReportSuccess = () => {
    setShowReportModal(false)
    loadPets()
    loadSightings()
  }

  const handleMarkerClick = (pet) => {
    setSelectedPet(pet)
  }

  const handleMapClick = () => {
    setSelectedPet(null)
  }

  const onMapLoad = useCallback((map) => {
    if (!map) return
    
    mapRef.current = map
    
    // Verificar que el mapa esté completamente inicializado
    const checkAndSetReady = () => {
      if (mapRef.current && 
          typeof window !== 'undefined' && 
          window.google && 
          window.google.maps && 
          window.google.maps.Map &&
          typeof window.google.maps.Map === 'function' &&
          mapRef.current instanceof window.google.maps.Map) {
        setIsMapLoaded(true)
        setIsMapReady(true)
        return true
      }
      return false
    }
    
    // Esperar un momento para que el mapa se inicialice completamente
    setTimeout(() => {
      if (!checkAndSetReady()) {
        // Si no está listo, intentar varias veces
        let attempts = 0
        const maxAttempts = 20 // 2 segundos máximo (20 * 100ms)
        
        const interval = setInterval(() => {
          attempts++
          if (checkAndSetReady() || attempts >= maxAttempts) {
            clearInterval(interval)
          }
        }, 100)
      }
    }, 500) // Aumentar el delay inicial a 500ms
  }, [])

  // Calcular distancia
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Mascotas perdidas cercanas (solo para alertas)
  const nearbyPets = userLocation 
    ? pets.filter(pet => {
        // Solo mostrar alertas para mascotas perdidas
        if (pet.status !== 'lost') return false
        
        const latestSighting = sightings
          .filter(s => s.pet_id === pet.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        
        if (!latestSighting) return false
        
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          latestSighting.latitude,
          latestSighting.longitude
        )
        
        return distance <= 5
      })
    : []

  // Obtener color del marcador según estado (SVG personalizado más visible)
  const getMarkerIcon = (status) => {
    let color = '#3b82f6' // azul por defecto
    if (status === 'lost') color = '#ef4444' // rojo para perdido
    if (status === 'found') color = '#10b981' // verde para encontrado
    
    const svg = `
      <svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 0C10.745 0 0 10.745 0 24c0 16.292 24 40 24 40s24-23.708 24-40C48 10.745 37.255 0 24 0z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="24" cy="24" r="8" fill="#ffffff"/>
        <circle cx="24" cy="24" r="4" fill="${color}"/>
      </svg>
    `
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: window.google && window.google.maps ? new window.google.maps.Size(48, 64) : { width: 48, height: 64 },
      anchor: window.google && window.google.maps ? new window.google.maps.Point(24, 64) : { x: 24, y: 64 }
    }
  }

  // Obtener información de raza y color
  const getPetInfo = (pet) => {
    const breedName = pet.breed_id ? breedsMap[pet.breed_id] : pet.breed_custom
    const colorInfo = pet.color_id ? colorsMap[pet.color_id] : (pet.color_custom ? { name: pet.color_custom } : null)
    const speciesLabel = pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : pet.species
    return { breedName, colorInfo, speciesLabel }
  }

  if (!googleMapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Configuración Requerida</h2>
          <p className="text-gray-600 mb-4">
            Necesitas configurar tu API Key de Google Maps para usar el mapa.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-left text-sm">
            <p className="font-semibold mb-2">Pasos para configurar en Vercel:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Obtén tu API Key de <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
              <li>Ve a tu proyecto en <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Vercel</a></li>
              <li>Settings → Environment Variables</li>
              <li>Agrega: <code className="bg-gray-200 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code></li>
              <li>Pega tu API Key y selecciona Production, Preview y Development</li>
              <li>Guarda y haz "Redeploy" del proyecto</li>
            </ol>
            <p className="mt-3 text-xs text-gray-600">
              💡 Si estás en desarrollo local, agrega la key a tu archivo <code className="bg-gray-200 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {!googleMapsApiKey ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Configuración Requerida</h2>
            <p className="text-gray-600 mb-4">
              Necesitas configurar tu API Key de Google Maps para usar el mapa.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-left text-sm">
              <p className="font-semibold mb-2">Pasos para obtener tu API Key:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
                <li>Crea un proyecto o selecciona uno existente</li>
                <li>Habilita la API de Maps JavaScript</li>
                <li>Crea una credencial (API Key)</li>
                <li>Agrega la key a tu archivo .env como VITE_GOOGLE_MAPS_API_KEY</li>
              </ol>
            </div>
          </div>
        </div>
      ) : loadError ? (
        <ConnectionDiagnostic 
          supabaseConfigured={!!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)}
          googleMapsConfigured={!!googleMapsApiKey}
          googleMapsError={loadError}
        />
      ) : !isLoaded || !isMapReady || typeof window === 'undefined' || !window.google || !window.google.maps ? (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-lg">Cargando mapa...</p>
          </div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapZoom}
          options={mapOptions}
          onLoad={onMapLoad}
          onClick={handleMapClick}
        >
          {/* Círculo de radio de 5km alrededor del usuario */}
          {isMapLoaded && isMapReady && mapRef.current && userLocation && (
            <Circle
              center={userLocation}
              radius={5000}
              options={{
                fillColor: '#10b981',
                fillOpacity: 0.1,
                strokeColor: '#10b981',
                strokeOpacity: 0.5,
                strokeWeight: 2
              }}
            />
          )}

          {/* Rutas de mascotas (polilíneas) - Solo si el filtro de animales está activo */}
          {isMapLoaded && isMapReady && mapRef.current && (activeFilters.animals || activeFilters.dogs || activeFilters.cats) && Object.entries(petRoutes).map(([petId, petSightings]) => {
            if (petSightings.length < 2) return null
            
            const pet = pets.find(p => p.id === petId)
            if (!pet) return null

            // Filtrar por especie si es necesario
            if (activeFilters.dogs && !activeFilters.cats && pet.species !== 'dog') return null
            if (activeFilters.cats && !activeFilters.dogs && pet.species !== 'cat') return null

            const path = petSightings.map(s => ({
              lat: parseFloat(s.latitude),
              lng: parseFloat(s.longitude)
            }))

            return (
              <Polyline
                key={`route-${petId}`}
                path={path}
                options={{
                  strokeColor: pet.status === 'lost' ? '#ef4444' : '#10b981',
                  strokeOpacity: 0.6,
                  strokeWeight: 3
                }}
              />
            )
          })}

          {/* Marcadores de avistamientos - Solo si el filtro de animales está activo */}
          {isMapLoaded && isMapReady && mapRef.current && (activeFilters.animals || activeFilters.dogs || activeFilters.cats) && sightings.map((sighting) => {
            const pet = pets.find(p => p.id === sighting.pet_id) || sighting.pets
            if (!pet) return null

            // Filtrar por especie si es necesario
            if (activeFilters.dogs && !activeFilters.cats && pet.species !== 'dog') return null
            if (activeFilters.cats && !activeFilters.dogs && pet.species !== 'cat') return null

            const { breedName, colorInfo, speciesLabel } = getPetInfo(pet)
            
            // Obtener contacto del avistamiento
            const contactInfo = sighting.anonymous_contact || sighting.address || null
            
            // Mostrar InfoWindow solo si este avistamiento específico está seleccionado
            const shouldShowInfoWindow = selectedPet && selectedPet.id === pet.id && selectedPet.sightingId === sighting.id

            // Validar coordenadas antes de renderizar
            const lat = parseFloat(sighting.latitude)
            const lng = parseFloat(sighting.longitude)
            
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
              return null
            }
            
            return (
              <Marker
                key={`sighting-${sighting.id}`}
                position={{ lat, lng }}
                icon={getMarkerIcon(pet.status)}
                onClick={() => handleMarkerClick({ ...pet, sightingId: sighting.id })}
                onLoad={() => {
                  // Asegurar que el Marker esté completamente cargado antes de mostrar InfoWindow
                }}
              >
                  {shouldShowInfoWindow && isMapReady && (
                    <InfoWindow 
                      onCloseClick={() => setSelectedPet(null)}
                      position={{ lat, lng }}
                    >
                      <div style={{ minWidth: '280px', maxWidth: '320px' }}>
                        {/* Foto del perro */}
                        {(pet.primary_image_url || (pet.image_urls && pet.image_urls.length > 0)) && (
                          <div style={{ marginBottom: '12px' }}>
                            <img
                              src={pet.primary_image_url || pet.image_urls[0]}
                              alt={pet.name || 'Mascota'}
                              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px' }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                        
                        {/* Nombre y especie */}
                        <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', color: '#111827' }}>
                          {pet.name || 'Mascota sin nombre'}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                          {/* Especie y raza */}
                          <div>
                            <span style={{ color: '#374151', fontWeight: '500' }}>
                              {speciesLabel} {breedName ? `- ${breedName}` : ''}
                            </span>
                          </div>
                          
                          {/* Color */}
                          {colorInfo && (
                            <div>
                              <span style={{ color: '#4B5563' }}>
                                Color: {colorInfo.name}
                              </span>
                            </div>
                          )}
                          
                          {/* Indicadores de urgencia */}
                          {(pet.has_wounds || pet.condition === 'poor' || pet.condition === 'critical') && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              padding: '8px', 
                              backgroundColor: '#fee2e2', 
                              border: '1px solid #fca5a5', 
                              borderRadius: '4px' 
                            }}>
                              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️</span>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                                {pet.has_wounds ? 'Herido' : pet.condition === 'critical' ? 'Crítico' : 'Requiere atención'}
                              </span>
                            </div>
                          )}
                          
                          {/* Contacto del reporte */}
                          {contactInfo && (
                            <div style={{ paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Contacto:</p>
                              <a
                                href={contactInfo.includes('@') 
                                  ? `mailto:${contactInfo}` 
                                  : `tel:${contactInfo}`}
                                style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '600', 
                                  color: '#2563eb', 
                                  textDecoration: 'none',
                                  wordBreak: 'break-all'
                                }}
                                onMouseOver={(e) => e.target.style.color = '#1d4ed8'}
                                onMouseOut={(e) => e.target.style.color = '#2563eb'}
                              >
                                {contactInfo}
                              </a>
                            </div>
                          )}
                          
                          {/* Botón ver detalles */}
                          <button
                            onClick={() => {
                              setSelectedPet(null)
                              navigate(`/pet/${pet.id}`)
                            }}
                            style={{
                              marginTop: '12px',
                              width: '100%',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              fontSize: '14px',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontWeight: '500',
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
                          >
                            Ver detalles completos
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
              </Marker>
            )
          })}

          {/* Marcadores de ofertas comunitarias */}
          {isMapLoaded && isMapReady && mapRef.current && (activeFilters.medications || activeFilters.donations) && communityOffers.map((offer) => {
            const offerIcon = {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="18" fill="${offer.type === 'medications' ? '#8b5cf6' : '#10b981'}" stroke="#ffffff" stroke-width="2"/>
                  <text x="20" y="26" font-size="20" text-anchor="middle" fill="white">${offer.type === 'medications' ? '💊' : '💰'}</text>
                </svg>
              `),
              scaledSize: window.google && window.google.maps ? new window.google.maps.Size(40, 40) : { width: 40, height: 40 },
              anchor: window.google && window.google.maps ? new window.google.maps.Point(20, 40) : { x: 20, y: 40 }
            }

            return (
              <Marker
                key={`offer-${offer.id}`}
                position={{
                  lat: parseFloat(offer.latitude),
                  lng: parseFloat(offer.longitude)
                }}
                icon={offerIcon}
                onClick={() => {
                  // Navegar a la sección de comunidad
                  navigate(`/community?highlight=${offer.id}`)
                }}
              />
            )
          })}

          {/* Marcador especial para ubicación desde URL (cuando se navega desde tarjeta de animal) */}
          {isMapLoaded && isMapReady && highlightedLocation && (() => {
            const lat = highlightedLocation.lat
            const lng = highlightedLocation.lng
            
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              // Crear icono rojo para el marcador de ubicación desde URL
              const getLocationMarkerIcon = () => {
                try {
                  if (window.google && window.google.maps && window.google.maps.Size && window.google.maps.Point) {
                    const color = '#ef4444' // rojo
                    const svg = `
                      <svg width="48" height="64" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <filter id="shadow-location" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                          </filter>
                        </defs>
                        <path d="M24 0C10.745 0 0 10.745 0 24c0 16.292 24 40 24 40s24-23.708 24-40C48 10.745 37.255 0 24 0z" fill="${color}" stroke="#ffffff" stroke-width="2" filter="url(#shadow-location)"/>
                        <circle cx="24" cy="24" r="8" fill="#ffffff"/>
                        <circle cx="24" cy="24" r="5" fill="${color}"/>
                      </svg>
                    `
                    
                    return {
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
                      scaledSize: new window.google.maps.Size(48, 64),
                      anchor: new window.google.maps.Point(24, 64)
                    }
                  }
                } catch (error) {
                  console.warn('Error creando icono de ubicación:', error)
                  return undefined
                }
                return undefined
              }
              
              return (
                <Marker
                  key={`location-marker-${lat}-${lng}`}
                  position={{ lat, lng }}
                  icon={getLocationMarkerIcon()}
                  zIndex={2000}
                  visible={true}
                  title="Ubicación seleccionada"
                />
              )
            }
            return null
          })()}
        </GoogleMap>
      )}

      {/* Panel de filtros - Movido más abajo para no interferir con controles de Google Maps */}
      <div className="fixed top-32 left-4 z-40">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-lg p-3 transition-all flex items-center space-x-2"
            aria-label="Mostrar filtros"
          >
            <Filter size={20} />
            <span className="font-medium">Filtros</span>
          </button>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-lg p-3 transition-all flex items-center space-x-2"
            aria-label="Mostrar ayuda"
          >
            <HelpCircle size={20} />
            <span className="font-medium">Ayuda</span>
          </button>
        </div>

        {/* Panel de ayuda */}
        {showHelp && (
          <div className="mt-2 bg-white rounded-lg shadow-xl p-4 min-w-[320px] max-w-[400px] border border-gray-200 max-h-[500px] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Guía de uso</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <Dog size={16} />
                  <span>Ver animales en el mapa</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 ml-6 text-gray-600">
                  <li>Haz clic en el botón <strong>"Filtros"</strong> arriba</li>
                  <li>Selecciona qué quieres ver:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Todos los animales</strong>: Muestra perros y gatos</li>
                      <li><strong>Solo perros</strong>: Muestra únicamente perros</li>
                      <li><strong>Solo gatos</strong>: Muestra únicamente gatos</li>
                    </ul>
                  </li>
                  <li>Haz clic en <strong>"Aplicar filtros"</strong> para cargar los datos</li>
                  <li>Los marcadores aparecerán en el mapa según tu selección</li>
                </ol>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                  <Pill size={16} className="text-purple-600" />
                  <span>Ver donaciones y medicamentos</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 ml-6 text-gray-600">
                  <li>Haz clic en el botón <strong>"Filtros"</strong></li>
                  <li>En la sección <strong>"Comunidad"</strong>, selecciona:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Medicamentos</strong>: Ofertas y solicitudes de medicamentos</li>
                      <li><strong>Donaciones</strong>: Ofertas y solicitudes de donaciones</li>
                    </ul>
                  </li>
                  <li>Haz clic en <strong>"Aplicar filtros"</strong></li>
                  <li>Los marcadores morados (💊) y verdes (💰) aparecerán en el mapa</li>
                </ol>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-2">💡 Consejos</h4>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-600">
                  <li>Puedes combinar múltiples filtros (ej: perros + medicamentos)</li>
                  <li>Haz clic en un marcador para ver más información</li>
                  <li>Usa <strong>"Limpiar filtros"</strong> para ocultar todos los datos</li>
                  <li>Los datos se actualizan automáticamente cuando hay cambios</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-2 bg-white rounded-lg shadow-xl p-4 min-w-[280px] border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">¿Qué quieres ver?</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Filtros de animales */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Animales</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.animals}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          animals: e.target.checked,
                          dogs: e.target.checked ? false : prev.dogs,
                          cats: e.target.checked ? false : prev.cats
                        }))
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Todos los animales</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.dogs}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          dogs: e.target.checked,
                          animals: false
                        }))
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <Dog size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-700">Solo perros</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.cats}
                      onChange={(e) => {
                        setFilters(prev => ({
                          ...prev,
                          cats: e.target.checked,
                          animals: false
                        }))
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <Cat size={16} className="text-gray-600" />
                    <span className="text-sm text-gray-700">Solo gatos</span>
                  </label>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200 my-3"></div>

              {/* Filtros de donaciones */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase">Comunidad</p>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.medications}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, medications: e.target.checked }))
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <Pill size={16} className="text-purple-600" />
                    <span className="text-sm text-gray-700">Medicamentos</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.donations}
                      onChange={(e) => {
                        setFilters(prev => ({ ...prev, donations: e.target.checked }))
                      }}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <DollarSign size={16} className="text-green-600" />
                    <span className="text-sm text-gray-700">Donaciones</span>
                  </label>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-200 my-3"></div>

              {/* Botones de acción */}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setActiveFilters({ ...filters })
                    // Limpiar selectedPet cuando se cambian los filtros para evitar errores de InfoWindow
                    setSelectedPet(null)
                    setShowFilters(false)
                  }}
                  disabled={!Object.values(filters).some(v => v === true)}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <Check size={18} />
                  <span>Aplicar filtros</span>
                </button>

                <button
                  onClick={() => {
                    setFilters({
                      animals: false,
                      dogs: false,
                      cats: false,
                      medications: false,
                      donations: false
                    })
                    setActiveFilters({
                      animals: false,
                      dogs: false,
                      cats: false,
                      medications: false,
                      donations: false
                    })
                    // Limpiar selectedPet cuando se limpian los filtros
                    setSelectedPet(null)
                    setShowFilters(false)
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg px-4 py-2 font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  <RotateCcw size={18} />
                  <span>Limpiar filtros</span>
                </button>
              </div>

              {/* Indicador de carga */}
              {loadingData && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span>Cargando datos...</span>
                  </div>
                </div>
              )}

              {/* Mensaje si no hay filtros seleccionados */}
              {!Object.values(filters).some(v => v === true) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Selecciona al menos un filtro y haz clic en "Aplicar filtros"
                  </p>
                </div>
              )}

              {/* Indicador de filtros activos */}
              {Object.values(activeFilters).some(v => v === true) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 font-medium mb-1">Filtros activos:</p>
                  <div className="flex flex-wrap gap-1">
                    {activeFilters.animals && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Todos los animales</span>}
                    {activeFilters.dogs && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Perros</span>}
                    {activeFilters.cats && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Gatos</span>}
                    {activeFilters.medications && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Medicamentos</span>}
                    {activeFilters.donations && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Donaciones</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante de publicar - Movido hacia la izquierda para no interferir con controles de zoom */}
      <button
        onClick={() => setShowReportModal(true)}
        className="fixed bottom-8 right-24 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl transition-all transform hover:scale-110 flex items-center space-x-2"
        aria-label="Publicar"
      >
        <Plus size={24} />
        <span className="font-semibold">Publicar</span>
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

      {/* Modal de publicación */}
      {showReportModal && (
        <PublishModal
          userLocation={userLocation ? [userLocation.lat, userLocation.lng] : null}
          onClose={() => setShowReportModal(false)}
          onSuccess={handleReportSuccess}
        />
      )}

      {/* Diagnóstico de conexión */}
      <ConnectionDiagnostic />
    </div>
  )
}
