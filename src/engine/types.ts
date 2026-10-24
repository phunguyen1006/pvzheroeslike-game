export type Phase =
  | 'MULLIGAN'
  | 'ZOMBIE_PLAY'
  | 'PLANT_PLAY'
  | 'ZOMBIE_TRICKS'
  | 'FIGHT'
  | 'GAME_OVER'

export type Side = 'plants' | 'zombies'

export type CardType = 'minion' | 'trick' | 'environment' | 'superpower'

export type LaneType = 'heights' | 'ground' | 'water'

export type Trait =
  | 'amphibious'
  | 'bullseye'
  | 'teamUp'
  | 'frenzy'
  | 'deadly'
  | 'strikethrough'
  | 'armored'
  | 'freeze'
  | 'doubleStrike'
  | 'antiHero'
  | 'gravestone'
  | 'untrickable'
  | 'dinoRoar'
  | 'dino-roar'
  | 'splashDamage'
  | string

export interface Card {
  id: string
  name: string
  side: Side
  cost: number
  attack: number
  health: number
  type: CardType
  image: string
  traits?: (Trait | string)[]
  amphibious?: boolean
  bullseye?: boolean
  teamUp?: boolean
  frenzy?: boolean
  deadly?: boolean
  strikethrough?: boolean
  armored?: number
  freeze?: boolean
  antiHero?: number
  doubleStrike?: boolean
  gravestone?: boolean
  untrickable?: boolean
  tribe?: string
  set?: string
  rarity?: string
  description?: string
  heroClass?: string
  laneRequirement?: 'ground' | 'heights' | 'water' | 'any'
  targetType?: 'any' | 'minion' | 'hero' | 'lane' | 'none'
}

export interface Minion {
  instanceId: string
  cardId: string
  name: string
  side: Side
  currentAttack: number
  baseAttack: number
  currentHealth: number
  maxHealth: number
  image: string
  tribe?: string
  traits?: Trait[]
  amphibious?: boolean
  bullseye?: boolean
  teamUp?: boolean
  frenzy?: boolean
  deadly?: boolean
  strikethrough?: boolean
  armored?: number
  freeze?: boolean
  antiHero?: number
  doubleStrike?: boolean
  gravestone?: boolean
  untrickable?: boolean
  isGravestone?: boolean
  isFrozen?: boolean
  isAttacking?: boolean
  isHit?: boolean
  damageTakenThisTurn?: number
  isInvulnerable?: boolean
  invulnerableThisTurn?: boolean
}

export interface EnvironmentState {
  id: string
  name: string
  side: Side
  cost?: number
  description: string
  image: string
}

export interface LaneState {
  index: number
  type: LaneType
  name: string
  zombieMinion: Minion | null
  plantMinion: Minion | null
  // PvZ Heroes allows Team-Up plants to share the same lane
  plantTeamUpMinion?: Minion | null
  environment?: EnvironmentState | null
}

export interface HeroState {
  id: string
  side: Side
  name: string
  hp: number
  maxHp: number
  sun: number
  maxSun: number
  brains: number
  maxBrains: number
  blockMeter: number // 0 to 8 segments
  isShieldActive: boolean
  invulnerable?: boolean
  untrickable?: boolean
  blockCount: number // max 3 blocks per game
  avatar: string
  classes: string[]
  superPower: string
  superPowerDescription: string
}

export interface CombatEvent {
  laneIndex: number
  attackerSide: Side
  attackerName: string
  target: 'minion' | 'hero'
  targetSide: Side
  damageDealt: number
  isBlocked: boolean
  isLethal: boolean
  traitsTriggered?: Trait[]
  description: string
}

export interface CombatResult {
  events: CombatEvent[]
  plantHeroDamageTaken: number
  zombieHeroDamageTaken: number
  winner: Side | null
}

export interface DeathTriggerResult {
  updatedState: GameState
  events: CombatEvent[]
  logs: string[]
}

export interface FloatingText {
  id: string
  laneIndex?: number
  target: 'zombieHero' | 'plantHero' | 'zombieMinion' | 'plantMinion'
  text: string
  type: 'damage' | 'heal' | 'block' | 'buff' | 'crit'
}

export interface GameState {
  turn: number
  phase: Phase
  plantHero: HeroState
  zombieHero: HeroState
  lanes: LaneState[]
  plantDeck: Card[]
  zombieDeck: Card[]
  plantHand: Card[]
  zombieHand: Card[]
  plantGraveyard: Card[]
  zombieGraveyard: Card[]
  winner: Side | null
  // Teleport trick active flag: allows playing 1 zombie minion during ZOMBIE_TRICKS phase
  teleportActive?: boolean
  // Pending Superpower after a Super-Block trigger
  pendingSuperBlock?: {
    side: Side
    superpower: Card
  } | null
  combatEvents: CombatEvent[]
  combatLog: string[]
}

export type GameAction =
  | {
      type: 'START_MATCH'
      plantDeck?: Card[]
      zombieDeck?: Card[]
      plantHeroId?: string
      zombieHeroId?: string
      initialLanes?: LaneState[]
      startingSunBonus?: number
      startingBrainsBonus?: number
    }
  | { type: 'MULLIGAN_SWAP'; side: Side; cardIndices: number[] }
  | { type: 'FINISH_MULLIGAN'; side: Side }
  | { type: 'PLAY_CARD'; side: Side; cardId: string; laneIndex: number; targetMinionId?: string; targetHero?: boolean }
  | { type: 'PLAY_SUPERPOWER'; side: Side; superpowerId: string; laneIndex?: number; targetMinionId?: string; targetHero?: boolean }
  | { type: 'SAVE_SUPERPOWER'; side: Side }
  | { type: 'NEXT_PHASE' }
  | { type: 'START_COMBAT' }
  | { type: 'STEP_COMBAT_LANE'; laneIndex: number }
  | { type: 'DRAW_CARD'; side: Side }
  | { type: 'RESET_GAME' }

export interface MissionRule {
  id: string
  name: string
  description: string
  startingSunBonus?: number
  startingBrainsBonus?: number
  initialEnvironments?: { laneIndex: number; environmentCardId: string }[]
  initialMinions?: { laneIndex: number; cardId: string; side: Side }[]
}

export interface ComicStoryDialogue {
  plantHeroQuote: string
  zombieHeroQuote: string
  issueTitle?: string
  issueTagline?: string
}

export interface CampaignMission {
  id: string
  chapter?: number
  missionNumber: number
  faction?: Side
  title: string
  subtitle: string
  storyIntro: string
  bossHeroId: string
  bossHeroName: string
  bossHeroAvatar: string
  playerHeroId?: string
  difficulty: 'easy' | 'normal' | 'hard' | 'boss'
  rule: MissionRule
  starObjectives: [string, string, string]
  rewards: {
    gems: number
    unlocksNext?: boolean
    title?: string
  }
  comicDialogue?: ComicStoryDialogue
}

export interface WeeklyEventConfig {
  id: string
  cardId: string
  cardName: string
  cardAvatar: string
  cardSide: Side
  targetTickets: number
  maxCopies: number
  boostedPlantHeroId: string
  boostedZombieHeroId: string
  startDate: string
  endDate: string
}

export interface WeeklyEventProgress {
  tickets: number
  unlockedCopies: number
  lastClaimedAt?: string
}

export interface CampaignProgress {
  unlockedMissionNumber: number
  completedMissions: Record<string, { stars: number; completedAt: string }>
}

export interface SavedDeck {
  id: string
  name: string
  side: Side
  heroClass?: string
  heroId?: string
  cardIds: Record<string, number> // cardId -> quantity (1-4)
  createdAt: string
  updatedAt: string
}

export interface TerrainCoordinationResult {
  updatedMinion: Minion
  updatedState: GameState
  events: string[]
}

export interface ConjureFilter {
  tribe?: string
  set?: string
  cardType?: 'minion' | 'trick' | 'environment' | 'superpower'
  side?: Side
  rarity?: string
  minCost?: number
  maxCost?: number
}

export interface ConjureOptions {
  count?: number
  filter?: ConjureFilter
  costDiscount?: number
  targetCardId?: string
  customPool?: (Card | any)[]
  sourceName?: string
}

export interface ConjureResult {
  updatedState: GameState
  conjuredCards: Card[]
  events: string[]
}

