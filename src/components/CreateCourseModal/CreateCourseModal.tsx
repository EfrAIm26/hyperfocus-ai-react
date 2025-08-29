import React, { useState } from 'react'
import Modal from '../Modal/Modal'
import styles from './CreateCourseModal.module.css'

interface CreateCourseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateCourse: (courseData: { name: string; emoji: string; color: string }) => Promise<void>
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onCreateCourse }) => {
  const [courseName, setCourseName] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('📚')
  const [selectedColor, setSelectedColor] = useState('#3b82f6')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const emojis = ['📚', '💻', '🧮', '🔬', '🎨', '🏛️', '🌍', '📖', '🎵', '⚽', '🍳', '🚗']
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6366f1'  // indigo
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courseName.trim()) {
      setError('El nombre del curso es requerido')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onCreateCourse({
        name: courseName.trim(),
        emoji: selectedEmoji,
        color: selectedColor
      })
      
      // Reset form
      setCourseName('')
      setSelectedEmoji('📚')
      setSelectedColor('#3b82f6')
      onClose()
    } catch (err) {
      setError('Error al crear el curso. Inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setCourseName('')
      setSelectedEmoji('📚')
      setSelectedColor('#3b82f6')
      setError('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Curso">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>Nombre del Curso</label>
          <input
            type="text"
            className={styles.input}
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Ej: Matemáticas Avanzadas"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Emoji</label>
          <div className={styles.emojiGrid}>
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`${styles.emojiButton} ${selectedEmoji === emoji ? styles.selected : ''}`}
                onClick={() => setSelectedEmoji(emoji)}
                disabled={isLoading}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>Color</label>
          <div className={styles.colorGrid}>
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorButton} ${selectedColor === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.createButton}
            disabled={isLoading || !courseName.trim()}
          >
            {isLoading ? 'Creando...' : 'Crear Curso'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateCourseModal