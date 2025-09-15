import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';
import CreateCourseModal from '../CreateCourseModal/CreateCourseModal';
import Modal from '../Modal/Modal';
import styles from './Sidebar.module.css';

interface Course {
  id: string;
  name: string;
  color: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface Topic {
  id: string;
  name: string;
  course_id: string;
  color: string;
  emoji: string;
  created_at: string;
}

interface Chat {
  id: string;
  title: string;
  topic_id?: string;
  course_id?: string;
  user_id: string;
  created_at: string;
}

interface SidebarProps {
  user: User;
  courses: Course[];
  chats: Chat[];
  onChatSelect: (chatId: string) => void;
  selectedChatId?: string;
  // refreshTrigger removed to fix infinite re-render loop
  onCreateCourse: (courseData: { name: string; emoji: string; color: string }) => Promise<void>;
  onRefreshData: () => void;
}

interface ExpandedState {
  [key: string]: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  courses, 
  chats, 
  onChatSelect, 
  selectedChatId, 
  // refreshTrigger removed 
  onCreateCourse, 
  onRefreshData
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [loading, setLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState<{ type: string; id: string; x: number; y: number } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: string; id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: string; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
    setupRealtimeSubscriptions();
    
    // Restore sidebar width from localStorage
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth));
    }

    // Close context menu when clicking outside
    const handleClickOutside = (_e: MouseEvent) => {
      if (showContextMenu) {
        setShowContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [user.id, showContextMenu]); // refreshTrigger removed from dependencies

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Use centralized refresh function for courses and chats
      onRefreshData();
      
      // Fetch topics (still local to Sidebar)
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .in('course_id', courses.map((c: any) => c.id))
        .order('created_at', { ascending: true });
      
      if (topicsError) throw topicsError;
      setTopics(topicsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to courses changes
    const coursesSubscription = supabase
      .channel('courses_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'courses', filter: `user_id=eq.${user.id}` },
        () => onRefreshData()
      )
      .subscribe();

    // Subscribe to topics changes
    const topicsSubscription = supabase
      .channel('topics_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'topics' },
        () => fetchData()
      )
      .subscribe();

    // Subscribe to chats changes
    const chatsSubscription = supabase
      .channel('chats_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'chats', filter: `user_id=eq.${user.id}` },
        () => onRefreshData()
      )
      .subscribe();

    return () => {
      coursesSubscription.unsubscribe();
      topicsSubscription.unsubscribe();
      chatsSubscription.unsubscribe();
    };
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContextMenu = (e: React.MouseEvent, type: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  const handleCreateCourseClick = () => {
    setIsCreateCourseModalOpen(true);
  };

  const handleCreateCourseSubmit = async (courseData: { name: string; emoji: string; color: string }) => {
    await onCreateCourse(courseData);
    setIsCreateCourseModalOpen(false);
  };

  const handleCreateTopic = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: 'Nuevo Tema',
          course_id: courseId,
          color: '#10b981',
          emoji: '📖'
        })
        .select()
        .single();
      
      if (error) throw error;
      setEditingItem({ type: 'topic', id: data.id, name: data.name });
      setExpanded(prev => ({ ...prev, [courseId]: true }));
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const handleCreateChat = async (topicId?: string, courseId?: string) => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          title: 'Nueva Conversación',
          topic_id: topicId,
          course_id: courseId,
          user_id: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (topicId) {
        setExpanded(prev => ({ ...prev, [topicId]: true }));
      }
      if (courseId) {
        setExpanded(prev => ({ ...prev, [courseId]: true }));
      }
      
      onChatSelect(data.id);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleRename = async (type: string, id: string, newName: string) => {
    try {
      const table = type === 'course' ? 'courses' : type === 'topic' ? 'topics' : 'chats';
      const column = table === 'chats' ? 'title' : 'name';
      
      const { error } = await supabase
        .from(table)
        .update({ [column]: newName })
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh data to update the UI
      onRefreshData();
      setEditingItem(null);
    } catch (error) {
      console.error('Error renaming item:', error);
    }
  };

  const handleDelete = (type: string, id: string) => {
    let name = 'Unknown';
    
    if (type === 'chat') {
      const chat = chats.find(c => c.id === id);
      name = chat?.title || 'Unknown';
    } else if (type === 'course') {
      const course = courses.find(c => c.id === id);
      name = course?.name || 'Unknown';
    } else {
      const topic = topics.find(t => t.id === id);
      name = topic?.name || 'Unknown';
    }
    
    setDeleteConfirmation({ type, id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    const { type, id } = deleteConfirmation;
    
    try {
      if (type === 'chat') {
        // First delete all messages associated with the chat
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('chat_id', id);
        
        if (messagesError) throw messagesError;
      }
      
      const table = type === 'course' ? 'courses' : type === 'topic' ? 'topics' : 'chats';
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh data to update the UI
      onRefreshData();
      
      // If we deleted the currently selected chat, clear the selection
      if (type === 'chat' && selectedChatId === id) {
        // Clear the current chat selection by calling onNewChat if available
        // This will be handled by the parent component
      }
      
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = Math.max(200, Math.min(500, e.clientX));
    setSidebarWidth(newWidth);
    localStorage.setItem('sidebarWidth', newWidth.toString());
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeStart = () => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const renderContextMenu = () => {
    if (!showContextMenu) return null;
    
    const { type, id } = showContextMenu;
    
    return (
      <div 
        className={styles.contextMenu}
        style={{ left: showContextMenu.x, top: showContextMenu.y }}
        onMouseLeave={() => setShowContextMenu(null)}
      >
        {type === 'course' && (
          <>
            <button onClick={() => { handleCreateTopic(id); setShowContextMenu(null); }}>➕ Añadir Tema</button>
            <button onClick={() => { handleCreateChat(undefined, id); setShowContextMenu(null); }}>💬 Añadir Chat</button>
            <button onClick={() => { setEditingItem({ type, id, name: courses.find(c => c.id === id)?.name || '' }); setShowContextMenu(null); }}>✏️ Renombrar</button>
            <button onClick={() => { /* TODO: Color picker */ setShowContextMenu(null); }}>🎨 Cambiar Color</button>
            <button onClick={() => { /* TODO: Emoji picker */ setShowContextMenu(null); }}>😀 Cambiar Icono</button>
            <button onClick={() => { handleDelete(type, id); setShowContextMenu(null); }} className={styles.deleteButton}>🗑️ Eliminar</button>
          </>
        )}
        {type === 'topic' && (
          <>
            <button onClick={() => { handleCreateChat(id); setShowContextMenu(null); }}>💬 Añadir Chat</button>
            <button onClick={() => { setEditingItem({ type, id, name: topics.find(t => t.id === id)?.name || '' }); setShowContextMenu(null); }}>✏️ Renombrar</button>
            <button onClick={() => { /* TODO: Color picker */ setShowContextMenu(null); }}>🎨 Cambiar Color</button>
            <button onClick={() => { /* TODO: Emoji picker */ setShowContextMenu(null); }}>😀 Cambiar Icono</button>
            <button onClick={() => { handleDelete(type, id); setShowContextMenu(null); }} className={styles.deleteButton}>🗑️ Eliminar</button>
          </>
        )}
        {type === 'chat' && (
          <>
            <button onClick={() => { setEditingItem({ type, id, name: chats.find(c => c.id === id)?.title || '' }); setShowContextMenu(null); }}>✏️ Renombrar</button>
            <button onClick={() => { handleDelete(type, id); setShowContextMenu(null); }} className={styles.deleteButton}>🗑️ Eliminar</button>
          </>
        )}
      </div>
    );
  };

  const renderEditInput = (item: { type: string; id: string; name: string }) => {
    return (
      <input
        type="text"
        defaultValue={item.name}
        className={styles.editInput}
        autoFocus
        onBlur={(e) => handleRename(item.type, item.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleRename(item.type, item.id, e.currentTarget.value);
          } else if (e.key === 'Escape') {
            setEditingItem(null);
          }
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className={styles.sidebar} style={{ width: sidebarWidth }}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.sidebar} style={{ width: sidebarWidth }}>
        <div className={styles.header}>
          <h3>📚 Hyperfocus AI</h3>
          <button className={styles.newCourseButton} onClick={handleCreateCourseClick}>
            ➕ New Course
          </button>
        </div>
        
        {/* History Section */}
        <div className={styles.historySection}>
          <h4 className={styles.sectionTitle}>💬 History</h4>
          <div className={styles.historyList}>
            {chats.filter(c => !c.course_id && !c.topic_id).slice(0, 10).map(chat => (
              <div 
                key={chat.id} 
                className={`${styles.historyItem} ${selectedChatId === chat.id ? styles.selected : ''}`}
                onClick={() => onChatSelect(chat.id)}
              >
                <span className={styles.chatIcon}>💬</span>
                {editingItem && editingItem.type === 'chat' && editingItem.id === chat.id ? (
                  renderEditInput(editingItem)
                ) : (
                  <span className={styles.chatTitle}>{chat.title}</span>
                )}
                <button 
                  className={styles.contextMenuButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, 'chat', chat.id);
                  }}
                >
                  ⋯
                </button>
              </div>
            ))}
            {chats.filter(c => !c.course_id && !c.topic_id).length === 0 && (
              <div className={styles.emptyHistory}>
                No conversations yet
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.content}>
          {courses.map(course => {
            const courseTopics = topics.filter(t => t.course_id === course.id);
            const courseChats = chats.filter(c => c.course_id === course.id && !c.topic_id);
            const isExpanded = expanded[course.id];
            
            return (
              <div key={course.id} className={styles.courseItem}>
                <div className={styles.itemHeader}>
                  <button 
                    className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
                    onClick={() => toggleExpanded(course.id)}
                  >
                    ▶
                  </button>
                  <span className={styles.emoji}>{course.emoji}</span>
                  {editingItem?.type === 'course' && editingItem.id === course.id ? (
                    renderEditInput(editingItem)
                  ) : (
                    <span className={styles.itemName} style={{ color: course.color }}>
                      {course.name}
                    </span>
                  )}
                  <button 
                    className={styles.contextMenuButton}
                    onClick={(e) => handleContextMenu(e, 'course', course.id)}
                  >
                    ⋯
                  </button>
                </div>
                
                {isExpanded && (
                  <div className={styles.nestedContent}>
                    {courseTopics.map(topic => {
                      const topicChats = chats.filter(c => c.topic_id === topic.id);
                      const isTopicExpanded = expanded[topic.id];
                      
                      return (
                        <div key={topic.id} className={styles.topicItem}>
                          <div className={styles.itemHeader}>
                            <button 
                              className={`${styles.expandButton} ${isTopicExpanded ? styles.expanded : ''}`}
                              onClick={() => toggleExpanded(topic.id)}
                            >
                              ▶
                            </button>
                            <span className={styles.emoji}>{topic.emoji}</span>
                            {editingItem?.type === 'topic' && editingItem.id === topic.id ? (
                              renderEditInput(editingItem)
                            ) : (
                              <span className={styles.itemName} style={{ color: topic.color }}>
                                {topic.name}
                              </span>
                            )}
                            <button 
                              className={styles.contextMenuButton}
                              onClick={(e) => handleContextMenu(e, 'topic', topic.id)}
                            >
                              ⋯
                            </button>
                          </div>
                          
                          {isTopicExpanded && (
                            <div className={styles.nestedContent}>
                              {topicChats.map(chat => (
                                <div 
                                  key={chat.id} 
                                  className={`${styles.chatItem} ${selectedChatId === chat.id ? styles.selected : ''}`}
                                  onClick={() => onChatSelect(chat.id)}
                                >
                                  <span className={styles.chatIcon}>💬</span>
                                  {editingItem?.type === 'chat' && editingItem.id === chat.id ? (
                                    renderEditInput(editingItem)
                                  ) : (
                                    <span className={styles.itemName}>{chat.title}</span>
                                  )}
                                  <button 
                                    className={styles.contextMenuButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContextMenu(e, 'chat', chat.id);
                                    }}
                                  >
                                    ⋯
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {courseChats.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`${styles.chatItem} ${selectedChatId === chat.id ? styles.selected : ''}`}
                        onClick={() => onChatSelect(chat.id)}
                      >
                        <span className={styles.chatIcon}>💬</span>
                        {editingItem?.type === 'chat' && editingItem.id === chat.id ? (
                          renderEditInput(editingItem)
                        ) : (
                          <span className={styles.itemName}>{chat.title}</span>
                        )}
                        <button 
                          className={styles.contextMenuButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e, 'chat', chat.id);
                          }}
                        >
                          ⋯
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          

        </div>
        
        <div 
          className={styles.resizeHandle}
          onMouseDown={handleResizeStart}
        />
      </div>
      
      {renderContextMenu()}
      
      <CreateCourseModal
         isOpen={isCreateCourseModalOpen}
         onClose={() => setIsCreateCourseModalOpen(false)}
         onCreateCourse={handleCreateCourseSubmit}
       />
      
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirm Deletion"
      >
        <div style={{ padding: '20px' }}>
          <p style={{ marginBottom: '20px', color: '#e2e8f0' }}>
            {deleteConfirmation?.type === 'chat' 
              ? `Are you sure you want to delete the chat "${deleteConfirmation.name}"? All messages will be permanently lost.`
              : `Are you sure you want to delete "${deleteConfirmation?.name}"?`
            }
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              onClick={() => setDeleteConfirmation(null)}
              style={{
                padding: '8px 16px',
                border: '1px solid #475569',
                background: 'transparent',
                color: '#e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={confirmDelete}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: '#dc2626',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;