import { useState, useEffect } from 'react'
import { Users, MapPin, Heart, Package, Search, User, Building2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function MembersList({ userId }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

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

      if (!error && data) {
        setIsAdmin(data.user_role === 'admin')
      }
    } catch (error) {
      console.error('Error verificando admin:', error)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [searchTerm, filterActive])

  const loadMembers = async () => {
    try {
      setLoading(true)
      
      // Primero cargar miembros sin el join de organizaciones
      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_role', 'member')
        .order('last_active_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (filterActive) {
        query = query.eq('is_active', true)
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      const { data: membersData, error: membersError } = await query

      if (membersError) throw membersError

      // Si hay miembros con organization_id, cargar las organizaciones por separado
      if (membersData && membersData.length > 0) {
        const organizationIds = membersData
          .map(m => m.organization_id)
          .filter(Boolean)
          .filter((id, index, self) => self.indexOf(id) === index) // Únicos

        if (organizationIds.length > 0) {
          const { data: organizationsData } = await supabase
            .from('organizations')
            .select('id, name, logo_url')
            .in('id', organizationIds)

          // Combinar datos
          const organizationsMap = {}
          if (organizationsData) {
            organizationsData.forEach(org => {
              organizationsMap[org.id] = org
            })
          }

          // Agregar organización a cada miembro
          membersData.forEach(member => {
            if (member.organization_id && organizationsMap[member.organization_id]) {
              member.organization = organizationsMap[member.organization_id]
            }
          })
        }
      }

      setMembers(membersData || [])
    } catch (error) {
      console.error('Error cargando miembros:', error)
      setMembers([]) // Asegurar que members sea un array vacío en caso de error
    } finally {
      setLoading(false)
    }
  }

  // Cargar actividades de cada miembro
  const loadMemberActivities = async (memberId) => {
    try {
      // Mascotas que está buscando
      const { data: searchingPets } = await supabase
        .from('pets')
        .select('id, name, status')
        .eq('registered_by', memberId)
        .eq('status', 'lost')
        .limit(5)

      // Ofertas activas
      const { data: offers } = await supabase
        .from('community_offers')
        .select('id, title, type, offering')
        .eq('user_id', memberId)
        .eq('status', 'active')
        .limit(5)

      return {
        searchingPets: searchingPets || [],
        offers: offers || []
      }
    } catch (error) {
      console.error('Error cargando actividades:', error)
      return { searchingPets: [], offers: [] }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lista de Miembros</h1>
        <p className="text-gray-600">Miembros activos de la comunidad</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar miembros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterActive}
            onChange={(e) => setFilterActive(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm text-gray-700">Solo activos</span>
        </label>
      </div>

      {/* Lista de miembros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} isAdmin={isAdmin} />
        ))}
      </div>

      {members.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="mx-auto mb-4 text-gray-400" size={48} />
          <p>No se encontraron miembros</p>
        </div>
      )}
    </div>
  )
}

function MemberCard({ member, isAdmin }) {
  const [activities, setActivities] = useState(null)
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [member.id])

  const loadActivities = async () => {
    setLoadingActivities(true)
    try {
      // Mascotas que está buscando
      const { data: searchingPets } = await supabase
        .from('pets')
        .select('id, name, status')
        .eq('registered_by', member.id)
        .eq('status', 'lost')
        .limit(3)

      // Ofertas activas (donaciones/solicitudes)
      // Nota: community_offers puede no tener user_id, buscar por contacto
      let offers = []
      try {
        const { data: offersData } = await supabase
          .from('community_offers')
          .select('id, title, type, offering, status, contact')
          .eq('status', 'active')
          .limit(10)
        
        if (offersData) {
          // Filtrar por contacto si coincide con el email o teléfono del miembro
          offers = offersData
            .filter(offer => {
              if (!offer.contact) return false
              return offer.contact.includes(member.email) || 
                     (member.phone && offer.contact.includes(member.phone))
            })
            .slice(0, 3)
        }
      } catch (e) {
        // Si hay error, no mostrar ofertas
        offers = []
      }

      setActivities({
        searchingPets: searchingPets || [],
        offers: offers
      })
    } catch (error) {
      console.error('Error cargando actividades:', error)
    } finally {
      setLoadingActivities(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start space-x-4 mb-4">
        {member.profile_image_url ? (
          <img
            src={member.profile_image_url}
            alt={member.full_name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="text-primary-600" size={32} />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {member.full_name || 'Sin nombre'}
          </h3>
          {member.organization && (
            <div className="flex items-center space-x-2 mt-1">
              <Building2 size={14} className="text-gray-500" />
              <span className="text-sm text-gray-600">{member.organization.name}</span>
            </div>
          )}
          {member.location && (
            <div className="flex items-center space-x-2 mt-1">
              <MapPin size={14} className="text-gray-500" />
              <span className="text-sm text-gray-600">{member.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Información pública */}
      <div className="space-y-3 mb-4">
        {activities && activities.searchingPets.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="text-red-500" size={16} />
              <span className="text-sm font-medium text-gray-700">Buscando:</span>
            </div>
            <div className="space-y-1">
              {activities.searchingPets.map((pet) => (
                <div key={pet.id} className="text-sm text-gray-600 pl-6">
                  • {pet.name || 'Mascota sin nombre'}
                </div>
              ))}
            </div>
          </div>
        )}

        {activities && activities.offers.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Package className="text-blue-500" size={16} />
              <span className="text-sm font-medium text-gray-700">Activo en:</span>
            </div>
            <div className="space-y-1">
              {activities.offers.map((offer) => (
                <div key={offer.id} className="text-sm text-gray-600 pl-6">
                  • {offer.title} ({offer.offering ? 'Ofrece' : 'Solicita'})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Información adicional solo para admin */}
      {isAdmin && (
        <div className="pt-4 border-t border-gray-200 space-y-2 text-sm text-gray-600">
          <p><strong>Email:</strong> {member.email}</p>
          <p><strong>Teléfono:</strong> {member.phone || '-'}</p>
          <p><strong>Registrado:</strong> {member.joined_at ? format(new Date(member.joined_at), "dd/MM/yyyy", { locale: es }) : '-'}</p>
          <p><strong>Última actividad:</strong> {member.last_active_at ? format(new Date(member.last_active_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'Nunca'}</p>
          <p><strong>Reputación:</strong> {member.reputation_points || 0} puntos</p>
        </div>
      )}

      {/* Estado de actividad */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs ${
            member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {member.is_active ? 'Activo' : 'Inactivo'}
          </span>
          {member.volunteer_available && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
              Voluntario disponible
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
