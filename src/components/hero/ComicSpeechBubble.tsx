import React, { useEffect, useState } from 'react'

export interface ComicSpeechBubbleProps {
  text: string
  emoji?: string
  side: 'plants' | 'zombies'
  onDismiss?: () => void
  duration?: number // default 3500ms
}

export const ComicSpeechBubble: React.FC<ComicSpeechBubbleProps> = ({
  text,
  emoji = '💬',
  side,
  onDismiss,
  duration = 3500,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, duration - 400)

    const dismissTimer = setTimeout(() => {
      if (onDismiss) {
        onDismiss()
      }
    }, duration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(dismissTimer)
    }
  }, [duration, onDismiss, text])

  return (
    <div
      className={`comic-speech-bubble-anchor speech-bubble-${side} ${
        isFadingOut ? 'bubble-is-fading' : ''
      }`}
      onClick={onDismiss}
      title="Click để đóng bong bóng thoại"
    >
      <div className="comic-speech-bubble-body">
        <span className="comic-speech-emoji">{emoji}</span>
        <span className="comic-speech-text">{text}</span>
      </div>
      {/* Comic speech bubble directional tail */}
      <div className="comic-speech-tail" />
    </div>
  )
}

export default ComicSpeechBubble
