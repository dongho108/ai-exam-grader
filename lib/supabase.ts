import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce', // PKCE flow recommended for SPAs
    detectSessionInUrl: true, // Detect session in popup callback
    persistSession: true, // Auto-save to localStorage
    autoRefreshToken: true, // Auto-refresh tokens
  },
})
