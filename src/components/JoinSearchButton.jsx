import { useState, useEffect } from 'react'
import { Users, CheckCircle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import QuickRegisterModal from './QuickRegisterModal'

export default function JoinSearchButton({ petId, userId }) {
  const [isJoined, setIsJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  useEffect(() => {
    const currentUserId = userId || localStorage.getItem('userId')
    if (petId && currentUserId) {
      checkJoinStatus(currentUserId)
    } else {
      setLoading(false)
    }
  }, [petId, userId])

  const checkJoinStatus = async (currentUserId) => {
    try {
      const { data, error } = await supabase
        .from('volunteer_assignments')
        .select('id, status')
        .eq('pet_id', petId)
        .eq('volunteer_id', currentUserId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) throw error
      setIsJoined(!!data)
    } catch (error) {
      console.error('Error verificando estado:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    // Obtener userId de localStorage o solicitar registro
    const currentUserId = userId || localStorage.getItem('userId')
    
    if (!currentUserId) {
      // Mostrar modal de registro rápido
      setShowRegisterModal(true)
      return
    }

    setJoining(true)
    try {
      const currentUserId = userId || localStorage.getItem('userId')
      const { error } = await supabase
        .from('volunteer_assignments')
        .insert({
          pet_id: petId,
          volunteer_id: currentUserId,
          status: 'active'
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('Ya estás unido a esta búsqueda')
        } else {
          throw error
        }
      } else {
        setIsJoined(true)
        alert('¡Te has unido a la búsqueda! El dueño podrá contactarte.')
      }
    } catch (error) {
      console.error('Error uniéndose a la búsqueda:', error)
      alert('Error al unirse. Intenta nuevamente.')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    setJoining(true)
    try {
      const currentUserId = userId || localStorage.getItem('userId')
      const { error } = await supabase
        .from('volunteer_assignments')
        .update({ status: 'cancelled' })
        .eq('pet_id', petId)
        .eq('volunteer_id', currentUserId)

      if (error) throw error
      
      setIsJoined(false)
      alert('Has dejado la búsqueda')
    } catch (error) {
      console.error('Error dejando la búsqueda:', error)
      alert('Error al dejar la búsqueda')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-12 w-full"></div>
    )
  }

  const handleRegisterSuccess = (newUserId) => {
    // Actualizar estado después del registro
    setIsJoined(true)
    setLoading(false)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-4">
        {isJoined ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-semibold">Estás ayudando en esta búsqueda</span>
            </div>
            <button
              onClick={handleLeave}
              disabled={joining}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <X size={18} />
              <span>Dejar búsqueda</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold"
          >
            <Users size={20} />
            <span>{joining ? 'Uniéndose...' : 'Unirme a esta búsqueda'}</span>
          </button>
        )}
      </div>

      <QuickRegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegisterSuccess}
        petId={petId}
      />
    </>
  )
}
