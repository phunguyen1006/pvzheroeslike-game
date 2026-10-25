import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { ReplaySnapshot, Side, Card as CardType } from '../../engine/types'
import { getReplayHistory } from '../../engine/replay'
import { getCardById } from '../../data/cards'

export interface MatchReplayModalProps {
  isOpen?: boolean
  replayHistory?: ReplaySnapshot[]
  initialReplayCode?: string
  winner?: Side
  onClose: () => void
  onRematch?: () => void
}

export interface ReplayMVPInfo {
  card: Partial<CardType>
  name: string
  side: Side
  cost: number
  attack?: number
  health?: number
  image?: string
  reason: string
}

/**
 * Encodes replay history into a shareable PVZ_REPLAY:... code.
 */
export function encodeReplayCode(history: ReplaySnapshot[]): string {
  try {
    const json = JSON.stringify(history)
    let encoded: string
    if (typeof btoa !== 'undefined') {
      encoded = btoa(unescape(encodeURIComponent(json)))
    } else if (typeof (globalThis as any).Buffer !== 'undefined') {
      encoded = (globalThis as any).Buffer.from(json, 'utf-8').toString('base64')
    } else {
      encoded = json
    }
    return `PVZ_REPLAY:${encoded}`
  } catch {
    return `PVZ_REPLAY:${JSON.stringify(history)}`
  }
}

/**
 * Decodes a PVZ_REPLAY:... code, base64 payload, or raw JSON array.
 */
export function decodeReplayCode(code: string): ReplaySnapshot[] {
  if (!code || typeof code !== 'string') return []
  let raw = code.trim()
  if (raw.startsWith('PVZ_REPLAY:')) {
    raw = raw.substring('PVZ_REPLAY:'.length).trim()
  }

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // Not raw JSON, try base64
  }

  // 2. Base64 decode
  try {
    let jsonStr: string
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(raw)))
    } else if (typeof (globalThis as any).Buffer !== 'undefined') {
      jsonStr = (globalThis as any).Buffer.from(raw, 'base64').toString('utf-8')
    } else {
      jsonStr = raw
    }
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // Failed decoding
  }

  return []
}

/**
 * Analyzes replay history to find the standout MVP card of the match.
 */
export function computeReplayMVP(history: ReplaySnapshot[]): ReplayMVPInfo {
  if (!history || history.length === 0) {
    return {
      card: {},
      name: 'Green Shadow',
      side: 'plants',
      cost: 1,
      attack: 5,
      health: 0,
      image: '/assets/heroes/plants/Green Shadow.png',
      reason: 'Gương mặt đại diện xuất sắc của trận đấu',
    }
  }

  // Track cards played and occurrences
  const cardCounts: Record<string, { count: number; side: Side }> = {}
  history.forEach((frame) => {
    if (frame.action?.type === 'PLAY_CARD' && frame.action.cardId) {
      const id = frame.action.cardId
      const side = frame.action.side || 'plants'
      if (!cardCounts[id]) {
        cardCounts[id] = { count: 0, side }
      }
      cardCounts[id].count += 1
    }
  })

  // Find most played or impactful card
  let bestCardId = Object.keys(cardCounts)[0]
  let maxCount = 0
  for (const [id, data] of Object.entries(cardCounts)) {
    if (data.count > maxCount) {
      maxCount = data.count
      bestCardId = id
    }
  }

  // Check last frame board for strongest minion if no cards played directly
  if (!bestCardId && history.length > 0) {
    const lastState = history[history.length - 1]?.state
    for (const lane of lastState?.lanes || []) {
      if (lane.plantMinion && lane.plantMinion.currentAttack >= 4) {
        bestCardId = lane.plantMinion.cardId || 'plant_peashooter'
        break
      }
      if (lane.zombieMinion && lane.zombieMinion.currentAttack >= 4) {
        bestCardId = lane.zombieMinion.cardId || 'zombie_regular'
        break
      }
    }
  }

  const foundCard = bestCardId ? getCardById(bestCardId) : undefined
  if (foundCard) {
    return {
      card: foundCard as any,
      name: foundCard.name,
      side: (foundCard as any).side || 'plants',
      cost: foundCard.cost,
      attack: foundCard.attack,
      health: foundCard.health,
      image: foundCard.image,
      reason:
        maxCount > 1
          ? `Thi triển ${maxCount} lần, tạo áp lực liên tục lên chiến trường!`
          : `Tác động then chốt xoay chuyển cục diện ván đấu!`,
    }
  }

  // Fallback signature MVP
  return {
    card: {},
    name: 'Peashooter',
    side: 'plants',
    cost: 1,
    attack: 1,
    health: 1,
    image: '/assets/cards/plants/Peashooter.png',
    reason: 'Chiến binh quả cảm kiên cường giữ vững khu vườn!',
  }
}

/**
 * Returns a human-friendly string for a game action.
 */
export function formatReplayAction(frame: ReplaySnapshot): string {
  const { action, turn, phase } = frame
  if (!action) return `Lượt ${turn} - ${phase}`

  switch (action.type) {
    case 'PLAY_CARD': {
      const card = action.cardId ? getCardById(action.cardId) : undefined
      const cardName = card ? card.name : action.cardId || 'Lá bài'
      const sideText = action.side === 'zombies' ? 'Zombie' : 'Plant'
      const laneText = action.laneIndex !== undefined ? `Làn ${action.laneIndex + 1}` : 'chiến trường'
      return `${sideText} ra bài [${cardName}] tại ${laneText}`
    }
    case 'NEXT_PHASE':
      return `Chuyển sang giai đoạn kế tiếp (${phase})`
    case 'START_COMBAT':
      return `Giai đoạn Giao Tranh (Combat Phase) bùng nổ!`
    case 'STEP_COMBAT_LANE':
      return `Giao tranh tại Làn ${(action.laneIndex ?? 0) + 1}`
    case 'PLAY_SUPERPOWER':
      return `Kích hoạt Siêu Năng Lực (Superpower) [${(action as any).superpowerId || 'Đặc biệt'}]`
    default:
      return `${action.type} (Lượt ${turn} - ${phase})`
  }
}

export const MatchReplayModal: React.FC<MatchReplayModalProps> = ({
  isOpen = true,
  replayHistory,
  initialReplayCode,
  winner: propWinner,
  onClose,
  onRematch,
}) => {
  // Initialize replay frames
  const [history, setHistory] = useState<ReplaySnapshot[]>(() => {
    if (initialReplayCode) {
      const decoded = decodeReplayCode(initialReplayCode)
      if (decoded.length > 0) return decoded
    }
    if (replayHistory && replayHistory.length > 0) {
      return replayHistory
    }
    const stored = getReplayHistory()
    return stored.length > 0 ? stored : []
  })

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [pasteInput, setPasteInput] = useState<string>('')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const playTimerRef = useRef<any>(null)

  // Clamp currentFrameIndex when history changes
  useEffect(() => {
    if (currentFrameIndex >= history.length && history.length > 0) {
      setCurrentFrameIndex(history.length - 1)
    }
  }, [history.length, currentFrameIndex])

  // Auto-play timer loop
  useEffect(() => {
    if (isPlaying && history.length > 1) {
      playTimerRef.current = setTimeout(() => {
        setCurrentFrameIndex((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, 1600)
    } else {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [isPlaying, history.length, currentFrameIndex])

  // Current frame and state data
  const currentFrame = history[currentFrameIndex] || null
  const currentState = currentFrame ? currentFrame.state : null
  const previousState = currentFrameIndex > 0 ? history[currentFrameIndex - 1]?.state : null

  // Winner calculation
  const winner: Side | null = useMemo(() => {
    if (propWinner) return propWinner
    if (!history.length) return null
    const lastFrame = history[history.length - 1]
    if (lastFrame?.state?.winner) return lastFrame.state.winner
    if ((lastFrame?.state?.plantHero?.hp ?? (lastFrame as any)?.plantHeroHp ?? 20) <= 0) return 'zombies'
    if ((lastFrame?.state?.zombieHero?.hp ?? (lastFrame as any)?.zombieHeroHp ?? 20) <= 0) return 'plants'
    return null
  }, [propWinner, history])

  // MVP Card
  const mvp = useMemo(() => computeReplayMVP(history), [history])

  // Hero HP and HP Deltas
  const plantHp = currentState?.plantHero?.hp ?? (currentFrame as any)?.plantHeroHp ?? 20
  const zombieHp = currentState?.zombieHero?.hp ?? (currentFrame as any)?.zombieHeroHp ?? 20
  const prevPlantHp =
    previousState?.plantHero?.hp ?? (history[currentFrameIndex - 1] as any)?.plantHeroHp ?? plantHp
  const prevZombieHp =
    previousState?.zombieHero?.hp ?? (history[currentFrameIndex - 1] as any)?.zombieHeroHp ?? zombieHp
  const plantHpDelta = plantHp - prevPlantHp
  const zombieHpDelta = zombieHp - prevZombieHp

  // Handlers
  const handleNext = () => {
    if (currentFrameIndex < history.length - 1) {
      setCurrentFrameIndex((p) => p + 1)
    }
  }

  const handlePrev = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex((p) => p - 1)
    }
  }

  const handleJumpStart = () => {
    setCurrentFrameIndex(0)
    setIsPlaying(false)
  }

  const handleJumpEnd = () => {
    if (history.length > 0) {
      setCurrentFrameIndex(history.length - 1)
    }
    setIsPlaying(false)
  }

  const handleTogglePlay = () => {
    if (currentFrameIndex >= history.length - 1 && !isPlaying) {
      setCurrentFrameIndex(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((p) => !p)
    }
  }

  const handleExportReplay = () => {
    const code = encodeReplayCode(history)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2600)
      })
    } else {
      // Fallback
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2600)
    }
  }

  const handleLoadPaste = () => {
    setPasteError(null)
    const decoded = decodeReplayCode(pasteInput)
    if (decoded && decoded.length > 0) {
      setHistory(decoded)
      setCurrentFrameIndex(0)
      setIsPlaying(false)
      setPasteInput('')
    } else {
      setPasteError('Mã Replay không hợp lệ! Vui lòng kiểm tra lại mã PVZ_REPLAY:... hoặc định dạng JSON.')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="pvz-modal-backdrop match-replay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Match Replay Inspector"
      data-testid="match-replay-modal"
    >
      <div className="match-replay-container">
        {/* Modal Header */}
        <div className="match-replay-header">
          <div className="replay-title-cluster">
            <span className="replay-icon">🎬</span>
            <div className="title-text-wrap">
              <h2 className="replay-main-title">XEM LẠI TRẬN ĐẤU (MATCH REPLAY)</h2>
              <span className="replay-subtitle">
                Kiểm tra từng bước hành động, chỉ số máu Tướng và bài MVP
              </span>
            </div>
          </div>
          <button
            className="replay-close-btn"
            onClick={onClose}
            aria-label="Đóng cửa sổ Replay"
            data-testid="replay-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Winner Banner */}
        <div
          className={`replay-winner-banner ${
            winner === 'plants' ? 'banner-plants' : winner === 'zombies' ? 'banner-zombies' : 'banner-in-progress'
          }`}
          data-testid="replay-winner-banner"
        >
          <div className="winner-flag-icon">
            {winner === 'plants' ? '🌻' : winner === 'zombies' ? '🧠' : '⚔️'}
          </div>
          <div className="winner-details">
            <span className="winner-headline">
              {winner === 'plants'
                ? 'PLANTS CHIẾN THẮNG RỰC RỠ! - CHIẾN THẮNG: CÂY CỎ (PLANTS)'
                : winner === 'zombies'
                ? 'ZOMBIES ĐẠT CHIẾN THẮNG TỐI HẬU! - CHIẾN THẮNG: ZOMBIES'
                : 'TRẬN ĐẤU ĐANG DIỄN RA HOẶC CHƯA HOÀN TẤT'}
            </span>
            <span className="winner-meta">
              Tổng số khung hình: {history.length} frames | Lượt đấu cuối: {history[history.length - 1]?.turn ?? 1}
            </span>
          </div>
          {winner && (
            <div className="winner-trophy-badge">
              <span>{winner === 'plants' ? '🏆 CÂY CỎ VÔ ĐỊCH' : '💀 ZOMBIE CHIẾM ĐẤT'}</span>
            </div>
          )}
        </div>

        {/* Main Grid: Left Stage (HP & Controls) + Right Stage (Log & MVP) */}
        <div className="replay-body-grid">
          {/* Column 1: Step-by-Step Inspector & Hero HP Changes */}
          <div className="replay-controls-column">
            {/* Hero HP Status & Changes */}
            <div className="replay-heroes-hp-panel" data-testid="hero-hp-panel">
              <div className="replay-hp-card plant-hero-card">
                <div className="hp-card-header">
                  <span className="hero-emoji">🌻</span>
                  <span className="hero-title">{currentState?.plantHero?.name || 'Plant Hero'}</span>
                </div>
                <div className="hp-value-row">
                  <span className="hp-current" data-testid="plant-hero-hp">
                    {plantHp} HP
                  </span>
                  {plantHpDelta !== 0 && (
                    <span
                      className={`hp-delta-badge ${plantHpDelta < 0 ? 'delta-damage' : 'delta-heal'}`}
                      data-testid="plant-hp-delta"
                    >
                      {plantHpDelta > 0 ? `+${plantHpDelta}` : plantHpDelta}
                    </span>
                  )}
                </div>
                <div className="hp-meter-bar">
                  <div
                    className="hp-meter-fill plant-fill"
                    style={{ width: `${Math.max(0, Math.min(100, (plantHp / 20) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="hp-vs-divider">VS</div>

              <div className="replay-hp-card zombie-hero-card">
                <div className="hp-card-header">
                  <span className="hero-emoji">🧠</span>
                  <span className="hero-title">{currentState?.zombieHero?.name || 'Zombie Hero'}</span>
                </div>
                <div className="hp-value-row">
                  <span className="hp-current" data-testid="zombie-hero-hp">
                    {zombieHp} HP
                  </span>
                  {zombieHpDelta !== 0 && (
                    <span
                      className={`hp-delta-badge ${zombieHpDelta < 0 ? 'delta-damage' : 'delta-heal'}`}
                      data-testid="zombie-hp-delta"
                    >
                      {zombieHpDelta > 0 ? `+${zombieHpDelta}` : zombieHpDelta}
                    </span>
                  )}
                </div>
                <div className="hp-meter-bar">
                  <div
                    className="hp-meter-fill zombie-fill"
                    style={{ width: `${Math.max(0, Math.min(100, (zombieHp / 20) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Current Frame Status Display */}
            <div className="current-frame-info-box" data-testid="current-frame-info">
              <div className="frame-meta-row">
                <span className="frame-pill">
                  Frame {history.length > 0 ? currentFrameIndex + 1 : 0} / {history.length}
                </span>
                <span className="turn-pill">
                  Lượt (Turn): {currentFrame?.turn ?? 1}
                </span>
                <span className="phase-pill">
                  Giai đoạn: {currentFrame?.phase ?? 'PLAY'}
                </span>
              </div>
              <div className="frame-action-desc" data-testid="frame-action-description">
                {currentFrame ? formatReplayAction(currentFrame) : 'Không có dữ liệu khung hình'}
              </div>
            </div>

            {/* Step-by-Step Playback Controls */}
            <div className="replay-playback-controls" data-testid="replay-playback-controls">
              <button
                className="control-btn"
                onClick={handleJumpStart}
                disabled={currentFrameIndex === 0}
                title="Về đầu trận"
                data-testid="jump-start-btn"
              >
                ⏮
              </button>
              <button
                className="control-btn"
                onClick={handlePrev}
                disabled={currentFrameIndex === 0}
                title="Lùi 1 bước"
                data-testid="prev-frame-btn"
              >
                ◀ Trước
              </button>
              <button
                className={`control-btn play-btn ${isPlaying ? 'is-playing' : ''}`}
                onClick={handleTogglePlay}
                title={isPlaying ? 'Tạm dừng' : 'Tự động chạy'}
                data-testid="play-toggle-btn"
              >
                {isPlaying ? '⏸ Tạm Dừng' : '▶ Tự Động Chạy'}
              </button>
              <button
                className="control-btn"
                onClick={handleNext}
                disabled={currentFrameIndex >= history.length - 1}
                title="Tiến 1 bước"
                data-testid="next-frame-btn"
              >
                Tiếp ▶
              </button>
              <button
                className="control-btn"
                onClick={handleJumpEnd}
                disabled={currentFrameIndex >= history.length - 1}
                title="Đến cuối trận"
                data-testid="jump-end-btn"
              >
                ⏭
              </button>
            </div>

            {/* Timeline Scrubber */}
            <div className="replay-scrubber-bar">
              <input
                type="range"
                min={0}
                max={Math.max(0, history.length - 1)}
                value={currentFrameIndex}
                onChange={(e) => {
                  setCurrentFrameIndex(Number(e.target.value))
                  setIsPlaying(false)
                }}
                className="replay-slider"
                data-testid="replay-scrubber-slider"
                disabled={history.length <= 1}
              />
            </div>
          </div>

          {/* Column 2: Turn-by-Turn Action Log & MVP Card */}
          <div className="replay-log-and-mvp-column">
            {/* MVP Card Showcase Box */}
            <div className="replay-mvp-card-showcase" data-testid="replay-mvp-showcase">
              <div className="mvp-label-badge">
                <span className="mvp-star">⭐</span>
                <span className="mvp-text">NGÔI SAO TRẬN ĐẤU (MVP CARD)</span>
              </div>
              <div className="mvp-card-content">
                <div className="mvp-avatar-box">
                  {mvp.image ? (
                    <img
                      src={mvp.image}
                      alt={mvp.name}
                      className="mvp-card-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="mvp-avatar-fallback">{mvp.side === 'plants' ? '🌻' : '🧠'}</div>
                  )}
                  <div className="mvp-cost-orb">{mvp.cost}</div>
                </div>
                <div className="mvp-details-box">
                  <div className="mvp-name-line">
                    <span className="mvp-card-name" data-testid="mvp-card-name">
                      {mvp.name}
                    </span>
                    <span className={`mvp-side-tag ${mvp.side}`}>
                      {mvp.side === 'plants' ? 'Plant' : 'Zombie'}
                    </span>
                  </div>
                  {(mvp.attack !== undefined || mvp.health !== undefined) && (
                    <div className="mvp-stats-badges">
                      <span className="badge-attack">⚔️ {mvp.attack ?? 0}</span>
                      <span className="badge-health">❤️ {mvp.health ?? 0}</span>
                    </div>
                  )}
                  <p className="mvp-reason-text" data-testid="mvp-reason">
                    {mvp.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Turn-by-Turn Action Log */}
            <div className="replay-actions-log-panel" data-testid="replay-actions-log">
              <div className="log-panel-title">
                <span>📜 NHẬT KÝ HÀNH ĐỘNG TỪNG LƯỢT ({history.length} BƯỚC)</span>
              </div>
              <div className="actions-scroll-list">
                {history.length === 0 ? (
                  <div className="empty-log-notice">Chưa có hành động nào được ghi nhận.</div>
                ) : (
                  history.map((frame, idx) => {
                    const isSelected = idx === currentFrameIndex
                    return (
                      <div
                        key={`frame-${idx}-${frame.turn}`}
                        className={`replay-action-row ${isSelected ? 'row-selected' : ''}`}
                        onClick={() => {
                          setCurrentFrameIndex(idx)
                          setIsPlaying(false)
                        }}
                        data-testid={`action-row-${idx}`}
                      >
                        <span className="row-index-pill">#{idx + 1}</span>
                        <span className="row-turn-tag">Lượt {frame.turn}</span>
                        <span className="row-phase-tag">{frame.phase}</span>
                        <span className="row-action-text">{formatReplayAction(frame)}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Import / Export PVZ_REPLAY Code */}
        <div className="match-replay-footer">
          <div className="replay-code-transfer-wrap">
            <div className="paste-code-row">
              <input
                type="text"
                placeholder="Dán mã PVZ_REPLAY:... hoặc JSON vào đây..."
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                className="replay-code-input"
                data-testid="replay-code-input"
              />
              <button
                className="pvz-btn load-replay-btn"
                onClick={handleLoadPaste}
                disabled={!pasteInput.trim()}
                data-testid="load-replay-btn"
              >
                📥 Nạp Replay
              </button>
            </div>
            {pasteError && <span className="paste-error-msg">{pasteError}</span>}
          </div>

          <div className="footer-actions-wrap">
            <button
              className="pvz-btn export-replay-btn"
              onClick={handleExportReplay}
              title="Sao chép mã Replay vào bộ nhớ tạm"
              data-testid="export-replay-btn"
            >
              {copySuccess ? '✅ Đã Sao Chép Replay!' : '📋 Xuất Mã Replay (Export)'}
            </button>
            {onRematch && (
              <button className="pvz-btn rematch-btn" onClick={onRematch} data-testid="replay-rematch-btn">
                🔄 Tái Đấu
              </button>
            )}
            <button className="pvz-btn close-btn" onClick={onClose} data-testid="replay-footer-close-btn">
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchReplayModal
