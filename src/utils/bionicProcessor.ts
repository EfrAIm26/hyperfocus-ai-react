/**
 * Bionic Reading Processor
 * 
 * This module provides a pure function to convert regular text into bionic reading format.
 * Bionic reading emphasizes the first part of words to help with faster reading comprehension.
 */

// Interface for processed word parts
export interface BionicWord {
  bold: string
  normal: string
  isSpace?: boolean
  isPunctuation?: boolean
  original: string
}

// Interface for the complete processed text
export interface BionicText {
  words: BionicWord[]
  originalText: string
}

/**
 * Calculates the optimal split point for a word based on its length
 * @param wordLength - The length of the word
 * @returns The index where to split the word
 */
function calculateSplitPoint(wordLength: number): number {
  if (wordLength <= 1) return 1
  if (wordLength <= 3) return 1
  if (wordLength <= 5) return Math.ceil(wordLength / 2)
  if (wordLength <= 8) return Math.ceil(wordLength * 0.4)
  return Math.ceil(wordLength * 0.35)
}

/**
 * Checks if a character is a letter
 * @param char - Character to check
 * @returns True if the character is a letter
 */
function isLetter(char: string): boolean {
  return /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]$/.test(char)
}

/**
 * Checks if a string contains only punctuation
 * @param str - String to check
 * @returns True if the string contains only punctuation
 */
function isPunctuation(str: string): boolean {
  return /^[^\w\s]+$/.test(str)
}

/**
 * Processes a single word into bionic format
 * @param word - The word to process
 * @returns BionicWord object with bold and normal parts
 */
function processWord(word: string): BionicWord {
  // Handle empty strings
  if (!word) {
    return {
      bold: '',
      normal: '',
      original: word
    }
  }

  // Handle spaces
  if (/^\s+$/.test(word)) {
    return {
      bold: '',
      normal: word,
      isSpace: true,
      original: word
    }
  }

  // Handle pure punctuation
  if (isPunctuation(word)) {
    return {
      bold: '',
      normal: word,
      isPunctuation: true,
      original: word
    }
  }

  // Extract letters only for processing
  const letters = word.split('').filter(char => isLetter(char)).join('')
  
  // If no letters found, return as normal text
  if (letters.length === 0) {
    return {
      bold: '',
      normal: word,
      original: word
    }
  }

  // Calculate split point based on letter count
  const splitPoint = calculateSplitPoint(letters.length)
  
  // Find the position in the original word where we should split
  let letterCount = 0
  let splitIndex = 0
  
  for (let i = 0; i < word.length; i++) {
    if (isLetter(word[i])) {
      letterCount++
      if (letterCount === splitPoint) {
        splitIndex = i + 1
        break
      }
    }
  }

  // Split the word
  const bold = word.substring(0, splitIndex)
  const normal = word.substring(splitIndex)

  return {
    bold,
    normal,
    original: word
  }
}

/**
 * Converts regular text into bionic reading format
 * @param text - The input text to process
 * @returns BionicText object containing processed words and original text
 */
export function processBionicText(text: string): BionicText {
  if (!text || typeof text !== 'string') {
    return {
      words: [],
      originalText: text || ''
    }
  }

  // Split text while preserving spaces and punctuation
  // This regex splits on word boundaries while keeping separators
  const tokens = text.split(/(\s+|[^\w\s]+|\w+)/g).filter(token => token.length > 0)
  
  const processedWords: BionicWord[] = tokens.map(token => processWord(token))

  return {
    words: processedWords,
    originalText: text
  }
}

/**
 * Utility function to convert BionicText back to plain text
 * @param bionicText - The bionic text to convert
 * @returns Plain text string
 */
export function bionicToPlainText(bionicText: BionicText): string {
  return bionicText.words.map(word => word.original).join('')
}

/**
 * Utility function to get statistics about the bionic conversion
 * @param bionicText - The bionic text to analyze
 * @returns Statistics object
 */
export function getBionicStats(bionicText: BionicText) {
  const totalWords = bionicText.words.filter(word => !word.isSpace && !word.isPunctuation).length
  const wordsWithBold = bionicText.words.filter(word => word.bold.length > 0).length
  const averageBoldRatio = totalWords > 0 
    ? bionicText.words
        .filter(word => !word.isSpace && !word.isPunctuation)
        .reduce((sum, word) => sum + (word.bold.length / word.original.length), 0) / totalWords
    : 0

  return {
    totalWords,
    wordsWithBold,
    averageBoldRatio: Math.round(averageBoldRatio * 100) / 100,
    originalLength: bionicText.originalText.length
  }
}

export default processBionicText