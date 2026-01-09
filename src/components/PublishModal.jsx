import { useState } from 'react'
import { X, Heart, Home, Pill, DollarSign, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReportModal from './ReportModal'
import LocationSelectionStep from './LocationSelectionStep'

export default function PublishModal({ userLocation, onClose, onSuccess }) {
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const publicationTypes = [
    {
      id: 'pet',
      label: 'Mascota',
      description: 'Publicar una mascota perdida, encontrada o avistada',
      icon: Heart,
      color: 'bg-red-50 border-red-200 hover:bg-red-100',
      activeColor: 'bg-red-100 border-red-500'
    },
    {
      id: 'foster',
      label: 'Casa de Acogida',
      description: 'Ofrecer o solicitar un lugar de acogida temporal',
      icon: Home,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      activeColor: 'bg-blue-100 border-blue-500'
    },
    {
      id: 'medications',
      label: 'Medicamentos',
      description: 'Ofrecer o solicitar medicamentos para mascotas',
      icon: Pill,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      activeColor: 'bg-purple-100 border-purple-500'
    },
    {
      id: 'donations',
      label: 'Donaciones',
      description: 'Ofrecer o solicitar donaciones para casos veterinarios',
      icon: DollarSign,
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      activeColor: 'bg-green-100 border-green-500'
    }
  ]

  // Si se seleccionó un tipo pero aún no tiene ubicación, mostrar el paso de selección de ubicación
  if (selectedType && selectedType !== 'pet-with-location') {
    return (
      <LocationSelectionStep
        type={selectedType}
        userLocation={userLocation}
        onClose={() => {
          setSelectedType(null)
          setSelectedLocation(null)
          onClose()
        }}
        onLocationSelected={(location) => {
          if (selectedType === 'pet') {
            // Para mascotas, guardar la ubicación y mostrar ReportModal
            setSelectedLocation(location)
            setSelectedType('pet-with-location')
          } else {
            // Para ofertas comunitarias, navegar a la sección de comunidad
            navigate(`/community?publish=${selectedType}&lat=${location[0]}&lng=${location[1]}`)
            onClose()
          }
        }}
      />
    )
  }

  // Si se seleccionó mascota y ya tiene ubicación, mostrar ReportModal
  if (selectedType === 'pet-with-location' && selectedLocation) {
    return (
      <ReportModal
        userLocation={selectedLocation}
        onClose={() => {
          setSelectedType(null)
          setSelectedLocation(null)
          onClose()
        }}
        onSuccess={() => {
          setSelectedType(null)
          setSelectedLocation(null)
          onSuccess()
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">¿Qué quieres publicar?</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">
            Selecciona el tipo de publicación que deseas crear
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicationTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-6 rounded-lg border-2 transition-all transform hover:scale-105 ${type.color} ${selectedType === type.id ? type.activeColor : ''}`}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className={`p-4 rounded-full ${selectedType === type.id ? 'bg-white' : 'bg-white/50'}`}>
                      <Icon size={32} className={selectedType === type.id ? 'text-gray-800' : 'text-gray-600'} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{type.label}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <MapPin size={16} />
              <span>Tu ubicación se usará automáticamente para la publicación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
