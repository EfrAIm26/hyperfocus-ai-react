import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import Sidebar from '../Sidebar/Sidebar'
import ChatWindow from '../ChatWindow/ChatWindow'
import styles from './AppLayout.module.css'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

interface AppLayoutProps {
  user: any // Will be typed properly when we add user types
}

const AppLayout: React.FC<AppLayoutProps> = ({ user }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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
      } finally {
        setLoading(false)
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

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId)
  }

  const handleNewChat = () => {
    setSelectedChatId(undefined)
    setRefreshTrigger(prev => prev + 1)
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
          onChatSelect={handleChatSelect}
          selectedChatId={selectedChatId}
          refreshTrigger={refreshTrigger}
        />

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          <ChatWindow 
            user={user} 
            selectedChatId={selectedChatId}
            onNewChat={handleNewChat}
          />
        </div>
      </div>
    </div>
  )
}

export default AppLayout