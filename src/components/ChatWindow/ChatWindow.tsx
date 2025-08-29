import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../supabaseClient'
import styles from './ChatWindow.module.css'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

interface ChatWindowProps {
  user: User
  selectedChatId?: string
  onNewChat?: () => void
  onSendMessage?: (message: string, chatId?: string) => Promise<string | null>
}

const ChatWindow: React.FC<ChatWindowProps> = ({ user, selectedChatId, onNewChat, onSendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('mistral-small-3.2')
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const models = [
    { value: 'mistral-small-3.2', label: 'Mistral Small 3.2' },
    { value: 'llama-3-8b', label: 'Llama 3 8B' },
    { value: 'grok-4', label: 'Grok-4' },
    { value: 'claude-4-sonnet', label: 'Claude-4-Sonnet' },
    { value: 'openai-gpt-5-nano', label: 'OpenAI GPT-5 Nano' }
  ]

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
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      const formattedMessages: Message[] = (messagesData || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role as 'user' | 'assistant',
        timestamp: new Date(msg.created_at)
      }))

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }, [])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setCurrentChatId(null)
    initializeNewChat()
  }, [initializeNewChat])

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
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          content: message.content,
          role: message.role,
          created_at: message.timestamp.toISOString()
        })

      if (error) {
        console.error('Error saving message:', error)
      }
    } catch (error) {
      console.error('Error saving message to Supabase:', error)
    }
  }

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    try {
      // Generate title from first message (first 50 characters)
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage

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
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date()
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    const messageContent = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    try {
      // Use centralized function to handle chat creation and get chat ID
      let chatId = currentChatId
      if (onSendMessage) {
        chatId = await onSendMessage(messageContent, currentChatId)
        if (chatId && chatId !== currentChatId) {
          setCurrentChatId(chatId)
        }
      }

      if (!chatId) {
        throw new Error('Failed to create or get chat ID')
      }

      // Save user message to Supabase
      await saveMessageToSupabase(userMessage, chatId)

      // Update chat title if this is the first message
      if (messages.length === 0) {
        await updateChatTitle(chatId, userMessage.content)
      }
      const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
      
      if (!apiKey) {
        throw new Error('OpenRouter API key not configured')
      }

      // Use a direct API call to OpenRouter instead of local API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Hyperfocus AI'
        },
        body: JSON.stringify({
          model: getModelId(selectedModel),
          messages: currentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 1000
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

      setMessages(prev => [...prev, assistantMessage])
      
      // Save assistant message to Supabase
      await saveMessageToSupabase(assistantMessage, chatId)
      
      // Ensure scroll to bottom after assistant message
      setTimeout(() => scrollToBottom(), 100)

    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      // Ensure scroll to bottom after error message
      setTimeout(() => scrollToBottom(), 100)
    } finally {
      setIsLoading(false)
    }
  }

  const getModelId = (model: string) => {
    const modelMap: { [key: string]: string } = {
      'mistral-small-3.2': 'mistralai/mistral-7b-instruct',
      'llama-3-8b': 'meta-llama/llama-3-8b-instruct',
      'grok-4': 'x-ai/grok-beta',
      'claude-4-sonnet': 'anthropic/claude-3-sonnet',
      'openai-gpt-5-nano': 'openai/gpt-4-turbo'
    }
    return modelMap[model] || modelMap['mistral-small-3.2']
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className={styles.chatWindow}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <h1 className={styles.welcomeTitle}>Hyperfocus AI</h1>
          <p className={styles.welcomeSubtitle}>Your intelligent study assistant</p>
        </div>
        <div className={styles.headerRight}>
          <select 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            className={styles.modelSelect}
          >
            {models.map(model => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          <button className={styles.newChatButton} onClick={handleNewChat}>
            ➕ New Chat
          </button>
        </div>
      </div>
      
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🧠</div>
            <h2>Start a conversation</h2>
            <p>Ask me anything about your studies, and I'll help you learn more effectively.</p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.botMessage}`}
              >
                <div className={styles.messageContent}>
                  {message.content}
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
            disabled={!inputMessage.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatWindow