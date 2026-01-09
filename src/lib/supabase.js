import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Variables de entorno no configuradas')
  console.error('Por favor, crea un archivo .env en la raíz del proyecto con:')
  console.error('VITE_SUPABASE_URL=tu_url_de_supabase')
  console.error('VITE_SUPABASE_ANON_KEY=tu_anon_key')
  console.error('VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google_maps')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Tipos de datos para TypeScript (opcional, pero útil)
export const PetStatus = {
  LOST: 'lost',
  FOUND: 'found',
  SIGHTED: 'sighted',
  RETURNED: 'returned'
}

export const ReportType = {
  SIGHTING: 'sighting',
  LOST: 'lost',
  FOUND: 'found'
}
