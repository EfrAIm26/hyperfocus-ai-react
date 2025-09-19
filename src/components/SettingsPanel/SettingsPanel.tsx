import React from 'react'
import { X } from 'lucide-react'
import { useSettings } from '../../contexts/SettingsContext'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

// Removed ColorPickerState interface as we're using color themes now

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  // Use global settings state instead of local state
  const { settings, updateSettings } = useSettings()
  
  // Color themes data
  const colorThemes = [
    {
      id: 'default',
      label: 'Default',
      colors: ['#e5e7eb', '#94a3b8', '#64748b']
    },
    {
      id: 'vibrant',
      label: 'Vibrant',
      colors: ['#6ee7b7', '#34d399', '#10b981']
    },
    {
      id: 'calm',
      label: 'Calm',
      colors: ['#fcd34d', '#f59e0b', '#d97706']
    },
    {
      id: 'monochrome',
      label: 'Monochrome',
      colors: ['#d1d5db', '#9ca3af', '#6b7280']
    },
    {
      id: 'red',
      label: 'Red',
      colors: ['#fca5a5', '#ef4444', '#dc2626']
    },
    {
      id: 'green',
      label: 'Green',
      colors: ['#86efac', '#22c55e', '#16a34a']
    },
    {
      id: 'blue',
      label: 'Blue',
      colors: ['#93c5fd', '#3b82f6', '#2563eb']
    },
    {
      id: 'purple',
      label: 'Purple',
      colors: ['#c4b5fd', '#8b5cf6', '#7c3aed']
    },
    {
      id: 'orange',
      label: 'Orange',
      colors: ['#fdba74', '#f97316', '#ea580c']
    }
  ]

  const fontOptions = [
    { id: 'standard', label: 'Standard' },
    { id: 'bionic', label: 'Fast Reading (beta)' }
  ]

  // Handler for color theme change
  const handleColorThemeChange = (themeId: 'default' | 'vibrant' | 'calm' | 'monochrome' | 'red' | 'green' | 'blue' | 'purple' | 'orange') => {
    updateSettings({ colorTheme: themeId })
  }

  // Handler functions for updating settings
  const handleFontChange = (fontMode: 'standard' | 'bionic') => {
    updateSettings({ fontMode })
  }

  // Removed color picker handlers as we're using predefined themes now

  return (
    <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
      <div className="settings-header">
        <h3>Settings</h3>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h4>FONTS</h4>
          <div className="font-options">
            {fontOptions.map(font => (
              <label key={font.id} className="font-option">
                <input
                  type="radio"
                  name="font"
                  value={font.id}
                  checked={settings.fontMode === font.id}
                  onChange={(e) => handleFontChange(e.target.value as 'standard' | 'bionic')}
                />
                <span className="radio-custom"></span>
                <span className="font-label">{font.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Color Themes Section */}
        <div className="settings-section">
          <h4>COLORS</h4>
          <div className="color-themes">
            {colorThemes.map(theme => (
              <div 
                key={theme.id}
                className={`color-theme ${settings.colorTheme === theme.id ? 'selected' : ''}`}
                onClick={() => handleColorThemeChange(theme.id as 'default' | 'vibrant' | 'calm' | 'monochrome' | 'red' | 'green' | 'blue' | 'purple' | 'orange')}
              >
                <div className="color-preview">
                  {theme.colors.map((color, index) => (
                    <div 
                      key={index}
                      className="color-circle"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="theme-label">{theme.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Color Picker Modal removed as we're using predefined themes */}
    </div>
  )
}

export default SettingsPanel