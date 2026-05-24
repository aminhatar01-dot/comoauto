import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Advertencia: Faltan las variables de entorno de Supabase en .env. Por favor, configúralas.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
