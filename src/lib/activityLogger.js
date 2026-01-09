import { supabase } from './supabase'

/**
 * Registra una actividad en el historial del sistema
 * @param {string} actionType - Tipo de acción ('create_pet', 'update_pet', etc.)
 * @param {string} entityType - Tipo de entidad ('pet', 'sighting', etc.)
 * @param {string|null} entityId - ID de la entidad afectada
 * @param {object|null} details - Detalles adicionales
 */
export async function logActivity(actionType, entityType, entityId = null, details = null) {
  try {
    const userId = localStorage.getItem('userId')
    
    // Obtener información del navegador si está disponible
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
    
    await supabase.rpc('log_activity', {
      p_user_id: userId,
      p_action_type: actionType,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_details: details
    })
  } catch (error) {
    // No fallar si el logging falla, solo registrar en consola
    console.warn('Error registrando actividad:', error)
  }
}
