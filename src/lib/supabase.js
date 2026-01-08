import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
