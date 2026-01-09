import { useState, useEffect } from 'react'
import { Shield, Activity, Users, Eye, Search, Filter, Edit, Trash2, X, Save, Heart, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'
import { logActivity } from '../lib/activityLogger'
import { useNavigate } from 'react-router-dom'

export default function AdminPanel({ userId }) {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('activity') // 'activity', 'users', 'organizations', 'pets'
  const [activityLog, setActivityLog] = useState([])
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [pets, setPets] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('all') // 'all', 'today', 'week', 'month'
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'lost', 'found', 'sighted', 'returned'

  useEffect(() => {
    if (userId) {
      checkAdminStatus()
    }
  }, [userId])

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_role')
        .eq('id', userId)
        .single()

      if (error) throw error
      
      setIsAdmin(data?.user_role === 'admin')
      
      if (data?.user_role === 'admin') {
        loadData()
      }
    } catch (error) {
      console.error('Error verificando admin:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (activeTab === 'activity') {
      await loadActivityLog()
    } else if (activeTab === 'users') {
      await loadUsers()
    } else if (activeTab === 'organizations') {
      await loadOrganizations()
    } else if (activeTab === 'pets') {
      await loadPets()
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, activeTab, filterDate, filterStatus, searchTerm])

  const loadActivityLog = async () => {
    try {
      let query = supabase
        .from('activity_log')
        .select(`
          *,
          user:user_profiles!user_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      // Aplicar filtro de fecha
      if (filterDate === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (filterDate === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (filterDate === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setActivityLog(data || [])
    } catch (error) {
      console.error('Error cargando historial:', error)
    }
  }

  const loadUsers = async () => {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          admin:user_profiles!admin_user_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error cargando organizaciones:', error)
    }
  }

  const loadPets = async () => {
    try {
      let query = supabase
        .from('pets')
        .select(`
          *,
          pet_breeds(name_es),
          pet_colors(name_es)
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtro de estado
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      // Aplicar búsqueda
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,breed_custom.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(200)

      if (error) throw error

      // Cargar información de usuarios por separado para evitar problemas de relaciones
      // Obtener todos los IDs únicos de usuarios
      const userIds = [...new Set((data || []).map(pet => pet.registered_by).filter(Boolean))]
      
      // Cargar todos los usuarios de una vez
      let usersMap = {}
      if (userIds.length > 0) {
        try {
          const { data: usersData } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          if (usersData) {
            usersMap = usersData.reduce((acc, user) => {
              acc[user.id] = user
              return acc
            }, {})
          }
        } catch (err) {
          console.warn('Error cargando usuarios:', err)
        }
      }

      // Combinar datos
      const petsWithUsers = (data || []).map(pet => ({
        ...pet,
        registered_by_user: pet.registered_by ? usersMap[pet.registered_by] || null : null,
        owner: pet.owner_id ? usersMap[pet.owner_id] || null : null
      }))

      setPets(petsWithUsers)
    } catch (error) {
      console.error('Error cargando mascotas:', error)
      setPets([])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="mx-auto text-gray-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">No tienes permisos de administrador</p>
        </div>
      </div>
    )
  }

  const getActionLabel = (actionType) => {
    const labels = {
      'create_pet': 'Crear Mascota',
      'update_pet': 'Actualizar Mascota',
      'delete_pet': 'Eliminar Mascota',
      'create_sighting': 'Reportar Avistamiento',
      'create_offer': 'Crear Oferta',
      'delete_offer': 'Eliminar Oferta',
      'create_organization': 'Crear Organización',
      'update_organization': 'Actualizar Organización',
      'register_user': 'Registrar Usuario',
      'update_user': 'Actualizar Usuario'
    }
    return labels[actionType] || actionType
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona usuarios, organizaciones y revisa el historial de actividad</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="inline mr-2" size={18} />
            Historial de Actividad
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline mr-2" size={18} />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'organizations'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="inline mr-2" size={18} />
            Organizaciones
          </button>
          <button
            onClick={() => setActiveTab('pets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pets'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Heart className="inline mr-2" size={18} />
            Mascotas
          </button>
        </nav>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'activity' && (
        <div>
          <div className="mb-4 flex items-center space-x-4">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todo el historial</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          {activityLog.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Activity className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No hay registros de actividad aún</p>
              <p className="text-gray-500 text-sm mt-2">Las acciones de los usuarios aparecerán aquí</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityLog.map((log) => (
                    <tr key={log.id} className={log.user_id === userId ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          {log.user?.full_name || log.user?.email || 'Anónimo'}
                          {log.user_id === userId && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Tú</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getActionLabel(log.action_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {log.details ? JSON.stringify(log.details).substring(0, 50) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div className="mb-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {users.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No se encontraron usuarios</p>
              <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Actividad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} userId={userId} onUpdate={loadUsers} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'organizations' && (
        <div>
          {organizations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Shield className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No hay organizaciones registradas</p>
              <p className="text-gray-500 text-sm mt-2">Las organizaciones aparecerán aquí cuando se registren</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div key={org.id} className="bg-white rounded-lg shadow p-6">
                  {org.logo_url && (
                    <img src={org.logo_url} alt={org.name} className="w-16 h-16 rounded-lg mb-4" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{org.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{org.description}</p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Admin:</strong> {org.admin?.full_name || org.admin?.email}</p>
                    <p><strong>Ciudad:</strong> {org.city || '-'}</p>
                    <p><strong>Email:</strong> {org.contact_email}</p>
                    <div className="flex items-center space-x-2 mt-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        org.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {org.is_verified ? 'Verificado' : 'Pendiente'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        org.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {org.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pets' && (
        <div>
          <div className="mb-4 flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">Todos los estados</option>
              <option value="lost">Perdidos</option>
              <option value="found">Encontrados</option>
              <option value="sighted">Avistados</option>
              <option value="returned">Devueltos</option>
            </select>
          </div>

          {pets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Heart className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No se encontraron mascotas</p>
              <p className="text-gray-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mascota</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Especie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado por</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pets.map((pet) => (
                    <PetRow key={pet.id} pet={pet} onUpdate={loadPets} navigate={navigate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Componente para fila de mascota con edición
function PetRow({ pet, onUpdate, navigate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editData, setEditData] = useState({
    name: pet.name || '',
    status: pet.status || 'sighted',
    condition: pet.condition || 'good',
    description: pet.description || ''
  })

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('pets')
        .update(editData)
        .eq('id', pet.id)

      if (error) throw error

      await logActivity('update_pet', 'pet', pet.id, {
        old_data: {
          name: pet.name,
          status: pet.status,
          condition: pet.condition
        },
        new_data: editData
      })

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error guardando mascota:', error)
      alert('Error al guardar cambios')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a "${pet.name || 'esta mascota'}"? Esta acción es irreversible.`)) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', pet.id)

      if (error) throw error

      await logActivity('delete_pet', 'pet', pet.id, {
        deleted_pet_name: pet.name,
        deleted_pet_status: pet.status
      })

      onUpdate()
    } catch (error) {
      console.error('Error eliminando mascota:', error)
      alert('Error al eliminar mascota')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'lost': 'bg-red-100 text-red-700',
      'found': 'bg-green-100 text-green-700',
      'sighted': 'bg-blue-100 text-blue-700',
      'returned': 'bg-purple-100 text-purple-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    const labels = {
      'lost': 'Perdido',
      'found': 'Encontrado',
      'sighted': 'Avistado',
      'returned': 'Devuelto'
    }
    return labels[status] || status
  }

  // Obtener última ubicación conocida
  const getLatestLocation = async () => {
    try {
      const { data } = await supabase
        .from('sightings')
        .select('latitude, longitude, address')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data && data.latitude && data.longitude) {
        navigate(`/?lat=${data.latitude}&lng=${data.longitude}&petId=${pet.id}`)
      } else {
        alert('No hay ubicación registrada para esta mascota')
      }
    } catch (error) {
      console.error('Error obteniendo ubicación:', error)
      alert('No se pudo obtener la ubicación')
    }
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {pet.primary_image_url && (
            <img className="h-10 w-10 rounded-full mr-3 object-cover" src={pet.primary_image_url} alt={pet.name} />
          )}
          <div>
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-48"
              />
            ) : (
              <div className="text-sm font-medium text-gray-900">{pet.name || 'Sin nombre'}</div>
            )}
            {pet.pet_breeds && (
              <div className="text-sm text-gray-500">{pet.pet_breeds.name_es || pet.breed_custom || ''}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {pet.species === 'dog' ? '🐕 Perro' : pet.species === 'cat' ? '🐱 Gato' : 'Otro'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {isEditing ? (
          <select
            value={editData.status}
            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="lost">Perdido</option>
            <option value="found">Encontrado</option>
            <option value="sighted">Avistado</option>
            <option value="returned">Devuelto</option>
          </select>
        ) : (
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(pet.status)}`}>
            {getStatusLabel(pet.status)}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {pet.registered_by_user?.full_name || pet.registered_by_user?.email || pet.owner?.full_name || pet.owner?.email || 'Anónimo'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {format(new Date(pet.created_at), "dd/MM/yyyy", { locale: es })}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={deleting}
              className="text-green-600 hover:text-green-900 disabled:opacity-50"
              title="Guardar"
            >
              <Save size={18} />
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setEditData({
                  name: pet.name || '',
                  status: pet.status || 'sighted',
                  condition: pet.condition || 'good',
                  description: pet.description || ''
                })
              }}
              disabled={deleting}
              className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
              title="Cancelar"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/pet/${pet.id}`)}
              className="text-blue-600 hover:text-blue-900"
              title="Ver perfil"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={getLatestLocation}
              className="text-primary-600 hover:text-primary-900"
              title="Ver en mapa"
            >
              <MapPin size={18} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-600 hover:text-primary-900"
              title="Editar"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-900 disabled:opacity-50"
              title="Eliminar"
            >
              {deleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
              ) : (
                <Trash2 size={18} />
              )}
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// Componente para fila de usuario con edición
function UserRow({ user, userId, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    phone: user.phone || '',
    user_role: user.user_role || 'member',
    user_type: user.user_type || 'individual',
    is_active: user.is_active !== undefined ? user.is_active : true
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(formData)
        .eq('id', user.id)

      if (error) throw error

      await logActivity('update_user', 'user_profile', user.id, { changes: formData })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error actualizando usuario:', error)
      alert('Error al actualizar el usuario')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <tr>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            {user.profile_image_url && (
              <img className="h-10 w-10 rounded-full mr-3" src={user.profile_image_url} alt={user.full_name} />
            )}
            <div>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                placeholder="Nombre completo"
              />
              <div className="text-sm text-gray-500 mt-1">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <select
            value={formData.user_role}
            onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="member">Miembro</option>
            <option value="admin">Admin</option>
            <option value="organization">Organización</option>
          </select>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <select
            value={formData.user_type}
            onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="individual">Individual</option>
            <option value="organization">Organización</option>
          </select>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm">{formData.is_active ? 'Activo' : 'Inactivo'}</span>
          </label>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.joined_at ? format(new Date(user.joined_at), "dd/MM/yyyy", { locale: es }) : '-'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {user.last_active_at ? format(new Date(user.last_active_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Nunca'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Guardar"
            >
              <Save size={18} />
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setFormData({
                  full_name: user.full_name || '',
                  phone: user.phone || '',
                  user_role: user.user_role || 'member',
                  user_type: user.user_type || 'individual',
                  is_active: user.is_active !== undefined ? user.is_active : true
                })
              }}
              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              title="Cancelar"
            >
              <X size={18} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {user.profile_image_url && (
            <img className="h-10 w-10 rounded-full mr-3" src={user.profile_image_url} alt={user.full_name} />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sin nombre'}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className={`px-2 py-1 rounded-full text-xs ${
          user.user_role === 'admin' ? 'bg-purple-100 text-purple-700' :
          user.user_role === 'organization' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {user.user_role || 'member'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {user.user_type || 'individual'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs ${
          user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.joined_at ? format(new Date(user.joined_at), "dd/MM/yyyy", { locale: es }) : '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.last_active_at ? format(new Date(user.last_active_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Nunca'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          title="Editar"
        >
          <Edit size={18} />
        </button>
      </td>
    </tr>
  )
}
