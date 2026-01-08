import { MapPin, Clock, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function Timeline({ sightings }) {
  if (sightings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No hay avistamientos registrados aún</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-200"></div>

      <div className="space-y-6">
        {sightings.map((sighting, index) => (
          <div key={sighting.id} className="relative flex items-start space-x-4">
            {/* Punto en la línea */}
            <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full text-white shadow-lg">
              <MapPin size={24} />
            </div>

            {/* Contenido */}
            <div className="flex-1 bg-white rounded-lg shadow-md p-6 ml-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-1">
                    Avistamiento #{sightings.length - index}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock size={14} />
                    <span>
                      {format(new Date(sighting.created_at), "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
                {sighting.verified && (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle size={18} />
                    <span className="text-sm font-medium">Verificado</span>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-500 mb-1">Ubicación</p>
                <p className="text-gray-700 font-mono text-sm">
                  {sighting.latitude.toFixed(6)}, {sighting.longitude.toFixed(6)}
                </p>
              </div>

              {sighting.notes && (
                <div className="mb-3">
                  <p className="text-sm text-gray-500 mb-1">Notas</p>
                  <p className="text-gray-700">{sighting.notes}</p>
                </div>
              )}

              {sighting.verification_count > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <CheckCircle size={14} className="inline mr-1" />
                    Verificado por {sighting.verification_count} {sighting.verification_count === 1 ? 'persona' : 'personas'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
