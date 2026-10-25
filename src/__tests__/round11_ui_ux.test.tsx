import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CombatLog, getLogEventCategory } from '../components/CombatLog'
import { Card } from '../components/cards/Card'
import { GameOverModal } from '../components/modals/GameOverModal'
import { MulliganScreen } from '../components/modals/MulliganScreen'
import { soundManager } from '../audio/SoundManager'
import type { Card as CardType } from '../engine/types'

describe('Round 11 UI & UX Engineering Missions Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Combat Log Panel (src/components/CombatLog.tsx)', () => {
    it('accurately categorizes combat log events by color type', () => {
      // Red: Damage dealt / Minion defeated
      expect(getLogEventCategory('Peashooter gây 2 sát thương lên Imp')).toBe('damage')
      expect(getLogEventCategory('Zombie bị tiêu diệt!')).toBe('damage')
      expect(getLogEventCategory('Hero mất 3 máu do bị đánh trúng')).toBe('damage')

      // Green: Heal
      expect(getLogEventCategory('Hero hồi phục 4 máu')).toBe('heal')
      expect(getLogEventCategory('Chữa lành 3 HP cho Wall-Nut')).toBe('heal')

      // Yellow: Buff / Stat change / Shield
      expect(getLogEventCategory('Kích hoạt Super-Block khiên chắn!')).toBe('buff')
      expect(getLogEventCategory('Buff +2/+2 cho Peashooter')).toBe('buff')
      expect(getLogEventCategory('Tăng sức mạnh cho Minion')).toBe('buff')

      // White: Standard / Phase
      expect(getLogEventCategory('Lượt 3: Bắt đầu giao tranh')).toBe('standard')
      expect(getLogEventCategory('Người chơi rút lá bài mới')).toBe('standard')
    })

    it('renders the toggle button with 📜 Log icon and text', () => {
      const markup = renderToStaticMarkup(
        <CombatLog logs={['Lượt 1 bắt đầu', 'Peashooter gây 1 sát thương']} />
      )
      expect(markup).toContain('combat-log-toggle-btn')
      expect(markup).toContain('📜')
      expect(markup).toContain('Log')
      expect(markup).toContain('log-unread-pill')
    })

    it('renders the 280px x 400px floating panel when open with classified entries', () => {
      const logs = [
        'Peashooter gây 2 sát thương lên Zombie',
        'Hero hồi 4 máu',
        'Buff +2/+2 cho Plant',
        'Lượt 2: Plant ra quân',
      ]
      const markup = renderToStaticMarkup(
        <CombatLog logs={logs} isOpen={true} />
      )
      expect(markup).toContain('combat-log-floating-panel')
      expect(markup).toContain('log-entry-damage')
      expect(markup).toContain('log-entry-heal')
      expect(markup).toContain('log-entry-buff')
      expect(markup).toContain('log-entry-standard')
      expect(markup).toContain('NHẬT KÝ CHIẾN ĐẤU')
    })
  })

  describe('2. Card Rarity Indicators (src/components/cards/Card.tsx)', () => {
    const baseCard: CardType = {
      id: 'test_card_1',
      name: 'Test Hero Card',
      side: 'plants',
      cost: 2,
      attack: 2,
      health: 3,
      type: 'plant',
      image: '/assets/cards/test.png',
    }

    it('applies rarity-border-legendary for legendary cards', () => {
      const card: CardType = { ...baseCard, rarity: 'Legendary' }
      const markup = renderToStaticMarkup(<Card card={card} />)
      expect(markup).toContain('rarity-border-legendary')
    })

    it('applies rarity-border-super-rare for super-rare cards', () => {
      const card: CardType = { ...baseCard, rarity: 'Super-Rare' }
      const markup = renderToStaticMarkup(<Card card={card} />)
      expect(markup).toContain('rarity-border-super-rare')
    })

    it('applies rarity-border-rare for rare cards', () => {
      const card: CardType = { ...baseCard, rarity: 'Rare' }
      const markup = renderToStaticMarkup(<Card card={card} />)
      expect(markup).toContain('rarity-border-rare')
    })

    it('applies rarity-border-uncommon for uncommon cards', () => {
      const card: CardType = { ...baseCard, rarity: 'Uncommon' }
      const markup = renderToStaticMarkup(<Card card={card} />)
      expect(markup).toContain('rarity-border-uncommon')
    })

    it('applies rarity-border-common for common or unspecified rarity cards', () => {
      const card: CardType = { ...baseCard, rarity: 'Common' }
      const markup = renderToStaticMarkup(<Card card={card} />)
      expect(markup).toContain('rarity-border-common')
    })
  })

  describe('3. End-Game Detailed Match Statistics Screen (GameOverModal.tsx)', () => {
    it('renders the detailed stats toggle button on the gameover screen', () => {
      const markup = renderToStaticMarkup(
        <GameOverModal
          winner="plants"
          turnCount={5}
          totalDamageDealt={28}
          minionsDefeated={6}
          onRematch={() => {}}
        />
      )
      expect(markup).toContain('gameover-detailed-stats-toggle-btn')
      expect(markup).toContain('XEM THỐNG KÊ CHI TIẾT TRẬN ĐẤU')
    })

    it('renders head-to-head comparison metrics with custom detailedStats', () => {
      const customStats = {
        plantDamageDealt: 32,
        zombieDamageDealt: 18,
        plantMinionsSummoned: 8,
        zombieMinionsSummoned: 6,
        plantTricksPlayed: 4,
        zombieTricksPlayed: 3,
        plantSuperBlocks: 2,
        zombieSuperBlocks: 1,
        plantHighestHit: 8,
        zombieHighestHit: 5,
        matchDurationSeconds: 145,
      }

      const markup = renderToStaticMarkup(
        <GameOverModal
          winner="plants"
          turnCount={6}
          detailedStats={customStats}
          onRematch={() => {}}
        />
      )
      // Contains the toggle button ready for inspection
      expect(markup).toContain('gameover-detailed-stats-toggle-btn')
      expect(markup).toContain('THỐNG KÊ TRẬN ĐẤU')
    })
  })

  describe('4. Mulligan Phase Redraw Polish (src/components/modals/MulliganScreen.tsx)', () => {
    const sampleCards: CardType[] = [
      { id: 'c1', name: 'Peashooter', side: 'plants', cost: 1, attack: 1, health: 1, type: 'plant', image: '' },
      { id: 'c2', name: 'Sunflower', side: 'plants', cost: 1, attack: 0, health: 1, type: 'plant', image: '' },
      { id: 'c3', name: 'Wall-Nut', side: 'plants', cost: 1, attack: 0, health: 6, type: 'plant', image: '' },
      { id: 'c4', name: 'Repeater', side: 'plants', cost: 3, attack: 2, health: 2, type: 'plant', image: '' },
    ]

    it('renders cards ready for selection and redraw confirmation', () => {
      const markup = renderToStaticMarkup(
        <MulliganScreen
          cards={sampleCards}
          side="plants"
          onConfirmMulligan={() => {}}
        />
      )
      expect(markup).toContain('mulligan-cards-stage')
      expect(markup).toContain('BỐC BÀI ĐẦU TRẬN')
      expect(markup).toContain('mulligan-keep-pill')
      expect(markup).toContain('GIỮ LẠI')
    })
  })

  describe('5. SoundManager Web Audio Metallic Shield Clang (SoundManager.ts)', () => {
    it('provides playShieldClang method without throwing exceptions', () => {
      expect(typeof soundManager.playShieldClang).toBe('function')
      expect(() => {
        soundManager.playShieldClang()
      }).not.toThrow()
    })
  })
})
