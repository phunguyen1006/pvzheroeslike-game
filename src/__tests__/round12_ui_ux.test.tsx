import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HeroBottomArena } from '../components/board/HeroBottomArena'
import { HeroTopArena } from '../components/board/HeroTopArena'
import { HeroEmotesBar, EMOTE_DEFINITIONS } from '../components/hero/HeroEmotesBar'
import { ComicSpeechBubble } from '../components/hero/ComicSpeechBubble'
import { PhaseBanner } from '../components/ui/PhaseBanner'
import { LaneEnvironmentFX } from '../components/board/LaneEnvironmentFX'
import { Lane } from '../components/board/Lane'
import { soundManager } from '../audio/SoundManager'
import { SoundSettingsModal } from '../components/modals/SoundSettingsModal'
import { DeckBuilder } from '../components/deck/DeckBuilder'
import type { Hero, LaneState } from '../engine/types'

describe('Round 12 UI & UX Engineering Missions Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Hero Hurt & Victory/Defeat Reaction FX (HeroTopArena & HeroBottomArena)', () => {
    const mockPlantHero: Hero = {
      id: 'green_shadow',
      name: 'Green Shadow',
      side: 'plants',
      hp: 20,
      maxHp: 20,
      sun: 5,
      maxSun: 5,
      blockMeter: 3,
      isSuperBlockShieldActive: false,
      isBlockMeterFull: false,
      blockCharges: 0,
      hand: [],
      superpowerHand: [],
    }

    const mockZombieHero: Hero = {
      id: 'super_brainz',
      name: 'Super Brainz',
      side: 'zombies',
      hp: 20,
      maxHp: 20,
      sun: 5,
      maxSun: 5,
      blockMeter: 2,
      isSuperBlockShieldActive: false,
      isBlockMeterFull: false,
      blockCharges: 0,
      hand: [],
      superpowerHand: [],
    }

    it('renders victory gold aura, halo and 👑 crown when hero is the winner', () => {
      const plantMarkup = renderToStaticMarkup(
        <HeroBottomArena
          hero={mockPlantHero}
          side="plants"
          isPlayerTurn={true}
          isWinner={true}
          isDefeated={false}
        />
      )
      expect(plantMarkup).toContain('hero-victory-crown')
      expect(plantMarkup).toContain('👑')
      expect(plantMarkup).toContain('hero-victory-aura')
      expect(plantMarkup).toContain('hero-winner-halo')
      expect(plantMarkup).toContain('is-winner')

      const zombieMarkup = renderToStaticMarkup(
        <HeroTopArena
          hero={mockZombieHero}
          side="zombies"
          isPlayerTurn={false}
          isWinner={true}
          isDefeated={false}
        />
      )
      expect(zombieMarkup).toContain('hero-victory-crown')
      expect(zombieMarkup).toContain('👑')
      expect(zombieMarkup).toContain('hero-victory-aura')
      expect(zombieMarkup).toContain('is-winner')
    })

    it('renders grayscale filter, cracked screen overlay, and ☠️ skull when hero is defeated', () => {
      const plantMarkup = renderToStaticMarkup(
        <HeroBottomArena
          hero={{ ...mockPlantHero, hp: 0 }}
          side="plants"
          isPlayerTurn={false}
          isWinner={false}
          isDefeated={true}
        />
      )
      expect(plantMarkup).toContain('hero-defeat-cracked-overlay')
      expect(plantMarkup).toContain('crack-line')
      expect(plantMarkup).toContain('defeat-skull-badge')
      expect(plantMarkup).toContain('☠️')
      expect(plantMarkup).toContain('is-defeated')

      const zombieMarkup = renderToStaticMarkup(
        <HeroTopArena
          hero={{ ...mockZombieHero, hp: 0 }}
          side="zombies"
          isPlayerTurn={false}
          isWinner={false}
          isDefeated={true}
        />
      )
      expect(zombieMarkup).toContain('hero-defeat-cracked-overlay')
      expect(zombieMarkup).toContain('defeat-skull-badge')
      expect(zombieMarkup).toContain('☠️')
      expect(zombieMarkup).toContain('is-defeated')
    })

    it('supports onHeroClick callback on player hero character sprite', () => {
      const clickHandler = vi.fn()
      const markup = renderToStaticMarkup(
        <HeroBottomArena
          hero={mockPlantHero}
          side="plants"
          isPlayerTurn={true}
          onHeroClick={clickHandler}
        />
      )
      expect(markup).toContain('player-hero-character')
      expect(markup).toContain('Nhấp để mở bảng Biểu cảm')
    })
  })

  describe('2. Hero Emote & Speech Bubble System', () => {
    it('defines 8 authentic PvZ Heroes comic emotes', () => {
      const expectedEmotes = [
        'wellplayed',
        'oops',
        'brains',
        'gargantuar',
        'thinking',
        'hello',
        'goodgame',
        'noway',
      ]
      const ids = EMOTE_DEFINITIONS.map((e) => e.id)
      expectedEmotes.forEach((id) => {
        expect(ids).toContain(id)
      })
      expect(EMOTE_DEFINITIONS.length).toBeGreaterThanOrEqual(8)
    })

    it('renders 8 emote buttons with emojis and texts when palette is open', () => {
      const onSelect = vi.fn()
      const markup = renderToStaticMarkup(
        <HeroEmotesBar onSelectEmote={onSelect} isOpen={true} />
      )
      expect(markup).toContain('hero-emotes-palette')
      expect(markup).toContain('Well Played!')
      expect(markup).toContain('Oops!')
      expect(markup).toContain('Brains...')
      expect(markup).toContain('Gargantuar Roar!')
      expect(markup).toContain('Thinking...')
      expect(markup).toContain('Hello!')
      expect(markup).toContain('Good Game!')
      expect(markup).toContain('No Way!')
    })

    it('renders ComicSpeechBubble with standard comicBubblePop styling and message', () => {
      const onDismiss = vi.fn()
      const markup = renderToStaticMarkup(
        <ComicSpeechBubble
          message="Well Played!"
          heroSide="plants"
          durationMs={2500}
          onDismiss={onDismiss}
        />
      )
      expect(markup).toContain('comic-speech-bubble-wrapper')
      expect(markup).toContain('bubble-plants')
      expect(markup).toContain('Well Played!')
      expect(markup).toContain('speech-bubble-tail')
    })
  })

  describe('3. Comic Book Phase Announcement Banners', () => {
    it('renders PhaseBanner navigation and fight phase trigger button', () => {
      const markup = renderToStaticMarkup(
        <PhaseBanner
          phase="PLANT_PLAY"
          turn={3}
          onNextPhase={() => {}}
          onStartCombat={() => {}}
        />
      )
      expect(markup).toContain('phase-banner-wrapper')
      expect(markup).toContain('turn-counter-badge')
      expect(markup).toContain('LƯỢT')
      expect(markup).toContain('XONG LƯỢT PLANT')
    })

    it('renders fight button during FIGHT phase', () => {
      const markup = renderToStaticMarkup(
        <PhaseBanner
          phase="FIGHT"
          turn={4}
          isCombatResolving={false}
          onStartCombat={() => {}}
        />
      )
      expect(markup).toContain('fight-btn')
      expect(markup).toContain('GIAO TRANH')
    })
  })

  describe('4. Heights & Water Lane Distinct Visuals & Splash FX', () => {
    const heightsLane: LaneState = {
      index: 0,
      type: 'heights',
      plantMinion: {
        instanceId: 'p1',
        cardId: 'plant_peashooter',
        name: 'Peashooter',
        side: 'plants',
        currentAttack: 2,
        currentHealth: 1,
        maxHealth: 1,
        lane: 0,
      },
      zombieMinion: null,
      environment: null,
    }

    const waterLane: LaneState = {
      index: 4,
      type: 'water',
      plantMinion: null,
      zombieMinion: null,
      environment: null,
    }

    it('Lane 1 (Heights) renders 3D elevation badge, roof ledge, and elevation aura for minion', () => {
      const markup = renderToStaticMarkup(<LaneEnvironmentFX lane={heightsLane} />)
      expect(markup).toContain('heights-living-fx')
      expect(markup).toContain('heights-roof-ledge')
      expect(markup).toContain('heights-3d-elevation-badge')
      expect(markup).toContain('HEIGHTS +20m')
      expect(markup).toContain('heights-elevation-aura')
      expect(markup).toContain('heights-minion-elevation-shadow')
    })

    it('Lane 5 (Water) renders animated ripples and splash droplets', () => {
      const markup = renderToStaticMarkup(<LaneEnvironmentFX lane={waterLane} />)
      expect(markup).toContain('water-living-fx')
      expect(markup).toContain('water-ripple-ring')
      expect(markup).toContain('splash-droplets')
      expect(markup).toContain('water-splash-droplet')
    })

    it('renders Lane container with correct heights and water CSS modifier classes', () => {
      const heightsMarkup = renderToStaticMarkup(
        <Lane lane={heightsLane} onSelectLane={() => {}} />
      )
      expect(heightsMarkup).toContain('lane-heights')
      expect(heightsMarkup).toContain('HEIGHTS')

      const waterMarkup = renderToStaticMarkup(
        <Lane lane={waterLane} onSelectLane={() => {}} />
      )
      expect(waterMarkup).toContain('lane-water')
      expect(waterMarkup).toContain('WATER')
    })
  })

  describe('5. Dynamic BGM Web Audio Synthesizer & Sound Settings Modal', () => {
    it('SoundManager supports dual-theme switching (plants, zombies, auto)', () => {
      soundManager.setBGMTheme('plants')
      expect(soundManager.getBGMTheme()).toBe('plants')

      soundManager.setBGMTheme('zombies')
      expect(soundManager.getBGMTheme()).toBe('zombies')

      soundManager.setBGMTheme('auto')
      expect(soundManager.getBGMTheme()).toBe('auto')
    })

    it('SoundManager provides callable playWaterSplash() and playBubblePop()', () => {
      expect(() => soundManager.playWaterSplash()).not.toThrow()
      expect(() => soundManager.playBubblePop()).not.toThrow()
    })

    it('SoundSettingsModal renders BGM Theme selector options (Plants Funk, Zombies Spooky, Auto)', () => {
      const markup = renderToStaticMarkup(
        <SoundSettingsModal isOpen={true} onClose={() => {}} />
      )
      expect(markup).toContain('sound-theme-selector-section')
      expect(markup).toContain('Chủ Đề Nhạc Nền (BGM Theme)')
      expect(markup).toContain('Plants Funk')
      expect(markup).toContain('Zombies Spooky')
      expect(markup).toContain('Tự Động (Auto)')
      expect(markup).toContain('Nước Bắn')
    })
  })

  describe('6. Deck Builder Mana Curve Graph & Advanced Tribe Filter (DeckBuilder)', () => {
    it('renders Mana Curve histogram bar chart with bins 1 through 7+', () => {
      const markup = renderToStaticMarkup(
        <DeckBuilder onSaveDeck={() => {}} onBack={() => {}} initialSide="plants" />
      )
      expect(markup).toContain('mana-curve-container')
      expect(markup).toContain('Biểu Đồ Năng Lượng')
      expect(markup).toContain('Mana Curve')

      // Check all bins 1 through 7+
      const bins = ['1', '2', '3', '4', '5', '6', '7+']
      bins.forEach((bin) => {
        expect(markup).toContain(`<span class="bar-cost-label">${bin}</span>`)
      })
    })

    it('renders Tribe filter tags and Sort options bar in DeckBuilder', () => {
      const markup = renderToStaticMarkup(
        <DeckBuilder onSaveDeck={() => {}} onBack={() => {}} initialSide="plants" />
      )
      // Tribe tags
      expect(markup).toContain('tribe-filter-group')
      expect(markup).toContain('Hệ tộc (Tribe):')
      expect(markup).toContain('Pea')
      expect(markup).toContain('Flower')
      expect(markup).toContain('Mushroom')

      // Sort controls
      expect(markup).toContain('sort-filter-group')
      expect(markup).toContain('Sắp xếp (Sort):')
      expect(markup).toContain('Chi phí (Cost)')
      expect(markup).toContain('Công (Attack)')
      expect(markup).toContain('Máu (Health)')
      expect(markup).toContain('Độ hiếm (Rarity)')
      expect(markup).toContain('Tên (A-Z)')
      expect(markup).toContain('sort-order-toggle-btn')
    })
  })
})
