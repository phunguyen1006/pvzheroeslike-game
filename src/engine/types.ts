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

export interface Card {
  id: string
  name: string
  side: Side
  cost: number
  attack: number
  health: number
  type: CardType
  image: string
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
  isFrozen?: boolean
  isAttacking?: boolean
  isHit?: boolean
  damageTakenThisTurn?: number
}

export interface EnvironmentState {
  id: string
  name: string
  side: Side
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
  // Pending Superpower after a Super-Block trigger
  pendingSuperBlock?: {
    side: Side
    superpower: Card
  } | null
  combatEvents: CombatEvent[]
  combatLog: string[]
}

export type GameAction =
  | { type: 'START_MATCH'; plantDeck?: Card[]; zombieDeck?: Card[]; plantHeroId?: string; zombieHeroId?: string }
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
