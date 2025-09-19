import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import ReactMarkdown from 'react-markdown'
import { Settings } from 'lucide-react'
import ThinkingIndicator from '../ThinkingIndicator'
import BionicText from '../BionicText/BionicText'
import ModelSelector from './ModelSelector'
import FileUpload from './FileUpload'
import { useSettings } from '../../contexts/SettingsContext'
import { hasMarkdownFormatting, processForBionicReading } from '../../utils/markdownCleaner'
import { aiModels } from '../../data/models'
import styles from './ChatWindow.module.css'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface UploadedFile {
  id: string
  file: File
  type: 'image' | 'document' | 'other'
  preview?: string
}

interface ChatWindowProps {
  user: User
  selectedChatId?: string
  onNewChat?: () => void
  onSendMessage?: (message: string, chatId?: string) => Promise<string | null>
  onSettingsToggle?: () => void
}

interface Category {
  id: string
  label: string
  icon: string
}

interface ExampleQuestion {
  id: string
  text: string
  category: string
}

const categories: Category[] = [
  { id: 'create', label: 'Create', icon: '✨' },
  { id: 'explore', label: 'Explore', icon: '🔍' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'learn', label: 'Learn', icon: '📚' }
]

const exampleQuestions: ExampleQuestion[] = [
  // Create category
  { id: '1', text: 'Help me create a study plan for my upcoming exams', category: 'create' },
  { id: '2', text: 'Generate flashcards for biology concepts', category: 'create' },
  { id: '3', text: 'Create a mind map for my history project', category: 'create' },
  { id: '4', text: 'Design a presentation outline for my thesis', category: 'create' },
  
  // Explore category
  { id: '5', text: 'Explain quantum physics in simple terms', category: 'explore' },
  { id: '6', text: 'What are the latest developments in AI?', category: 'explore' },
  { id: '7', text: 'How does photosynthesis work?', category: 'explore' },
  { id: '8', text: 'Explore the history of the Renaissance', category: 'explore' },
  
  // Code category
  { id: '9', text: 'Write a Python function to sort a list', category: 'code' },
  { id: '10', text: 'Explain React hooks with examples', category: 'code' },
  { id: '11', text: 'Debug this JavaScript code for me', category: 'code' },
  { id: '12', text: 'Create a REST API with Node.js', category: 'code' },
  
  // Learn category
  { id: '13', text: 'Teach me calculus step by step', category: 'learn' },
  { id: '14', text: 'How can I improve my memory retention?', category: 'learn' },
  { id: '15', text: 'Best study techniques for language learning', category: 'learn' },
  { id: '16', text: 'Explain machine learning algorithms', category: 'learn' }
]

// Component for intelligent message rendering
// Component for rendering mixed content (bold + bionic)
const MixedContentRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Parse content to separate bold and normal text
  const renderMixedContent = () => {
    const parts = []
    const boldRegex = /\*\*(.*?)\*\*/g
    let lastIndex = 0
    let match
    let key = 0

    while ((match = boldRegex.exec(content)) !== null) {
      // Add normal text before bold (with bionic processing)
      if (match.index > lastIndex) {
        const normalText = content.slice(lastIndex, match.index)
        if (normalText.trim()) {
          parts.push(
            <BionicText key={key++} content={normalText} />
          )
        }
      }

      // Add bold text (as ReactMarkdown to preserve formatting)
      parts.push(
        <ReactMarkdown key={key++}>{match[0]}</ReactMarkdown>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining normal text
    if (lastIndex < content.length) {
      const normalText = content.slice(lastIndex)
      if (normalText.trim()) {
        parts.push(
          <BionicText key={key++} content={normalText} />
        )
      }
    }

    // If no bold text found, render all as bionic
    if (parts.length === 0) {
      return <BionicText content={content} />
    }

    return <>{parts}</>
  }

  return <div className={styles.mixedContent}>{renderMixedContent()}</div>
}

const MessageRenderer: React.FC<{ content: string; fontMode: 'standard' | 'bionic' }> = ({ content, fontMode }) => {
  const [processedContent, setProcessedContent] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { settings } = useSettings()

  useEffect(() => {
    if (fontMode === 'bionic' && hasMarkdownFormatting(content)) {
      setIsProcessing(true)
      processForBionicReading(content)
        .then(processed => {
          setProcessedContent(processed)
          setIsProcessing(false)
        })
        .catch(error => {
          console.error('Error processing for bionic reading:', error)
          setProcessedContent(content) // Fallback to original content
          setIsProcessing(false)
        })
    } else {
      setProcessedContent(null)
      setIsProcessing(false)
    }
  }, [content, fontMode])

  // Componentes personalizados para react-markdown con colores dinámicos
  const customComponents = {
    h2: ({ children, ...props }: any) => (
      <h2 {...props} style={{ color: settings.colors.heading }}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: any) => (
      <h3 {...props} style={{ color: settings.colors.subheading }}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }: any) => (
      <p {...props} style={{ color: settings.colors.body }}>
        {children}
      </p>
    )
  }

  // Show loading state while processing
  if (isProcessing) {
    return <div className={styles.processingText}>Processing...</div>
  }

  // Bionic mode with mixed content (bold preserved + bionic for normal text)
  if (fontMode === 'bionic') {
    const contentToRender = processedContent !== null ? processedContent : content
    return <MixedContentRenderer content={contentToRender} />
  }

  // Standard mode with markdown and custom components for semantic coloring
  return (
    <div className={styles.mixedContent}>
      <ReactMarkdown components={customComponents}>{content}</ReactMarkdown>
    </div>
  )
}

const ChatWindow: React.FC<ChatWindowProps> = ({ user, selectedChatId, onNewChat, onSendMessage, onSettingsToggle }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(aiModels[0]?.id || 'x-ai/grok-4')
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('create')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  
  // Get settings from context for feature flags
  const { settings } = useSettings()

  // Define all callback functions first to avoid initialization errors
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    }
  }, [])

  const initializeNewChat = useCallback(async () => {
    if (!user?.id) return

    try {
      setCurrentChatId(null)
      setMessages([])
      
      // Notify parent component about new chat
      if (onNewChat) {
        onNewChat()
      }
    } catch (error) {
      console.error('Error initializing chat:', error)
    }
  }, [user?.id, onNewChat])

  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      console.log('Loading messages for chat:', chatId, 'user:', user.id)
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages - Supabase error details:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        return
      }

      console.log('Messages loaded from database:', messagesData?.length || 0, 'messages')
      console.log('Raw messages data:', messagesData)

      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.created_at)
      }))

      console.log('Formatted messages:', formattedMessages.length)
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading chat messages - Catch block:', error)
    }
  }, [user.id])



  // useEffect hooks after function definitions
  // Scroll to bottom when messages change
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated
    const timer = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [messages, scrollToBottom])

  useEffect(() => {
    // Initialize a new chat when component mounts
    if (!selectedChatId) {
      initializeNewChat()
    }
  }, [selectedChatId, initializeNewChat])

  useEffect(() => {
    // Load messages when a chat is selected
    if (selectedChatId) {
      loadChatMessages(selectedChatId)
      setCurrentChatId(selectedChatId)
    }
  }, [selectedChatId, loadChatMessages])

  const saveMessageToSupabase = async (message: Omit<Message, 'id'>, chatId: string) => {
    try {
      console.log('Saving message to Supabase:', { chatId, role: message.role, content: message.content.substring(0, 50) + '...' })
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          content: message.content,
          role: message.role,
          created_at: message.timestamp.toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving message - Supabase error details:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        return
      }
      
      console.log('Message saved successfully:', data)
    } catch (error) {
      console.error('Error saving message to Supabase - Catch block:', error)
    }
  }

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    try {
      // Generate title from first 4-5 words of the message
      const words = firstMessage.trim().split(/\s+/)
      const titleWords = words.slice(0, 5)
      const title = titleWords.join(' ') + (words.length > 5 ? '...' : '')

      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId)

      if (error) {
        console.error('Error updating chat title:', error)
      }
    } catch (error) {
      console.error('Error updating chat title:', error)
    }
  }

  const sendMessage = async () => {
    // Allow sending if there's text OR uploaded files
    if ((!inputMessage.trim() && uploadedFiles.length === 0) || isLoading) return

    // Create message content - use text if available, otherwise indicate image upload
    const messageContent = inputMessage.trim() || (uploadedFiles.length > 0 ? `[Imagen${uploadedFiles.length > 1 ? 's' : ''} subida${uploadedFiles.length > 1 ? 's' : ''}]` : '')
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    }

    // OPTIMISTIC UI: Immediately add user message and clear input
    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInputMessage('')
    setUploadedFiles([]) // Clear uploaded files
    setIsLoading(true)

    // Create a temporary "thinking" message that will be replaced
    const thinkingMessage: Message = {
      id: 'thinking-' + Date.now(),
      content: '__THINKING__',
      role: 'assistant',
      timestamp: new Date()
    }
    
    // Add thinking indicator immediately
    setMessages(prev => [...prev, thinkingMessage])

    try {
      // Use centralized function to handle chat creation and get chat ID
      let chatId = currentChatId
      if (onSendMessage) {
        chatId = await onSendMessage(messageContent, currentChatId || undefined)
        if (chatId && chatId !== currentChatId) {
          setCurrentChatId(chatId)
        }
      }

      if (!chatId) {
        throw new Error('Failed to create or get chat ID')
      }

      // Save user message to Supabase
      console.log('About to save user message:', userMessage.content.substring(0, 50) + '...')
      await saveMessageToSupabase(userMessage, chatId)
      console.log('User message saved, proceeding with AI request')

      // Update chat title if this is the first message
      if (messages.length === 0) {
        console.log('Updating chat title for first message')
        await updateChatTitle(chatId, userMessage.content)
      }

      // Use our secure backend API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: currentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.',
        role: 'assistant',
        timestamp: new Date()
      }

      // OPTIMISTIC UI: Replace thinking message with actual response
      setMessages(prev => {
        const withoutThinking = prev.filter(msg => !msg.id.startsWith('thinking-'))
        return [...withoutThinking, assistantMessage]
      })
      
      // Save assistant message to Supabase
      console.log('About to save assistant message:', assistantMessage.content.substring(0, 50) + '...')
      await saveMessageToSupabase(assistantMessage, chatId)
      console.log('Assistant message saved successfully')
      
      // Ensure scroll to bottom after assistant message
      setTimeout(() => scrollToBottom(), 100)

    } catch (error) {
      console.error('Error sending message:', error)
      
      // OPTIMISTIC UI: Remove thinking message and add error message
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.',
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => {
        const withoutThinking = prev.filter(msg => !msg.id.startsWith('thinking-'))
        return [...withoutThinking, errorMessage]
      })
      
      // Ensure scroll to bottom after error message
      setTimeout(() => scrollToBottom(), 100)
    } finally {
      setIsLoading(false)
    }
  }



  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleQuestionClick = (question: string) => {
    setInputMessage(question)
  }

  const handleFilesChange = (files: UploadedFile[]) => {
    setUploadedFiles(files)
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.welcomeTitle}>Hyperfocus AI</h1>
          <p className={styles.welcomeSubtitle}>Your intelligent study assistant</p>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.settingsButton}
            onClick={onSettingsToggle}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.filter(msg => msg.role === 'user').length === 0 ? (
          <div className={styles.welcomeScreen}>
            <div className={styles.welcomeContent}>
              <h2 className={styles.welcomeMainTitle}>How can I help you?</h2>
              
              <div className={styles.categoriesContainer}>
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.categoryButtonActive : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className={styles.categoryIcon}>{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
              
              <div className={styles.questionsContainer}>
                {exampleQuestions
                  .filter(q => q.category === selectedCategory)
                  .map(question => (
                    <button
                      key={question.id}
                      className={styles.questionButton}
                      onClick={() => handleQuestionClick(question.text)}
                    >
                      {question.text}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.botMessage}`}
              >
                <div className={styles.messageContent}>
                  {message.role === 'assistant' ? (
                    message.content === '__THINKING__' ? (
                       <ThinkingIndicator model={aiModels.find(m => m.id === selectedModel)?.name || selectedModel} />
                     ) : (
                      <MessageRenderer content={message.content} fontMode={settings.fontMode} />
                    )
                  ) : (
                    message.content
                  )}
                </div>
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.botMessage} ${styles.loadingMessage}`}>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            className={styles.messageInput}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            rows={1}
            disabled={isLoading}
          />
          <button 
            className={styles.sendButton}
            onClick={sendMessage}
            disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isLoading}
          >
            {isLoading ? (
              <div className={styles.loadingSpinner}></div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
        
        <div className={styles.bottomControls}>
          <FileUpload 
            onFilesChange={handleFilesChange}
            disabled={isLoading}
          />
          <ModelSelector 
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
    </div>
  )
}

export default ChatWindow