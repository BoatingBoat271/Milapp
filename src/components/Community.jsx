import { useState, useEffect, useCallback } from 'react'
import { Home, Pill, DollarSign, Plus, Heart, MapPin, Phone, Mail, X, Users, Trophy, MessageCircle, CheckCircle2, Edit, Trash2 } from 'lucide-react'
import VolunteerToggle from './VolunteerToggle'
import VolunteerRanking from './VolunteerRanking'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { logActivity } from '../lib/activityLogger'

export default function Community() {
  const [activeTab, setActiveTab] = useState('foster') // 'foster', 'medications', 'donations'
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all') // 'all', 'offering', 'requesting'
  const [filterStatus, setFilterStatus] = useState('active') // 'active', 'all', 'resolved', 'closed'
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  useEffect(() => {
    checkAdminStatus()
    
    // Verificar si hay parámetro de URL para publicar
    const urlParams = new URLSearchParams(window.location.search)
    const publishType = urlParams.get('publish')
    if (publishType && ['foster', 'medications', 'donations'].includes(publishType)) {
      setActiveTab(publishType)
      setShowModal(true)
      // Limpiar el parámetro de URL
      window.history.replaceState({}, '', '/community')
    }
  }, [])

  const checkAdminStatus = async () => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) return
      
      const { data } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('id', userId)
        .single()
      
      setIsAdmin(data?.user_role === 'admin')
    } catch (error) {
      console.error('Error verificando admin:', error)
    }
  }

  const handleDeleteOffer = async (itemId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return
    
    try {
      const { error } = await supabase
        .from('community_offers')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      const userId = localStorage.getItem('userId')
      await logActivity('delete_offer', 'community_offer', itemId, { deleted_by: userId })
      
      loadItems()
    } catch (error) {
      console.error('Error eliminando publicación:', error)
      alert('Error al eliminar la publicación')
    }
  }

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'volunteers') {
        // Cargar voluntarios activos
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('is_volunteer', true)
          .eq('volunteer_available', true)
          .order('created_at', { ascending: false })

        if (error) {
          // Si la tabla no existe, mostrar mensaje amigable
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('Tabla user_profiles no existe. Ejecuta el script SQL setup-completo.sql')
            setItems([])
            return
          }
          throw error
        }
        setItems(data || [])
      } else if (activeTab === 'ranking') {
        // No cargar nada para ranking, se maneja en VolunteerRanking
        setItems([])
      } else {
        // Cargar ofertas comunitarias
        let query = supabase
          .from('community_offers')
          .select('*')
          .eq('type', activeTab)

        // Aplicar filtro de estado
        if (filterStatus === 'active') {
          query = query.eq('active', true).in('status', ['active', null])
        } else if (filterStatus === 'resolved') {
          query = query.eq('status', 'resolved')
        } else if (filterStatus === 'closed') {
          query = query.eq('status', 'closed')
        }
        // Si filterStatus === 'all', no filtramos por estado

        // Aplicar filtro de oferta/solicitud
        if (filterType === 'offering') {
          query = query.eq('offering', true)
        } else if (filterType === 'requesting') {
          query = query.eq('offering', false)
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
          // Si la tabla no existe, mostrar mensaje amigable
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.warn('Tabla community_offers no existe. Ejecuta el script SQL setup-completo.sql')
            setItems([])
            return
          }
          throw error
        }
        setItems(data || [])
      }
    } catch (error) {
      console.error('Error cargando items:', error)
      setItems([]) // Asegurar que items esté vacío en caso de error
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterType, filterStatus])

  useEffect(() => {
    loadItems()
    
    // Suscripción en tiempo real (solo para tabs que usan community_offers)
    if (activeTab !== 'volunteers' && activeTab !== 'ranking') {
      const subscription = supabase
        .channel('community-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'community_offers' }, () => {
          loadItems()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [loadItems, activeTab])

  const handleMarkInterested = (item) => {
    // Abrir contacto con mensaje predefinido
    if (item.contact) {
      const subject = `Me interesa tu ${activeTab === 'foster' ? 'oferta de acogida' : activeTab === 'medications' ? 'medicamento' : 'donación'}`
      const body = `Hola, me interesa tu publicación "${item.title}". ¿Todavía está disponible?`
      
      if (item.contact.includes('@')) {
        const mailtoLink = `mailto:${item.contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        window.open(mailtoLink, '_blank')
      } else {
        // Para teléfono, abrir WhatsApp si es posible, sino teléfono normal
        const whatsappLink = `https://wa.me/${item.contact.replace(/\D/g, '')}?text=${encodeURIComponent(`${subject}\n\n${body}`)}`
        window.open(whatsappLink, '_blank')
      }
    }
  }

  const handleMarkResolved = async (itemId) => {
    try {
      const { error } = await supabase
        .from('community_offers')
        .update({ 
          status: 'resolved',
          active: false,
          resolved_at: new Date().toISOString()
        })
        .eq('id', itemId)

      if (error) throw error
      
      // Recargar items
      loadItems()
    } catch (error) {
      console.error('Error marcando como resuelto:', error)
      alert('Error al marcar como resuelto. Intenta nuevamente.')
    }
  }

  const tabs = [
    { id: 'foster', label: 'Casas de Acogida', icon: Home },
    { id: 'medications', label: 'Medicamentos', icon: Pill },
    { id: 'donations', label: 'Donaciones', icon: DollarSign },
    { id: 'volunteers', label: 'Voluntarios', icon: Users },
    { id: 'ranking', label: 'Ranking', icon: Trophy }
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

        {/* Filtros y botón de crear publicación */}
        <div className="mb-6 flex items-center justify-between">
          {/* Filtros de oferta/solicitud y estado (solo para tabs de ofertas) */}
          {activeTab !== 'volunteers' && activeTab !== 'ranking' && (
            <div className="flex flex-col space-y-3">
              {/* Filtro por tipo (ofrece/solicita) */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Tipo:</span>
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterType('offering')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'offering'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ofrecen
                </button>
                <button
                  onClick={() => setFilterType('requesting')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterType === 'requesting'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Solicitan
                </button>
              </div>
              {/* Filtro por estado */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Estado:</span>
                <button
                  onClick={() => setFilterStatus('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === 'active'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Activas
                </button>
                <button
                  onClick={() => setFilterStatus('resolved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === 'resolved'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Resueltas
                </button>
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
              </div>
            </div>
          )}

          {/* Botón de crear publicación o toggle de voluntario */}
          <div className="flex justify-end">
            {activeTab === 'volunteers' ? (
              <VolunteerToggle userId={null} />
            ) : activeTab !== 'ranking' ? (
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Crear Publicación</span>
              </button>
            ) : null}
          </div>
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
        ) : activeTab === 'volunteers' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(volunteer => (
              <VolunteerCard key={volunteer.id} volunteer={volunteer} />
            ))}
          </div>
        ) : activeTab === 'ranking' ? (
          <VolunteerRanking />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <CommunityCard 
                key={item.id} 
                item={item} 
                type={activeTab}
                isAdmin={isAdmin}
                onMarkInterested={handleMarkInterested}
                onMarkResolved={handleMarkResolved}
                onDelete={handleDeleteOffer}
                onEdit={(item) => {
                  setEditingItem(item)
                  setShowModal(true)
                }}
              />
            ))}
          </div>
        )}

        {/* Modal para crear oferta (solo si no es voluntarios) */}
        {showModal && activeTab !== 'volunteers' && (
          <CommunityOfferModal
            type={activeTab}
            item={editingItem}
            onClose={() => {
              setShowModal(false)
              setEditingItem(null)
            }}
            onSuccess={() => {
              setShowModal(false)
              setEditingItem(null)
              loadItems()
            }}
          />
        )}
      </div>
    </div>
  )
}

function CommunityCard({ item, type, isAdmin, onMarkInterested, onMarkResolved, onDelete, onEdit }) {
  const getTypeLabel = () => {
    if (type === 'foster') return item.offering ? 'Ofrece acogida' : 'Busca acogida'
    if (type === 'medications') return item.offering ? 'Ofrece medicamentos' : 'Necesita medicamentos'
    return item.offering ? 'Ofrece donación' : 'Solicita donación'
  }

  const getTypeColor = () => {
    if (item.offering) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-300',
        badge: 'bg-green-100 text-green-800',
        icon: 'text-green-600'
      }
    } else {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        badge: 'bg-blue-100 text-blue-800',
        icon: 'text-blue-600'
      }
    }
  }

  const colors = getTypeColor()

  return (
      <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 ${colors.border}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-lg text-gray-900">
              {item.title || 'Sin título'}
            </h3>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
              {getTypeLabel()}
            </span>
          </div>
          {isAdmin && (
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={() => onEdit && onEdit(item)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Editar"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => onDelete && onDelete(item.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
          {item.status && item.status !== 'active' && (
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              item.status === 'resolved' 
                ? 'bg-gray-100 text-gray-600' 
                : 'bg-red-100 text-red-600'
            }`}>
              {item.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
            </span>
          )}
        </div>
      </div>

      {item.description && (
        <p className="text-gray-700 mb-4 line-clamp-3">{item.description}</p>
      )}

      {item.priority === 'urgent' && (
        <div className="mb-4 flex items-center space-x-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
          <span className="text-red-600 font-bold">⚠️</span>
          <span className="text-sm font-semibold text-red-700">URGENTE</span>
        </div>
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

      <div className="pt-4 border-t border-gray-200 space-y-3">
        {/* Contacto destacado */}
        {item.contact && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Phone className={colors.icon} size={18} />
              <div>
                <p className="text-xs text-gray-500">Contacto:</p>
                <a
                  href={item.contact.includes('@') ? `mailto:${item.contact}` : `tel:${item.contact}`}
                  className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                >
                  {item.contact}
                </a>
              </div>
            </div>
            <a
              href={item.contact.includes('@') ? `mailto:${item.contact}` : `tel:${item.contact}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                item.offering
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Contactar
            </a>
          </div>
        )}

        {/* Botones de acción */}
        {item.status === 'active' && (
          <div className="flex items-center space-x-2">
            {onMarkInterested && (
              <button
                onClick={() => onMarkInterested(item)}
                className="flex-1 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors flex items-center justify-center space-x-2"
              >
                <MessageCircle size={16} />
                <span>Me interesa</span>
              </button>
            )}
            {onMarkResolved && (
              <button
                onClick={() => onMarkResolved(item.id)}
                className="px-3 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1"
                title="Marcar como resuelto"
              >
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        )}

        {/* Fecha */}
        <p className="text-xs text-gray-500">
          Publicado el {format(new Date(item.created_at), "dd MMM yyyy", { locale: es })}
        </p>
      </div>
    </div>
  )
}

function CommunityOfferModal({ type, item, onClose, onSuccess }) {
  const isEditing = !!item
  const [formData, setFormData] = useState({
    type: item?.type || type,
    offering: item?.offering !== undefined ? item.offering : true,
    title: item?.title || '',
    description: item?.description || '',
    location: item?.location || '',
    contact: item?.contact || '',
    medication_name: item?.medication_name || '',
    amount: item?.amount || '',
    active: item?.active !== undefined ? item.active : true,
    status: item?.status || 'active',
    priority: item?.priority || 'normal'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (item) {
      setFormData({
        type: item.type || type,
        offering: item.offering !== undefined ? item.offering : true,
        title: item.title || '',
        description: item.description || '',
        location: item.location || '',
        contact: item.contact || '',
        medication_name: item.medication_name || '',
        amount: item.amount || '',
        active: item.active !== undefined ? item.active : true,
        status: item.status || 'active',
        priority: item.priority || 'normal'
      })
    }
  }, [item, type])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const userId = localStorage.getItem('userId')
      
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('community_offers')
          .update(formData)
          .eq('id', item.id)

        if (updateError) throw updateError
        await logActivity('update_offer', 'community_offer', item.id, { updated_by: userId })
      } else {
        const { error: insertError } = await supabase
          .from('community_offers')
          .insert(formData)

        if (insertError) throw insertError
        await logActivity('create_offer', 'community_offer', null, { created_by: userId })
      }
      
      onSuccess()
    } catch (error) {
      console.error(`Error ${isEditing ? 'actualizando' : 'creando'} oferta:`, error)
      setError(error.message || `Error al ${isEditing ? 'actualizar' : 'guardar'}`)
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
            {isEditing ? 'Editar' : formData.offering ? 'Ofrecer' : 'Solicitar'} {type === 'foster' ? 'Casa de Acogida' : type === 'medications' ? 'Medicamentos' : 'Donación'}
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

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Publicación *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, offering: true })}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    formData.offering
                      ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>✓</span>
                    <span>Ofrezco</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, offering: false })}
                  className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                    !formData.offering
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span>?</span>
                    <span>Solicito</span>
                  </div>
                </button>
              </div>
            </div>

            {type === 'medications' && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.priority === 'urgent'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.checked ? 'urgent' : 'normal' })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-red-700">
                    ⚠️ Urgente
                  </span>
                </label>
              </div>
            )}
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
                Nombre del Medicamento {formData.offering ? 'Ofrecido' : 'Necesitado'} *
              </label>
              <input
                type="text"
                name="medication_name"
                value={formData.medication_name}
                onChange={handleChange}
                className="input-field"
                required
                placeholder="Ej: Ivermectina, Amoxicilina..."
              />
            </div>
          )}

          {type === 'donations' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.offering ? 'Monto a Donar' : 'Monto Necesitado'} (opcional)
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

function VolunteerCard({ volunteer }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {volunteer.full_name || 'Voluntario'}
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Disponible</span>
          </div>
        </div>
      </div>

      {volunteer.bio && (
        <p className="text-gray-700 mb-4 line-clamp-3">{volunteer.bio}</p>
      )}

      {volunteer.volunteer_coverage_location && (
        <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
          <MapPin size={16} />
          <span>{volunteer.volunteer_coverage_location}</span>
          {volunteer.volunteer_coverage_radius_km && (
            <span className="text-xs">({volunteer.volunteer_coverage_radius_km} km)</span>
          )}
        </div>
      )}

      {volunteer.volunteer_skills && volunteer.volunteer_skills.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Habilidades:</p>
          <div className="flex flex-wrap gap-1">
            {volunteer.volunteer_skills.map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        {volunteer.contact_phone && (
          <a
            href={`tel:${volunteer.contact_phone}`}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
          >
            <Phone size={14} />
            <span>Llamar</span>
          </a>
        )}
        {volunteer.whatsapp && (
          <a
            href={`https://wa.me/${volunteer.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
          >
            <Mail size={14} />
            <span>WhatsApp</span>
          </a>
        )}
        {volunteer.contact_email && (
          <a
            href={`mailto:${volunteer.contact_email}`}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            <Mail size={14} />
            <span>Email</span>
          </a>
        )}
      </div>
    </div>
  )
}
