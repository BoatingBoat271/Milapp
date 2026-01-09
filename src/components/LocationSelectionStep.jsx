import { useState, useEffect, useCallback, useRef } from 'react'
import { X, MapPin, Navigation, Check, Loader2 } from 'lucide-react'
import MapClickHandlerGoogle from './MapClickHandlerGoogle'
import { useGoogleMaps } from '../contexts/GoogleMapsContext'
import { reverseGeocode } from '../lib/geocoding'

export default function LocationSelectionStep({ type, userLocation, onClose, onLocationSelected }) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const watchIdRef = useRef(null)
  const { isLoaded } = useGoogleMaps()

  const typeLabels = {
    'pet': 'Mascota',
    'foster': 'Casa de Acogida',
    'medications': 'Medicamentos',
    'donations': 'Donaciones'
  }

  const handleLocationSelect = useCallback(async (lat, lng) => {
    const location = [lat, lng]
    setSelectedLocation(location)
    // Obtener dirección automáticamente
    try {
      const addr = await reverseGeocode(lat, lng)
      setAddress(addr || '')
    } catch (error) {
      console.error('Error obteniendo dirección:', error)
      setAddress('')
    }
  }, [])
  
  // Resetear selectedLocation cuando se abre el modal sin ubicación previa
  useEffect(() => {
    if (!userLocation) {
      setSelectedLocation(null)
      setAddress('')
    }
  }, [userLocation])

  const handleContinue = () => {
    if (selectedLocation) {
      onLocationSelected(selectedLocation)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización.')
      return
    }

    setIsGettingLocation(true)
    setIsCalibrating(true)
    
    // Usar watchPosition para obtener actualizaciones continuas y encontrar la ubicación más precisa
    const options = {
      enableHighAccuracy: true, // Usar GPS de alta precisión
      timeout: 10000, // Timeout de 10 segundos
      maximumAge: 0 // No usar caché, siempre obtener nueva ubicación
    }

    let bestPosition = null
    let bestAccuracy = Infinity
    let updateCount = 0

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        updateCount++
        const accuracy = position.coords.accuracy // Precisión en metros
        const location = [position.coords.latitude, position.coords.longitude]

        // Si esta posición es más precisa que la anterior, actualizarla
        if (accuracy < bestAccuracy) {
          bestAccuracy = accuracy
          bestPosition = position
          setLocationAccuracy(accuracy)
          // Actualizar la ubicación seleccionada inmediatamente
          setSelectedLocation(location)
          handleLocationSelect(location[0], location[1])
        }

        // Si la precisión es muy buena (menos de 10 metros) o han pasado suficientes actualizaciones, fijar la ubicación
        if (accuracy <= 10 || updateCount >= 5) {
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
          }
          setIsCalibrating(false)
          setIsGettingLocation(false)
          
          // Usar la mejor posición encontrada
          if (bestPosition) {
            const finalLocation = [bestPosition.coords.latitude, bestPosition.coords.longitude]
            setSelectedLocation(finalLocation)
            handleLocationSelect(finalLocation[0], finalLocation[1])
          }
        }
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error)
        setIsGettingLocation(false)
        setIsCalibrating(false)
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
        
        let errorMessage = 'No se pudo obtener tu ubicación actual. Por favor, selecciona en el mapa.'
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Permiso de ubicación denegado. Por favor, selecciona en el mapa.'
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Ubicación no disponible. Por favor, selecciona en el mapa.'
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Tiempo de espera agotado. Por favor, selecciona en el mapa.'
        }
        alert(errorMessage)
      },
      options
    )

    // Timeout de seguridad: después de 15 segundos, usar la mejor ubicación encontrada
    setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsCalibrating(false)
      setIsGettingLocation(false)
      
      if (bestPosition) {
        const finalLocation = [bestPosition.coords.latitude, bestPosition.coords.longitude]
        setSelectedLocation(finalLocation)
        handleLocationSelect(finalLocation[0], finalLocation[1])
      }
    }, 15000)
  }

  // Limpiar watchPosition al desmontar el componente
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full md:max-w-6xl md:max-h-[95vh] md:h-auto overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-3 md:py-4 flex justify-between items-center z-10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">Seleccionar Ubicación</h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Haz clic en el mapa con el mouse para seleccionar la ubicación donde quieres publicar tu {typeLabels[type]?.toLowerCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors ml-2 flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 relative min-h-[400px] max-h-[60vh] bg-gray-100">
          {isLoaded ? (
            <div className="absolute inset-0">
              <MapClickHandlerGoogle
                initialPosition={selectedLocation ? { lat: selectedLocation[0], lng: selectedLocation[1] } : null}
                onLocationSelect={handleLocationSelect}
                showSearch={false}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Cargando mapa...</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border-t px-4 md:px-6 py-3 md:py-4 space-y-3 md:space-y-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              {isCalibrating ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin text-primary-600" size={18} />
                    <p className="text-sm font-medium text-primary-600">Calibrando GPS...</p>
                  </div>
                  {locationAccuracy !== null && (
                    <p className="text-xs text-gray-500">
                      Precisión: {locationAccuracy.toFixed(0)} metros
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Moviendo el pin para obtener la ubicación más precisa...
                  </p>
                </div>
              ) : selectedLocation ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                    <span>📍 Ubicación seleccionada:</span>
                  </p>
                  <p className="text-xs text-gray-500 font-mono break-all">
                    {selectedLocation[0].toFixed(6)}, {selectedLocation[1].toFixed(6)}
                  </p>
                  {address && (
                    <p className="text-sm text-gray-600 break-words">{address}</p>
                  )}
                  {locationAccuracy !== null && (
                    <p className="text-xs text-gray-500">
                      Precisión: {locationAccuracy.toFixed(0)} metros
                    </p>
                  )}
                  <p className="text-xs text-green-600 font-medium mt-1">
                    ✓ El marcador rojo debería aparecer en el mapa
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    📍 Haz clic en el mapa con el mouse para seleccionar la ubicación
                  </p>
                  <p className="text-xs text-gray-500">
                    El marcador aparecerá donde hagas clic
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation || isCalibrating}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center space-x-2 whitespace-nowrap"
            >
              {isGettingLocation || isCalibrating ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span className="text-sm md:text-base">Calibrando...</span>
                </>
              ) : (
                <>
                  <Navigation size={18} />
                  <span className="text-sm md:text-base">Usar mi ubicación</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5"
            >
              Cancelar
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedLocation}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 py-2.5 font-semibold"
            >
              <Check size={18} />
              <span>Seleccionar esta ubicación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
