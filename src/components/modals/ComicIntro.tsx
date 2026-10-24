import React, { useEffect } from 'react'
import { soundManager } from '../../audio/SoundManager'

export interface ComicIntroProps {
  plantHeroName?: string
  zombieHeroName?: string
  plantHeroAvatar?: string
  zombieHeroAvatar?: string
  onStartBattle: () => void
  onSkip?: () => void
}

/**
 * ComicIntro (Màn hình Cốt truyện Comic Đối đầu trước trận)
 * - Khung tranh comic góc cạnh phong cách PvZ Heroes
 * - Bong bóng lời thoại (speech bubbles) đối đầu giữa Plant Hero và Zombie Hero
 * - Phù hiệu VS sấm sét 3D ở trung tâm
 * - Nút "BẮT ĐẦU CHIẾN ĐẤU! (FIGHT!)" và "BỎ QUA (SKIP)"
 * - Âm thanh Web Audio API soundManager
 */
export const ComicIntro: React.FC<ComicIntroProps> = ({
  plantHeroName = 'Green Shadow',
  zombieHeroName = 'Super Brainz',
  plantHeroAvatar = '/assets/heroes/plants/Green Shadow.png',
  zombieHeroAvatar = '/assets/heroes/zombies/Super Brainz.png',
  onStartBattle,
  onSkip,
}) => {
  useEffect(() => {
    soundManager.playFightHorn()
  }, [])

  const handleStart = () => {
    soundManager.playCardPickup()
    onStartBattle()
  }

  const handleSkip = () => {
    soundManager.playClick()
    if (onSkip) onSkip()
    else onStartBattle()
  }

  return (
    <div className="pvz-modal-backdrop comic-intro-backdrop" role="dialog" aria-modal="true">
      {/* Comic Halftone & Sunburst Texture */}
      <div className="comic-halftone-bg" aria-hidden="true" />
      <div className="comic-speed-burst" aria-hidden="true" />

      <div className="comic-intro-container">
        {/* Top Comic Header Banner */}
        <div className="comic-issue-header">
          <div className="comic-issue-badge">
            <span className="issue-label">PVZ HEROES ISSUE #1</span>
          </div>
          <h1 className="comic-clash-title">ĐẠI CHIẾN KHỞI TRANH!</h1>
          <p className="comic-issue-tagline">Cuộc chạm trán nảy lửa định đoạt số phận Khu Vườn</p>
        </div>

        {/* Comic Split Panels Arena */}
        <div className="comic-duel-stage">
          {/* Panel 1: Zombie Hero (Super Brainz) */}
          <div className="comic-panel zombie-comic-panel">
            <div className="panel-edge-sheen" />
            <div className="panel-character-wrap">
              <img
                src={zombieHeroAvatar}
                alt={zombieHeroName}
                className="panel-avatar zombie-avatar"
                onError={(e) => {
                  e.currentTarget.src = '/assets/heroes/zombies/Super Brainz.png'
                }}
              />
              <div className="panel-name-plate zombie-plate">
                <span className="plate-faction">🧟 ZOMBIE HERO</span>
                <span className="plate-name">{zombieHeroName}</span>
              </div>
            </div>

            {/* Zombie Comic Speech Bubble */}
            <div className="comic-speech-bubble zombie-speech-bubble">
              <div className="bubble-tail zombie-tail" />
              <p className="bubble-quote">
                "Ngươi nghĩ mấy nhánh cây xanh đó cản được ta sao? Não tươi thơm ngon đang vẫy gọi ta rồi, hahaha!"
              </p>
            </div>
          </div>

          {/* Central 3D VS Clash Emblem */}
          <div className="comic-vs-emblem-cluster" aria-hidden="true">
            <div className="vs-starburst" />
            <div className="vs-lightning-bolt bolt-left">⚡</div>
            <div className="vs-badge-3d">
              <span className="vs-text">VS</span>
            </div>
            <div className="vs-lightning-bolt bolt-right">⚡</div>
          </div>

          {/* Panel 2: Plant Hero (Green Shadow) */}
          <div className="comic-panel plant-comic-panel">
            <div className="panel-edge-sheen" />

            {/* Plant Comic Speech Bubble */}
            <div className="comic-speech-bubble plant-speech-bubble">
              <div className="bubble-tail plant-tail" />
              <p className="bubble-quote">
                "Không phải hôm nay đâu, Brainz! Chuẩn bị nếm mùi mưa đậu thần công lý của ta đi!"
              </p>
            </div>

            <div className="panel-character-wrap">
              <img
                src={plantHeroAvatar}
                alt={plantHeroName}
                className="panel-avatar plant-avatar"
                onError={(e) => {
                  e.currentTarget.src = '/assets/heroes/plants/Green Shadow.png'
                }}
              />
              <div className="panel-name-plate plant-plate">
                <span className="plate-faction">🌱 PLANT HERO</span>
                <span className="plate-name">{plantHeroName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="comic-intro-actions">
          <button
            className="pvz-btn comic-start-btn"
            onClick={handleStart}
            autoFocus
          >
            <span className="btn-shine-sweep" />
            <span className="btn-icon">⚔️</span>
            <span className="btn-text">BẮT ĐẦU CHIẾN ĐẤU! (FIGHT!)</span>
          </button>

          <button
            className="pvz-btn comic-skip-btn"
            onClick={handleSkip}
          >
            <span>BỎ QUA (SKIP) ⏩</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComicIntro
