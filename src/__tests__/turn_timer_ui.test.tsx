import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  TurnTimerBar,
  getTimerUrgency,
  getTimerGradient,
  getTimerColor,
  type TimerUrgency,
} from '../components/ui/TurnTimerBar'
import { soundManager } from '../audio/SoundManager'

describe('TurnTimerBar Component & Urgency System (src/components/ui/TurnTimerBar.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Urgency Classification (getTimerUrgency)', () => {
    it('returns "safe" when plenty of time remains (> 10s on a 15s timer)', () => {
      expect(getTimerUrgency(15, 15)).toBe('safe')
      expect(getTimerUrgency(14, 15)).toBe('safe')
      expect(getTimerUrgency(12, 15)).toBe('safe')
      expect(getTimerUrgency(11, 15)).toBe('safe')
    })

    it('returns "warning" (burning rope) when time is between 6s and 10s', () => {
      expect(getTimerUrgency(10, 15)).toBe('warning')
      expect(getTimerUrgency(9, 15)).toBe('warning')
      expect(getTimerUrgency(7, 15)).toBe('warning')
      expect(getTimerUrgency(6, 15)).toBe('warning')
    })

    it('returns "critical" (pulsing red) for the final 5 seconds', () => {
      expect(getTimerUrgency(5, 15)).toBe('critical')
      expect(getTimerUrgency(4, 15)).toBe('critical')
      expect(getTimerUrgency(3, 15)).toBe('critical')
      expect(getTimerUrgency(2, 15)).toBe('critical')
      expect(getTimerUrgency(1, 15)).toBe('critical')
    })

    it('handles custom max timer durations proportionally', () => {
      // 30 second timer: 25s safe, 18s warning (<=60%), 5s critical
      expect(getTimerUrgency(25, 30)).toBe('safe')
      expect(getTimerUrgency(18, 30)).toBe('warning')
      expect(getTimerUrgency(5, 30)).toBe('critical')
      expect(getTimerUrgency(2, 30)).toBe('critical')
    })
  })

  describe('2. Color and Gradient Scheme (getTimerGradient & getTimerColor)', () => {
    it('returns vibrant green gradient and color for "safe" urgency', () => {
      const gradient = getTimerGradient('safe')
      expect(gradient).toContain('#15803d')
      expect(gradient).toContain('#22c55e')
      expect(getTimerColor('safe')).toBe('#22c55e')
    })

    it('returns burning rope orange/yellow gradient and amber color for "warning" urgency', () => {
      const gradient = getTimerGradient('warning')
      expect(gradient).toContain('#b45309')
      expect(gradient).toContain('#f59e0b')
      expect(gradient).toContain('#facc15')
      expect(getTimerColor('warning')).toBe('#f59e0b')
    })

    it('returns deep pulsing red gradient and red color for "critical" urgency', () => {
      const gradient = getTimerGradient('critical')
      expect(gradient).toContain('#991b1b')
      expect(gradient).toContain('#ef4444')
      expect(gradient).toContain('#f87171')
      expect(getTimerColor('critical')).toBe('#ef4444')
    })
  })

  describe('3. Component Rendering, Progress Widths & Urgency Indicators', () => {
    it('renders 100% width and safe green styles when timer is full', () => {
      const html = renderToStaticMarkup(
        <TurnTimerBar timeLeft={15} maxTime={15} isActive={true} />
      )

      // Outer container structure and safe classes
      expect(html).toContain('turn-timer-bar-container')
      expect(html).toContain('timer-safe')
      expect(html).toContain('urgency-safe')
      expect(html).not.toContain('timer-pulsing-red')

      // Width calculation: 15 / 15 = 100%
      expect(html).toContain('width:100%')
      expect(html).toContain('width:0%') // Ash trail is 0%

      // Rope texture and burning tip
      expect(html).toContain('rope-texture-strip')
      expect(html).toContain('rope-burning-tip')
      expect(html).toContain('spark-flame-core')
      expect(html).toContain('spark-particles')
      expect(html).toContain('p-1')
      expect(html).toContain('p-4')

      // Sizzle indicator (non-critical)
      expect(html).toContain('visual-sizzle-indicator')
      expect(html).toContain('Sizzle')
      expect(html).not.toContain('sizzle-pulsing')

      // Countdown badge
      expect(html).toContain('15s')
    })

    it('renders 50% width and warning orange/yellow styles at half time', () => {
      const html = renderToStaticMarkup(
        <TurnTimerBar timeLeft={7.5} maxTime={15} isActive={true} />
      )

      expect(html).toContain('timer-warning')
      expect(html).toContain('urgency-warning')
      expect(html).not.toContain('timer-pulsing-red')

      // Progress widths: 7.5 / 15 = 50%
      expect(html).toContain('width:50%')

      // Ash trail takes the remaining 50%
      expect(html).toContain('width:50%')
      expect(html).toContain('7.5s')
    })

    it('renders 20% width and pulsing red styles in critical last 5 seconds (timeLeft = 3)', () => {
      const html = renderToStaticMarkup(
        <TurnTimerBar timeLeft={3} maxTime={15} isActive={true} />
      )

      // Urgent critical mode and pulsing red indicator
      expect(html).toContain('timer-critical')
      expect(html).toContain('urgency-critical')
      expect(html).toContain('rope-urgent-mode')
      expect(html).toContain('timer-pulsing-red')

      // 3 / 15 = 20% burning fuse width, 80% ash trail
      expect(html).toContain('width:20%')
      expect(html).toContain('width:80%')

      // Visual sizzle urgent state
      expect(html).toContain('sizzle-pulsing')
      expect(html).toContain('SIZZLE!')
      expect(html).toContain('💥')

      // Countdown badge with urgent pulse
      expect(html).toContain('badge-pulse-urgent')
      expect(html).toContain('3s')
    })

    it('renders null when timer is inactive or time has expired', () => {
      const inactiveHtml = renderToStaticMarkup(
        <TurnTimerBar timeLeft={10} maxTime={15} isActive={false} />
      )
      expect(inactiveHtml).toBe('')

      const expiredHtml = renderToStaticMarkup(
        <TurnTimerBar timeLeft={0} maxTime={15} isActive={true} />
      )
      expect(expiredHtml).toBe('')

      const negativeHtml = renderToStaticMarkup(
        <TurnTimerBar timeLeft={-2} maxTime={15} isActive={true} />
      )
      expect(negativeHtml).toBe('')
    })

    it('supports side classes (plants / zombies) and hides badge if showBadge=false', () => {
      const plantsHtml = renderToStaticMarkup(
        <TurnTimerBar
          timeLeft={8}
          maxTime={15}
          side="plants"
          showBadge={false}
        />
      )
      expect(plantsHtml).toContain('side-plants')
      expect(plantsHtml).not.toContain('turn-rope-countdown-badge')

      const zombiesHtml = renderToStaticMarkup(
        <TurnTimerBar
          timeLeft={4}
          maxTime={15}
          side="zombies"
          showBadge={true}
        />
      )
      expect(zombiesHtml).toContain('side-zombies')
      expect(zombiesHtml).toContain('turn-rope-countdown-badge')
    })
  })

  describe('4. Audio Triggering and Sound Manager Integration', () => {
    it('verifies SoundManager has playTimerTick and playFuseSizzle APIs', () => {
      expect(typeof soundManager.playTimerTick).toBe('function')
      expect(typeof soundManager.playFuseSizzle).toBe('function')

      const tickSpy = vi.spyOn(soundManager, 'playTimerTick').mockImplementation(() => {})
      const sizzleSpy = vi.spyOn(soundManager, 'playFuseSizzle').mockImplementation(() => {})

      soundManager.playTimerTick(true)
      expect(tickSpy).toHaveBeenCalledWith(true)

      soundManager.playFuseSizzle()
      expect(sizzleSpy).toHaveBeenCalled()
    })
  })

  describe('5. MatchReplayModal Serialization & UI Inspector Components', () => {
    it('correctly encodes and decodes PVZ_REPLAY code strings', async () => {
      const { encodeReplayCode, decodeReplayCode } = await import(
        '../components/ui/MatchReplayModal'
      )
      const mockSnapshots = [
        {
          frameIndex: 0,
          turn: 1,
          phase: 'zombies' as const,
          plantHeroHp: 20,
          zombieHeroHp: 20,
          plantHeroShield: 0,
          zombieHeroShield: 0,
          plantSun: 1,
          zombieBrains: 1,
          plantHandCount: 4,
          zombieHandCount: 4,
          actionDescription: 'Khởi đầu trận đấu',
        },
        {
          frameIndex: 1,
          turn: 1,
          phase: 'plants' as const,
          plantHeroHp: 20,
          zombieHeroHp: 18,
          plantHeroShield: 0,
          zombieHeroShield: 1,
          plantSun: 0,
          zombieBrains: 1,
          plantHandCount: 3,
          zombieHandCount: 4,
          actionDescription: 'Cây Peashooter bắn 2 sát thương',
        },
      ]

      const code = encodeReplayCode(mockSnapshots)
      expect(code.startsWith('PVZ_REPLAY:')).toBe(true)

      const decoded = decodeReplayCode(code)
      expect(decoded.length).toBe(2)
      expect(decoded[0].turn).toBe(1)
      expect(decoded[1].zombieHeroHp).toBe(18)
    })

    it('renders MatchReplayModal with logs, HP comparison, and MVP card', async () => {
      const { MatchReplayModal } = await import('../components/ui/MatchReplayModal')
      const mockHistory = [
        {
          frameIndex: 0,
          turn: 1,
          phase: 'fight' as const,
          plantHeroHp: 15,
          zombieHeroHp: 10,
          plantHeroShield: 2,
          zombieHeroShield: 0,
          plantSun: 2,
          zombieBrains: 2,
          plantHandCount: 3,
          zombieHandCount: 3,
          actionDescription: 'Tấn công dồn dập vào tướng địch',
        },
      ]

      const html = renderToStaticMarkup(
        <MatchReplayModal
          isOpen={true}
          replayHistory={mockHistory}
          winner="plants"
          onClose={() => {}}
        />
      )

      expect(html).toContain('match-replay-container')
      expect(html).toContain('XEM LẠI TRẬN ĐẤU (MATCH REPLAY)')
      expect(html).toContain('PLANTS CHIẾN THẮNG RỰC RỠ!')
      expect(html).toContain('15 HP') // Plant HP
      expect(html).toContain('10 HP') // Zombie HP
      expect(html).toContain('Xuất Mã Replay (Export)')
      expect(html).toContain('Nạp Replay')
    })
  })

  describe('6. MatchStatsModal End-Game Statistics & Comparison Board', () => {
    it('computes accurate match stats via deriveMatchStats', async () => {
      const { deriveMatchStats } = await import('../components/ui/MatchStatsModal')
      const derived = deriveMatchStats(
        {
          plantCardsPlayed: 7,
          zombieCardsPlayed: 8,
          plantDamageDealt: 24,
          zombieDamageDealt: 18,
          plantDamageBlocked: 6,
          zombieDamageBlocked: 3,
          plantSuperBlocksTriggered: 2,
          zombieSuperBlocksTriggered: 1,
          winner: 'plants',
        },
        undefined,
        undefined,
        'plants'
      )

      expect(derived.winner).toBe('plants')
      expect(derived.plantCardsPlayed).toBe(7)
      expect(derived.zombieCardsPlayed).toBe(8)
      expect(derived.plantDamageDealt).toBe(24)
      expect(derived.zombieDamageDealt).toBe(18)
      expect(derived.plantSuperBlocksTriggered).toBe(2)
      expect(derived.mvpCard).toBeDefined()
    })

    it('renders MatchStatsModal with head-to-head metrics and MVP showcase', async () => {
      const { MatchStatsModal } = await import('../components/ui/MatchStatsModal')
      const html = renderToStaticMarkup(
        <MatchStatsModal
          isOpen={true}
          winner="plants"
          stats={{
            plantCardsPlayed: 9,
            zombieCardsPlayed: 8,
            plantDamageDealt: 26,
            zombieDamageDealt: 14,
            plantDamageBlocked: 8,
            zombieDamageBlocked: 2,
            plantSuperBlocksTriggered: 2,
            zombieSuperBlocksTriggered: 1,
            turnCount: 5,
          }}
          onClose={() => {}}
          onRematch={() => {}}
          onViewReplay={() => {}}
        />
      )

      expect(html).toContain('BẢNG THỐNG KÊ CHI TIẾT TRẬN ĐẤU')
      expect(html).toContain('CHIẾN THẮNG HUY HOÀNG CHO THỰC VẬT!')
      expect(html).toContain('Thẻ bài đã ra (Cards Played)')
      expect(html).toContain('Tổng sát thương gây ra (Damage Dealt)')
      expect(html).toContain('Sát thương đã chặn (Damage Blocked)')
      expect(html).toContain('Khiên Super-Block đã kích hoạt')
      expect(html).toContain('CHIẾN BINH XUẤT SẮC NHẤT (MVP CARD SHOWCASE)')
      expect(html).toContain('XEM REPLAY TRẬN ĐẤU')
      expect(html).toContain('TÁI ĐẤU NGAY')
    })
  })
})
