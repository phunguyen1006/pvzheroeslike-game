import { describe, it, expect, beforeEach, vi } from 'vitest'
import { soundManager } from '../audio/SoundManager'
import { HERO_EMOTE_OPTIONS } from '../components/hero/HeroEmotesBar'

describe('Sound Settings & Hero Emotes System', () => {
  beforeEach(() => {
    localStorage.clear()
    soundManager.setSettings({
      masterVolume: 80,
      bgmVolume: 60,
      sfxVolume: 85,
      isMuted: false,
    })
  })

  it('should initialize and report correct default sound settings', () => {
    const settings = soundManager.getSettings()
    expect(settings.masterVolume).toBe(80)
    expect(settings.bgmVolume).toBe(60)
    expect(settings.sfxVolume).toBe(85)
    expect(settings.isMuted).toBe(false)
  })

  it('should clamp volume settings between 0% and 100%', () => {
    soundManager.setMasterVolume(150)
    expect(soundManager.getMasterVolume()).toBe(100)

    soundManager.setMasterVolume(-20)
    expect(soundManager.getMasterVolume()).toBe(0)

    soundManager.setBgmVolume(45)
    expect(soundManager.getBgmVolume()).toBe(45)

    soundManager.setSfxVolume(90)
    expect(soundManager.getSfxVolume()).toBe(90)
  })

  it('should persist settings to localStorage', () => {
    soundManager.setSettings({
      masterVolume: 75,
      bgmVolume: 50,
      sfxVolume: 65,
      isMuted: true,
    })

    const raw = localStorage.getItem('pvz_sound_settings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.masterVolume).toBe(75)
    expect(parsed.bgmVolume).toBe(50)
    expect(parsed.sfxVolume).toBe(65)
    expect(parsed.isMuted).toBe(true)
  })

  it('should toggle mute state accurately', () => {
    soundManager.setMuted(true)
    expect(soundManager.getMuted()).toBe(true)

    soundManager.setMuted(false)
    expect(soundManager.getMuted()).toBe(false)
  })

  it('should define all 4 authentic PvZ Heroes emotes', () => {
    expect(HERO_EMOTE_OPTIONS).toHaveLength(4)
    const types = HERO_EMOTE_OPTIONS.map((e) => e.type)
    expect(types).toContain('hello')
    expect(types).toContain('taunt')
    expect(types).toContain('oops')
    expect(types).toContain('victory')

    HERO_EMOTE_OPTIONS.forEach((opt) => {
      expect(opt.emoji).toBeTruthy()
      expect(opt.plantSpeech).toBeTruthy()
      expect(opt.zombieSpeech).toBeTruthy()
      expect(opt.bgClass).toBeTruthy()
    })
  })
})
