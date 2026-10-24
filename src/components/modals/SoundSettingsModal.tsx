import React, { useState, useEffect } from 'react'
import { soundManager, type SoundSettings } from '../../audio/SoundManager'

export interface SoundSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SoundSettingsModal: React.FC<SoundSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<SoundSettings>(() =>
    soundManager.getSettings()
  )

  useEffect(() => {
    if (isOpen) {
      setSettings(soundManager.getSettings())
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    soundManager.setMasterVolume(val)
    setSettings((prev) => ({ ...prev, masterVolume: val }))
  }

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    soundManager.setBgmVolume(val)
    setSettings((prev) => ({ ...prev, bgmVolume: val }))
  }

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    soundManager.setSfxVolume(val)
    setSettings((prev) => ({ ...prev, sfxVolume: val }))
  }

  const handleSfxRelease = () => {
    soundManager.playClick()
  }

  const handleToggleMute = () => {
    const nextMuted = !settings.isMuted
    soundManager.setMuted(nextMuted)
    setSettings((prev) => ({ ...prev, isMuted: nextMuted }))
    if (!nextMuted) {
      soundManager.playCardDrop()
    }
  }

  const handleTestSfx = () => {
    soundManager.playPeaShoot()
  }

  const handleTestChime = () => {
    soundManager.playSuperBlock()
  }

  const handleResetDefaults = () => {
    soundManager.setSettings({
      masterVolume: 80,
      bgmVolume: 60,
      sfxVolume: 85,
      isMuted: false,
    })
    setSettings(soundManager.getSettings())
    soundManager.playBuff()
  }

  return (
    <div className="sound-settings-modal-backdrop" onClick={onClose}>
      <div
        className="sound-settings-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Comic Gold/Green Header Strip */}
        <div className="sound-settings-header">
          <div className="sound-settings-title-group">
            <span className="sound-settings-title-icon">⚙️</span>
            <h2 className="sound-settings-title-text">CÀI ĐẶT ÂM THANH</h2>
          </div>
          <button
            className="sound-settings-close-btn"
            onClick={onClose}
            title="Đóng cài đặt"
          >
            ✕
          </button>
        </div>

        {/* Master Mute Toggle Strip */}
        <div className="sound-settings-mute-strip">
          <div className="mute-strip-info">
            <span className="mute-strip-icon">
              {settings.isMuted ? '🔇' : '🔊'}
            </span>
            <div className="mute-strip-text">
              <span className="mute-label">Trạng thái âm thanh</span>
              <span className="mute-status">
                {settings.isMuted
                  ? 'Đang TẮT toàn bộ âm thanh'
                  : 'Đang BẬT âm thanh'}
              </span>
            </div>
          </div>
          <button
            className={`sound-mute-toggle-btn ${
              settings.isMuted ? 'is-muted-active' : 'is-sound-active'
            }`}
            onClick={handleToggleMute}
          >
            {settings.isMuted ? 'BẬT ÂM' : 'TẮT ÂM'}
          </button>
        </div>

        {/* Sliders Container */}
        <div className="sound-sliders-list">
          {/* 1. Master Volume */}
          <div className="sound-slider-row">
            <div className="sound-slider-meta">
              <div className="slider-label-group">
                <span className="slider-icon">🎚️</span>
                <span className="slider-name">Âm Lượng Tổng (Master)</span>
              </div>
              <span className="slider-percent-badge">
                {settings.masterVolume}%
              </span>
            </div>
            <div className="sound-slider-track-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.masterVolume}
                onChange={handleMasterChange}
                onMouseUp={handleSfxRelease}
                onTouchEnd={handleSfxRelease}
                className="sound-range-input master-range"
                disabled={settings.isMuted}
              />
              <div
                className="sound-range-fill master-fill"
                style={{ width: `${settings.masterVolume}%` }}
              />
            </div>
          </div>

          {/* 2. BGM Volume */}
          <div className="sound-slider-row">
            <div className="sound-slider-meta">
              <div className="slider-label-group">
                <span className="slider-icon">🎵</span>
                <span className="slider-name">Nhạc Nền (BGM)</span>
              </div>
              <span className="slider-percent-badge">{settings.bgmVolume}%</span>
            </div>
            <div className="sound-slider-track-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.bgmVolume}
                onChange={handleBgmChange}
                className="sound-range-input bgm-range"
                disabled={settings.isMuted}
              />
              <div
                className="sound-range-fill bgm-fill"
                style={{ width: `${settings.bgmVolume}%` }}
              />
            </div>
          </div>

          {/* 3. SFX Volume */}
          <div className="sound-slider-row">
            <div className="sound-slider-meta">
              <div className="slider-label-group">
                <span className="slider-icon">💥</span>
                <span className="slider-name">Hiệu Ứng Chiêu Thức (SFX)</span>
              </div>
              <span className="slider-percent-badge">{settings.sfxVolume}%</span>
            </div>
            <div className="sound-slider-track-wrap">
              <input
                type="range"
                min="0"
                max="100"
                value={settings.sfxVolume}
                onChange={handleSfxChange}
                onMouseUp={handleSfxRelease}
                onTouchEnd={handleSfxRelease}
                className="sound-range-input sfx-range"
                disabled={settings.isMuted}
              />
              <div
                className="sound-range-fill sfx-fill"
                style={{ width: `${settings.sfxVolume}%` }}
              />
            </div>
          </div>
        </div>

        {/* Test Sound Quick Buttons */}
        <div className="sound-test-bar">
          <span className="test-bar-caption">Thử âm thanh:</span>
          <div className="test-bar-actions">
            <button
              className="sound-test-chip"
              onClick={handleTestSfx}
              disabled={settings.isMuted}
              title="Phát tiếng Peashooter Pop"
            >
              🌱 Bắn Đậu
            </button>
            <button
              className="sound-test-chip"
              onClick={handleTestChime}
              disabled={settings.isMuted}
              title="Phát tiếng Super-Block Fanfare"
            >
              🛡️ Khiên Chắn
            </button>
            <button
              className="sound-test-chip reset-chip"
              onClick={handleResetDefaults}
              title="Đặt lại âm lượng 80% / 60% / 85%"
            >
              ↺ Mặc định
            </button>
          </div>
        </div>

        {/* Footer Finish Button */}
        <div className="sound-settings-footer">
          <button
            className="sound-settings-confirm-btn"
            onClick={onClose}
          >
            LƯU & XONG
          </button>
        </div>
      </div>
    </div>
  )
}

export default SoundSettingsModal
