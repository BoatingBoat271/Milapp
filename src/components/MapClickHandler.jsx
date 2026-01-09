import { useMapEvents } from 'react-leaflet'
import { Marker } from 'react-leaflet'
import { useEffect, useState } from 'react'
import L from 'leaflet'

// Fix para iconos
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function MapClickHandler({ initialPosition, onLocationSelect }) {
  const [position, setPosition] = useState(initialPosition)

  useEffect(() => {
    setPosition(initialPosition)
  }, [initialPosition])

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setPosition([lat, lng])
      onLocationSelect(lat, lng)
    },
  })

  return position ? (
    <Marker 
      position={position}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng()
          setPosition([lat, lng])
          onLocationSelect(lat, lng)
        }
      }}
    />
  ) : null
}
