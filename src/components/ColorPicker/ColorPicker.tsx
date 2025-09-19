import React, { useState } from 'react'
import './ColorPicker.css'

interface ColorPickerProps {
  isOpen: boolean
  onClose: () => void
  onColorSelect: (color: string) => void
  currentColor: string
  title: string
}

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  isOpen, 
  onClose, 
  onColorSelect, 
  currentColor, 
  title 
}) => {
  const [customColor, setCustomColor] = useState(currentColor)

  const presetColors = [
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b',
    '#10b981', '#f97316', '#ec4899', '#84cc16', '#6366f1',
    '#14b8a6', '#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b',
    '#ffffff', '#e5e7eb', '#9ca3af', '#6b7280', '#374151'
  ]

  const handleColorSelect = (color: string) => {
    onColorSelect(color)
    onClose()
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
  }

  const handleCustomColorSelect = () => {
    onColorSelect(customColor)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker" onClick={(e) => e.stopPropagation()}>
        <div className="color-picker-header">
          <h4>{title}</h4>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="color-picker-content">
          <div className="preset-colors">
            <h5>Colores Predefinidos</h5>
            <div className="color-grid">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  className={`color-option ${currentColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div className="custom-color">
            <h5>Color Personalizado</h5>
            <div className="custom-color-input">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="color-input"
              />
              <input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                className="color-text-input"
                placeholder="#000000"
              />
              <button 
                className="apply-button"
                onClick={handleCustomColorSelect}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorPicker