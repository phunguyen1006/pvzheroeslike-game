import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
} from '../engine/index'
import {
  evaluateMinionPriorityScore,
  getPriorityThreatTargets,
  rankThreatMinions,
  anticipateOpponentTricks,
  shouldHoldBackSwarm,
  anticipateOpponentLethalTrick,
  shouldAcceptChipDamageForBlock,
  evaluateSuperBlockPriming,
  isDinoRoarMinion,
  isDoubleStrikeMinion,
  isFrenzyMinion,
  isDeadlyMinion,
  isStrikethroughMinion,
  isBullseyeMinion,
} from '../engine/aiPredictive'
import {
  getAIDecision,
  getAIMulliganDecision,
  evaluateBoardState,
  reserveBrainsForTricks,
} from '../engine/ai'
import type { Minion, Card, GameState } from '../engine/types'

describe('AI Predictive Decision-Making Engine', () => {
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

  const createMockCard = (
    id: string,
    name: string,
    side: 'plants' | 'zombies',
    cost: number,
    type: 'minion' | 'trick' | 'environment' | 'superpower' = 'minion',
    options: Partial<Card> = {}
  ): Card => ({
    id,
    name,
    side,
    cost,
    type,
    attack: options.attack ?? 2,
    health: options.health ?? 2,
    image: `/assets/${name.toLowerCase().replace(/\s+/g, '_')}.png`,
    traits: [],
    ...options,
  })

  // =========================================================================
  // 1. THREAT ASSESSMENT HEURISTICS & MINION RANKING
  // =========================================================================
  describe('1. Threat Assessment Heuristics & Priority Target Ranking', () => {
    it('detects special keyword traits correctly', () => {
      const dinoMinion = createMockMinion('d1', 'Tricarrotops', 'plants', 2, 3, {
        cardId: 'plant_tricarrotops',
      })
      expect(isDinoRoarMinion(dinoMinion)).toBe(true)

      const doubleStrikeMinion = createMockMinion('ds1', 'Repeater', 'plants', 2, 2, {
        doubleStrike: true,
        traits: ['doubleStrike'],
      })
      expect(isDoubleStrikeMinion(doubleStrikeMinion)).toBe(true)

      const frenzyMinion = createMockMinion('f1', 'Smashing Gargantuar', 'zombies', 5, 5, {
        frenzy: true,
        traits: ['frenzy'],
      })
      expect(isFrenzyMinion(frenzyMinion)).toBe(true)

      const deadlyMinion = createMockMinion('dl1', 'Smelly Zombie', 'zombies', 2, 4, {
        deadly: true,
        traits: ['deadly'],
      })
      expect(isDeadlyMinion(deadlyMinion)).toBe(true)

      const strikeMinion = createMockMinion('st1', 'Line Dancing Zombie', 'zombies', 3, 1, {
        strikethrough: true,
      })
      expect(isStrikethroughMinion(strikeMinion)).toBe(true)

      const bullMinion = createMockMinion('b1', 'Bullseye Cactus', 'plants', 1, 5, {
        bullseye: true,
      })
      expect(isBullseyeMinion(bullMinion)).toBe(true)
    })

    it('scores Double Strike minions with outsized priority (+10)', () => {
      const vanillaMinion = createMockMinion('v1', 'Peashooter', 'plants', 2, 2)
      const doubleStrikeMinion = createMockMinion('ds1', 'Repeater', 'plants', 2, 2, {
        doubleStrike: true,
      })

      const vanillaScore = evaluateMinionPriorityScore(vanillaMinion)
      const doubleStrikeScore = evaluateMinionPriorityScore(doubleStrikeMinion)

      expect(doubleStrikeScore.score).toBe(vanillaScore.score + 10)
      expect(doubleStrikeScore.isHighPriority).toBe(true)
      expect(doubleStrikeScore.hasDoubleStrike).toBe(true)
      expect(doubleStrikeScore.reasons.some((r) => r.includes('Double Strike'))).toBe(true)
    })

    it('scores Dino-Roar engine minions with high snowball threat (+9)', () => {
      const dinoMinion = createMockMinion('d1', 'Tricarrotops', 'plants', 1, 3, {
        cardId: 'plant_tricarrotops',
      })
      const evalResult = evaluateMinionPriorityScore(dinoMinion)

      expect(evalResult.hasDinoRoar).toBe(true)
      expect(evalResult.isHighPriority).toBe(true)
      expect(evalResult.reasons.some((r) => r.includes('Dino-Roar'))).toBe(true)
    })

    it('scores Frenzy (+8) and Deadly (+7) minions and flags them as high priority', () => {
      const frenzyMinion = createMockMinion('f1', 'Vimpyre', 'zombies', 2, 3, {
        frenzy: true,
      })
      const deadlyMinion = createMockMinion('dl1', 'Smelly Zombie', 'zombies', 2, 4, {
        deadly: true,
      })

      const frenzyEval = evaluateMinionPriorityScore(frenzyMinion)
      const deadlyEval = evaluateMinionPriorityScore(deadlyMinion)

      expect(frenzyEval.hasFrenzy).toBe(true)
      expect(frenzyEval.isHighPriority).toBe(true)
      expect(deadlyEval.hasDeadly).toBe(true)
      expect(deadlyEval.isHighPriority).toBe(true)
    })

    it('ranks multiple opposing minions in descending order of threat score', () => {
      const state = createInitialGameState()
      // Lane 0: Vanilla 1/1
      state.lanes[0].plantMinion = createMockMinion('p0', 'Weanie Beanie', 'plants', 1, 1)
      // Lane 1: Double Strike 3/4 Repeater (High threat)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 3, 4, {
        doubleStrike: true,
      })
      // Lane 2: 5/5 Big minion
      state.lanes[2].plantMinion = createMockMinion('p2', 'Cabbage', 'plants', 5, 5)
      // Lane 3: Dino-Roar engine
      state.lanes[3].plantMinion = createMockMinion('p3', 'Tricarrotops', 'plants', 2, 4, {
        cardId: 'plant_tricarrotops',
      })

      const ranked = getPriorityThreatTargets(state, 'zombies')
      expect(ranked.length).toBe(4)

      // The highest threat should be at the top of the ranked array
      expect(ranked[0].priorityScore).toBeGreaterThanOrEqual(ranked[1].priorityScore)
      expect(ranked[1].priorityScore).toBeGreaterThanOrEqual(ranked[2].priorityScore)
      expect(ranked[2].priorityScore).toBeGreaterThanOrEqual(ranked[3].priorityScore)

      // Weanie Beanie should be lowest
      expect(ranked[3].minion.name).toBe('Weanie Beanie')
    })

    it('recommends HARD_REMOVAL for 4+ ATK minions and DAMAGE_TRICK for <= 3 HP minions', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Big Beater', 'plants', 5, 6)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Fragile Swarm', 'plants', 3, 2)

      const targets = getPriorityThreatTargets(state, 'zombies')
      const bigTarget = targets.find((t) => t.laneIndex === 1)!
      const fragileTarget = targets.find((t) => t.laneIndex === 2)!

      expect(bigTarget.recommendedCounters).toContain('HARD_REMOVAL')
      expect(fragileTarget.recommendedCounters).toContain('DAMAGE_TRICK')
    })
  })

  // =========================================================================
  // 2. PREDICTIVE TRICK EVALUATION & SWARM RESTRAINT
  // =========================================================================
  describe('2. Predictive Trick Evaluation & Swarm Restraint', () => {
    it('anticipates Doom-Shroom wipe when Plant player has 5+ Sun and Zombie has 2+ heavy minions', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 5
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Gargantuar', 'zombies', 5, 5)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Super Vimpire', 'zombies', 4, 4)

      const anticipation = anticipateOpponentTricks(state, 'zombies')

      expect(anticipation.unspentResource).toBe(5)
      expect(anticipation.threatenedTricks).toContain('Doom-Shroom')
      expect(anticipation.canWipeBoard).toBe(true)
      expect(anticipation.dangerLevel).toBe('high')
      expect(anticipation.recommendedAction).toBe('HOLD_HEAVY')
    })

    it('anticipates Tactical Cuke or Cherry Bomb wipe when Plant player has 6+ Sun and 3+ zombies on board', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 6
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 4)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Buckethead', 'zombies', 3, 4)
      state.lanes[2].zombieMinion = createMockMinion('z3', 'Imp', 'zombies', 1, 1)

      const anticipation = anticipateOpponentTricks(state, 'zombies')

      expect(anticipation.threatenedTricks).toContain('Cherry Bomb')
      expect(anticipation.threatenedTricks).toContain('Tactical Cuke')
      expect(anticipation.canWipeBoard).toBe(true)
      expect(anticipation.recommendedAction).toBe('HOLD_SWARM')
    })

    it('recommends holding back swarm minions when Plant player has 5+ Sun', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 5
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Zombie 1', 'zombies', 4, 4)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Zombie 2', 'zombies', 4, 4)

      const fragileCard = createMockCard('z_imp', 'Imp', 'zombies', 1, 'minion', { health: 1 })
      const swarmCheck = shouldHoldBackSwarm(state, 'zombies', fragileCard)

      expect(swarmCheck.hold).toBe(true)
      expect(swarmCheck.reason).toContain('Opponent has 5 Sun')
    })

    it('anticipates Weed Spray wipe when Zombie player has 3+ Brains against small plants (<= 2 ATK)', () => {
      const state = createInitialGameState()
      state.zombieHero.brains = 3
      state.lanes[0].plantMinion = createMockMinion('p1', 'Sunflower', 'plants', 0, 1)
      state.lanes[1].plantMinion = createMockMinion('p2', 'Peashooter', 'plants', 2, 2)

      const anticipation = anticipateOpponentTricks(state, 'plants')

      expect(anticipation.threatenedTricks).toContain('Weed Spray')
      expect(anticipation.canWipeBoard).toBe(true)

      const smallPlantCard = createMockCard('p_puff', 'Puff-Shroom', 'plants', 0, 'minion', {
        attack: 1,
      })
      const holdCheck = shouldHoldBackSwarm(state, 'plants', smallPlantCard)
      expect(holdCheck.hold).toBe(true)
      expect(holdCheck.reason).toContain('Weed Spray')
    })

    it('anticipates Bad Moon Rising when Zombie player has 7+ Brains and 2+ minions on board', () => {
      const state = createInitialGameState()
      state.zombieHero.brains = 7
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Imp 1', 'zombies', 1, 1)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Imp 2', 'zombies', 1, 1)

      const anticipation = anticipateOpponentTricks(state, 'plants')

      expect(anticipation.threatenedTricks).toContain('Bad Moon Rising')
      expect(anticipation.canBuffSwarm).toBe(true)
      expect(anticipation.canWipeBoard).toBe(true)
      expect(anticipation.dangerLevel).toBe('critical')
    })

    it('detects lethal combat + trick burst potential from unspent resources', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 6
      state.plantHero.sun = 4
      // Unblocked 3-attack plant in lane 1
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 3, 3)

      // With 4 Sun, Plant player threatens Plant Food (+5 dmg) + 3 face dmg = 8 >= 6 HP!
      const lethalAnticipation = anticipateOpponentLethalTrick(state, 'zombies')
      expect(lethalAnticipation.hasLethalThreat).toBe(true)
      expect(lethalAnticipation.projectedDamage).toBeGreaterThanOrEqual(6)
    })
  })

  // =========================================================================
  // 3. SUPER-BLOCK MANAGEMENT AI & PRIMING DECISIONS
  // =========================================================================
  describe('3. Super-Block Management AI & Priming Decisions', () => {
    it('intentionally accepts 1 chip damage when meter is 7/8 (100% trigger) before a later heavier hit', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 18
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      // Lane 0: 1 ATK chip damage plant
      state.lanes[0].plantMinion = createMockMinion('p0', 'Weanie Beanie', 'plants', 1, 1)
      state.lanes[0].zombieMinion = null

      // Lane 2: 5 ATK heavy threat plant
      state.lanes[2].plantMinion = createMockMinion('p2', 'Heavy Hitter', 'plants', 5, 5)
      state.lanes[2].zombieMinion = null

      const decision = shouldAcceptChipDamageForBlock(state, 'zombies', 0)

      expect(decision.acceptChip).toBe(true)
      expect(decision.isGuaranteedTrigger).toBe(true)
      expect(decision.incomingDamage).toBe(1)
      expect(decision.heavierLaterThreatLane).toBe(2)
      expect(decision.heavierLaterThreatDamage).toBe(5)
      expect(decision.reason).toContain('Guaranteed Super-Block (100% on 7/8)')
    })

    it('accepts chip damage (2 HP) when meter is 6/8 (66.7% trigger) before a later heavier threat', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 16
      state.zombieHero.blockMeter = 6
      state.zombieHero.blockCount = 1

      // Lane 1: 2 ATK chip damage plant
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 2)
      state.lanes[1].zombieMinion = null

      // Lane 3: 4 ATK unblocked plant
      state.lanes[3].plantMinion = createMockMinion('p3', 'Snapdragon', 'plants', 4, 3)
      state.lanes[3].zombieMinion = null

      const decision = shouldAcceptChipDamageForBlock(state, 'zombies', 1)

      expect(decision.acceptChip).toBe(true)
      expect(decision.isProbableTrigger).toBe(true)
      expect(decision.isGuaranteedTrigger).toBe(false)
      expect(decision.heavierLaterThreatLane).toBe(3)
      expect(decision.reason).toContain('Primed Super-Block (66.7% on 6/8)')
    })

    it('rejects chip damage absorption from Bullseye minions', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 18
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      // Lane 0: 1 ATK Bullseye plant
      state.lanes[0].plantMinion = createMockMinion('p0', 'Cactus', 'plants', 1, 5, {
        bullseye: true,
        traits: ['bullseye'],
      })
      // Lane 2: 5 ATK heavy hitter
      state.lanes[2].plantMinion = createMockMinion('p2', 'Heavy', 'plants', 5, 5)

      const decision = shouldAcceptChipDamageForBlock(state, 'zombies', 0)

      expect(decision.acceptChip).toBe(false)
      expect(decision.reason).toContain('Bullseye')
    })

    it('rejects chip damage absorption if incoming damage is too heavy (> 2-3 HP)', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 12
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      // Lane 0: 4 ATK plant (not chip damage!)
      state.lanes[0].plantMinion = createMockMinion('p0', 'Big Plant', 'plants', 4, 4)

      const decision = shouldAcceptChipDamageForBlock(state, 'zombies', 0)

      expect(decision.acceptChip).toBe(false)
      expect(decision.reason).toContain('too heavy')
    })

    it('rejects chip damage absorption if Hero has already exhausted 3 Super-Blocks', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 18
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 3 // Max reached

      state.lanes[0].plantMinion = createMockMinion('p0', 'Pea', 'plants', 1, 1)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Heavy', 'plants', 5, 5)

      const decision = shouldAcceptChipDamageForBlock(state, 'zombies', 0)

      expect(decision.acceptChip).toBe(false)
      expect(decision.reason).toContain('maximum 3 Super-Blocks')
    })

    it('evaluates priming across all lanes with evaluateSuperBlockPriming', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 16
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      state.lanes[0].plantMinion = createMockMinion('p0', 'Pea', 'plants', 1, 1)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Heavy', 'plants', 4, 4)

      const allDecisions = evaluateSuperBlockPriming(state, 'zombies')
      expect(allDecisions.length).toBe(5)
      expect(allDecisions[0].acceptChip).toBe(true)
      expect(allDecisions[1].acceptChip).toBe(false)
    })
  })

  // =========================================================================
  // 4. TOURNAMENT GRANDMASTER ARCHETYPE & ACTION CHOICES
  // =========================================================================
  describe('4. Tournament Grandmaster Archetype & Tactical Action Choices', () => {
    it('recognizes tournament_grandmaster as a valid archetype option', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 2
      state.zombieHand = [
        createMockCard('z_cone', 'Conehead', 'zombies', 2, 'minion', { health: 4, attack: 2 }),
      ]

      const decision = getAIDecision(state, 'zombies', 'tournament_grandmaster')
      expect(decision).toBeDefined()
      expect(decision.action).toBe('PLAY_MINION')
    })

    it('mulligan strategy guarantees early curve and keeps priority engines', () => {
      const hand = [
        createMockCard('c1', 'Card 1', 'plants', 1),
        createMockCard('c2', 'Tricarrotops', 'plants', 2, 'minion', { id: 'plant_tricarrotops' }),
        createMockCard('c3', 'Card 3', 'plants', 3),
        createMockCard('c4', 'Expensive Bomb', 'plants', 6),
      ]

      const mulligan = getAIMulliganDecision(hand, 'tournament_grandmaster', 'hero_green_shadow')

      expect(mulligan.keepIndices).toContain(0) // 1-drop kept
      expect(mulligan.keepIndices).toContain(1) // Priority engine kept
      expect(mulligan.keepIndices).toContain(2) // 3-drop kept
      expect(mulligan.swapIndices).toContain(3) // 6-cost swapped
    })

    it('places Amphibious minions in Water lane (Lane 4)', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 3
      state.zombieHand = [
        createMockCard('z_amph', 'Toxic Waste Imp', 'zombies', 2, 'minion', {
          amphibious: true,
          traits: ['amphibious'],
        }),
      ]

      const decision = getAIDecision(state, 'zombies', 'tournament_grandmaster')

      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.card?.id).toBe('z_amph')
      expect(decision.laneIndex).toBe(4) // Water lane
    })

    it('places Arm Wrestler on Heights (Lane 0)', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 2
      state.zombieHand = [
        createMockCard('zombie_arm_wrestler', 'Arm Wrestler', 'zombies', 1, 'minion'),
      ]

      const decision = getAIDecision(state, 'zombies', 'tournament_grandmaster')

      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.laneIndex).toBe(0) // Heights lane
    })

    it('targets highest priority threat plant with Rocket Science in ZOMBIE_TRICKS', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 4
      state.zombieHand = [
        createMockCard('zombie_rocket_science', 'Rocket Science', 'zombies', 3, 'trick'),
      ]

      // Lane 1 has a vanilla 4/4 plant
      state.lanes[1].plantMinion = createMockMinion('p1', 'Vanilla 4/4', 'plants', 4, 4)
      // Lane 3 has a 4/4 Double Strike Repeater (threat score much higher!)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Double Striker', 'plants', 4, 4, {
        doubleStrike: true,
      })

      const decision = getAIDecision(state, 'zombies', 'tournament_grandmaster')

      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_rocket_science')
      expect(decision.laneIndex).toBe(3) // Targeted high-threat Double Striker in Lane 3
    })

    it('targets highest priority threat with Locust Swarm in ZOMBIE_TRICKS', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 6
      state.zombieHand = [
        createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 'trick'),
      ]

      // Lane 0: 3/3 vanilla plant
      state.lanes[0].plantMinion = createMockMinion('p0', 'Vanilla', 'plants', 3, 3)
      // Lane 2: 3/4 Dino-Roar Tricarrotops
      state.lanes[2].plantMinion = createMockMinion('p2', 'Tricarrotops', 'plants', 3, 4, {
        cardId: 'plant_tricarrotops',
      })

      const decision = getAIDecision(state, 'zombies', 'tournament_grandmaster')

      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_locust_swarm')
      expect(decision.laneIndex).toBe(2) // Targets Tricarrotops
    })

    it('reserves brains during ZOMBIE_PLAY for Going Viral or high-threat removal', () => {
      const state = createInitialGameState()
      state.zombieHero.brains = 5
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Zombie', 'zombies', 2, 2)
      // High threat 5/5 plant
      state.lanes[2].plantMinion = createMockMinion('p2', 'Threat Plant', 'plants', 5, 5)

      const hand = [
        createMockCard('z_peon', 'Peon Zombie', 'zombies', 1, 'minion'),
        createMockCard('zombie_rocket_science', 'Rocket Science', 'zombies', 3, 'trick'),
      ]

      const reservation = reserveBrainsForTricks(state, hand, 5, 'tournament_grandmaster', 'expert')

      expect(reservation.reservedBrains).toBe(3)
      expect(reservation.targetTrick?.id).toBe('zombie_rocket_science')
    })

    it('evaluates board state with Super-Block bonus in tournament_grandmaster archetype', () => {
      const state = createInitialGameState()
      state.zombieHero.blockMeter = 7
      state.zombieHero.blockCount = 0

      const evalScore = evaluateBoardState(state, 'zombies', 'tournament_grandmaster')
      expect(evalScore.score).toBeDefined()
      // Should include +15 Super-Block priming bonus
      expect(evalScore.score).toBeGreaterThan(0)
    })
  })
})
