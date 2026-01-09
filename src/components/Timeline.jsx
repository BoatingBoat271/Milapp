import { MapPin, Clock, CheckCircle, Camera, Image as ImageIcon, AlertCircle, Home } from 'lucide-react'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function Timeline({ pet, sightings = [], evidenceClues = [], caseClosures = [] }) {
  // Crear evento de "Mascota perdida" si existe información
  const lostEvent = pet && pet.status === 'lost' && pet.lost_at ? {
    id: `lost-${pet.id}`,
    type: 'lost',
    lost_at: pet.lost_at,
    lost_latitude: pet.lost_latitude,
    lost_longitude: pet.lost_longitude,
    lost_address: pet.lost_address,
    created_at: pet.lost_at
  } : null

  // Crear eventos de cierre de caso
  const closureEvents = caseClosures.map(closure => ({
    ...closure,
    type: 'closure',
    created_at: closure.closure_date || closure.created_at
  }))

  // Combinar y ordenar todos los eventos por fecha (más antiguo primero para mostrar el flujo cronológico)
  const allEvents = [
    lostEvent,
    ...sightings.map(s => ({ ...s, type: 'sighting' })),
    ...evidenceClues.map(c => ({ ...c, type: 'clue' })),
    ...closureEvents
  ]
    .filter(Boolean) // Eliminar nulls
    .sort((a, b) => new Date(a.created_at || a.lost_at || a.closure_date) - new Date(b.created_at || b.lost_at || b.closure_date))

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay avistamientos o pistas registradas aún</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-200"></div>

      <div className="space-y-6">
        {allEvents.map((event, index) => {
          const isClue = event.type === 'clue'
          const isLost = event.type === 'lost'
          const isClosure = event.type === 'closure'
          
          // Contar avistamientos para numeración
          const sightingCount = allEvents.filter(e => e.type === 'sighting').length
          const currentSightingIndex = allEvents.slice(0, index + 1).filter(e => e.type === 'sighting').length
          
          return (
            <div key={`${event.type}-${event.id}`} className="relative flex items-start space-x-4">
              {/* Punto en la línea */}
              <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full text-white shadow-lg ${
                isClue ? 'bg-purple-600' : 
                isLost ? 'bg-red-600' :
                isClosure ? 'bg-green-600' :
                'bg-primary-600'
              }`}>
                {isClue ? <Camera size={24} /> : 
                 isLost ? <AlertCircle size={24} /> :
                 isClosure ? <Home size={24} /> :
                 <MapPin size={24} />}
              </div>

              {/* Contenido */}
              <div className={`flex-1 rounded-lg shadow-md p-6 ml-4 ${
                isClue ? 'bg-purple-50 border-2 border-purple-200' : 
                isLost ? 'bg-red-50 border-2 border-red-200' :
                isClosure ? 'bg-green-50 border-2 border-green-200' :
                'bg-white'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {isLost ? '🚨 Mascota Perdida' :
                         isClosure ? '✅ Caso Cerrado' :
                         isClue ? 'Pista con Evidencia' : 
                         `Avistamiento #${currentSightingIndex}`}
                      </h3>
                      {isClue && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          Con evidencia
                        </span>
                      )}
                      {isClosure && event.is_verified && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Verificado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock size={14} />
                      <span>
                        {format(new Date(event.created_at || event.lost_at || event.closure_date), "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                  </div>
                  {event.verified && !isClosure && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Verificado</span>
                    </div>
                  )}
                </div>

                {/* Contenido específico para evento de pérdida */}
                {isLost && (
                  <>
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">Ubicación donde desapareció</p>
                      {event.lost_latitude && event.lost_longitude ? (
                        <p className="text-gray-700 font-mono text-sm">
                          {parseFloat(event.lost_latitude).toFixed(6)}, {parseFloat(event.lost_longitude).toFixed(6)}
                        </p>
                      ) : null}
                      {event.lost_address && (
                        <p className="text-gray-600 text-sm mt-1">{event.lost_address}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Contenido específico para cierre de caso */}
                {isClosure && (
                  <>
                    {event.closure_reason && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-1">Razón del cierre</p>
                        <p className="text-gray-700">{event.closure_reason}</p>
                      </div>
                    )}
                    {event.thank_you_message && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-500 mb-1">Mensaje de agradecimiento</p>
                        <p className="text-gray-700 italic">{event.thank_you_message}</p>
                      </div>
                    )}
                  </>
                )}

                {isClue && event.description && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">Descripción</p>
                    <p className="text-gray-700">{event.description}</p>
                  </div>
                )}

                {!isClue && event.notes && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">Notas</p>
                    <p className="text-gray-700">{event.notes}</p>
                  </div>
                )}

                {/* Mostrar imagen del avistamiento si existe */}
                {!isClue && event.image_url && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-2">Foto del avistamiento</p>
                    <a
                      href={event.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={event.image_url}
                        alt="Avistamiento"
                        className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-primary-400 transition-colors"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </a>
                  </div>
                )}

                {/* Ubicación (solo para avistamientos y pistas, no para pérdida o cierre) */}
                {!isLost && !isClosure && event.latitude && event.longitude && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">Ubicación</p>
                    <p className="text-gray-700 font-mono text-sm">
                      {parseFloat(event.latitude).toFixed(6)}, {parseFloat(event.longitude).toFixed(6)}
                    </p>
                    {event.address && (
                      <p className="text-gray-600 text-sm mt-1">{event.address}</p>
                    )}
                  </div>
                )}

                {/* Información del reportante */}
                {!isClue && (event.anonymous_contact || event.reported_by) && (
                  <div className="mb-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Reportado por</p>
                    {event.is_anonymous && event.anonymous_contact ? (
                      <div>
                        <p className="text-gray-700 text-sm">
                          <span className="font-medium">Anónimo</span>
                        </p>
                        <a
                          href={event.anonymous_contact.includes('@') 
                            ? `mailto:${event.anonymous_contact}` 
                            : `tel:${event.anonymous_contact}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          {event.anonymous_contact.includes('@') ? '📧 ' : '📞 '}
                          {event.anonymous_contact}
                        </a>
                      </div>
                    ) : event.reported_by ? (
                      <p className="text-gray-700 text-sm">
                        Usuario registrado
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Mostrar fotos si es una pista */}
                {isClue && event.photo_urls && event.photo_urls.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-2">Evidencia fotográfica ({event.photo_urls.length} foto{event.photo_urls.length !== 1 ? 's' : ''})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {event.photo_urls.slice(0, 3).map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img
                            src={url}
                            alt={`Evidencia ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-opacity">
                            <ImageIcon className="text-white opacity-0 group-hover:opacity-100" size={20} />
                          </div>
                        </a>
                      ))}
                      {event.photo_urls.length > 3 && (
                        <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-600">
                          +{event.photo_urls.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(event.verification_count > 0 || (isClue && event.is_verified)) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <CheckCircle size={14} className="inline mr-1" />
                      {isClue && event.is_verified ? 'Pista verificada' : `Verificado por ${event.verification_count || 0} ${(event.verification_count || 0) === 1 ? 'persona' : 'personas'}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
