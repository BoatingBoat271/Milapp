import { Marker, Popup } from 'react-leaflet'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { MapPin, Clock } from 'lucide-react'
import L from 'leaflet'

// Crear iconos personalizados
const lostIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const foundIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const sightedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default function PetMarker({ position, pet, sighting, breedName, colorInfo, onClick }) {
  const getIcon = () => {
    if (pet.status === 'lost') return lostIcon
    if (pet.status === 'found') return foundIcon
    return sightedIcon
  }

  const speciesLabel = pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : pet.species

  return (
    <Marker position={position} icon={getIcon()} eventHandlers={{ click: onClick }}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <h3 className="font-bold text-lg mb-2">{pet.name || 'Mascota sin nombre'}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-center space-x-2">
              <MapPin size={14} className="text-gray-500" />
              <span className="text-gray-600">
                {speciesLabel} {breedName ? `- ${breedName}` : ''}
              </span>
            </div>
            {colorInfo && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">
                  Color: {colorInfo.hex && (
                    <span 
                      className="inline-block w-3 h-3 rounded-full border border-gray-300 mr-1"
                      style={{ backgroundColor: colorInfo.hex }}
                    ></span>
                  )}
                  {colorInfo.name}
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Clock size={14} className="text-gray-500" />
              <span className="text-gray-600">
                {format(new Date(sighting.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            </div>
            {sighting.notes && (
              <p className="text-gray-600 mt-2 text-xs">{sighting.notes}</p>
            )}
            <button
              onClick={onClick}
              className="mt-2 w-full btn-primary text-sm py-1"
            >
              Ver detalles
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
