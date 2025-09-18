import React, { useState } from 'react'
import { X } from 'lucide-react'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [selectedFont, setSelectedFont] = useState('standard')
  const [selectedColorTheme, setSelectedColorTheme] = useState('vibrant')

  const fontOptions = [
    { id: 'standard', label: 'Standard' },
    { id: 'fast-reading', label: 'Fast Reading (beta)' }
  ]

  const colorThemes = [
    { 
      id: 'vibrant', 
      label: 'Vibrant',
      colors: ['#ff6b9d', '#4ecdc4', '#45b7d1']
    },
    { 
      id: 'calm', 
      label: 'Calm',
      colors: ['#a8e6cf', '#dcedc1', '#ffd3a5']
    },
    { 
      id: 'monochrome', 
      label: 'Monochrome',
      colors: ['#6c757d', '#adb5bd', '#dee2e6']
    }
  ]

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
                  checked={selectedFont === font.id}
                  onChange={(e) => setSelectedFont(e.target.value)}
                />
                <span className="radio-custom"></span>
                <span className="font-label">{font.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h4>COLORS</h4>
          <div className="color-themes">
            {colorThemes.map(theme => (
              <div 
                key={theme.id} 
                className={`color-theme ${selectedColorTheme === theme.id ? 'selected' : ''}`}
                onClick={() => setSelectedColorTheme(theme.id)}
              >
                <div className="color-preview">
                  {theme.colors.map((color, index) => (
                    <div 
                      key={index}
                      className="color-circle"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
                <span className="theme-label">{theme.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel