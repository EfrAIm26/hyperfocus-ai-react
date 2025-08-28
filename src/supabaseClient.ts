import { createClient } from '@supabase/supabase-js'

// TODO: Replace with your actual Supabase URL and anon key
// For development, using valid placeholder values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ2NjI4MDAwLCJleHAiOjE5NjIyMDQwMDB9.placeholder'

// Create a mock client for development if no real credentials are provided
const createSupabaseClient = () => {
  // Check if we have real credentials (not placeholder values)
  const hasRealCredentials = 
    supabaseUrl !== 'https://your-project.supabase.co' && 
    !supabaseAnonKey.includes('placeholder')

  if (!hasRealCredentials) {
    console.warn('Using mock Supabase client for development. Please configure real credentials in environment variables.')
    // Return a mock client that won't break the app
    return {
      auth: {
        signUp: async () => ({ error: { message: 'Please configure Supabase credentials to use authentication' } }),
        signInWithPassword: async () => ({ error: { message: 'Please configure Supabase credentials to use authentication' } }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (callback: any) => {
          // Call callback immediately with no session
          callback('SIGNED_OUT', null)
          return { data: { subscription: { unsubscribe: () => {} } } }
        }
      }
    } as any
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    throw error
  }
}

export const supabase = createSupabaseClient()