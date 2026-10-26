import React, { useEffect, useState } from 'react'
import { soundManager } from '../../audio/SoundManager'

export interface ComicSpeechBubbleProps {
  text?: string
  message?: string
  emoji?: string
  side?: 'plants' | 'zombies'
  heroSide?: 'plants' | 'zombies'
  onDismiss?: () => void
  duration?: number
  durationMs?: number // default 2500ms (Round 12 standard)
}

export const ComicSpeechBubble: React.FC<ComicSpeechBubbleProps> = ({
  text,
  message,
  emoji = '💬',
  side,
  heroSide,
  onDismiss,
  duration,
  durationMs,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const effectiveText = message ?? text ?? ''
  const effectiveSide = heroSide ?? side ?? 'plants'
  const effectiveDuration = durationMs ?? duration ?? 2500

  useEffect(() => {
    try {
      soundManager.playBubblePop()
    } catch {
      // Sound fallback
    }

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true)
    }, Math.max(100, effectiveDuration - 400))

    const dismissTimer = setTimeout(() => {
      if (onDismiss) {
        onDismiss()
      }
    }, effectiveDuration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(dismissTimer)
    }
  }, [effectiveDuration, onDismiss, effectiveText])

  return (
    <div
      className={`comic-speech-bubble-wrapper comic-speech-bubble-anchor bubble-${effectiveSide} speech-bubble-${effectiveSide} ${
        isFadingOut ? 'bubble-is-fading' : ''
      }`}
      onClick={onDismiss}
      title="Click để đóng bong bóng thoại"
    >
      <div className="comic-speech-bubble-body">
        <span className="comic-speech-emoji">{emoji}</span>
        <span className="comic-speech-text">{effectiveText}</span>
      </div>
      {/* Comic speech bubble directional tail */}
      <div className="comic-speech-tail speech-bubble-tail" />
    </div>
  )
}

export default ComicSpeechBubble
