/**
 * Utilidades para geocodificación usando Google Maps API
 */

/**
 * Convierte coordenadas (lat, lng) en una dirección legible
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {Promise<string>} Dirección formateada
 */
export async function reverseGeocode(lat, lng) {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API Key no configurada')
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=es`
    )
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.results.length > 0) {
      // Priorizar resultados más específicos
      const result = data.results.find(r => r.types.includes('street_address')) || data.results[0]
      return result.formatted_address
    }
    
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    console.error('Error en geocodificación inversa:', error)
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

/**
 * Convierte una dirección en coordenadas (geocodificación directa)
 * @param {string} address - Dirección a buscar
 * @returns {Promise<{lat: number, lng: number, address: string} | null>}
 */
export async function geocode(address) {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API Key no configurada')
      return null
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=es`
    )
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address
      }
    }
    
    return null
  } catch (error) {
    console.error('Error en geocodificación:', error)
    return null
  }
}

/**
 * Valida que las coordenadas sean válidas
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {boolean}
 */
export function validateCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}
