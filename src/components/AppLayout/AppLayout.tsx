import React, { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import Sidebar from '../Sidebar/Sidebar'
import ChatWindow from '../ChatWindow/ChatWindow'
import styles from './AppLayout.module.css'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

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

interface AppLayoutProps {
  user: User
  courses: Course[]
  chats: Chat[]
  selectedChatId?: string
  // refreshTrigger removed to fix infinite re-render loop
  onCreateCourse: (courseData: { name: string; emoji: string; color: string }) => Promise<void>
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onSendMessage: (message: string, chatId?: string) => Promise<string | null>
  onRefreshData: () => void
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  user, 
  courses, 
  chats, 
  selectedChatId, 
  // refreshTrigger removed 
  onCreateCourse, 
  onChatSelect, 
  onNewChat, 
  onSendMessage, 
  onRefreshData,
  setCourses,
  setChats
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return

      try {
        // First try to get from profiles table
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error)
        }

        // Use profile data if available, otherwise fallback to user metadata
        setUserProfile({
          id: user.id,
          full_name: profile?.full_name || user?.user_metadata?.full_name || null,
          email: profile?.email || user?.email || 'User'
        })
      } catch (error) {
        console.error('Error fetching user profile:', error)
        // Fallback to user metadata
        setUserProfile({
          id: user.id,
          full_name: user?.user_metadata?.full_name || null,
          email: user?.email || 'User'
        })
      }
    }

    fetchUserProfile()
  }, [user])
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className={styles.container}>
      {/* Header with User Profile */}
      <div className={styles.header}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}></div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {userProfile?.full_name || 'Usuario'}
            </div>
            <div className={styles.userEmail}>
              {userProfile?.email}
            </div>
          </div>
        </div>
        <button className={styles.logoutButton} onClick={handleLogout}>
          🚪 Log Out
        </button>
      </div>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Sidebar */}
        <Sidebar 
          user={user} 
          courses={courses}
          chats={chats}
          onChatSelect={onChatSelect}
          selectedChatId={selectedChatId}
          // refreshTrigger prop removed
          onCreateCourse={onCreateCourse}
          onRefreshData={onRefreshData}
          setCourses={setCourses}
          setChats={setChats}
        />

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          <ChatWindow 
            user={user} 
            selectedChatId={selectedChatId}
            onNewChat={onNewChat}
            onSendMessage={onSendMessage}
          />
        </div>
      </div>
    </div>
  )
}

export default AppLayout