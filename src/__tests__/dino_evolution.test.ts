import { describe, it, expect } from 'vitest'
import {
  triggerDinoRoar,
  triggerWhenTrickPlayed,
} from '../engine/abilities'
import {
  gameReducer,
  createInitialGameState,
  canPlayCardToLane,
} from '../engine/reducer'
import { getCardById } from '../data/cards'
import type { Card, Minion } from '../engine/types'

function convertCardDataToCard(data: any, side: 'plants' | 'zombies'): Card {
  return {
    id: data.id,
    name: data.name,
    side,
    cost: data.cost,
    attack: data.attack ?? 0,
    health: data.hp ?? data.health ?? 0,
    type: data.type === 'plant' || data.type === 'zombie' ? 'minion' : data.type,
    traits: data.traits ?? [],
    amphibious: data.amphibious,
    bullseye: data.bullseye,
    teamUp: data.teamUp,
    frenzy: data.frenzy,
    deadly: data.deadly,
    strikethrough: data.strikethrough,
    armored: data.armored,
    freeze: data.freeze,
    antiHero: data.antiHero,
    doubleStrike: data.doubleStrike,
    gravestone: data.gravestone,
    image: data.image ?? data.assetPath ?? '',
    description: data.description,
  }
}

const createMockMinion = (
  instanceId: string,
  name: string,
  side: 'plants' | 'zombies',
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: `card-${instanceId}`,
  name,
  side,
  currentAttack: attack,
  baseAttack: attack,
  currentHealth: health,
  maxHealth: health,
  image: `/assets/${name}.png`,
  traits: [],
  ...options,
})

describe('Dino-Roar, Evolution, Trickster & Mulligan Dedicated Suite', () => {
  describe('1. Dino-Roar Trigger Mechanics', () => {
    it('triggers Aloesaurus Dino-Roar to heal all Plants and Plant Hero for 2 HP', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 12
      state.plantHero.maxHp = 20

      // Damaged plant on lane 0 (1/4 HP)
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1, {
        currentHealth: 1,
        maxHealth: 4,
      })
      // Damaged team-up plant on lane 0 (2/6 HP)
      state.lanes[0].plantTeamUpMinion = createMockMinion('tu0', 'Wall-Nut', 'plants', 0, 2, {
        currentHealth: 2,
        maxHealth: 6,
        teamUp: true,
      })
      // Aloesaurus placed on lane 2
      state.lanes[2].plantMinion = createMockMinion('aloe', 'Aloesaurus', 'plants', 4, 7, {
        cardId: 'plant_aloeosaurus',
      })

      const { updatedState, events } = triggerDinoRoar(state, 'plants')

      // Plant Hero healed +2 (12 -> 14)
      expect(updatedState.plantHero.hp).toBe(14)
      // Damaged plant healed +2 (1 -> 3)
      expect(updatedState.lanes[0].plantMinion?.currentHealth).toBe(3)
      // Damaged Team-Up plant healed +2 (2 -> 4)
      expect(updatedState.lanes[0].plantTeamUpMinion?.currentHealth).toBe(4)
      expect(events.some(e => e.includes('Aloesaurus'))).toBe(true)
    })

    it('caps Aloesaurus Dino-Roar healing at maximum HP for Hero and Minions', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 19
      state.plantHero.maxHp = 20

      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 3, {
        currentHealth: 3,
        maxHealth: 4,
      })
      state.lanes[2].plantMinion = createMockMinion('aloe', 'Aloesaurus', 'plants', 4, 7, {
        cardId: 'plant_aloeosaurus',
        currentHealth: 7,
        maxHealth: 7,
      })

      const { updatedState } = triggerDinoRoar(state, 'plants')

      // Hero healed to maxHp 20 (not 21)
      expect(updatedState.plantHero.hp).toBe(20)
      // Repeater healed to maxHealth 4 (not 5)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      // Aloesaurus remains at maxHealth 7
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(7)
    })

    it('triggers Raiding Raptor Dino-Roar to increase Attack by +2 upon Zombie card draw', () => {
      const state = createInitialGameState()
      state.lanes[4].zombieMinion = createMockMinion('rr', 'Raiding Raptor', 'zombies', 2, 4, {
        cardId: 'zombie_raiding_raptor',
        amphibious: true,
      })

      // First draw trigger
      const firstDraw = triggerDinoRoar(state, 'zombies')
      expect(firstDraw.updatedState.lanes[4].zombieMinion?.currentAttack).toBe(4)
      expect(firstDraw.events.some(e => e.includes('Raiding Raptor'))).toBe(true)

      // Second draw trigger
      const secondDraw = triggerDinoRoar(firstDraw.updatedState, 'zombies')
      expect(secondDraw.updatedState.lanes[4].zombieMinion?.currentAttack).toBe(6)
    })

    it('triggers Bananasaurus Rex Dino-Roar to increase +1/+1 stats on card draw', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('brex', 'Bananasaurus Rex', 'plants', 3, 3, {
        cardId: 'plant_bananasaurus_rex',
        doubleStrike: true,
      })

      const result = triggerDinoRoar(state, 'plants')
      expect(result.updatedState.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(result.updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      expect(result.events.some(e => e.includes('Bananasaurus Rex'))).toBe(true)
    })

    it('triggers Dino-Roar via DRAW_CARD game action for both Plants and Zombies', () => {
      const state = createInitialGameState()
      // Setup Plant Dino-Roar
      state.lanes[1].plantMinion = createMockMinion('brex', 'Bananasaurus Rex', 'plants', 3, 3, {
        cardId: 'plant_bananasaurus_rex',
      })
      // Setup Zombie Dino-Roar
      state.lanes[4].zombieMinion = createMockMinion('rr', 'Raiding Raptor', 'zombies', 2, 4, {
        cardId: 'zombie_raiding_raptor',
      })

      // Plant draws a card
      const stateAfterPlantDraw = gameReducer(state, { type: 'DRAW_CARD', side: 'plants' })
      expect(stateAfterPlantDraw.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(stateAfterPlantDraw.lanes[1].plantMinion?.currentHealth).toBe(4)

      // Zombie draws a card
      const stateAfterZombieDraw = gameReducer(stateAfterPlantDraw, { type: 'DRAW_CARD', side: 'zombies' })
      expect(stateAfterZombieDraw.lanes[4].zombieMinion?.currentAttack).toBe(4)
    })
  })

  describe('2. Evolution Mechanics (Gatling Pea & Intergalactic Warlord)', () => {
    it('validates Pea Evolution requirement via canPlayCardToLane', () => {
      const state = createInitialGameState()
      const gatlingCard = convertCardDataToCard(getCardById('plant_gatling_pea')!, 'plants')

      // Lane with a Pea plant (Peashooter)
      state.lanes[0].plantMinion = createMockMinion('pea0', 'Peashooter', 'plants', 1, 1, {
        cardId: 'plant_peashooter',
        tribe: 'Pea Plant',
      })
      expect(canPlayCardToLane(gatlingCard, state.lanes[0], 'plants').allowed).toBe(true)

      // Lane with a non-Pea plant (Sunflower) without Team-Up
      state.lanes[1].plantMinion = createMockMinion('sun1', 'Sunflower', 'plants', 0, 1, {
        cardId: 'plant_sunflower',
        tribe: 'Flower Plant',
      })
      expect(canPlayCardToLane(gatlingCard, state.lanes[1], 'plants').allowed).toBe(false)
    })

    it('evolves Gatling Pea on Peashooter granting +1/+1 and executing Bonus Attack to open lane', () => {
      const state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      // Existing Peashooter on lane 1
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1, {
        cardId: 'plant_peashooter',
        tribe: 'Pea Plant',
      })

      const gatlingCard = convertCardDataToCard(getCardById('plant_gatling_pea')!, 'plants')
      state.plantHand = [gatlingCard]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: gatlingCard.id,
        laneIndex: 1,
      })

      // Evolved Gatling Pea stats: base + 1/1
      const evolvedMinion = nextState.lanes[1].plantMinion
      expect(evolvedMinion).toBeDefined()
      expect(evolvedMinion?.name).toBe('Gatling Pea')
      expect(evolvedMinion?.currentAttack).toBe(gatlingCard.attack + 1)
      expect(evolvedMinion?.currentHealth).toBe(gatlingCard.health + 1)

      // Bonus attack struck Zombie Hero directly (open lane)
      expect(nextState.zombieHero.hp).toBe(20 - (gatlingCard.attack + 1))
      expect(nextState.combatLog.some(l => l.includes('Pea Evolution'))).toBe(true)
      expect(nextState.combatLog.some(l => l.includes('Bonus Attack'))).toBe(true)
    })

    it('evolves Gatling Pea on Repeater and destroys enemy Zombie in lane via Bonus Attack', () => {
      const state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      // Repeater on lane 2
      state.lanes[2].plantMinion = createMockMinion('rep', 'Repeater', 'plants', 2, 2, {
        cardId: 'plant_repeater',
        tribe: 'Pea Plant',
      })
      // Enemy Zombie on lane 2 (2 HP)
      state.lanes[2].zombieMinion = createMockMinion('cone', 'Conehead', 'zombies', 2, 2)

      const gatlingCard = convertCardDataToCard(getCardById('plant_gatling_pea')!, 'plants')
      state.plantHand = [gatlingCard]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: gatlingCard.id,
        laneIndex: 2,
      })

      // Gatling Pea deals bonus attack damage to Conehead -> destroyed!
      expect(nextState.lanes[2].zombieMinion).toBeNull()
      expect(nextState.combatLog.some(l => l.includes('tiêu diệt bởi Gatling Pea'))).toBe(true)
    })

    it('executes Intergalactic Warlord Zombie Evolution buffing all zombies on board and hand', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 5

      // Existing Zombie on lane 1 to evolve on
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Basic Zombie', 'zombies', 1, 1)
      // Ally Zombie on lane 3
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Buckethead', 'zombies', 3, 4)

      const warlordCard = convertCardDataToCard(getCardById('zombie_intergalactic_warlord')!, 'zombies')
      const handZombie = convertCardDataToCard(getCardById('zombie_conehead')!, 'zombies')
      state.zombieHand = [warlordCard, handZombie]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: warlordCard.id,
        laneIndex: 1,
      })

      // Warlord placed on lane 1
      expect(nextState.lanes[1].zombieMinion?.name).toBe('Intergalactic Warlord')
      // Ally Zombie on lane 3 buffed +1/+1 (3/4 -> 4/5)
      expect(nextState.lanes[3].zombieMinion?.currentAttack).toBe(4)
      expect(nextState.lanes[3].zombieMinion?.currentHealth).toBe(5)
      // Zombie card in hand buffed +1/+1 (2/2 -> 3/3)
      expect(nextState.zombieHand[0].attack).toBe(3)
      expect(nextState.zombieHand[0].health).toBe(3)
      expect(nextState.combatLog.some(l => l.includes('Zombie Evolution'))).toBe(true)
    })
  })

  describe('3. Trickster Dynamic Discount & Bonus Attack', () => {
    it('progressively discounts Trickster cost from 10 down to 7 as 3 Zombie Tricks are played', () => {
      const state = createInitialGameState()
      const tricksterCard = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      expect(tricksterCard.cost).toBe(10)
      state.zombieHand = [tricksterCard]

      // Trick 1: Bungee Plumber
      const trick1 = convertCardDataToCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      const res1 = triggerWhenTrickPlayed(state, trick1, 'zombies')
      expect(res1.updatedState.zombieHand[0].cost).toBe(9)

      // Trick 2: Lurch for Lunch
      const trick2 = convertCardDataToCard(getCardById('zombie_lurch_for_lunch')!, 'zombies')
      const res2 = triggerWhenTrickPlayed(res1.updatedState, trick2, 'zombies')
      expect(res2.updatedState.zombieHand[0].cost).toBe(8)

      // Trick 3: Teleport
      const trick3 = convertCardDataToCard(getCardById('zombie_teleport')!, 'zombies')
      const res3 = triggerWhenTrickPlayed(res2.updatedState, trick3, 'zombies')
      expect(res3.updatedState.zombieHand[0].cost).toBe(7)
      expect(res3.events.some(e => e.includes('Trickster'))).toBe(true)
    })

    it('does NOT discount Trickster when a Plant plays a trick', () => {
      const state = createInitialGameState()
      const tricksterCard = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      state.zombieHand = [tricksterCard]

      const plantTrick = convertCardDataToCard(getCardById('plant_berry_blast')!, 'plants')
      const res = triggerWhenTrickPlayed(state, plantTrick, 'plants')
      // Cost remains unchanged at 10
      expect(res.updatedState.zombieHand[0].cost).toBe(10)
    })

    it('discounts multiple Tricksters in hand simultaneously', () => {
      const state = createInitialGameState()
      const trickster1 = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      const trickster2 = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      state.zombieHand = [trickster1, trickster2]

      const trick = convertCardDataToCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      const res = triggerWhenTrickPlayed(state, trick, 'zombies')

      expect(res.updatedState.zombieHand[0].cost).toBe(9)
      expect(res.updatedState.zombieHand[1].cost).toBe(9)
    })

    it('executes 6 damage Bonus Attack when Trickster is played to open lane', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 7

      const tricksterCard = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      tricksterCard.cost = 7 // discounted
      state.zombieHand = [tricksterCard]

      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: tricksterCard.id,
        laneIndex: 2,
      })

      // Placed on lane 2
      expect(nextState.lanes[2].zombieMinion?.name).toBe('Trickster')
      // Brains deducted
      expect(nextState.zombieHero.brains).toBe(0)
      // Bonus Attack hits Plant Hero for 6 damage
      expect(nextState.plantHero.hp).toBe(20 - 6)
      expect(nextState.combatLog.some(l => l.includes('Bonus Attack'))).toBe(true)
    })
  })

  describe('4. Mulligan Phase & Card Swap Dynamics', () => {
    it('initializes game with starter hand (4 regular cards + 1 superpower) and remaining deck', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')
      // Hand consists of 4 regular cards + 1 starting superpower
      expect(state.plantHand.length).toBe(5)
      expect(state.zombieHand.length).toBe(5)
      // Deck has 16 remaining cards from 20 starter deck
      expect(state.plantDeck.length).toBe(16)
      expect(state.zombieDeck.length).toBe(16)
    })

    it('swaps 1 card during Mulligan, returns to deck, and draws 1 new replacement', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const originalHand = [...state.plantHand]
      const cardToSwap = originalHand[0]

      const swappedState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [0],
      })

      // Hand size remains strictly preserved (5 cards)
      expect(swappedState.plantHand.length).toBe(5)
      expect(swappedState.plantDeck.length).toBe(16)
      // Deck contains swapped card or new card was drawn
      expect(swappedState.plantDeck.some(c => c.id === cardToSwap.id) || swappedState.plantHand.some(c => c.id === cardToSwap.id)).toBe(true)
      // Combat log notes the mulligan action
      expect(swappedState.combatLog[0]).toContain('Plant đổi lại 1 lá bài (Mulligan)')
    })

    it('swaps multiple cards (indices [1, 3]) during Mulligan, maintaining hand and deck size', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const swappedState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [1, 3],
      })

      expect(swappedState.plantHand.length).toBe(5)
      expect(swappedState.plantDeck.length).toBe(16)
      expect(swappedState.combatLog[0]).toContain('Plant đổi lại 2 lá bài (Mulligan)')
    })

    it('swaps entire 4 regular cards during Mulligan', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const swappedState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'plants',
        cardIndices: [0, 1, 2, 3],
      })

      expect(swappedState.plantHand.length).toBe(5)
      expect(swappedState.plantDeck.length).toBe(16)
      expect(swappedState.combatLog[0]).toContain('Plant đổi lại 4 lá bài (Mulligan)')
    })

    it('swaps cards for Zombie side cleanly during Mulligan', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const swappedState = gameReducer(state, {
        type: 'MULLIGAN_SWAP',
        side: 'zombies',
        cardIndices: [0, 2],
      })

      expect(swappedState.zombieHand.length).toBe(5)
      expect(swappedState.zombieDeck.length).toBe(16)
      expect(swappedState.combatLog[0]).toContain('Zombie đổi lại 2 lá bài (Mulligan)')
    })

    it('transitions phase from MULLIGAN to ZOMBIE_PLAY upon FINISH_MULLIGAN', () => {
      const state = createInitialGameState()
      state.phase = 'MULLIGAN'
      expect(state.phase).toBe('MULLIGAN')

      const readyState = gameReducer(state, {
        type: 'FINISH_MULLIGAN',
        side: 'plants',
      })

      expect(readyState.phase).toBe('ZOMBIE_PLAY')
      expect(readyState.combatLog[0]).toContain('Mulligan hoàn tất! Lượt 1: Zombies bắt đầu xuất trận.')
      // Hands and decks stay intact
      expect(readyState.plantHand.length).toBe(5)
      expect(readyState.zombieHand.length).toBe(5)
    })
  })
})
