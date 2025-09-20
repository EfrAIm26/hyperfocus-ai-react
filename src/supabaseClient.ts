import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a mock client for development if no real credentials are provided
const createSupabaseClient = () => {
  // Check if we have real credentials (not placeholder values)
  const hasRealCredentials = 
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl !== 'https://your-project-ref.supabase.co' && 
    !supabaseAnonKey.includes('your-anon-key')

  if (!hasRealCredentials) {
    console.warn('⚠️ Supabase credentials not configured. Please update your .env file with real Supabase credentials.')
    console.warn('📝 Instructions:')
    console.warn('1. Go to https://supabase.com/dashboard')
    console.warn('2. Create a new project or select an existing one')
    console.warn('3. Go to Settings > API')
    console.warn('4. Copy the Project URL and anon/publishable key to your .env file')
    
    // Return a mock client that shows helpful error messages
    return {
      auth: {
        signUp: async () => ({ 
          error: { 
            message: 'Supabase not configured. Please check the console for setup instructions.' 
          } 
        }),
        signInWithPassword: async () => ({ 
          error: { 
            message: 'Supabase not configured. Please check the console for setup instructions.' 
          } 
        }),
        signOut: async () => ({ error: null }),
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: (callback: any) => {
          // Call callback immediately with no session
          callback('SIGNED_OUT', null)
          return { data: { subscription: { unsubscribe: () => {} } } }
        }
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => ({ data: [], error: null }) }) }),
        insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
        delete: () => ({ data: null, error: { message: 'Supabase not configured' } })
      }),
      channel: () => ({
        on: () => ({ subscribe: () => {} })
      })
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