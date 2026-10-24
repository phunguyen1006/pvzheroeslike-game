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
  playEnvironment,
  applyEnvironmentBeforeCombat,
  applyEnvironmentOnPlay,
  applyEnvironmentEndOfTurn,
  executeTrick,
  executeSuperpower,
  getAIDecision,
} from '../engine/index'
import type { Minion, Card, HeroState } from '../engine/types'

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
})
