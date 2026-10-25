import React, { useState } from 'react'
import type { Side } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export type EmoteType =
  | 'wellplayed'
  | 'oops'
  | 'brains'
  | 'gargantuar'
  | 'thinking'
  | 'hello'
  | 'goodgame'
  | 'noway'
  | 'taunt'
  | 'victory'

export interface HeroEmoteOption {
  type: EmoteType
  label: string
  emoji: string
  plantSpeech: string
  zombieSpeech: string
  bgClass: string
}

export const HERO_EMOTE_OPTIONS: HeroEmoteOption[] = [
  {
    type: 'wellplayed',
    label: 'Well Played!',
    emoji: '👏',
    plantSpeech: 'Nước đi hay lắm! Rất đáng khen ngợi!',
    zombieSpeech: 'Graagh! Đánh cũng khá đấy đối thủ!',
    bgClass: 'emote-btn-wellplayed',
  },
  {
    type: 'oops',
    label: 'Oops!',
    emoji: '😱',
    plantSpeech: 'Ối chao! Nước đi này hơi lỗi một chút...',
    zombieSpeech: 'Ối! Rơi mất một cánh tay rồi!',
    bgClass: 'emote-btn-oops',
  },
  {
    type: 'brains',
    label: 'Brains...',
    emoji: '🧠',
    plantSpeech: 'Không có não ở đây cho các ngươi đâu!',
    zombieSpeech: 'Não... Não tươi ngon ngất ngây...',
    bgClass: 'emote-btn-brains',
  },
  {
    type: 'gargantuar',
    label: 'Gargantuar Roar!',
    emoji: '👹',
    plantSpeech: 'Đứng im! Cột điện cũng phải gục ngã!',
    zombieSpeech: 'GRAAAWWWRRR! Đập tan tất cả!',
    bgClass: 'emote-btn-gargantuar',
  },
  {
    type: 'thinking',
    label: 'Thinking...',
    emoji: '🤔',
    plantSpeech: 'Chờ chút, đang tính toán chiến thuật...',
    zombieSpeech: 'Để ta vắt óc suy nghĩ một phen...',
    bgClass: 'emote-btn-thinking',
  },
  {
    type: 'hello',
    label: 'Hello!',
    emoji: '👋',
    plantSpeech: 'Chào đối thủ! Cây cỏ đã sẵn sàng!',
    zombieSpeech: 'Graaaagh! Chào đĩa não ngon lành!',
    bgClass: 'emote-btn-hello',
  },
  {
    type: 'goodgame',
    label: 'Good Game!',
    emoji: '🤝',
    plantSpeech: 'Trận đấu tuyệt vời! Thật khâm phục!',
    zombieSpeech: 'Trận chiến nảy lửa! Thật sảng khoái!',
    bgClass: 'emote-btn-goodgame',
  },
  {
    type: 'noway',
    label: 'No Way!',
    emoji: '💢',
    plantSpeech: 'Không thể nào! Thật không thể tin được!',
    zombieSpeech: 'Lũ cỏ lá đáng ghét! Không thể nào!',
    bgClass: 'emote-btn-noway',
  },
]

export interface HeroEmotesBarProps {
  heroSide?: Side
  onTriggerEmote: (type: EmoteType, speech: string, emoji: string) => void
  disabled?: boolean
}

export const HeroEmotesBar: React.FC<HeroEmotesBarProps> = ({
  heroSide = 'plants',
  onTriggerEmote,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectEmote = (opt: HeroEmoteOption) => {
    if (disabled) return
    const speech = heroSide === 'plants' ? opt.plantSpeech : opt.zombieSpeech
    soundManager.playEmote(opt.type)
    onTriggerEmote(opt.type, speech, opt.emoji)
    setIsOpen(false)
  }

  const handleToggleOpen = () => {
    if (disabled) return
    soundManager.playClick()
    setIsOpen((prev) => !prev)
  }

  return (
    <div className={`hero-emotes-bar-container ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {/* Floating Toggle Pill */}
      <button
        type="button"
        className={`hero-emotes-toggle-pill ${isOpen ? 'active-toggle' : ''}`}
        onClick={handleToggleOpen}
        disabled={disabled}
        title="Biểu cảm Hero (Emotes & Taunts)"
      >
        <span className="emotes-toggle-icon">💬</span>
        <span className="emotes-toggle-text">Biểu cảm</span>
        <span className="emotes-arrow-indicator">{isOpen ? '▼' : '▲'}</span>
      </button>

      {/* 4 Comic Emote Choices Popover Strip */}
      {isOpen && (
        <div className="hero-emotes-palette">
          {HERO_EMOTE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              type="button"
              className={`hero-emote-choice-btn ${opt.bgClass}`}
              onClick={() => handleSelectEmote(opt)}
              title={`${opt.label}: "${heroSide === 'plants' ? opt.plantSpeech : opt.zombieSpeech}"`}
            >
              <span className="emote-btn-emoji">{opt.emoji}</span>
              <span className="emote-btn-label">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeroEmotesBar
