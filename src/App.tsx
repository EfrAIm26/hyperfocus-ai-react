import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import Auth from './components/Auth/Auth'
import AppLayout from './components/AppLayout/AppLayout'
import UpdatePassword from './components/UpdatePassword/UpdatePassword'
import './App.css'

// Interfaces for centralized state management
interface Course {
  id: string
  name: string
  color: string
  emoji: string
  user_id: string
  created_at: string
}

interface Chat {
  id: string
  title: string
  topic_id?: string
  course_id?: string
  user_id: string
  created_at: string
}

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  
  // Centralized state management
  const [courses, setCourses] = useState<Course[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>()
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(true)

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

  // Load initial data and setup real-time subscriptions when user is authenticated
  useEffect(() => {
    if (!user) {
      setCourses([])
      setChats([])
      return
    }

    const loadInitialData = async () => {
      try {
        // Load courses
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (coursesError) throw coursesError
        setCourses(coursesData || [])

        // Load chats
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (chatsError) throw chatsError
        setChats(chatsData || [])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadInitialData()

    // Setup real-time subscriptions
    const coursesSubscription = supabase
      .channel('courses_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setCourses(prev => [...prev, payload.new as Course])
          } else if (payload.eventType === 'UPDATE') {
            setCourses(prev => prev.map(course => 
              course.id === payload.new.id ? payload.new as Course : course
            ))
          } else if (payload.eventType === 'DELETE') {
            setCourses(prev => prev.filter(course => course.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    const chatsSubscription = supabase
      .channel('chats_realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setChats(prev => [payload.new as Chat, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setChats(prev => prev.map(chat => 
              chat.id === payload.new.id ? payload.new as Chat : chat
            ))
          } else if (payload.eventType === 'DELETE') {
            setChats(prev => prev.filter(chat => chat.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      coursesSubscription.unsubscribe()
      chatsSubscription.unsubscribe()
    }
  }, [user])

  // Centralized functions for child components - memoized to prevent re-renders
  const handleCreateCourse = useCallback(async (courseData: { name: string; emoji: string; color: string }) => {
    if (!user) return

    const { data, error } = await supabase
      .from('courses')
      .insert({
        name: courseData.name,
        emoji: courseData.emoji,
        color: courseData.color,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      throw error
    }

    if (data) {
      setCourses(prev => [...prev, data])
    }
  }, [user])

  const handleChatSelect = useCallback((chatId: string) => {
    setSelectedChatId(chatId)
  }, [])

  const handleNewChat = useCallback(() => {
    setSelectedChatId(undefined)
  }, [])

  const handleSendMessage = useCallback(async (message: string, chatId?: string): Promise<string | null> => {
    if (!user) return null

    let currentChatId = chatId

    // Create new chat if none exists
    if (!currentChatId) {
      // Generate title from first 4-5 words of the message
      const words = message.trim().split(/\s+/)
      const titleWords = words.slice(0, 5)
      const title = titleWords.join(' ') + (words.length > 5 ? '...' : '')
      
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          title: title,
          user_id: user.id
        })
        .select()
        .single()

      if (chatError) {
        console.error('Error creating chat:', chatError)
        throw chatError
      }

      currentChatId = newChat.id
      setChats(prev => [newChat, ...prev])
      setSelectedChatId(currentChatId)
    }

    return currentChatId || null
  }, [user])

  const refreshData = useCallback(async () => {
    if (!user) return

    try {
      // Reload courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (coursesError) throw coursesError
      setCourses(coursesData || [])

      // Reload chats
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (chatsError) throw chatsError
      setChats(chatsData || [])
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }, [user])

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
                <AppLayout 
                    user={user} 
                    courses={courses}
                    chats={chats}
                    selectedChatId={selectedChatId}
                    isSettingsPanelOpen={isSettingsPanelOpen}
                    onSettingsToggle={() => setIsSettingsPanelOpen(!isSettingsPanelOpen)}
                    onCreateCourse={handleCreateCourse}
                    onChatSelect={handleChatSelect}
                    onNewChat={handleNewChat}
                    onSendMessage={handleSendMessage}
                    onRefreshData={refreshData}
                  />
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