import { useState, useEffect } from 'react'
import { AlertCircle, X, Bell } from 'lucide-react'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { useNavigate } from 'react-router-dom'

export default function ProximityAlerts({ pets, userLocation, breedsMap, colorsMap }) {
  const [alerts, setAlerts] = useState([])
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    // Solicitar permiso para notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Filtrar solo mascotas perdidas (lost) para las alertas
    const lostPets = pets.filter(pet => pet.status === 'lost')
    
    // Crear alertas solo para mascotas perdidas cercanas
    const newAlerts = lostPets.map(pet => ({
      id: pet.id,
      pet,
      message: `¡${pet.name || 'Una mascota perdida'} está cerca de tu ubicación!`,
      timestamp: new Date()
    }))

    setAlerts(newAlerts)

    // Mostrar notificaciones del navegador
    if (Notification.permission === 'granted') {
      newAlerts.forEach(alert => {
        new Notification(alert.message, {
          body: `Mascota ${alert.pet.status === 'lost' ? 'perdida' : 'avistada'} cerca de ti`,
          icon: '/pwa-192x192.png',
          tag: `pet-${alert.id}`,
          requireInteraction: false
        })
      })
    }
  }, [pets])

  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (visibleAlerts.length === 0) return null

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {visibleAlerts.map(alert => (
        <div
          key={alert.id}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-lg animate-slide-in"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <Bell className="text-yellow-600 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 mb-1">
                  {alert.message}
                </h4>
                <p className="text-sm text-yellow-700 mb-2">
                  {alert.pet.species === 'dog' ? 'Perro' : alert.pet.species === 'cat' ? 'Gato' : alert.pet.species}
                  {' '}
                  {(() => {
                    const breedName = alert.pet.breed_id 
                      ? breedsMap[alert.pet.breed_id] 
                      : alert.pet.breed_custom
                    return breedName ? `- ${breedName}` : ''
                  })()}
                </p>
                <p className="text-xs text-yellow-600">
                  {format(alert.timestamp, "HH:mm", { locale: es })}
                </p>
                <button
                  onClick={() => navigate(`/pet/${alert.pet.id}`)}
                  className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
                >
                  Ver detalles
                </button>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-yellow-600 hover:text-yellow-800 ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
