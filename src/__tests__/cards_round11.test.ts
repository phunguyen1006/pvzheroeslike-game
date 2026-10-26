import { describe, it, expect } from 'vitest'
import { getCardById, ALL_CARDS } from '../data/cards'
import { createInitialGameState, convertCardDataToCard } from '../engine/reducer'
import { triggerDinoRoar, triggerWhenPlayed } from '../engine/abilities'
import { executeTrick } from '../engine/tricks'
import type { Minion, Card } from '../engine/types'

const createMockMinion = (
  instanceId: string,
  name: string,
  side: 'plants' | 'zombies',
  attack: number,
  health: number,
  options: Partial<Minion> = {}
): Minion => ({
  instanceId,
  cardId: `card_${instanceId}`,
  name,
  side,
  currentAttack: attack,
  baseAttack: attack,
  currentHealth: health,
  maxHealth: health,
  image: `/assets/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
  ...options,
})

describe('Round 11 Cards Verification & Gameplay Integration', () => {
  describe('1. Dino-Roar Dinosaurs (Plants, Guardian)', () => {
    it('verifies Tricarrotops (plant_tricarrotops) metadata and stats', () => {
      const card = getCardById('plant_tricarrotops')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Tricarrotops')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(4)
      expect(card?.attack).toBe(3)
      expect(card?.hp).toBe(3)
      expect(card?.tribe).toBe('Dinosaur Plant')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.heroClass).toBe('Guardian')
      expect(card?.bullseye).toBe(true)
      expect(card?.description).toContain('Dino-Roar')
    })

    it('verifies Velociradish Hunter (plant_velociradish_hunter) metadata and stats', () => {
      const card = getCardById('plant_velociradish_hunter')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Velociradish Hunter')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(2)
      expect(card?.attack).toBe(3)
      expect(card?.hp).toBe(1)
      expect(card?.tribe).toBe('Dinosaur Plant')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.heroClass).toBe('Guardian')
      expect(card?.description).toContain('Dino-Roar')
    })

    it('verifies Tankylosaurus (plant_tankylosaurus) metadata and stats', () => {
      const card = getCardById('plant_tankylosaurus')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Tankylosaurus')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(2)
      expect(card?.hp).toBe(7)
      expect(card?.armored).toBe(2)
      expect(card?.traits).toContain('Armored 2')
      expect(card?.tribe).toBe('Dinosaur Plant')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.heroClass).toBe('Guardian')
      expect(card?.description).toContain('Dino-Roar')
    })

    it('verifies Mondo Bronto (plant_mondo_bronto) metadata and stats', () => {
      const card = getCardById('plant_mondo_bronto')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Mondo Bronto')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(6)
      expect(card?.attack).toBe(5)
      expect(card?.hp).toBe(6)
      expect(card?.tribe).toBe('Dinosaur Plant')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.heroClass).toBe('Guardian')
      expect(card?.description).toContain('Dino-Roar')
    })

    it('executes Dino-Roar effects correctly for all 4 dinosaurs', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20

      // Lane 0: Tricarrotops
      state.lanes[0].plantMinion = createMockMinion('tri1', 'Tricarrotops', 'plants', 3, 3, {
        cardId: 'plant_tricarrotops',
      })
      // Lane 1: Velociradish Hunter
      state.lanes[1].plantMinion = createMockMinion('vh1', 'Velociradish Hunter', 'plants', 3, 1, {
        cardId: 'plant_velociradish_hunter',
      })
      // Lane 2: Tankylosaurus
      state.lanes[2].plantMinion = createMockMinion('tank1', 'Tankylosaurus', 'plants', 2, 7, {
        cardId: 'plant_tankylosaurus',
      })
      // Lane 3: Mondo Bronto
      state.lanes[3].plantMinion = createMockMinion('mondo1', 'Mondo Bronto', 'plants', 5, 6, {
        cardId: 'plant_mondo_bronto',
      })

      const dinoResult = triggerDinoRoar(state, 'plants')
      const updated = dinoResult.updatedState

      // 1. Tricarrotops: +1/+1 -> 4/4
      expect(updated.lanes[0].plantMinion?.currentAttack).toBe(4)
      expect(updated.lanes[0].plantMinion?.currentHealth).toBe(4)

      // 2. Velociradish Hunter: +1 Attack -> 4/1
      expect(updated.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(updated.lanes[1].plantMinion?.currentHealth).toBe(1)

      // 3. Tankylosaurus: +2 Health -> 2/9
      expect(updated.lanes[2].plantMinion?.currentAttack).toBe(2)
      expect(updated.lanes[2].plantMinion?.currentHealth).toBe(9)

      // 4. Mondo Bronto: 2 damage to Zombie Hero -> 18 HP
      expect(updated.zombieHero.hp).toBe(18)
    })
  })

  describe('2. Board Wipes', () => {
    it('verifies Going Viral (zombie_going_viral) metadata and stats', () => {
      const card = getCardById('zombie_going_viral')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Going Viral')
      expect(card?.team).toBe('zombies')
      expect(card?.type).toBe('trick')
      expect(card?.cost).toBe(4)
      expect(card?.heroClass).toBe('Brainy')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.tribe).toBe('Trick')
      expect(card?.description).toContain('Going Viral')
    })

    it('verifies Doom-Shroom (plant_doom_shroom) metadata and stats', () => {
      const card = getCardById('plant_doom_shroom')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Doom-Shroom')
      expect(card?.team).toBe('plants')
      expect(card?.type).toBe('trick')
      expect(card?.cost).toBe(7)
      expect(card?.heroClass).toBe('Solar')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.tribe).toBe('Mushroom Trick')
      expect(card?.description).toContain('Doom-Shroom')
    })

    it('verifies Tactical Cuke (plant_tactical_cuke) metadata and stats', () => {
      const card = getCardById('plant_tactical_cuke')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Tactical Cuke')
      expect(card?.team).toBe('plants')
      expect(card?.type).toBe('trick')
      expect(card?.cost).toBe(6)
      expect(card?.heroClass).toBe('Solar')
      expect(card?.rarity).toBe('Super-Rare')
      expect(card?.tribe).toBe('Fruit Trick')
      expect(card?.description).toContain('Tactical Cuke')
    })

    it('executes Going Viral trick: buffs all zombies +1/+1 and Frenzy, draws 1 card, adds 3 into deck', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
      state.zombieDeck = [
        createMockMinion('z_deck', 'Deck Zombie', 'zombies', 1, 1) as unknown as Card
      ]
      state.zombieHand = []

      const card = convertCardDataToCard(getCardById('zombie_going_viral')!, 'zombies')
      const result = executeTrick(state, card, 'zombies')
      const updated = result.updatedState

      // Zombie gained +1/+1 -> 3/3 and Frenzy
      expect(updated.lanes[0].zombieMinion?.currentAttack).toBe(3)
      expect(updated.lanes[0].zombieMinion?.currentHealth).toBe(3)
      expect(updated.lanes[0].zombieMinion?.frenzy).toBe(true)

      // Drew 1 card, added 3 Going Virals into deck
      expect(updated.zombieHand.length).toBe(1)
      expect(updated.zombieDeck.length).toBe(3)
    })

    it('executes Doom-Shroom trick: destroys minions with 4+ Attack across both sides', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_big', 'Big Plant', 'plants', 5, 5)
      state.lanes[0].zombieMinion = createMockMinion('z_big', 'Big Zombie', 'zombies', 6, 6)
      state.lanes[1].plantMinion = createMockMinion('p_small', 'Small Plant', 'plants', 2, 3)
      state.lanes[1].zombieMinion = createMockMinion('z_small', 'Small Zombie', 'zombies', 3, 4)

      const card = convertCardDataToCard(getCardById('plant_doom_shroom')!, 'plants')
      const result = executeTrick(state, card, 'plants')
      const updated = result.updatedState

      // 4+ Attack units destroyed
      expect(updated.lanes[0].plantMinion).toBeNull()
      expect(updated.lanes[0].zombieMinion).toBeNull()
      // < 4 Attack units spared
      expect(updated.lanes[1].plantMinion).not.toBeNull()
      expect(updated.lanes[1].zombieMinion).not.toBeNull()
    })

    it('executes Tactical Cuke trick: wipes all ground lane minions', () => {
      const state = createInitialGameState()
      // Lane 0: ground lane
      state.lanes[0].type = 'ground'
      state.lanes[0].plantMinion = createMockMinion('p1', 'Ground Plant', 'plants', 3, 3)
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Ground Zombie', 'zombies', 3, 3)

      // Lane 4: water lane
      state.lanes[4].type = 'water'
      state.lanes[4].zombieMinion = createMockMinion('z_water', 'Water Zombie', 'zombies', 2, 2)

      const card = convertCardDataToCard(getCardById('plant_tactical_cuke')!, 'plants')
      const result = executeTrick(state, card, 'plants')
      const updated = result.updatedState

      // Ground lane wiped
      expect(updated.lanes[0].plantMinion).toBeNull()
      expect(updated.lanes[0].zombieMinion).toBeNull()
      // Water lane spared
      expect(updated.lanes[4].zombieMinion).not.toBeNull()
    })
  })

  describe('3. Additional Signature Cards', () => {
    it('verifies Zombot Sharktronic Sub (zombie_zombot_sharktronic_sub) metadata and traits', () => {
      const card = getCardById('zombie_zombot_sharktronic_sub')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Zombot Sharktronic Sub')
      expect(card?.team).toBe('zombies')
      expect(card?.type).toBe('zombie')
      expect(card?.cost).toBe(5)
      expect(card?.attack).toBe(4)
      expect(card?.hp).toBe(4)
      expect(card?.deadly).toBe(true)
      expect(card?.amphibious).toBe(true)
      expect(card?.traits).toContain('Deadly')
      expect(card?.traits).toContain('Amphibious')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Science Gargantuar Zombie')
      expect(card?.heroClass).toBe('Sneaky')
      expect(card?.laneRequirement).toBe('any')
    })

    it('verifies Barrel of Deadbeards (zombie_barrel_of_deadbeards) metadata and stats', () => {
      const card = getCardById('zombie_barrel_of_deadbeards')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Barrel of Deadbeards')
      expect(card?.team).toBe('zombies')
      expect(card?.cost).toBe(3)
      expect(card?.attack).toBe(2)
      expect(card?.hp).toBe(2)
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Barrel Pirate Zombie')
      expect(card?.heroClass).toBe('Crazy')
    })

    it('verifies Octo Zombie (zombie_octo_zombie) metadata and traits', () => {
      const card = getCardById('zombie_octo_zombie')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Octo Zombie')
      expect(card?.team).toBe('zombies')
      expect(card?.cost).toBe(4)
      expect(card?.attack).toBe(3)
      expect(card?.hp).toBe(3)
      expect(card?.amphibious).toBe(true)
      expect(card?.traits).toContain('Amphibious')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Pet Zombie')
      expect(card?.heroClass).toBe('Beastly')
      expect(card?.laneRequirement).toBe('any')
    })

    it('verifies Kernel Corn (plant_kernel_corn) metadata and when-played trigger', () => {
      const card = getCardById('plant_kernel_corn')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Kernel Corn')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(4)
      expect(card?.attack).toBe(4)
      expect(card?.hp).toBe(3)
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Corn Plant')
      expect(card?.heroClass).toBe('Solar')

      // Test When-Played trigger: damages all zombies on board
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 6)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Imp', 'zombies', 1, 2)

      const minion = createMockMinion('kc1', 'Kernel Corn', 'plants', 4, 3, {
        cardId: 'plant_kernel_corn',
      })
      const playedResult = triggerWhenPlayed(state, minion, 2, 'plants')
      const updated = playedResult.updatedState

      // Conehead took damage (6 - 4 = 2 HP)
      expect(updated.lanes[0].zombieMinion?.currentHealth).toBe(2)
      // Imp destroyed by damage
      expect(updated.lanes[1].zombieMinion).toBeNull()
    })

    it('verifies Gatling Pea (plant_gatling_pea) metadata and traits', () => {
      const card = getCardById('plant_gatling_pea')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Gatling Pea')
      expect(card?.team).toBe('plants')
      expect([4, 5]).toContain(card?.cost)
      expect([2, 5]).toContain(card?.attack)
      expect([2, 4]).toContain(card?.hp)
      expect(card?.doubleStrike).toBe(true)
      expect(card?.traits).toContain('Double Strike')
      expect(card?.rarity).toBe('Legendary')
      expect(card?.tribe).toBe('Pea Plant')
      expect(card?.heroClass).toBe('Mega-Grow')
      expect(card?.description).toContain('Double Strike')
    })

    it('verifies Puff-Shroom (plant_puff_shroom) metadata and traits', () => {
      const card = getCardById('plant_puff_shroom')
      expect(card).toBeDefined()
      expect(card?.name).toBe('Puff-Shroom')
      expect(card?.team).toBe('plants')
      expect(card?.cost).toBe(0)
      expect(card?.attack).toBe(1)
      expect(card?.hp).toBe(1)
      expect(card?.teamUp).toBe(true)
      expect(card?.traits).toContain('Team-Up')
      expect(card?.rarity).toBe('Uncommon')
      expect(card?.tribe).toBe('Mushroom Plant')
      expect(card?.heroClass).toBe('Kabloom')
    })
  })

  describe('4. Card Catalog Completeness', () => {
    it('verifies that all 13 round 11 cards are registered in ALL_CARDS', () => {
      const round11CardIds = [
        'plant_tricarrotops',
        'plant_velociradish_hunter',
        'plant_tankylosaurus',
        'plant_mondo_bronto',
        'zombie_going_viral',
        'plant_doom_shroom',
        'plant_tactical_cuke',
        'zombie_zombot_sharktronic_sub',
        'zombie_barrel_of_deadbeards',
        'zombie_octo_zombie',
        'plant_kernel_corn',
        'plant_gatling_pea',
        'plant_puff_shroom',
      ]

      for (const cardId of round11CardIds) {
        const found = ALL_CARDS.find(c => c.id === cardId)
        expect(found, `Expected card ${cardId} to be registered in ALL_CARDS`).toBeDefined()
        expect(found?.assetPath).toBeDefined()
        expect(found?.description.length).toBeGreaterThan(5)
      }
    })
  })
})
