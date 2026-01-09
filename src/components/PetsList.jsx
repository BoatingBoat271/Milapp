import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Search, Filter, Dog, Cat, MapPin, Calendar, 
  ArrowUpDown, ArrowUp, ArrowDown, Eye, Grid, List,
  X, AlertCircle, CheckCircle, Clock, Home
} from 'lucide-react'

export default function PetsList() {
  const navigate = useNavigate()
  const [pets, setPets] = useState([])
  const [sightings, setSightings] = useState([])
  const [breedsMap, setBreedsMap] = useState({})
  const [colorsMap, setColorsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' o 'list'
  
  // Filtros
  const [filters, setFilters] = useState({
    species: 'all', // 'all', 'dog', 'cat'
    status: 'all', // 'all', 'lost', 'found', 'sighted', 'returned'
    breed: 'all' // 'all' o ID de raza
  })
  
  // Ordenamiento
  const [sortBy, setSortBy] = useState('recent') // 'recent', 'name', 'status', 'species'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc' o 'desc'
  
  const [showFilters, setShowFilters] = useState(false)
  const [availableBreeds, setAvailableBreeds] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar mascotas
      const { data: petsData, error: petsError } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false })

      if (petsError) throw petsError
      setPets(petsData || [])

      // Cargar avistamientos
      const { data: sightingsData, error: sightingsError } = await supabase
        .from('sightings')
        .select('*')
        .order('created_at', { ascending: false })

      if (sightingsError) throw sightingsError
      setSightings(sightingsData || [])

      // Cargar razas y colores
      await loadBreedsAndColors()
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBreedsAndColors = async () => {
    try {
      const [breedsRes, colorsRes] = await Promise.all([
        supabase.from('pet_breeds').select('id, name, name_es'),
        supabase.from('pet_colors').select('id, name, name_es, hex_code, species')
      ])

      if (breedsRes.data) {
        const breedsMap = {}
        breedsRes.data.forEach(breed => {
          breedsMap[breed.id] = breed.name_es || breed.name
        })
        setBreedsMap(breedsMap)
        setAvailableBreeds(breedsRes.data)
      }

      if (colorsRes.data) {
        const colorsMap = {}
        colorsRes.data.forEach(color => {
          colorsMap[color.id] = {
            name: color.name_es || color.name,
            hex: color.hex_code,
            species: color.species
          }
        })
        setColorsMap(colorsMap)
      }
    } catch (error) {
      console.error('Error cargando razas y colores:', error)
      // Si las tablas no existen, continuar sin errores
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Tablas de razas/colores no existen. Continuando sin filtros de raza.')
      }
    }
  }

  // Obtener el último avistamiento de cada mascota
  const getLatestSighting = (petId) => {
    return sightings
      .filter(s => s.pet_id === petId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  // Filtrar y ordenar mascotas
  const filteredAndSortedPets = useMemo(() => {
    let filtered = pets.filter(pet => {
      // Filtro de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = pet.name?.toLowerCase().includes(query)
        const matchesDescription = pet.description?.toLowerCase().includes(query)
        const matchesBreed = breedsMap[pet.breed_id]?.toLowerCase().includes(query) ||
                           pet.breed_custom?.toLowerCase().includes(query)
        if (!matchesName && !matchesDescription && !matchesBreed) {
          return false
        }
      }

      // Filtro de especie
      if (filters.species !== 'all' && pet.species !== filters.species) {
        return false
      }

      // Filtro de estado
      if (filters.status !== 'all' && pet.status !== filters.status) {
        return false
      }

      // Filtro de raza
      if (filters.breed !== 'all') {
        if (pet.breed_id !== filters.breed) {
          return false
        }
      }

      return true
    })

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '')
          break
        case 'species':
          comparison = (a.species || '').localeCompare(b.species || '')
          break
        case 'recent':
        default:
          const aSighting = getLatestSighting(a.id)
          const bSighting = getLatestSighting(b.id)
          const aDate = aSighting ? new Date(aSighting.created_at) : new Date(a.created_at)
          const bDate = bSighting ? new Date(bSighting.created_at) : new Date(b.created_at)
          comparison = aDate - bDate
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [pets, sightings, searchQuery, filters, sortBy, sortOrder, breedsMap])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'lost':
        return <AlertCircle className="text-red-600" size={18} />
      case 'found':
        return <CheckCircle className="text-green-600" size={18} />
      case 'returned':
        return <Home className="text-blue-600" size={18} />
      case 'sighted':
        return <Clock className="text-yellow-600" size={18} />
      default:
        return null
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      lost: 'Perdido',
      found: 'Encontrado',
      sighted: 'Avistado',
      returned: 'Devuelto'
    }
    return labels[status] || status
  }

  const getSpeciesLabel = (species) => {
    return species === 'dog' ? 'Perro' : species === 'cat' ? 'Gato' : species
  }

  const handleViewOnMap = (pet) => {
    const latestSighting = getLatestSighting(pet.id)
    if (latestSighting) {
      navigate(`/?lat=${latestSighting.latitude}&lng=${latestSighting.longitude}&petId=${pet.id}&sightingId=${latestSighting.id}`)
    }
  }

  const toggleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mascotas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Listado de Mascotas</h1>
          <p className="text-gray-600">Explora y busca mascotas registradas en la plataforma</p>
        </div>

        {/* Barra de búsqueda y controles */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción o raza..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Botones de vista y filtros */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={viewMode === 'grid' ? 'Vista de lista' : 'Vista de cuadrícula'}
              >
                {viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg transition-colors flex items-center space-x-2 ${
                  showFilters || filters.species !== 'all' || filters.status !== 'all' || filters.breed !== 'all'
                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter size={20} />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {/* Panel de filtros */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Filtro de especie */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Especie</label>
                  <select
                    value={filters.species}
                    onChange={(e) => setFilters({ ...filters, species: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">Todas</option>
                    <option value="dog">Perros</option>
                    <option value="cat">Gatos</option>
                  </select>
                </div>

                {/* Filtro de estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="lost">Perdido</option>
                    <option value="found">Encontrado</option>
                    <option value="sighted">Avistado</option>
                    <option value="returned">Devuelto</option>
                  </select>
                </div>

                {/* Filtro de raza */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Raza</label>
                  <select
                    value={filters.breed}
                    onChange={(e) => setFilters({ ...filters, breed: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="all">Todas</option>
                    {availableBreeds.map(breed => (
                      <option key={breed.id} value={breed.id}>{breed.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón limpiar filtros */}
              {(filters.species !== 'all' || filters.status !== 'all' || filters.breed !== 'all') && (
                <button
                  onClick={() => setFilters({ species: 'all', status: 'all', breed: 'all' })}
                  className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                >
                  <X size={16} />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          )}

          {/* Ordenamiento */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Ordenar por:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'recent', label: 'Más reciente' },
                  { key: 'name', label: 'Nombre' },
                  { key: 'status', label: 'Estado' },
                  { key: 'species', label: 'Especie' }
                ].map(option => (
                  <button
                    key={option.key}
                    onClick={() => toggleSort(option.key)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1 ${
                      sortBy === option.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.key && (
                      sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Mostrando <span className="font-semibold">{filteredAndSortedPets.length}</span> de{' '}
            <span className="font-semibold">{pets.length}</span> mascotas
          </p>
        </div>

        {/* Lista de mascotas */}
        {filteredAndSortedPets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No se encontraron mascotas con los filtros seleccionados</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {filteredAndSortedPets.map(pet => {
              const latestSighting = getLatestSighting(pet.id)
              const breedName = pet.breed_id ? breedsMap[pet.breed_id] : pet.breed_custom
              const colorInfo = pet.color_id ? colorsMap[pet.color_id] : null

              return (
                <div
                  key={pet.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                >
                  {/* Imagen */}
                  {(pet.primary_image_url || (pet.image_urls && pet.image_urls.length > 0)) && (
                    <div className={viewMode === 'list' ? 'w-48 h-48 flex-shrink-0' : 'w-full h-48'}>
                      <img
                        src={pet.primary_image_url || pet.image_urls[0]}
                        alt={pet.name || 'Mascota'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}

                  {/* Contenido */}
                  <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900">
                        {pet.name || 'Mascota sin nombre'}
                      </h3>
                      {getStatusIcon(pet.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {pet.species === 'dog' ? (
                          <Dog size={16} className="text-blue-600" />
                        ) : (
                          <Cat size={16} className="text-purple-600" />
                        )}
                        <span>{getSpeciesLabel(pet.species)}</span>
                        {breedName && <span>• {breedName}</span>}
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pet.status === 'lost' ? 'bg-red-100 text-red-700' :
                          pet.status === 'found' ? 'bg-green-100 text-green-700' :
                          pet.status === 'returned' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {getStatusLabel(pet.status)}
                        </span>
                      </div>

                      {colorInfo && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>Color:</span>
                          {colorInfo.hex && (
                            <span
                              className="inline-block w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: colorInfo.hex }}
                            />
                          )}
                          <span>{colorInfo.name}</span>
                        </div>
                      )}

                      {latestSighting && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          <span>
                            Último avistamiento: {new Date(latestSighting.created_at).toLocaleDateString('es-CL')}
                          </span>
                        </div>
                      )}

                      {pet.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{pet.description}</p>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => navigate(`/pet/${pet.id}`)}
                        className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <Eye size={16} />
                        <span>Ver detalles</span>
                      </button>
                      {latestSighting && (
                        <button
                          onClick={() => handleViewOnMap(pet)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2 text-sm"
                        >
                          <MapPin size={16} />
                          <span className="hidden sm:inline">Ver en mapa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
