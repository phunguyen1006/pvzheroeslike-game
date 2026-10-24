import React, { useState, useMemo, useEffect } from 'react'
import {
  PLANT_CARDS,
  ZOMBIE_CARDS,
  type CardData,
  type Team,
  type Rarity,
} from '../../data/cards'
import { Card } from '../cards/Card'
import { soundManager } from '../../audio/SoundManager'
import { ASSET_MANIFEST } from '../../data/assetsManifest'
import type { Card as EngineCard, SavedDeck } from '../../engine/types'

export interface DeckBuilderProps {
  onSaveDeck: (side: 'plants' | 'zombies', deck: EngineCard[]) => void
  onBack: () => void
  initialSide?: Team
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

const PLANT_TRIBES = [
  'Pea',
  'Flower',
  'Mushroom',
  'Banana',
  'Nut',
  'Bean',
  'Berry',
  'Leafy',
  'Animal',
]

const ZOMBIE_TRIBES = [
  'Science',
  'Sports',
  'Gourmet',
  'Party',
  'Dancing',
  'Professional',
  'Imp',
  'Gargantuar',
  'Pet',
]

const RARITIES: Rarity[] = ['Common', 'Rare', 'Super-Rare', 'Legendary']

export const DECK_STORAGE_KEY = 'pvz_heroes_saved_decks_v1'

export type CostFilter = number | 'all' | '1-2' | '3-4' | '5+'

export interface DeckCodeExportPayload {
  format: 'pvz_heroes_deck_v1'
  name: string
  side: Team
  cardIds: Record<string, number>
  totalCards: number
  exportedAt: string
}

export function exportDeckCode(deckName: string, side: Team, deckMap: Record<string, number>): string {
  const totalCards = Object.values(deckMap).reduce((a, b) => a + b, 0)
  const payload: DeckCodeExportPayload = {
    format: 'pvz_heroes_deck_v1',
    name: deckName.trim() || (side === 'plants' ? 'Chiến Thuật Cây Trồng #1' : 'Đội Quân Thây Ma #1'),
    side,
    cardIds: { ...deckMap },
    totalCards,
    exportedAt: new Date().toISOString(),
  }
  return JSON.stringify(payload, null, 2)
}

export function validateAndParseDeckCode(jsonStr: string): {
  valid: boolean
  error?: string
  deck?: DeckCodeExportPayload
} {
  try {
    const trimmed = jsonStr.trim()
    if (!trimmed) {
      return { valid: false, error: 'Vui lòng dán chuỗi mã bộ bài JSON.' }
    }
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Mã bộ bài không phải là đối tượng JSON hợp lệ.' }
    }
    if (parsed.format !== 'pvz_heroes_deck_v1') {
      return { valid: false, error: 'Định dạng mã bộ bài không tương thích (yêu cầu format: pvz_heroes_deck_v1).' }
    }
    if (parsed.side !== 'plants' && parsed.side !== 'zombies') {
      return { valid: false, error: 'Phe chiến đấu không hợp lệ (phải là plants hoặc zombies).' }
    }
    if (!parsed.cardIds || typeof parsed.cardIds !== 'object') {
      return { valid: false, error: 'Danh sách thẻ bài (cardIds) không hợp lệ.' }
    }
    for (const [cardId, count] of Object.entries(parsed.cardIds)) {
      if (typeof count !== 'number' || count < 1 || count > 4) {
        return { valid: false, error: `Thẻ bài ${cardId} có số lượng không hợp lệ (phải từ 1 đến 4).` }
      }
    }
    const total = Object.values(parsed.cardIds as Record<string, number>).reduce((a: number, b: number) => a + b, 0)
    if (total > 40) {
      return { valid: false, error: `Tổng số thẻ bài (${total}) vượt quá giới hạn tối đa 40 lá.` }
    }
    return { valid: true, deck: parsed }
  } catch (err: any) {
    return { valid: false, error: `Lỗi phân tích JSON: ${err.message}` }
  }
}

// Helper to convert CardData to pure EngineCard
export function toEngineCard(c: CardData): EngineCard {
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
    tribe: c.tribe,
    description: c.description,
    heroClass: c.heroClass,
    amphibious: c.amphibious ?? c.traits.some((t) => t.toLowerCase().includes('amphibious')),
    bullseye: c.bullseye ?? c.traits.some((t) => t.toLowerCase().includes('bullseye')),
    teamUp: c.teamUp ?? c.traits.some((t) => t.toLowerCase().includes('team-up')),
    frenzy: c.frenzy ?? c.traits.some((t) => t.toLowerCase().includes('frenzy')),
    deadly: c.deadly ?? c.traits.some((t) => t.toLowerCase().includes('deadly')),
    strikethrough: c.strikethrough ?? c.traits.some((t) => t.toLowerCase().includes('strikethrough')),
  }
}

// Starter 40-Card Template Decks
const PRESET_PLANT_DECK: Record<string, number> = {
  plant_peashooter: 4,
  plant_sunflower: 4,
  plant_wall_nut: 4,
  plant_bonk_choy: 4,
  plant_snow_pea: 4,
  plant_black_eyed_pea: 4,
  plant_berry_blast: 4,
  plant_repeater: 4,
  plant_spikeweed_sector: 2,
  plant_bananasaurus_rex: 2,
  plant_squash: 2,
  plant_the_great_zucchini: 2,
}

const PRESET_ZOMBIE_DECK: Record<string, number> = {
  zombie_swabbie: 4,
  zombie_arm_wrestler: 4,
  zombie_bungee_plumber: 4,
  zombie_conehead: 4,
  zombie_newspaper_zombie: 4,
  zombie_conga_zombie: 4,
  zombie_lurch_for_lunch: 4,
  zombie_disco_zombie: 4,
  zombie_buckethead: 3,
  zombie_area_22: 2,
  zombie_weed_spray: 2,
  zombie_locust_swarm: 1,
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  onSaveDeck,
  onBack,
  initialSide = 'plants',
}) => {
  const [selectedSide, setSelectedSide] = useState<Team>(initialSide)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCost, setSelectedCost] = useState<CostFilter>('all')
  const [selectedTribe, setSelectedTribe] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [deckName, setDeckName] = useState<string>(
    initialSide === 'plants' ? 'Chiến Thuật Cây Trồng #1' : 'Đội Quân Thây Ma #1'
  )

  // Selected deck: Map of cardId -> count (max 4 per card)
  const [deckMap, setDeckMap] = useState<Record<string, number>>(() => {
    return initialSide === 'plants' ? { ...PRESET_PLANT_DECK } : { ...PRESET_ZOMBIE_DECK }
  })

  // Saved decks in localStorage
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [selectedSavedDeckId, setSelectedSavedDeckId] = useState<string>('')
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null)

  // Export / Import Deck Code State
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false)
  const [shareMode, setShareMode] = useState<'export' | 'import'>('export')
  const [shareCodeString, setShareCodeString] = useState<string>('')
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState<boolean>(false)

  // Load saved decks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DECK_STORAGE_KEY)
      if (stored) {
        const parsed: SavedDeck[] = JSON.parse(stored)
        setSavedDecks(parsed)
      }
    } catch (err) {
      console.error('Error loading saved decks from localStorage', err)
    }
  }, [])

  const availableCards = selectedSide === 'plants' ? PLANT_CARDS : ZOMBIE_CARDS
  const currentTribes = selectedSide === 'plants' ? PLANT_TRIBES : ZOMBIE_TRIBES
  const plantClasses = ['Guardian', 'Kabloom', 'Mega-Grow', 'Smarty', 'Solar']
  const zombieClasses = ['Beastly', 'Brainy', 'Crazy', 'Hearty', 'Sneaky']
  const currentClasses = selectedSide === 'plants' ? plantClasses : zombieClasses

  // Filtered catalog cards based on search, cost, tribe, rarity, class, type
  const filteredCards = useMemo(() => {
    return availableCards.filter((card) => {
      // Search query (case & accent insensitive)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase()
        const nameMatch = card.name.toLowerCase().includes(query)
        const descMatch = (card.description || '').toLowerCase().includes(query)
        const tribeMatch = (card.tribe || '').toLowerCase().includes(query)
        if (!nameMatch && !descMatch && !tribeMatch) return false
      }

      // Cost filter (supports ranges '1-2', '3-4', '5+' or specific cost number 0..8+)
      if (selectedCost !== 'all') {
        if (selectedCost === '1-2') {
          if (card.cost < 1 || card.cost > 2) return false
        } else if (selectedCost === '3-4') {
          if (card.cost < 3 || card.cost > 4) return false
        } else if (selectedCost === '5+') {
          if (card.cost < 5) return false
        } else if (typeof selectedCost === 'number') {
          if (selectedCost === 8) {
            if (card.cost < 8) return false
          } else if (card.cost !== selectedCost) {
            return false
          }
        }
      }

      // Tribe filter
      if (selectedTribe !== 'all') {
        if (!card.tribe || !card.tribe.toLowerCase().includes(selectedTribe.toLowerCase())) {
          return false
        }
      }

      // Rarity filter
      if (selectedRarity !== 'all') {
        if (card.rarity !== selectedRarity) return false
      }

      // Class filter
      if (selectedClass !== 'all' && card.heroClass !== selectedClass) {
        return false
      }

      // Type filter (minion vs trick vs environment)
      if (selectedType !== 'all') {
        if (selectedType === 'minion' && (card.type === 'trick' || card.type === 'environment' || card.type === 'superpower')) {
          return false
        }
        if (selectedType === 'trick' && card.type !== 'trick') return false
        if (selectedType === 'environment' && card.type !== 'environment') return false
      }

      return true
    })
  }, [
    availableCards,
    searchQuery,
    selectedCost,
    selectedTribe,
    selectedRarity,
    selectedClass,
    selectedType,
  ])

  // Total cards in deck
  const totalCardsInDeck = useMemo(() => {
    return Object.values(deckMap).reduce((sum, count) => sum + count, 0)
  }, [deckMap])

  // Deck composition counts
  const deckComposition = useMemo(() => {
    let minions = 0
    let tricks = 0
    let environments = 0

    Object.entries(deckMap).forEach(([id, count]) => {
      const card = availableCards.find((c) => c.id === id)
      if (!card) return
      if (card.type === 'trick') tricks += count
      else if (card.type === 'environment') environments += count
      else minions += count
    })

    return { minions, tricks, environments }
  }, [deckMap, availableCards])

  // Calculate mana / cost curve (0, 1, 2, 3, 4, 5, 6, 7, 8+)
  const costCurve = useMemo(() => {
    const distribution: Record<number, number> = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
    }

    Object.entries(deckMap).forEach(([id, count]) => {
      const card = availableCards.find((c) => c.id === id)
      if (card) {
        const bucket = Math.min(8, Math.max(0, card.cost))
        distribution[bucket] = (distribution[bucket] || 0) + count
      }
    })

    const maxCount = Math.max(1, ...Object.values(distribution))

    return { distribution, maxCount }
  }, [deckMap, availableCards])

  // Switch faction
  const handleSwitchSide = (side: Team) => {
    setSelectedSide(side)
    setSelectedClass('all')
    setSelectedType('all')
    setSelectedCost('all')
    setSelectedTribe('all')
    setSelectedRarity('all')
    setSearchQuery('')
    setDeckName(side === 'plants' ? 'Chiến Thuật Cây Trồng #1' : 'Đội Quân Thây Ma #1')
    setDeckMap(side === 'plants' ? { ...PRESET_PLANT_DECK } : { ...PRESET_ZOMBIE_DECK })
    soundManager.playCardDrop()
  }

  // Add a card to deck (Max 4 copies per card, Max 40 cards total)
  const handleAddCard = (card: CardData) => {
    const currentCount = deckMap[card.id] || 0
    if (currentCount >= 4) {
      return // Maximum 4 copies per PvZ Heroes rules
    }
    if (totalCardsInDeck >= 40) {
      return // Maximum 40 cards in deck
    }

    setDeckMap((prev) => ({
      ...prev,
      [card.id]: currentCount + 1,
    }))
    soundManager.playCardDrop()
  }

  // Remove a card from deck
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

  // Clear deck
  const handleClearDeck = () => {
    setDeckMap({})
    soundManager.playCardDrop()
  }

  // Load preset deck
  const handleLoadPreset = () => {
    setDeckMap(selectedSide === 'plants' ? { ...PRESET_PLANT_DECK } : { ...PRESET_ZOMBIE_DECK })
    soundManager.playBuff()
  }

  // Save current deck to localStorage
  const handleSaveToLocalStorage = () => {
    if (totalCardsInDeck === 0) return

    const newDeckRecord: SavedDeck = {
      id: `deck_${Date.now()}`,
      name: deckName.trim() || (selectedSide === 'plants' ? 'Bộ Bài Cây Trồng' : 'Bộ Bài Thây Ma'),
      side: selectedSide,
      cardIds: { ...deckMap },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const updated = [newDeckRecord, ...savedDecks.filter((d) => d.id !== newDeckRecord.id)]
    setSavedDecks(updated)
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updated))
      setSaveStatusMessage('Đã lưu vào kho bộ bài!')
      setTimeout(() => setSaveStatusMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save deck to localStorage', err)
    }
    soundManager.playBuff()
  }

  // Load a deck from saved decks
  const handleSelectSavedDeck = (deckId: string) => {
    setSelectedSavedDeckId(deckId)
    const target = savedDecks.find((d) => d.id === deckId)
    if (!target) return

    if (target.side !== selectedSide) {
      setSelectedSide(target.side)
    }
    setDeckName(target.name)
    setDeckMap({ ...target.cardIds })
    soundManager.playBuff()
  }

  // Delete a saved deck
  const handleDeleteSavedDeck = (deckId: string) => {
    const updated = savedDecks.filter((d) => d.id !== deckId)
    setSavedDecks(updated)
    if (selectedSavedDeckId === deckId) {
      setSelectedSavedDeckId('')
    }
    try {
      localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to delete saved deck', err)
    }
  }

  // Open Export Modal
  const handleOpenExportModal = () => {
    const jsonStr = exportDeckCode(deckName, selectedSide, deckMap)
    setShareCodeString(jsonStr)
    setShareMode('export')
    setShareCopied(false)
    setShareError(null)
    setShareModalOpen(true)
    soundManager.playCardDrop()
  }

  // Copy Export Code to Clipboard
  const handleCopyExportCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareCodeString)
        setShareCopied(true)
        soundManager.playBuff()
        setTimeout(() => setShareCopied(false), 3000)
      } else {
        // Fallback for environments without clipboard API
        setShareCopied(true)
      }
    } catch (err) {
      console.warn('Clipboard write failed, user can copy manually', err)
      setShareCopied(true)
    }
  }

  // Open Import Modal
  const handleOpenImportModal = () => {
    setShareCodeString('')
    setShareMode('import')
    setShareCopied(false)
    setShareError(null)
    setShareModalOpen(true)
    soundManager.playCardDrop()
  }

  // Execute Import Deck Code
  const handleExecuteImportCode = () => {
    const result = validateAndParseDeckCode(shareCodeString)
    if (!result.valid || !result.deck) {
      setShareError(result.error || 'Mã bộ bài không hợp lệ.')
      soundManager.playCardDrop()
      return
    }

    const imported = result.deck

    // If deck faction differs from current side, switch automatically
    if (imported.side !== selectedSide) {
      setSelectedSide(imported.side)
      setSelectedClass('all')
      setSelectedType('all')
      setSelectedCost('all')
      setSelectedTribe('all')
      setSelectedRarity('all')
    }

    setDeckName(imported.name || (imported.side === 'plants' ? 'Chiến Thuật Cây Trồng' : 'Đội Quân Thây Ma'))
    setDeckMap({ ...imported.cardIds })
    setShareModalOpen(false)
    soundManager.playBuff()

    setSaveStatusMessage(`Đã nhập thành công bộ bài "${imported.name}" (${imported.totalCards || Object.values(imported.cardIds).reduce((a, b) => a + b, 0)} lá)!`)
    setTimeout(() => setSaveStatusMessage(null), 3500)
  }

  // Confirm and start battle with this deck
  const handleConfirmSaveAndPlay = () => {
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

    // Also persist active deck for future sessions
    try {
      const activeKey = selectedSide === 'plants' ? 'pvz_active_plant_deck' : 'pvz_active_zombie_deck'
      localStorage.setItem(activeKey, JSON.stringify(deckMap))
    } catch (err) {
      console.error('Failed to save active deck', err)
    }

    onSaveDeck(selectedSide === 'plants' ? 'plants' : 'zombies', expandedDeck)
  }

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
            Tạo chiến thuật chuẩn 40 lá PvZ Heroes • Tối đa 4 bản sao mỗi lá bài
          </span>
        </div>

        <div className="deckbuilder-header-actions">
          <button
            className="save-deck-btn"
            disabled={totalCardsInDeck < 10}
            onClick={handleConfirmSaveAndPlay}
            title={totalCardsInDeck < 10 ? 'Cần tối thiểu 10 lá để sử dụng' : 'Lưu và vào trận'}
          >
            ⚔️ VÀO TRẬN ({totalCardsInDeck}/40 LÁ)
          </button>
        </div>
      </header>

      {/* Main Grid: Card Catalog (Left/Center) + Deck Composition Panel (Right) */}
      <main className="deckbuilder-main-grid">
        {/* Left Column: Filter Controls & Card Catalog */}
        <section className="catalog-panel">
          {/* Faction & Search Bar */}
          <div className="catalog-filters-bar">
            <div className="filters-top-row">
              {/* Faction Switch */}
              <div className="faction-switch-toggle">
                <button
                  className={`faction-toggle-btn plant-btn ${selectedSide === 'plants' ? 'active-toggle' : ''}`}
                  onClick={() => handleSwitchSide('plants')}
                >
                  🌱 PLANTS ({PLANT_CARDS.length})
                </button>
                <button
                  className={`faction-toggle-btn zombie-btn ${selectedSide === 'zombies' ? 'active-toggle' : ''}`}
                  onClick={() => handleSwitchSide('zombies')}
                >
                  🧟 ZOMBIES ({ZOMBIE_CARDS.length})
                </button>
              </div>

              {/* Search input */}
              <div className="catalog-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm theo tên thẻ bài, đặc tính, hệ tộc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="catalog-search-input"
                />
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter Rows: Cost, Tribe, Rarity, Class, Type */}
            <div className="filters-controls-strip">
              {/* Cost Filter (Ranges: '1-2', '3-4', '5+' & Exact 0..8+) */}
              <div className="filter-group cost-filter-group">
                <span className="filter-group-label">Chi phí (Cost):</span>
                <div className="cost-bubbles-row">
                  <button
                    className={`cost-filter-btn ${selectedCost === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCost('all')}
                  >
                    Tất cả
                  </button>
                  <button
                    className={`cost-filter-btn cost-range-pill ${selectedCost === '1-2' ? 'active' : ''}`}
                    onClick={() => setSelectedCost('1-2')}
                    title="Các thẻ bài tiêu tốn 1 đến 2 Sun/Brains"
                  >
                    1-2
                  </button>
                  <button
                    className={`cost-filter-btn cost-range-pill ${selectedCost === '3-4' ? 'active' : ''}`}
                    onClick={() => setSelectedCost('3-4')}
                    title="Các thẻ bài tiêu tốn 3 đến 4 Sun/Brains"
                  >
                    3-4
                  </button>
                  <button
                    className={`cost-filter-btn cost-range-pill ${selectedCost === '5+' ? 'active' : ''}`}
                    onClick={() => setSelectedCost('5+')}
                    title="Các thẻ bài tiêu tốn từ 5 Sun/Brains trở lên"
                  >
                    5+
                  </button>
                  <span className="cost-separator">|</span>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                    <button
                      key={c}
                      className={`cost-filter-btn cost-orb ${selectedCost === c ? 'active' : ''}`}
                      onClick={() => setSelectedCost(c)}
                    >
                      {c === 8 ? '8+' : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rarity Filter */}
              <div className="filter-group rarity-filter-group">
                <span className="filter-group-label">Độ hiếm (Rarity):</span>
                <div className="filter-chips-row">
                  <button
                    className={`filter-chip ${selectedRarity === 'all' ? 'active-chip' : ''}`}
                    onClick={() => setSelectedRarity('all')}
                  >
                    Tất cả
                  </button>
                  {RARITIES.map((r) => (
                    <button
                      key={r}
                      className={`filter-chip rarity-chip-${r.toLowerCase()} ${selectedRarity === r ? 'active-chip' : ''}`}
                      onClick={() => setSelectedRarity(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tribe Filter */}
              <div className="filter-group tribe-filter-group">
                <span className="filter-group-label">Hệ tộc (Tribe):</span>
                <div className="filter-chips-row scrollable-chips">
                  <button
                    className={`filter-chip ${selectedTribe === 'all' ? 'active-chip' : ''}`}
                    onClick={() => setSelectedTribe('all')}
                  >
                    Tất cả
                  </button>
                  {currentTribes.map((tribe) => (
                    <button
                      key={tribe}
                      className={`filter-chip ${selectedTribe === tribe ? 'active-chip' : ''}`}
                      onClick={() => setSelectedTribe(tribe)}
                    >
                      {tribe}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class & Type Filter */}
              <div className="filter-group class-type-row">
                <div className="filter-subgroup">
                  <span className="filter-group-label">Class:</span>
                  <div className="filter-chips-row">
                    <button
                      className={`filter-chip ${selectedClass === 'all' ? 'active-chip' : ''}`}
                      onClick={() => setSelectedClass('all')}
                    >
                      Tất cả
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
                </div>

                <div className="filter-subgroup">
                  <span className="filter-group-label">Loại thẻ:</span>
                  <div className="filter-chips-row">
                    <button
                      className={`filter-chip ${selectedType === 'all' ? 'active-chip' : ''}`}
                      onClick={() => setSelectedType('all')}
                    >
                      Tất cả
                    </button>
                    <button
                      className={`filter-chip ${selectedType === 'minion' ? 'active-chip' : ''}`}
                      onClick={() => setSelectedType('minion')}
                    >
                      Quân cờ (Minion)
                    </button>
                    <button
                      className={`filter-chip ${selectedType === 'trick' ? 'active-chip' : ''}`}
                      onClick={() => setSelectedType('trick')}
                    >
                      Phép (Trick)
                    </button>
                    <button
                      className={`filter-chip ${selectedType === 'environment' ? 'active-chip' : ''}`}
                      onClick={() => setSelectedType('environment')}
                    >
                      Môi trường
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Catalog Grid */}
          <div className="catalog-cards-container">
            {filteredCards.length === 0 ? (
              <div className="no-cards-found">
                <div className="no-cards-emoji">🔍</div>
                <h3>Không tìm thấy lá bài phù hợp</h3>
                <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.</p>
                <button
                  className="reset-filters-btn"
                  onClick={() => {
                    setSelectedClass('all')
                    setSelectedType('all')
                    setSelectedCost('all')
                    setSelectedTribe('all')
                    setSelectedRarity('all')
                    setSearchQuery('')
                  }}
                >
                  Đặt lại toàn bộ lọc
                </button>
              </div>
            ) : (
              <div className="catalog-cards-grid">
                {filteredCards.map((cardData) => {
                  const engineCard = toEngineCard(cardData)
                  const countInDeck = deckMap[cardData.id] || 0
                  const isMaxCopies = countInDeck >= 4
                  const isDeckFull = totalCardsInDeck >= 40

                  return (
                    <div
                      key={cardData.id}
                      className={`catalog-card-item-wrapper ${isMaxCopies ? 'max-copies-reached' : ''}`}
                    >
                      <div className="catalog-card-visual" onClick={() => handleAddCard(cardData)}>
                        <Card card={engineCard} size="md" interactive={true} />
                        {countInDeck > 0 && (
                          <div className="in-deck-badge">
                            {countInDeck}/4
                          </div>
                        )}
                        {cardData.rarity && (
                          <div className={`rarity-tag rarity-${cardData.rarity.toLowerCase()}`}>
                            {cardData.rarity}
                          </div>
                        )}
                      </div>

                      <div className="catalog-card-action-bar">
                        <button
                          className="catalog-add-btn"
                          disabled={isMaxCopies || isDeckFull}
                          onClick={() => handleAddCard(cardData)}
                          title={
                            isMaxCopies
                              ? 'Đã đạt tối đa 4 bản sao'
                              : isDeckFull
                                ? 'Bộ bài đã đủ 40 lá'
                                : 'Thêm vào bộ bài'
                          }
                        >
                          {isMaxCopies ? 'ĐÃ ĐỦ (4/4)' : `+ THÊM (${countInDeck}/4)`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Deck Statistics & Current Deck List */}
        <aside className="current-deck-sidebar">
          {/* Deck Title & Quick Action Bar */}
          <div className="deck-sidebar-header">
            <div className="deck-name-edit-box">
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Đặt tên bộ bài..."
                className="deck-name-input"
              />
            </div>
            <div className="deck-count-pill">
              <span className={`count-num ${totalCardsInDeck === 40 ? 'is-complete' : ''}`}>
                {totalCardsInDeck}
              </span>
              <span className="count-denom">/40</span>
            </div>
          </div>

          {/* Deck Composition Overview */}
          <div className="deck-composition-bar">
            <div className="comp-item" title="Số quân cờ (Minions)">
              <span className="comp-icon">🌱</span>
              <span className="comp-val">{deckComposition.minions}</span>
            </div>
            <div className="comp-item" title="Số phép thuật (Tricks)">
              <span className="comp-icon">✨</span>
              <span className="comp-val">{deckComposition.tricks}</span>
            </div>
            <div className="comp-item" title="Số môi trường (Environments)">
              <span className="comp-icon">🏞️</span>
              <span className="comp-val">{deckComposition.environments}</span>
            </div>
            <div className="comp-status-tag">
              {totalCardsInDeck === 40
                ? '✅ Hoàn chỉnh'
                : totalCardsInDeck < 40
                  ? `Còn thiếu ${40 - totalCardsInDeck} lá`
                  : 'Vượt quá 40 lá'}
            </div>
          </div>

          {/* Visual Mana Curve / Cost Curve Chart */}
          <div className="mana-curve-container">
            <div className="curve-header">
              <span className="curve-title">Đồ thị Phân Bổ Năng Lượng (Mana Curve)</span>
            </div>
            <div className="mana-bars-row">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cost) => {
                const count = costCurve.distribution[cost] || 0
                const fillPercent = (count / costCurve.maxCount) * 100

                return (
                  <div key={cost} className="mana-bar-column">
                    <span className="bar-count-label">{count > 0 ? count : ''}</span>
                    <div className="mana-bar-track">
                      <div
                        className="mana-bar-fill"
                        style={{ height: `${Math.max(count > 0 ? 15 : 0, fillPercent)}%` }}
                        title={`Cost ${cost === 8 ? '8+' : cost}: ${count} lá bài`}
                      />
                    </div>
                    <span className="bar-cost-label">{cost === 8 ? '8+' : cost}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* LocalStorage Management Toolbar */}
          <div className="deck-storage-toolbar">
            <button
              className="storage-btn save-storage-btn"
              onClick={handleSaveToLocalStorage}
              title="Lưu bộ bài này vào trình duyệt"
            >
              💾 Lưu
            </button>
            <button
              className="storage-btn export-code-btn"
              onClick={handleOpenExportModal}
              title="Xuất mã bộ bài dạng JSON để chia sẻ"
            >
              📤 Xuất Mã
            </button>
            <button
              className="storage-btn import-code-btn"
              onClick={handleOpenImportModal}
              title="Nhập mã bộ bài từ chuỗi JSON"
            >
              📥 Nhập Mã
            </button>
            <button
              className="storage-btn load-preset-btn"
              onClick={handleLoadPreset}
              title="Khôi phục bộ bài mẫu chuẩn 40 lá"
            >
              🔄 Mẫu Chuẩn
            </button>
            <button
              className="storage-btn clear-deck-btn"
              onClick={handleClearDeck}
              title="Xóa toàn bộ bài để tạo mới"
            >
              🗑️ Xóa
            </button>
          </div>

          {saveStatusMessage && (
            <div className="save-status-toast">
              {saveStatusMessage}
            </div>
          )}

          {/* Saved Decks Dropdown/Selector if any exist */}
          {savedDecks.filter((d) => d.side === selectedSide).length > 0 && (
            <div className="saved-decks-selector-box">
              <label className="saved-decks-label">Bộ bài đã lưu:</label>
              <select
                className="saved-decks-dropdown"
                value={selectedSavedDeckId}
                onChange={(e) => handleSelectSavedDeck(e.target.value)}
              >
                <option value="">-- Chọn bộ bài đã lưu --</option>
                {savedDecks
                  .filter((d) => d.side === selectedSide)
                  .map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name} ({Object.values(deck.cardIds).reduce((a, b) => a + b, 0)} lá)
                    </option>
                  ))}
              </select>
              {selectedSavedDeckId && (
                <button
                  className="delete-saved-deck-btn"
                  onClick={() => handleDeleteSavedDeck(selectedSavedDeckId)}
                  title="Xóa bộ bài đã lưu này"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Deck Cards Scroll List */}
          <div className="deck-cards-scroll-list">
            {Object.keys(deckMap).length === 0 ? (
              <div className="empty-deck-notice">
                <span className="empty-icon">📭</span>
                <span>Bộ bài hiện đang trống</span>
                <span className="empty-subtext">Nhấp vào thẻ bài bên trái để thêm vào bộ</span>
              </div>
            ) : (
              Object.entries(deckMap)
                .sort(([idA], [idB]) => {
                  const cardA = availableCards.find((c) => c.id === idA)
                  const cardB = availableCards.find((c) => c.id === idB)
                  return (cardA?.cost ?? 0) - (cardB?.cost ?? 0)
                })
                .map(([cardId, count]) => {
                  const cardData = availableCards.find((c) => c.id === cardId)
                  if (!cardData) return null

                  return (
                    <div key={cardId} className="deck-item-row">
                      <div className="deck-item-cost-bubble">{cardData.cost}</div>
                      <div className="deck-item-info">
                        <span className="deck-item-name">{cardData.name}</span>
                        <span className="deck-item-type">
                          {cardData.tribe || cardData.type}
                        </span>
                      </div>
                      <div className="deck-item-actions">
                        <span className="deck-item-count">×{count}</span>
                        <button
                          className="deck-remove-btn"
                          onClick={() => handleRemoveCard(cardId)}
                          title="Bớt 1 bản sao"
                        >
                          −
                        </button>
                        <button
                          className="deck-add-btn"
                          disabled={count >= 4 || totalCardsInDeck >= 40}
                          onClick={() => handleAddCard(cardData)}
                          title="Thêm 1 bản sao"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </aside>
      </main>

      {/* Export / Import Deck Code Modal */}
      {shareModalOpen && (
        <div className="deck-share-modal-backdrop" onClick={() => setShareModalOpen(false)}>
          <div className="deck-share-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3 className="share-modal-title">
                {shareMode === 'export' ? '📤 XUẤT MÃ BỘ BÀI (EXPORT DECK)' : '📥 NHẬP MÃ BỘ BÀI (IMPORT DECK)'}
              </h3>
              <button className="share-modal-close-btn" onClick={() => setShareModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className="share-modal-body">
              {shareMode === 'export' ? (
                <>
                  <p className="share-modal-desc">
                    Sao chép mã chuỗi JSON bên dưới để chia sẻ hoặc lưu trữ bộ bài của bạn:
                  </p>
                  <textarea
                    className="share-modal-textarea"
                    readOnly
                    value={shareCodeString}
                    rows={10}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  {shareCopied && (
                    <div className="share-modal-success-badge">
                      ✓ Đã sao chép mã bộ bài vào Clipboard!
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="share-modal-desc">
                    Dán mã chuỗi JSON bộ bài vào ô bên dưới để nhập danh sách thẻ bài:
                  </p>
                  <textarea
                    className="share-modal-textarea"
                    placeholder='Dán chuỗi JSON định dạng {"format": "pvz_heroes_deck_v1", ...} vào đây...'
                    value={shareCodeString}
                    onChange={(e) => {
                      setShareCodeString(e.target.value)
                      setShareError(null)
                    }}
                    rows={10}
                  />
                  {shareError && (
                    <div className="share-modal-error-badge">
                      ⚠️ {shareError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="share-modal-footer">
              {shareMode === 'export' ? (
                <>
                  <button className="share-cancel-btn" onClick={() => setShareModalOpen(false)}>
                    Đóng
                  </button>
                  <button className="share-action-btn" onClick={handleCopyExportCode}>
                    📋 Sao Chép (Copy)
                  </button>
                </>
              ) : (
                <>
                  <button className="share-cancel-btn" onClick={() => setShareModalOpen(false)}>
                    Hủy
                  </button>
                  <button className="share-action-btn" onClick={handleExecuteImportCode}>
                    ✅ Xác Nhận Nhập
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeckBuilder
