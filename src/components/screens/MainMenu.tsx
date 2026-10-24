import React, { useState } from 'react'
import { soundManager } from '../../audio/SoundManager'

export interface MainMenuProps {
  onStartGame: () => void
  onOpenHeroSelect: () => void
  onOpenDeckBuilder: () => void
  onOpenCampaign?: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  onOpenHeroSelect,
  onOpenDeckBuilder,
  onOpenCampaign,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted())

  const toggleSound = () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    soundManager.setMuted(nextMute)
    if (!nextMute) {
      soundManager.playCardDrop()
    }
  }

  const handleStart = () => {
    soundManager.playCardDrop()
    onStartGame()
  }

  const handleHeroSelect = () => {
    soundManager.playCardDrop()
    onOpenHeroSelect()
  }

  const handleDeckBuilder = () => {
    soundManager.playCardDrop()
    onOpenDeckBuilder()
  }

  const handleCampaign = () => {
    soundManager.playCardDrop()
    if (onOpenCampaign) {
      onOpenCampaign()
    }
  }

  return (
    <div className="main-menu-container">
      {/* Authentic PvZ Heroes Loading Screen Art Background */}
      <div className="menu-backdrop-layer">
        <img
          src="/assets/board/Loading_Screen.png"
          alt="PvZ Heroes Background"
          className="menu-backdrop-img"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <div className="menu-backdrop-overlay" />
      </div>

      {/* Top Utility Bar */}
      <div className="menu-top-toolbar">
        <button
          className={`audio-toggle-btn ${isMuted ? 'is-muted' : 'is-sound-on'}`}
          onClick={toggleSound}
          title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {isMuted ? '🔇 Âm thanh: TẮT' : '🔊 Âm thanh: BẬT'}
        </button>
      </div>

      <div className="menu-content-card">
        <img
          src="/assets/board/Game_Logo.png"
          alt="Plants vs. Zombies Heroes"
          className="menu-game-logo"
        />

        <div className="menu-action-buttons">
          {onOpenCampaign && (
            <button className="menu-btn campaign-menu-btn" onClick={handleCampaign}>
              🗺️ CHIẾN DỊCH (CAMPAIGN MODE)
            </button>
          )}
          <button className="menu-btn primary-menu-btn" onClick={handleStart}>
            ▶️ CHƠI NGAY (QUICK MATCH)
          </button>
          <button className="menu-btn secondary-menu-btn" onClick={handleHeroSelect}>
            🦸 CHỌN ANH HÙNG (HERO SELECT)
          </button>
          <button className="menu-btn deck-builder-menu-btn" onClick={handleDeckBuilder}>
            🃏 XÂY DỰNG BỘ BÀI (DECK BUILDER)
          </button>
        </div>

        <div className="menu-meta-info">
          <span>Phiên bản Replicate Hoàn Chỉnh - 44 Lá bài & 22 Tướng</span>
          <span className="meta-subtext">React 19 • TypeScript • Pure Web Audio SFX</span>
        </div>
      </div>
    </div>
  )
}

export default MainMenu
