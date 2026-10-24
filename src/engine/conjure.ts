/**
 * Generic Conjure Engine
 * Handles conjuring cards with Tribe/Set/Cost/Rarity filters and cost discounting.
 * Integrates continuous Dr. Spacetime -1 Brain discount passive on Zombie conjures.
 */

import type { GameState, Side, Card, ConjureOptions, ConjureResult } from './types'
import { ALL_CARDS, type CardData } from '../data/cards'

// Pre-defined set card mappings based on official PvZ Heroes expansions
export const CARD_SETS: Record<string, string[]> = {
  'Galactic Gardens': [
    'zombie_dr_spacetime',
    'zombie_raiding_raptor',
    'zombie_intergalactic_warlord',
    'zombie_quickdraw_con_man',
    'zombie_laser_base_alpha',
    'zombie_area_22',
    'zombie_total_eclipse',
    'zombie_moon_base_z',
    'zombie_medulla_nebula',
    'zombie_kitchen_sink_zombie',
    'plant_spikeweed_sector',
    'plant_bog_of_sunken_hope',
    'plant_planet_of_the_grapes',
    'plant_galacta_cactus',
    'plant_banana_split',
    'plant_solar_winds',
    'plant_astrocado',
    'zombie_space_cowboy',
  ],
  'Colossal Fossils': [
    'plant_dusk_lobber',
    'plant_blooming_heart',
    'plant_aloesaurus',
    'plant_cob_cannon',
    'zombie_going_viral',
    'zombie_conga_zombie',
  ],
  'Triassic Triumph': [
    'plant_gatling_pea',
    'plant_sportacus',
    'plant_bird_of_paradise',
    'zombie_trick_or_treater',
  ],
  'Premium': [
    'plant_bananasaurus_rex',
    'plant_doubled_mint',
    'plant_briar_rose',
    'plant_cornucopia',
    'plant_the_great_zucchini',
    'zombie_trickster',
    'zombie_valkyrie',
    'zombie_zombot_1000',
    'zombie_bad_moon_rising',
    'zombie_disco_tron_3000',
  ],
  'Basic': [
    'plant_peashooter',
    'plant_sunflower',
    'plant_wall_nut',
    'plant_snow_pea',
    'plant_repeater',
    'zombie_swabbie',
    'zombie_bungee_plumber',
    'zombie_conehead_zombie',
    'zombie_buckethead_zombie',
  ],
}

/**
 * Returns the expansion set name for a given cardId
 */
export function getCardSet(cardId: string): string {
  for (const [setName, ids] of Object.entries(CARD_SETS)) {
    if (ids.includes(cardId)) {
      return setName
    }
  }
  return 'Premium'
}

/**
 * Count active Dr. Spacetime minions on the board for the zombie side.
 * In PvZ Heroes: "Cards you Conjure cost 1 less." (Passive continuous ability)
 */
export function getDrSpacetimeDiscount(state: GameState, side: Side): number {
  if (side !== 'zombies') return 0
  let count = 0
  for (const lane of state.lanes) {
    if (lane.zombieMinion?.cardId === 'zombie_dr_spacetime') {
      count++
    }
  }
  return count
}

/**
 * Generic Conjure Helper
 * Conjures cards into the player's hand adhering to Tribe, Set, Rarity, Side, and Cost filters.
 * Automatically applies Dr. Spacetime discounts and custom flat discounts.
 */
export function conjureCard(
  state: GameState,
  side: Side,
  options: ConjureOptions = {}
): ConjureResult {
  const count = options.count ?? 1
  const filter = options.filter || {}
  const events: string[] = []
  const conjuredCards: Card[] = []

  let updatedState: GameState = {
    ...state,
    plantHand: [...state.plantHand],
    zombieHand: [...state.zombieHand],
  }

  // 1. Calculate continuous discounts
  const drSpacetimeDiscount = getDrSpacetimeDiscount(state, side)
  const baseDiscount = options.costDiscount ?? 0
  const totalDiscount = baseDiscount + drSpacetimeDiscount

  // 2. Build candidate pool
  let candidatePool: CardData[] = []
  if (options.customPool && options.customPool.length > 0) {
    candidatePool = options.customPool as CardData[]
  } else {
    candidatePool = ALL_CARDS.filter((card) => {
      // Side filter (if specified, or match team)
      if (filter.side) {
        const cardSide = card.team === 'plants' ? 'plants' : 'zombies'
        if (cardSide !== filter.side) return false
      }

      // Tribe filter (e.g. 'Pea', 'Science', 'Pirate', 'Flower')
      if (filter.tribe) {
        const tribeLower = filter.tribe.toLowerCase()
        const cardTribe = (card.tribe || '').toLowerCase()
        const cardName = card.name.toLowerCase()
        const cardId = card.id.toLowerCase()
        const matchesTribe =
          cardTribe.includes(tribeLower) ||
          cardName.includes(tribeLower) ||
          cardId.includes(tribeLower)
        if (!matchesTribe) return false
      }

      // Set filter (e.g. 'Galactic Gardens', 'Colossal Fossils')
      if (filter.set) {
        const cardSet = (card as any).set || getCardSet(card.id)
        if (cardSet.toLowerCase() !== filter.set.toLowerCase()) {
          return false
        }
      }

      // Card Type filter ('minion' | 'trick' | 'environment')
      if (filter.cardType) {
        if (filter.cardType === 'minion') {
          if (card.type === 'trick' || card.type === 'environment') return false
        } else if (card.type !== filter.cardType) {
          return false
        }
      }

      // Rarity filter
      if (filter.rarity) {
        if (card.rarity?.toLowerCase() !== filter.rarity.toLowerCase()) {
          return false
        }
      }

      // Cost range filter
      if (filter.minCost !== undefined && card.cost < filter.minCost) return false
      if (filter.maxCost !== undefined && card.cost > filter.maxCost) return false

      return true
    })
  }

  // Fallback to ALL_CARDS matching side if candidate pool is empty
  if (candidatePool.length === 0) {
    candidatePool = ALL_CARDS.filter(c => (filter.side ? c.team === filter.side : true))
    if (candidatePool.length === 0) {
      candidatePool = ALL_CARDS.slice()
    }
  }

  // 3. Select cards
  for (let c = 0; c < count; c++) {
    const hand = side === 'plants' ? updatedState.plantHand : updatedState.zombieHand
    if (hand.length >= 10) {
      events.push(
        `⚠️ Tay bài của ${side === 'plants' ? 'Plant' : 'Zombie'} đã đầy (10 lá), không thể Conjure thêm!`
      )
      break
    }

    let chosenCardData: CardData
    if (options.targetCardId) {
      const found =
        candidatePool.find((card) => card.id === options.targetCardId) ||
        ALL_CARDS.find((card) => card.id === options.targetCardId)
      chosenCardData = found || candidatePool[Math.floor(Math.random() * candidatePool.length)]
    } else {
      chosenCardData = candidatePool[Math.floor(Math.random() * candidatePool.length)]
    }

    const finalCost = Math.max(0, chosenCardData.cost - totalDiscount)
    const cardSet = (chosenCardData as any).set || getCardSet(chosenCardData.id)

    const conjuredCard: Card = {
      id: `${chosenCardData.id}_conjured_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: chosenCardData.name,
      side,
      cost: finalCost,
      attack: chosenCardData.attack ?? 0,
      health: chosenCardData.hp ?? (chosenCardData as any).health ?? 0,
      type:
        chosenCardData.type === 'trick'
          ? 'trick'
          : chosenCardData.type === 'environment'
            ? 'environment'
            : 'minion',
      image: chosenCardData.image || chosenCardData.assetPath || '',
      traits: chosenCardData.traits || [],
      amphibious: chosenCardData.amphibious,
      bullseye: chosenCardData.bullseye,
      teamUp: chosenCardData.teamUp,
      frenzy: chosenCardData.frenzy,
      deadly: chosenCardData.deadly,
      strikethrough: chosenCardData.strikethrough,
      armored: chosenCardData.armored,
      freeze: chosenCardData.freeze,
      antiHero: chosenCardData.antiHero,
      doubleStrike: chosenCardData.doubleStrike,
      gravestone: chosenCardData.gravestone,
      tribe: chosenCardData.tribe,
      set: cardSet,
      rarity: chosenCardData.rarity,
      description: options.sourceName
        ? `Triệu hồi bởi ${options.sourceName}${totalDiscount > 0 ? ` (Giảm ${totalDiscount} ${side === 'plants' ? 'Sun' : 'Brain'})` : ''}.`
        : `Triệu hồi (Conjure)${totalDiscount > 0 ? ` (Giảm ${totalDiscount} ${side === 'plants' ? 'Sun' : 'Brain'})` : ''}.`,
    }

    if (side === 'plants') {
      updatedState.plantHand = [...updatedState.plantHand, conjuredCard]
    } else {
      updatedState.zombieHand = [...updatedState.zombieHand, conjuredCard]
    }

    conjuredCards.push(conjuredCard)

    const discountLog =
      totalDiscount > 0
        ? ` (Giảm ${totalDiscount} ${side === 'plants' ? 'Sun' : 'Brain'}${drSpacetimeDiscount > 0 ? ` [${drSpacetimeDiscount} từ Dr. Spacetime]` : ''} -> Cost: ${finalCost})`
        : ` (Cost: ${finalCost})`

    events.push(
      `✨ ${options.sourceName || (side === 'plants' ? 'Plant' : 'Zombie')} Triệu hồi (Conjure) lá [${conjuredCard.name}]${discountLog}!`
    )
  }

  return { updatedState, conjuredCards, events }
}
