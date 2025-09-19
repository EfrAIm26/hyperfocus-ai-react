import React from 'react'
import { processBionicText, type BionicText as BionicTextType } from '../../utils/bionicProcessor'
import styles from './BionicText.module.css'

interface BionicTextProps {
  content: string
  className?: string
}

/**
 * BionicText Component
 * 
 * A "dumb" component that renders text in bionic reading format.
 * It takes regular text as input and displays it with emphasized first parts of words.
 */
const BionicText: React.FC<BionicTextProps> = ({ content, className = '' }) => {
  // Process the text using the bionic processor
  const bionicText: BionicTextType = processBionicText(content)

  // If no content or processing failed, return empty
  if (!bionicText.words.length) {
    return null
  }

  return (
    <span className={`${styles.bionicText} ${className}`}>
      {bionicText.words.map((word, index) => {
        // Handle spaces
        if (word.isSpace) {
          return (
            <span key={index} className={styles.space}>
              {word.normal}
            </span>
          )
        }

        // Handle punctuation
        if (word.isPunctuation) {
          return (
            <span key={index} className={styles.punctuation}>
              {word.normal}
            </span>
          )
        }

        // Handle regular words with bold/normal parts
        return (
          <span key={index} className={styles.word}>
            {word.bold && (
              <strong className={styles.bold}>
                {word.bold}
              </strong>
            )}
            {word.normal && (
              <span className={styles.normal}>
                {word.normal}
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

export default BionicText