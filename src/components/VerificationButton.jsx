import { useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function VerificationButton({ sightingId, petId }) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState(null)

  const handleVerify = async () => {
    setIsVerifying(true)
    setError(null)

    try {
      // Incrementar contador de verificaciones
      const { data: sighting, error: fetchError } = await supabase
        .from('sightings')
        .select('verification_count')
        .eq('id', sightingId)
        .single()

      if (fetchError) throw fetchError

      const newCount = (sighting.verification_count || 0) + 1

      const { error: updateError } = await supabase
        .from('sightings')
        .update({
          verification_count: newCount,
          verified: newCount >= 2 // Se considera verificado con 2+ confirmaciones
        })
        .eq('id', sightingId)

      if (updateError) throw updateError

      setVerified(true)
    } catch (error) {
      console.error('Error verificando:', error)
      setError('Error al verificar. Intenta nuevamente.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-lg mb-3 flex items-center space-x-2">
        <CheckCircle size={20} className="text-primary-600" />
        <span>Verificación Comunitaria</span>
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        ¿Confirmas que esta mascota sigue en esta ubicación? Tu verificación ayuda a mantener el historial actualizado.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {verified ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center space-x-2">
          <CheckCircle size={18} />
          <span className="font-medium">¡Gracias por tu verificación!</span>
        </div>
      ) : (
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="btn-primary w-full disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          <CheckCircle size={20} />
          <span>{isVerifying ? 'Verificando...' : 'Confirmar Ubicación'}</span>
        </button>
      )}
    </div>
  )
}
