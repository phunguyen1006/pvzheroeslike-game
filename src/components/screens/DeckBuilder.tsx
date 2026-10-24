import React, { useState } from 'react'
import { PLANT_CARDS, ZOMBIE_CARDS, type CardData, type Team } from '../../data/cards'
import { Card } from '../cards/Card'
import { soundManager } from '../../audio/SoundManager'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import type { Card as EngineCard } from '../../engine/types'

export interface DeckBuilderProps {
  onSaveDeck: (side: 'plants' | 'zombies', deck: EngineCard[]) => void
  onBack: () => void
}

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

// Convert CardData to EngineCard
function toEngineCard(c: CardData): EngineCard {
  return {
    id: c.id,
    name: c.name,
    side: c.team === 'plants' ? 'plants' : 'zombies',
    cost: c.cost,
    attack: c.attack,
    health: c.hp || c.health,
    type: c.type === 'trick' ? 'trick' : c.type === 'environment' ? 'environment' : 'minion',
    image: c.image || c.assetPath,
    traits: c.traits as any,
    description: c.description,
    heroClass: c.heroClass,
    amphibious: c.traits.some((t) => t.toLowerCase() === 'amphibious'),
    bullseye: c.traits.some((t) => t.toLowerCase() === 'bullseye'),
    teamUp: c.traits.some((t) => t.toLowerCase() === 'team-up'),
    frenzy: c.traits.some((t) => t.toLowerCase() === 'frenzy'),
    deadly: c.traits.some((t) => t.toLowerCase() === 'deadly'),
    strikethrough: c.traits.some((t) => t.toLowerCase() === 'strikethrough'),
  }
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ onSaveDeck, onBack }) => {
  const [selectedSide, setSelectedSide] = useState<Team>('plants')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Selected deck: Map cardId -> count
  const [deckMap, setDeckMap] = useState<Record<string, number>>(() => {
    // Initial default 20-card deck
    return {
      plant_peashooter: 3,
      plant_sunflower: 3,
      plant_wall_nut: 3,
      plant_bonk_choy: 2,
      plant_snow_pea: 2,
      plant_black_eyed_pea: 2,
      plant_berry_blast: 2,
      plant_spikeweed_sector: 1,
      plant_bananasaurus_rex: 1,
      plant_squash: 1,
    }
  })

  const availableCards = selectedSide === 'plants' ? PLANT_CARDS : ZOMBIE_CARDS

  const filteredCards = availableCards.filter((card) => {
    if (selectedClass !== 'all' && card.heroClass !== selectedClass) return false
    if (selectedType !== 'all') {
      if (selectedType === 'minion' && (card.type === 'trick' || card.type === 'environment')) return false
      if (selectedType === 'trick' && card.type !== 'trick') return false
      if (selectedType === 'environment' && card.type !== 'environment') return false
    }
    return true
  })

  const totalCardsInDeck = Object.values(deckMap).reduce((sum, count) => sum + count, 0)

  // Switch faction
  const handleSwitchSide = (side: Team) => {
    setSelectedSide(side)
    setSelectedClass('all')
    setSelectedType('all')
    if (side === 'zombies') {
      setDeckMap({
        zombie_swabbie: 3,
        zombie_arm_wrestler: 3,
        zombie_bungee_plumber: 2,
        zombie_newspaper_zombie: 3,
        zombie_conga_zombie: 2,
        zombie_lurch_for_lunch: 2,
        zombie_disco_zombie: 2,
        zombie_area_22: 1,
        zombie_weed_spray: 1,
        zombie_locust_swarm: 1,
      })
    } else {
      setDeckMap({
        plant_peashooter: 3,
        plant_sunflower: 3,
        plant_wall_nut: 3,
        plant_bonk_choy: 2,
        plant_snow_pea: 2,
        plant_black_eyed_pea: 2,
        plant_berry_blast: 2,
        plant_spikeweed_sector: 1,
        plant_bananasaurus_rex: 1,
        plant_squash: 1,
      })
    }
    soundManager.playCardDrop()
  }

  const handleAddCard = (card: CardData) => {
    const currentCount = deckMap[card.id] || 0
    if (currentCount >= 4) {
      return // Max 4 copies
    }
    if (totalCardsInDeck >= 40) {
      return // Max 40 cards in deck
    }
    setDeckMap((prev) => ({
      ...prev,
      [card.id]: currentCount + 1,
    }))
    soundManager.playCardDrop()
  }

  const handleRemoveCard = (cardId: string) => {
    const currentCount = deckMap[cardId] || 0
    if (currentCount <= 0) return

    setDeckMap((prev) => {
      const copy = { ...prev }
      if (currentCount === 1) {
        delete copy[cardId]
      } else {
        copy[cardId] = currentCount - 1
      }
      return copy
    })
    soundManager.playCardDrop()
  }

  const handleConfirmSave = () => {
    soundManager.playBuff()
    const expandedDeck: EngineCard[] = []
    Object.entries(deckMap).forEach(([id, count]) => {
      const cardData = availableCards.find((c) => c.id === id)
      if (cardData) {
        const engineCard = toEngineCard(cardData)
        for (let i = 0; i < count; i++) {
          expandedDeck.push({ ...engineCard, id: `${engineCard.id}-${i}` })
        }
      }
    })
    onSaveDeck(selectedSide === 'plants' ? 'plants' : 'zombies', expandedDeck)
  }

  // Calculate mana curve
  const costDistribution: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  Object.entries(deckMap).forEach(([id, count]) => {
    const c = availableCards.find((card) => card.id === id)
    if (c) {
      const bucket = Math.min(5, c.cost)
      costDistribution[bucket] = (costDistribution[bucket] || 0) + count
    }
  })

  const plantClasses = ['Guardian', 'Kabloom', 'Mega-Grow', 'Smarty', 'Solar']
  const zombieClasses = ['Beastly', 'Brainy', 'Crazy', 'Hearty', 'Sneaky']
  const currentClasses = selectedSide === 'plants' ? plantClasses : zombieClasses

  return (
    <div className="deckbuilder-screen-layout">
      {/* Top Header */}
      <header className="deckbuilder-header">
        <button className="back-btn" onClick={onBack}>
          ⬅ QUAY LẠI
        </button>
        <div className="deckbuilder-title-group">
          <h1 className="deckbuilder-heading">XÂY DỰNG BỘ BÀI (DECK BUILDER)</h1>
          <span className="deckbuilder-subheading">
            Tạo chiến thuật với 20 - 40 lá bài chuẩn PvZ Heroes (Tối đa 4 bản sao mỗi lá)
          </span>
        </div>
        <button
          className="save-deck-btn"
          disabled={totalCardsInDeck < 10}
          onClick={handleConfirmSave}
        >
          💾 LƯU BỘ BÀI ({totalCardsInDeck} LÁ)
        </button>
      </header>

      {/* Main Grid: Card Catalog (Left/Center) + Current Deck (Right) */}
      <main className="deckbuilder-main-grid">
        {/* Left Column: Filter Controls & Card Catalog */}
        <section className="catalog-panel">
          {/* Faction & Type Switcher Bar */}
          <div className="catalog-filters-bar">
            {/* Faction Switch */}
            <div className="faction-switch-toggle">
              <button
                className={`faction-toggle-btn plant-btn ${selectedSide === 'plants' ? 'active-toggle' : ''}`}
                onClick={() => handleSwitchSide('plants')}
              >
                🌱 PLANTS
              </button>
              <button
                className={`faction-toggle-btn zombie-btn ${selectedSide === 'zombies' ? 'active-toggle' : ''}`}
                onClick={() => handleSwitchSide('zombies')}
              >
                🧟 ZOMBIES
              </button>
            </div>

            {/* Class Filter */}
            <div className="class-filter-chips">
              <button
                className={`filter-chip ${selectedClass === 'all' ? 'active-chip' : ''}`}
                onClick={() => setSelectedClass('all')}
              >
                Tất cả Class
              </button>
              {currentClasses.map((cls) => {
                const icon = CLASS_ICON_MAP[cls]
                return (
                  <button
                    key={cls}
                    className={`filter-chip ${selectedClass === cls ? 'active-chip' : ''}`}
                    onClick={() => setSelectedClass(cls)}
                  >
                    {icon && <img src={icon} alt={cls} className="filter-chip-class-icon" />}
                    <span>{cls}</span>
                  </button>
                )
              })}
            </div>

            {/* Type Filter */}
            <div className="type-filter-chips">
              <button
                className={`filter-chip ${selectedType === 'all' ? 'active-chip' : ''}`}
                onClick={() => setSelectedType('all')}
              >
                Tất cả Loại
              </button>
              <button
                className={`filter-chip ${selectedType === 'minion' ? 'active-chip' : ''}`}
                onClick={() => setSelectedType('minion')}
              >
                Minion
              </button>
              <button
                className={`filter-chip ${selectedType === 'trick' ? 'active-chip' : ''}`}
                onClick={() => setSelectedType('trick')}
              >
                Trick
              </button>
              <button
                className={`filter-chip ${selectedType === 'environment' ? 'active-chip' : ''}`}
                onClick={() => setSelectedType('environment')}
              >
                Environment
              </button>
            </div>
          </div>

          {/* Cards Showcase Grid */}
          <div className="catalog-cards-grid">
            {filteredCards.map((card) => {
              const engineCard = toEngineCard(card)
              const countInDeck = deckMap[card.id] || 0
              const isMaxCopies = countInDeck >= 4

              return (
                <div key={card.id} className="catalog-card-entry">
                  <div
                    className="card-preview-clickable"
                    onClick={() => handleAddCard(card)}
                    title={`Nhấp để thêm [${card.name}] vào bộ bài`}
                  >
                    <Card card={engineCard} size="sm" isPlayable={true} showTooltip={true} />
                  </div>

                  <div className="card-catalog-meta-row">
                    <span className="card-copies-badge">
                      {countInDeck}/4 trong Deck
                    </span>
                    <button
                      className="catalog-add-btn"
                      disabled={isMaxCopies || totalCardsInDeck >= 40}
                      onClick={() => handleAddCard(card)}
                      title="Thêm 1 lá vào Deck"
                    >
                      ➕ Thêm
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right Column: Current Deck Sidebar & Mana Curve */}
        <aside className="current-deck-sidebar">
          <div className="deck-sidebar-header">
            <h2 className="deck-sidebar-title">BỘ BÀI HIỆN TẠI</h2>
            <div className="deck-count-pill">
              <span className="count-num">{totalCardsInDeck}</span>
              <span className="count-denom">/ 40 lá</span>
            </div>
          </div>

          {/* Mana / Cost Curve Chart */}
          <div className="mana-curve-container">
            <span className="curve-title">Đường cong Năng Lượng (Mana Curve)</span>
            <div className="mana-bars-row">
              {Object.entries(costDistribution).map(([cost, count]) => {
                const maxInBars = Math.max(1, ...Object.values(costDistribution))
                const barHeight = (count / maxInBars) * 44 + 4
                return (
                  <div key={cost} className="mana-bar-column">
                    <span className="bar-count-label">{count}</span>
                    <div className="mana-bar-track">
                      <div className="mana-bar-fill" style={{ height: `${barHeight}px` }} />
                    </div>
                    <span className="bar-cost-label">
                      {cost === '5' ? '5+' : `${cost}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Deck Cards Scroll List */}
          <div className="deck-cards-scroll-list">
            {Object.entries(deckMap).length === 0 ? (
              <div className="empty-deck-notice">
                <span>Chưa có lá bài nào trong bộ bài.</span>
                <span>Nhấp vào lá bài bên trái để thêm!</span>
              </div>
            ) : (
              Object.entries(deckMap).map(([id, count]) => {
                const cardData = availableCards.find((c) => c.id === id)
                if (!cardData) return null

                return (
                  <div key={id} className="deck-item-row">
                    <div className="deck-item-cost-bubble">{cardData.cost}</div>
                    <div className="deck-item-info">
                      <span className="deck-item-name">{cardData.name}</span>
                      <span className="deck-item-type">
                        {cardData.type} • {cardData.heroClass}
                      </span>
                    </div>
                    <div className="deck-item-actions">
                      <span className="deck-item-count">x{count}</span>
                      <button
                        className="deck-remove-btn"
                        onClick={() => handleRemoveCard(id)}
                        title="Bỏ 1 lá khỏi Deck"
                      >
                        ➖
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default DeckBuilder
