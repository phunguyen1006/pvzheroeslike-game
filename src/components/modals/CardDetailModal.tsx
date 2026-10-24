import React, { useEffect } from 'react'
import type { Card as CardType, Minion } from '../../engine/types'
import { getCardById, type CardData, type Rarity } from '../../data/cards'
import { getCardFlavorText } from '../../data/flavorTexts'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import { soundManager } from '../../audio/SoundManager'

export interface CardDetailModalProps {
  card?: CardType | CardData | null
  minion?: Minion | null
  onClose: () => void
}

// Trait Definition Catalog with Authentic PvZ Heroes Lore & Rules
const TRAIT_DEFINITIONS: Record<
  string,
  { label: string; enName: string; desc: string; icon: string; isSprite?: boolean }
> = {
  amphibious: {
    label: 'Lội nước',
    enName: 'Amphibious',
    desc: 'Có thể di chuyển và chiến đấu tự do trên Làn Nước (Water Lane / Hồ bơi).',
    icon: '🌊',
  },
  armored: {
    label: 'Bọc giáp',
    enName: 'Armored',
    desc: 'Được bảo vệ bởi lớp giáp sắt kiên cố, giảm 1 sát thương từ mọi đòn tấn công nhận vào.',
    icon: ASSET_MANIFEST.traits.Trait_Armored,
    isSprite: true,
  },
  bullseye: {
    label: 'Bắn chuẩn',
    enName: 'Bullseye',
    desc: 'Các đòn tấn công chuẩn xác tuyệt đối, KHÔNG làm nạp vạch Super-Block của Hero đối phương.',
    icon: ASSET_MANIFEST.traits.Trait_Bullseye,
    isSprite: true,
  },
  deadly: {
    label: 'Chết chóc',
    enName: 'Deadly',
    desc: 'Chứa chất độc kịch phát. Chỉ cần gây ra ít nhất 1 sát thương là tiêu diệt tức khắc bất kỳ Plant nào.',
    icon: ASSET_MANIFEST.traits.Trait_Deadly,
    isSprite: true,
  },
  frenzy: {
    label: 'Cuồng nộ',
    enName: 'Frenzy',
    desc: 'Khi tiêu diệt được một Minion đối thủ và còn sống sót, lập tức kích hoạt thêm một đòn tấn công bonus.',
    icon: ASSET_MANIFEST.traits.Trait_Frenzy,
    isSprite: true,
  },
  strikethrough: {
    label: 'Xuyên thấu',
    enName: 'Strikethrough',
    desc: 'Đạn bắn xuyên táo: Gây sát thương lên Minion phòng ngự đồng thời bắn trúng thẳng vào Hero đối thủ.',
    icon: ASSET_MANIFEST.traits.Trait_Strikethrough,
    isSprite: true,
  },
  teamup: {
    label: 'Đồng đội',
    enName: 'Team-Up',
    desc: 'Có thể đặt chung vào cùng 1 làn với một Plant khác. Plant đứng phía trước sẽ chịu đòn che chở cho phía sau.',
    icon: '🤝',
  },
  antihero: {
    label: 'Đột kích',
    enName: 'Anti-Hero',
    desc: 'Gia tăng đột biến chỉ số Tấn công khi làn đối diện hoàn toàn trống trải, không có Minion cản đường.',
    icon: ASSET_MANIFEST.traits.Trait_AntiHero,
    isSprite: true,
  },
  doublestrike: {
    label: 'Đòn kép',
    enName: 'Double Strike',
    desc: 'Sau khi tung đòn tấn công chính ở Combat Phase, lập tức vung thêm một đòn đánh thứ hai.',
    icon: '⚔️',
  },
  freeze: {
    label: 'Đóng băng',
    enName: 'Freeze',
    desc: 'Đóng băng mục tiêu trong lớp băng giá tuyết trắng, khiến đối thủ bỏ lỡ lượt tấn công tiếp theo.',
    icon: ASSET_MANIFEST.traits.Trait_Frozen,
    isSprite: true,
  },
  gravestone: {
    label: 'Bia mộ',
    enName: 'Gravestone',
    desc: 'Xuất hiện bí mật dưới bia mộ đá cổ kính trong lượt Zombies Play. Chỉ phá mộ lộ diện ở pha Zombie Tricks!',
    icon: '🪦',
  },
  untrickable: {
    label: 'Kháng phép',
    enName: 'Untrickable',
    desc: 'Miễn nhiễm hoàn toàn trước mọi chiêu thức Tricks hay hiệu ứng phép thuật do đối thủ tung ra.',
    icon: '✨',
  },
  dinoroar: {
    label: 'Tiếng gầm khủng long',
    enName: 'Dino-Roar',
    desc: 'Mỗi khi chủ nhân rút thêm một lá bài mới từ bộ bài, quái thú lại gầm vang và tự kích hoạt sức mạnh đặc biệt.',
    icon: '🦖',
  },
  evolution: {
    label: 'Tiến hóa',
    enName: 'Evolution',
    desc: 'Trồng đè lên một Minion thuộc chi tộc tương ứng để kích hoạt hiệu ứng đột biến siêu cấp.',
    icon: '🧬',
  },
}

// Map Class names to sprites
const CLASS_ICON_MAP: Record<string, string> = {
  Guardian: ASSET_MANIFEST.traits.Plant_Class_Guardian,
  Kabloom: ASSET_MANIFEST.traits.Plant_Class_Kabloom,
  'Mega-Grow': ASSET_MANIFEST.traits.Plant_Class_MegaGrow,
  Smarty: ASSET_MANIFEST.traits.Plant_Class_Smarty,
  Solar: ASSET_MANIFEST.traits.Plant_Class_Solar,
  Beastly: ASSET_MANIFEST.traits.Zombie_Class_Beastly,
  Brainy: ASSET_MANIFEST.traits.Zombie_Class_Brainy,
  Crazy: ASSET_MANIFEST.traits.Zombie_Class_Crazy,
  Hearty: ASSET_MANIFEST.traits.Zombie_Class_Hearty,
  Sneaky: ASSET_MANIFEST.traits.Zombie_Class_Sneaky,
}

// Rarity configurations
const RARITY_CONFIG: Record<
  Rarity,
  { label: string; color: string; bgGradient: string; glow: string; gemIcon: string }
> = {
  Common: {
    label: 'Phổ thông (Common)',
    color: '#94a3b8',
    bgGradient: 'linear-gradient(135deg, #e2e8f0 0%, #64748b 100%)',
    glow: '0 0 10px rgba(148, 163, 184, 0.4)',
    gemIcon: '💎',
  },
  Uncommon: {
    label: 'Không phổ biến (Uncommon)',
    color: '#60a5fa',
    bgGradient: 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)',
    glow: '0 0 14px rgba(59, 130, 246, 0.6)',
    gemIcon: '🔷',
  },
  Rare: {
    label: 'Hiếm (Rare)',
    color: '#facc15',
    bgGradient: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 100%)',
    glow: '0 0 18px rgba(250, 204, 21, 0.7)',
    gemIcon: '🔶',
  },
  'Super-Rare': {
    label: 'Cực hiếm (Super-Rare)',
    color: '#c084fc',
    bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #9333ea 100%)',
    glow: '0 0 22px rgba(168, 85, 247, 0.85)',
    gemIcon: '🔮',
  },
  Legendary: {
    label: 'Huyền thoại (Legendary)',
    color: '#fbbf24',
    bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #f59e0b 50%, #d97706 100%)',
    glow: '0 0 28px rgba(245, 158, 11, 0.95)',
    gemIcon: '👑',
  },
  Event: {
    label: 'Sự kiện đặc biệt (Event)',
    color: '#22d3ee',
    bgGradient: 'linear-gradient(135deg, #cffafe 0%, #0891b2 100%)',
    glow: '0 0 20px rgba(6, 182, 212, 0.8)',
    gemIcon: '✨',
  },
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, minion, onClose }) => {
  // If neither is present, render nothing
  if (!card && !minion) return null

  // Sound and keyboard listener
  useEffect(() => {
    soundManager.playCardSelect()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundManager.playClick()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Resolve target card data
  const cardId = (card as any)?.id || minion?.cardId || ''
  const dbCard = cardId ? getCardById(cardId) : undefined

  // Base identifiers
  const name = (card as any)?.name || minion?.name || dbCard?.name || 'Vô danh'
  const side = ((card as any)?.side || minion?.side || dbCard?.team || 'plants') as
    | 'plants'
    | 'zombies'
  const isPlant = side === 'plants'

  // Type & category
  const rawType = (card as any)?.type || dbCard?.type || 'plant'
  const isSuperpower = rawType === 'superpower'
  const isTrick = rawType === 'trick'
  const isEnvironment = rawType === 'environment'
  const isMinion = !isTrick && !isEnvironment && !isSuperpower

  // Cost
  const cost = (card as any)?.cost ?? dbCard?.cost ?? 0

  // Combat stats (favor current minion stats if available)
  const attack = minion ? minion.currentAttack : (card as any)?.attack ?? dbCard?.attack ?? 0
  const health = minion
    ? minion.currentHealth
    : (card as any)?.health ?? (card as any)?.hp ?? dbCard?.health ?? dbCard?.hp ?? 0

  // Hero Class & Rarity
  const heroClass = (card as any)?.heroClass || dbCard?.heroClass || ''
  const classIcon = heroClass ? CLASS_ICON_MAP[heroClass] : null
  const rarity: Rarity = ((card as any)?.rarity || dbCard?.rarity || 'Common') as Rarity
  const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.Common

  // Image source
  const imageSrc =
    (card as any)?.image ||
    minion?.image ||
    dbCard?.image ||
    dbCard?.assetPath ||
    ASSET_MANIFEST.ui.defaultCardPlaceholder

  // Lane requirement
  const laneReq =
    (card as any)?.laneRequirement ||
    dbCard?.laneRequirement ||
    (minion?.amphibious || (card as any)?.amphibious ? 'water' : 'any')

  // Tribe tags array
  const rawTribe = (card as any)?.tribe || minion?.tribe || dbCard?.tribe || ''
  const tribeTokens = rawTribe
    ? rawTribe.split(/[\s/]+/).filter((t: string) => t.length > 0)
    : []

  // Active traits list
  const activeTraits: string[] = []
  const hasTrait = (key: string, boolVal?: boolean, numVal?: number) => {
    if (boolVal || (typeof numVal === 'number' && numVal > 0)) {
      if (!activeTraits.includes(key)) activeTraits.push(key)
    }
  }

  hasTrait('amphibious', (card as any)?.amphibious || minion?.amphibious || dbCard?.amphibious)
  hasTrait('armored', undefined, (card as any)?.armored || minion?.armored || dbCard?.armored)
  hasTrait('bullseye', (card as any)?.bullseye || minion?.bullseye || dbCard?.bullseye)
  hasTrait('deadly', (card as any)?.deadly || minion?.deadly || dbCard?.deadly)
  hasTrait('frenzy', (card as any)?.frenzy || minion?.frenzy || dbCard?.frenzy)
  hasTrait(
    'strikethrough',
    (card as any)?.strikethrough || minion?.strikethrough || dbCard?.strikethrough
  )
  hasTrait('teamup', (card as any)?.teamUp || minion?.teamUp || dbCard?.teamUp)
  hasTrait('antihero', undefined, (card as any)?.antiHero || minion?.antiHero || dbCard?.antiHero)
  hasTrait(
    'doublestrike',
    (card as any)?.doubleStrike || minion?.doubleStrike || dbCard?.doubleStrike
  )
  hasTrait('freeze', (card as any)?.freeze || minion?.freeze || dbCard?.freeze)
  hasTrait('gravestone', (card as any)?.gravestone || minion?.isGravestone || dbCard?.gravestone)
  hasTrait('untrickable', (card as any)?.untrickable || minion?.untrickable || (dbCard as any)?.untrickable)

  // Extra traits from array
  const traitsArray = (card as any)?.traits || minion?.traits || dbCard?.traits || []
  if (Array.isArray(traitsArray)) {
    traitsArray.forEach((t: any) => {
      const lower = String(t).toLowerCase().replace(/[^a-z]/g, '')
      if (lower && !activeTraits.includes(lower)) {
        activeTraits.push(lower)
      }
    })
  }

  // Card ability description
  const description =
    (card as any)?.description ||
    dbCard?.description ||
    'Một chiến binh kiên trung bảo vệ lãnh thổ trong trận quyết đấu.'

  // Authentic Flavor Text
  const flavorText = getCardFlavorText(cardId, name)

  const handleClose = () => {
    soundManager.playClick()
    onClose()
  }

  return (
    <div
      className="card-detail-modal-backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết thẻ bài ${name}`}
    >
      <div
        className={`card-detail-modal-container ${side}-detail-theme`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button '✕' */}
        <button
          type="button"
          className="card-detail-close-btn"
          onClick={handleClose}
          aria-label="Đóng cửa sổ chi tiết thẻ bài"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="card-detail-header">
          <div className="card-detail-title-row">
            <span className="card-detail-name">{name}</span>
            {classIcon && (
              <div className="card-detail-class-pill" title={`Hệ tướng: ${heroClass}`}>
                <img
                  src={classIcon}
                  alt={heroClass}
                  className="class-icon-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <span className="class-name-text">{heroClass}</span>
              </div>
            )}
          </div>
          <div className="card-detail-subtitle">
            <span
              className="card-detail-rarity-badge"
              style={{
                background: rarityConfig.bgGradient,
                color: rarity === 'Common' ? '#0f172a' : '#ffffff',
                boxShadow: rarityConfig.glow,
              }}
            >
              <span className="rarity-gem-symbol">{rarityConfig.gemIcon}</span>
              <span className="rarity-text">{rarityConfig.label}</span>
            </span>

            <span className="card-detail-category-tag">
              {isSuperpower
                ? '⭐ SIÊU NĂNG LỰC (SUPERPOWER)'
                : isTrick
                  ? '🔮 PHÉP THUẬT (TRICK)'
                  : isEnvironment
                    ? '🌍 MÔI TRƯỜNG (ENVIRONMENT)'
                    : isPlant
                      ? '🌱 CHIẾN BINH PLANT'
                      : '🧟 CHIẾN BINH ZOMBIE'}
            </span>
          </div>
        </div>

        {/* Modal Body: 2 Columns on Desktop, Stack on Mobile */}
        <div className="card-detail-body">
          {/* Left Column: Enlarged High-Res Card Presentation */}
          <div className="card-detail-card-preview-pane">
            <div
              className={`pvz-card pvz-card-large ${side}-card type-${rawType} ${
                rarity === 'Legendary' ? 'legendary-foil' : ''
              }`}
            >
              <div className="card-frame-border" />

              {/* Rarity 3D Gem Badge in Card Frame */}
              <div
                className={`card-rarity-gem rarity-${rarity.toLowerCase().replace(/[^a-z]/g, '')}`}
                title={rarity}
                style={{
                  background: rarityConfig.bgGradient,
                  boxShadow: rarityConfig.glow,
                }}
              >
                <span className="gem-shimmer-sparkle" />
              </div>

              {/* Cost Orb */}
              <div
                className={`card-cost-orb ${
                  isSuperpower ? 'superpower-orb' : isPlant ? 'sun-orb' : 'brain-orb'
                }`}
              >
                {!isPlant && !isSuperpower && (
                  <img
                    src={ASSET_MANIFEST.traits.Resource_Brain}
                    alt="Brains"
                    className="orb-bg-icon"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                )}
                {isSuperpower && <span className="orb-bg-star">⭐</span>}
                <span className="cost-number">{cost}</span>
              </div>

              {/* Class Badge */}
              {classIcon && (
                <div className="card-class-badge" title={heroClass}>
                  <img
                    src={classIcon}
                    alt={heroClass}
                    className="class-badge-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Card Artwork */}
              <div className="card-artwork-frame large-artwork">
                <img
                  src={imageSrc}
                  alt={name}
                  className="card-artwork-image"
                  onError={(e) => {
                    e.currentTarget.src = ASSET_MANIFEST.ui.defaultCardPlaceholder
                  }}
                />
                {isSuperpower && <div className="superpower-foil-overlay" />}
                {rarity === 'Legendary' && <div className="legendary-foil-sheen" />}
              </div>

              {/* Name Ribbon */}
              <div className="card-ribbon-banner">
                <span className="card-title-text">{name}</span>
              </div>

              {/* Minion Stats Row */}
              {isMinion && (
                <div className="card-stats-row large-stats-row">
                  <div className="card-stat-orb attack-orb" title={`Tấn công: ${attack}`}>
                    <span className="stat-spikes">💥</span>
                    <span className="stat-value">{attack}</span>
                  </div>
                  <div className="card-stat-orb health-orb" title={`Máu: ${health}`}>
                    <img
                      src={ASSET_MANIFEST.traits.Resource_Health_Heart}
                      alt="HP"
                      className="heart-icon-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <span className="stat-value">{health}</span>
                  </div>
                </div>
              )}

              {/* Type tag for Tricks / Environments */}
              {!isMinion && (
                <div className={`card-type-tag ${rawType}-tag`}>
                  <span>{isSuperpower ? 'SUPERPOWER' : isTrick ? 'TRICK' : 'ENVIRONMENT'}</span>
                </div>
              )}
            </div>

            {/* Quick Stat Bar under card on preview */}
            <div className="card-detail-quick-stats">
              <div className="quick-stat-item">
                <span className="quick-stat-label">Chi phí:</span>
                <span className="quick-stat-value">
                  {cost} {isPlant ? '☀️ Sun' : '🧠 Brains'}
                </span>
              </div>
              {isMinion && (
                <>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Tấn công:</span>
                    <span className="quick-stat-value text-amber-300">⚔️ {attack}</span>
                  </div>
                  <div className="quick-stat-item">
                    <span className="quick-stat-label">Máu:</span>
                    <span className="quick-stat-value text-red-400">❤️ {health}</span>
                  </div>
                </>
              )}
              {laneReq && laneReq !== 'any' && (
                <div className="quick-stat-item">
                  <span className="quick-stat-label">Làn:</span>
                  <span className="quick-stat-value text-cyan-300">
                    {laneReq === 'water' ? '🌊 Hồ bơi (Water)' : '🏔️ Đồi cao (Heights)'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: In-Depth Rules, Traits, Tribes & Lore */}
          <div className="card-detail-info-pane">
            {/* Tribe Tags Pills */}
            {tribeTokens.length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">🏷️ Chi Tộc (Tribes)</h4>
                <div className="detail-tribes-list">
                  {tribeTokens.map((tribe: string) => (
                    <span key={tribe} className="detail-tribe-pill">
                      {tribe}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Trait Badges & Gameplay Rules */}
            {activeTraits.length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">⚡ Đặc Tính Chiến Đấu (Traits)</h4>
                <div className="detail-traits-grid">
                  {activeTraits.map((traitKey) => {
                    const info = TRAIT_DEFINITIONS[traitKey.toLowerCase()]
                    if (!info) {
                      return (
                        <div key={traitKey} className="detail-trait-card">
                          <div className="trait-card-header">
                            <span className="trait-emoji-badge">⭐</span>
                            <span className="trait-title">{traitKey}</span>
                          </div>
                          <p className="trait-desc">Đặc tính chiến đấu đặc biệt của thẻ bài.</p>
                        </div>
                      )
                    }

                    return (
                      <div key={traitKey} className="detail-trait-card">
                        <div className="trait-card-header">
                          {info.isSprite ? (
                            <img
                              src={info.icon}
                              alt={info.label}
                              className="trait-sprite-icon"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <span className="trait-emoji-badge">{info.icon}</span>
                          )}
                          <div className="trait-titles">
                            <span className="trait-title-vn">{info.label}</span>
                            <span className="trait-title-en">({info.enName})</span>
                          </div>
                        </div>
                        <p className="trait-desc">{info.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ability Description */}
            <div className="detail-section">
              <h4 className="detail-section-title">📜 Kỹ Năng & Hiệu Ứng (Ability)</h4>
              <div className="detail-ability-box">
                <p className="detail-ability-text">{description}</p>
              </div>
            </div>

            {/* Authentic PvZ Heroes Lore & Flavor Text */}
            <div className="detail-section lore-section">
              <h4 className="detail-section-title">📖 Châm Ngôn Thẻ Bài (Flavor Text)</h4>
              <blockquote className="detail-flavor-quote">
                <span className="quote-mark">“</span>
                <p className="flavor-quote-text">{flavorText.replace(/^"|"$/g, '')}</p>
                <span className="quote-mark">”</span>
              </blockquote>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="card-detail-footer">
          <span className="footer-hint-text">
            💡 Nhấn <strong>ESC</strong> hoặc nhấp chuột ra ngoài để đóng xem chi tiết
          </span>
          <button type="button" className="btn-close-detail" onClick={handleClose}>
            Đóng Chi Tiết
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardDetailModal
