import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role for admin operations
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'service-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
