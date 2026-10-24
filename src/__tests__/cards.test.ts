import { describe, it, expect } from 'vitest'
import {
  getCardById,
} from '../data/cards'
import { ASSET_MANIFEST } from '../data/assetsManifest'
import {
  triggerWhenPlayed,
  triggerDinoRoar,
  triggerWhenTrickPlayed,
  triggerWhenDestroyed,
  triggerStartOfTurn,
  triggerWhenSciencePlayed,
} from '../engine/abilities'
import { gameReducer, canPlayCardToLane, createInitialGameState } from '../engine/reducer'
import { resolveCombat } from '../engine/combat'
import { executeTrick } from '../engine/tricks'
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

  describe('Round 6 Synergy Suite (Pineclone, Con Man, Going Viral, Galacta-Cactus, Lily of the Valley, Dr. Spacetime)', () => {
    describe('Plant Cards - Round 6 Synergy Additions', () => {
      it('validates plant_pineclone metadata, tribe, and asset mapping', () => {
        const card = getCardById('plant_pineclone')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Pineclone')
        expect(card?.cost).toBe(4)
        expect(card?.attack).toBe(3)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Pinecone Plant')
        expect(card?.heroClass).toBe('Kabloom')
        expect(ASSET_MANIFEST.cards.plants['Pineclone']).toBeDefined()
      })

      it('transforms all other friendly plants into 3/3 Pineclones when Pineclone is played', () => {
        const state = createInitialGameState()
        // Place Sunflower 1/1 on lane 0 and Peashooter 1/1 on lane 2
        state.lanes[0].plantMinion = createMockMinion('sunflower1', 'Sunflower', 'plants', 1, 1, {
          cardId: 'plant_sunflower',
        })
        state.lanes[2].plantMinion = createMockMinion('peashooter1', 'Peashooter', 'plants', 1, 1, {
          cardId: 'plant_peashooter',
        })
        // Place an enemy zombie on lane 1 (should NOT be transformed)
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2, {
          cardId: 'zombie_conehead',
        })

        // Play Pineclone onto lane 1
        const pinecloneMinion = createMockMinion('p_clone', 'Pineclone', 'plants', 3, 3, {
          cardId: 'plant_pineclone',
        })
        const res = triggerWhenPlayed(state, pinecloneMinion, 1, 'plants')

        // Sunflower and Peashooter should now both be transformed into 3/3 Pineclones
        expect(res.updatedState.lanes[0].plantMinion?.name).toBe('Pineclone')
        expect(res.updatedState.lanes[0].plantMinion?.currentAttack).toBe(3)
        expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(3)

        expect(res.updatedState.lanes[2].plantMinion?.name).toBe('Pineclone')
        expect(res.updatedState.lanes[2].plantMinion?.currentAttack).toBe(3)
        expect(res.updatedState.lanes[2].plantMinion?.currentHealth).toBe(3)

        // Zombie on lane 1 is untouched
        expect(res.updatedState.lanes[1].zombieMinion?.name).toBe('Conehead')
        expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(2)

        expect(res.events.some(e => e.includes('Pineclone'))).toBe(true)
      })

      it('validates plant_galacta_cactus metadata, Bullseye trait, and asset mapping', () => {
        const card = getCardById('plant_galacta_cactus')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Galacta-Cactus')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(2)
        expect(card?.hp).toBe(2)
        expect(card?.bullseye).toBe(true)
        expect(card?.traits).toContain('Bullseye')
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Cactus Plant')
        expect(card?.heroClass).toBe('Guardian')
        expect(ASSET_MANIFEST.cards.plants['Galacta-Cactus']).toBeDefined()
      })

      it('deals 1 damage to all minions and both heroes when Galacta-Cactus is destroyed', () => {
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.zombieHero.hp = 20
        state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 2)
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 3)

        const cactusMinion = createMockMinion('gc', 'Galacta-Cactus', 'plants', 2, 2, {
          cardId: 'plant_galacta_cactus',
          bullseye: true,
        })

        const res = triggerWhenDestroyed(state, cactusMinion, 2, 'plants')

        // All minions took 1 damage
        expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(1)
        expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
        // Both Heroes took 1 damage
        expect(res.updatedState.plantHero.hp).toBe(19)
        expect(res.updatedState.zombieHero.hp).toBe(19)
        expect(res.events.some((e: string) => e.includes('Galacta-Cactus'))).toBe(true)
      })

      it('validates plant_lily_of_the_valley metadata, tribe, and Heights placement buff', () => {
        const card = getCardById('plant_lily_of_the_valley')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Lily of the Valley')
        expect(card?.cost).toBe(2)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Leafy Flower Plant')
        expect(card?.heroClass).toBe('Mega-Grow')
        expect(ASSET_MANIFEST.cards.plants['Lily of the Valley']).toBeDefined()

        // Test Lily of the Valley trigger via gameReducer PLAY_CARD on Heights (Lane 0)
        const state = createInitialGameState()
        state.phase = 'PLANT_PLAY'
        state.plantHero.sun = 5
        // Place Lily of the Valley on Lane 1
        state.lanes[1].plantMinion = createMockMinion('lily', 'Lily of the Valley', 'plants', 1, 3, {
          cardId: 'plant_lily_of_the_valley',
        })

        // Put a Peashooter card in hand
        const peaCard = convertCardDataToCard(getCardById('plant_peashooter')!, 'plants')
        state.plantHand = [peaCard]

        // Play Peashooter onto Lane 0 (Heights)
        const actionOnHeights = {
          type: 'PLAY_CARD' as const,
          side: 'plants' as const,
          cardId: peaCard.id,
          laneIndex: 0,
        }
        const stateAfterHeights = gameReducer(state, actionOnHeights)
        // Peashooter base is 1/1, with Heights rule (+1/+1) and Lily buff (+2/+2) it should be 4/4
        expect(stateAfterHeights.lanes[0].plantMinion?.currentAttack).toBe(4)
        expect(stateAfterHeights.lanes[0].plantMinion?.currentHealth).toBe(4)

        // Play another card on Lane 2 (Ground) - should NOT get +2/+2
        const peaCard2 = { ...peaCard, id: 'peashooter_ground' }
        stateAfterHeights.plantHand = [peaCard2]
        stateAfterHeights.plantHero.sun = 5
        const actionOnGround = {
          type: 'PLAY_CARD' as const,
          side: 'plants' as const,
          cardId: peaCard2.id,
          laneIndex: 2,
        }
        const stateAfterGround = gameReducer(stateAfterHeights, actionOnGround)
        expect(stateAfterGround.lanes[2].plantMinion?.currentAttack).toBe(1)
        expect(stateAfterGround.lanes[2].plantMinion?.currentHealth).toBe(1)
      })
    })

    describe('Zombie Cards - Round 6 Synergy Additions', () => {
      it('validates zombie_quickdraw_con_man metadata, Bullseye, and asset mapping', () => {
        const card = getCardById('zombie_quickdraw_con_man')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Quickdraw Con Man')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(3)
        expect(card?.bullseye).toBe(true)
        expect(card?.traits).toContain('Bullseye')
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Pirate Zombie')
        expect(card?.heroClass).toBe('Crazy')
        expect(card?.gravestone).toBe(false)
        expect(ASSET_MANIFEST.cards.zombies['Quickdraw Con Man']).toBeDefined()
      })

      it('triggers Quickdraw Con Man Bullseye damage when Plant Hero draws a card', () => {
        const state = createInitialGameState()
        state.plantHero.hp = 20
        // Place Quickdraw Con Man on lane 2
        state.lanes[2].zombieMinion = createMockMinion('conman', 'Quickdraw Con Man', 'zombies', 1, 3, {
          cardId: 'zombie_quickdraw_con_man',
          bullseye: true,
        })

        // Plant draws a card -> triggerDinoRoar with 'plants' side
        const res = triggerDinoRoar(state, 'plants')

        // Plant Hero takes 1 Bullseye damage (20 -> 19)
        expect(res.updatedState.plantHero.hp).toBe(19)
        expect(res.events.some(e => e.includes('Quickdraw Con Man'))).toBe(true)
      })

      it('validates zombie_dr_spacetime metadata, Bullseye, and Conjure discount on Hero hit', () => {
        const card = getCardById('zombie_dr_spacetime')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Dr. Spacetime')
        expect(card?.cost).toBe(2)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(5)
        expect(card?.bullseye).toBe(true)
        expect(card?.traits).toContain('Bullseye')
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Science Zombie')
        expect(card?.heroClass).toBe('Sneaky')
        expect(card?.gravestone).toBe(false)
        expect(ASSET_MANIFEST.cards.zombies['Dr. Spacetime']).toBeDefined()

        // Test face damage conjure in resolveCombat
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.zombieHand = []
        // Put Dr. Spacetime on lane 2 with no plant blocking
        state.lanes[2].zombieMinion = createMockMinion('dr_st', 'Dr. Spacetime', 'zombies', 1, 5, {
          cardId: 'zombie_dr_spacetime',
          bullseye: true,
        })

        const { updatedState, result } = resolveCombat(state)
        // Plant Hero took 1 damage
        expect(updatedState.plantHero.hp).toBe(19)
        // Zombie hand received 1 conjured card from Galactic Gardens
        expect(updatedState.zombieHand.length).toBe(1)
        expect(result.events.some((e: any) => e.description.includes('Dr. Spacetime'))).toBe(true)
      })

      it('validates zombie_going_viral trick execution (all +1/+1, Frenzy, draw 1, add 3 to deck)', () => {
        const card = getCardById('zombie_going_viral')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Going Viral')
        expect(card?.cost).toBe(3)
        expect(card?.type).toBe('trick')
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Gourmet Party Trick')
        expect(card?.heroClass).toBe('Hearty')
        expect(ASSET_MANIFEST.cards.zombies['Going Viral']).toBeDefined()

        const state = createInitialGameState()
        state.zombieHero.brains = 5
        // Place 2 zombies on board: Lane 1 (1/3) and Lane 3 (2/2)
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
        state.lanes[3].zombieMinion = createMockMinion('z3', 'Swabbie', 'zombies', 1, 1)

        // Seed zombie deck with 5 cards
        state.zombieDeck = [
          convertCardDataToCard(getCardById('zombie_swabbie')!, 'zombies'),
          convertCardDataToCard(getCardById('zombie_conehead')!, 'zombies'),
        ]
        const initialDeckSize = state.zombieDeck.length
        state.zombieHand = [convertCardDataToCard(card!, 'zombies')]

        // Execute Going Viral trick
        const viralCard = convertCardDataToCard(card!, 'zombies')
        const trickResult = executeTrick(state, viralCard, 'zombies')
        expect(trickResult.success).toBe(true)

        // Both zombies got +1/+1 and Frenzy
        expect(trickResult.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(3)
        expect(trickResult.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
        expect(trickResult.updatedState.lanes[1].zombieMinion?.frenzy).toBe(true)

        expect(trickResult.updatedState.lanes[3].zombieMinion?.currentAttack).toBe(2)
        expect(trickResult.updatedState.lanes[3].zombieMinion?.currentHealth).toBe(2)
        expect(trickResult.updatedState.lanes[3].zombieMinion?.frenzy).toBe(true)

        // Drew 1 card, added 3 Going Viral cards -> deck size = initial - 1 + 3 = initial + 2
        expect(trickResult.updatedState.zombieDeck.length).toBe(initialDeckSize - 1 + 3)
        expect(trickResult.updatedState.zombieDeck.filter((c: Card) => c.name === 'Going Viral').length).toBe(3)
      })
    })
  })

  describe('Round 7: Event & Triassic Card Suite', () => {
      it('should validate Blooming Heart (Kabloom Event Plant) data & +1 ATK growth on damage', () => {
        const card = getCardById('plant_blooming_heart')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Blooming Heart')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(2)
        expect(card?.hp).toBe(2)
        expect(card?.rarity).toBe('Event')
        expect(card?.tribe).toBe('Flower Plant')
        expect(card?.heroClass).toBe('Kabloom')
        expect(ASSET_MANIFEST.cards.plants['Blooming Heart']).toBeDefined()

        // Test combat damage trigger: deals damage -> gains +1 ATK
        const state = createInitialGameState()
        state.phase = 'FIGHT'
        const bloomingHeart = createMockMinion('bh1', 'Blooming Heart', 'plants', 2, 2, { cardId: 'plant_blooming_heart' })
        state.lanes[1].plantMinion = bloomingHeart
        // Enemy zombie with 5 HP so both survive
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 1, 5)

        const { updatedState: combatState } = resolveCombat(state)
        // Blooming Heart dealt 2 damage to Conehead, so currentAttack should become 3
        const resultPlant = combatState.lanes[1].plantMinion
        expect(resultPlant).toBeDefined()
        expect(resultPlant?.currentAttack).toBe(3)
      })

      it('should validate Sportacus (Smarty Super-Rare Plant) data & 2 damage to Zombie Hero on trick', () => {
        const card = getCardById('plant_sportacus')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Sportacus')
        expect(card?.cost).toBe(3)
        expect(card?.attack).toBe(3)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Mushroom Plant')
        expect(card?.heroClass).toBe('Smarty')
        expect(ASSET_MANIFEST.cards.plants['Sportacus']).toBeDefined()

        // Test reaction when Zombie plays a trick
        const state = createInitialGameState()
        state.lanes[2].plantMinion = createMockMinion('sp1', 'Sportacus', 'plants', 3, 3, { cardId: 'plant_sportacus' })
        const initialHeroHp = state.zombieHero.hp
        const trickCard: Card = {
          id: 'zombie_bungee_plumber',
          name: 'Bungee Plumber',
          side: 'zombies',
          cost: 1,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '',
        }

        const reaction = triggerWhenTrickPlayed(state, trickCard, 'zombies')
        expect(reaction.updatedState.zombieHero.hp).toBe(initialHeroHp - 2)
        expect(reaction.events.some(e => e.includes('Sportacus'))).toBe(true)
      })

      it('should validate Kitchen Sink Zombie (Brainy Event Zombie) multi-traits', () => {
        const card = getCardById('zombie_kitchen_sink')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Kitchen Sink Zombie')
        expect(card?.cost).toBe(6)
        expect(card?.attack).toBe(3)
        expect(card?.hp).toBe(6)
        expect(card?.rarity).toBe('Event')
        expect(card?.tribe).toBe('Monster Zombie')
        expect(card?.heroClass).toBe('Brainy')
        expect(card?.armored).toBe(1)
        expect(card?.antiHero).toBe(3)
        expect(card?.frenzy).toBe(true)
        expect(card?.bullseye).toBe(true)
        expect(card?.gravestone).toBe(false)
        expect(card?.traits).toContain('Armored 1')
        expect(card?.traits).toContain('Anti-Hero 3')
        expect(card?.traits).toContain('Frenzy')
        expect(card?.traits).toContain('Bullseye')
        expect(ASSET_MANIFEST.cards.zombies['Kitchen Sink Zombie']).toBeDefined()
      })

      it('should validate Trick-or-Treater (Hearty Event Zombie) & Treat trick conjuring', () => {
        const card = getCardById('zombie_trick_or_treater')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Trick-or-Treater')
        expect(card?.cost).toBe(3)
        expect(card?.attack).toBe(2)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Event')
        expect(card?.tribe).toBe('Monster Zombie')
        expect(card?.heroClass).toBe('Hearty')
        expect(card?.gravestone).toBe(true)
        expect(ASSET_MANIFEST.cards.zombies['Trick-or-Treater']).toBeDefined()

        // Test trick conjuring
        const state = createInitialGameState()
        state.lanes[1].zombieMinion = createMockMinion('tot1', 'Trick-or-Treater', 'zombies', 2, 3, { cardId: 'zombie_trick_or_treater' })
        const initialHandSize = state.zombieHand.length

        const trickCard: Card = {
          id: 'zombie_lurch_for_lunch',
          name: 'Lurch for Lunch',
          side: 'zombies',
          cost: 2,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '',
        }

        const reaction = triggerWhenTrickPlayed(state, trickCard, 'zombies')
        expect(reaction.updatedState.zombieHand.length).toBe(initialHandSize + 1)
        const conjuredTreat = reaction.updatedState.zombieHand[reaction.updatedState.zombieHand.length - 1]
        expect(['Healthy Treat', 'Sugary Treat']).toContain(conjuredTreat.name)
        expect(conjuredTreat.type).toBe('trick')
      })

      it('should validate Synchronized Swimmer (Beastly Event Zombie) stat copying', () => {
        const card = getCardById('zombie_synchronized_swimmer')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Synchronized Swimmer')
        expect(card?.cost).toBe(2)
        expect(card?.attack).toBe(2)
        expect(card?.hp).toBe(2)
        expect(card?.rarity).toBe('Event')
        expect(card?.tribe).toBe('Sports Zombie')
        expect(card?.heroClass).toBe('Beastly')
        expect(card?.amphibious).toBe(true)
        expect(ASSET_MANIFEST.cards.zombies['Synchronized Swimmer']).toBeDefined()

        // Test stat copying when placed
        const state = createInitialGameState()
        // Put a powerful zombie on lane 1 (e.g. 5/6 Warlord or Kitchen Sink)
        state.lanes[1].zombieMinion = createMockMinion('z_boss', 'Kitchen Sink Zombie', 'zombies', 6, 6)
        // Put Swimmer on water lane (lane 4)
        const swimmer = createMockMinion('swimmer_1', 'Synchronized Swimmer', 'zombies', 2, 2, { cardId: 'zombie_synchronized_swimmer' })
        state.lanes[4].zombieMinion = swimmer

        const result = triggerWhenPlayed(state, swimmer, 4, 'zombies')
        expect(result.updatedState.lanes[4].zombieMinion?.currentAttack).toBe(6)
        expect(result.updatedState.lanes[4].zombieMinion?.currentHealth).toBe(6)
      })

    describe('Round 8: Galactic Gardens & Colossal Fossils Iconic Card Suite', () => {
      it('should validate Galacta-Cactus metadata, Bullseye trait, and universal death explosion', () => {
        const card = getCardById('plant_galacta_cactus')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Galacta-Cactus')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(2)
        expect(card?.hp).toBe(2)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Cactus Plant')
        expect(card?.heroClass).toBe('Guardian')
        expect(card?.bullseye).toBe(true)
        expect(ASSET_MANIFEST.cards.plants['Galacta-Cactus']).toBeDefined()

        // Test death trigger damaging all minions and both heroes
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.zombieHero.hp = 20
        // Ally plant on lane 0
        state.lanes[0].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 3, { cardId: 'plant_peashooter' })
        // Enemy zombie on lane 1
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2, { cardId: 'zombie_conehead' })
        // Galacta-Cactus destroyed on lane 2
        const cactus = createMockMinion('gc1', 'Galacta-Cactus', 'plants', 2, 2, { cardId: 'plant_galacta_cactus' })
        state.lanes[2].plantMinion = null

        const res = triggerWhenDestroyed(state, cactus, 2, 'plants')
        expect(res.updatedState.plantHero.hp).toBe(19)
        expect(res.updatedState.zombieHero.hp).toBe(19)
        expect(res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(2)
        expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
        expect(res.events.some(e => e.includes('Galacta-Cactus'))).toBe(true)
      })

      it('should validate Captain Cucumber metadata and on-damage Legendary conjure discounted by 1 Sun', () => {
        const card = getCardById('plant_captain_cucumber')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Captain Cucumber')
        expect(card?.cost).toBe(3)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(4)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.tribe).toBe('Fruit Plant')
        expect(card?.heroClass).toBe('Mega-Grow')
        expect(ASSET_MANIFEST.cards.plants['Captain Cucumber']).toBeDefined()

        // Test combat: dealing damage to Zombie minion triggers conjure
        const state = createInitialGameState()
        state.plantHand = []
        state.lanes[0].plantMinion = createMockMinion('cc1', 'Captain Cucumber', 'plants', 1, 4, { cardId: 'plant_captain_cucumber' })
        state.lanes[0].zombieMinion = createMockMinion('z1', 'Browncoat', 'zombies', 1, 3, { cardId: 'zombie_browncoat' })

        const combatResult = resolveCombat(state)
        expect(combatResult.updatedState.plantHand.length).toBe(1)
        const conjured = combatResult.updatedState.plantHand[0]
        const catalogCard = getCardById(conjured.id)
        if (catalogCard) {
          expect(catalogCard.rarity).toBe('Legendary')
          expect(conjured.cost).toBe(Math.max(0, catalogCard.cost - 1))
        }
      })

      it('should validate Banana Launcher metadata and start-of-turn Banana Bomb generation', () => {
        const card = getCardById('plant_banana_launcher')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Banana Launcher')
        expect(card?.cost).toBe(2)
        expect(card?.attack).toBe(0)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Fruit Plant')
        expect(card?.heroClass).toBe('Kabloom')
        expect(ASSET_MANIFEST.cards.plants['Banana Launcher']).toBeDefined()

        // Test Start of Turn generation
        const state = createInitialGameState()
        state.plantHand = []
        state.lanes[1].plantMinion = createMockMinion('bl1', 'Banana Launcher', 'plants', 0, 3, { cardId: 'plant_banana_launcher' })

        const startTurnRes = triggerStartOfTurn(state, 'plants')
        expect(startTurnRes.updatedState.plantHand.length).toBe(1)
        const generatedBomb = startTurnRes.updatedState.plantHand[0]
        expect(generatedBomb.id.startsWith('plant_banana_bomb')).toBe(true)
        expect(generatedBomb.name).toBe('Banana Bomb')
        expect(generatedBomb.cost).toBe(1)
        expect(generatedBomb.type).toBe('trick')
      })

      it('should validate Banana Bomb token trick execution dealing 1 damage', () => {
        const card = getCardById('plant_banana_bomb')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Banana Bomb')
        expect(card?.cost).toBe(1)
        expect(card?.type).toBe('trick')
        expect(card?.rarity).toBe('Token')
        expect(card?.heroClass).toBe('Kabloom')
        expect(ASSET_MANIFEST.cards.plants['Banana Bomb']).toBeDefined()

        // Test trick damaging zombie
        const state = createInitialGameState()
        state.lanes[2].zombieMinion = createMockMinion('z_target', 'Basic Zombie', 'zombies', 1, 3)
        const bombCard: Card = {
          id: 'plant_banana_bomb_test',
          name: 'Banana Bomb',
          side: 'plants',
          cost: 1,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '',
        }

        const trickRes = executeTrick(state, bombCard, 'plants', 2)
        expect(trickRes.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(2)

        // Test lethal damage destroying zombie
        state.lanes[2].zombieMinion = createMockMinion('z_weak', 'Weak Imp', 'zombies', 1, 1)
        const lethalRes = executeTrick(state, bombCard, 'plants', 2)
        expect(lethalRes.updatedState.lanes[2].zombieMinion).toBeNull()
      })

      it('should validate Quickdraw Con Man metadata, Bullseye and reaction to Plant Hero card draw', () => {
        const card = getCardById('zombie_quickdraw_con_man')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Quickdraw Con Man')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Super-Rare')
        expect(card?.tribe).toBe('Pirate Zombie')
        expect(card?.heroClass).toBe('Crazy')
        expect(card?.bullseye).toBe(true)
        expect(ASSET_MANIFEST.cards.zombies['Quickdraw Con Man']).toBeDefined()

        // Test reaction when Plant draws a card (triggerDinoRoar with plants)
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.plantHero.blockMeter = 0
        state.lanes[2].zombieMinion = createMockMinion('qd1', 'Quickdraw Con Man', 'zombies', 1, 3, { cardId: 'zombie_quickdraw_con_man' })

        const roarResult = triggerDinoRoar(state, 'plants')
        expect(roarResult.updatedState.plantHero.hp).toBe(19)
        // Bullseye damage does NOT charge Super-Block meter
        expect(roarResult.updatedState.plantHero.blockMeter).toBe(0)
        expect(roarResult.events.some(e => e.includes('Quickdraw Con Man'))).toBe(true)
      })

      it('should validate Interdimensional Zombie metadata and transformation on Science play', () => {
        const card = getCardById('zombie_interdimensional_zombie')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Interdimensional Zombie')
        expect(card?.cost).toBe(1)
        expect(card?.attack).toBe(1)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.tribe).toBe('Science Zombie')
        expect(card?.heroClass).toBe('Brainy')
        expect(ASSET_MANIFEST.cards.zombies['Interdimensional Zombie']).toBeDefined()

        // Test transformation when playing another Science card
        const state = createInitialGameState()
        const idZombie = createMockMinion('idz1', 'Interdimensional Zombie', 'zombies', 1, 3, {
          cardId: 'zombie_interdimensional_zombie',
        })
        state.lanes[1].zombieMinion = idZombie

        // Play a science trick like Rocket Science or Teleport
        const scienceTrick: Card = {
          id: 'zombie_teleport',
          name: 'Teleport',
          side: 'zombies',
          cost: 1,
          attack: 0,
          health: 0,
          type: 'trick',
          image: '',
        }

        const transformRes = triggerWhenSciencePlayed(state, scienceTrick, 'zombies')
        expect(transformRes.updatedState.lanes[1].zombieMinion).toBeDefined()
        expect(transformRes.updatedState.lanes[1].zombieMinion?.cardId).not.toBe('zombie_interdimensional_zombie')
        // Transformed into a 3-cost zombie
        const transformedCard = getCardById(transformRes.updatedState.lanes[1].zombieMinion!.cardId)
        expect(transformedCard?.cost).toBe(3)
        expect(transformRes.events.some(e => e.includes('Interdimensional Zombie'))).toBe(true)
      })

      it('should validate Space Cowboy metadata, tribes, and rightward movement when hurting Plant Hero', () => {
        const card = getCardById('zombie_space_cowboy')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Space Cowboy')
        expect(card?.cost).toBe(4)
        expect(card?.attack).toBe(3)
        expect(card?.hp).toBe(5)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.heroClass).toBe('Sneaky')
        expect(card?.strikethrough).toBe(true)
        expect(card?.tribe).toBe('Pirate Science Monster Zombie')
        expect(ASSET_MANIFEST.cards.zombies['Space Cowboy']).toBeDefined()

        // Test combat: Space Cowboy in lane 0 hits Plant Hero directly (open lane), moves to lane 1 and attacks lane 1
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.lanes[0].zombieMinion = createMockMinion('sc1', 'Space Cowboy', 'zombies', 3, 5, {
          cardId: 'zombie_space_cowboy',
          strikethrough: true,
        })
        // Lane 0 is open, lane 1 has an enemy plant with 2 HP
        state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 2, { cardId: 'plant_peashooter' })
        // Lane 2 has a zombie minion, blocking further movement to the right, and a plant minion absorbing zombie damage
        state.lanes[2].plantMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 6, { cardId: 'plant_wall_nut' })
        state.lanes[2].zombieMinion = createMockMinion('z2', 'Conehead', 'zombies', 2, 2)

        const { updatedState, result } = resolveCombat(state)
        // Space Cowboy attacked lane 0 -> hit Plant Hero for 3 -> moved to lane 1 -> attacked lane 1 (Strikethrough)
        // Movement stopped at lane 1 because lane 2 is occupied by Conehead
        expect(updatedState.plantHero.hp).toBe(14) // 20 - 3 (lane 0) - 3 (lane 1 Strikethrough)
        expect(updatedState.lanes[0].zombieMinion).toBeNull()
        expect(updatedState.lanes[1].zombieMinion?.name).toBe('Space Cowboy')
        expect(updatedState.lanes[2].zombieMinion?.name).toBe('Conehead')
        expect(result.events.some(e => e.description.includes('Space Cowboy') || e.attackerName === 'Space Cowboy')).toBe(true)
      })

      it('should validate Astrocado metadata, Strikethrough, and Pit reincarnation cycle', () => {
        const card = getCardById('plant_astrocado')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Astrocado')
        expect(card?.cost).toBe(5)
        expect(card?.attack).toBe(5)
        expect(card?.hp).toBe(3)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.tribe).toBe('Fruit Plant')
        expect(card?.heroClass).toBe('Solar')
        expect(card?.strikethrough).toBe(true)
        expect(ASSET_MANIFEST.cards.plants['Astrocado']).toBeDefined()

        // When Astrocado is destroyed, creates Astrocado Pit in plant hand
        const state = createInitialGameState()
        state.plantHand = []
        const astrocadoMinion = createMockMinion('astro1', 'Astrocado', 'plants', 5, 3, {
          cardId: 'plant_astrocado',
          strikethrough: true,
        })
        state.lanes[0].plantMinion = astrocadoMinion

        const destroyRes = triggerWhenDestroyed(state, astrocadoMinion, 0, 'plants')
        expect(destroyRes.updatedState.plantHand.length).toBe(1)
        const pitCard = destroyRes.updatedState.plantHand[0]
        expect(pitCard.name).toBe('Astrocado Pit')
        expect(pitCard.cost).toBe(1)
        expect(pitCard.health).toBe(1)
        expect(pitCard.attack).toBe(0)
      })

      it('should validate Astrocado Pit metadata and start-of-turn transformation into Astrocado', () => {
        const pitCard = getCardById('plant_astrocado_pit')
        expect(pitCard).toBeDefined()
        expect(pitCard?.name).toBe('Astrocado Pit')
        expect(pitCard?.cost).toBe(1)
        expect(pitCard?.attack).toBe(0)
        expect(pitCard?.hp).toBe(1)
        expect(pitCard?.rarity).toBe('Token')
        expect(pitCard?.tribe).toBe('Fruit Plant')
        expect(pitCard?.heroClass).toBe('Solar')
        expect(ASSET_MANIFEST.cards.plants['Astrocado Pit']).toBeDefined()

        // Start of turn: transforms into 5/3 Strikethrough Astrocado
        const state = createInitialGameState()
        state.lanes[1].plantMinion = createMockMinion('pit1', 'Astrocado Pit', 'plants', 0, 1, {
          cardId: 'plant_astrocado_pit',
        })

        const turnRes = triggerStartOfTurn(state, 'plants')
        const transformed = turnRes.updatedState.lanes[1].plantMinion
        expect(transformed).toBeDefined()
        expect(transformed?.name).toBe('Astrocado')
        expect(transformed?.cardId).toBe('plant_astrocado')
        expect(transformed?.currentAttack).toBe(5)
        expect(transformed?.currentHealth).toBe(3)
        expect(transformed?.strikethrough).toBe(true)
      })

      it('should validate Cob Cannon metadata, Corn Evolution placement, and splash destruction', () => {
        const card = getCardById('plant_cob_cannon')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Cob Cannon')
        expect(card?.cost).toBe(6)
        expect(card?.attack).toBe(6)
        expect(card?.hp).toBe(6)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.tribe).toBe('Corn Plant')
        expect(card?.heroClass).toBe('Solar')
        expect(ASSET_MANIFEST.cards.plants['Cob Cannon']).toBeDefined()

        // Test Corn Evolution placement: can evolve on Corn minion
        const state = createInitialGameState()
        state.lanes[2].plantMinion = createMockMinion('corn1', 'Kernel Corn', 'plants', 6, 6, {
          cardId: 'plant_kernel_corn',
          tribe: 'Corn Plant',
        })
        const cobCard = convertCardDataToCard(card, 'plants')
        const canPlay = canPlayCardToLane(state, cobCard, 2, 'plants')
        expect(canPlay.allowed).toBe(true)

        // Test Cob Cannon when played with Corn Evolution
        state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
        state.lanes[2].zombieMinion = createMockMinion('z2', 'Gargantuar', 'zombies', 5, 5)
        state.lanes[3].zombieMinion = createMockMinion('z3', 'Buckethead', 'zombies', 3, 3)

        const cobMinion = createMockMinion('cob1', 'Cob Cannon', 'plants', 6, 6, {
          cardId: 'plant_cob_cannon',
          isEvolved: true,
        })
        const abilityRes = triggerWhenPlayed(state, cobMinion, 2, 'plants')

        // Target zombie in lane 2 is destroyed
        expect(abilityRes.updatedState.lanes[2].zombieMinion).toBeNull()
        // Adjacent zombies take 1 splash damage
        expect(abilityRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
        expect(abilityRes.updatedState.lanes[3].zombieMinion?.currentHealth).toBe(2)
      })

      it('should validate Bird of Paradise metadata, Amphibious trait, and Superpower conjure at start of turn', () => {
        const card = getCardById('plant_bird_of_paradise')
        expect(card).toBeDefined()
        expect(card?.name).toBe('Bird of Paradise')
        expect(card?.cost).toBe(5)
        expect(card?.attack).toBe(4)
        expect(card?.hp).toBe(5)
        expect(card?.rarity).toBe('Legendary')
        expect(card?.tribe).toBe('Flower Animal Plant')
        expect(card?.heroClass).toBe('Smarty')
        expect(card?.amphibious).toBe(true)
        expect(ASSET_MANIFEST.cards.plants['Bird of Paradise']).toBeDefined()

        // Test start of turn: Conjures random Superpower
        const state = createInitialGameState()
        state.plantHand = []
        state.lanes[4].plantMinion = createMockMinion('bop1', 'Bird of Paradise', 'plants', 4, 5, {
          cardId: 'plant_bird_of_paradise',
          amphibious: true,
        })

        const turnRes = triggerStartOfTurn(state, 'plants')
        expect(turnRes.updatedState.plantHand.length).toBe(1)
        const conjured = turnRes.updatedState.plantHand[0]
        expect(conjured.type).toBe('superpower')
        expect(conjured.side).toBe('plants')
        expect(turnRes.events.some(e => e.includes('Bird of Paradise'))).toBe(true)
      })
    })
  })
})
