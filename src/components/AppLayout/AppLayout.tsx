import React from 'react'
import type { User } from '@supabase/supabase-js'
import Sidebar from '../Sidebar/Sidebar'
import ChatWindow from '../ChatWindow/ChatWindow'
import styles from './AppLayout.module.css'



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
  onRefreshData
}) => {

  return (
    <div className={styles.container}>
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