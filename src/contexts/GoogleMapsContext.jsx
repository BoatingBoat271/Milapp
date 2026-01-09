import { createContext, useContext, useState, useEffect } from 'react'
import { LoadScript } from '@react-google-maps/api'

const GoogleMapsContext = createContext(null)

export function GoogleMapsProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    // Verificar si Google Maps ya está cargado
    const checkGoogleMaps = () => {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        setIsLoaded(true)
      }
    }
    
    checkGoogleMaps()
    // Verificar periódicamente hasta que esté cargado (máximo 10 segundos)
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && window.google && window.google.maps) {
        setIsLoaded(true)
        clearInterval(interval)
      }
    }, 100)
    
    const timeout = setTimeout(() => {
      clearInterval(interval)
    }, 10000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  const handleLoad = () => {
    // Esperar más tiempo antes de verificar para dar tiempo a que Google Maps se inicialice completamente
    // El error 'Cannot read properties of undefined' ocurre cuando intentamos acceder a propiedades
    // antes de que Google Maps esté completamente inicializado
    setTimeout(() => {
      // Esperar a que Google Maps esté completamente inicializado
      const checkAndSetLoaded = () => {
        try {
          if (typeof window !== 'undefined' && 
              window.google && 
              window.google.maps && 
              window.google.maps.Map &&
              typeof window.google.maps.Map === 'function' &&
              window.google.maps.event &&
              window.google.maps.marker && // Verificar que AdvancedMarkerElement esté disponible
              window.google.maps.geometry) { // Verificar que geometry esté disponible
            setIsLoaded(true)
            setLoadError(null)
            return true
          }
        } catch (error) {
          // Silenciar errores durante la verificación inicial
          return false
        }
        return false
      }
      
      // Intentar inmediatamente
      if (!checkAndSetLoaded()) {
        // Si no está listo, esperar con múltiples intentos
        let attempts = 0
        const maxAttempts = 100 // 10 segundos máximo (100 * 100ms)
        
        const interval = setInterval(() => {
          attempts++
          if (checkAndSetLoaded() || attempts >= maxAttempts) {
            clearInterval(interval)
            if (attempts >= maxAttempts) {
              console.warn('Google Maps no se cargó completamente después de 10 segundos')
              // No establecer error, solo advertir - puede que aún funcione
            }
          }
        }, 100)
      }
    }, 1000) // Aumentar a 1 segundo para dar más tiempo a la inicialización
  }

  const handleError = (error) => {
    console.error('Error cargando Google Maps:', error)
    setLoadError(error)
  }

  // Si no hay API key, no cargar nada
  if (!googleMapsApiKey) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: 'API Key no configurada', googleMapsApiKey: '' }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  // Si ya está cargado, no usar LoadScript (evitar cargas múltiples)
  if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Map) {
    // Asegurarse de que isLoaded esté en true si ya está cargado
    if (!isLoaded) {
      setIsLoaded(true)
    }
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: true, loadError: null, googleMapsApiKey }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  // Verificar si ya hay un script de Google Maps cargándose o cargado
  const existingScript = typeof document !== 'undefined' 
    ? document.querySelector('script[src*="maps.googleapis.com"], script[id="google-maps-script-loader"]')
    : null

  // Si ya hay un script cargado, no crear otro LoadScript
  if (existingScript) {
    // Esperar a que se cargue si aún no está listo
    if (!isLoaded) {
      // Usar un efecto para verificar periódicamente si ya está cargado
      return (
        <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: null, googleMapsApiKey }}>
          <GoogleMapsLoaderChecker>
            {children}
          </GoogleMapsLoaderChecker>
        </GoogleMapsContext.Provider>
      )
    }
    // Si ya está cargado, retornar el provider directamente
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: true, loadError: null, googleMapsApiKey }}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  return (
    <LoadScript
      googleMapsApiKey={googleMapsApiKey}
      libraries={["places"]}
      onLoad={handleLoad}
      onError={handleError}
      loadingElement={
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-lg">Cargando Google Maps...</p>
          </div>
        </div>
      }
      // Prevenir cargas múltiples
      id="google-maps-script-loader"
    >
      <GoogleMapsContext.Provider value={{ isLoaded, loadError, googleMapsApiKey }}>
        {children}
      </GoogleMapsContext.Provider>
    </LoadScript>
  )
}

// Componente auxiliar para verificar periódicamente si Google Maps ya está cargado
function GoogleMapsLoaderChecker({ children }) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkReady = () => {
      if (typeof window !== 'undefined' && 
          window.google && 
          window.google.maps && 
          window.google.maps.Map &&
          typeof window.google.maps.Map === 'function') {
        setIsReady(true)
        return true
      }
      return false
    }

    if (checkReady()) {
      return
    }

    const interval = setInterval(() => {
      if (checkReady()) {
        clearInterval(interval)
      }
    }, 200)

    const timeout = setTimeout(() => {
      clearInterval(interval)
      // Intentar una última vez
      checkReady()
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-lg">Cargando Google Maps...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext)
  if (!context) {
    throw new Error('useGoogleMaps debe usarse dentro de GoogleMapsProvider')
  }
  return context
}
