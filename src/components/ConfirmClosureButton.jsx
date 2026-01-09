import { useState, useEffect } from 'react'
import { CheckCircle, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ConfirmClosureButton({ petId, userId }) {
  const [closure, setClosure] = useState(null)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (petId) {
      loadClosure()
    }
  }, [petId])

  const loadClosure = async () => {
    try {
      // Cargar cierre del caso
      const { data: closureData, error: closureError } = await supabase
        .from('case_closures')
        .select('*')
        .eq('pet_id', petId)
        .maybeSingle()

      if (closureError) throw closureError
      
      if (closureData) {
        setClosure(closureData)

        // Verificar si el usuario ya confirmó
        if (userId) {
          const { data: confirmation, error: confError } = await supabase
            .from('closure_confirmations')
            .select('id')
            .eq('closure_id', closureData.id)
            .eq('confirmed_by', userId)
            .maybeSingle()

          if (confError) throw confError
          setHasConfirmed(!!confirmation)
        }
      }
    } catch (error) {
      console.error('Error cargando cierre:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!userId) {
      alert('Debes iniciar sesión para confirmar')
      return
    }

    if (!closure) return

    setConfirming(true)
    try {
      const { error } = await supabase
        .from('closure_confirmations')
        .insert({
          closure_id: closure.id,
          confirmed_by: userId
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint
          alert('Ya has confirmado este cierre')
        } else {
          throw error
        }
        return
      }

      setHasConfirmed(true)
      // Recargar para obtener el nuevo contador
      loadClosure()
      alert('¡Gracias por confirmar!')
    } catch (error) {
      console.error('Error confirmando cierre:', error)
      alert('Error al confirmar. Intenta nuevamente.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-24 w-full"></div>
    )
  }

  if (!closure) {
    return null // No hay cierre para confirmar
  }

  const isVerified = closure.is_verified
  const needsMore = 2 - (closure.verification_count || 0)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-4">
        <CheckCircle className={isVerified ? 'text-green-600' : 'text-yellow-600'} size={20} />
        <h3 className="text-lg font-semibold text-gray-900">
          Confirmación de Cierre
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users size={16} />
          <span>
            {closure.verification_count || 0} de 2 confirmaciones requeridas
          </span>
        </div>

        {isVerified ? (
          <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800">
            <div className="flex items-center space-x-2">
              <CheckCircle size={18} />
              <span className="font-semibold">Caso cerrado y verificado</span>
            </div>
            {closure.verified_at && (
              <p className="text-sm mt-1">
                Verificado el {new Date(closure.verified_at).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-yellow-800 text-sm">
              <p>
                Se necesitan {needsMore} confirmación{needsMore !== 1 ? 'es' : ''} más para verificar el cierre.
              </p>
            </div>

            {!hasConfirmed ? (
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <CheckCircle size={18} />
                <span>{confirming ? 'Confirmando...' : 'Confirmar Cierre'}</span>
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-800 text-sm">
                <p>Ya has confirmado este cierre.</p>
              </div>
            )}
          </>
        )}

        {closure.closure_reason && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Motivo del cierre:</p>
            <p className="text-gray-700">{closure.closure_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}
