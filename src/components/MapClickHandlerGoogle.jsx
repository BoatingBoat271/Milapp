import { useEffect, useState, useRef } from 'react'
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api'
import { Search, MapPin, Navigation } from 'lucide-react'
import { reverseGeocode, geocode, validateCoordinates } from '../lib/geocoding'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'

const mapContainerStyle = {
  width: '100%',
  height: '100%'
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false
}

export default function MapClickHandlerGoogle({ initialPosition, onLocationSelect, showSearch = true }) {
  // Inicializar posición - siempre tener una posición por defecto para mostrar el pin
  const getInitialPos = () => {
    if (initialPosition) {
      return {
        lat: Array.isArray(initialPosition) ? initialPosition[0] : initialPosition.lat,
        lng: Array.isArray(initialPosition) ? initialPosition[1] : initialPosition.lng
      }
    }
    // Si no hay posición inicial, usar el centro de Chile por defecto
    return { lat: -37.4697, lng: -72.3537 }
  }
  
  const [position, setPosition] = useState(getInitialPos())
  const [hasUserMovedPin, setHasUserMovedPin] = useState(false)
  const [hasSelectedLocation, setHasSelectedLocation] = useState(!!initialPosition) // Inicializar con true si hay initialPosition
  const [mapReady, setMapReady] = useState(false)
  const markerRef = useRef(null) // Referencia al marcador nativo de Google Maps
  
  // Actualizar posición cuando cambia initialPosition
  useEffect(() => {
    if (initialPosition) {
      const newPos = {
        lat: Array.isArray(initialPosition) ? initialPosition[0] : initialPosition.lat,
        lng: Array.isArray(initialPosition) ? initialPosition[1] : initialPosition.lng
      }
      if (validateCoordinates(newPos.lat, newPos.lng)) {
        setPosition(newPos)
        setHasSelectedLocation(true) // Marcar que hay una ubicación cuando viene del padre
        console.log('📍 Ubicación establecida desde initialPosition:', newPos, 'hasSelectedLocation:', true)
        // Centrar el mapa en la nueva posición
        if (mapRef.current) {
          mapRef.current.panTo(newPos)
          mapRef.current.setZoom(17)
        }
      }
    } else {
      // Si no hay initialPosition, resetear hasSelectedLocation solo si el usuario no ha interactuado
      if (!hasUserMovedPin) {
        setHasSelectedLocation(false)
      }
    }
  }, [initialPosition, hasUserMovedPin])
  const [address, setAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [coordinates, setCoordinates] = useState('')
  const autocompleteRef = useRef(null)
  const mapRef = useRef(null)
  const geocodeTimeoutRef = useRef(null)
  const lastGeocodedPositionRef = useRef(null)
  const { isLoaded: isGoogleMapsLoaded, loadError, googleMapsApiKey } = useGoogleMaps()

  const updateAddressFromCoordinates = async (lat, lng, immediate = false) => {
    if (!validateCoordinates(lat, lng)) return
    
    // Evitar geocodificar la misma posición múltiples veces
    const positionKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (lastGeocodedPositionRef.current === positionKey && !immediate) {
      return
    }
    
    // Limpiar timeout anterior si existe
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current)
    }
    
    // Actualizar coordenadas inmediatamente
    setCoordinates(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    
    // Usar debounce para evitar múltiples llamadas
    const geocodeFunction = async () => {
      setLoadingAddress(true)
      lastGeocodedPositionRef.current = positionKey
      
      try {
        const addr = await reverseGeocode(lat, lng)
        setAddress(addr || '')
      } catch (error) {
        // Solo mostrar error si no es un error de recursos insuficientes (muchas llamadas)
        if (!error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
          console.error('Error obteniendo dirección:', error)
        }
        setAddress('')
      } finally {
        setLoadingAddress(false)
      }
    }
    
    if (immediate) {
      geocodeFunction()
    } else {
      // Debounce de 500ms para evitar múltiples llamadas
      geocodeTimeoutRef.current = setTimeout(geocodeFunction, 500)
    }
  }

  const handleMapClick = (e) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      }
      if (validateCoordinates(newPosition.lat, newPosition.lng)) {
        setPosition(newPosition)
        setHasUserMovedPin(true)
        setHasSelectedLocation(true) // Marcar que hay una ubicación seleccionada
        updateAddressFromCoordinates(newPosition.lat, newPosition.lng, true) // Inmediato para mejor UX
        onLocationSelect(newPosition.lat, newPosition.lng)
        
        // Centrar el mapa en la nueva posición
        if (mapRef.current) {
          mapRef.current.panTo(newPosition)
        }
      }
    }
  }

  const handleMarkerDragEnd = (e) => {
    if (e.latLng) {
      const newPosition = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      }
      if (validateCoordinates(newPosition.lat, newPosition.lng)) {
        setPosition(newPosition)
        setHasUserMovedPin(true)
        setHasSelectedLocation(true)
        updateAddressFromCoordinates(newPosition.lat, newPosition.lng, true)
        onLocationSelect(newPosition.lat, newPosition.lng)
      }
    }
  }
  
  // Actualizar posición desde el componente padre (solo si el usuario no ha movido el pin)
  useEffect(() => {
    if (initialPosition && !hasUserMovedPin) {
      const newPos = {
        lat: Array.isArray(initialPosition) ? initialPosition[0] : initialPosition.lat,
        lng: Array.isArray(initialPosition) ? initialPosition[1] : initialPosition.lng
      }
      if (validateCoordinates(newPos.lat, newPos.lng)) {
        // Solo actualizar si la posición realmente cambió
        const currentKey = position ? `${position.lat.toFixed(4)},${position.lng.toFixed(4)}` : null
        const newKey = `${newPos.lat.toFixed(4)},${newPos.lng.toFixed(4)}`
        
        if (currentKey !== newKey) {
          setPosition(newPos)
          updateAddressFromCoordinates(newPos.lat, newPos.lng, false)
          onLocationSelect(newPos.lat, newPos.lng)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPosition, hasUserMovedPin])

  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace()
      if (place.geometry) {
        const newPosition = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }
        setPosition(newPosition)
        setHasUserMovedPin(true)
        setHasSelectedLocation(true)
        setAddress(place.formatted_address)
        setCoordinates(`${newPosition.lat.toFixed(6)}, ${newPosition.lng.toFixed(6)}`)
        onLocationSelect(newPosition.lat, newPosition.lng)
        
        // Centrar mapa en la nueva ubicación
        if (mapRef.current) {
          mapRef.current.panTo(newPosition)
          mapRef.current.setZoom(17)
        }
      }
    }
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          setPosition(newPosition)
          setHasUserMovedPin(true)
          setHasSelectedLocation(true)
          updateAddressFromCoordinates(newPosition.lat, newPosition.lng, true)
          onLocationSelect(newPosition.lat, newPosition.lng)
          
          if (mapRef.current) {
            mapRef.current.panTo(newPosition)
            mapRef.current.setZoom(17)
          }
        },
        (error) => {
          alert('No se pudo obtener tu ubicación. Por favor, selecciona una ubicación en el mapa.')
        }
      )
    }
  }

  const handleMapLoad = (map) => {
    mapRef.current = map
    
    // Marcar el mapa como listo inmediatamente - no esperar a todas las APIs
    // El marcador se renderizará cuando esté disponible
    setMapReady(true)
    
    // Crear marcador nativo de Google Maps si hay una ubicación seleccionada
    if (position && hasSelectedLocation && window.google && window.google.maps && window.google.maps.Marker) {
      createNativeMarker(map, position)
    }
    
    // Esperar un poco antes de centrar para asegurar que el mapa esté completamente renderizado
    setTimeout(() => {
      try {
        // Centrar el mapa en la posición del pin
        if (position && map) {
          map.panTo(position)
          map.setZoom(17)
        }
        
        // Solo actualizar dirección una vez cuando el mapa se carga, y solo si no se ha geocodificado antes
        if (position && !lastGeocodedPositionRef.current && hasSelectedLocation) {
          updateAddressFromCoordinates(position.lat, position.lng, true)
        }
      } catch (error) {
        console.warn('Error al centrar mapa:', error)
      }
    }, 300)
  }
  
  // Función para crear marcador nativo de Google Maps
  const createNativeMarker = (map, pos) => {
    try {
      // Eliminar marcador anterior si existe
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      
      // Crear nuevo marcador
      markerRef.current = new window.google.maps.Marker({
        position: pos,
        map: map,
        draggable: true,
        title: 'Arrastra para mover la ubicación',
        zIndex: 1000
      })
      
      // Agregar listener para cuando se arrastra
      markerRef.current.addListener('dragend', (e) => {
        if (e.latLng) {
          const newPosition = {
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
          }
          setPosition(newPosition)
          setHasUserMovedPin(true)
          setHasSelectedLocation(true)
          updateAddressFromCoordinates(newPosition.lat, newPosition.lng, true)
          onLocationSelect(newPosition.lat, newPosition.lng)
        }
      })
      
      console.log('✅ Marcador nativo creado exitosamente en:', pos)
    } catch (error) {
      console.error('❌ Error creando marcador nativo:', error)
    }
  }
  
  // Actualizar marcador cuando cambia la posición
  useEffect(() => {
    if (mapReady && mapRef.current && position && hasSelectedLocation && window.google && window.google.maps && window.google.maps.Marker) {
      if (!markerRef.current) {
        // Crear marcador si no existe
        createNativeMarker(mapRef.current, position)
      } else {
        // Actualizar posición del marcador existente
        markerRef.current.setPosition(position)
      }
    }
  }, [position, hasSelectedLocation, mapReady])
  
  // Limpiar marcador al desmontar
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
    }
  }, [])
  
  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [])

  if (!googleMapsApiKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500 text-sm p-4">
        <div className="text-center">
          <p className="mb-2">Configura VITE_GOOGLE_MAPS_API_KEY en .env</p>
          <p className="text-xs text-gray-400">Reinicia el servidor después de agregar la key</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 text-red-700 text-sm p-4">
        <div className="text-center">
          <p className="mb-2 font-semibold">Error al cargar el mapa</p>
          <p className="text-xs">{loadError}</p>
          <p className="text-xs mt-2 text-gray-600">Abre la consola del navegador (F12) para más detalles</p>
        </div>
      </div>
    )
  }

  if (!isGoogleMapsLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  return <MapContent />

  function MapContent() {
    return (
      <div className="relative w-full h-full" style={{ minHeight: '100%' }}>
        {/* Panel de información - Solo mostrar si showSearch es true */}
        {showSearch && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-md">
            <div className="space-y-3">
              {/* Búsqueda de direcciones - Solo si showSearch es true y las librerías están cargadas */}
              {showSearch && isGoogleMapsLoaded && window.google && window.google.maps && window.google.maps.places && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      autocompleteRef.current = autocomplete
                    }}
                    onPlaceChanged={handlePlaceSelect}
                    options={{
                      componentRestrictions: { country: 'cl' }, // Restringir a Chile
                      fields: ['formatted_address', 'geometry']
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Buscar dirección..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </Autocomplete>
                </div>
              )}

              {/* Botón de ubicación actual - Solo si showSearch es true */}
              {showSearch && (
                <button
                  onClick={handleUseCurrentLocation}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Navigation size={18} />
                  <span>Usar mi ubicación</span>
                </button>
              )}

              {/* Información de coordenadas y dirección */}
              {position && (
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-start space-x-2">
                    <MapPin className="text-primary-600 mt-0.5" size={18} />
                    <div className="flex-1 min-w-0">
                      {loadingAddress ? (
                        <p className="text-sm text-gray-500">Obteniendo dirección...</p>
                      ) : address ? (
                        <p className="text-sm text-gray-700 font-medium">{address}</p>
                      ) : (
                        <p className="text-sm text-gray-500">Dirección no disponible</p>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded">
                    {coordinates}
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Haz clic en el mapa o arrastra el pin para ajustar la ubicación
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <GoogleMap
          mapContainerStyle={{ ...mapContainerStyle, minHeight: '100%' }}
          center={position || { lat: -37.4697, lng: -72.3537 }}
          zoom={position ? 17 : 13}
          options={{
            ...mapOptions,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: 'greedy',
            cursor: 'crosshair' // Cambiar cursor para indicar que se puede hacer clic
          }}
          onClick={handleMapClick}
          onLoad={handleMapLoad}
        >
          {/* El marcador ahora se crea usando la API nativa de Google Maps en handleMapLoad y useEffect */}
        </GoogleMap>
      </div>
    )
  }
}
