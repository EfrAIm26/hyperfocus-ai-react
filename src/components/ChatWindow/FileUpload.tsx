import React, { useRef, useState } from 'react'
import { Paperclip, X, Image, FileText, File } from 'lucide-react'
import ImageModal from './ImageModal'
import styles from './FileUpload.module.css'

interface UploadedFile {
  id: string
  file: File
  type: 'image' | 'document' | 'other'
  preview?: string
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void
  disabled?: boolean
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, disabled }) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [modalImage, setModalImage] = useState<{ src: string; alt: string; fileName: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getFileType = (file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/')) return 'image'
    
    // Check for supported document types
    const supportedDocTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ]
    
    if (supportedDocTypes.includes(file.type)) return 'document'
    
    // Fallback: check by file extension
    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.pptx')) {
      return 'document'
    }
    
    return 'other'
  }

  const getFileIcon = (type: 'image' | 'document' | 'other') => {
    switch (type) {
      case 'image': return <Image size={16} />
      case 'document': return <FileText size={16} />
      default: return <File size={16} />
    }
  }

  const handleFileSelect = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    const newFiles: UploadedFile[] = files.map(file => {
      const fileType = getFileType(file)
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        file,
        type: fileType
      }

      // Create preview for images
      if (fileType === 'image') {
        const reader = new FileReader()
        reader.onload = (e) => {
          uploadedFile.preview = e.target?.result as string
          setUploadedFiles(prev => {
            const updated = prev.map(f => f.id === uploadedFile.id ? uploadedFile : f)
            onFilesChange(updated)
            return updated
          })
        }
        reader.readAsDataURL(file)
      }

      return uploadedFile
    })

    const updatedFiles = [...uploadedFiles, ...newFiles]
    setUploadedFiles(updatedFiles)
    onFilesChange(updatedFiles)
    
    // Reset input
    if (event.target) {
      event.target.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId)
    setUploadedFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const openImageModal = (file: UploadedFile) => {
    if (file.type === 'image' && file.preview) {
      setModalImage({
        src: file.preview,
        alt: file.file.name,
        fileName: file.file.name
      })
    }
  }

  const closeImageModal = () => {
    setModalImage(null)
  }

  return (
    <div className={styles.fileUploadContainer}>
      <button 
        className={styles.attachButton}
        onClick={handleFileSelect}
        disabled={disabled}
        title="Attach files"
      >
        <Paperclip size={18} />
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.docx,.pptx"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
      
      {uploadedFiles.length > 0 && (
        <div className={styles.filesPreview}>
          {uploadedFiles.map(file => (
            <div key={file.id} className={styles.fileItem}>
              {file.type === 'image' && file.preview ? (
                <div className={styles.imagePreview}>
                  <img 
                    src={file.preview} 
                    alt={file.file.name}
                    onClick={() => openImageModal(file)}
                    className={styles.clickableImage}
                  />
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeFile(file.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className={styles.filePreview}>
                  <div className={styles.fileIcon}>
                    {getFileIcon(file.type)}
                  </div>
                  <span className={styles.fileName}>{file.file.name}</span>
                  <button 
                    className={styles.removeButton}
                    onClick={() => removeFile(file.id)}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <ImageModal
        isOpen={modalImage !== null}
        onClose={closeImageModal}
        imageSrc={modalImage?.src || ''}
        imageAlt={modalImage?.alt || ''}
        fileName={modalImage?.fileName || ''}
      />
    </div>
  )
}

export default FileUpload