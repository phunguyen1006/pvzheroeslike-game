/**
 * PvZ Heroes Replicate - Weekly Event Tickets & Cards System
 * Win matches with Boosted Heroes to earn 100-200 tickets.
 * Accumulate 1,200 tickets to craft up to 4 copies of the Weekly Event Card!
 */

import type { Side } from '../engine/types'

export interface WeeklyEventConfig {
  id: string
  weekNumber: number
  cardId: string
  cardName: string
  cardAvatar: string
  cardSide: Side
  cardTribe: string
  cardCost: number
  description: string
  targetTicketsPerCopy: number // 1,200 tickets per copy
  maxCopies: number // 4 copies max
  boostedPlantHeroId: string
  boostedPlantHeroName: string
  boostedPlantHeroAvatar: string
  boostedZombieHeroId: string
  boostedZombieHeroName: string
  boostedZombieHeroAvatar: string
  startDate: string
  endDate: string
}

export interface WeeklyEventProgress {
  tickets: number
  unlockedCopies: number
  claimedCopies: number
  lastUpdated: string
}

export const WEEKLY_EVENT_ROTATION: WeeklyEventConfig[] = [
  {
    id: 'event_week_1_blooming_heart',
    weekNumber: 1,
    cardId: 'plant_blooming_heart',
    cardName: 'Blooming Heart',
    cardAvatar: '/assets/cards/plants/Sunflower.png',
    cardSide: 'plants',
    cardTribe: 'Flower Plant',
    cardCost: 1,
    description: 'Khi gây sát thương: Nhận thêm +1 Tấn công (+1 ATK vĩnh viễn)!',
    targetTicketsPerCopy: 1200,
    maxCopies: 4,
    boostedPlantHeroId: 'hero_solar_flare',
    boostedPlantHeroName: 'Solar Flare',
    boostedPlantHeroAvatar: '/assets/heroes/plants/Solar Flare.png',
    boostedZombieHeroId: 'hero_super_brainz',
    boostedZombieHeroName: 'Super Brainz',
    boostedZombieHeroAvatar: '/assets/heroes/zombies/Super Brainz.png',
    startDate: '2026-10-20T00:00:00Z',
    endDate: '2026-10-27T23:59:59Z',
  },
  {
    id: 'event_week_2_kitchen_sink',
    weekNumber: 2,
    cardId: 'zombie_kitchen_sink',
    cardName: 'Kitchen Sink Zombie',
    cardAvatar: '/assets/cards/zombies/Zombot 1000.png',
    cardSide: 'zombies',
    cardTribe: 'Monster Zombie',
    cardCost: 6,
    description: 'Armored 1, Anti-Hero 3, Frenzy, Bullseye. Bậc thầy đa năng sở hữu mọi đặc tính chiến đấu tối thượng!',
    targetTicketsPerCopy: 1200,
    maxCopies: 4,
    boostedPlantHeroId: 'hero_green_shadow',
    boostedPlantHeroName: 'Green Shadow',
    boostedPlantHeroAvatar: '/assets/heroes/plants/Green Shadow.png',
    boostedZombieHeroId: 'hero_rustbolt',
    boostedZombieHeroName: 'Rustbolt',
    boostedZombieHeroAvatar: '/assets/heroes/zombies/Rustbolt.png',
    startDate: '2026-10-28T00:00:00Z',
    endDate: '2026-11-04T23:59:59Z',
  },
  {
    id: 'event_week_3_trick_or_treater',
    weekNumber: 3,
    cardId: 'zombie_trick_or_treater',
    cardName: 'Trick-or-Treater',
    cardAvatar: '/assets/cards/zombies/Conga Zombie.png',
    cardSide: 'zombies',
    cardTribe: 'Monster Zombie',
    cardCost: 3,
    description: 'Bia mộ. Khi chơi lá Trick đầu tiên mỗi lượt: Nhận 1 lá Treats ngẫu nhiên!',
    targetTicketsPerCopy: 1200,
    maxCopies: 4,
    boostedPlantHeroId: 'hero_spudow',
    boostedPlantHeroName: 'Spudow',
    boostedPlantHeroAvatar: '/assets/heroes/plants/Spudow.png',
    boostedZombieHeroId: 'hero_impfinity',
    boostedZombieHeroName: 'Impfinity',
    boostedZombieHeroAvatar: '/assets/heroes/zombies/Impfinity.png',
    startDate: '2026-11-05T00:00:00Z',
    endDate: '2026-11-12T23:59:59Z',
  },
  {
    id: 'event_week_4_synchronized_swimmer',
    weekNumber: 4,
    cardId: 'zombie_synchronized_swimmer',
    cardName: 'Synchronized Swimmer',
    cardAvatar: '/assets/cards/zombies/Swabbie.png',
    cardSide: 'zombies',
    cardTribe: 'Sports Zombie',
    cardCost: 2,
    description: 'Thủy quân (Amphibious). Sao chép chỉ số Tấn công và Máu của một Zombie đồng minh!',
    targetTicketsPerCopy: 1200,
    maxCopies: 4,
    boostedPlantHeroId: 'hero_wall_knight',
    boostedPlantHeroName: 'Wall-Knight',
    boostedPlantHeroAvatar: '/assets/heroes/plants/Wall-Knight.png',
    boostedZombieHeroId: 'hero_the_smash',
    boostedZombieHeroName: 'The Smash',
    boostedZombieHeroAvatar: '/assets/heroes/zombies/The Smash.png',
    startDate: '2026-11-13T00:00:00Z',
    endDate: '2026-11-20T23:59:59Z',
  },
]

export const CURRENT_WEEKLY_EVENT: WeeklyEventConfig = WEEKLY_EVENT_ROTATION[0]

export const EVENT_TICKETS_STORAGE_KEY = 'pvz_event_tickets_v1'

export function getInitialEventProgress(): WeeklyEventProgress {
  return {
    tickets: 0,
    unlockedCopies: 0,
    claimedCopies: 0,
    lastUpdated: new Date().toISOString(),
  }
}

export function loadEventTicketsProgress(): WeeklyEventProgress {
  try {
    if (typeof localStorage === 'undefined') return getInitialEventProgress()
    const raw = localStorage.getItem(EVENT_TICKETS_STORAGE_KEY)
    if (!raw) return getInitialEventProgress()
    const parsed = JSON.parse(raw)
    const tickets = typeof parsed.tickets === 'number' ? Math.max(0, parsed.tickets) : 0
    const unlockedCopies = Math.min(
      CURRENT_WEEKLY_EVENT.maxCopies,
      Math.floor(tickets / CURRENT_WEEKLY_EVENT.targetTicketsPerCopy)
    )
    const claimedCopies = typeof parsed.claimedCopies === 'number'
      ? Math.min(unlockedCopies, Math.max(0, parsed.claimedCopies))
      : 0

    return {
      tickets,
      unlockedCopies,
      claimedCopies,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    }
  } catch (err) {
    console.error('Failed to load event tickets progress:', err)
    return getInitialEventProgress()
  }
}

export function saveEventTicketsProgress(progress: WeeklyEventProgress): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(EVENT_TICKETS_STORAGE_KEY, JSON.stringify(progress))
  } catch (err) {
    console.error('Failed to save event tickets progress:', err)
  }
}

export interface MatchTicketResult {
  base: number
  boost: number
  total: number
  isBoosted: boolean
  heroName?: string
}

/**
 * Calculates tickets awarded from a completed match.
 * Base: 100 tickets on victory (0 on defeat).
 * Boost: +100 bonus tickets if the played hero is the Boosted Hero of the week (total 200).
 */
export function calculateMatchTickets(
  winner: Side | null,
  playerSide: Side,
  playerHeroId: string,
  event: WeeklyEventConfig = CURRENT_WEEKLY_EVENT
): MatchTicketResult {
  const isWon = winner === playerSide
  if (!isWon) {
    return { base: 0, boost: 0, total: 0, isBoosted: false }
  }

  const base = 100
  const isBoosted =
    playerHeroId === event.boostedPlantHeroId ||
    playerHeroId === event.boostedZombieHeroId

  const boost = isBoosted ? 100 : 0
  const heroName =
    playerHeroId === event.boostedPlantHeroId
      ? event.boostedPlantHeroName
      : playerHeroId === event.boostedZombieHeroId
        ? event.boostedZombieHeroName
        : undefined

  return {
    base,
    boost,
    total: base + boost,
    isBoosted,
    heroName,
  }
}

/**
 * Adds tickets to the current event progress and updates unlocked copies.
 */
export function addEventTickets(
  amount: number,
  event: WeeklyEventConfig = CURRENT_WEEKLY_EVENT
): { progress: WeeklyEventProgress; newCopiesUnlocked: number } {
  const current = loadEventTicketsProgress()
  const previousCopies = current.unlockedCopies

  const maxTotalTickets = event.targetTicketsPerCopy * event.maxCopies
  const newTickets = Math.min(maxTotalTickets, current.tickets + Math.max(0, amount))
  const newUnlockedCopies = Math.min(
    event.maxCopies,
    Math.floor(newTickets / event.targetTicketsPerCopy)
  )

  const updated: WeeklyEventProgress = {
    ...current,
    tickets: newTickets,
    unlockedCopies: newUnlockedCopies,
    lastUpdated: new Date().toISOString(),
  }

  saveEventTicketsProgress(updated)

  return {
    progress: updated,
    newCopiesUnlocked: Math.max(0, newUnlockedCopies - previousCopies),
  }
}

/**
 * Claims an unlocked event card copy.
 */
export function claimEventCardCopy(
  event: WeeklyEventConfig = CURRENT_WEEKLY_EVENT
): { success: boolean; progress: WeeklyEventProgress } {
  const current = loadEventTicketsProgress()
  if (current.claimedCopies < current.unlockedCopies) {
    const updated: WeeklyEventProgress = {
      ...current,
      claimedCopies: Math.min(event.maxCopies, current.claimedCopies + 1),
      lastUpdated: new Date().toISOString(),
    }
    saveEventTicketsProgress(updated)
    return { success: true, progress: updated }
  }
  return { success: false, progress: current }
}

/**
 * Returns formatted countdown time until event ends.
 */
export function getWeeklyEventCountdown(endDateStr: string = CURRENT_WEEKLY_EVENT.endDate): {
  days: number
  hours: number
  minutes: number
  isExpired: boolean
  formatted: string
} {
  const now = new Date().getTime()
  const end = new Date(endDateStr).getTime()
  const diff = end - now

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, formatted: 'Đã kết thúc' }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return {
    days,
    hours,
    minutes,
    isExpired: false,
    formatted: `${days} ngày ${hours} giờ ${minutes} phút`,
  }
}
