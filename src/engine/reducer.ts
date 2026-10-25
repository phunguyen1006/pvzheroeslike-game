import type {
  GameState,
  GameAction,
  HeroState,
  LaneState,
  Card,
  Minion,
  Side,
  Phase,
} from './types'
import { resolveCombat, resolveSingleLaneCombat } from './combat'
import { ALL_HEROES, type CardData } from '../data/cards'
import { getStarterDeck, shuffleDeck } from '../data/decks'
import { SUPERPOWERS } from '../data/superpowers'
import {
  triggerWhenPlayed,
  triggerStartOfTurn,
  triggerDinoRoar,
  revealGravestones,
} from './abilities'
import {
  playEnvironment,
  applyEnvironmentOnPlay,
  applyEnvironmentEndOfTurn,
  coordinateTerrainAndLaneBuffs,
} from './environments'
import { executeTrick } from './tricks'
import { executeSuperpower } from './superpowers'

export const DEFAULT_LANES_CONFIG: { index: number; type: 'heights' | 'ground' | 'water'; laneType?: 'ground' | 'water' | 'heights'; name: string }[] = [
  { index: 0, type: 'heights', laneType: 'heights', name: 'Lane 1 (Heights)' },
  { index: 1, type: 'ground', laneType: 'ground', name: 'Lane 2 (Ground)' },
  { index: 2, type: 'ground', laneType: 'ground', name: 'Lane 3 (Ground)' },
  { index: 3, type: 'ground', laneType: 'ground', name: 'Lane 4 (Ground)' },
  { index: 4, type: 'water', laneType: 'water', name: 'Lane 5 (Water)' },
]

export function createInitialHero(side: Side, heroId?: string): HeroState {
  const defaultId = side === 'plants' ? 'hero_green_shadow' : 'hero_super_brainz'
  const heroData = ALL_HEROES.find(h => h.id === (heroId || defaultId)) || ALL_HEROES[0]

  return {
    id: heroData.id,
    side,
    name: heroData.name,
    hp: 20,
    maxHp: 20,
    sun: side === 'plants' ? 1 : 0,
    maxSun: side === 'plants' ? 1 : 0,
    brains: side === 'zombies' ? 1 : 0,
    maxBrains: side === 'zombies' ? 1 : 0,
    blockMeter: 0,
    isShieldActive: false,
    blockCount: 0,
    avatar: heroData.avatar,
    classes: heroData.classes,
    superPower: heroData.superPower,
    superPowerDescription: heroData.superPowerDescription,
  }
}

export function createInitialLanes(): LaneState[] {
  return DEFAULT_LANES_CONFIG.map(cfg => ({
    index: cfg.index,
    type: cfg.type,
    laneType: cfg.laneType || (cfg.type === 'water' ? 'water' : 'ground'),
    name: cfg.name,
    zombieMinion: null,
    plantMinion: null,
    plantTeamUpMinion: null,
    environment: null,
  }))
}

export function convertCardDataToCard(cardData: any, side: Side): Card {
  let mappedType: Card['type'] = 'minion'
  if (cardData.type === 'trick') mappedType = 'trick'
  if (cardData.type === 'environment') mappedType = 'environment'
  if (cardData.type === 'superpower') mappedType = 'superpower'

  return {
    id: cardData.id,
    name: cardData.name,
    side,
    cost: cardData.cost,
    attack: cardData.attack ?? 0,
    health: cardData.hp ?? cardData.health ?? 0,
    type: mappedType,
    image: cardData.image || cardData.assetPath,
    traits: cardData.traits?.map((t: string) => t.toLowerCase() as any) ?? [],
    amphibious: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('amphibious'))),
    bullseye: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('bullseye'))),
    teamUp: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('team-up'))),
    frenzy: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('frenzy'))),
    deadly: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('deadly'))),
    strikethrough: Boolean(cardData.traits?.some((t: string) => t.toLowerCase().includes('strikethrough'))),
    armored: cardData.armored ?? (cardData.traits?.some((t: string) => t.toLowerCase().includes('armored 2')) ? 2 : cardData.traits?.some((t: string) => t.toLowerCase().includes('armored')) ? 1 : undefined),
    antiHero: cardData.antiHero ?? (cardData.traits?.some((t: string) => t.toLowerCase().includes('antihero') || t.toLowerCase().includes('anti-hero')) ? 2 : undefined),
    doubleStrike: Boolean(cardData.doubleStrike || cardData.traits?.some((t: string) => t.toLowerCase().includes('double strike') || t.toLowerCase().includes('doublestrike'))),
    gravestone: Boolean(cardData.gravestone || cardData.traits?.some((t: string) => t.toLowerCase().includes('gravestone'))),
    tribe: cardData.tribe,
    set: cardData.set,
    rarity: cardData.rarity,
    description: cardData.description,
    heroClass: cardData.heroClass,
    laneRequirement: cardData.laneRequirement,
  }
}

export function getHeroSuperpowerCard(heroId: string, side: Side): Card {
  const sp = SUPERPOWERS.find(s => s.heroId === heroId) || SUPERPOWERS[0]
  return {
    id: sp.id,
    name: sp.name,
    side,
    cost: 0,
    attack: 0,
    health: 0,
    type: 'superpower',
    image: sp.assetPath,
    description: sp.description,
  }
}

export function drawCard(deck: Card[], hand: Card[]): { newDeck: Card[]; newHand: Card[]; drawnCard: Card | null } {
  if (deck.length === 0) {
    return { newDeck: deck, newHand: hand, drawnCard: null }
  }

  const [drawnCard, ...remainingDeck] = deck
  // Maximum hand size is 10 cards in PvZ Heroes
  if (hand.length >= 10) {
    return { newDeck: remainingDeck, newHand: hand, drawnCard: null }
  }

  return {
    newDeck: remainingDeck,
    newHand: [...hand, drawnCard],
    drawnCard,
  }
}

export function createInitialGameState(
  plantHeroId?: string,
  zombieHeroId?: string,
  customPlantDeck?: Card[],
  customZombieDeck?: Card[],
  initialLanes?: LaneState[],
  startingSunBonus: number = 0,
  startingBrainsBonus: number = 0,
  modifiers?: string[]
): GameState {
  const plantHero = createInitialHero('plants', plantHeroId)
  const zombieHero = createInitialHero('zombies', zombieHeroId)

  const effectiveSunBonus = startingSunBonus + (modifiers?.includes('sun_surge') ? 2 : 0)

  if (effectiveSunBonus > 0) {
    plantHero.sun += effectiveSunBonus
    plantHero.maxSun += effectiveSunBonus
  }
  if (startingBrainsBonus > 0) {
    zombieHero.brains += startingBrainsBonus
    zombieHero.maxBrains += startingBrainsBonus
  }

  // Load starter decks
  const rawPlantDeck = customPlantDeck || getStarterDeck('plants').map((c: CardData) => convertCardDataToCard(c, 'plants'))
  const rawZombieDeck = customZombieDeck || getStarterDeck('zombies').map((c: CardData) => convertCardDataToCard(c, 'zombies'))

  const shuffledPlant = shuffleDeck(rawPlantDeck)
  const shuffledZombie = shuffleDeck(rawZombieDeck)

  // Starting hand: 4 cards each + 1 starting superpower
  const initialPlantHand = shuffledPlant.slice(0, 4)
  const remainingPlantDeck = shuffledPlant.slice(4)

  const initialZombieHand = shuffledZombie.slice(0, 4)
  const remainingZombieDeck = shuffledZombie.slice(4)

  const plantSP = getHeroSuperpowerCard(plantHero.id, 'plants')
  const zombieSP = getHeroSuperpowerCard(zombieHero.id, 'zombies')

  let processedLanes = initialLanes ? initialLanes.map(l => ({ ...l })) : createInitialLanes()
  if (modifiers && modifiers.length > 0) {
    processedLanes = processedLanes.map(lane => {
      const updatedLane = { ...lane }
      const transformMinion = (m: Minion | null | undefined): Minion | null | undefined => {
        if (!m) return m
        let res = { ...m }
        if (modifiers.includes('zombie_frenzy') && res.side === 'zombies') {
          res.frenzy = true
          if (!res.traits?.includes('frenzy')) {
            res.traits = [...(res.traits || []), 'frenzy']
          }
        }
        if (modifiers.includes('glass_cannon')) {
          res.currentAttack += 3
          res.baseAttack += 3
          res.currentHealth = Math.max(1, res.currentHealth - 2)
          res.maxHealth = Math.max(1, res.maxHealth - 2)
        }
        return res
      }
      if (updatedLane.plantMinion) updatedLane.plantMinion = transformMinion(updatedLane.plantMinion) as Minion
      if (updatedLane.plantTeamUpMinion) updatedLane.plantTeamUpMinion = transformMinion(updatedLane.plantTeamUpMinion) as Minion
      if (updatedLane.zombieMinion) updatedLane.zombieMinion = transformMinion(updatedLane.zombieMinion) as Minion
      return updatedLane
    })
  }

  return {
    turn: 1,
    phase: 'ZOMBIE_PLAY',
    plantHero,
    zombieHero,
    lanes: processedLanes,
    plantDeck: remainingPlantDeck,
    zombieDeck: remainingZombieDeck,
    plantHand: [...initialPlantHand, plantSP],
    zombieHand: [...initialZombieHand, zombieSP],
    plantGraveyard: [],
    zombieGraveyard: [],
    winner: null,
    pendingSuperBlock: null,
    combatEvents: [],
    combatLog: ['Trận đấu bắt đầu! Lượt 1: Zombies xuất chiêu.'],
    modifiers: modifiers || [],
  }
}

export function canPlayCardToLane(
  card: Card,
  lane: LaneState,
  side: Side
): { allowed: boolean; reason?: string } {
  // Minion lane requirements
  const isAmphibious = Boolean(
    card.amphibious ||
    card.laneRequirement === 'water' ||
    card.traits?.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('amphibious'))
  )
  const isWater = lane.laneType === 'water' || lane.type === 'water'
  if (isWater && !isAmphibious) {
    return {
      allowed: false,
      reason: 'Chỉ các lá bài có đặc tính Amphibious mới có thể đặt vào Water Lane.',
    }
  }

  if (side === 'plants') {
    if (lane.plantMinion) {
      if (card.id === 'plant_gatling_pea') {
        const isPea = Boolean(
          lane.plantMinion.tribe?.toLowerCase().includes('pea') ||
          lane.plantMinion.name.toLowerCase().includes('pea') ||
          lane.plantMinion.cardId.toLowerCase().includes('pea')
        )
        if (isPea) {
          return { allowed: true } // Pea Evolution allows evolving on any Pea plant!
        }
      }
      if (card.id === 'plant_cob_cannon') {
        const isCorn = Boolean(
          lane.plantMinion.tribe?.toLowerCase().includes('corn') ||
          lane.plantMinion.name.toLowerCase().includes('corn') ||
          lane.plantMinion.cardId.toLowerCase().includes('corn')
        )
        if (isCorn) {
          return { allowed: true } // Corn Evolution allows evolving on any Corn plant!
        }
      }
      const hasTeamUp = Boolean(
        card.teamUp ||
        card.traits?.includes('teamUp') ||
        card.traits?.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('teamup') || t.toLowerCase().includes('team-up'))) ||
        lane.plantMinion.teamUp ||
        lane.plantMinion.traits?.includes('teamUp') ||
        lane.plantMinion.traits?.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('teamup') || t.toLowerCase().includes('team-up')))
      )
      if (hasTeamUp && !lane.plantTeamUpMinion) {
        return { allowed: true } // Team-Up allows 2 plants on the same lane!
      }
      return {
        allowed: false,
        reason: 'Lane này đã có Plant chiếm chỗ (không có Team-Up hoặc Evolution hợp lệ).',
      }
    }
  }

  if (side === 'zombies' && lane.zombieMinion) {
    if (card.id === 'zombie_intergalactic_warlord') {
      return { allowed: true } // Zombie Evolution allows evolving onto any Zombie!
    }
    return {
      allowed: false,
      reason: 'Lane này đã có Zombie chiếm chỗ.',
    }
  }

  return { allowed: true }
}

export function applyLaneRulesOnPlay(minion: Minion, lane: LaneState): Minion {
  if (lane.type === 'heights') {
    return {
      ...minion,
      currentAttack: minion.currentAttack + 1,
      baseAttack: minion.baseAttack + 1,
      currentHealth: minion.currentHealth + 1,
      maxHealth: minion.maxHealth + 1,
    }
  }
  return minion
}

export function getNextPhase(currentPhase: Phase): { nextPhase: Phase; isNewTurn: boolean } {
  switch (currentPhase) {
    case 'MULLIGAN':
      return { nextPhase: 'ZOMBIE_PLAY', isNewTurn: false }
    case 'ZOMBIE_PLAY':
      return { nextPhase: 'PLANT_PLAY', isNewTurn: false }
    case 'PLANT_PLAY':
      return { nextPhase: 'ZOMBIE_TRICKS', isNewTurn: false }
    case 'ZOMBIE_TRICKS':
      return { nextPhase: 'FIGHT', isNewTurn: false }
    case 'FIGHT':
      return { nextPhase: 'ZOMBIE_PLAY', isNewTurn: true }
    default:
      return { nextPhase: 'ZOMBIE_PLAY', isNewTurn: true }
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.winner && action.type !== 'RESET_GAME' && action.type !== 'START_MATCH') {
    return state
  }

  switch (action.type) {
    case 'START_MATCH': {
      return createInitialGameState(
        action.plantHeroId,
        action.zombieHeroId,
        action.plantDeck,
        action.zombieDeck,
        action.initialLanes,
        action.startingSunBonus ?? 0,
        action.startingBrainsBonus ?? 0,
        action.modifiers
      )
    }

    case 'MULLIGAN_SWAP': {
      const { side, cardIndices } = action
      const hand = side === 'plants' ? [...state.plantHand] : [...state.zombieHand]
      let deck = side === 'plants' ? [...state.plantDeck] : [...state.zombieDeck]

      const swappedCards: Card[] = []
      const remainingHand = hand.filter((c, idx) => {
        if (cardIndices.includes(idx)) {
          swappedCards.push(c)
          return false
        }
        return true
      })

      // Return swapped cards to deck and shuffle
      deck = shuffleDeck([...deck, ...swappedCards])

      // Draw equal number of replacements
      const newDrawn = deck.slice(0, cardIndices.length)
      const newDeck = deck.slice(cardIndices.length)
      const finalHand = [...remainingHand, ...newDrawn]

      return {
        ...state,
        plantHand: side === 'plants' ? finalHand : state.plantHand,
        zombieHand: side === 'zombies' ? finalHand : state.zombieHand,
        plantDeck: side === 'plants' ? newDeck : state.plantDeck,
        zombieDeck: side === 'zombies' ? newDeck : state.zombieDeck,
        combatLog: [`${side === 'plants' ? 'Plant' : 'Zombie'} đổi lại ${cardIndices.length} lá bài (Mulligan).`, ...state.combatLog],
      }
    }

    case 'FINISH_MULLIGAN': {
      return {
        ...state,
        phase: 'ZOMBIE_PLAY',
        combatLog: ['Mulligan hoàn tất! Lượt 1: Zombies bắt đầu xuất trận.', ...state.combatLog],
      }
    }

    case 'PLAY_CARD': {
      const { side, laneIndex } = action
      const cardId = action.cardId || (action as any).card?.id

      // Phase validation
      if (side === 'zombies' && state.phase === 'ZOMBIE_PLAY') {
        const card = state.zombieHand.find(c => c.id === cardId)
        if (card && card.type === 'trick') {
          return {
            ...state,
            combatLog: [`[Cảnh báo] Zombie Tricks chỉ có thể chơi ở phase Zombie Tricks!`, ...state.combatLog],
          }
        }
      }

      if (side === 'zombies' && state.phase === 'ZOMBIE_TRICKS') {
        const card = state.zombieHand.find(c => c.id === cardId)
        if (card && card.type === 'minion') {
          if (!state.teleportActive) {
            return {
              ...state,
              combatLog: [`[Cảnh báo] Không thể đặt Zombie Minion trong phase Tricks (trừ khi dùng Teleport)!`, ...state.combatLog],
            }
          }
        }
      }

      if (side === 'plants' && state.phase !== 'PLANT_PLAY') {
        return state
      }

      const hand = side === 'plants' ? state.plantHand : state.zombieHand
      const card = hand.find(c => c.id === cardId)
      if (!card) return state

      const hero = side === 'plants' ? state.plantHero : state.zombieHero
      const resource = side === 'plants' ? hero.sun : hero.brains

      // Dark Matter Dragonfruit effect: Zombie Tricks cost 6 Brains more
      let extraTrickCost = 0
      if (side === 'zombies' && card.type === 'trick') {
        const hasDMD = state.lanes.some(
          l => l.plantMinion?.cardId === 'plant_dark_matter_dragonfruit' || l.plantTeamUpMinion?.cardId === 'plant_dark_matter_dragonfruit'
        )
        if (hasDMD) extraTrickCost = 6
      }
      const effectiveCost = card.cost + extraTrickCost

      if (resource < effectiveCost) {
        return {
          ...state,
          combatLog: [`Không đủ năng lượng (${effectiveCost} cần thiết${extraTrickCost > 0 ? ' do Dark Matter Dragonfruit tăng +6 Brains' : ''})!`, ...state.combatLog],
        }
      }

      // 1. Trick cards
      if (card.type === 'trick') {
        const trickRes = executeTrick(state, card, side, laneIndex, undefined, action.targetHero)
        return trickRes.updatedState
      }

      // 2. Superpower cards
      if (card.type === 'superpower') {
        const spRes = executeSuperpower(state, card.id, side, laneIndex)
        return {
          ...spRes.updatedState,
          pendingSuperBlock: null,
          combatLog: [spRes.message, ...spRes.updatedState.combatLog],
        }
      }

      const lane = state.lanes[laneIndex]
      if (!lane) return state

      // 3. Environment cards
      if (card.type === 'environment') {
        const updatedHero: HeroState = {
          ...hero,
          sun: side === 'plants' ? hero.sun - card.cost : hero.sun,
          brains: side === 'zombies' ? hero.brains - card.cost : hero.brains,
        }
        const stateWithCost: GameState = {
          ...state,
          plantHero: side === 'plants' ? updatedHero : state.plantHero,
          zombieHero: side === 'zombies' ? updatedHero : state.zombieHero,
          plantHand: side === 'plants' ? hand.filter(c => c.id !== cardId) : state.plantHand,
          zombieHand: side === 'zombies' ? hand.filter(c => c.id !== cardId) : state.zombieHand,
        }
        const envRes = playEnvironment(stateWithCost, card, laneIndex, side)
        return {
          ...envRes.updatedState,
          combatLog: [...envRes.events, ...envRes.updatedState.combatLog],
        }
      }

      // 4. Minion cards
      const validation = canPlayCardToLane(card, lane, side)
      if (!validation.allowed) {
        return {
          ...state,
          combatLog: [`[Lỗi] ${validation.reason}`, ...state.combatLog],
        }
      }

      const isGravestoneTrait = side === 'zombies' && Boolean(card.gravestone || card.traits?.includes('gravestone'))

      let minion: Minion = {
        instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        cardId: card.id,
        name: card.name,
        side,
        currentAttack: card.attack,
        baseAttack: card.attack,
        currentHealth: card.health,
        maxHealth: card.health,
        image: card.image,
        tribe: card.tribe,
        traits: card.traits,
        amphibious: card.amphibious || card.laneRequirement === 'water' || card.traits?.some((t: any) => typeof t === 'string' && t.toLowerCase().includes('amphibious')),
        bullseye: card.bullseye,
        teamUp: card.teamUp || card.traits?.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('teamup') || t.toLowerCase().includes('team-up'))),
        frenzy: card.frenzy,
        deadly: card.deadly,
        strikethrough: card.strikethrough,
        armored: card.armored,
        freeze: card.freeze,
        antiHero: card.antiHero,
        doubleStrike: card.doubleStrike,
        gravestone: isGravestoneTrait || card.gravestone,
        isGravestone: isGravestoneTrait,
      }

      // Apply mission modifiers if active
      if (state.modifiers && state.modifiers.length > 0) {
        if (state.modifiers.includes('zombie_frenzy') && side === 'zombies') {
          minion.frenzy = true
          if (!minion.traits?.includes('frenzy')) {
            minion.traits = [...(minion.traits || []), 'frenzy']
          }
        }
        if (state.modifiers.includes('glass_cannon')) {
          minion.currentAttack += 3
          minion.baseAttack += 3
          minion.currentHealth = Math.max(1, minion.currentHealth - 2)
          minion.maxHealth = Math.max(1, minion.maxHealth - 2)
        }
      }

      let isEvolved = false
      if (side === 'plants' && card.id === 'plant_gatling_pea') {
        const existing = lane.plantMinion
        if (existing && (existing.tribe?.toLowerCase().includes('pea') || existing.name.toLowerCase().includes('pea') || existing.cardId.toLowerCase().includes('pea'))) {
          // Pea Evolution: gets +1/+1
          minion = {
            ...minion,
            currentAttack: minion.currentAttack + 1,
            baseAttack: minion.baseAttack + 1,
            currentHealth: minion.currentHealth + 1,
            maxHealth: minion.maxHealth + 1,
          }
          isEvolved = true
        }
      } else if (side === 'plants' && card.id === 'plant_cob_cannon') {
        const existing = lane.plantMinion
        if (existing && (existing.tribe?.toLowerCase().includes('corn') || existing.name.toLowerCase().includes('corn') || existing.cardId.toLowerCase().includes('corn'))) {
          isEvolved = true
          minion = {
            ...minion,
            isEvolved: true,
          } as any
        }
      } else if (side === 'zombies' && card.id === 'zombie_intergalactic_warlord') {
        if (lane.zombieMinion) {
          isEvolved = true
        }
      }

      // Coordinate terrain and lane buffs (Heights base rule +1/+1 and Lily of the Valley +2/+2)
      const terrainCoord = coordinateTerrainAndLaneBuffs(state, minion, laneIndex, side, { skipEnemyReactions: true })
      minion = terrainCoord.updatedMinion
      state = terrainCoord.updatedState
      const lilyBuffed = terrainCoord.events.some(e => e.includes('Lily of the Valley'))

      const updatedLanes = state.lanes.map((l, idx) => {
        if (idx !== laneIndex) return l
        if (side === 'plants') {
          if (isEvolved) {
            return { ...l, plantMinion: minion }
          }
          const hasTeamUpTrait = Boolean(
            minion.teamUp ||
            minion.traits?.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('teamup') || t.toLowerCase().includes('team-up'))) ||
            l.plantMinion?.teamUp ||
            l.plantMinion?.traits?.some((t: any) => typeof t === 'string' && (t.toLowerCase().includes('teamup') || t.toLowerCase().includes('team-up')))
          )
          if (l.plantMinion && hasTeamUpTrait) {
            return { ...l, plantTeamUpMinion: minion }
          }
          return { ...l, plantMinion: minion }
        } else {
          return { ...l, zombieMinion: minion }
        }
      })

      const updatedHero: HeroState = {
        ...hero,
        sun: side === 'plants' ? hero.sun - card.cost : hero.sun,
        brains: side === 'zombies' ? hero.brains - card.cost : hero.brains,
      }

      const updatedHand = hand.filter(c => c.id !== cardId)

      const isTeleported = side === 'zombies' && state.phase === 'ZOMBIE_TRICKS' && Boolean(state.teleportActive)

      const playLog = minion.isGravestone
        ? `Zombie đặt một Bia Mộ bí ẩn (Gravestone) vào ${lane.name}.`
        : isTeleported
          ? `⚡ Teleport! Zombie dịch chuyển ${minion.name} (${minion.currentAttack}/${minion.currentHealth}) vào ${lane.name} ngay trong phase Tricks!`
          : isEvolved
            ? `${side === 'plants' ? '🌱 Tiến hóa Pea Evolution! ' : '🛸 Tiến hóa Zombie Evolution! '}${minion.name} (${minion.currentAttack}/${minion.currentHealth}) tiến hóa đè lên làn ${lane.name}!`
            : lilyBuffed
              ? `🌸 Lily of the Valley ban phước! Plant đặt ${minion.name} lên Đồi Cao (${lane.name}) nhận thêm +2/+2 (${minion.currentAttack}/${minion.currentHealth})!`
              : `${side === 'plants' ? 'Plant' : 'Zombie'} đặt ${minion.name} (${minion.currentAttack}/${minion.currentHealth}) vào ${lane.name}.`

      let nextState: GameState = {
        ...state,
        lanes: updatedLanes,
        plantHero: side === 'plants' ? updatedHero : state.plantHero,
        zombieHero: side === 'zombies' ? updatedHero : state.zombieHero,
        plantHand: side === 'plants' ? updatedHand : state.plantHand,
        zombieHand: side === 'zombies' ? updatedHand : state.zombieHand,
        teleportActive: isTeleported ? false : state.teleportActive,
        combatLog: [playLog, ...state.combatLog],
      }

      // Trigger environment on play (e.g. Medulla Nebula +2 Brains)
      const envPlayRes = applyEnvironmentOnPlay(nextState, laneIndex, side)
      nextState = envPlayRes.updatedState
      if (envPlayRes.events.length > 0) {
        nextState.combatLog = [...envPlayRes.events, ...nextState.combatLog]
      }

      // Trigger when played abilities (e.g. Bonk Choy, Conga Zombie, Ra Zombie, Zombot 1000, Astro-Shroom, etc.)
      // Note: Gravestone minions do NOT trigger their when-played abilities until revealed at the start of ZOMBIE_TRICKS!
      if (!minion.isGravestone) {
        const abilityRes = triggerWhenPlayed(nextState, minion, laneIndex, side)
        nextState = abilityRes.updatedState
        if (abilityRes.events.length > 0) {
          nextState.combatLog = [...abilityRes.events, ...nextState.combatLog]
        }
      }

      return nextState
    }

    case 'PLAY_SUPERPOWER': {
      const { side, superpowerId, laneIndex } = action
      const spRes = executeSuperpower(state, superpowerId, side, laneIndex)
      return {
        ...spRes.updatedState,
        pendingSuperBlock: null,
        combatLog: [spRes.message, ...spRes.updatedState.combatLog],
      }
    }

    case 'SAVE_SUPERPOWER': {
      const { side } = action
      if (!state.pendingSuperBlock || state.pendingSuperBlock.side !== side) {
        return state
      }
      const sp = state.pendingSuperBlock.superpower
      const hand = side === 'plants' ? [...state.plantHand, sp] : [...state.zombieHand, sp]
      return {
        ...state,
        plantHand: side === 'plants' ? hand : state.plantHand,
        zombieHand: side === 'zombies' ? hand : state.zombieHand,
        pendingSuperBlock: null,
        combatLog: [`${side === 'plants' ? state.plantHero.name : state.zombieHero.name} đã lưu Siêu Năng Lực [${sp.name}] vào tay!`, ...state.combatLog],
      }
    }

    case 'DRAW_CARD': {
      const { side } = action
      const isPlant = side === 'plants'
      const drawRes = drawCard(isPlant ? state.plantDeck : state.zombieDeck, isPlant ? state.plantHand : state.zombieHand)
      let nextState: GameState = {
        ...state,
        plantDeck: isPlant ? drawRes.newDeck : state.plantDeck,
        plantHand: isPlant ? drawRes.newHand : state.plantHand,
        zombieDeck: !isPlant ? drawRes.newDeck : state.zombieDeck,
        zombieHand: !isPlant ? drawRes.newHand : state.zombieHand,
        combatLog: drawRes.drawnCard
          ? [`${isPlant ? 'Plant' : 'Zombie'} rút lá [${drawRes.drawnCard.name}].`, ...state.combatLog]
          : state.combatLog,
      }
      if (drawRes.drawnCard) {
        const dinoRes = triggerDinoRoar(nextState, side)
        nextState = dinoRes.updatedState
        if (dinoRes.events.length > 0) {
          nextState.combatLog = [...dinoRes.events, ...nextState.combatLog]
        }
      }
      return nextState
    }

    case 'NEXT_PHASE': {
      const { nextPhase, isNewTurn } = getNextPhase(state.phase)

      if (isNewTurn) {
        // 1. End of turn environments (Solar Winds spawns Sunflower)
        const endTurnEnvRes = applyEnvironmentEndOfTurn(state)
        let curState = endTurnEnvRes.updatedState

        const nextTurn = curState.turn + 1
        const newMaxSun = Math.min(20, Math.max(curState.plantHero.maxSun + 1, nextTurn))
        const newMaxBrains = Math.min(20, Math.max(curState.zombieHero.maxBrains + 1, nextTurn))

        // 2. Draw cards at start of turn
        const plantDraw = drawCard(curState.plantDeck, curState.plantHand)
        const zombieDraw = drawCard(curState.zombieDeck, curState.zombieHand)

        curState = {
          ...curState,
          turn: nextTurn,
          phase: nextPhase,
          lanes: curState.lanes.map(l => ({
            ...l,
            plantMinion: l.plantMinion ? { ...l.plantMinion, invulnerableThisTurn: false, isInvulnerable: false, damageTakenThisTurn: 0 } : null,
            plantTeamUpMinion: l.plantTeamUpMinion ? { ...l.plantTeamUpMinion, invulnerableThisTurn: false, isInvulnerable: false, damageTakenThisTurn: 0 } : null,
            zombieMinion: l.zombieMinion ? { ...l.zombieMinion, invulnerableThisTurn: false, isInvulnerable: false, damageTakenThisTurn: 0 } : null,
          })),
          plantHero: {
            ...curState.plantHero,
            maxSun: newMaxSun,
            sun: newMaxSun,
            invulnerable: false,
          },
          zombieHero: {
            ...curState.zombieHero,
            maxBrains: newMaxBrains,
            brains: newMaxBrains,
            invulnerable: false,
          },
          plantDeck: plantDraw.newDeck,
          plantHand: plantDraw.newHand,
          zombieDeck: zombieDraw.newDeck,
          zombieHand: zombieDraw.newHand,
          combatLog: [
            `--- LƯỢT ${nextTurn} BẮT ĐẦU --- (Mỗi bên +1 năng lượng, rút 1 lá)`,
            ...endTurnEnvRes.events,
            ...curState.combatLog,
          ],
        }

        // 3. Dino-Roar trigger on card draw (Bananasaurus Rex, Aloesaurus, Raiding Raptor)
        if (plantDraw.drawnCard) {
          const dinoRes = triggerDinoRoar(curState, 'plants')
          curState = dinoRes.updatedState
          if (dinoRes.events.length > 0) {
            curState.combatLog = [...dinoRes.events, ...curState.combatLog]
          }
        }
        if (zombieDraw.drawnCard) {
          const dinoZombieRes = triggerDinoRoar(curState, 'zombies')
          curState = dinoZombieRes.updatedState
          if (dinoZombieRes.events.length > 0) {
            curState.combatLog = [...dinoZombieRes.events, ...curState.combatLog]
          }
        }

        // 4. Start of turn abilities (Sunflower +1 Sun, Doubled Mint x2 stats)
        const startOfTurnRes = triggerStartOfTurn(curState, 'plants')
        curState = startOfTurnRes.updatedState
        if (startOfTurnRes.events.length > 0) {
          curState.combatLog = [...startOfTurnRes.events, ...curState.combatLog]
        }

        return curState
      }

      let phaseTitle = ''
      switch (nextPhase) {
        case 'PLANT_PLAY':
          phaseTitle = 'Đến lượt Plants xuất trận!'
          break
        case 'ZOMBIE_TRICKS':
          phaseTitle = 'Đến lượt Zombie sử dụng Tricks!'
          break
        case 'FIGHT':
          phaseTitle = 'Giai đoạn Giao Tranh (Fight Phase) bắt đầu!'
          break
      }

      // At the start of ZOMBIE_TRICKS phase, crack open all Gravestones and trigger When Revealed abilities
      if (nextPhase === 'ZOMBIE_TRICKS') {
        const { updatedState: revealedState, events: revealEvents } = revealGravestones(state)
        return {
          ...revealedState,
          phase: nextPhase,
          combatEvents: [...revealedState.combatEvents, ...revealEvents],
          combatLog: [phaseTitle, ...revealedState.combatLog],
        }
      }

      return {
        ...state,
        phase: nextPhase,
        teleportActive: nextPhase === 'FIGHT' ? false : state.teleportActive,
        combatLog: [phaseTitle, ...state.combatLog],
      }
    }

    case 'START_COMBAT': {
      const combatOutcome = resolveCombat(state)
      const eventDescriptions = combatOutcome.result.events.map(e => e.description)

      return {
        ...combatOutcome.updatedState,
        combatEvents: combatOutcome.result.events,
        combatLog: [...eventDescriptions, ...state.combatLog],
      }
    }

    case 'STEP_COMBAT_LANE': {
      // Step combat lane for animated sequential combat resolution in UI
      const { laneIndex } = action
      if (laneIndex < 0 || laneIndex >= state.lanes.length) return state
      const { updatedState, events } = resolveSingleLaneCombat(state, laneIndex)
      return {
        ...updatedState,
        combatEvents: [...state.combatEvents, ...events],
        combatLog: [...events.map(e => e.description), ...state.combatLog],
      }
    }

    case 'RESET_GAME': {
      return createInitialGameState()
    }

    default:
      return state
  }
}
