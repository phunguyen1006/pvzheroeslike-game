import { describe, it, expect } from 'vitest'
import {
  getCardById,
} from '../data/cards'
import { ASSET_MANIFEST } from '../data/assetsManifest'
import {
  triggerWhenPlayed,
  triggerDinoRoar,
  triggerWhenTrickPlayed,
} from '../engine/abilities'
import { gameReducer, canPlayCardToLane, createInitialGameState } from '../engine/reducer'
import { resolveCombat } from '../engine/combat'
import type { Card, Minion } from '../engine/types'

function convertCardDataToCard(data: any, side: 'plants' | 'zombies'): Card {
  return {
    id: data.id,
    name: data.name,
    side,
    cost: data.cost,
    attack: data.attack,
    health: data.hp ?? data.health,
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

describe('Round 5 Card Catalog Validation Suite', () => {
  describe('Plant Cards - Round 5 Breakthrough Additions', () => {
    it('validates plant_gatling_pea metadata, traits, and Pea Evolution stats', () => {
      const card = getCardById('plant_gatling_pea')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Gatling Pea')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(5)
      expect(card?.hp).toBe(4)
      expect(card?.doubleStrike).toBe(true)
      expect(card?.traits).toContain('Double Strike')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Pea Plant')
      expect(card?.heroClass).toBe('Mega-Grow')
      expect(card?.description).toContain('Pea Evolution')
    })

    it('validates plant_aloeosaurus metadata, traits, and Dino-Roar healing', () => {
      const card = getCardById('plant_aloeosaurus')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Aloesaurus')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(4)
      expect(card?.hp).toBe(7)
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Dinosaur Plant')
      expect(card?.heroClass).toBe('Solar')
      expect(card?.description).toContain('Dino-Roar')
    })

    it('validates plant_dusk_lobber metadata, traits, and Environment Strikethrough synergy', () => {
      const card = getCardById('plant_dusk_lobber')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Dusk Lobber')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(3)
      expect(card?.hp).toBe(4)
      expect(card?.strikethrough).toBe(true)
      expect(card?.traits).toContain('Strikethrough')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.tribe).toBe('Cactus Plant')
      expect(card?.heroClass).toBe('Guardian')
    })
  })

  describe('Zombie Cards - Round 5 Breakthrough Additions', () => {
    it('validates zombie_trickster metadata and non-gravestone status', () => {
      const card = getCardById('zombie_trickster')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Trickster')
      expect(card?.cost).toBe(10)
      expect(card?.attack).toBe(6)
      expect(card?.hp).toBe(6)
      expect(card?.gravestone).toBe(false)
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Party Moustache Zombie')
      expect(card?.heroClass).toBe('Brainy')
      expect(card?.description).toContain('Bonus Attack')
    })

    it('validates zombie_intergalactic_warlord metadata and Zombie Evolution description', () => {
      const card = getCardById('zombie_intergalactic_warlord')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Intergalactic Warlord')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(3)
      expect(card?.hp).toBe(5)
      expect(card?.gravestone).toBe(false)
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Professional Zombie')
      expect(card?.heroClass).toBe('Hearty')
      expect(card?.description).toContain('Zombie Evolution')
    })

    it('validates zombie_raiding_raptor metadata, Amphibious trait, and Dino-Roar', () => {
      const card = getCardById('zombie_raiding_raptor')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Raiding Raptor')
      expect(card?.cost).toBe(2)
      expect(card?.attack).toBe(2)
      expect(card?.hp).toBe(4)
      expect(card?.amphibious).toBe(true)
      expect(card?.traits).toContain('Amphibious')
      expect(card?.traits).toContain('Dino-Roar')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.tribe).toBe('Pet Dinosaur Zombie')
      expect(card?.heroClass).toBe('Beastly')
      expect(card?.gravestone).toBe(false)
    })
  })

  describe('Asset Manifest Verification', () => {
    it('confirms every Round 5 card has an asset mapping in ASSET_MANIFEST', () => {
      expect(ASSET_MANIFEST.cards.plants['Gatling Pea']).toBeDefined()
      expect(ASSET_MANIFEST.cards.plants['Aloesaurus']).toBeDefined()
      expect(ASSET_MANIFEST.cards.plants['Dusk Lobber']).toBeDefined()
      expect(ASSET_MANIFEST.cards.zombies['Intergalactic Warlord']).toBeDefined()
      expect(ASSET_MANIFEST.cards.zombies['Raiding Raptor']).toBeDefined()
      expect(ASSET_MANIFEST.cards.zombies['Trickster']).toBeDefined()
    })
  })

  describe('Gameplay Engine Mechanics for Round 5 Cards', () => {
    it('executes Gatling Pea Pea Evolution when played on an existing Pea plant', () => {
      const state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      // Lane 1 has a basic Peashooter
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1, {
        cardId: 'plant_peashooter',
        tribe: 'Pea Plant',
      })

      const gatlingCard = convertCardDataToCard(getCardById('plant_gatling_pea')!, 'plants')
      state.plantHand = [gatlingCard]

      // Verify canPlayCardToLane allows Pea Evolution
      const canPlay = canPlayCardToLane(gatlingCard, state.lanes[1], 'plants')
      expect(canPlay.allowed).toBe(true)

      // Play Gatling Pea onto lane 1
      const nextState = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: gatlingCard.id,
        laneIndex: 1,
      })

      // Evolved Gatling Pea gets +1/+1 (Base 5/4 becomes 6/5)
      expect(nextState.lanes[1].plantMinion?.name).toBe('Gatling Pea')
      expect(nextState.lanes[1].plantMinion?.currentAttack).toBe(6)
      expect(nextState.lanes[1].plantMinion?.currentHealth).toBe(5)
      // Bonus Attack hits Zombie Hero directly (open lane)
      expect(nextState.zombieHero.hp).toBe(20 - 6)
      expect(nextState.combatLog.some(log => log.includes('Pea Evolution'))).toBe(true)
    })

    it('triggers Aloesaurus Dino-Roar to heal all Plants and Hero when drawing cards', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 14
      state.plantHero.maxHp = 20

      // Injured plant on lane 0
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1, {
        currentHealth: 1,
        maxHealth: 4,
      })
      // Aloesaurus on lane 2
      state.lanes[2].plantMinion = createMockMinion('p2', 'Aloesaurus', 'plants', 4, 7, {
        cardId: 'plant_aloeosaurus',
      })

      const result = triggerDinoRoar(state, 'plants')

      // Plant Hero healed +2 (14 -> 16)
      expect(result.updatedState.plantHero.hp).toBe(16)
      // Injured plant healed +2 (1 -> 3)
      expect(result.updatedState.lanes[0].plantMinion?.currentHealth).toBe(3)
      expect(result.events.some(e => e.includes('Aloesaurus'))).toBe(true)
    })

    it('triggers Raiding Raptor Dino-Roar to gain +2 Attack when Zombie draws cards', () => {
      const state = createInitialGameState()
      state.lanes[4].zombieMinion = createMockMinion('z4', 'Raiding Raptor', 'zombies', 2, 4, {
        cardId: 'zombie_raiding_raptor',
        amphibious: true,
      })

      const result = triggerDinoRoar(state, 'zombies')

      // Attack increased from 2 to 4
      expect(result.updatedState.lanes[4].zombieMinion?.currentAttack).toBe(4)
      expect(result.events.some(e => e.includes('Raiding Raptor'))).toBe(true)
    })

    it('executes Intergalactic Warlord Zombie Evolution buffing all zombies on field and in hand', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
      state.zombieHand = [
        convertCardDataToCard(getCardById('zombie_buckethead')!, 'zombies'),
      ]

      const warlordMinion = createMockMinion('w1', 'Intergalactic Warlord', 'zombies', 3, 5, {
        cardId: 'zombie_intergalactic_warlord',
      })

      const res = triggerWhenPlayed(state, warlordMinion, 0, 'zombies')

      // Conehead on lane 1 got +1/+1 (2/2 -> 3/3)
      expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
      // Buckethead in hand got +1/+1 (3/4 -> 4/5)
      expect(res.updatedState.zombieHand[0].attack).toBe(4)
      expect(res.updatedState.zombieHand[0].health).toBe(5)
      expect(res.events.some(e => e.includes('Intergalactic Warlord'))).toBe(true)
    })

    it('executes Trickster discount on Trick played and Bonus Attack when played', () => {
      const state = createInitialGameState()
      const tricksterCard = convertCardDataToCard(getCardById('zombie_trickster')!, 'zombies')
      expect(tricksterCard.cost).toBe(10)
      state.zombieHand = [tricksterCard]

      // Play a zombie trick
      const trickCard = convertCardDataToCard(getCardById('zombie_bungee_plumber')!, 'zombies')
      const discountRes = triggerWhenTrickPlayed(state, trickCard, 'zombies')

      // Trickster in hand now costs 9 (10 - 1)
      expect(discountRes.updatedState.zombieHand[0].cost).toBe(9)

      // Now test Trickster when played bonus attack
      const tricksterMinion = createMockMinion('t1', 'Trickster', 'zombies', 6, 6, {
        cardId: 'zombie_trickster',
      })
      const playRes = triggerWhenPlayed(discountRes.updatedState, tricksterMinion, 2, 'zombies')
      expect(playRes.updatedState.plantHero.hp).toBe(20 - 6)
      expect(playRes.events.some(e => e.includes('Bonus Attack'))).toBe(true)
    })

    it('triggers Dusk Lobber 3-lane attack with Strikethrough when in an Environment', () => {
      const state = createInitialGameState()
      // Put an Environment on Lane 2
      state.lanes[2].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: 'Spikeweed Sector',
        image: '/assets/cards/plants/Spikeweed Sector.png',
      }
      // Place Dusk Lobber on Lane 2 (ATK 3, HP 4, Strikethrough)
      state.lanes[2].plantMinion = createMockMinion('dusk', 'Dusk Lobber', 'plants', 3, 4, {
        cardId: 'plant_dusk_lobber',
        strikethrough: true,
      })

      // Put enemy zombies in adjacent lanes (Lane 1 and Lane 3)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 4)
      state.lanes[3].zombieMinion = createMockMinion('z3', 'Buckethead', 'zombies', 3, 5)

      // Resolve combat
      const { updatedState, result } = resolveCombat(state)

      // Conehead on lane 1 took 3 damage (4 - 3 = 1 HP)
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
      // Buckethead on lane 3 took 3 damage (5 - 3 = 2 HP)
      expect(updatedState.lanes[3].zombieMinion?.currentHealth).toBe(2)
      // Zombie Hero on lane 2 was struck directly by Strikethrough (3 damage)
      expect(updatedState.zombieHero.hp).toBe(20 - 3)
      expect(result.events.some((e: any) => e.description.includes('Dusk Lobber'))).toBe(true)
    })
  })
})
