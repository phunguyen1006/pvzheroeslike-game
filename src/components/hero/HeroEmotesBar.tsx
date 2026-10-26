import React, { useState } from 'react'
import type { Side } from '../../engine/types'
import { soundManager } from '../../audio/SoundManager'

export type EmoteType =
  | 'hello'
  | 'taunt'
  | 'oops'
  | 'victory'
  | 'wellplayed'
  | 'brains'
  | 'gargantuar'
  | 'thinking'
  | 'goodgame'
  | 'noway'

export interface HeroEmoteOption {
  type: EmoteType
  label: string
  emoji: string
  plantSpeech: string
  zombieSpeech: string
  bgClass: string
}

export interface EmoteDefinition {
  id: string
  type: EmoteType
  label: string
  emoji: string
  plantSpeech: string
  zombieSpeech: string
  bgClass: string
}

// Round 10 authentic 4 core emotes
export const HERO_EMOTE_OPTIONS: HeroEmoteOption[] = [
  {
    type: 'hello',
    label: 'Hello!',
    emoji: '👋',
    plantSpeech: 'Chào đối thủ! Cây cỏ đã sẵn sàng!',
    zombieSpeech: 'Graaaagh! Chào đĩa não ngon lành!',
    bgClass: 'emote-btn-hello',
  },
  {
    type: 'taunt',
    label: 'Taunt!',
    emoji: '😏',
    plantSpeech: 'Có thế thôi sao? Cỏ này không dễ xơi đâu!',
    zombieSpeech: 'Sân cỏ này thuộc về Zombie! Đầu hàng đi!',
    bgClass: 'emote-btn-taunt',
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
    type: 'victory',
    label: 'Victory!',
    emoji: '🏆',
    plantSpeech: 'Chiến thắng nằm chắc trong tay ta!',
    zombieSpeech: 'Tiệc mừng chiến thắng đang chờ đón!',
    bgClass: 'emote-btn-victory',
  },
]

// Round 12 full 8 authentic PvZ Heroes comic emotes
export const EMOTE_DEFINITIONS: EmoteDefinition[] = [
  {
    id: 'wellplayed',
    type: 'wellplayed',
    label: 'Well Played!',
    emoji: '👏',
    plantSpeech: 'Chơi hay lắm!',
    zombieSpeech: 'Graaagh! Khá lắm!',
    bgClass: 'emote-btn-wellplayed',
  },
  {
    id: 'oops',
    type: 'oops',
    label: 'Oops!',
    emoji: '😱',
    plantSpeech: 'Ối chao! Lỗi rồi...',
    zombieSpeech: 'Ối! Rơi mất một cánh tay rồi!',
    bgClass: 'emote-btn-oops',
  },
  {
    id: 'brains',
    type: 'brains',
    label: 'Brains...',
    emoji: '🧠',
    plantSpeech: 'Thèm chất diệp lục à?',
    zombieSpeech: 'Braaaains...',
    bgClass: 'emote-btn-brains',
  },
  {
    id: 'gargantuar',
    type: 'gargantuar',
    label: 'Gargantuar Roar!',
    emoji: '🧟‍♂️',
    plantSpeech: 'To xác nhưng vô dụng thôi!',
    zombieSpeech: 'ROOOAAAR!',
    bgClass: 'emote-btn-gargantuar',
  },
  {
    id: 'thinking',
    type: 'thinking',
    label: 'Thinking...',
    emoji: '🤔',
    plantSpeech: 'Đang tính toán nước cờ...',
    zombieSpeech: 'Đang suy nghĩ (bằng nửa bộ não)...',
    bgClass: 'emote-btn-thinking',
  },
  {
    id: 'hello',
    type: 'hello',
    label: 'Hello!',
    emoji: '👋',
    plantSpeech: 'Chào đối thủ! Cây cỏ đã sẵn sàng!',
    zombieSpeech: 'Graaaagh! Chào đĩa não ngon lành!',
    bgClass: 'emote-btn-hello',
  },
  {
    id: 'goodgame',
    type: 'goodgame',
    label: 'Good Game!',
    emoji: '🏆',
    plantSpeech: 'Trận đấu tuyệt vời!',
    zombieSpeech: 'Trận đấu hay đấy!',
    bgClass: 'emote-btn-goodgame',
  },
  {
    id: 'noway',
    type: 'noway',
    label: 'No Way!',
    emoji: '💥',
    plantSpeech: 'Không thể nào!',
    zombieSpeech: 'Không thể tin được!',
    bgClass: 'emote-btn-noway',
  },
]

export interface HeroEmotesBarProps {
  heroSide?: Side
  onTriggerEmote?: (type: EmoteType, speech: string, emoji: string) => void
  onSelectEmote?: (emote: EmoteDefinition | HeroEmoteOption) => void
  disabled?: boolean
  isOpen?: boolean
  onToggleOpen?: () => void
}

export const HeroEmotesBar: React.FC<HeroEmotesBarProps> = ({
  heroSide = 'plants',
  onTriggerEmote,
  onSelectEmote,
  disabled = false,
  isOpen: controlledIsOpen,
  onToggleOpen: controlledToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isPaletteOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const handleSelectEmote = (opt: EmoteDefinition) => {
    if (disabled) return
    const speech = heroSide === 'plants' ? opt.plantSpeech : opt.zombieSpeech
    try {
      soundManager.playEmote(opt.type)
    } catch {
      // Sound fallback
    }
    if (onSelectEmote) {
      onSelectEmote(opt)
    }
    if (onTriggerEmote) {
      onTriggerEmote(opt.type, speech, opt.emoji)
    }
    if (controlledToggleOpen) {
      controlledToggleOpen()
    } else {
      setInternalIsOpen(false)
    }
  }

  const handleToggleOpen = () => {
    if (disabled) return
    try {
      soundManager.playClick()
    } catch {
      // Sound fallback
    }
    if (controlledToggleOpen) {
      controlledToggleOpen()
    } else {
      setInternalIsOpen((prev) => !prev)
    }
  }

  return (
    <div className={`hero-emotes-bar-container ${isPaletteOpen ? 'is-open' : 'is-collapsed'}`}>
      {/* Floating Toggle Pill */}
      <button
        type="button"
        className={`hero-emotes-toggle-pill ${isPaletteOpen ? 'active-toggle' : ''}`}
        onClick={handleToggleOpen}
        disabled={disabled}
        title="Biểu cảm Hero (Emotes & Taunts)"
      >
        <span className="emotes-toggle-icon">💬</span>
        <span className="emotes-toggle-text">Biểu cảm</span>
        <span className="emotes-arrow-indicator">{isPaletteOpen ? '▼' : '▲'}</span>
      </button>

      {/* 8 Comic Emote Choices Popover Strip */}
      {isPaletteOpen && (
        <div className="hero-emotes-palette">
          {EMOTE_DEFINITIONS.map((opt) => (
            <button
              key={opt.id}
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
