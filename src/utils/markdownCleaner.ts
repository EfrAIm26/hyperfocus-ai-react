import { remark } from 'remark'
import stripMarkdown from 'strip-markdown'

/**
 * Interface for text segments that preserves code blocks
 */
interface TextSegment {
  type: 'text' | 'code'
  content: string
  language?: string
}

/**
 * Extracts code blocks from markdown text and returns segments
 */
function extractCodeBlocks(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const codeBlockRegex = /```([\w]*)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index)
      if (textContent.trim()) {
        segments.push({
          type: 'text',
          content: textContent
        })
      }
    }

    // Add code block
    segments.push({
      type: 'code',
      content: match[0], // Full code block with backticks
      language: match[1] || 'text'
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex)
    if (textContent.trim()) {
      segments.push({
        type: 'text',
        content: textContent
      })
    }
  }

  // If no code blocks found, return the entire text as a single segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: text
    })
  }

  return segments
}

/**
 * Cleans markdown from text while preserving code blocks
 */
export async function cleanMarkdownText(markdownText: string): Promise<string> {
  try {
    const segments = extractCodeBlocks(markdownText)
    const cleanedSegments: string[] = []

    for (const segment of segments) {
      if (segment.type === 'code') {
        // Preserve code blocks as-is
        cleanedSegments.push(segment.content)
      } else {
        // Clean markdown from text segments
        const processor = remark().use(stripMarkdown)
        const result = await processor.process(segment.content)
        cleanedSegments.push(String(result))
      }
    }

    return cleanedSegments.join('')
  } catch (error) {
    console.error('Error cleaning markdown:', error)
    // Fallback: return original text if cleaning fails
    return markdownText
  }
}

/**
 * Checks if text contains markdown formatting
 */
export function hasMarkdownFormatting(text: string): boolean {
  const markdownPatterns = [
    /\*\*.*?\*\*/g, // Bold
    /\*.*?\*/g,     // Italic
    /`.*?`/g,       // Inline code
    /^#{1,6}\s/gm,  // Headers
    /^\s*[-*+]\s/gm, // Lists
    /\[.*?\]\(.*?\)/g, // Links
  ]

  return markdownPatterns.some(pattern => pattern.test(text))
}

/**
 * Interface for text segments that preserves bold text and regular text separately
 */
interface BoldTextSegment {
  type: 'bold' | 'normal' | 'code'
  content: string
  language?: string
}

/**
 * Extracts bold text segments and regular text from markdown
 */
function extractBoldSegments(text: string): BoldTextSegment[] {
  const segments: BoldTextSegment[] = []
  
  // First extract code blocks to preserve them
  const codeBlockRegex = /```([\w]*)?\n([\s\S]*?)```/g
  const inlineCodeRegex = /`([^`]+)`/g
  
  let processedText = text
  const codeBlocks: { placeholder: string; content: string; language?: string }[] = []
  
  // Replace code blocks with placeholders
  let codeBlockMatch
  let codeBlockIndex = 0
  while ((codeBlockMatch = codeBlockRegex.exec(text)) !== null) {
    const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`
    codeBlocks.push({
      placeholder,
      content: codeBlockMatch[0],
      language: codeBlockMatch[1]
    })
    processedText = processedText.replace(codeBlockMatch[0], placeholder)
    codeBlockIndex++
  }
  
  // Replace inline code with placeholders
  let inlineCodeMatch
  let inlineCodeIndex = 0
  while ((inlineCodeMatch = inlineCodeRegex.exec(processedText)) !== null) {
    const placeholder = `__INLINE_CODE_${inlineCodeIndex}__`
    codeBlocks.push({
      placeholder,
      content: inlineCodeMatch[0]
    })
    processedText = processedText.replace(inlineCodeMatch[0], placeholder)
    inlineCodeIndex++
  }
  
  // Now process bold text
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  
  while ((match = boldRegex.exec(processedText)) !== null) {
    // Add normal text before bold
    if (match.index > lastIndex) {
      const normalContent = processedText.slice(lastIndex, match.index)
      if (normalContent.trim()) {
        segments.push({
          type: 'normal',
          content: normalContent
        })
      }
    }
    
    // Add bold text (preserve the ** markers for now)
    segments.push({
      type: 'bold',
      content: match[0] // Keep the full **text** format
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining normal text
  if (lastIndex < processedText.length) {
    const normalContent = processedText.slice(lastIndex)
    if (normalContent.trim()) {
      segments.push({
        type: 'normal',
        content: normalContent
      })
    }
  }
  
  // If no bold text was found, treat entire text as normal
  if (segments.length === 0 && processedText.trim()) {
    segments.push({
      type: 'normal',
      content: processedText
    })
  }
  
  // Restore code blocks in all segments
  const finalSegments = segments.map(segment => {
    let content = segment.content
    codeBlocks.forEach(({ placeholder, content: codeContent }) => {
      content = content.replace(placeholder, codeContent)
    })
    return { ...segment, content }
  })
  
  return finalSegments
}

/**
 * Processes text for bionic reading while preserving bold formatting
 * Only applies bionic processing to normal (non-bold) text
 */
export async function processForBionicReading(markdownText: string): Promise<string> {
  try {
    const segments = extractBoldSegments(markdownText)
    
    const processedSegments = await Promise.all(
      segments.map(async (segment) => {
        if (segment.type === 'normal') {
          // Clean markdown from normal text only
          const processor = remark().use(stripMarkdown)
          const result = await processor.process(segment.content)
          return result.toString().trim()
        } else {
          // Keep bold and code segments as-is
          return segment.content
        }
      })
    )
    
    return processedSegments.join('')
  } catch (error) {
    console.error('Error processing text for bionic reading:', error)
    return markdownText // Fallback to original text
  }
}

export type { TextSegment, BoldTextSegment }