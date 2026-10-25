import { describe, it, expect } from 'vitest'
import { getCardById, ALL_CARDS, ALL_HEROES } from '../data/cards'
import { createCustomDeck, validateDeckForHero } from '../data/decks'

describe('New Plant Cards Verification: Shooting Starfruit & Heartichoke', () => {
  // 1. Shooting Starfruit Metadata & Stats
  describe('Shooting Starfruit (plant_shooting_starfruit)', () => {
    it('exists in card database with valid identifier', () => {
      const card = getCardById('plant_shooting_starfruit')
      expect(card).toBeDefined()
      expect(card?.id).toBe('plant_shooting_starfruit')
    })

    it('has authentic stats: 5 cost, 2 Attack, 2 Health (2/2), Legendary rarity', () => {
      const card = getCardById('plant_shooting_starfruit')!
      expect(card.cost).toBe(5)
      expect(card.attack).toBe(2)
      expect(card.hp).toBe(2)
      expect(card.health).toBe(2)
      expect(card.rarity).toBe('Legendary')
    })

    it('has proper typing, team, class, and tribe metadata', () => {
      const card = getCardById('plant_shooting_starfruit')!
      expect(card.team).toBe('plants')
      expect(card.type).toBe('plant')
      expect(card.tribe).toBe('Fruit Plant')
      expect(card.heroClass).toBe('Smarty')
      expect(card.laneRequirement).toBe('ground')
    })

    it('has non-empty description detailing its multi-lane attack ability', () => {
      const card = getCardById('plant_shooting_starfruit')!
      expect(card.description).toBeDefined()
      expect(card.description.trim().length).toBeGreaterThan(0)
      expect(card.description).toContain('5 làn')
    })

    it('has valid asset paths for rendering and UI presentation', () => {
      const card = getCardById('plant_shooting_starfruit')!
      expect(card.assetPath).toBeDefined()
      expect(card.assetPath.length).toBeGreaterThan(0)
      expect(card.image).toBeDefined()
      expect(card.image.length).toBeGreaterThan(0)
    })
  })

  // 2. Heartichoke Metadata & Stats
  describe('Heartichoke (plant_heartichoke)', () => {
    it('exists in card database with valid identifier', () => {
      const card = getCardById('plant_heartichoke')
      expect(card).toBeDefined()
      expect(card?.id).toBe('plant_heartichoke')
    })

    it('has authentic stats: 4 cost, 3 Attack, 4 Health (3/4), Super-Rare rarity', () => {
      const card = getCardById('plant_heartichoke')!
      expect(card.cost).toBe(4)
      expect(card.attack).toBe(3)
      expect(card.hp).toBe(4)
      expect(card.health).toBe(4)
      expect(card.rarity).toBe('Super-Rare')
    })

    it('has proper typing, team, class, and tribe metadata', () => {
      const card = getCardById('plant_heartichoke')!
      expect(card.team).toBe('plants')
      expect(card.type).toBe('plant')
      expect(card.tribe).toBe('Flower Plant')
      expect(card.heroClass).toBe('Solar')
      expect(card.laneRequirement).toBe('ground')
    })

    it('has non-empty description detailing its healing damage resonance ability', () => {
      const card = getCardById('plant_heartichoke')!
      expect(card.description).toBeDefined()
      expect(card.description.trim().length).toBeGreaterThan(0)
      expect(card.description.toLowerCase()).toContain('hồi máu')
    })

    it('has valid asset paths for rendering and UI presentation', () => {
      const card = getCardById('plant_heartichoke')!
      expect(card.assetPath).toBeDefined()
      expect(card.assetPath.length).toBeGreaterThan(0)
      expect(card.image).toBeDefined()
      expect(card.image.length).toBeGreaterThan(0)
    })
  })

  // 3. Database & Deck Integration
  describe('Database Catalog & Deck Alignment', () => {
    it('is registered in ALL_CARDS master collection', () => {
      const starfruit = ALL_CARDS.find(c => c.id === 'plant_shooting_starfruit')
      const heartichoke = ALL_CARDS.find(c => c.id === 'plant_heartichoke')
      expect(starfruit).toBeDefined()
      expect(heartichoke).toBeDefined()
    })

    it('can be included in custom decks and validated for compatible heroes', () => {
      // Shooting Starfruit is Smarty -> Green Shadow (Mega-Grow / Smarty) can use it
      const greenShadowDeck = createCustomDeck(['plant_shooting_starfruit', 'plant_peashooter'])
      const gsValidation = validateDeckForHero('hero_green_shadow', greenShadowDeck)
      expect(gsValidation.valid).toBe(true)
      expect(gsValidation.errors.length).toBe(0)

      // Heartichoke is Solar -> Solar Flare (Kabloom / Solar) can use it
      const solarFlareDeck = createCustomDeck(['plant_heartichoke', 'plant_sunflower'])
      const sfValidation = validateDeckForHero('hero_solar_flare', solarFlareDeck)
      expect(sfValidation.valid).toBe(true)
      expect(sfValidation.errors.length).toBe(0)

      // Heartichoke (Solar) cannot be used by Green Shadow (Mega-Grow / Smarty)
      const invalidDeck = createCustomDeck(['plant_heartichoke'])
      const invalidValidation = validateDeckForHero('hero_green_shadow', invalidDeck)
      expect(invalidValidation.valid).toBe(false)
      expect(invalidValidation.errors[0]).toContain('Solar')
    })
  })
})
