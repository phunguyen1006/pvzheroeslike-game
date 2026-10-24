import { describe, it, expect } from 'vitest'
import {
  createInitialGameState,
  createInitialHero,
  applyHeroDamage,
  resolveCombat,
  resolveSingleLaneCombat,
  drawCard,
  gameReducer,
  triggerWhenPlayed,
  triggerWhenHurt,
  triggerStartOfTurn,
  triggerDinoRoar,
  triggerWhenTrickPlayed,
  triggerWhenDestroyed,
  playEnvironment,
  applyEnvironmentBeforeCombat,
  applyEnvironmentOnPlay,
  applyEnvironmentEndOfTurn,
  executeTrick,
  executeSuperpower,
  getAIDecision,
  triggerOnDeath,
  revealGravestones,
} from '../engine/index'
import type { Minion, Card, HeroState, GameState } from '../engine/types'

describe('PvZ Heroes Comprehensive Core Game Engine Test Suite', () => {
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
    image: `/assets/${name.toLowerCase()}.png`,
    ...options,
  })

  const createMockCard = (
    id: string,
    name: string,
    side: 'plants' | 'zombies',
    cost: number,
    attack: number,
    health: number,
    options: Partial<Card> = {}
  ): Card => ({
    id,
    name,
    side,
    cost,
    attack,
    health,
    type: 'minion',
    image: `/assets/${id}.png`,
    ...options,
  })

  // ==========================================================
  // 1. COMBAT RESOLUTION & TRAITS
  // ==========================================================
  describe('Combat Resolution & Traits', () => {
    it('should mutually destroy both units when damage exceeds HP', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 2)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Basic Zombie', 'zombies', 2, 2)

      const { updatedState, result } = resolveCombat(state)
      expect(result.events.length).toBeGreaterThanOrEqual(2)
      expect(updatedState.lanes[1].plantMinion).toBeNull()
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
    })

    it('should apply Armored trait to absorb damage', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p2', 'Armored Nut', 'plants', 1, 4, { armored: 1 })
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Zombie', 'zombies', 2, 2)

      const { updatedState } = resolveCombat(state)
      expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(3)
    })

    it('should instantly destroy any minion with Deadly trait regardless of HP', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_tank', 'Wall-Nut', 'plants', 0, 6)
      state.lanes[1].zombieMinion = createMockMinion('z_deadly', 'Smelly Zombie', 'zombies', 2, 4, { deadly: true })

      const { updatedState } = resolveCombat(state)
      expect(updatedState.lanes[1].plantMinion).toBeNull()
    })

    it('should trigger Frenzy bonus attack on enemy hero when zombie destroys plant', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_weak', 'Small Plant', 'plants', 1, 1)
      state.lanes[1].zombieMinion = createMockMinion('z_smash', 'Vimpyre', 'zombies', 3, 4, { frenzy: true })

      const { updatedState, result } = resolveCombat(state)
      expect(updatedState.lanes[1].plantMinion).toBeNull()
      expect(result.plantHeroDamageTaken).toBeGreaterThanOrEqual(3)
    })

    it('should deal Strikethrough damage to both enemy minion and enemy hero', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_strike', 'Apple Saucer', 'plants', 3, 2, { strikethrough: true, bullseye: true })
      state.lanes[1].zombieMinion = createMockMinion('z_blocker', 'Zombie', 'zombies', 1, 5)

      const { updatedState, result } = resolveCombat(state)
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
      expect(result.zombieHeroDamageTaken).toBe(3)
      expect(updatedState.zombieHero.hp).toBe(17)
    })

    it('should apply Freeze trait so that frozen minion skips its attack and unfreezes', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_pea', 'Peashooter', 'plants', 2, 2)
      state.lanes[1].zombieMinion = createMockMinion('z_frozen', 'Frozen Zombie', 'zombies', 4, 5, { isFrozen: true })

      const { updatedState } = resolveCombat(state)
      // Zombie was frozen, so plant dealt 2 damage (5 - 2 = 3 HP), zombie dealt 0 damage, zombie unfroze!
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(2)
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
      expect(updatedState.lanes[1].zombieMinion?.isFrozen).toBe(false)
    })

    it('should freeze enemy zombie when damaged by a plant with Freeze trait (Snow Pea)', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_snow', 'Snow Pea', 'plants', 2, 2, { freeze: true })
      state.lanes[1].zombieMinion = createMockMinion('z_normal', 'Normal Zombie', 'zombies', 1, 5)

      const { updatedState } = resolveCombat(state)
      expect(updatedState.lanes[1].zombieMinion?.isFrozen).toBe(true)
    })

    it('should combine attacks for Team-Up plants in the same lane', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_front', 'Wall-Nut', 'plants', 0, 4)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_back', 'Peashooter', 'plants', 2, 1, { teamUp: true })
      state.lanes[1].zombieMinion = createMockMinion('z_clash', 'Zombie', 'zombies', 1, 3)

      const { updatedState } = resolveCombat(state)
      // Plant team combined attack = 0 + 2 = 2 dmg -> zombie HP: 3 - 2 = 1
      // Zombie dealt 1 dmg to front minion -> Wall-Nut HP: 4 - 1 = 3
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
      expect(updatedState.lanes[1].plantTeamUpMinion?.currentHealth).toBe(1)
    })

    it('should step combat lane-by-lane correctly with resolveSingleLaneCombat', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 2, 2)
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Basic Zombie', 'zombies', 1, 3)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 4, 3)

      // Step lane 0 only
      const lane0Res = resolveSingleLaneCombat(state, 0)
      expect(lane0Res.events.length).toBeGreaterThanOrEqual(2)
      expect(lane0Res.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(1)
      expect(lane0Res.updatedState.lanes[0].plantMinion?.currentHealth).toBe(1)
      // Lane 1 remains untouched in lane 0 resolution
      expect(lane0Res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)

      // Step lane 1 next
      const lane1Res = resolveSingleLaneCombat(lane0Res.updatedState, 1)
      expect(lane1Res.events.some(e => e.target === 'hero')).toBe(true)
      expect(lane1Res.updatedState.zombieHero.hp).toBe(16)
    })

    it('should handle STEP_COMBAT_LANE action in gameReducer', () => {
      const state = createInitialGameState()
      state.lanes[2].plantMinion = createMockMinion('p2', 'Bonk Choy', 'plants', 3, 1)

      const nextState = gameReducer(state, { type: 'STEP_COMBAT_LANE', laneIndex: 2 })
      expect(nextState.zombieHero.hp).toBe(17)
      expect(nextState.combatEvents.length).toBeGreaterThan(0)
    })

    it('should trigger Double Strike bonus attack against Zombie Hero when zombie is destroyed', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_brex', 'Bananasaurus Rex', 'plants', 3, 3, {
        doubleStrike: true,
        bullseye: true,
      })
      state.lanes[1].zombieMinion = createMockMinion('z_swab', 'Swabbie', 'zombies', 1, 1)

      const { updatedState, result } = resolveCombat(state)
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(2)
      expect(result.zombieHeroDamageTaken).toBe(3)
      expect(updatedState.zombieHero.hp).toBe(17)
      expect(result.events.some(e => e.traitsTriggered?.includes('doubleStrike'))).toBe(true)
    })

    it('should trigger Double Strike bonus attack against zombie minion when zombie survives first hit', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_brex', 'Bananasaurus Rex', 'plants', 3, 5, {
        doubleStrike: true,
      })
      state.lanes[1].zombieMinion = createMockMinion('z_tank', 'Conehead Zombie', 'zombies', 1, 5)

      const { updatedState, result } = resolveCombat(state)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
      expect(result.events.some(e => e.traitsTriggered?.includes('doubleStrike') && e.target === 'minion')).toBe(true)
    })

    it('should trigger Double Strike bonus attack in open lane against Zombie Hero twice', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_brex', 'Bananasaurus Rex', 'plants', 3, 3, {
        doubleStrike: true,
        bullseye: true,
      })

      const { updatedState, result } = resolveCombat(state)
      expect(result.zombieHeroDamageTaken).toBe(6)
      expect(updatedState.zombieHero.hp).toBe(14)
    })

    it('should absorb 2 damage with Armored 2 (Knight of the Living Dead)', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_attacker', 'Peashooter', 'plants', 3, 3)
      state.lanes[1].zombieMinion = createMockMinion('z_knight', 'Knight of the Living Dead', 'zombies', 2, 5, {
        armored: 2,
      })

      const { updatedState } = resolveCombat(state)
      expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4)
    })

    it('should bypass Super-Block meter entirely with Bullseye trait', () => {
      const state = createInitialGameState()
      state.zombieHero.blockMeter = 4
      state.lanes[1].plantMinion = createMockMinion('p_bullseye', 'Sting Bean', 'plants', 2, 2, {
        bullseye: true,
      })

      const { updatedState, result } = resolveCombat(state)
      expect(result.zombieHeroDamageTaken).toBe(2)
      expect(updatedState.zombieHero.hp).toBe(18)
      expect(updatedState.zombieHero.blockMeter).toBe(4)
    })
  })

  // ==========================================================
  // 2. SUPER-BLOCK METER & SUPERPOWERS GRANTING
  // ==========================================================
  describe('Super-Block Meter & Superpowers Granting', () => {
    it('should block 100% damage and set pendingSuperBlock when meter reaches 8 segments', () => {
      const hero: HeroState = {
        ...createInitialHero('plants', 'hero_green_shadow'),
        hp: 20,
        blockMeter: 7,
        blockCount: 0,
      }

      const res = applyHeroDamage(hero, 5, false)
      expect(res.blocked).toBe(true)
      expect(res.isSuperBlockTriggered).toBe(true)
      expect(res.actualDamage).toBe(0)
      expect(res.updatedHero.hp).toBe(20)
      expect(res.updatedHero.blockMeter).toBe(0)
      expect(res.updatedHero.blockCount).toBe(1)
    })

    it('should trigger pendingSuperBlock during combat when hero is super-blocked', () => {
      const state = createInitialGameState()
      state.plantHero.blockMeter = 7
      state.lanes[1].zombieMinion = createMockMinion('z_hitter', 'Zombie', 'zombies', 3, 3)

      const { updatedState } = resolveCombat(state)
      expect(updatedState.plantHero.blockCount).toBe(1)
      expect(updatedState.pendingSuperBlock).toBeDefined()
      expect(updatedState.pendingSuperBlock?.side).toBe('plants')
      expect(updatedState.pendingSuperBlock?.superpower.cost).toBe(0)
    })

    it('should detect super-block in resolveSingleLaneCombat and return hasSuperBlock true', () => {
      const state = createInitialGameState()
      state.plantHero.blockMeter = 7
      state.lanes[2].zombieMinion = createMockMinion('z_hitter2', 'Zombie 2', 'zombies', 4, 4)

      const res = resolveSingleLaneCombat(state, 2)
      expect(res.hasSuperBlock).toBe(true)
      expect(res.updatedState.pendingSuperBlock?.side).toBe('plants')
    })

    it('should step single lane combat and declare winner when enemy hero is defeated', () => {
      let state = createInitialGameState()
      state.zombieHero.hp = 3
      state.lanes[1].plantMinion = createMockMinion('p_lethal', 'Gatling Pea', 'plants', 5, 4, { bullseye: true })

      state = gameReducer(state, { type: 'STEP_COMBAT_LANE', laneIndex: 1 })
      expect(state.zombieHero.hp).toBe(0)
      expect(state.winner).toBe('plants')
    })

    it('should save superpower to hand with SAVE_SUPERPOWER action', () => {
      let state = createInitialGameState()
      state.pendingSuperBlock = {
        side: 'plants',
        superpower: {
          id: 'sp_precision_blast',
          name: 'Precision Blast',
          side: 'plants',
          cost: 0,
          attack: 0,
          health: 0,
          type: 'superpower',
          image: '/assets/pb.png',
        },
      }

      const initialHandSize = state.plantHand.length
      state = gameReducer(state, { type: 'SAVE_SUPERPOWER', side: 'plants' })
      expect(state.pendingSuperBlock).toBeNull()
      expect(state.plantHand.length).toBe(initialHandSize + 1)
      expect(state.plantHand.some(c => c.id === 'sp_precision_blast')).toBe(true)
    })
  })

  // ==========================================================
  // 3. CARD ABILITIES TRIGGER SYSTEM
  // ==========================================================
  describe('Card Abilities Trigger System', () => {
    it('should trigger Bonk Choy +1 attack on turn played', () => {
      const state = createInitialGameState()
      const bonkChoy = createMockMinion('bc', 'Bonk Choy', 'plants', 2, 1, { cardId: 'plant_bonk_choy' })
      state.lanes[1].plantMinion = bonkChoy

      const res = triggerWhenPlayed(state, bonkChoy, 1, 'plants')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(3)
    })

    it('should trigger Kernel Corn 4 damage to all zombies on board', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Imp', 'zombies', 1, 2)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Knight', 'zombies', 5, 6)
      const kernelCorn = createMockMinion('kc', 'Kernel Corn', 'plants', 6, 6, { cardId: 'plant_kernel_corn' })

      const res = triggerWhenPlayed(state, kernelCorn, 2, 'plants')
      // Imp has 2 HP -> destroyed
      expect(res.updatedState.lanes[0].zombieMinion).toBeNull()
      // Knight has 6 HP - 4 = 2 HP
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
    })

    it('should trigger The Great Zucchini transforming all zombies into 1/1 Browncoat Zombies', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Gargantuar', 'zombies', 5, 8)
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Super Zombie', 'zombies', 6, 6)
      const zucchini = createMockMinion('zuc', 'The Great Zucchini', 'plants', 7, 7, { cardId: 'plant_the_great_zucchini' })

      const res = triggerWhenPlayed(state, zucchini, 1, 'plants')
      expect(res.updatedState.lanes[0].zombieMinion?.name).toBe('Browncoat Zombie')
      expect(res.updatedState.lanes[0].zombieMinion?.currentAttack).toBe(1)
      expect(res.updatedState.lanes[0].zombieMinion?.currentHealth).toBe(1)
      expect(res.updatedState.lanes[2].zombieMinion?.name).toBe('Browncoat Zombie')
    })

    it('should trigger Conga Zombie 1 damage on play', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Sunflower', 'plants', 0, 1)
      const conga = createMockMinion('conga', 'Conga Zombie', 'zombies', 2, 2, { cardId: 'zombie_conga_zombie' })
      state.lanes[1].zombieMinion = conga

      const res = triggerWhenPlayed(state, conga, 1, 'zombies')
      // Sunflower has 1 HP - 1 = 0 -> destroyed!
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
    })

    it('should trigger Ra Zombie stealing 2 Sun from Plant Hero', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 5
      const ra = createMockMinion('ra', 'Ra Zombie', 'zombies', 3, 4, { cardId: 'zombie_ra_zombie' })

      const res = triggerWhenPlayed(state, ra, 1, 'zombies')
      expect(res.updatedState.plantHero.sun).toBe(3)
    })

    it('should trigger Zombot 1000 destroying all plants on board', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 2)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 6)
      const zombot = createMockMinion('zombot', 'Zombot 1000', 'zombies', 9, 9, { cardId: 'zombie_zombot_1000' })

      const res = triggerWhenPlayed(state, zombot, 3, 'zombies')
      expect(res.updatedState.lanes[0].plantMinion).toBeNull()
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
      expect(res.updatedState.lanes[2].plantMinion).toBeNull()
    })

    it('should trigger Astro-Shroom 1 Bullseye face damage when another plant is played', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('astro', 'Astro-Shroom', 'plants', 1, 1, { cardId: 'plant_astro_shroom' })
      const newPlant = createMockMinion('p_new', 'Shroom', 'plants', 1, 1, { cardId: 'plant_button_mushroom' })

      const res = triggerWhenPlayed(state, newPlant, 1, 'plants')
      expect(res.updatedState.zombieHero.hp).toBe(19)
    })

    it('should trigger Arm Wrestler +1/+1 when a plant is played in its lane', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('arm', 'Arm Wrestler', 'zombies', 2, 2, { cardId: 'zombie_arm_wrestler' })
      const plant = createMockMinion('p_opp', 'Peashooter', 'plants', 1, 1, { cardId: 'plant_peashooter' })

      const res = triggerWhenPlayed(state, plant, 2, 'plants')
      expect(res.updatedState.lanes[2].zombieMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(3)
    })

    it('should trigger Newspaper Zombie +4 ATK and Frenzy when hurt', () => {
      const state = createInitialGameState()
      const newsZombie = createMockMinion('news', 'Newspaper Zombie', 'zombies', 1, 4, { cardId: 'zombie_newspaper_zombie' })
      state.lanes[1].zombieMinion = newsZombie

      const res = triggerWhenHurt(state, newsZombie, 1)
      expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(5)
      expect(res.updatedState.lanes[1].zombieMinion?.frenzy).toBe(true)
    })

    it('should trigger Sunflower +1 Sun at start of turn', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 2
      state.lanes[1].plantMinion = createMockMinion('sunflower', 'Sunflower', 'plants', 0, 1, { cardId: 'plant_sunflower' })

      const res = triggerStartOfTurn(state, 'plants')
      expect(res.updatedState.plantHero.sun).toBe(3)
    })

    it('should trigger Doubled Mint doubling attack and health at start of turn', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('mint', 'Doubled Mint', 'plants', 2, 4, { cardId: 'plant_doubled_mint' })

      const res = triggerStartOfTurn(state, 'plants')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(8)
    })

    it('should trigger Bananasaurus Rex Dino-Roar +1/+1 on card draw', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('rex', 'Bananasaurus Rex', 'plants', 3, 3, { cardId: 'plant_bananasaurus_rex' })

      const res = triggerDinoRoar(state, 'plants')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
    })

    it('should trigger Black-Eyed Pea +1/+1 and Trickster discount when a Zombie Trick is played', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('bep', 'Black-Eyed Pea', 'plants', 2, 3, { cardId: 'plant_black_eyed_pea' })
      state.zombieHand = [
        createMockCard('zombie_trickster', 'Trickster', 'zombies', 7, 6, 6),
      ]
      const trickCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' })

      const res = triggerWhenTrickPlayed(state, trickCard, 'zombies')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      // Trickster cost should decrease from 7 to 6
      expect(res.updatedState.zombieHand[0].cost).toBe(6)
    })

    it('should trigger Valkyrie +2 attack in zombie hand when a zombie minion is destroyed', () => {
      const state = createInitialGameState()
      state.zombieHand = [
        createMockCard('zombie_valkyrie', 'Valkyrie', 'zombies', 3, 0, 6),
      ]
      const dyingZombie = createMockMinion('z_dead', 'Basic Zombie', 'zombies', 1, 1, { cardId: 'zombie_basic' })

      const res = triggerWhenDestroyed(state, dyingZombie, 1, 'zombies')
      expect(res.updatedState.zombieHand[0].attack).toBe(2)
      expect(res.events.some(e => e.includes('Valkyrie'))).toBe(true)
    })

    it('should trigger Potato Mine 2 damage to zombie in same lane when destroyed', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_target', 'Conehead', 'zombies', 2, 4)
      const potatoMine = createMockMinion('pm', 'Potato Mine', 'plants', 0, 1, { cardId: 'plant_potato_mine' })

      const res = triggerWhenDestroyed(state, potatoMine, 2, 'plants')
      // Conehead had 4 HP - 2 = 2 HP
      expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(2)
      expect(res.events.some(e => e.includes('Potato Mine'))).toBe(true)
    })

    it('should trigger Punish-Shroom retaliation damage when mushroom is destroyed', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('ps', 'Punish-Shroom', 'plants', 2, 2, { cardId: 'plant_punish_shroom' })
      state.lanes[1].zombieMinion = createMockMinion('z_victim', 'Imp', 'zombies', 1, 2)
      const astroShroom = createMockMinion('as', 'Astro-Shroom', 'plants', 1, 1, { cardId: 'plant_astro_shroom' })

      const res = triggerWhenDestroyed(state, astroShroom, 1, 'plants')
      expect(res.events.some(e => e.includes('Punish-Shroom'))).toBe(true)
    })
  })

  // ==========================================================
  // 4. ENVIRONMENT MECHANICS
  // ==========================================================
  describe('Environment Mechanics', () => {
    it('should play Area 22 giving zombies in lane +2/+2 and Frenzy', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Basic Zombie', 'zombies', 1, 2)
      const area22 = createMockCard('zombie_area_22', 'Area 22', 'zombies', 2, 0, 0, { type: 'environment' })

      const res = playEnvironment(state, area22, 1, 'zombies')
      expect(res.updatedState.lanes[1].environment?.id).toBe('zombie_area_22')
      expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4)
      expect(res.updatedState.lanes[1].zombieMinion?.frenzy).toBe(true)
    })

    it('should play Total Eclipse giving plants in lane -1/-1', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 2, 2)
      const totalEclipse = createMockCard('zombie_total_eclipse', 'Total Eclipse', 'zombies', 2, 0, 0, { type: 'environment' })

      const res = playEnvironment(state, totalEclipse, 1, 'zombies')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(1)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(1)
    })

    it('should apply Spikeweed Sector dealing 2 damage to zombie before combat', () => {
      const state = createInitialGameState()
      state.lanes[1].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        description: 'Do 2 damage to zombie here before combat',
        image: '/assets/spikeweed.png',
      }
      state.lanes[1].zombieMinion = createMockMinion('z_spiked', 'Imp', 'zombies', 2, 3)

      const res = applyEnvironmentBeforeCombat(state, 1)
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(1)
    })

    it('should apply Medulla Nebula giving +2 Brains when a zombie is played', () => {
      const state = createInitialGameState()
      state.zombieHero.brains = 2
      state.lanes[1].environment = {
        id: 'zombie_medulla_nebula',
        name: 'Medulla Nebula',
        side: 'zombies',
        description: '+2 Brains when a zombie is played here',
        image: '/assets/medulla.png',
      }

      const res = applyEnvironmentOnPlay(state, 1, 'zombies')
      expect(res.updatedState.zombieHero.brains).toBe(4)
    })

    it('should apply Solar Winds spawning a Sunflower at end of turn in open lane', () => {
      const state = createInitialGameState()
      state.lanes[1].environment = {
        id: 'plant_solar_winds',
        name: 'Solar Winds',
        side: 'plants',
        description: 'End of turn: make a sunflower here if no zombies',
        image: '/assets/solar_winds.png',
      }
      // Lane 1 is currently empty

      const res = applyEnvironmentEndOfTurn(state)
      expect(res.updatedState.lanes[1].plantMinion?.name).toBe('Sunflower')
      expect(res.updatedState.lanes[1].plantMinion?.teamUp).toBe(true)
    })
  })

  // ==========================================================
  // 5. SIGNATURE SUPERPOWERS SUITE
  // ==========================================================
  describe('Signature Superpowers Suite (22 Heroes)', () => {
    it('should execute Sunburn (Solar Flare): 2 damage to zombie hero and +1 permanent max sun', () => {
      const state = createInitialGameState()
      state.plantHero.maxSun = 1
      state.plantHero.sun = 1

      const res = executeSuperpower(state, 'sp_sunburn', 'plants')
      expect(res.updatedState.zombieHero.hp).toBe(18)
      expect(res.updatedState.plantHero.maxSun).toBe(2)
      expect(res.updatedState.plantHero.sun).toBe(2)
    })

    it('should execute Uncrackable (Wall-Knight): invulnerable shield and card draw', () => {
      const state = createInitialGameState()
      state.plantDeck = [createMockCard('c_draw', 'Drawn Card', 'plants', 1, 1, 1)]
      const initialHand = state.plantHand.length

      const res = executeSuperpower(state, 'sp_uncrackable', 'plants')
      expect(res.updatedState.plantHero.isShieldActive).toBe(true)
      expect(res.updatedState.plantHand.length).toBe(initialHand + 1)
    })

    it('should execute Goatify (Rose): transforms highest attack zombie into 1/1 Goat', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Small Zombie', 'zombies', 2, 2)
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Giant Zombie', 'zombies', 6, 7)

      const res = executeSuperpower(state, 'sp_goatify', 'plants')
      expect(res.updatedState.lanes[2].zombieMinion?.name).toBe('Goat')
      expect(res.updatedState.lanes[2].zombieMinion?.currentAttack).toBe(1)
      expect(res.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(1)
      expect(res.updatedState.lanes[0].zombieMinion?.name).toBe('Small Zombie')
    })

    it('should execute Devour (Chompzilla): destroys lowest health zombie', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z1', 'Healthy Zombie', 'zombies', 3, 5)
      state.lanes[1].zombieMinion = createMockMinion('z2', 'Weak Zombie', 'zombies', 2, 1)

      const res = executeSuperpower(state, 'sp_devour', 'plants')
      expect(res.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(res.updatedState.lanes[0].zombieMinion).not.toBeNull()
    })

    it('should execute Carried Away (Super Brainz): bonus attack on plant hero', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z_sb', 'Brainy Zombie', 'zombies', 4, 4, { bullseye: true })

      const res = executeSuperpower(state, 'sp_carried_away', 'zombies', 1)
      expect(res.updatedState.plantHero.hp).toBe(16)
    })

    it('should execute Shrink Ray (Rustbolt): reduces plant attack by 3 and draws a card', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_big', 'Big Plant', 'plants', 5, 5)
      state.zombieDeck = [createMockCard('z_card', 'Zombie Card', 'zombies', 1, 1, 1)]

      const res = executeSuperpower(state, 'sp_shrink_ray', 'zombies')
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(2)
      expect(res.updatedState.zombieHand.length).toBeGreaterThan(0)
    })

    it('should execute Frozen Tundra (Brain Freeze): freezes all plants on ground lanes', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p_heights', 'Heights Plant', 'plants', 2, 2) // Heights
      state.lanes[1].plantMinion = createMockMinion('p_ground1', 'Ground Plant 1', 'plants', 2, 2) // Ground
      state.lanes[2].plantMinion = createMockMinion('p_ground2', 'Ground Plant 2', 'plants', 2, 2) // Ground

      const res = executeSuperpower(state, 'sp_frozen_tundra', 'zombies')
      expect(res.updatedState.lanes[0].plantMinion?.isFrozen).toBeFalsy() // Heights not frozen
      expect(res.updatedState.lanes[1].plantMinion?.isFrozen).toBe(true)
      expect(res.updatedState.lanes[2].plantMinion?.isFrozen).toBe(true)
    })

    it('should execute Terror-Former 10,000 (Huge-Gigantacus): reduces card costs in zombie hand by 1', () => {
      const state = createInitialGameState()
      state.zombieHand = [
        createMockCard('z1', 'Card 1', 'zombies', 3, 2, 2),
        createMockCard('z2', 'Card 2', 'zombies', 1, 1, 1),
      ]

      const res = executeSuperpower(state, 'sp_terror_former_10000', 'zombies')
      expect(res.updatedState.zombieHand[0].cost).toBe(2)
      expect(res.updatedState.zombieHand[1].cost).toBe(0)
    })
  })

  // ==========================================================
  // 6. MULLIGAN SYSTEM & REDUCER INTEGRATION
  // ==========================================================
  describe('Mulligan System & Game Reducer', () => {
    it('should draw a card from deck to hand properly', () => {
      const deck: Card[] = [createMockCard('c1', 'Card 1', 'plants', 1, 1, 1)]
      const hand: Card[] = []
      const res = drawCard(deck, hand)
      expect(res.drawnCard?.name).toBe('Card 1')
      expect(res.newHand.length).toBe(1)
    })

    it('should swap specified cards in hand during Mulligan', () => {
      let state = createInitialGameState()
      state.phase = 'MULLIGAN'
      const originalFirstCard = state.plantHand[0]
      expect(originalFirstCard).toBeDefined()

      state = gameReducer(state, { type: 'MULLIGAN_SWAP', side: 'plants', cardIndices: [0] })
      expect(state.plantHand.length).toBe(5) // 4 cards + 1 superpower
      expect(state.combatLog[0]).toContain('Mulligan')
    })

    it('should transition to ZOMBIE_PLAY on FINISH_MULLIGAN', () => {
      let state = createInitialGameState()
      state.phase = 'MULLIGAN'

      state = gameReducer(state, { type: 'FINISH_MULLIGAN', side: 'plants' })
      expect(state.phase).toBe('ZOMBIE_PLAY')
    })
  })

  // ==========================================================
  // 7. TRICK SYSTEM INTEGRATION
  // ==========================================================
  describe('Trick Execution System Integration', () => {
    it('should execute Squash destroying any target zombie', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_garg', 'Gargantuar', 'zombies', 5, 8)
      const squash = createMockCard('plant_squash', 'Squash', 'plants', 5, 0, 0, { type: 'trick' })
      state.plantHero.sun = 5
      state.plantHand = [squash]

      const res = executeTrick(state, squash, 'plants', 2)
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[2].zombieMinion).toBeNull()
    })

    it('should execute Locust Swarm destroying any target plant', () => {
      const state = createInitialGameState()
      state.lanes[3].plantMinion = createMockMinion('p_tank', 'Soul Patch', 'plants', 5, 10)
      const locust = createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, { type: 'trick' })
      state.zombieHero.brains = 5
      state.zombieHand = [locust]

      const res = executeTrick(state, locust, 'zombies', 3)
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[3].plantMinion).toBeNull()
    })

    it('should execute Weed Spray destroying all plants with 2 Attack or less', () => {
      const state = createInitialGameState()
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 2)
      state.lanes[2].plantMinion = createMockMinion('p2', 'Snapdragon', 'plants', 3, 3) // 3 ATK -> survives!
      const weedSpray = createMockCard('zombie_weed_spray', 'Weed Spray', 'zombies', 3, 0, 0, { type: 'trick' })
      state.zombieHero.brains = 3
      state.zombieHand = [weedSpray]

      const res = executeTrick(state, weedSpray, 'zombies')
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[0].plantMinion).toBeNull()
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
      expect(res.updatedState.lanes[2].plantMinion).not.toBeNull()
    })

    it('should execute Bad Moon Rising transforming all zombies into Zombot 1000', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Imp', 'zombies', 1, 1)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
      const bmr = createMockCard('zombie_bad_moon_rising', 'Bad Moon Rising', 'zombies', 7, 0, 0, { type: 'trick' })
      state.zombieHero.brains = 7
      state.zombieHand = [bmr]

      const res = executeTrick(state, bmr, 'zombies')
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[0].zombieMinion?.name).toBe('Zombot 1000')
      expect(res.updatedState.lanes[0].zombieMinion?.currentAttack).toBe(9)
      expect(res.updatedState.lanes[1].zombieMinion?.name).toBe('Zombot 1000')
    })
  })

  // ==========================================================
  // 8. HEURISTIC AI BOT DECISION ENGINE
  // ==========================================================
  describe('Heuristic AI Bot Decision Making', () => {
    it('should pick an amphibious minion for water lane when available', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 1
      state.zombieHand = [
        createMockCard('z_amph', 'Swabbie', 'zombies', 0, 1, 1, { amphibious: true }),
      ]

      const decision = getAIDecision(state, 'zombies')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.card?.id).toBe('z_amph')
      expect(decision.laneIndex).toBe(4) // Water lane
    })

    it('should use removal trick against highest attack plant in Zombie Tricks phase', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5
      state.lanes[1].plantMinion = createMockMinion('p_weak', 'Sunflower', 'plants', 0, 1)
      state.lanes[2].plantMinion = createMockMinion('p_boss', 'Gatling Pea', 'plants', 5, 4)
      state.zombieHand = [
        createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, { type: 'trick' }),
      ]

      const decision = getAIDecision(state, 'zombies')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.laneIndex).toBe(2) // Targets lane with 5-attack plant
    })

    it('should prioritize lethal direct damage on enemy Hero with Bungee Plumber', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 1
      state.plantHero.hp = 2 // In lethal range
      state.zombieHand = [
        createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' }),
      ]

      const decision = getAIDecision(state, 'zombies')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.targetHero).toBe(true)
    })

    it('should target high attack plant with Rocket Science', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Repeater Buffed', 'plants', 4, 3)
      state.zombieHand = [
        createMockCard('zombie_rocket_science', 'Rocket Science', 'zombies', 3, 0, 0, { type: 'trick' }),
      ]

      const decision = getAIDecision(state, 'zombies')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.laneIndex).toBe(3) // Targets 4 ATK plant
    })

    it('should trigger Weed Spray when multiple small plants exist', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Sunflower', 'plants', 0, 1)
      state.zombieHand = [
        createMockCard('zombie_weed_spray', 'Weed Spray', 'zombies', 3, 0, 0, { type: 'trick' }),
      ]

      const decision = getAIDecision(state, 'zombies')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_weed_spray')
    })

    it('should make smart Plant bot decisions countering Zombies in lane', () => {
      const state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 2
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
      state.plantHand = [
        createMockCard('plant_bonk_choy', 'Bonk Choy', 'plants', 1, 2, 1),
      ]

      const decision = getAIDecision(state, 'plants')
      expect(decision.action).toBe('PLAY_MINION')
      expect(decision.laneIndex).toBe(1) // Blocks lane 1 with zombie
    })
  })

  // ==========================================================
  // 9. ADVANCED COMBAT INTERACTIONS & EDGE-CASES (QA BOT)
  // ==========================================================
  describe('Advanced Combat Interactions & Edge-Cases (QA Suite)', () => {
    // --------------------------------------------------------
    // (1) BULLSEYE + STRIKETHROUGH COMBINATIONS
    // --------------------------------------------------------
    describe('Bullseye + Strikethrough Trait Combination', () => {
      it('should hit opposing minion AND enemy hero with Strikethrough while Bullseye completely prevents block meter charge', () => {
        const state = createInitialGameState()
        state.zombieHero.hp = 20
        state.zombieHero.blockMeter = 4
        // Plant has 3 ATK, 4 HP, Strikethrough & Bullseye
        state.lanes[1].plantMinion = createMockMinion('p_combo', 'Strikethrough Bullseye Plant', 'plants', 3, 4, {
          strikethrough: true,
          bullseye: true,
        })
        // Zombie has 1 ATK, 5 HP
        state.lanes[1].zombieMinion = createMockMinion('z_tank', 'Conehead Zombie', 'zombies', 1, 5)

        const { updatedState, result } = resolveCombat(state)
        // Zombie minion took 3 combat damage: 5 - 3 = 2 HP
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
        // Plant minion took 1 combat damage: 4 - 1 = 3 HP
        expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
        // Strikethrough dealt 3 piercing damage directly to Zombie Hero
        expect(result.zombieHeroDamageTaken).toBe(3)
        expect(updatedState.zombieHero.hp).toBe(17)
        // Bullseye ensured the Zombie Hero block meter did NOT charge at all (remains exactly 4)
        expect(updatedState.zombieHero.blockMeter).toBe(4)
      })

      it('should bypass Super-Block trigger even if hero block meter is at 7/8 when damaged by Bullseye + Strikethrough', () => {
        const state = createInitialGameState()
        state.zombieHero.hp = 20
        state.zombieHero.blockMeter = 7
        state.lanes[1].plantMinion = createMockMinion('p_combo', 'Strikethrough Bullseye Plant', 'plants', 4, 3, {
          strikethrough: true,
          bullseye: true,
        })
        state.lanes[1].zombieMinion = createMockMinion('z_blocker', 'Zombie Blocker', 'zombies', 1, 6)

        const res = resolveSingleLaneCombat(state, 1)
        // Bullseye must completely bypass Super-Block even when meter is at 7/8
        expect(res.hasSuperBlock).toBe(false)
        expect(res.updatedState.pendingSuperBlock).toBeNull()
        expect(res.updatedState.zombieHero.hp).toBe(16)
        expect(res.updatedState.zombieHero.blockMeter).toBe(7) // Block meter untouched!
        expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
      })

      it('should apply Bullseye and Strikethrough correctly for Zombie minion attacking Plant Hero', () => {
        const state = createInitialGameState()
        state.plantHero.hp = 20
        state.plantHero.blockMeter = 5
        state.lanes[2].plantMinion = createMockMinion('p_nut', 'Wall-Nut', 'plants', 0, 6)
        state.lanes[2].zombieMinion = createMockMinion('z_combo', 'Line Dancing Zombie', 'zombies', 3, 3, {
          strikethrough: true,
          bullseye: true,
        })

        const { updatedState, result } = resolveCombat(state)
        expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(3)
        expect(result.plantHeroDamageTaken).toBe(3)
        expect(updatedState.plantHero.hp).toBe(17)
        // Plant Hero block meter remains 5 without any increase
        expect(updatedState.plantHero.blockMeter).toBe(5)
      })

      it('should deal direct face damage without charging block meter in an open lane with Bullseye + Strikethrough', () => {
        const state = createInitialGameState()
        state.zombieHero.hp = 20
        state.zombieHero.blockMeter = 3
        state.lanes[0].plantMinion = createMockMinion('p_open', 'Open Lane Striker', 'plants', 3, 3, {
          strikethrough: true,
          bullseye: true,
        })

        const { updatedState, result } = resolveCombat(state)
        expect(result.zombieHeroDamageTaken).toBe(3)
        expect(updatedState.zombieHero.hp).toBe(17)
        expect(updatedState.zombieHero.blockMeter).toBe(3)
      })
    })

    // --------------------------------------------------------
    // (2) ARMORED REDUCING DAMAGE ACROSS MULTIPLE SOURCES
    // --------------------------------------------------------
    describe('Armored Trait Across Multiple Damage Sources', () => {
      it('should absorb damage independently on each strike when facing Double Strike (Armored applied per damage instance)', () => {
        const state = createInitialGameState()
        // Plant has 3 ATK, 6 HP, and Double Strike
        state.lanes[1].plantMinion = createMockMinion('p_ds', 'Repeater DS', 'plants', 3, 6, {
          doubleStrike: true,
        })
        // Zombie has 1 ATK, 6 HP, and Armored 1
        state.lanes[1].zombieMinion = createMockMinion('z_armored', 'Armored Zombie', 'zombies', 1, 6, {
          armored: 1,
        })

        const { updatedState, result } = resolveCombat(state)
        // Strike 1: 3 ATK - 1 Armored = 2 damage taken (6 - 2 = 4 HP). Zombie hits plant for 1 (6 - 1 = 5 HP).
        // Strike 2 (Double Strike): 3 ATK - 1 Armored = 2 damage taken again (4 - 2 = 2 HP).
        // Armored reduced damage by 1 on EACH strike (total 2 damage absorbed)!
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
        expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(5)
        const plantAttacks = result.events.filter(e => e.target === 'minion' && e.attackerSide === 'plants')
        expect(plantAttacks).toHaveLength(2)
        expect(result.events.some(e => e.traitsTriggered?.includes('doubleStrike'))).toBe(true)
      })

      it('should completely absorb repeated low-damage strikes when damage <= Armored rating', () => {
        const state = createInitialGameState()
        // Plant has 2 ATK, 5 HP, and Double Strike
        state.lanes[1].plantMinion = createMockMinion('p_pea', 'Low Atk DS Plant', 'plants', 2, 5, {
          doubleStrike: true,
        })
        // Zombie has Armored 2 and 4 HP
        state.lanes[1].zombieMinion = createMockMinion('z_knight', 'Knight of the Living Dead', 'zombies', 1, 4, {
          armored: 2,
        })

        const { updatedState } = resolveCombat(state)
        // Strike 1: max(0, 2 - 2) = 0 damage
        // Strike 2: max(0, 2 - 2) = 0 damage
        // Zombie minion took 0 damage across both strikes!
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4)
      })

      it('should reduce damage across distinct sources: pre-combat environment followed by combat strike', () => {
        const state = createInitialGameState()
        state.lanes[1].environment = {
          id: 'plant_spikeweed_sector',
          name: 'Spikeweed Sector',
          side: 'plants',
          description: 'Do 2 damage to zombie here before combat',
          image: '/assets/spikeweed.png',
        }
        state.lanes[1].plantMinion = createMockMinion('p_bonk', 'Bonk Choy', 'plants', 3, 4)
        state.lanes[1].zombieMinion = createMockMinion('z_tank', 'Armored Conehead', 'zombies', 1, 6, {
          armored: 1,
        })

        const { updatedState } = resolveCombat(state)
        // Pre-combat: Spikeweed Sector deals 2 environmental damage -> 6 - 2 = 4 HP
        // Combat strike: Plant 3 ATK - 1 Armored = 2 damage -> 4 - 2 = 2 HP
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
      })

      it('should reduce damage dealt to Armored Plant minion from enemy Zombie', () => {
        const state = createInitialGameState()
        // Plant has Armored 2 and 5 HP
        state.lanes[1].plantMinion = createMockMinion('p_wall', 'Armored Plant Tank', 'plants', 1, 5, {
          armored: 2,
        })
        // Zombie has 4 ATK
        state.lanes[1].zombieMinion = createMockMinion('z_smash', 'Smash Zombie', 'zombies', 4, 4)

        const { updatedState } = resolveCombat(state)
        // Zombie deals 4 - 2 (Armored) = 2 damage to Plant -> 5 - 2 = 3 HP
        // Plant deals 1 damage to Zombie -> 4 - 1 = 3 HP
        expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
      })
    })

    // --------------------------------------------------------
    // (3) SUPER-BLOCK TRIGGER AT 8/8 & 100% DAMAGE NEGATION
    // --------------------------------------------------------
    describe('Super-Block Meter 8/8 Precision & 100% Damage Negation', () => {
      it('should trigger Super-Block exactly when meter reaches 8/8 and block 100% of lethal incoming damage', () => {
        const hero: HeroState = {
          ...createInitialHero('plants', 'hero_green_shadow'),
          hp: 5,
          blockMeter: 7,
          blockCount: 0,
        }

        // Incoming 20 damage (would be lethal), non-bullseye
        const res = applyHeroDamage(hero, 20, false)
        expect(res.blocked).toBe(true)
        expect(res.isSuperBlockTriggered).toBe(true)
        expect(res.actualDamage).toBe(0) // 100% of the 20 damage blocked!
        expect(res.updatedHero.hp).toBe(5) // Hero took ZERO damage!
        expect(res.updatedHero.blockMeter).toBe(0) // Meter reset to 0
        expect(res.updatedHero.blockCount).toBe(1) // Block count incremented
      })

      it('should create pendingSuperBlock with 0-cost superpower during single lane combat when meter reaches 8/8', () => {
        const state = createInitialGameState()
        state.plantHero.hp = 12
        state.plantHero.blockMeter = 7
        state.lanes[2].zombieMinion = createMockMinion('z_heavy', 'Gargantuar', 'zombies', 8, 8)

        const res = resolveSingleLaneCombat(state, 2)
        expect(res.hasSuperBlock).toBe(true)
        expect(res.updatedState.plantHero.hp).toBe(12) // 0 damage taken
        expect(res.updatedState.pendingSuperBlock).toBeDefined()
        expect(res.updatedState.pendingSuperBlock?.side).toBe('plants')
        expect(res.updatedState.pendingSuperBlock?.superpower.cost).toBe(0)
        expect(res.updatedState.pendingSuperBlock?.superpower.type).toBe('superpower')
        expect(res.updatedState.plantHero.blockCount).toBe(1)
        expect(res.updatedState.plantHero.blockMeter).toBe(0)
      })

      it('should exhaust Super-Block protection after 3 blocks (blockCount = 3), taking full damage even with full meter', () => {
        const hero: HeroState = {
          ...createInitialHero('plants', 'hero_green_shadow'),
          hp: 20,
          blockMeter: 7,
          blockCount: 3, // Already used all 3 Super-Blocks
        }

        const res = applyHeroDamage(hero, 5, false)
        expect(res.blocked).toBe(false)
        expect(res.isSuperBlockTriggered).toBe(false)
        expect(res.actualDamage).toBe(5)
        expect(res.updatedHero.hp).toBe(15)
        expect(res.updatedHero.blockCount).toBe(3) // Stays at 3
      })

      it('should completely prevent Super-Block from triggering when damage source has Bullseye trait even at 7/8 meter', () => {
        const hero: HeroState = {
          ...createInitialHero('zombies', 'hero_super_brainz'),
          hp: 20,
          blockMeter: 7,
          blockCount: 0,
        }

        const res = applyHeroDamage(hero, 6, true) // hasBullseye = true
        expect(res.blocked).toBe(false)
        expect(res.isSuperBlockTriggered).toBe(false)
        expect(res.actualDamage).toBe(6)
        expect(res.updatedHero.hp).toBe(14)
        expect(res.updatedHero.blockMeter).toBe(7) // Meter remains 7, no charge
      })
    })

    // --------------------------------------------------------
    // (4) DOUBLE STRIKE TRIGGERS (OPEN LANE & SURVIVING MINION)
    // --------------------------------------------------------
    describe('Double Strike Triggers (Open Lane & Surviving Minion)', () => {
      it('should attack Zombie Hero twice in an open lane when Double Strike is active', () => {
        const state = createInitialGameState()
        state.zombieHero.hp = 20
        // Plant in open lane (no zombie in lane 1) with Double Strike & Bullseye
        state.lanes[1].plantMinion = createMockMinion('p_ds_open', 'Repeater Open', 'plants', 4, 3, {
          doubleStrike: true,
          bullseye: true,
        })

        const { updatedState, result } = resolveCombat(state)
        // First strike: 4 damage to Zombie Hero
        // Second strike (Double Strike): 4 damage to Zombie Hero
        // Total damage dealt: 4 + 4 = 8!
        expect(result.zombieHeroDamageTaken).toBe(8)
        expect(updatedState.zombieHero.hp).toBe(12)
        const doubleStrikeEvents = result.events.filter(e => e.traitsTriggered?.includes('doubleStrike'))
        expect(doubleStrikeEvents).toHaveLength(1)
        expect(doubleStrikeEvents[0].target).toBe('hero')
        expect(doubleStrikeEvents[0].damageDealt).toBe(4)
      })

      it('should strike surviving enemy minion a second time with Double Strike', () => {
        const state = createInitialGameState()
        // Plant: 3 ATK, 6 HP, Double Strike
        state.lanes[2].plantMinion = createMockMinion('p_ds', 'Bananasaurus Rex', 'plants', 3, 6, {
          doubleStrike: true,
        })
        // Zombie: 2 ATK, 8 HP (high HP, survives first strike)
        state.lanes[2].zombieMinion = createMockMinion('z_tank', 'Gargantuar', 'zombies', 2, 8)

        const { updatedState, result } = resolveCombat(state)
        // First strike: Plant deals 3 to Zombie (8 - 3 = 5 HP), Zombie deals 2 to Plant (6 - 2 = 4 HP)
        // Both survive!
        // Double Strike triggers: Plant attacks Zombie minion again for 3 damage -> 5 - 3 = 2 HP
        expect(updatedState.lanes[2].plantMinion?.currentHealth).toBe(4)
        expect(updatedState.lanes[2].zombieMinion?.currentHealth).toBe(2)

        const dsMinionEvent = result.events.find(
          e => e.traitsTriggered?.includes('doubleStrike') && e.target === 'minion'
        )
        expect(dsMinionEvent).toBeDefined()
        expect(dsMinionEvent?.damageDealt).toBe(3)
        expect(dsMinionEvent?.isLethal).toBe(false)
      })

      it('should destroy surviving enemy minion if the second Double Strike hit is lethal', () => {
        const state = createInitialGameState()
        // Plant: 3 ATK, 5 HP, Double Strike
        state.lanes[1].plantMinion = createMockMinion('p_ds', 'Repeater', 'plants', 3, 5, {
          doubleStrike: true,
        })
        // Zombie: 1 ATK, 5 HP (survives first hit of 3 HP -> 2 HP left, dies on second hit of 3 HP)
        state.lanes[1].zombieMinion = createMockMinion('z_cone', 'Conehead', 'zombies', 1, 5)

        const { updatedState, result } = resolveCombat(state)
        // Plant survives: 5 - 1 = 4 HP
        expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
        // Zombie is destroyed by the second Double Strike hit!
        expect(updatedState.lanes[1].zombieMinion).toBeNull()

        const dsEvent = result.events.find(
          e => e.traitsTriggered?.includes('doubleStrike') && e.target === 'minion'
        )
        expect(dsEvent).toBeDefined()
        expect(dsEvent?.isLethal).toBe(true)
      })

      it('should NOT trigger Double Strike if the plant minion is destroyed in the first simultaneous strike', () => {
        const state = createInitialGameState()
        // Plant: 3 ATK, 2 HP, Double Strike
        state.lanes[1].plantMinion = createMockMinion('p_glass', 'Glass Cannon Plant', 'plants', 3, 2, {
          doubleStrike: true,
        })
        // Zombie: 4 ATK, 6 HP (destroys plant in first strike)
        state.lanes[1].zombieMinion = createMockMinion('z_strong', 'Strong Zombie', 'zombies', 4, 6)

        const { updatedState, result } = resolveCombat(state)
        // Plant destroyed in first strike (2 - 4 <= 0)
        expect(updatedState.lanes[1].plantMinion).toBeNull()
        // Zombie takes only 1 strike (6 - 3 = 3 HP) and survives
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3)
        // Double Strike should NOT have triggered
        const dsEvents = result.events.filter(e => e.traitsTriggered?.includes('doubleStrike'))
        expect(dsEvents).toHaveLength(0)
      })

      it('should hit surviving minion AND pierce to Zombie Hero when plant has both Double Strike and Strikethrough', () => {
        const state = createInitialGameState()
        state.zombieHero.hp = 20
        // Plant: 3 ATK, 5 HP, Double Strike, Strikethrough, Bullseye
        state.lanes[1].plantMinion = createMockMinion('p_combo', 'Super Plant', 'plants', 3, 5, {
          doubleStrike: true,
          strikethrough: true,
          bullseye: true,
        })
        // Zombie: 1 ATK, 8 HP
        state.lanes[1].zombieMinion = createMockMinion('z_wall', 'Tank Zombie', 'zombies', 1, 8)

        const { updatedState, result } = resolveCombat(state)
        // Strike 1: 3 damage to minion (8 - 3 = 5 HP), 3 damage to Hero via Strikethrough (20 - 3 = 17 HP)
        // Plant takes 1 damage from Zombie (5 - 1 = 4 HP)
        // Strike 2 (Double Strike): 3 damage to minion (5 - 3 = 2 HP), 3 damage to Hero via Strikethrough (17 - 3 = 14 HP)
        // Total damage to Zombie minion: 3 + 3 = 6 (2 HP remaining)
        expect(updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)
        // Total damage to Zombie Hero: 3 + 3 = 6 (14 HP remaining)
        expect(updatedState.zombieHero.hp).toBe(14)
        expect(result.zombieHeroDamageTaken).toBe(6)
      })
    })
  })

  // ==========================================================
  // 10. CASCADE DEATH TRIGGERS & ON-DEATH MECHANICS (Phase 6)
  // ==========================================================
  describe('Cascade Death Triggers & On-Death Mechanics (Phase 6)', () => {
    it('should trigger Hothead on-death explosion dealing 6 damage and destroying opposing zombie', () => {
      const state = createInitialGameState()
      const hothead = createMockMinion('p_hot', 'Hothead', 'plants', 0, 1, { cardId: 'plant_hothead' })
      const zombie = createMockMinion('z_cone', 'Conehead Zombie', 'zombies', 2, 4)
      state.lanes[1].plantMinion = hothead
      state.lanes[1].zombieMinion = zombie

      const { updatedState, events, logs } = triggerOnDeath(state, hothead, 1)

      // Hothead exploded and dealt 6 damage to Zombie (4 HP -> 0 HP)
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
      expect(updatedState.plantGraveyard.some(c => c.id === 'plant_hothead')).toBe(true)
      expect(updatedState.zombieGraveyard.some(c => c.name === 'Conehead Zombie')).toBe(true)
      const explosionEvent = events.find(e => e.attackerName === 'Hothead')
      expect(explosionEvent).toBeDefined()
      expect(explosionEvent?.damageDealt).toBe(6)
      expect(explosionEvent?.isLethal).toBe(true)
      expect(logs.some(l => l.includes('Hothead phát nổ'))).toBe(true)
    })

    it('should buff Valkyrie in Zombie hand by +2 Attack whenever any Zombie minion dies', () => {
      const state = createInitialGameState()
      const valkyrieCard = createMockCard('zombie_valkyrie', 'Valkyrie', 'zombies', 3, 0, 6)
      state.zombieHand = [valkyrieCard]

      const deadZombie1 = createMockMinion('z1', 'Basic Zombie', 'zombies', 1, 1)
      const res1 = triggerOnDeath(state, deadZombie1, 0)

      expect(res1.updatedState.zombieHand[0].attack).toBe(2)
      expect(res1.events.some(e => e.attackerName === 'Valkyrie')).toBe(true)

      // Second zombie dies
      const deadZombie2 = createMockMinion('z2', 'Conehead Zombie', 'zombies', 2, 2)
      const res2 = triggerOnDeath(res1.updatedState, deadZombie2, 1)

      expect(res2.updatedState.zombieHand[0].attack).toBe(4)
      expect(res2.updatedState.zombieGraveyard).toHaveLength(2)
    })

    it('should NOT buff Valkyrie when a Plant minion is destroyed', () => {
      const state = createInitialGameState()
      const valkyrieCard = createMockCard('zombie_valkyrie', 'Valkyrie', 'zombies', 3, 0, 6)
      state.zombieHand = [valkyrieCard]

      const deadPlant = createMockMinion('p1', 'Peashooter', 'plants', 2, 2)
      const res = triggerOnDeath(state, deadPlant, 0)

      expect(res.updatedState.zombieHand[0].attack).toBe(0)
      expect(res.events.some(e => e.attackerName === 'Valkyrie')).toBe(false)
    })

    it('should trigger Punish-Shroom retaliation when a Mushroom minion dies', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      // Punish-Shroom on board in lane 0
      state.lanes[0].plantMinion = createMockMinion('p_punish', 'Punish-Shroom', 'plants', 2, 2, {
        cardId: 'plant_punish_shroom',
      })
      // Astro-Shroom in lane 1 dies
      const astroShroom = createMockMinion('p_astro', 'Astro-Shroom', 'plants', 1, 1, {
        cardId: 'plant_astro_shroom',
      })
      state.lanes[1].plantMinion = astroShroom

      const { updatedState, events } = triggerOnDeath(state, astroShroom, 1, { preferredTarget: 'hero' })

      // Punish-Shroom dealt 2 damage to Zombie Hero
      expect(updatedState.zombieHero.hp).toBe(18)
      const punishEvent = events.find(e => e.attackerName === 'Punish-Shroom')
      expect(punishEvent).toBeDefined()
      expect(punishEvent?.damageDealt).toBe(2)
      expect(punishEvent?.target).toBe('hero')
    })

    it('should trigger Punish-Shroom retaliation even when Punish-Shroom itself is destroyed', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      const punishShroom = createMockMinion('p_punish', 'Punish-Shroom', 'plants', 2, 2, {
        cardId: 'plant_punish_shroom',
      })
      state.lanes[0].plantMinion = punishShroom

      const { updatedState, events } = triggerOnDeath(state, punishShroom, 0, { preferredTarget: 'hero' })

      expect(updatedState.zombieHero.hp).toBe(18)
      expect(events.some(e => e.attackerName === 'Punish-Shroom')).toBe(true)
    })

    it('should execute a full cascade chain reaction across multiple triggers', () => {
      const state = createInitialGameState()
      // 1. Zombie Hand has Valkyrie (0 ATK)
      state.zombieHand = [createMockCard('zombie_valkyrie', 'Valkyrie', 'zombies', 3, 0, 6)]
      // 2. Board has Punish-Shroom in lane 0
      state.lanes[0].plantMinion = createMockMinion('p_punish', 'Punish-Shroom', 'plants', 2, 2, {
        cardId: 'plant_punish_shroom',
      })
      // 3. Lane 2 has an Imp with 2 HP
      const imp = createMockMinion('z_imp', 'Imp', 'zombies', 1, 2)
      state.lanes[2].zombieMinion = imp
      // 4. Mushroom (Poison Mushroom) dies
      const deadMushroom = createMockMinion('p_mush', 'Poison Mushroom', 'plants', 1, 1, {
        cardId: 'plant_poison_mushroom',
      })

      // When Mushroom dies -> Punish-Shroom targets Imp with 2 damage -> Imp dies -> Valkyrie gets +2 ATK!
      const { updatedState, events } = triggerOnDeath(state, deadMushroom, 1, {
        preferredTarget: 'minion',
        targetLaneIndex: 2,
      })

      // Imp was destroyed by Punish-Shroom!
      expect(updatedState.lanes[2].zombieMinion).toBeNull()
      // Imp was added to zombie graveyard!
      expect(updatedState.zombieGraveyard.some(c => c.name === 'Imp')).toBe(true)
      // Cascade triggered Valkyrie in Zombie hand: +2 Attack!
      expect(updatedState.zombieHand[0].attack).toBe(2)
      // Check events contain both Punish-Shroom attack and Valkyrie buff
      expect(events.some(e => e.attackerName === 'Punish-Shroom' && e.isLethal)).toBe(true)
      expect(events.some(e => e.attackerName === 'Valkyrie')).toBe(true)
    })

    it('should transform Pear Cub into Grizzly Pear upon death', () => {
      const state = createInitialGameState()
      const pearCub = createMockMinion('p_cub', 'Pear Cub', 'plants', 1, 1, { cardId: 'plant_pear_cub' })
      state.lanes[1].plantMinion = pearCub

      const { updatedState, logs } = triggerOnDeath(state, pearCub, 1)

      expect(updatedState.lanes[1].plantMinion?.name).toBe('Grizzly Pear')
      expect(updatedState.lanes[1].plantMinion?.currentAttack).toBe(5)
      expect(updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      expect(logs.some(l => l.includes('Grizzly Pear'))).toBe(true)
    })

    it('should buff Frankentuar by +1/+1 when another Zombie dies', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z_frank', 'Frankentuar', 'zombies', 5, 5, {
        cardId: 'zombie_frankentuar',
      })
      const deadZombie = createMockMinion('z_fodder', 'Basic Zombie', 'zombies', 1, 1)
      state.lanes[1].zombieMinion = deadZombie

      const { updatedState } = triggerOnDeath(state, deadZombie, 1)

      expect(updatedState.lanes[0].zombieMinion?.currentAttack).toBe(6)
      expect(updatedState.lanes[0].zombieMinion?.currentHealth).toBe(6)
    })

    it('should integrate seamlessly into resolveCombat: combat death triggers Valkyrie in hand and Hothead', () => {
      const state = createInitialGameState()
      state.zombieHand = [createMockCard('zombie_valkyrie', 'Valkyrie', 'zombies', 3, 0, 6)]
      // Lane 1: Plant Hothead (0/1) vs Zombie (4/4)
      state.lanes[1].plantMinion = createMockMinion('p_hot', 'Hothead', 'plants', 0, 1, { cardId: 'plant_hothead' })
      state.lanes[1].zombieMinion = createMockMinion('z_brute', 'Brute Zombie', 'zombies', 4, 4)

      const { updatedState, result } = resolveCombat(state)

      // 1. Zombie destroyed Hothead in combat
      // 2. Hothead exploded on death, dealing 6 damage to Zombie -> destroying it!
      // 3. Zombie death cascaded to Valkyrie in hand -> +2 Attack!
      expect(updatedState.lanes[1].plantMinion).toBeNull()
      expect(updatedState.lanes[1].zombieMinion).toBeNull()
      expect(updatedState.zombieHand[0].attack).toBe(2)
      expect(result.events.some(e => e.attackerName === 'Hothead')).toBe(true)
      expect(updatedState.plantGraveyard.some(c => c.id === 'plant_hothead')).toBe(true)
      expect(updatedState.zombieGraveyard.some(c => c.name === 'Brute Zombie')).toBe(true)
    })
  })

  // ==========================================================
  // 11. FULL MATCH INTEGRATION SIMULATION (5 COMPLETE TURNS)
  // ==========================================================
  describe('11. Full Match Integration Simulation (5 Complete Turns)', () => {
    it('simulates a full 5-turn match lifecycle from Mulligan through 5 complete turn cycles without infinite loops or errors', () => {
      // Initialize fresh match starting at MULLIGAN phase
      let state: GameState = {
        ...createInitialGameState(),
        phase: 'MULLIGAN',
      }

      expect(state.turn).toBe(1)
      expect(state.phase).toBe('MULLIGAN')
      expect(state.plantHero.hp).toBe(20)
      expect(state.zombieHero.hp).toBe(20)

      // --------------------------------------------------------
      // TURN 1: Mulligan -> Zombie Play -> Plant Play -> Tricks -> Combat
      // --------------------------------------------------------
      // 1. Mulligan card swaps
      state = gameReducer(state, { type: 'MULLIGAN_SWAP', side: 'plants', cardIndices: [0] })
      state = gameReducer(state, { type: 'MULLIGAN_SWAP', side: 'zombies', cardIndices: [1] })
      state = gameReducer(state, { type: 'FINISH_MULLIGAN', side: 'plants' })

      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.turn).toBe(1)
      expect(state.zombieHero.brains).toBe(1)
      expect(state.plantHero.sun).toBe(1)

      // 2. Zombie Play: Zombie plays a 1-cost Swimp (1/1) in Lane 1
      state.zombieHand.push(createMockCard('z_swimp', 'Swimp', 'zombies', 1, 1, 1))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'zombies', cardId: 'z_swimp', laneIndex: 1 })
      expect(state.lanes[1].zombieMinion?.name).toBe('Swimp')
      expect(state.zombieHero.brains).toBe(0)

      // Advance to Plant Play
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // 3. Plant Play: Plant plays a 1-cost Peashooter (1/1) in Lane 1 to confront Swimp
      state.plantHand.push(createMockCard('p_peashooter', 'Peashooter', 'plants', 1, 1, 1))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'plants', cardId: 'p_peashooter', laneIndex: 1 })
      expect(state.lanes[1].plantMinion?.name).toBe('Peashooter')
      expect(state.plantHero.sun).toBe(0)

      // Advance to Zombie Tricks
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')

      // 4. Zombie Tricks: Out of brains (0), passes to Fight
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('FIGHT')

      // 5. Fight: Resolve combat -> Swimp and Peashooter trade (both destroyed)
      state = gameReducer(state, { type: 'START_COMBAT' })
      expect(state.lanes[1].plantMinion).toBeNull()
      expect(state.lanes[1].zombieMinion).toBeNull()
      expect(state.plantGraveyard.some((c) => c.name === 'Peashooter')).toBe(true)
      expect(state.zombieGraveyard.some((c) => c.name === 'Swimp')).toBe(true)

      // Advance to Turn 2
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      // --------------------------------------------------------
      // TURN 2: Armored Zombie vs Bonk Choy
      // --------------------------------------------------------
      expect(state.turn).toBe(2)
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.zombieHero.brains).toBe(2)
      expect(state.plantHero.sun).toBe(2)

      // Zombie plays 2-cost Conehead (2/2, Armored 1) in Lane 2
      state.zombieHand.push(createMockCard('z_conehead', 'Conehead Zombie', 'zombies', 2, 2, 2, { armored: 1 }))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'zombies', cardId: 'z_conehead', laneIndex: 2 })
      expect(state.lanes[2].zombieMinion?.name).toBe('Conehead Zombie')
      expect(state.zombieHero.brains).toBe(0)

      // Advance to Plant Play
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // Plant plays 1-cost Bonk Choy (2/1) in Lane 2 against Conehead
      state.plantHand.push(createMockCard('p_bonk', 'Bonk Choy', 'plants', 1, 2, 1))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'plants', cardId: 'p_bonk', laneIndex: 2 })
      expect(state.lanes[2].plantMinion?.name).toBe('Bonk Choy')

      // Advance to Zombie Tricks -> Fight
      state = gameReducer(state, { type: 'NEXT_PHASE' }) // ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' }) // FIGHT
      expect(state.phase).toBe('FIGHT')

      // Combat: Bonk Choy (2 ATK) deals 2 - 1 = 1 damage to Conehead (Conehead survives with 1 HP).
      // Conehead (2 ATK) deals 2 damage to Bonk Choy -> Bonk Choy destroyed!
      state = gameReducer(state, { type: 'START_COMBAT' })
      expect(state.lanes[2].plantMinion).toBeNull()
      expect(state.lanes[2].zombieMinion?.currentHealth).toBe(1)

      // Advance to Turn 3
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      // --------------------------------------------------------
      // TURN 3: Double Strike Face Damage & Deadly Minion
      // --------------------------------------------------------
      expect(state.turn).toBe(3)
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.zombieHero.brains).toBe(3)
      expect(state.plantHero.sun).toBe(3)

      // Zombie plays 3-cost Smelly Zombie (2/4 Deadly) in Lane 3
      state.zombieHand.push(createMockCard('z_smelly', 'Smelly Zombie', 'zombies', 3, 2, 4, { deadly: true }))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'zombies', cardId: 'z_smelly', laneIndex: 3 })
      expect(state.lanes[3].zombieMinion?.name).toBe('Smelly Zombie')

      // Advance to Plant Play
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // Plant plays 3-cost Repeater (2/2 Double Strike) in Lane 1 (open ground lane)
      state.plantHand.push(createMockCard('p_repeater', 'Repeater', 'plants', 3, 2, 2, { doubleStrike: true }))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'plants', cardId: 'p_repeater', laneIndex: 1 })
      expect(state.lanes[1].plantMinion?.name).toBe('Repeater')

      // Advance to Zombie Tricks -> Fight
      state = gameReducer(state, { type: 'NEXT_PHASE' }) // ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' }) // FIGHT

      // Combat:
      // - Lane 1: Repeater Double Strikes Zombie Hero (2 + 2 = 4 damage)
      // - Lane 2: Conehead (2 ATK) hits Plant Hero (2 damage)
      // - Lane 3: Smelly Zombie (2 ATK) hits Plant Hero (2 damage)
      state = gameReducer(state, { type: 'START_COMBAT' })
      expect(state.zombieHero.hp).toBeLessThan(20)
      expect(state.plantHero.hp).toBeLessThan(20)
      expect(state.plantHero.blockMeter).toBeGreaterThan(0)

      // Advance to Turn 4
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      // --------------------------------------------------------
      // TURN 4: Strikethrough Minion & Zombie Bungee Plumber Trick
      // --------------------------------------------------------
      expect(state.turn).toBe(4)
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.zombieHero.brains).toBe(4)
      expect(state.plantHero.sun).toBe(4)

      // Zombie plays 3-cost Beam Zombie (2/3 Strikethrough) in Lane 0 (Heights), saving 1 Brain for tricks
      state.zombieHand.push(createMockCard('z_beam', 'Beam Zombie', 'zombies', 3, 2, 3, { strikethrough: true }))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'zombies', cardId: 'z_beam', laneIndex: 0 })
      expect(state.zombieHero.brains).toBe(1)

      // Advance to Plant Play
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // Plant plays 4-cost Snapdragon (3/3) in Lane 3 against Smelly Zombie (2/4 Deadly)
      state.plantHand.push(createMockCard('p_snap', 'Snapdragon', 'plants', 4, 3, 3))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'plants', cardId: 'p_snap', laneIndex: 3 })
      expect(state.lanes[3].plantMinion?.name).toBe('Snapdragon')

      // Advance to Zombie Tricks
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')
      expect(state.zombieHero.brains).toBe(1)

      // Zombie uses 1-cost Bungee Plumber targeting Plant Hero directly
      state.zombieHand.push(createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' }))
      const plantHpBeforeTrick = state.plantHero.hp
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_bungee_plumber',
        laneIndex: 0,
        targetHero: true,
      })
      // If block meter wasn't full, takes 2 damage; if block triggered, damage was negated by Super-Block
      expect(state.plantHero.hp <= plantHpBeforeTrick).toBe(true)
      expect(state.plantHero.hp === plantHpBeforeTrick - 2 || state.plantHero.blockCount > 0).toBe(true)
      expect(state.zombieHero.brains).toBe(0)

      // Advance to Fight
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('FIGHT')

      // Combat:
      // - Lane 0: Beam Zombie pierces Plant Hero with Strikethrough
      // - Lane 3: Snapdragon deals 3 dmg to Smelly Zombie (HP 4 -> 1). Smelly deals Deadly damage destroying Snapdragon!
      state = gameReducer(state, { type: 'START_COMBAT' })
      expect(state.lanes[3].plantMinion).toBeNull() // Snapdragon eliminated by Deadly
      expect(state.lanes[3].zombieMinion?.currentHealth).toBe(1)

      // Advance to Turn 5
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      // --------------------------------------------------------
      // TURN 5: Gatling Pea Deployed & Destroyed by Locust Swarm
      // --------------------------------------------------------
      expect(state.turn).toBe(5)
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.zombieHero.brains).toBe(5)
      expect(state.plantHero.sun).toBe(5)

      // Zombie passes ZOMBIE_PLAY to conserve all 5 Brains for Locust Swarm
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')

      // Plant plays 5-cost Gatling Pea (5/4 Double Strike) in Lane 2
      state.plantHand.push(createMockCard('p_gatling', 'Gatling Pea', 'plants', 5, 5, 4, { doubleStrike: true }))
      state = gameReducer(state, { type: 'PLAY_CARD', side: 'plants', cardId: 'p_gatling', laneIndex: 2 })
      expect(state.lanes[2].plantMinion?.name).toBe('Gatling Pea')

      // Advance to Zombie Tricks
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')
      expect(state.zombieHero.brains).toBe(5)

      // Zombie deploys Locust Swarm on Gatling Pea in Lane 2
      state.zombieHand.push(createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, { type: 'trick' }))
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_locust_swarm',
        laneIndex: 2,
      })
      expect(state.lanes[2].plantMinion).toBeNull() // Destroyed by Locust Swarm!
      expect(state.zombieHero.brains).toBe(0)

      // Advance to Fight & execute combat
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('FIGHT')
      state = gameReducer(state, { type: 'START_COMBAT' })

      // Advance to Turn 6 cleanly
      state = gameReducer(state, { type: 'NEXT_PHASE' })

      // --------------------------------------------------------
      // FINAL MATCH INTEGRITY AUDIT AFTER 5 FULL TURNS
      // --------------------------------------------------------
      expect(state.turn).toBe(6)
      expect(state.phase).toBe('ZOMBIE_PLAY')
      expect(state.plantHero.maxSun).toBe(6)
      expect(state.zombieHero.maxBrains).toBe(6)
      expect(state.plantHero.sun).toBe(6)
      expect(state.zombieHero.brains).toBe(6)

      // Heroes remain alive with valid HP
      expect(state.plantHero.hp).toBeGreaterThan(0)
      expect(state.plantHero.hp).toBeLessThanOrEqual(20)
      expect(state.zombieHero.hp).toBeGreaterThan(0)
      expect(state.zombieHero.hp).toBeLessThanOrEqual(20)
      expect(Number.isNaN(state.plantHero.hp)).toBe(false)
      expect(Number.isNaN(state.zombieHero.hp)).toBe(false)

      // Block meters are within standard 0-8 bounds
      expect(state.plantHero.blockMeter).toBeGreaterThanOrEqual(0)
      expect(state.plantHero.blockMeter).toBeLessThanOrEqual(8)
      expect(state.zombieHero.blockMeter).toBeGreaterThanOrEqual(0)
      expect(state.zombieHero.blockMeter).toBeLessThanOrEqual(8)

      // Graveyards hold casualties
      expect(state.plantGraveyard.length).toBeGreaterThanOrEqual(2)
      expect(state.zombieGraveyard.length).toBeGreaterThanOrEqual(1)

      // Robust logs and events recorded
      expect(state.combatEvents.length).toBeGreaterThan(0)
      expect(state.combatLog.length).toBeGreaterThan(15)
    })

    it('simulates an automated 5-turn game where Heuristic AI drives decisions through every phase without infinite loops or errors', () => {
      let state = createInitialGameState()
      // Give heroes ample HP to ensure full 5-turn progression without early knockout
      state.plantHero.hp = 50
      state.plantHero.maxHp = 50
      state.zombieHero.hp = 50
      state.zombieHero.maxHp = 50
      expect(state.turn).toBe(1)

      // Run through 5 complete turn cycles
      for (let t = 1; t <= 5; t++) {
        // ZOMBIE_PLAY: AI makes up to 2 minion plays, then passes
        let zPlays = 0
        while (state.phase === 'ZOMBIE_PLAY' && zPlays < 2) {
          const decision = getAIDecision(state, 'zombies', 'normal')
          if (decision.action === 'PLAY_MINION' && decision.card && decision.laneIndex !== undefined) {
            state = gameReducer(state, {
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex,
            })
            zPlays++
          } else {
            break
          }
        }
        if (state.phase === 'ZOMBIE_PLAY') {
          state = gameReducer(state, { type: 'NEXT_PHASE' })
        }

        // PLANT_PLAY: AI makes up to 2 minion plays, then passes
        let pPlays = 0
        while (state.phase === 'PLANT_PLAY' && pPlays < 2) {
          const decision = getAIDecision(state, 'plants', 'normal')
          if (decision.action === 'PLAY_MINION' && decision.card && decision.laneIndex !== undefined) {
            state = gameReducer(state, {
              type: 'PLAY_CARD',
              side: 'plants',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex,
            })
            pPlays++
          } else {
            break
          }
        }
        if (state.phase === 'PLANT_PLAY') {
          state = gameReducer(state, { type: 'NEXT_PHASE' })
        }

        // ZOMBIE_TRICKS: AI makes up to 1 trick play, then passes
        if (state.phase === 'ZOMBIE_TRICKS') {
          const decision = getAIDecision(state, 'zombies', 'normal')
          if (decision.action === 'PLAY_TRICK' && decision.card) {
            state = gameReducer(state, {
              type: 'PLAY_CARD',
              side: 'zombies',
              cardId: decision.card.id,
              laneIndex: decision.laneIndex ?? 0,
              targetHero: decision.targetHero,
            })
          }
          state = gameReducer(state, { type: 'NEXT_PHASE' })
        }

        // FIGHT: execute combat and advance to next turn
        if (state.phase === 'FIGHT') {
          state = gameReducer(state, { type: 'START_COMBAT' })
          state = gameReducer(state, { type: 'NEXT_PHASE' })
        }
      }

      // Assert that 5 turns completed smoothly into Turn 6
      expect(state.turn).toBe(6)
      expect(Number.isNaN(state.plantHero.hp)).toBe(false)
      expect(Number.isNaN(state.zombieHero.hp)).toBe(false)
      expect(state.plantHero.hp).toBeGreaterThan(0)
      expect(state.zombieHero.hp).toBeGreaterThan(0)
    })
  })

  // ==========================================================
  // 12. GRAVESTONE MECHANICS & REVEAL TRIGGERS (Phase 7)
  // ==========================================================
  describe('12. Gravestone Mechanics & Reveal Triggers (Phase 7)', () => {
    it('should deploy Zombie with gravestone trait as an anonymous Gravestone (isGravestone: true)', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 5

      // Gravestone card with when-played ability (Conga Zombie)
      const congaCard: Card = {
        id: 'zombie_conga_zombie',
        name: 'Conga Zombie',
        side: 'zombies',
        type: 'minion',
        cost: 2,
        attack: 2,
        health: 2,
        image: '/assets/cards/zombies/Conga Zombie.png',
        traits: ['gravestone'],
        gravestone: true,
      }
      state.zombieHand = [congaCard]
      // Opposing plant with 1 HP
      state.lanes[1].plantMinion = createMockMinion('p_weak', 'Weak Plant', 'plants', 1, 1)

      // Zombie plays Conga Zombie
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_conga_zombie',
        laneIndex: 1,
      })

      const placedMinion = state.lanes[1].zombieMinion
      expect(placedMinion).toBeDefined()
      expect(placedMinion?.gravestone).toBe(true)
      expect(placedMinion?.isGravestone).toBe(true)
      // When-played ability must NOT trigger yet while in Gravestone!
      // Weak plant should still be alive with 1 HP
      expect(state.lanes[1].plantMinion?.currentHealth).toBe(1)
      // Combat log must conceal identity as an anonymous Gravestone
      expect(state.combatLog.some(l => l.includes('Bia Mộ bí ẩn (Gravestone)'))).toBe(true)
    })

    it('should keep Gravestone concealed during PLANT_PLAY phase', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 3

      const gravestoneCard: Card = {
        id: 'z_ninja',
        name: 'Ninja Zombie',
        side: 'zombies',
        type: 'minion',
        cost: 2,
        attack: 3,
        health: 2,
        image: '/assets/ninja.png',
        gravestone: true,
      }
      state.zombieHand = [gravestoneCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'z_ninja',
        laneIndex: 2,
      })
      expect(state.lanes[2].zombieMinion?.isGravestone).toBe(true)

      // Advance to PLANT_PLAY
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')
      // Remains in Gravestone state during Plant turn
      expect(state.lanes[2].zombieMinion?.isGravestone).toBe(true)
    })

    it('should automatically reveal all Gravestones at the beginning of ZOMBIE_TRICKS and trigger when-revealed abilities', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      // Plant with 1 HP in Lane 1
      state.lanes[1].plantMinion = createMockMinion('p_shroom', 'Button Mushroom', 'plants', 1, 1)

      // Conga Zombie hidden in Gravestone in Lane 1
      state.lanes[1].zombieMinion = createMockMinion('z_conga', 'Conga Zombie', 'zombies', 2, 2, {
        cardId: 'zombie_conga_zombie',
        gravestone: true,
        isGravestone: true,
      })

      // Advance to ZOMBIE_TRICKS
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')

      // Gravestone must now be cracked open!
      const revealedZombie = state.lanes[1].zombieMinion
      expect(revealedZombie?.isGravestone).toBe(false)
      expect(revealedZombie?.name).toBe('Conga Zombie')

      // "When Revealed" ability (Conga deals 1 damage to plant) executed and destroyed 1-HP plant!
      expect(state.lanes[1].plantMinion).toBeNull()

      // Combat events must record the Gravestone reveal
      const revealEvent = state.combatEvents.find(e => e.description.includes('Bia Mộ vỡ tung'))
      expect(revealEvent).toBeDefined()
      expect(revealEvent?.laneIndex).toBe(1)
      expect(revealEvent?.attackerName).toBe('Conga Zombie')
    })

    it('revealGravestones helper: should reveal multiple Gravestones from left to right in order', () => {
      const state = createInitialGameState()
      // Lane 0: Gravestone Zombie A
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Tomb Walker', 'zombies', 1, 3, {
        gravestone: true,
        isGravestone: true,
      })
      // Lane 2: Gravestone Zombie B
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Grave Ghoul', 'zombies', 4, 4, {
        gravestone: true,
        isGravestone: true,
      })
      // Lane 4: Regular non-gravestone zombie
      state.lanes[4].zombieMinion = createMockMinion('z4', 'Regular Zombie', 'zombies', 2, 2, {
        gravestone: false,
        isGravestone: false,
      })

      const { updatedState, events } = revealGravestones(state)

      // Both gravestones are revealed
      expect(updatedState.lanes[0].zombieMinion?.isGravestone).toBe(false)
      expect(updatedState.lanes[2].zombieMinion?.isGravestone).toBe(false)
      // Regular zombie remains unchanged
      expect(updatedState.lanes[4].zombieMinion?.isGravestone).toBe(false)

      // Order of events must be lane 0 first, then lane 2
      const revealEvents = events.filter(e => e.description.includes('Bia Mộ vỡ tung'))
      expect(revealEvents).toHaveLength(2)
      expect(revealEvents[0].laneIndex).toBe(0)
      expect(revealEvents[1].laneIndex).toBe(2)
    })

    it('revealGravestones helper: should leave states with zero gravestones completely untouched', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z_normal', 'Standard Zombie', 'zombies', 2, 3)

      const { updatedState, events } = revealGravestones(state)
      expect(events).toHaveLength(0)
      expect(updatedState.lanes[1].zombieMinion?.isGravestone).toBeFalsy()
      expect(updatedState.lanes[1].zombieMinion?.name).toBe('Standard Zombie')
    })
  })
})
