import React, { useEffect } from 'react'
import { X, Copy, Download } from 'lucide-react'
import styles from './ImageModal.module.css'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  imageAlt: string
  fileName: string
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  isOpen, 
  onClose, 
  imageSrc, 
  imageAlt, 
  fileName 
}) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleCopyImage = async () => {
    try {
      // Convert data URL to blob
      const response = await fetch(imageSrc)
      const blob = await response.blob()
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ])
      
      // You could add a toast notification here
      console.log('Image copied to clipboard')
    } catch (error) {
      console.error('Failed to copy image:', error)
      // Fallback: try to copy the image URL
      try {
        await navigator.clipboard.writeText(imageSrc)
        console.log('Image URL copied to clipboard')
      } catch (urlError) {
        console.error('Failed to copy image URL:', urlError)
      }
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = imageSrc
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <span className={styles.fileName}>{fileName}</span>
          <div className={styles.modalActions}>
            <button 
              className={styles.actionButton}
              onClick={handleCopyImage}
              title="Copy image"
            >
              <Copy size={18} />
            </button>
            <button 
              className={styles.actionButton}
              onClick={handleDownload}
              title="Download image"
            >
              <Download size={18} />
            </button>
            <button 
              className={styles.closeButton}
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={styles.imageContainer}>
          <img 
            src={imageSrc} 
            alt={imageAlt} 
            className={styles.modalImage}
          />
        </div>
      </div>
    </div>
  )
}

export default ImageModal