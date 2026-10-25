// Comprehensive Synthesized Web Audio Manager for PvZ Heroes sound effects
// Generates authentic arcade/tactical game SFX & dynamic ambient BGM using Web Audio API
export interface SoundSettings {
  masterVolume: number // 0 to 100
  bgmVolume: number // 0 to 100
  sfxVolume: number // 0 to 100
  isMuted: boolean
}

const STORAGE_KEY = 'pvz_sound_settings'

export const DEFAULT_SETTINGS: SoundSettings = {
  masterVolume: 80,
  bgmVolume: 60,
  sfxVolume: 85,
  isMuted: false,
}

class SoundManager {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private bgmGain: GainNode | null = null

  private masterVolume: number = 0.8
  private bgmVolume: number = 0.6
  private sfxVolume: number = 0.85
  private isMuted: boolean = false

  // Background Music loop state
  private isBgmActive: boolean = false
  private bgmTimer: any = null
  private bgmStep: number = 0

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<SoundSettings>
        if (typeof parsed.masterVolume === 'number') {
          this.masterVolume = Math.max(0, Math.min(100, parsed.masterVolume)) / 100
        }
        if (typeof parsed.bgmVolume === 'number') {
          this.bgmVolume = Math.max(0, Math.min(100, parsed.bgmVolume)) / 100
        }
        if (typeof parsed.sfxVolume === 'number') {
          this.sfxVolume = Math.max(0, Math.min(100, parsed.sfxVolume)) / 100
        }
        if (typeof parsed.isMuted === 'boolean') {
          this.isMuted = parsed.isMuted
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }

  public saveToStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      const settings: SoundSettings = {
        masterVolume: Math.round(this.masterVolume * 100),
        bgmVolume: Math.round(this.bgmVolume * 100),
        sfxVolume: Math.round(this.sfxVolume * 100),
        isMuted: this.isMuted,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Ignore localStorage write errors
    }
  }

  private initContext() {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && !this.masterGain) {
      // Master Gain -> Destination
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      )
      this.masterGain.connect(this.ctx.destination)

      // SFX Gain -> Master Gain
      this.sfxGain = this.ctx.createGain()
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime)
      this.sfxGain.connect(this.masterGain)

      // BGM Gain -> Master Gain
      this.bgmGain = this.ctx.createGain()
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime)
      this.bgmGain.connect(this.masterGain)
    }

    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {})
    }
  }

  private getSFXDestination(): AudioNode | null {
    if (this.isMuted) return null
    this.initContext()
    if (!this.ctx) return null
    return this.sfxGain || this.ctx.destination
  }

  private getBGMDestination(): AudioNode | null {
    if (this.isMuted) return null
    this.initContext()
    if (!this.ctx) return null
    return this.bgmGain || this.ctx.destination
  }

  // --- Volume & Settings Controls ---
  getSettings(): SoundSettings {
    return {
      masterVolume: Math.round(this.masterVolume * 100),
      bgmVolume: Math.round(this.bgmVolume * 100),
      sfxVolume: Math.round(this.sfxVolume * 100),
      isMuted: this.isMuted,
    }
  }

  setSettings(settings: Partial<SoundSettings>) {
    if (typeof settings.masterVolume === 'number') {
      this.setMasterVolume(settings.masterVolume)
    }
    if (typeof settings.bgmVolume === 'number') {
      this.setBgmVolume(settings.bgmVolume)
    }
    if (typeof settings.sfxVolume === 'number') {
      this.setSfxVolume(settings.sfxVolume)
    }
    if (typeof settings.isMuted === 'boolean') {
      this.setMuted(settings.isMuted)
    }
    this.saveToStorage()
  }

  setMasterVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent)) / 100
    this.masterVolume = clamped
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      )
    }
    this.saveToStorage()
  }

  getMasterVolume(): number {
    return Math.round(this.masterVolume * 100)
  }

  setBgmVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent)) / 100
    this.bgmVolume = clamped
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime)
    }
    this.saveToStorage()
  }

  getBgmVolume(): number {
    return Math.round(this.bgmVolume * 100)
  }

  setSfxVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent)) / 100
    this.sfxVolume = clamped
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime)
    }
    this.saveToStorage()
  }

  getSfxVolume(): number {
    return Math.round(this.sfxVolume * 100)
  }

  setMuted(muted: boolean) {
    this.isMuted = muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        muted ? 0 : this.masterVolume,
        this.ctx.currentTime
      )
    }
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {})
    } else if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    this.saveToStorage()
  }

  getMuted(): boolean {
    return this.isMuted
  }

  // --- Dynamic Procedural BGM (Tactical PvZ Heroes Arena Loop) ---
  startBgm() {
    if (this.isBgmActive) return
    this.isBgmActive = true
    this.scheduleBgmNote()
  }

  stopBgm() {
    this.isBgmActive = false
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer)
      this.bgmTimer = null
    }
  }

  private scheduleBgmNote() {
    if (!this.isBgmActive) return
    const dest = this.getBGMDestination()
    if (dest && this.ctx && !this.isMuted && this.bgmVolume > 0.02) {
      const now = this.ctx.currentTime
      // PvZ Heroes signature whimsical tactical bassline (D minor funky groove)
      // D2 (73.4), F2 (87.3), G2 (98.0), A2 (110.0), C3 (130.8)
      const bassNotes = [73.42, 73.42, 87.31, 98.0, 73.42, 110.0, 98.0, 87.31]
      const noteFreq = bassNotes[this.bgmStep % bassNotes.length]

      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(noteFreq, now)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28)

      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.3)

      // Light percussion shaker tick on odd beats
      if (this.bgmStep % 2 === 1) {
        const tickOsc = this.ctx.createOscillator()
        const tickGain = this.ctx.createGain()
        tickOsc.type = 'sawtooth'
        tickOsc.frequency.setValueAtTime(1400, now)
        tickGain.gain.setValueAtTime(0.015, now)
        tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
        tickOsc.connect(tickGain)
        tickGain.connect(dest)
        tickOsc.start(now)
        tickOsc.stop(now + 0.05)
      }
    }

    this.bgmStep++
    // 130 BPM -> ~230ms per 8th note
    this.bgmTimer = setTimeout(() => this.scheduleBgmNote(), 230)
  }

  // --- Hero Emotes SFX ---
  playEmote(type: 'hello' | 'taunt' | 'oops' | 'victory') {
    switch (type) {
      case 'hello':
        this.playEmoteHello()
        break
      case 'taunt':
        this.playEmoteTaunt()
        break
      case 'oops':
        this.playEmoteOops()
        break
      case 'victory':
        this.playEmoteVictory()
        break
    }
  }

  // Emote 1: Friendly cheerful rising two-tone chime ("Hello!")
  playEmoteHello() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const notes = [
      { freq: 523.25, start: 0, dur: 0.12 }, // C5
      { freq: 659.25, start: 0.1, dur: 0.14 }, // E5
      { freq: 783.99, start: 0.22, dur: 0.28 }, // G5
    ]
    notes.forEach((n) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(n.freq, now + n.start)
      gain.gain.setValueAtTime(0.24, now + n.start)
      gain.gain.exponentialRampToValueAtTime(0.01, now + n.start + n.dur)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + n.start)
      osc.stop(now + n.start + n.dur)
    })
  }

  // Emote 2: Cheeky slide trombone/mocking bounce ("Taunt!")
  playEmoteTaunt() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    // Whimsical cheeky wa-wa slide: G4 -> F#4 -> G4 -> Bb4
    const chords = [
      { freq: 392.0, start: 0, dur: 0.1 },
      { freq: 369.99, start: 0.08, dur: 0.1 },
      { freq: 392.0, start: 0.16, dur: 0.12 },
      { freq: 466.16, start: 0.26, dur: 0.35 },
    ]
    chords.forEach((c) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(c.freq, now + c.start)
      gain.gain.setValueAtTime(0.22, now + c.start)
      gain.gain.linearRampToValueAtTime(0.01, now + c.start + c.dur)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + c.start)
      osc.stop(now + c.start + c.dur)
    })
  }

  // Emote 3: Comical cartoon slip / double drop ("Oops!")
  playEmoteOops() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    // Sliding whistle dropping in pitch
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.35)
    gain.gain.setValueAtTime(0.28, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.38)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.38)

    // Secondary comedic "pop" at end
    const popOsc = this.ctx.createOscillator()
    const popGain = this.ctx.createGain()
    popOsc.type = 'sine'
    popOsc.frequency.setValueAtTime(200, now + 0.32)
    popOsc.frequency.exponentialRampToValueAtTime(70, now + 0.42)
    popGain.gain.setValueAtTime(0.25, now + 0.32)
    popGain.gain.linearRampToValueAtTime(0.01, now + 0.44)
    popOsc.connect(popGain)
    popGain.connect(dest)
    popOsc.start(now + 0.32)
    popOsc.stop(now + 0.44)
  }

  // Emote 4: Triumphant mini-trumpet fanfare ("Victory!")
  playEmoteVictory() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    // Rapid triumphant bugle arpeggio: C4, G4, C5, E5, G5
    const fanfare = [
      { freq: 261.63, start: 0, dur: 0.08 },
      { freq: 392.0, start: 0.07, dur: 0.08 },
      { freq: 523.25, start: 0.14, dur: 0.09 },
      { freq: 659.25, start: 0.22, dur: 0.1 },
      { freq: 783.99, start: 0.31, dur: 0.38 },
    ]
    fanfare.forEach((f) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f.freq, now + f.start)
      gain.gain.setValueAtTime(0.28, now + f.start)
      gain.gain.exponentialRampToValueAtTime(0.01, now + f.start + f.dur)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + f.start)
      osc.stop(now + f.start + f.dur)
    })
  }

  // --- Gameplay SFX ---

  // 1. Card Click & Drop (light thud)
  playCardDrop() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.1)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  // 2. Card Hover / Select (pleasant light tick)
  playCardSelect() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.05)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.05)
  }

  // 2b. Generic UI Button Click
  playClick() {
    this.playCardSelect()
  }

  // 3. Plant Pea Shoot (iconic snappy pop)
  playPeaShoot() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09)
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.09)
  }

  // 4. Attack Impact Hit (punchy crunch)
  playAttackHit() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.15)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // 5. Heavy Direct Damage on Hero (deep visceral rumble)
  playHeroDamage() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25)
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.25)
  }

  // 6. Shield Deflection / Block Meter Charge (metallic ping)
  playShieldBlock() {
    this.playShieldClang()
  }

  // 6a. Heavy metallic Super-Block shield shatter / clang with glass splinter harmonics
  playShieldClang() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Heavy metallic clang frequencies (inharmonic metal resonator)
    const metalFreqs = [520, 840, 1420, 2600]
    metalFreqs.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = idx % 2 === 0 ? 'triangle' : 'square'
      osc.frequency.setValueAtTime(freq, now)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + 0.32)

      const volume = idx === 0 ? 0.35 : 0.18
      gain.gain.setValueAtTime(volume, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.35)
    })

    // Glass shatter sparkle burst (high white noise burst)
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.2)
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
      const noise = this.ctx.createBufferSource()
      noise.buffer = noiseBuffer

      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(3200, now)
      filter.Q.setValueAtTime(4.0, now)

      const noiseGain = this.ctx.createGain()
      noiseGain.gain.setValueAtTime(0.22, now)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)

      noise.connect(filter)
      filter.connect(noiseGain)
      noiseGain.connect(dest)
      noise.start(now)
      noise.stop(now + 0.22)
    } catch {
      // AudioBuffer fallback ignored in mock tests
    }
  }

  // 6b. Super-Block Meter Charge (1-3 rising ding chimes)
  playBlockCharge(amount: number = 1) {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const count = Math.min(3, Math.max(1, amount))
    const now = this.ctx.currentTime
    const baseFreqs = [880, 1174.66, 1479.98] // A5, D6, F#6 bright sparkling rising chord
    for (let i = 0; i < count; i++) {
      const noteTime = now + i * 0.07
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseFreqs[i], noteTime)
      osc.frequency.exponentialRampToValueAtTime(baseFreqs[i] * 1.05, noteTime + 0.08)
      gain.gain.setValueAtTime(0.28, noteTime)
      gain.gain.linearRampToValueAtTime(0.01, noteTime + 0.12)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(noteTime)
      osc.stop(noteTime + 0.12)
    }
  }

  // 6c. Kinetic Shockwave Air-Blast (deep visceral sub-thump + sonic whoosh)
  playShockwaveImpact() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Sub-bass thud
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(95, now)
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.22)
    gain.gain.setValueAtTime(0.45, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.25)

    // Sonic dispersal transient
    const highOsc = this.ctx.createOscillator()
    const highGain = this.ctx.createGain()
    highOsc.type = 'sine'
    highOsc.frequency.setValueAtTime(320, now)
    highOsc.frequency.exponentialRampToValueAtTime(60, now + 0.14)
    highGain.gain.setValueAtTime(0.25, now)
    highGain.gain.linearRampToValueAtTime(0.01, now + 0.16)
    highOsc.connect(highGain)
    highGain.connect(dest)
    highOsc.start(now)
    highOsc.stop(now + 0.16)
  }

  // 7. Super-Block Trigger Fanfare (heroic shield burst chords)
  playSuperBlock() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const chord = [440, 554.37, 659.25, 880] // A major triumphant chord
    chord.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.04)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.04 + 0.3)
      gain.gain.setValueAtTime(0.3, now + idx * 0.04)
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.4)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + idx * 0.04)
      osc.stop(now + idx * 0.04 + 0.4)
    })
  }

  // 8. Freeze Crystalline Ice Crackle
  playFreeze() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1600, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.2)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.22)
  }

  // 9. Stat Buff / Level Up Chime
  playBuff() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const notes = [440, 554.37, 659.25]
    notes.forEach((freq, i) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0.2, now + i * 0.08)
      gain.gain.linearRampToValueAtTime(0.01, now + i * 0.08 + 0.15)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.15)
    })
  }

  // 10. Phase Switch Whoosh
  playPhaseChange() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // 11. Victory Fanfare
  playVictory() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25]
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + idx * 0.14)
      gain.gain.setValueAtTime(0.3, now + idx * 0.14)
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.14 + 0.28)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + idx * 0.14)
      osc.stop(now + idx * 0.14 + 0.28)
    })
  }

  // 12. Defeat Melancholy Cadence
  playDefeat() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const notes = [392.0, 369.99, 329.63, 293.66]
    notes.forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now + idx * 0.18)
      gain.gain.setValueAtTime(0.25, now + idx * 0.18)
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.18 + 0.35)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + idx * 0.18)
      osc.stop(now + idx * 0.18 + 0.35)
    })
  }

  // 13. Card Pickup / Draw (tactile sliding whoosh with crisp tick)
  playCardPickup() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Rising friction swoosh
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(420, now)
    osc.frequency.exponentialRampToValueAtTime(820, now + 0.08)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.09)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.09)

    // Harmonic snap
    const snapOsc = this.ctx.createOscillator()
    const snapGain = this.ctx.createGain()
    snapOsc.type = 'sine'
    snapOsc.frequency.setValueAtTime(1100, now)
    snapOsc.frequency.exponentialRampToValueAtTime(1500, now + 0.04)
    snapGain.gain.setValueAtTime(0.12, now)
    snapGain.gain.linearRampToValueAtTime(0.01, now + 0.05)
    snapOsc.connect(snapGain)
    snapGain.connect(dest)
    snapOsc.start(now)
    snapOsc.stop(now + 0.05)
  }

  // 14. Card Placement / Minion Landing (resonant leafy earth thud)
  playCardPlace() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Deep grassy thud
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(260, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.14)
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + 0.15)

    // Organic landing snap
    const snapOsc = this.ctx.createOscillator()
    const snapGain = this.ctx.createGain()
    snapOsc.type = 'sawtooth'
    snapOsc.frequency.setValueAtTime(450, now)
    snapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.06)
    snapGain.gain.setValueAtTime(0.18, now)
    snapGain.gain.linearRampToValueAtTime(0.01, now + 0.07)
    snapOsc.connect(snapGain)
    snapGain.connect(dest)
    snapOsc.start(now)
    snapOsc.stop(now + 0.07)
  }

  // 15. Fight Phase Battle Horn (heroic brassy combat fanfare flourish)
  playFightHorn() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Two-tone brass flourish: A3 (220Hz) -> E4 (329.63Hz) -> A4 (440Hz)
    const tones = [
      { freq: 220, start: 0, dur: 0.12 },
      { freq: 329.63, start: 0.1, dur: 0.14 },
      { freq: 440, start: 0.22, dur: 0.35 },
    ]

    tones.forEach((tone) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(tone.freq, now + tone.start)
      gain.gain.setValueAtTime(0.28, now + tone.start)
      gain.gain.exponentialRampToValueAtTime(0.01, now + tone.start + tone.dur)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + tone.start)
      osc.stop(now + tone.start + tone.dur)

      // Harmonics support for brass warmth
      const sub = this.ctx.createOscillator()
      const subGain = this.ctx.createGain()
      sub.type = 'triangle'
      sub.frequency.setValueAtTime(tone.freq * 0.5, now + tone.start)
      subGain.gain.setValueAtTime(0.2, now + tone.start)
      subGain.gain.linearRampToValueAtTime(0.01, now + tone.start + tone.dur)
      sub.connect(subGain)
      subGain.connect(dest)
      sub.start(now + tone.start)
      sub.stop(now + tone.start + tone.dur)
    })
  }

  // 16. Gravestone Reveal (heavy stone crack & shatter with mysterious zombie guttural awakening groan)
  playGravestoneReveal() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Layer A: Deep Subterranean Stone Crack & Crumble Impact (sawtooth drop)
    const stoneOsc = this.ctx.createOscillator()
    const stoneGain = this.ctx.createGain()
    stoneOsc.type = 'sawtooth'
    stoneOsc.frequency.setValueAtTime(160, now)
    stoneOsc.frequency.exponentialRampToValueAtTime(32, now + 0.38)
    stoneGain.gain.setValueAtTime(0.42, now)
    stoneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42)
    stoneOsc.connect(stoneGain)
    stoneGain.connect(dest)
    stoneOsc.start(now)
    stoneOsc.stop(now + 0.42)

    // Layer B: Granite Cracking Snaps (sharp rock fracture bursts)
    const crackTimes = [0.03, 0.11, 0.19, 0.28]
    crackTimes.forEach((delay, idx) => {
      if (!this.ctx) return
      const crackOsc = this.ctx.createOscillator()
      const crackGain = this.ctx.createGain()
      crackOsc.type = 'triangle'
      crackOsc.frequency.setValueAtTime(480 - idx * 60, now + delay)
      crackOsc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.06)
      crackGain.gain.setValueAtTime(0.3, now + delay)
      crackGain.gain.linearRampToValueAtTime(0.01, now + delay + 0.07)
      crackOsc.connect(crackGain)
      crackGain.connect(dest)
      crackOsc.start(now + delay)
      crackOsc.stop(now + delay + 0.07)
    })

    // Layer C: Mysterious Guttural Undead Awakening Groan (resonant FM groan)
    const groanOsc = this.ctx.createOscillator()
    const groanGain = this.ctx.createGain()
    groanOsc.type = 'sawtooth'
    groanOsc.frequency.setValueAtTime(85, now + 0.12)
    groanOsc.frequency.linearRampToValueAtTime(130, now + 0.35)
    groanOsc.frequency.exponentialRampToValueAtTime(62, now + 0.72)

    groanGain.gain.setValueAtTime(0.01, now + 0.12)
    groanGain.gain.linearRampToValueAtTime(0.24, now + 0.28)
    groanGain.gain.exponentialRampToValueAtTime(0.01, now + 0.75)
    groanOsc.connect(groanGain)
    groanGain.connect(dest)
    groanOsc.start(now + 0.12)
    groanOsc.stop(now + 0.75)

    // Layer D: Eerie Sub-Bass Resonance
    const subOsc = this.ctx.createOscillator()
    const subGain = this.ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(55, now)
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.5)
    subGain.gain.setValueAtTime(0.35, now)
    subGain.gain.linearRampToValueAtTime(0.01, now + 0.55)
    subOsc.connect(subGain)
    subGain.connect(dest)
    subOsc.start(now)
    subOsc.stop(now + 0.55)
  }

  // 18. Turn Rope / Fuse Timer Ticking (tactile clock tick with urgency pitch boost)
  playTimerTick(isUrgent: boolean = false) {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    const baseFreq = isUrgent ? 1600 : 920
    const endFreq = isUrgent ? 700 : 380
    const duration = isUrgent ? 0.04 : 0.035
    const volume = isUrgent ? 0.32 : 0.18

    // Primary wooden tick osc
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = isUrgent ? 'sawtooth' : 'triangle'
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    osc.connect(gain)
    gain.connect(dest)
    osc.start(now)
    osc.stop(now + duration)

    if (isUrgent) {
      // High harmonic stress beep accent
      const accent = this.ctx.createOscillator()
      const accentGain = this.ctx.createGain()
      accent.type = 'sine'
      accent.frequency.setValueAtTime(2400, now)
      accentGain.gain.setValueAtTime(0.12, now)
      accentGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)
      accent.connect(accentGain)
      accentGain.connect(dest)
      accent.start(now)
      accent.stop(now + 0.03)
    }
  }

  // 19. Turn Rope Fuse Sizzle (crackling burning gunpowder fuse)
  playFuseSizzle() {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime

    // Sizzling burst
    const sizzleCount = 4
    for (let i = 0; i < sizzleCount; i++) {
      const delay = i * 0.025
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(3200 + Math.random() * 1600, now + delay)
      osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 800, now + delay + 0.02)
      gain.gain.setValueAtTime(0.08, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.025)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now + delay)
      osc.stop(now + delay + 0.025)
    }
  }

  // 20. Comic Impact Action SFX (POW, BAM, CRUNCH, ZAP, BLOCKED, DEADLY, STRIKE)
  playComicImpact(actionWord: string = 'POW') {
    const dest = this.getSFXDestination()
    if (!dest || !this.ctx) return
    const now = this.ctx.currentTime
    const word = actionWord.toUpperCase()

    if (word.includes('ZAP')) {
      // Electric laser frequency descent
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(1800, now)
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.18)
      gain.gain.setValueAtTime(0.35, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.2)
    } else if (word.includes('CRUNCH')) {
      // Heavy crunchy stone fracture
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(340, now)
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.16)
      gain.gain.setValueAtTime(0.42, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.18)
    } else if (word.includes('BLOCK')) {
      // Metallic shield clang
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(980, now)
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.22)
      gain.gain.setValueAtTime(0.4, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.25)
    } else if (word.includes('DEADLY')) {
      // Venomous low drone plunge
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.3)
      gain.gain.setValueAtTime(0.38, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.32)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.32)
    } else {
      // Classic punchy POW / BAM / STRIKE
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(460, now)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.14)
      gain.gain.setValueAtTime(0.45, now)
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
      osc.connect(gain)
      gain.connect(dest)
      osc.start(now)
      osc.stop(now + 0.15)

      // Slap noise
      const slapOsc = this.ctx.createOscillator()
      const slapGain = this.ctx.createGain()
      slapOsc.type = 'sawtooth'
      slapOsc.frequency.setValueAtTime(1100, now)
      slapOsc.frequency.exponentialRampToValueAtTime(250, now + 0.06)
      slapGain.gain.setValueAtTime(0.25, now)
      slapGain.gain.linearRampToValueAtTime(0.01, now + 0.07)
      slapOsc.connect(slapGain)
      slapGain.connect(dest)
      slapOsc.start(now)
      slapOsc.stop(now + 0.07)
    }
  }
}

export const soundManager = new SoundManager()
