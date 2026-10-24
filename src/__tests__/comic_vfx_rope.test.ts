import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CombatActionPopups,
  getComicActionWord,
  type CombatPopupItem,
} from '../components/board/CombatActionPopups'
import { LaneEnvironmentFX } from '../components/board/LaneEnvironmentFX'
import { TurnRopeTimer } from '../components/board/TurnRopeTimer'
import { soundManager } from '../audio/SoundManager'
import type { LaneState, Minion } from '../engine/types'

describe('Round 9: Comic Popups, Lane Environment FX & Turn Rope System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Comic Action Word Generator & Combat Popups', () => {
    it('should generate BLOCKED! when attack was blocked', () => {
      const word = getComicActionWord({ damage: 0, isBlocked: true })
      expect(word).toBe('BLOCKED!')
    })

    it('should generate DEADLY! when deadly trait triggered', () => {
      const word = getComicActionWord({ damage: 2, isDeadly: true })
      expect(word).toBe('DEADLY!')
    })

    it('should generate BULLSEYE! or STRIKE! for armor-piercing/lane-piercing traits', () => {
      const bullseyeWord = getComicActionWord({ damage: 3, traits: ['bullseye'] })
      expect(bullseyeWord).toBe('BULLSEYE!')

      const strikeWord = getComicActionWord({ damage: 4, traits: ['strikethrough'] })
      expect(strikeWord).toBe('STRIKE!')
    })

    it('should scale comic action words by damage magnitude', () => {
      expect(getComicActionWord({ damage: 6 })).toBe('CRUNCH!')
      expect(getComicActionWord({ damage: 4 })).toBe('BAM!')
      const lowDmgWord = getComicActionWord({ damage: 1 })
      expect(['POW!', 'ZAP!']).toContain(lowDmgWord)
    })

    it('should render CombatActionPopups correctly with damage and styling', () => {
      const mockPopups: CombatPopupItem[] = [
        {
          id: 'pop-1',
          laneIndex: 0,
          target: 'zombieMinion',
          word: 'CRUNCH!',
          damage: 5,
          targetSide: 'zombies',
          rotation: 4,
        },
        {
          id: 'pop-2',
          laneIndex: 2,
          target: 'plantHero',
          word: 'BLOCKED!',
          targetSide: 'plants',
          isBlocked: true,
          rotation: -3,
        },
      ]

      const html = renderToStaticMarkup(
        React.createElement(CombatActionPopups, { popups: mockPopups })
      )

      expect(html).toContain('comic-action-popup-item')
      expect(html).toContain('target-is-zombie')
      expect(html).toContain('popup-word-crunch')
      expect(html).toContain('CRUNCH!')
      expect(html).toContain('-5')

      expect(html).toContain('target-is-plant')
      expect(html).toContain('popup-word-blocked')
      expect(html).toContain('BLOCKED!')
      expect(html).toContain('🛡️')
    })
  })

  describe('2. Lane Living Environment FX (Heights & Water & Gravestone)', () => {
    it('should render breeze wind streaks and altitude indicator on Heights lane', () => {
      const heightsLane: LaneState = {
        index: 0,
        type: 'heights',
        name: 'Heights',
        plantMinion: null,
        zombieMinion: null,
      }

      const html = renderToStaticMarkup(
        React.createElement(LaneEnvironmentFX, { lane: heightsLane })
      )

      expect(html).toContain('heights-living-fx')
      expect(html).toContain('heights-wind-streak streak-1')
      expect(html).toContain('heights-wind-streak streak-2')
      expect(html).toContain('heights-wind-streak streak-3')
      expect(html).toContain('HEIGHTS +20m')
    })

    it('should render elevation aura when minion is positioned on Heights', () => {
      const mockMinion: Minion = {
        instanceId: 'chimney-1',
        cardId: 'zombie_chimney_sweep',
        name: 'Chimney Sweep',
        side: 'zombies',
        currentAttack: 2,
        baseAttack: 2,
        currentHealth: 1,
        maxHealth: 1,
        image: '',
        traits: [],
      }

      const heightsLaneWithMinion: LaneState = {
        index: 0,
        type: 'heights',
        name: 'Heights',
        plantMinion: null,
        zombieMinion: mockMinion,
      }

      const html = renderToStaticMarkup(
        React.createElement(LaneEnvironmentFX, { lane: heightsLaneWithMinion })
      )
      expect(html).toContain('heights-elevation-aura')
      expect(html).toContain('aura-sunbeam')
    })

    it('should render animated water waves, concentric ripples, and foam on Water lane', () => {
      const mockAmphibious: Minion = {
        instanceId: 'swimmer-1',
        cardId: 'zombie_energy_drink_zombie',
        name: 'Energy Drink Zombie',
        side: 'zombies',
        currentAttack: 1,
        baseAttack: 1,
        currentHealth: 7,
        maxHealth: 7,
        image: '',
        traits: ['amphibious'],
      }

      const waterLane: LaneState = {
        index: 4,
        type: 'water',
        name: 'Water',
        plantMinion: null,
        zombieMinion: mockAmphibious,
      }

      const html = renderToStaticMarkup(
        React.createElement(LaneEnvironmentFX, { lane: waterLane })
      )

      expect(html).toContain('water-living-fx')
      expect(html).toContain('water-ripples-emitter')
      expect(html).toContain('water-ripple-ring ring-1')
      expect(html).toContain('water-splash-foam-emitter')
      expect(html).toContain('splash-foam-bubble bubble-1')
    })

    it('should render ground crack fracture lines and debris when gravestone is revealing', () => {
      const gravestoneLane: LaneState = {
        index: 2,
        type: 'ground',
        name: 'Ground',
        plantMinion: null,
        zombieMinion: {
          instanceId: 'grave-1',
          cardId: 'zombie_headstone_carver',
          name: 'Headstone Carver',
          side: 'zombies',
          currentAttack: 1,
          baseAttack: 1,
          currentHealth: 3,
          maxHealth: 3,
          image: '',
          traits: [],
          isGravestone: true,
        },
      }

      const html = renderToStaticMarkup(
        React.createElement(LaneEnvironmentFX, {
          lane: gravestoneLane,
          isGravestoneRevealing: true,
        })
      )

      expect(html).toContain('gravestone-ground-fx')
      expect(html).toContain('is-erupting')
      expect(html).toContain('pebble-shard shard-1')
      expect(html).toContain('stone-debris-burst')
    })
  })

  describe('3. Turn Rope / Fuse Countdown Timer System', () => {
    it('should render turn rope with correct progress ratio and time label', () => {
      const html = renderToStaticMarkup(
        React.createElement(TurnRopeTimer, {
          timeLeft: 10,
          maxTime: 15,
          isActive: true,
        })
      )

      expect(html).toContain('turn-rope-track')
      expect(html).toContain('turn-rope-fuse')
      expect(html).toContain('width:66.66666666666666%')
      expect(html).toContain('10s')
      expect(html).toContain('rope-spark-head')
      expect(html).toContain('spark-flame-core')
    })

    it('should apply urgent pulsing mode when timeLeft is 5 seconds or less', () => {
      const html = renderToStaticMarkup(
        React.createElement(TurnRopeTimer, {
          timeLeft: 4,
          maxTime: 15,
          isActive: true,
        })
      )

      expect(html).toContain('rope-urgent-mode')
      expect(html).toContain('badge-pulse-urgent')
      expect(html).toContain('4s')
    })

    it('should hide when inactive or timeLeft <= 0', () => {
      const inactiveHtml = renderToStaticMarkup(
        React.createElement(TurnRopeTimer, {
          timeLeft: 10,
          maxTime: 15,
          isActive: false,
        })
      )
      expect(inactiveHtml).toBe('')

      const zeroHtml = renderToStaticMarkup(
        React.createElement(TurnRopeTimer, {
          timeLeft: 0,
          maxTime: 15,
          isActive: true,
        })
      )
      expect(zeroHtml).toBe('')
    })

    it('should execute soundManager methods for timer tick and sizzle without error', () => {
      expect(() => {
        soundManager.playTimerTick(false)
        soundManager.playTimerTick(true)
        soundManager.playFuseSizzle()
        soundManager.playComicImpact('POW')
        soundManager.playComicImpact('ZAP')
        soundManager.playComicImpact('CRUNCH')
        soundManager.playComicImpact('BLOCKED')
        soundManager.playComicImpact('DEADLY')
      }).not.toThrow()
    })
  })
})
