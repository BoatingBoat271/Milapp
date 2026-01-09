import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Heart, Package, Hand, Edit2, Save, X, Camera, MapPin, Phone, Mail, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import es from 'date-fns/locale/es/index.js'

export default function UserProfile() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pets')
  const [editing, setEditing] = useState(false)
  
  // Datos del usuario
  const [rescuePets, setRescuePets] = useState([])
  const [donations, setDonations] = useState([])
  const [requests, setRequests] = useState([])
  const [contributions, setContributions] = useState([])
  
  // Formulario de edición
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
    whatsapp: '',
    contact_phone: '',
    contact_email: '',
    facebook_url: '',
    instagram_url: '',
    website_url: ''
  })
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    const currentUserId = localStorage.getItem('userId')
    if (!currentUserId) {
      navigate('/login')
      return
    }
    setUserId(currentUserId)
    loadUserData(currentUserId)
  }, [navigate])

  const loadUserData = async (userId) => {
    try {
      setLoading(true)
      
      // Cargar perfil (o crearlo si no existe)
      let { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // Si no hay perfil, crearlo
      if (!profileData && (!profileError || profileError.code === 'PGRST116')) {
        // Obtener email del usuario autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('Error obteniendo usuario:', userError)
          throw new Error('No se pudo obtener la información del usuario')
        }
        
        if (user) {
          const newProfileData = {
            id: userId,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            phone: user.user_metadata?.phone || '',
            user_role: 'member', // Por defecto es miembro
            user_type: 'individual',
            is_active: true,
            joined_at: new Date().toISOString()
          }

          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert(newProfileData)
            .select()
            .single()

          if (createError) {
            // Si es error de conflicto (409), intentar obtener el perfil existente
            if (createError.code === '23505' || createError.code === '409') {
              const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single()
              
              if (existingProfile) {
                profileData = existingProfile
              } else {
                console.error('Error creando perfil:', createError)
                throw createError
              }
            } else {
              console.error('Error creando perfil:', createError)
              throw createError
            }
          } else {
            profileData = newProfile
          }
        } else {
          throw new Error('Usuario no encontrado en Supabase Auth')
        }
      } else if (profileError && profileError.code !== 'PGRST116') {
        // Si hay un error que no sea "no encontrado", lanzarlo
        console.error('Error cargando perfil:', profileError)
        throw profileError
      }

      if (!profileData) {
        throw new Error('No se pudo cargar o crear el perfil. Por favor, intenta cerrar sesión y volver a iniciar sesión.')
      }

      setProfile(profileData)
      
      // Inicializar formulario
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        bio: profileData.bio || '',
        whatsapp: profileData.whatsapp || '',
        contact_phone: profileData.contact_phone || '',
        contact_email: profileData.contact_email || '',
        facebook_url: profileData.facebook_url || '',
        instagram_url: profileData.instagram_url || '',
        website_url: profileData.website_url || ''
      })
      
      if (profileData.profile_picture_url) {
        setImagePreview(profileData.profile_picture_url)
      }

      // Cargar mascotas rescatadas/participadas (con manejo de errores)
      const allPets = []
      const petIds = new Set()
      
      try {
        // 1. Mascotas donde el usuario es voluntario
        const { data: volunteerPets, error: volunteerError } = await supabase
          .from('volunteer_assignments')
          .select(`
            *,
            pet:pets(*)
          `)
          .eq('volunteer_id', userId)
          .in('status', ['active', 'completed'])

        if (!volunteerError && volunteerPets) {
          volunteerPets.forEach(v => {
            if (v.pet && !petIds.has(v.pet.id)) {
              allPets.push(v.pet)
              petIds.add(v.pet.id)
            }
          })
        }
      } catch (error) {
        console.warn('Error cargando voluntariados:', error)
      }

      try {
        // 2. Mascotas reportadas por el usuario (avistamientos)
        const { data: reportedSightings, error: sightingsError } = await supabase
          .from('sightings')
          .select(`
            *,
            pet:pets(*)
          `)
          .eq('reported_by', userId)

        if (!sightingsError && reportedSightings) {
          reportedSightings.forEach(s => {
            if (s.pet && !petIds.has(s.pet.id)) {
              allPets.push(s.pet)
              petIds.add(s.pet.id)
            }
          })
        }
      } catch (error) {
        console.warn('Error cargando avistamientos:', error)
      }

      setRescuePets(allPets)

      // Cargar donaciones (con manejo de errores)
      try {
        const { data: allDonations, error: donationsError } = await supabase
          .from('community_offers')
          .select('*')
          .eq('type', 'donations')
          .eq('offering', true)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!donationsError && allDonations) {
          // Filtrar por email del usuario si no hay created_by
          const userDonations = allDonations.filter(d => 
            d.created_by === userId || 
            (profileData.email && d.contact && d.contact.includes(profileData.email))
          )
          setDonations(userDonations)
        }
      } catch (error) {
        console.warn('Error cargando donaciones:', error)
        setDonations([])
      }

      // Cargar solicitudes (con manejo de errores)
      try {
        const { data: allRequests, error: requestsError } = await supabase
          .from('community_offers')
          .select('*')
          .eq('offering', false)
          .order('created_at', { ascending: false })
          .limit(50)

        if (!requestsError && allRequests) {
          // Filtrar por email del usuario si no hay created_by
          const userRequests = allRequests.filter(r => 
            r.created_by === userId || 
            (profileData.email && r.contact && r.contact.includes(profileData.email))
          )
          setRequests(userRequests)
        }
      } catch (error) {
        console.warn('Error cargando solicitudes:', error)
        setRequests([])
      }

      // Cargar aportes (con manejo de errores)
      try {
        const { data: contributionsData, error: contributionsError } = await supabase
          .from('community_offers')
          .select('*')
          .eq('offering', true)
          .order('created_at', { ascending: false })
          .limit(20)

        if (!contributionsError && contributionsData) {
          // Filtrar para excluir las del usuario
          const otherContributions = contributionsData.filter(c => 
            c.created_by !== userId && 
            (!profileData.email || !c.contact || !c.contact.includes(profileData.email))
          )
          setContributions(otherContributions)
        }
      } catch (error) {
        console.warn('Error cargando aportes:', error)
        setContributions([])
      }

    } catch (error) {
      console.error('Error cargando datos:', error)
      // Asegurar que siempre se muestre algo, incluso si hay errores
      if (!profile) {
        // Si no hay perfil, intentar crear uno básico
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: newProfile } = await supabase
              .from('user_profiles')
              .insert({
                id: userId,
                email: user.email || ''
              })
              .select()
              .single()
            
            if (newProfile) {
              setProfile(newProfile)
              setFormData({
                full_name: '',
                phone: '',
                location: '',
                bio: '',
                whatsapp: '',
                contact_phone: '',
                contact_email: '',
                facebook_url: '',
                instagram_url: '',
                website_url: ''
              })
            }
          }
        } catch (createError) {
          console.error('Error creando perfil básico:', createError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es demasiado grande. Máximo 5MB')
        return
      }
      setProfileImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      let profilePictureUrl = profile?.profile_picture_url || null

      // Subir foto si hay una nueva
      if (profileImage) {
        const fileExt = profileImage.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, profileImage, {
              cacheControl: '3600',
              upsert: false
            })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('profile-pictures')
              .getPublicUrl(fileName)
            profilePictureUrl = urlData.publicUrl
          }
        } catch (storageError) {
          console.warn('Error subiendo foto:', storageError)
        }
      }

      // Actualizar perfil
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ...formData,
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) throw updateError

      setEditing(false)
      loadUserData(userId)
      alert('Perfil actualizado correctamente')
    } catch (error) {
      console.error('Error guardando perfil:', error)
      alert('Error al guardar el perfil')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se pudo cargar el perfil</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header del perfil */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Foto de perfil */}
            <div className="relative">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={profile.full_name || 'Usuario'}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-primary-200">
                  <User size={40} className="text-gray-400" />
                </div>
              )}
              {editing && (
                <label
                  htmlFor="profile-image-input"
                  className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-2 cursor-pointer hover:bg-primary-700 transition-colors"
                  title="Cambiar foto"
                >
                  <Camera size={16} />
                </label>
              )}
              {editing && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profile-image-input"
                />
              )}
            </div>

            {/* Información básica */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {editing ? (
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="text-3xl font-bold border-b-2 border-primary-500 focus:outline-none"
                        placeholder="Nombre completo"
                      />
                    ) : (
                      profile.full_name || 'Usuario'
                    )}
                  </h1>
                  <p className="text-gray-600 mb-1">
                    <Mail size={16} className="inline mr-1" />
                    {profile.email}
                  </p>
                  {profile.phone && (
                    <p className="text-gray-600 mb-1">
                      <Phone size={16} className="inline mr-1" />
                      {profile.phone}
                    </p>
                  )}
                  {profile.location && (
                    <p className="text-gray-600">
                      <MapPin size={16} className="inline mr-1" />
                      {profile.location}
                    </p>
                  )}
                </div>
                <div>
                  {editing ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <Save size={18} />
                        <span>Guardar</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false)
                          setFormData({
                            full_name: profile.full_name || '',
                            phone: profile.phone || '',
                            location: profile.location || '',
                            bio: profile.bio || '',
                            whatsapp: profile.whatsapp || '',
                            contact_phone: profile.contact_phone || '',
                            contact_email: profile.contact_email || '',
                            facebook_url: profile.facebook_url || '',
                            instagram_url: profile.instagram_url || '',
                            website_url: profile.website_url || ''
                          })
                          setImagePreview(profile.profile_picture_url || null)
                          setProfileImage(null)
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center space-x-2"
                      >
                        <X size={18} />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit2 size={18} />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {editing ? (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Biografía</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows="3"
                placeholder="Cuéntanos sobre ti..."
              />
            </div>
          ) : (
            profile.bio && (
              <div className="mt-4">
                <p className="text-gray-700">{profile.bio}</p>
              </div>
            )
          )}

          {/* Información de contacto editable */}
          {editing && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ubicación</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ciudad, Región"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email de contacto</label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="contacto@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook</label>
                <input
                  type="url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://facebook.com/tu-perfil"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instagram</label>
                <input
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://instagram.com/tu-perfil"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sitio Web</label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="https://tu-sitio.com"
                />
              </div>
            </div>
          )}
        </div>

        {/* Tabs de navegación */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pets')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'pets'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Heart size={20} className="inline mr-2" />
              Mascotas ({rescuePets.length})
            </button>
            <button
              onClick={() => setActiveTab('donations')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'donations'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package size={20} className="inline mr-2" />
              Donaciones ({donations.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Hand size={20} className="inline mr-2" />
              Solicitudes ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === 'contributions'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle size={20} className="inline mr-2" />
              Aportes ({contributions.length})
            </button>
          </div>
        </div>

        {/* Contenido de las tabs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'pets' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mascotas Rescatadas/Participadas</h2>
              {rescuePets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No has participado en ninguna búsqueda aún</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rescuePets.map((pet) => (
                    <div
                      key={pet.id}
                      onClick={() => navigate(`/pet/${pet.id}`)}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      {pet.primary_image_url && (
                        <img
                          src={pet.primary_image_url}
                          alt={pet.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-lg mb-2">{pet.name || 'Sin nombre'}</h3>
                      <p className="text-sm text-gray-600">
                        {pet.species === 'dog' ? 'Perro' : pet.species === 'cat' ? 'Gato' : pet.species}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                        pet.status === 'lost' ? 'bg-red-100 text-red-800' :
                        pet.status === 'found' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pet.status === 'lost' ? 'Perdida' : pet.status === 'found' ? 'Encontrada' : 'Avistada'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'donations' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Donaciones</h2>
              {donations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No has realizado donaciones aún</p>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div key={donation.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{donation.title}</h3>
                          <p className="text-gray-600 mb-2">{donation.description}</p>
                          {donation.amount && (
                            <p className="text-lg font-bold text-primary-600">${donation.amount}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          donation.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          donation.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {donation.status === 'resolved' ? 'Resuelto' :
                           donation.status === 'closed' ? 'Cerrado' : 'Activo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(donation.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mis Solicitudes</h2>
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No has realizado solicitudes aún</p>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{request.title}</h3>
                          <p className="text-gray-700 mb-2">{request.description}</p>
                          {request.type === 'medications' && request.medication_name && (
                            <p className="text-sm text-gray-600">Medicamento: {request.medication_name}</p>
                          )}
                          {request.type === 'donations' && request.amount && (
                            <p className="text-lg font-bold text-blue-600">${request.amount}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          request.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          request.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {request.status === 'resolved' ? 'Resuelto' :
                           request.status === 'closed' ? 'Cerrado' : 'Activo'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(request.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'contributions' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Aportes de la Comunidad</h2>
              {contributions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay aportes disponibles</p>
              ) : (
                <div className="space-y-4">
                  {contributions.map((contribution) => (
                    <div key={contribution.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">{contribution.title}</h3>
                          <p className="text-gray-700 mb-2">{contribution.description}</p>
                          {contribution.type === 'medications' && contribution.medication_name && (
                            <p className="text-sm text-gray-600">Medicamento: {contribution.medication_name}</p>
                          )}
                          {contribution.type === 'donations' && contribution.amount && (
                            <p className="text-lg font-bold text-green-600">${contribution.amount}</p>
                          )}
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          Oferta
                        </span>
                      </div>
                      {contribution.contact && (
                        <div className="mt-2">
                          <a
                            href={contribution.contact.includes('@') ? `mailto:${contribution.contact}` : `tel:${contribution.contact}`}
                            className="text-sm text-primary-600 hover:text-primary-700"
                          >
                            Contactar: {contribution.contact}
                          </a>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {format(new Date(contribution.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
