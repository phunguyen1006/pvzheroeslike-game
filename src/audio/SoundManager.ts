// Comprehensive Synthesized Web Audio Manager for PvZ Heroes sound effects
// Generates authentic arcade/tactical game SFX using Web Audio API (zero external assets needed)
class SoundManager {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false

  private initContext() {
    if (this.isMuted) return
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted
    if (muted && this.ctx) {
      this.ctx.suspend().catch(() => {})
    }
  }

  getMuted(): boolean {
    return this.isMuted
  }

  // 1. Card Click & Drop (light thud)
  playCardDrop() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.1)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.1)
  }

  // 2. Card Hover / Select (pleasant light tick)
  playCardSelect() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.05)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.05)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.05)
  }

  // 2b. Generic UI Button Click
  playClick() {
    this.playCardSelect()
  }

  // 3. Plant Pea Shoot (iconic snappy pop)
  playPeaShoot() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09)
    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.09)
  }

  // 4. Attack Impact Hit (punchy crunch)
  playAttackHit() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.15)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // 5. Heavy Direct Damage on Hero (deep visceral rumble)
  playHeroDamage() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(140, now)
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25)
    gain.gain.setValueAtTime(0.5, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.25)
  }

  // 6. Shield Deflection / Block Meter Charge (metallic ping)
  playShieldBlock() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.18)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.18)
  }

  // 7. Super-Block Trigger Fanfare (heroic shield burst chords)
  playSuperBlock() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
      gain.connect(this.ctx.destination)
      osc.start(now + idx * 0.04)
      osc.stop(now + idx * 0.04 + 0.4)
    })
  }

  // 8. Freeze Crystalline Ice Crackle
  playFreeze() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1600, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.2)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.22)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.22)
  }

  // 9. Stat Buff / Level Up Chime
  playBuff() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
      gain.connect(this.ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.15)
    })
  }

  // 10. Phase Switch Whoosh
  playPhaseChange() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  }

  // 11. Victory Fanfare
  playVictory() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
      gain.connect(this.ctx.destination)
      osc.start(now + idx * 0.14)
      osc.stop(now + idx * 0.14 + 0.28)
    })
  }

  // 12. Defeat Melancholy Cadence
  playDefeat() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
      gain.connect(this.ctx.destination)
      osc.start(now + idx * 0.18)
      osc.stop(now + idx * 0.18 + 0.35)
    })
  }
}

export const soundManager = new SoundManager()
