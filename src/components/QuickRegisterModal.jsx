import { useState } from 'react'
import { X, Mail, Phone, User, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function QuickRegisterModal({ isOpen, onClose, onSuccess, petId }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    profile_picture: null
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen es demasiado grande. Máximo 5MB')
        return
      }
      setFormData({ ...formData, profile_picture: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No se pudo crear la cuenta')
      }

      const userId = authData.user.id

      // 2. Subir foto de perfil si existe
      let profilePictureUrl = null
      if (formData.profile_picture) {
        try {
          const fileExt = formData.profile_picture.name.split('.').pop()
          const fileName = `${userId}-${Date.now()}.${fileExt}`
          
          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, formData.profile_picture, {
              cacheControl: '3600',
              upsert: false
            })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('profile-pictures')
              .getPublicUrl(fileName)
            profilePictureUrl = urlData.publicUrl
          } else {
            console.warn('Error subiendo foto de perfil:', uploadError)
            // Continuar sin foto si hay error
          }
        } catch (storageError) {
          console.warn('Error con storage de fotos:', storageError)
          // Continuar sin foto si el bucket no existe
        }
      }

      // 3. Crear perfil de usuario
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone,
          profile_picture_url: profilePictureUrl
        })

      if (profileError && profileError.code !== '23505') {
        console.error('Error creando perfil:', profileError)
      }

      // 4. Guardar userId en localStorage
      localStorage.setItem('userId', userId)

      // 5. Si hay petId, unirse automáticamente a la búsqueda
      if (petId) {
        const { error: joinError } = await supabase
          .from('volunteer_assignments')
          .insert({
            pet_id: petId,
            volunteer_id: userId,
            status: 'active'
          })

        if (joinError && joinError.code !== '23505') {
          console.error('Error uniéndose a la búsqueda:', joinError)
        }
      }

      // 6. Cerrar modal y ejecutar callback
      onClose()
      if (onSuccess) {
        onSuccess(userId)
      }
      
      // Recargar página para actualizar estado
      window.location.reload()
    } catch (error) {
      console.error('Error en registro:', error)
      setError(error.message || 'Error al crear la cuenta. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Crear Cuenta</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Foto de perfil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Perfil (opcional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <Camera size={24} className="text-gray-400" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profile-picture-input"
                  disabled={loading}
                />
                <label
                  htmlFor="profile-picture-input"
                  className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-primary-700 transition-colors"
                  title="Cambiar foto"
                >
                  <Camera size={14} />
                </label>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="profile-picture-input"
                  className="block w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-center"
                >
                  {formData.profile_picture ? 'Cambiar foto' : 'Seleccionar foto'}
                </label>
                {formData.profile_picture && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, profile_picture: null })
                      setImagePreview(null)
                    }}
                    className="mt-2 text-xs text-red-600 hover:text-red-700"
                  >
                    Eliminar foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Juan Pérez"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="tu@email.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+56 9 1234 5678"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              La contraseña debe tener al menos 6 caracteres
            </p>
          </div>

          {/* Botones */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta y Unirse'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad
          </p>
        </form>
      </div>
    </div>
  )
}
