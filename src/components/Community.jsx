import { useState, useEffect } from 'react'
import { Home, Pill, DollarSign, Plus, Heart, MapPin, Phone, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function Community() {
  const [activeTab, setActiveTab] = useState('foster') // 'foster', 'medications', 'donations'
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadItems()
    
    // Suscripción en tiempo real
    const subscription = supabase
      .channel('community-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_offers' }, () => {
        loadItems()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [activeTab])

  const loadItems = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('community_offers')
        .select('*')
        .eq('type', activeTab)
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (error) {
      console.error('Error cargando items:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'foster', label: 'Casas de Acogida', icon: Home },
    { id: 'medications', label: 'Medicamentos', icon: Pill },
    { id: 'donations', label: 'Donaciones', icon: DollarSign }
  ]

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Comunidad de Ayuda</h1>
          <p className="text-gray-600">
            Ofrece o solicita ayuda para nuestras mascotas
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 flex items-center justify-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-primary-600 text-primary-600 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Botón de ofrecer */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Ofrecer {tabs.find(t => t.id === activeTab)?.label}</span>
          </button>
        </div>

        {/* Lista de items */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <Heart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay ofertas disponibles en este momento</p>
            <p className="text-sm text-gray-500 mt-2">Sé el primero en ofrecer ayuda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <CommunityCard key={item.id} item={item} type={activeTab} />
            ))}
          </div>
        )}

        {/* Modal para crear oferta */}
        {showModal && (
          <CommunityOfferModal
            type={activeTab}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false)
              loadItems()
            }}
          />
        )}
      </div>
    </div>
  )
}

function CommunityCard({ item, type }) {
  const getTypeLabel = () => {
    if (type === 'foster') return item.offering ? 'Ofrece acogida' : 'Busca acogida'
    if (type === 'medications') return item.offering ? 'Ofrece medicamentos' : 'Necesita medicamentos'
    return item.offering ? 'Ofrece donación' : 'Solicita donación'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {item.title || 'Sin título'}
          </h3>
          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
            item.offering 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {getTypeLabel()}
          </span>
        </div>
      </div>

      {item.description && (
        <p className="text-gray-700 mb-4 line-clamp-3">{item.description}</p>
      )}

      {type === 'medications' && item.medication_name && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Medicamento</p>
          <p className="font-semibold">{item.medication_name}</p>
        </div>
      )}

      {type === 'donations' && item.amount && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">Monto</p>
          <p className="font-semibold text-lg">${item.amount}</p>
        </div>
      )}

      {item.location && (
        <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
          <MapPin size={16} />
          <span>{item.location}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {format(new Date(item.created_at), "dd MMM yyyy", { locale: es })}
        </p>
        {item.contact && (
          <div className="flex items-center space-x-2 text-sm text-primary-600">
            <Phone size={14} />
            <span>{item.contact}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function CommunityOfferModal({ type, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: type,
    offering: true,
    title: '',
    description: '',
    location: '',
    contact: '',
    medication_name: '',
    amount: '',
    active: true
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: insertError } = await supabase
        .from('community_offers')
        .insert(formData)

      if (insertError) throw insertError
      onSuccess()
    } catch (error) {
      console.error('Error creando oferta:', error)
      setError(error.message || 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {formData.offering ? 'Ofrecer' : 'Solicitar'} {type === 'foster' ? 'Casa de Acogida' : type === 'medications' ? 'Medicamentos' : 'Donación'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="offering"
                checked={formData.offering}
                onChange={handleChange}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Estoy ofreciendo (desmarcar si estás solicitando)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              required
              placeholder={type === 'foster' ? 'Ej: Casa de acogida disponible' : type === 'medications' ? 'Ej: Medicamento disponible' : 'Ej: Donación para tratamiento'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-field"
              rows="4"
              required
              placeholder="Detalles adicionales..."
            />
          </div>

          {type === 'medications' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Medicamento
              </label>
              <input
                type="text"
                name="medication_name"
                value={formData.medication_name}
                onChange={handleChange}
                className="input-field"
                placeholder="Ej: Ivermectina, Amoxicilina..."
              />
            </div>
          )}

          {type === 'donations' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto (si aplica)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="input-field"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="input-field"
              placeholder="Ciudad, barrio..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contacto *
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="input-field"
              required
              placeholder="Teléfono, email o WhatsApp"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
