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

  // 6b. Super-Block Meter Charge (1-3 rising ding chimes)
  playBlockCharge(amount: number = 1) {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
      gain.connect(this.ctx.destination)
      osc.start(noteTime)
      osc.stop(noteTime + 0.12)
    }
  }

  // 6c. Kinetic Shockwave Air-Blast (deep visceral sub-thump + sonic whoosh)
  playShockwaveImpact() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
    gain.connect(this.ctx.destination)
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
    highGain.connect(this.ctx.destination)
    highOsc.start(now)
    highOsc.stop(now + 0.16)
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

  // 13. Card Pickup / Draw (tactile sliding whoosh with crisp tick)
  playCardPickup() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
    gain.connect(this.ctx.destination)
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
    snapGain.connect(this.ctx.destination)
    snapOsc.start(now)
    snapOsc.stop(now + 0.05)
  }

  // 14. Card Placement / Minion Landing (resonant leafy earth thud)
  playCardPlace() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
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
    gain.connect(this.ctx.destination)
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
    snapGain.connect(this.ctx.destination)
    snapOsc.start(now)
    snapOsc.stop(now + 0.07)
  }

  // 15. Fight Phase Battle Horn (heroic brassy combat fanfare flourish)
  playFightHorn() {
    this.initContext()
    if (!this.ctx || this.isMuted) return
    const now = this.ctx.currentTime

    // Two-tone brass flourish: A3 (220Hz) -> E4 (329.63Hz) -> A4 (440Hz)
    const tones = [
      { freq: 220, start: 0, dur: 0.12 },
      { freq: 329.63, start: 0.10, dur: 0.14 },
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
      gain.connect(this.ctx.destination)
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
      subGain.connect(this.ctx.destination)
      sub.start(now + tone.start)
      sub.stop(now + tone.start + tone.dur)
    })
  }
}

export const soundManager = new SoundManager()
