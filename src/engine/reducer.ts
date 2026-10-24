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
} from './environments'
import { executeTrick } from './tricks'
import { executeSuperpower } from './superpowers'

export const DEFAULT_LANES_CONFIG: { index: number; type: 'heights' | 'ground' | 'water'; name: string }[] = [
  { index: 0, type: 'heights', name: 'Lane 1 (Heights)' },
  { index: 1, type: 'ground', name: 'Lane 2 (Ground)' },
  { index: 2, type: 'ground', name: 'Lane 3 (Ground)' },
  { index: 3, type: 'ground', name: 'Lane 4 (Ground)' },
  { index: 4, type: 'water', name: 'Lane 5 (Water)' },
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
  customZombieDeck?: Card[]
): GameState {
  const plantHero = createInitialHero('plants', plantHeroId)
  const zombieHero = createInitialHero('zombies', zombieHeroId)

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

  return {
    turn: 1,
    phase: 'ZOMBIE_PLAY',
    plantHero,
    zombieHero,
    lanes: createInitialLanes(),
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
  if (lane.type === 'water' && !isAmphibious) {
    return {
      allowed: false,
      reason: 'Chỉ các lá bài có đặc tính Amphibious mới có thể đặt vào Water Lane.',
    }
  }

  if (side === 'plants') {
    if (lane.plantMinion) {
      const hasTeamUp = card.teamUp || card.traits?.includes('teamUp') || lane.plantMinion.teamUp || lane.plantMinion.traits?.includes('teamUp')
      if (hasTeamUp && !lane.plantTeamUpMinion) {
        return { allowed: true } // Team-Up allows 2 plants on the same lane!
      }
      return {
        allowed: false,
        reason: 'Lane này đã có Plant chiếm chỗ (không có Team-Up).',
      }
    }
  }

  if (side === 'zombies' && lane.zombieMinion) {
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
      return createInitialGameState(action.plantHeroId, action.zombieHeroId, action.plantDeck, action.zombieDeck)
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
      const { side, cardId, laneIndex } = action

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
          return {
            ...state,
            combatLog: [`[Cảnh báo] Không thể đặt Zombie Minion trong phase Tricks (trừ Teleport)!`, ...state.combatLog],
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
      if (resource < card.cost) {
        return {
          ...state,
          combatLog: [`Không đủ năng lượng (${card.cost} cần thiết)!`, ...state.combatLog],
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
        traits: card.traits,
        amphibious: card.amphibious,
        bullseye: card.bullseye,
        teamUp: card.teamUp,
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

      minion = applyLaneRulesOnPlay(minion, lane)

      const updatedLanes = state.lanes.map((l, idx) => {
        if (idx !== laneIndex) return l
        if (side === 'plants') {
          if (l.plantMinion && (minion.teamUp || l.plantMinion.teamUp)) {
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

      const playLog = minion.isGravestone
        ? `Zombie đặt một Bia Mộ bí ẩn (Gravestone) vào ${lane.name}.`
        : `${side === 'plants' ? 'Plant' : 'Zombie'} đặt ${minion.name} (${minion.currentAttack}/${minion.currentHealth}) vào ${lane.name}.`

      let nextState: GameState = {
        ...state,
        lanes: updatedLanes,
        plantHero: side === 'plants' ? updatedHero : state.plantHero,
        zombieHero: side === 'zombies' ? updatedHero : state.zombieHero,
        plantHand: side === 'plants' ? updatedHand : state.plantHand,
        zombieHand: side === 'zombies' ? updatedHand : state.zombieHand,
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
      if (isPlant && drawRes.drawnCard) {
        const dinoRes = triggerDinoRoar(nextState, 'plants')
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
        const newMaxSun = Math.min(20, nextTurn)
        const newMaxBrains = Math.min(20, nextTurn)

        // 2. Draw cards at start of turn
        const plantDraw = drawCard(curState.plantDeck, curState.plantHand)
        const zombieDraw = drawCard(curState.zombieDeck, curState.zombieHand)

        curState = {
          ...curState,
          turn: nextTurn,
          phase: nextPhase,
          plantHero: {
            ...curState.plantHero,
            maxSun: newMaxSun,
            sun: newMaxSun,
          },
          zombieHero: {
            ...curState.zombieHero,
            maxBrains: newMaxBrains,
            brains: newMaxBrains,
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

        // 3. Dino-Roar trigger for plants on card draw (Bananasaurus Rex)
        if (plantDraw.drawnCard) {
          const dinoRes = triggerDinoRoar(curState, 'plants')
          curState = dinoRes.updatedState
          if (dinoRes.events.length > 0) {
            curState.combatLog = [...dinoRes.events, ...curState.combatLog]
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
