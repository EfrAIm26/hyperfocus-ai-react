import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './components/Auth/Auth'
import AppLayout from './components/AppLayout/AppLayout'
import UpdatePassword from './components/UpdatePassword/UpdatePassword'
import './App.css'

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  const isPasswordRecovery = searchParams.get('type') === 'recovery'

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/update-password" 
          element={<UpdatePassword />} 
        />
        <Route 
          path="/" 
          element={
            user ? (
              isPasswordRecovery ? (
                <UpdatePassword />
              ) : (
                <AppLayout user={user} />
              )
            ) : (
              <Auth />
            )
          } 
        />
        <Route 
          path="*" 
          element={<Navigate to="/" replace />} 
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App