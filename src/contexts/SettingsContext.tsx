import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'

// Types for settings
export interface AppSettings {
  fontMode: 'standard' | 'bionic'
  colorTheme: 'default' | 'vibrant' | 'calm' | 'monochrome' | 'red' | 'green' | 'blue' | 'purple' | 'orange'
  colors: {
    heading: string
    subheading: string
    body: string
  }
}

// Default settings values
const DEFAULT_SETTINGS: AppSettings = {
  fontMode: 'standard',
  colorTheme: 'default',
  colors: {
    heading: '#06b6d4', // Cyan-500 para headings
    subheading: '#3b82f6', // Blue-500 para subheadings  
    body: '#e2e8f0' // Slate-200 para body text (color actual del chat)
  }
}

// Context interface
interface SettingsContextType {
  settings: AppSettings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
  isLoading: boolean
}

// Create context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Provider props
interface SettingsProviderProps {
  children: ReactNode
  user: User | null
}

// Settings provider component
export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children, user }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)

  // Load settings from localStorage and Supabase when user changes
  useEffect(() => {
    if (user) {
      loadSettings()
    } else {
      // Reset to default when no user
      setSettings(DEFAULT_SETTINGS)
    }
  }, [user])

  // Load settings from localStorage first, then sync with Supabase
  const loadSettings = async () => {
    setIsLoading(true)
    
    try {
      // First, try to load from localStorage for immediate UI update
      const localSettings = localStorage.getItem('app-settings')
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      }

      // Then, load from Supabase (source of truth)
      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .single()

        if (data && !error) {
          const supabaseSettings = { ...DEFAULT_SETTINGS, ...data.settings }
          setSettings(supabaseSettings)
          // Update localStorage with Supabase data
          localStorage.setItem('app-settings', JSON.stringify(supabaseSettings))
        } else if (error && error.code === 'PGRST116') {
          // No settings found, create default settings in Supabase
          await createDefaultSettings()
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create default settings in Supabase
  const createDefaultSettings = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          settings: DEFAULT_SETTINGS
        })

      if (error) {
        console.error('Error creating default settings:', error)
      }
    } catch (error) {
      console.error('Error creating default settings:', error)
    }
  }

  // Update settings function
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    
    // Optimistic update for immediate UI response
    setSettings(updatedSettings)
    
    // Save to localStorage immediately
    localStorage.setItem('app-settings', JSON.stringify(updatedSettings))

    // Save to Supabase in background
    if (user) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            settings: updatedSettings
          })

        if (error) {
          console.error('Error saving settings to Supabase:', error)
          // Could implement retry logic here
        }
      } catch (error) {
        console.error('Error saving settings:', error)
      }
    }
  }

  const value: SettingsContextType = {
    settings,
    updateSettings,
    isLoading
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

// Custom hook to use settings context
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export default SettingsContext