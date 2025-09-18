import React, { useState, useEffect } from 'react'
import './ThinkingIndicator.css'

interface ThinkingIndicatorProps {
  model?: string
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ model = 'AI' }) => {
  const [dots, setDots] = useState('')
  const [currentPhrase, setCurrentPhrase] = useState(0)
  
  const thinkingPhrases = [
    'Thinking',
    'Analyzing',
    'Processing',
    'Generating response',
    'Almost ready'
  ]

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ''
        return prev + '.'
      })
    }, 500)

    const phraseInterval = setInterval(() => {
      setCurrentPhrase(prev => (prev + 1) % thinkingPhrases.length)
    }, 2000)

    return () => {
      clearInterval(dotsInterval)
      clearInterval(phraseInterval)
    }
  }, [])

  return (
    <div className="thinking-indicator">
      <div className="thinking-content">
        <div className="thinking-avatar">
          <div className="thinking-brain">
            <div className="brain-wave"></div>
            <div className="brain-wave"></div>
            <div className="brain-wave"></div>
          </div>
        </div>
        <div className="thinking-text">
          <div className="thinking-phrase">
            {thinkingPhrases[currentPhrase]}{dots}
          </div>
          <div className="thinking-model">
            {model}
          </div>
        </div>
      </div>
      <div className="thinking-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  )
}

export default ThinkingIndicator