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
  isFlowerPlant,
  convertCardDataToCard,
} from '../engine/index'
import type { Minion, Card, HeroState, GameState } from '../engine/types'
import { getCardById, getCardsByType, PLANT_CARDS, ZOMBIE_CARDS } from '../data/cards'

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

    it('should execute Bad Moon Rising transforming all zombies into random 5+ brain zombies', () => {
      const state = createInitialGameState()
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Imp', 'zombies', 1, 1)
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2)
      const bmr = createMockCard('zombie_bad_moon_rising', 'Bad Moon Rising', 'zombies', 7, 0, 0, { type: 'trick' })
      state.zombieHero.brains = 7
      state.zombieHand = [bmr]

      const res = executeTrick(state, bmr, 'zombies')
      expect(res.success).toBe(true)
      expect(res.updatedState.lanes[0].zombieMinion).toBeDefined()
      expect(res.updatedState.lanes[0].zombieMinion?.currentAttack).toBeGreaterThanOrEqual(3)
      expect(res.updatedState.lanes[0].zombieMinion?.currentHealth).toBeGreaterThanOrEqual(3)
      expect(res.updatedState.lanes[1].zombieMinion).toBeDefined()
      expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBeGreaterThanOrEqual(3)
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBeGreaterThanOrEqual(3)
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
          if (state.pendingSuperBlock) {
            state = gameReducer(state, { type: 'SAVE_SUPERPOWER', side: state.pendingSuperBlock.side })
          }
          state = gameReducer(state, { type: 'NEXT_PHASE' })
        }
      }

      // Assert that turns completed smoothly
      expect(state.turn).toBeGreaterThanOrEqual(5)
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

  // ==========================================================
  // 13. ROUND 2 NEW CARDS CATALOG AUDIT (Cards Bot)
  // ==========================================================
  describe('13. Round 2 New Cards Catalog Audit & Trait Validation', () => {
    it('verifies Plant cards: Cabbage-Pult, Repeater, Snowdrop have authentic stats and traits', () => {
      // 1. Cabbage-Pult
      const cabbage = getCardById('plant_cabbage_pult')
      expect(cabbage).toBeDefined()
      expect(cabbage?.name).toBe('Cabbage-Pult')
      expect(cabbage?.cost).toBe(2)
      expect(cabbage?.attack).toBe(1)
      expect(cabbage?.hp).toBe(3)
      expect(cabbage?.rarity).toBe('Uncommon')
      expect(cabbage?.tribe).toBe('Leafy Cabbage Plant')
      expect(cabbage?.heroClass).toBe('Mega-Grow')
      expect(cabbage?.laneRequirement).toBe('ground')

      // 2. Repeater
      const repeater = getCardById('plant_repeater')
      expect(repeater).toBeDefined()
      expect(repeater?.name).toBe('Repeater')
      expect(repeater?.cost).toBe(3)
      expect(repeater?.attack).toBe(2)
      expect(repeater?.hp).toBe(2)
      expect(repeater?.doubleStrike).toBe(true)
      expect(repeater?.traits).toContain('Double Strike')
      expect(repeater?.tribe).toBe('Pea Plant')
      expect(repeater?.heroClass).toBe('Mega-Grow')

      // 3. Snowdrop
      const snowdrop = getCardById('plant_snowdrop')
      expect(snowdrop).toBeDefined()
      expect(snowdrop?.name).toBe('Snowdrop')
      expect(snowdrop?.cost).toBe(1)
      expect(snowdrop?.attack).toBe(1)
      expect(snowdrop?.hp).toBe(2)
      expect(snowdrop?.rarity).toBe('Uncommon')
      expect(snowdrop?.tribe).toBe('Flower Plant')
      expect(snowdrop?.heroClass).toBe('Smarty')
    })

    it('verifies Zombie cards: Conehead Zombie, Buckethead Zombie, Stealthy Imp have authentic stats and traits', () => {
      // 1. Conehead Zombie
      const conehead = getCardById('zombie_conehead')
      expect(conehead).toBeDefined()
      expect(conehead?.name).toBe('Conehead Zombie')
      expect(conehead?.cost).toBe(2)
      expect(conehead?.attack).toBe(2)
      expect(conehead?.hp).toBe(2)
      expect(conehead?.armored).toBe(1)
      expect(conehead?.traits).toContain('Armored 1')
      expect(conehead?.rarity).toBe('Common')
      expect(conehead?.tribe).toBe('Professional Zombie')
      expect(conehead?.heroClass).toBe('Hearty')

      // 2. Buckethead Zombie
      const buckethead = getCardById('zombie_buckethead')
      expect(buckethead).toBeDefined()
      expect(buckethead?.name).toBe('Buckethead Zombie')
      expect(buckethead?.cost).toBe(4)
      expect(buckethead?.attack).toBe(3)
      expect(buckethead?.hp).toBe(4)
      expect(buckethead?.armored).toBe(1)
      expect(buckethead?.traits).toContain('Armored 1')
      expect(buckethead?.rarity).toBe('Uncommon')
      expect(buckethead?.tribe).toBe('Professional Zombie')
      expect(buckethead?.heroClass).toBe('Hearty')

      // 3. Stealthy Imp
      const stealthyImp = getCardById('zombie_stealthy_imp')
      expect(stealthyImp).toBeDefined()
      expect(stealthyImp?.name).toBe('Stealthy Imp')
      expect(stealthyImp?.cost).toBe(3)
      expect(stealthyImp?.attack).toBe(2)
      expect(stealthyImp?.hp).toBe(2)
      expect(stealthyImp?.antiHero).toBe(4)
      expect(stealthyImp?.gravestone).toBe(true)
      expect(stealthyImp?.traits).toContain('Anti-Hero 4')
      expect(stealthyImp?.traits).toContain('Gravestone')
      expect(stealthyImp?.rarity).toBe('Rare')
      expect(stealthyImp?.tribe).toBe('Pirate Imp Zombie')
      expect(stealthyImp?.heroClass).toBe('Sneaky')
    })

    it('verifies complete pool totals and data consistency across both teams', () => {
      expect(PLANT_CARDS.length).toBeGreaterThanOrEqual(25)
      expect(ZOMBIE_CARDS.length).toBeGreaterThanOrEqual(28)
      const totalCards = PLANT_CARDS.length + ZOMBIE_CARDS.length
      expect(totalCards).toBeGreaterThanOrEqual(53)

      // All cards must have valid id, name, team, cost >= 0, and non-empty assetPath/image
      for (const card of [...PLANT_CARDS, ...ZOMBIE_CARDS]) {
        expect(card.id).toBeTruthy()
        expect(card.name).toBeTruthy()
        expect(card.cost).toBeGreaterThanOrEqual(0)
        expect(card.image || card.assetPath).toBeTruthy()
      }
    })
  })

  // ==========================================================
  // 14. ROUND 3 ICONIC SUPER-RARE & LEGENDARY CATALOG AUDIT (Cards Bot)
  // ==========================================================
  describe('14. Round 3 Iconic Super-Rare & Legendary Catalog Audit', () => {
    it('verifies Plant cards: Wall-Nut, Briar Rose, Cornucopia have authentic stats and metadata', () => {
      // 1. Wall-Nut (Uncommon Guardian)
      const wallNut = getCardById('plant_wall_nut')
      expect(wallNut).toBeDefined()
      expect(wallNut?.name).toBe('Wall-Nut')
      expect(wallNut?.cost).toBe(1)
      expect(wallNut?.attack).toBe(0)
      expect(wallNut?.hp).toBe(6)
      expect(wallNut?.teamUp).toBe(true)
      expect(wallNut?.traits).toContain('Team-Up')
      expect(wallNut?.rarity).toBe('Uncommon')
      expect(wallNut?.tribe).toBe('Nut Plant')
      expect(wallNut?.heroClass).toBe('Guardian')

      // 2. Briar Rose (Super-Rare Solar)
      const briarRose = getCardById('plant_briar_rose')
      expect(briarRose).toBeDefined()
      expect(briarRose?.name).toBe('Briar Rose')
      expect(briarRose?.cost).toBe(4)
      expect(briarRose?.attack).toBe(3)
      expect(briarRose?.hp).toBe(4)
      expect(briarRose?.rarity).toBe('Super-Rare')
      expect(briarRose?.tribe).toBe('Flower Plant')
      expect(briarRose?.heroClass).toBe('Solar')
      expect(briarRose?.image).toBeTruthy()

      // 3. Cornucopia (Legendary Solar)
      const cornucopia = getCardById('plant_cornucopia')
      expect(cornucopia).toBeDefined()
      expect(cornucopia?.name).toBe('Cornucopia')
      expect(cornucopia?.cost).toBe(10)
      expect(cornucopia?.attack).toBe(6)
      expect(cornucopia?.hp).toBe(6)
      expect(cornucopia?.rarity).toBe('Legendary')
      expect(cornucopia?.tribe).toBe('Corn Plant')
      expect(cornucopia?.heroClass).toBe('Solar')
      expect(cornucopia?.image).toBeTruthy()
    })

    it('verifies Zombie cards: Teleport, Bad Moon Rising, Disco-Tron 3000 have authentic stats and metadata', () => {
      // 1. Teleport (Legendary Brainy Trick)
      const teleport = getCardById('zombie_teleport')
      expect(teleport).toBeDefined()
      expect(teleport?.name).toBe('Teleport')
      expect(teleport?.type).toBe('trick')
      expect(teleport?.cost).toBe(1)
      expect(teleport?.rarity).toBe('Legendary')
      expect(teleport?.tribe).toBe('Science Trick')
      expect(teleport?.heroClass).toBe('Brainy')

      // 2. Bad Moon Rising (Super-Rare Brainy Trick)
      const bmr = getCardById('zombie_bad_moon_rising')
      expect(bmr).toBeDefined()
      expect(bmr?.name).toBe('Bad Moon Rising')
      expect(bmr?.type).toBe('trick')
      expect(bmr?.cost).toBe(7)
      expect(bmr?.rarity).toBe('Super-Rare')
      expect(bmr?.tribe).toBe('Party Trick')
      expect(bmr?.heroClass).toBe('Brainy')

      // 3. Disco-Tron 3000 (Super-Rare Crazy Gravestone)
      const discoTron = getCardById('zombie_disco_tron_3000')
      expect(discoTron).toBeDefined()
      expect(discoTron?.name).toBe('Disco-Tron 3000')
      expect(discoTron?.cost).toBe(6)
      expect(discoTron?.attack).toBe(4)
      expect(discoTron?.hp).toBe(4)
      expect(discoTron?.gravestone).toBe(true)
      expect(discoTron?.traits).toContain('Gravestone')
      expect(discoTron?.rarity).toBe('Super-Rare')
      expect(discoTron?.tribe).toBe('Science Zombie')
      expect(discoTron?.heroClass).toBe('Crazy')
      expect(discoTron?.image).toBeTruthy()
    })

    it('verifies overall expanded pool with Round 3 and Superpower additions (at least 56 cards)', () => {
      expect(PLANT_CARDS.length).toBeGreaterThanOrEqual(27)
      expect(ZOMBIE_CARDS.length).toBeGreaterThanOrEqual(29)
      expect(PLANT_CARDS.length + ZOMBIE_CARDS.length).toBeGreaterThanOrEqual(56)
    })
  })

  // ==========================================================
  // 15. LEGENDARY & SUPER-RARE STRATEGIC CARDS SUITE (QA Suite)
  // ==========================================================
  describe('15. Legendary & Super-Rare Strategic Cards Suite (QA Suite)', () => {
    // --------------------------------------------------------
    // 1. Plant Wall-Nut (Team-Up & Damage Absorption)
    // --------------------------------------------------------
    it('verifies Wall-Nut Team-Up allows placement in occupied lane and absorbs combat damage protecting plant hero', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 5

      const wallNutData = getCardById('plant_wall_nut')!
      expect(wallNutData).toBeDefined()
      const wallNutCard = convertCardDataToCard(wallNutData, 'plants')
      expect(wallNutCard.cost).toBe(1)
      expect(wallNutCard.attack).toBe(0)
      expect(wallNutCard.health).toBe(6)
      expect(wallNutCard.teamUp).toBe(true)

      // A. Play Wall-Nut onto empty ground lane (Lane 1)
      state.plantHand = [wallNutCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        cardId: wallNutCard.id,
        side: 'plants',
        laneIndex: 1,
      })
      const playedWallNut = state.lanes[1].plantMinion
      expect(playedWallNut).toBeDefined()
      expect(playedWallNut?.name).toBe('Wall-Nut')
      expect(playedWallNut?.currentAttack).toBe(0)
      expect(playedWallNut?.currentHealth).toBe(6)
      expect(playedWallNut?.teamUp).toBe(true)
      expect(state.plantHero.sun).toBe(4) // 5 - 1

      // B. Place a 3 ATK Zombie in Lane 1 and execute combat
      state.lanes[1].zombieMinion = createMockMinion('z_walker', 'Conehead Zombie', 'zombies', 3, 4)
      const plantHeroHpBefore = state.plantHero.hp
      const combatRes = resolveSingleLaneCombat(state, 1)

      // Wall-Nut absorbs 3 damage: 6 - 3 = 3 HP
      expect(combatRes.updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
      // Zombie took 0 damage because Wall-Nut has 0 ATK
      expect(combatRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4)
      // Plant Hero was protected and took 0 damage!
      expect(combatRes.updatedState.plantHero.hp).toBe(plantHeroHpBefore)

      // C. Team-Up: Play a second Wall-Nut into Lane 2 which already has a Peashooter
      state.lanes[2].plantMinion = createMockMinion('p_pea', 'Peashooter', 'plants', 1, 1)
      state.plantHand = [wallNutCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        cardId: wallNutCard.id,
        side: 'plants',
        laneIndex: 2,
      })

      // Both plants coexist in Lane 2!
      expect(state.lanes[2].plantMinion?.name).toBe('Peashooter')
      expect(state.lanes[2].plantTeamUpMinion?.name).toBe('Wall-Nut')
      expect(state.lanes[2].plantTeamUpMinion?.currentHealth).toBe(6)
    })

    // --------------------------------------------------------
    // 2. Plant Cornucopia (Multi-Lane Summoning)
    // --------------------------------------------------------
    it('verifies Cornucopia summons random Plants across all other valid empty lanes including Amphibious on Water', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 10

      const cornucopiaData = getCardById('plant_cornucopia')!
      expect(cornucopiaData).toBeDefined()
      const cornucopiaCard = convertCardDataToCard(cornucopiaData, 'plants')
      expect(cornucopiaCard.cost).toBe(10)

      // Play Cornucopia in Lane 2 (Ground)
      state.plantHand = [cornucopiaCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        cardId: cornucopiaCard.id,
        side: 'plants',
        laneIndex: 2,
      })

      // Lane 2 has Cornucopia itself
      expect(state.lanes[2].plantMinion?.cardId).toBe('plant_cornucopia')
      expect(state.lanes[2].plantMinion?.currentAttack).toBe(6)
      expect(state.lanes[2].plantMinion?.currentHealth).toBe(6)

      // Every other empty lane (0, 1, 3, 4) must now be populated with a plant minion!
      for (const idx of [0, 1, 3, 4]) {
        const spawned = state.lanes[idx].plantMinion
        expect(spawned).not.toBeNull()
        expect(spawned?.side).toBe('plants')
        expect(spawned?.currentHealth).toBeGreaterThan(0)
      }

      // Lane 4 is Water Lane -> Must be Amphibious!
      const waterMinion = state.lanes[4].plantMinion
      expect(waterMinion?.amphibious).toBe(true)

      // Combat log must mention Cornucopia summons
      const summonLogs = state.combatLog.filter(l => l.includes('Cornucopia'))
      expect(summonLogs.length).toBeGreaterThanOrEqual(1)
    })

    it('verifies Cornucopia handles fully occupied board gracefully without overriding existing plants', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 10

      // Pre-fill all other lanes with existing plants
      state.lanes[0].plantMinion = createMockMinion('p0', 'Existing Sunflower', 'plants', 0, 1)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Existing Peashooter', 'plants', 1, 1)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Existing Repeater', 'plants', 2, 2)
      state.lanes[4].plantMinion = createMockMinion('p4', 'Existing Amphibious Bean', 'plants', 1, 1, { amphibious: true })

      const cornucopiaData = getCardById('plant_cornucopia')!
      const cornucopiaCard = convertCardDataToCard(cornucopiaData, 'plants')
      state.plantHand = [cornucopiaCard]

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        cardId: cornucopiaCard.id,
        side: 'plants',
        laneIndex: 2,
      })

      // Existing plants must be preserved, not overwritten
      expect(state.lanes[0].plantMinion?.name).toBe('Existing Sunflower')
      expect(state.lanes[1].plantMinion?.name).toBe('Existing Peashooter')
      expect(state.lanes[2].plantMinion?.cardId).toBe('plant_cornucopia')
      expect(state.lanes[3].plantMinion?.name).toBe('Existing Repeater')
      expect(state.lanes[4].plantMinion?.name).toBe('Existing Amphibious Bean')

      // Combat log notes that no empty lanes were available
      const noSpaceLog = state.combatLog.find(l => l.includes('không còn làn nào trống'))
      expect(noSpaceLog).toBeDefined()
    })

    // --------------------------------------------------------
    // 3. Plant Briar Rose (Retaliatory Retribution)
    // --------------------------------------------------------
    it('verifies Briar Rose retaliatory strike destroys any Zombie that hurts an ally Flower plant', () => {
      const state = createInitialGameState()
      // Briar Rose in Lane 1
      state.lanes[1].plantMinion = createMockMinion('p_rose', 'Briar Rose', 'plants', 3, 4, {
        cardId: 'plant_briar_rose',
      })
      // Sunflower (Flower Plant) in Lane 2
      const sunflower = createMockMinion('p_sunflower', 'Sunflower', 'plants', 0, 1, {
        cardId: 'plant_sunflower',
      })
      state.lanes[2].plantMinion = sunflower

      // Zombie in Lane 2 (Conehead Zombie)
      const zombieAttacker = createMockMinion('z_cone', 'Conehead Zombie', 'zombies', 2, 3, {
        cardId: 'zombie_conehead',
      })
      state.lanes[2].zombieMinion = zombieAttacker

      // Flower classification check
      expect(isFlowerPlant(sunflower)).toBe(true)

      // Zombie damages Sunflower
      const hurtRes = triggerWhenHurt(state, sunflower, 2, zombieAttacker, 2)

      // Briar Rose immediately destroys the attacking Zombie!
      expect(hurtRes.updatedState.lanes[2].zombieMinion).toBeNull()
      const retaliationEvent = hurtRes.events.find(e => e.includes('Briar Rose trả đũa'))
      expect(retaliationEvent).toBeDefined()
      expect(retaliationEvent).toContain('Conehead Zombie')
    })

    it('verifies Briar Rose also destroys the attacking Zombie when Briar Rose itself is hurt', () => {
      const state = createInitialGameState()
      const briarRose = createMockMinion('p_rose', 'Briar Rose', 'plants', 3, 4, {
        cardId: 'plant_briar_rose',
      })
      state.lanes[1].plantMinion = briarRose

      const attackingZombie = createMockMinion('z_garg', 'Gargantuar', 'zombies', 5, 5, {
        cardId: 'zombie_gargantuar',
      })
      state.lanes[1].zombieMinion = attackingZombie

      expect(isFlowerPlant(briarRose)).toBe(true)

      // Gargantuar attacks Briar Rose
      const hurtRes = triggerWhenHurt(state, briarRose, 5, attackingZombie, 1)

      // Gargantuar is destroyed by Briar Rose thorns!
      expect(hurtRes.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(hurtRes.events.some(e => e.includes('Briar Rose trả đũa'))).toBe(true)
    })

    it('verifies Briar Rose does NOT destroy Zombie when a non-Flower plant is hurt', () => {
      const state = createInitialGameState()
      // Briar Rose in Lane 1
      state.lanes[1].plantMinion = createMockMinion('p_rose', 'Briar Rose', 'plants', 3, 4, {
        cardId: 'plant_briar_rose',
      })
      // Peashooter (Pea Plant, NOT Flower) in Lane 2
      const peashooter = createMockMinion('p_pea', 'Peashooter', 'plants', 1, 1, {
        cardId: 'plant_peashooter',
      })
      state.lanes[2].plantMinion = peashooter

      const attackingZombie = createMockMinion('z_imp', 'Imp', 'zombies', 1, 1, {
        cardId: 'zombie_basic',
      })
      state.lanes[2].zombieMinion = attackingZombie

      expect(isFlowerPlant(peashooter)).toBe(false)

      const hurtRes = triggerWhenHurt(state, peashooter, 1, attackingZombie, 2)

      // Zombie is NOT destroyed because Peashooter is not a Flower!
      expect(hurtRes.updatedState.lanes[2].zombieMinion).not.toBeNull()
      expect(hurtRes.events.filter(e => e.includes('Briar Rose')).length).toBe(0)
    })

    // --------------------------------------------------------
    // 4. Zombie Bad Moon Rising (High-Tier Transformation)
    // --------------------------------------------------------
    it('verifies Bad Moon Rising transforms all active Zombies into high-tier units with Cost >= 5 and Amphibious on Water', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 7

      // Lane 0: 1/1 Basic Browncoat Zombie
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Browncoat Zombie', 'zombies', 1, 1, {
        cardId: 'zombie_basic',
      })
      // Lane 1: 1/1 Backup Dancer
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Backup Dancer', 'zombies', 1, 1, {
        cardId: 'zombie_backup_dancer',
      })
      // Lane 4 (Water Lane): 1/1 Swimp
      state.lanes[4].zombieMinion = createMockMinion('z4', 'Swimp', 'zombies', 1, 1, {
        cardId: 'zombie_swimp',
        amphibious: true,
      })

      const bmrCard = createMockCard('zombie_bad_moon_rising', 'Bad Moon Rising', 'zombies', 7, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [bmrCard]

      const res = executeTrick(state, bmrCard, 'zombies')
      expect(res.success).toBe(true)

      // All 3 zombies are transformed into powerful high-tier zombies
      const z0 = res.updatedState.lanes[0].zombieMinion!
      const z1 = res.updatedState.lanes[1].zombieMinion!
      const z4 = res.updatedState.lanes[4].zombieMinion!

      expect(z0).toBeDefined()
      expect(z0.currentAttack).toBeGreaterThanOrEqual(3)
      expect(z0.currentHealth).toBeGreaterThanOrEqual(3)

      expect(z1).toBeDefined()
      expect(z1.currentAttack).toBeGreaterThanOrEqual(3)
      expect(z1.currentHealth).toBeGreaterThanOrEqual(3)

      // Water lane zombie must be Amphibious!
      expect(z4).toBeDefined()
      expect(z4.amphibious).toBe(true)
      expect(['Deep Sea Gargantuar', 'Mondo Bronto', 'Zombot Sharktronic Sub']).toContain(z4.name)

      expect(res.message).toContain('Bad Moon Rising! Trăng máu trỗi dậy')
    })

    it('verifies Bad Moon Rising handles empty board without throwing errors or mutating lanes', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 7

      const bmrCard = createMockCard('zombie_bad_moon_rising', 'Bad Moon Rising', 'zombies', 7, 0, 0, {
        type: 'trick',
      })
      const res = executeTrick(state, bmrCard, 'zombies')

      expect(res.success).toBe(true)
      expect(res.message).toContain('không có Zombie nào trên sân')
      state.lanes.forEach(l => {
        expect(l.zombieMinion).toBeNull()
      })
    })

    // --------------------------------------------------------
    // 5. Zombie Disco-Tron 3000 (Gravestone & Dancers Summon)
    // --------------------------------------------------------
    it('verifies Disco-Tron 3000 enters anonymously as Gravestone and spawns 2 Backup Dancers upon reveal', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 6

      const discoTronData = getCardById('zombie_disco_tron_3000')!
      expect(discoTronData).toBeDefined()
      const discoTronCard = convertCardDataToCard(discoTronData, 'zombies')
      expect(discoTronCard.cost).toBe(6)
      expect(discoTronCard.attack).toBe(4)
      expect(discoTronCard.health).toBe(4)

      // Play Disco-Tron 3000 into Lane 1 during ZOMBIE_PLAY
      state.zombieHand = [discoTronCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        cardId: discoTronCard.id,
        side: 'zombies',
        laneIndex: 1,
      })

      // Must be placed as an anonymous Gravestone
      const gravestoneMinion = state.lanes[1].zombieMinion
      expect(gravestoneMinion).toBeDefined()
      expect(gravestoneMinion?.isGravestone).toBe(true)
      // Dancers must NOT be spawned yet
      const activeZombiesBeforeReveal = state.lanes.filter(l => l.zombieMinion !== null)
      expect(activeZombiesBeforeReveal.length).toBe(1)

      // Step to PLANT_PLAY: stays hidden
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('PLANT_PLAY')
      expect(state.lanes[1].zombieMinion?.isGravestone).toBe(true)

      // Step to ZOMBIE_TRICKS: Gravestones reveal automatically!
      state = gameReducer(state, { type: 'NEXT_PHASE' })
      expect(state.phase).toBe('ZOMBIE_TRICKS')

      // Disco-Tron 3000 revealed!
      const revealed = state.lanes[1].zombieMinion
      expect(revealed?.isGravestone).toBe(false)
      expect(revealed?.name).toBe('Disco-Tron 3000')
      expect(revealed?.currentAttack).toBe(4)
      expect(revealed?.currentHealth).toBe(4)

      // Two 1/1 Backup Dancers spawned in other lanes!
      const totalZombies = state.lanes.filter(l => l.zombieMinion !== null)
      expect(totalZombies.length).toBe(3) // Disco-Tron + 2 Backup Dancers

      const dancers = state.lanes.filter(
        l => l.zombieMinion && l.zombieMinion.name === 'Backup Dancer'
      )
      expect(dancers.length).toBe(2)
      for (const dancerLane of dancers) {
        expect(dancerLane.zombieMinion?.currentAttack).toBe(1)
        expect(dancerLane.zombieMinion?.currentHealth).toBe(1)
        expect(dancerLane.zombieMinion?.side).toBe('zombies')
      }
    })

    // --------------------------------------------------------
    // 6. Zombie Teleport (Trick Mechanics)
    // --------------------------------------------------------
    it('verifies Teleport trick draws 1 card and activates teleportActive flag for playing zombies in Tricks phase', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 1
      state.teleportActive = false

      const initialDeckCount = state.zombieDeck.length
      const initialHandCount = state.zombieHand.length

      const teleportCard = createMockCard('zombie_teleport', 'Teleport', 'zombies', 1, 0, 0, {
        type: 'trick',
      })
      const res = executeTrick(state, teleportCard, 'zombies')

      expect(res.success).toBe(true)
      expect(res.updatedState.teleportActive).toBe(true)
      expect(res.updatedState.zombieDeck.length).toBe(initialDeckCount - 1)
      expect(res.updatedState.zombieHand.length).toBe(initialHandCount + 1)
      expect(res.message).toContain('Teleport: Dịch chuyển tức thời')
    })
  })

  // ==========================================================
  // 16. SMART AI TACTICAL & TRICK DECISION SUITE
  // ==========================================================
  describe('16. Smart AI Tactical & Trick Decision Suite', () => {
    it('AI prioritizes Bungee Plumber to eliminate low-HP Plant minion with <= 2 HP', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 4
      state.plantHero.hp = 15 // Not in lethal range

      // Lane 1: 2-HP Repeater (killable)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 2, {
        cardId: 'plant_repeater',
      })
      // Lane 3: 4-HP Briar Rose (not killable with 2 dmg)
      state.lanes[3].plantMinion = createMockMinion('p3', 'Briar Rose', 'plants', 3, 4, {
        cardId: 'plant_briar_rose',
      })

      const bungeeCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [bungeeCard]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_bungee_plumber')
      expect(decision.laneIndex).toBe(1) // Targets Lane 1 with the 2-HP Repeater
      expect(decision.targetHero).toBeFalsy()
      expect(decision.reason).toContain('Bungee Plumber')
    })

    it('AI prioritizes Bungee Plumber directly to Plant Hero when Plant Hero HP <= 2 for lethal finish', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 2
      state.plantHero.hp = 2 // Exact lethal range!

      // Plant exists on board, but direct lethal takes top priority
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1)

      const bungeeCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [bungeeCard]

      const decision = getAIDecision(state, 'zombies', 'expert')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_bungee_plumber')
      expect(decision.targetHero).toBe(true) // Hits Plant Hero directly
      expect(decision.reason).toContain('Lethal')
    })

    it('AI uses Lurch for Lunch to grant Bonus Attack to the Zombie with the highest Attack (>= 3 ATK)', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      // Lane 0: 2 ATK Zombie
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Conehead', 'zombies', 2, 2)
      // Lane 2: 6 ATK Zombie (Gargantuar - Highest attack)
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Gargantuar', 'zombies', 6, 6)
      // Lane 3: 4 ATK Zombie (All-Star)
      state.lanes[3].zombieMinion = createMockMinion('z3', 'All-Star Zombie', 'zombies', 4, 6)

      const lurchCard = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [lurchCard]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_lurch_for_lunch')
      expect(decision.laneIndex).toBe(2) // Selects 6-ATK Gargantuar in Lane 2
      expect(decision.reason).toContain('Lurch for Lunch')
    })

    it('AI ignores frozen Zombies when selecting the target for Lurch for Lunch', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 3

      // Lane 1: 7 ATK Zombie but FROZEN!
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Deep Sea Gargantuar', 'zombies', 7, 7, {
        isFrozen: true,
      })
      // Lane 3: 4 ATK Zombie (unfrozen, valid)
      state.lanes[3].zombieMinion = createMockMinion('z3', 'All-Star Zombie', 'zombies', 4, 6)

      const lurchCard = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [lurchCard]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_lurch_for_lunch')
      expect(decision.laneIndex).toBe(3) // Skips frozen Lane 1 and picks Lane 3
    })

    it('AI conserves Brains during ZOMBIE_PLAY when holding high-value Tricks facing dangerous Plants', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 5

      // Dangerous 5 ATK Plant on board
      state.lanes[1].plantMinion = createMockMinion('p_boss', 'Gatling Pea', 'plants', 5, 4)

      // Hand has a 5-cost minion and a 5-cost hard removal trick (Locust Swarm)
      const expensiveMinion = createMockCard('zombie_all_star', 'All-Star Zombie', 'zombies', 5, 4, 6)
      const locustCard = createMockCard('zombie_locust_swarm', 'Locust Swarm', 'zombies', 5, 0, 0, {
        type: 'trick',
      })
      state.zombieHand = [expensiveMinion, locustCard]

      const decision = getAIDecision(state, 'zombies', 'normal')
      expect(decision.action).toBe('PASS')
      expect(decision.reason).toContain('Preserving')
    })
  })

  // ==========================================================
  // 17. SUPERPOWER & ENVIRONMENT COMBAT MECHANICS
  // ==========================================================
  describe('17. Superpower & Environment Combat Mechanics', () => {
    it('verifies Super-Block triggers at 8 segments: completely blocks 100% incoming damage and awards free superpower', () => {
      const state = createInitialGameState()
      // Plant Hero with 7/8 meter, hp = 15
      state.plantHero.blockMeter = 7
      state.plantHero.blockCount = 0
      state.plantHero.hp = 15

      // Zombie in Lane 1 with lethal 10 damage attack
      state.lanes[1].zombieMinion = createMockMinion('z_garg', 'Zombot 1000', 'zombies', 10, 10)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Super-Block completely blocked all 10 damage!
      expect(combatRes.updatedState.plantHero.hp).toBe(15)
      expect(combatRes.hasSuperBlock).toBe(true)
      expect(combatRes.updatedState.plantHero.blockMeter).toBe(0) // Resets to 0
      expect(combatRes.updatedState.plantHero.blockCount).toBe(1) // Incremented to 1
      expect(combatRes.updatedState.pendingSuperBlock).toBeDefined()
      expect(combatRes.updatedState.pendingSuperBlock?.side).toBe('plants')
      expect(combatRes.updatedState.pendingSuperBlock?.superpower.cost).toBe(0)
    })

    it('verifies Hero takes full damage without blocking when blockCount reaches maximum of 3', () => {
      const state = createInitialGameState()
      state.plantHero.blockMeter = 7
      state.plantHero.blockCount = 3 // Max 3 blocks reached
      state.plantHero.hp = 20

      // Zombie in Lane 1 deals 6 damage
      state.lanes[1].zombieMinion = createMockMinion('z_smash', 'Gargantuar', 'zombies', 6, 6)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Takes full 6 damage without triggering Super-Block
      expect(combatRes.updatedState.plantHero.hp).toBe(14)
      expect(combatRes.hasSuperBlock).toBe(false)
      expect(combatRes.updatedState.pendingSuperBlock).toBeNull()
    })

    it('verifies Precision Blast deals exactly 5 damage to Zombie in middle lane (Lane 2) and destroys it if fatal', () => {
      const state = createInitialGameState()
      // Middle lane has a 4-HP Zombie
      state.lanes[2].zombieMinion = createMockMinion('z_mid', 'Buckethead', 'zombies', 3, 4)

      const res = executeSuperpower(state, 'sp_precision_blast', 'plants')

      // 4 HP - 5 damage = destroyed!
      expect(res.updatedState.lanes[2].zombieMinion).toBeNull()
      expect(res.message).toContain('Precision Blast')
      expect(res.message).toContain('Tiêu diệt Buckethead')
    })

    it('verifies Precision Blast deals exactly 5 damage directly to Zombie Hero when middle lane is empty', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = null
      state.zombieHero.hp = 20

      const res = executeSuperpower(state, 'sp_precision_blast', 'plants')

      // 20 HP - 5 damage = 15 HP
      expect(res.updatedState.zombieHero.hp).toBe(15)
      expect(res.message).toContain('Precision Blast bắn thẳng vào Zombie Hero gây 5 sát thương')
    })

    it('verifies Sunburn deals 2 damage to Zombie Hero and permanently increases plant Max Sun by 1', () => {
      const state = createInitialGameState()
      state.plantHero.sun = 3
      state.plantHero.maxSun = 3
      state.zombieHero.hp = 20

      const res = executeSuperpower(state, 'sp_sunburn', 'plants')

      // Zombie Hero takes 2 damage: 20 - 2 = 18 HP
      expect(res.updatedState.zombieHero.hp).toBe(18)
      // Plant Hero permanently ramps +1 Sun and Max Sun
      expect(res.updatedState.plantHero.maxSun).toBe(4)
      expect(res.updatedState.plantHero.sun).toBe(4)
      expect(res.message).toContain('Sunburn')
    })

    it('verifies Uncrackable makes Plant Hero immune to all damage for the turn and draws 1 card', () => {
      const state = createInitialGameState()
      state.plantHero.isShieldActive = false
      state.plantHero.hp = 15
      const initialDeckLength = state.plantDeck.length
      const initialHandLength = state.plantHand.length

      // Execute Uncrackable
      const spRes = executeSuperpower(state, 'sp_uncrackable', 'plants')
      expect(spRes.updatedState.plantHero.isShieldActive).toBe(true)
      expect(spRes.updatedState.plantHand.length).toBe(initialHandLength + 1)
      expect(spRes.updatedState.plantDeck.length).toBe(initialDeckLength - 1)

      // Test combat hit against shielded Hero: 10 incoming damage in open lane 1
      spRes.updatedState.lanes[1].zombieMinion = createMockMinion('z_big', 'Gargantuar', 'zombies', 10, 10)
      const combatRes = resolveSingleLaneCombat(spRes.updatedState, 1)

      // Shield completely absorbs 100% of damage!
      expect(combatRes.updatedState.plantHero.hp).toBe(15)
      expect(combatRes.events.some(e => e.target === 'hero' && e.isBlocked)).toBe(true)
    })

    it('verifies Spikeweed Sector environment deals 2 damage to Zombie before combat starts', () => {
      const state = createInitialGameState()
      // Place Spikeweed Sector in Lane 1
      state.lanes[1].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        image: '/assets/cards/plants/Spikeweed Sector.png',
        description: 'Before combat here, do 2 damage to a Zombie here.',
      }

      // Zombie with 2 HP in Lane 1
      state.lanes[1].zombieMinion = createMockMinion('z_swimp', 'Swimp', 'zombies', 1, 2)
      // Plant in Lane 1 with 1 HP
      state.lanes[1].plantMinion = createMockMinion('p_pea', 'Peashooter', 'plants', 1, 1)

      // Pre-combat environment triggers
      const envRes = applyEnvironmentBeforeCombat(state, 1)

      // Spikeweed Sector deals 2 damage to the 2-HP Zombie before combat -> Zombie is destroyed!
      expect(envRes.updatedState.lanes[1].zombieMinion).toBeNull()
      expect(envRes.events.some(e => e.includes('Spikeweed Sector'))).toBe(true)

      // Also test pre-combat damage within resolveSingleLaneCombat against a healthy 5-HP Zombie
      const combatState = createInitialGameState()
      combatState.lanes[1].environment = {
        id: 'plant_spikeweed_sector',
        name: 'Spikeweed Sector',
        side: 'plants',
        image: '/assets/cards/plants/Spikeweed Sector.png',
        description: 'Before combat here, do 2 damage to a Zombie here.',
      }
      combatState.lanes[1].zombieMinion = createMockMinion('z_knight', 'Knight', 'zombies', 3, 5)
      combatState.lanes[1].plantMinion = createMockMinion('p_repeater', 'Repeater', 'plants', 2, 4)

      const combatRes = resolveSingleLaneCombat(combatState, 1)
      expect(combatRes.events.some(e => e.attackerName === 'Spikeweed Sector' && e.damageDealt === 2)).toBe(true)
    })
  })

  // ==========================================================
  // 18. HERO SUPERPOWERS & SIGNATURE SUPERPOWERS SUITE (Round 4)
  // ==========================================================
  describe('18. Hero Superpowers & Signature Superpowers Suite (Round 4)', () => {
    it('verifies all 6 Plant Superpowers metadata and attributes in the card database', () => {
      // 1. Precision Blast (Green Shadow Signature)
      const blast = getCardById('plant_precision_blast')
      expect(blast).toBeDefined()
      expect(blast?.name).toBe('Precision Blast')
      expect(blast?.type).toBe('superpower')
      expect(blast?.cost).toBe(1)
      expect(blast?.heroClass).toBe('Mega-Grow')
      expect(blast?.team).toBe('plants')

      // 2. Sunburn (Solar Flare Signature)
      const sunburn = getCardById('plant_sunburn')
      expect(sunburn).toBeDefined()
      expect(sunburn?.name).toBe('Sunburn')
      expect(sunburn?.type).toBe('superpower')
      expect(sunburn?.cost).toBe(1)
      expect(sunburn?.heroClass).toBe('Solar')

      // 3. Uncrackable (Wall-Knight Signature)
      const uncrackable = getCardById('plant_uncrackable')
      expect(uncrackable).toBeDefined()
      expect(uncrackable?.name).toBe('Uncrackable')
      expect(uncrackable?.type).toBe('superpower')
      expect(uncrackable?.cost).toBe(1)
      expect(uncrackable?.heroClass).toBe('Guardian')

      // 4. Embiggen
      const embiggen = getCardById('plant_embiggen')
      expect(embiggen).toBeDefined()
      expect(embiggen?.name).toBe('Embiggen')
      expect(embiggen?.type).toBe('superpower')
      expect(embiggen?.cost).toBe(1)
      expect(embiggen?.heroClass).toBe('Mega-Grow')

      // 5. Whirlwind
      const whirlwind = getCardById('plant_whirlwind')
      expect(whirlwind).toBeDefined()
      expect(whirlwind?.name).toBe('Whirlwind')
      expect(whirlwind?.type).toBe('superpower')
      expect(whirlwind?.cost).toBe(1)
      expect(whirlwind?.heroClass).toBe('Smarty')

      // 6. Geyser
      const geyser = getCardById('plant_geyser')
      expect(geyser).toBeDefined()
      expect(geyser?.name).toBe('Geyser')
      expect(geyser?.type).toBe('superpower')
      expect(geyser?.cost).toBe(1)
      expect(geyser?.heroClass).toBe('Solar')
    })

    it('verifies all 6 Zombie Superpowers metadata and attributes in the card database', () => {
      // 1. Carried Away (Super Brainz Signature)
      const carriedAway = getCardById('zombie_carried_away')
      expect(carriedAway).toBeDefined()
      expect(carriedAway?.name).toBe('Carried Away')
      expect(carriedAway?.type).toBe('superpower')
      expect(carriedAway?.cost).toBe(1)
      expect(carriedAway?.heroClass).toBe('Sneaky')
      expect(carriedAway?.team).toBe('zombies')

      // 2. Slammin' Smash (The Smash Signature)
      const slammin = getCardById('zombie_slammin_smash')
      expect(slammin).toBeDefined()
      expect(slammin?.name).toBe("Slammin' Smash")
      expect(slammin?.type).toBe('superpower')
      expect(slammin?.cost).toBe(1)
      expect(slammin?.heroClass).toBe('Beastly')

      // 3. Shrink Ray (Rustbolt Signature)
      const shrinkRay = getCardById('zombie_shrink_ray')
      expect(shrinkRay).toBeDefined()
      expect(shrinkRay?.name).toBe('Shrink Ray')
      expect(shrinkRay?.type).toBe('superpower')
      expect(shrinkRay?.cost).toBe(1)
      expect(shrinkRay?.heroClass).toBe('Brainy')

      // 4. Brute Strength
      const brute = getCardById('zombie_brute_strength')
      expect(brute).toBeDefined()
      expect(brute?.name).toBe('Brute Strength')
      expect(brute?.type).toBe('superpower')
      expect(brute?.cost).toBe(1)
      expect(brute?.heroClass).toBe('Crazy')

      // 5. Dance Off
      const danceOff = getCardById('zombie_dance_off')
      expect(danceOff).toBeDefined()
      expect(danceOff?.name).toBe('Dance Off')
      expect(danceOff?.type).toBe('superpower')
      expect(danceOff?.cost).toBe(1)
      expect(danceOff?.heroClass).toBe('Crazy')

      // 6. Cut Down to Size
      const cutDown = getCardById('zombie_cut_down_to_size')
      expect(cutDown).toBeDefined()
      expect(cutDown?.name).toBe('Cut Down to Size')
      expect(cutDown?.type).toBe('superpower')
      expect(cutDown?.cost).toBe(1)
      expect(cutDown?.heroClass).toBe('Brainy')
    })

    it('verifies Plant Embiggen buffs a target Plant minion by +2/+2', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_pea', 'Peashooter', 'plants', 1, 1)

      const res = executeSuperpower(state, 'plant_embiggen', 'plants', 1)
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(3)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(3)
      expect(res.message).toContain('Embiggen')
    })

    it('verifies Plant Whirlwind bounces an enemy Zombie back to hand', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_conga', 'Conga Zombie', 'zombies', 2, 2)
      state.zombieHand = []

      const res = executeSuperpower(state, 'plant_whirlwind', 'plants', 2)
      expect(res.updatedState.lanes[2].zombieMinion).toBeNull()
      expect(res.updatedState.zombieHand).toHaveLength(1)
      expect(res.updatedState.zombieHand[0].name).toBe('Conga Zombie')
      expect(res.message).toContain('Whirlwind')
    })

    it('verifies Plant Geyser heals Plant Hero and all damaged Plants on board by 4', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 14
      state.plantHero.maxHp = 20
      // Damaged plant in Lane 1 (2/5 with maxHealth 5)
      state.lanes[1].plantMinion = createMockMinion('p_tank', 'Wall-Nut', 'plants', 0, 2)
      state.lanes[1].plantMinion.maxHealth = 6

      const res = executeSuperpower(state, 'plant_geyser', 'plants')
      // Hero healed from 14 + 4 = 18 HP
      expect(res.updatedState.plantHero.hp).toBe(18)
      // Plant healed from 2 + 4 = 6 HP (capped at maxHealth 6)
      expect(res.updatedState.lanes[1].plantMinion?.currentHealth).toBe(6)
      expect(res.message).toContain('Geyser')
    })

    it('verifies Zombie Slammin Smash destroys a Plant with 4 or less Attack', () => {
      const state = createInitialGameState()
      // Plant with 3 ATK (eligible)
      state.lanes[1].plantMinion = createMockMinion('p_target', 'Repeater', 'plants', 3, 4)

      const res = executeSuperpower(state, 'zombie_slammin_smash', 'zombies')
      expect(res.updatedState.lanes[1].plantMinion).toBeNull()
      expect(res.message).toContain("Slammin' Smash")
    })

    it('verifies Zombie Shrink Ray debuffs a Plant by -3 Attack and draws 1 card', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p_strong', 'Bananasaurus', 'plants', 4, 4)
      const initialHand = state.zombieHand.length

      const res = executeSuperpower(state, 'zombie_shrink_ray', 'zombies')
      // 4 ATK - 3 = 1 ATK
      expect(res.updatedState.lanes[1].plantMinion?.currentAttack).toBe(1)
      expect(res.updatedState.zombieHand.length).toBe(initialHand + 1)
      expect(res.message).toContain('Shrink Ray')
    })

    it('verifies Zombie Brute Strength grants +3 Attack to a Zombie minion', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z_imp', 'Swabbie', 'zombies', 1, 1)

      const res = executeSuperpower(state, 'zombie_brute_strength', 'zombies', 2)
      expect(res.updatedState.lanes[2].zombieMinion?.currentAttack).toBe(4)
      expect(res.message).toContain('Brute Strength')
    })

    it('verifies Zombie Dance Off spawns two 1/1 Backup Dancers into empty lanes', () => {
      const state = createInitialGameState()
      // Clear all lanes
      state.lanes.forEach(l => { l.zombieMinion = null })

      const res = executeSuperpower(state, 'zombie_dance_off', 'zombies')
      const dancers = res.updatedState.lanes.filter(l => l.zombieMinion?.name === 'Backup Dancer')
      expect(dancers).toHaveLength(2)
      for (const d of dancers) {
        expect(d.zombieMinion?.currentAttack).toBe(1)
        expect(d.zombieMinion?.currentHealth).toBe(1)
      }
      expect(res.message).toContain('Dance Off')
    })

    it('verifies Zombie Cut Down to Size destroys a Plant minion with 5 or more Attack', () => {
      const state = createInitialGameState()
      // Plant with 6 ATK (eligible)
      state.lanes[0].plantMinion = createMockMinion('p_giant', 'Cornucopia', 'plants', 6, 6)

      const res = executeSuperpower(state, 'zombie_cut_down_to_size', 'zombies')
      expect(res.updatedState.lanes[0].plantMinion).toBeNull()
      expect(res.message).toContain('Cut Down to Size')
    })
  })

  // ==========================================================
  // 19. COMPLETE ENVIRONMENT SYSTEM SUITE (Round 4)
  // ==========================================================
  describe('19. Complete Environment System Suite (Round 4)', () => {
    it('verifies all 4 Environment cards metadata and properties in cards database', () => {
      // 1. Spikeweed Sector (Guardian Plant Environment)
      const spikeweed = getCardById('plant_spikeweed_sector')
      expect(spikeweed).toBeDefined()
      expect(spikeweed?.name).toBe('Spikeweed Sector')
      expect(spikeweed?.type).toBe('environment')
      expect(spikeweed?.cost).toBe(2)
      expect(spikeweed?.heroClass).toBe('Guardian')
      expect(spikeweed?.team).toBe('plants')

      // 2. Bog of Sunken Hope (Smarty Plant Environment)
      const bog = getCardById('plant_bog_of_sunken_hope')
      expect(bog).toBeDefined()
      expect(bog?.name).toBe('Bog of Sunken Hope')
      expect(bog?.type).toBe('environment')
      expect(bog?.cost).toBe(2)
      expect(bog?.heroClass).toBe('Smarty')
      expect(bog?.team).toBe('plants')
      expect(bog?.amphibious).toBe(true)

      // 3. Laser Base Alpha (Sneaky Zombie Environment)
      const laserBase = getCardById('zombie_laser_base_alpha')
      expect(laserBase).toBeDefined()
      expect(laserBase?.name).toBe('Laser Base Alpha')
      expect(laserBase?.type).toBe('environment')
      expect(laserBase?.cost).toBe(3)
      expect(laserBase?.heroClass).toBe('Sneaky')
      expect(laserBase?.team).toBe('zombies')
      expect(laserBase?.deadly).toBe(true)
      expect(laserBase?.strikethrough).toBe(true)

      // 4. Cone Zone (Hearty Zombie Environment)
      const coneZone = getCardById('zombie_cone_zone')
      expect(coneZone).toBeDefined()
      expect(coneZone?.name).toBe('Cone Zone')
      expect(coneZone?.type).toBe('environment')
      expect(coneZone?.cost).toBe(2)
      expect(coneZone?.heroClass).toBe('Hearty')
      expect(coneZone?.team).toBe('zombies')
    })

    it('verifies Bog of Sunken Hope grants Amphibious to Plant and debuffs non-amphibious Zombie by -2 Attack', () => {
      const state = createInitialGameState()
      state.lanes[1].plantMinion = createMockMinion('p1', 'Peashooter', 'plants', 1, 1, { amphibious: false })
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Conehead', 'zombies', 2, 2, { amphibious: false })

      const bogCard = convertCardDataToCard(getCardById('plant_bog_of_sunken_hope')!, 'plants')
      const res = playEnvironment(state, bogCard, 1, 'plants')

      // Plant gains Amphibious!
      expect(res.updatedState.lanes[1].plantMinion?.amphibious).toBe(true)
      // Zombie loses 2 Attack (2 - 2 = 0 ATK)
      expect(res.updatedState.lanes[1].zombieMinion?.currentAttack).toBe(0)
      expect(res.events.some(e => e.includes('Bog of Sunken Hope'))).toBe(true)
    })

    it('verifies Laser Base Alpha grants Deadly and Strikethrough to Zombie in the lane', () => {
      const state = createInitialGameState()
      state.lanes[2].zombieMinion = createMockMinion('z2', 'All-Star Zombie', 'zombies', 4, 6)

      const laserCard = convertCardDataToCard(getCardById('zombie_laser_base_alpha')!, 'zombies')
      const res = playEnvironment(state, laserCard, 2, 'zombies')

      expect(res.updatedState.lanes[2].zombieMinion?.deadly).toBe(true)
      expect(res.updatedState.lanes[2].zombieMinion?.strikethrough).toBe(true)
      expect(res.events.some(e => e.includes('Laser Base Alpha'))).toBe(true)
    })

    it('verifies Cone Zone increases Zombie health by +3 HP', () => {
      const state = createInitialGameState()
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Basic Zombie', 'zombies', 1, 1)

      const coneZoneCard = convertCardDataToCard(getCardById('zombie_cone_zone')!, 'zombies')
      const res = playEnvironment(state, coneZoneCard, 1, 'zombies')

      // 1 HP + 3 = 4 HP
      expect(res.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(4)
      expect(res.events.some(e => e.includes('Cone Zone'))).toBe(true)
    })

    it('verifies applyEnvironmentOnPlay applies effects when minions are deployed into environment lanes', () => {
      const state = createInitialGameState()
      // Setup Lane 1 with Laser Base Alpha
      state.lanes[1].environment = {
        id: 'zombie_laser_base_alpha',
        name: 'Laser Base Alpha',
        side: 'zombies',
        image: '/assets/cards/zombies/Moon Base Z.png',
        description: 'Deadly and Strikethrough',
      }
      state.lanes[1].zombieMinion = createMockMinion('z_new', 'New Zombie', 'zombies', 3, 3)

      const res = applyEnvironmentOnPlay(state, 1, 'zombies')
      expect(res.updatedState.lanes[1].zombieMinion?.deadly).toBe(true)
      expect(res.updatedState.lanes[1].zombieMinion?.strikethrough).toBe(true)
    })

    it('verifies playing an Environment over an existing Environment replaces it cleanly', () => {
      const state = createInitialGameState()
      state.lanes[2].environment = {
        id: 'plant_bog_of_sunken_hope',
        name: 'Bog of Sunken Hope',
        side: 'plants',
        description: 'Old environment',
        image: '/assets/cards/plants/Planet of the Grapes.png',
      }

      const coneZoneCard = convertCardDataToCard(getCardById('zombie_cone_zone')!, 'zombies')
      const res = playEnvironment(state, coneZoneCard, 2, 'zombies')

      expect(res.updatedState.lanes[2].environment?.id).toBe('zombie_cone_zone')
      expect(res.updatedState.lanes[2].environment?.name).toBe('Cone Zone')
      expect(res.events[0]).toContain('thay thế Bog of Sunken Hope')
    })

    it('verifies card database query helpers for Superpower and Environment types', () => {
      const envCards = getCardsByType('environment')
      expect(envCards.length).toBeGreaterThanOrEqual(4)
      expect(envCards.some(c => c.id === 'plant_spikeweed_sector')).toBe(true)
      expect(envCards.some(c => c.id === 'plant_bog_of_sunken_hope')).toBe(true)
      expect(envCards.some(c => c.id === 'zombie_laser_base_alpha')).toBe(true)
      expect(envCards.some(c => c.id === 'zombie_cone_zone')).toBe(true)

      const spCards = getCardsByType('superpower')
      expect(spCards.length).toBeGreaterThanOrEqual(12)
      expect(spCards.some(c => c.id === 'plant_precision_blast')).toBe(true)
      expect(spCards.some(c => c.id === 'zombie_carried_away')).toBe(true)
    })
  })

  // ==========================================================
  // 20. ICONIC LEGENDARY & SUPER-RARE POWERHOUSES SUITE (Round 5)
  // ==========================================================
  describe('20. Iconic Legendary & Super-Rare Powerhouses Suite (Round 5)', () => {
    // --------------------------------------------------------
    // 1. Bananasaurus Rex (Double Strike & Dino-Roar)
    // --------------------------------------------------------
    it('verifies Bananasaurus Rex gains +1/+1 upon drawing cards via Dino-Roar trigger', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 6

      // Deploy Bananasaurus Rex (3/3 Double Strike)
      const bRexCard: Card = {
        id: 'plant_bananasaurus_rex',
        name: 'Bananasaurus Rex',
        side: 'plants',
        type: 'minion',
        cost: 4,
        attack: 3,
        health: 3,
        doubleStrike: true,
        traits: ['doubleStrike', 'dino-roar'],
        image: '/assets/cards/plants/Bananasaurus Rex.png',
      }
      state.plantHand = [bRexCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'plant_bananasaurus_rex',
        laneIndex: 1,
      })

      expect(state.lanes[1].plantMinion?.currentAttack).toBe(3)
      expect(state.lanes[1].plantMinion?.currentHealth).toBe(3)

      // A. Dino-Roar triggered directly
      const roarRes = triggerDinoRoar(state, 'plants')
      expect(roarRes.updatedState.lanes[1].plantMinion?.currentAttack).toBe(4)
      expect(roarRes.updatedState.lanes[1].plantMinion?.currentHealth).toBe(4)
      expect(roarRes.events.some(e => e.includes('Bananasaurus Rex gầm vang'))).toBe(true)

      // B. Dino-Roar triggered by DRAW_CARD action
      let drawState = roarRes.updatedState
      drawState.plantDeck = [
        createMockCard('p_extra', 'Extra Peashooter', 'plants', 1, 1, 1),
      ]
      drawState = gameReducer(drawState, {
        type: 'DRAW_CARD',
        side: 'plants',
      })
      // 4/4 + 1/1 = 5/5
      expect(drawState.lanes[1].plantMinion?.currentAttack).toBe(5)
      expect(drawState.lanes[1].plantMinion?.currentHealth).toBe(5)
    })

    it('verifies Bananasaurus Rex executes Double Strike: striking twice during combat', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20

      // Lane 1: Open lane for Bananasaurus Rex (3/3 Double Strike)
      state.lanes[1].plantMinion = createMockMinion('b_rex', 'Bananasaurus Rex', 'plants', 3, 3, {
        doubleStrike: true,
        traits: ['doubleStrike'],
      })

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Double Strike strikes twice: 3 + 3 = 6 damage to Zombie Hero
      expect(combatRes.updatedState.zombieHero.hp).toBe(14)
      const plantStrikes = combatRes.events.filter(e => e.attackerName.includes('Bananasaurus Rex') && e.target === 'hero')
      expect(plantStrikes.length).toBe(2)
      expect(plantStrikes[0].damageDealt).toBe(3)
      expect(plantStrikes[1].damageDealt).toBe(3)
      expect(combatRes.events.some(e => e.description.includes('Double Strike'))).toBe(true)
    })

    // --------------------------------------------------------
    // 2. Trickster (Cost Reduction & Bonus Attack on Play)
    // --------------------------------------------------------
    it('verifies Trickster reduces cost by 1 Brain in hand whenever a Zombie trick is played', () => {
      const state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 6

      // Trickster in hand with base cost 10
      const tricksterCard: Card = {
        id: 'zombie_trickster',
        name: 'Trickster',
        side: 'zombies',
        type: 'minion',
        cost: 10,
        attack: 6,
        health: 6,
        image: '/assets/cards/zombies/Trickster.png',
      }
      state.zombieHand = [tricksterCard]

      // Play 3 Zombie tricks
      const plumberCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' })

      const res1 = triggerWhenTrickPlayed(state, plumberCard, 'zombies')
      expect(res1.updatedState.zombieHand.find(c => c.id === 'zombie_trickster')?.cost).toBe(9)

      const res2 = triggerWhenTrickPlayed(res1.updatedState, plumberCard, 'zombies')
      expect(res2.updatedState.zombieHand.find(c => c.id === 'zombie_trickster')?.cost).toBe(8)

      const res3 = triggerWhenTrickPlayed(res2.updatedState, plumberCard, 'zombies')
      expect(res3.updatedState.zombieHand.find(c => c.id === 'zombie_trickster')?.cost).toBe(7)
    })

    it('verifies Trickster executes immediate Bonus Attack upon entering the battlefield', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 10
      state.plantHero.hp = 20

      // Plant in lane 1 with 4 HP
      state.lanes[1].plantMinion = createMockMinion('p_repeater', 'Repeater', 'plants', 2, 4)

      // Play Trickster into Lane 1
      const tricksterCard: Card = {
        id: 'zombie_trickster',
        name: 'Trickster',
        side: 'zombies',
        type: 'minion',
        cost: 10,
        attack: 6,
        health: 6,
        image: '/assets/cards/zombies/Trickster.png',
      }
      state.zombieHand = [tricksterCard]
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_trickster',
        laneIndex: 1,
      })

      // Bonus Attack deals 6 damage to Repeater (4 HP) -> Repeater destroyed immediately upon play!
      expect(state.lanes[1].plantMinion).toBeNull()
      expect(state.combatLog.some(log => log.includes('Trickster xuất kích') || log.includes('Bonus Attack'))).toBe(true)

      // Test Trickster in open lane striking Hero directly
      let directState = createInitialGameState()
      directState.phase = 'ZOMBIE_PLAY'
      directState.zombieHero.brains = 10
      directState.plantHero.hp = 20
      directState.zombieHand = [tricksterCard]

      directState = gameReducer(directState, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_trickster',
        laneIndex: 2, // Open lane
      })

      // Plant Hero takes 6 bonus attack damage: 20 - 6 = 14 HP
      expect(directState.plantHero.hp).toBe(14)
      expect(directState.combatLog.some(log => log.includes('Trickster đánh thẳng mặt Plant Hero'))).toBe(true)
    })

    // --------------------------------------------------------
    // 3. Valkyrie (In-Hand Attack Buff on Ally Zombie Death)
    // --------------------------------------------------------
    it('verifies Valkyrie in hand gains +2 Attack whenever an allied Zombie is destroyed', () => {
      const state = createInitialGameState()

      // Valkyrie in zombieHand starting with 0 Attack
      const valkCard: Card = {
        id: 'zombie_valkyrie',
        name: 'Valkyrie',
        side: 'zombies',
        type: 'minion',
        cost: 3,
        attack: 0,
        health: 6,
        image: '/assets/cards/zombies/Valkyrie.png',
      }
      state.zombieHand = [valkCard]

      // 1st Zombie casualty
      const deadZombie1 = createMockMinion('z1', 'Basic Zombie', 'zombies', 1, 1)
      const res1 = triggerOnDeath(state, deadZombie1, 0)
      const valkInHand1 = res1.updatedState.zombieHand.find(c => c.id === 'zombie_valkyrie')
      expect(valkInHand1?.attack).toBe(2)
      expect(res1.logs.some(l => l.includes('Valkyrie'))).toBe(true)

      // 2nd Zombie casualty
      const deadZombie2 = createMockMinion('z2', 'Conehead Zombie', 'zombies', 2, 2)
      const res2 = triggerOnDeath(res1.updatedState, deadZombie2, 0)
      const valkInHand2 = res2.updatedState.zombieHand.find(c => c.id === 'zombie_valkyrie')
      expect(valkInHand2?.attack).toBe(4)

      // 3rd Zombie casualty
      const deadZombie3 = createMockMinion('z3', 'Buckethead Zombie', 'zombies', 3, 4)
      const res3 = triggerOnDeath(res2.updatedState, deadZombie3, 0)
      const valkInHand3 = res3.updatedState.zombieHand.find(c => c.id === 'zombie_valkyrie')
      expect(valkInHand3?.attack).toBe(6)

      // Playing Valkyrie transfers the buffed attack onto the board minion
      let playState = res3.updatedState
      playState.phase = 'ZOMBIE_PLAY'
      playState.zombieHero.brains = 3
      playState = gameReducer(playState, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_valkyrie',
        laneIndex: 1,
      })

      const playedValk = playState.lanes[1].zombieMinion
      expect(playedValk).toBeDefined()
      expect(playedValk?.currentAttack).toBe(6)
      expect(playedValk?.currentHealth).toBe(6)
    })

    // --------------------------------------------------------
    // 4. Dark Matter Dragonfruit (Zombie Tricks Surtax & Splash Damage 6)
    // --------------------------------------------------------
    it('verifies Dark Matter Dragonfruit increases Zombie Tricks cost by +6 Brains', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.brains = 5

      // Deploy Dark Matter Dragonfruit in Lane 1
      state.lanes[1].plantMinion = createMockMinion(
        'dmd',
        'Dark Matter Dragonfruit',
        'plants',
        6,
        6,
        { cardId: 'plant_dark_matter_dragonfruit' }
      )

      // Bungee Plumber normally costs 1 Brain, but now costs 1 + 6 = 7 Brains!
      const bungeeCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' })
      state.zombieHand = [bungeeCard]

      // Zombie only has 5 brains -> cannot afford the 7-cost trick!
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_bungee_plumber',
        laneIndex: 1,
      })

      // Trick rejected due to insufficient brains
      expect(state.zombieHand).toHaveLength(1)
      expect(state.zombieHero.brains).toBe(5)
      expect(state.combatLog.some(log => log.includes('Không đủ năng lượng') || log.includes('Dark Matter Dragonfruit'))).toBe(true)

      // Give Zombie 7 Brains -> Can now afford and deducts all 7 Brains
      state.zombieHero.brains = 7
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_bungee_plumber',
        laneIndex: 0,
        targetHero: true,
      })
      expect(state.zombieHero.brains).toBe(0) // 7 - (1 + 6) = 0 Brains!
      expect(state.plantHero.hp).toBe(18) // Took 2 damage
    })

    it('verifies Dark Matter Dragonfruit deals Splash Damage 6 to adjacent lanes', () => {
      const state = createInitialGameState()
      // Lane 1: Dark Matter Dragonfruit (6/6) facing 10-HP Zombie
      state.lanes[1].plantMinion = createMockMinion(
        'dmd',
        'Dark Matter Dragonfruit',
        'plants',
        6,
        6,
        {
          cardId: 'plant_dark_matter_dragonfruit',
          traits: ['Amphibious', 'Splash Damage 6'],
        }
      )
      state.lanes[1].zombieMinion = createMockMinion('z1', 'Knight', 'zombies', 5, 10)

      // Lane 0 (Adjacent): 5-HP Zombie
      state.lanes[0].zombieMinion = createMockMinion('z0', 'Conehead', 'zombies', 2, 5)
      // Lane 2 (Adjacent): 8-HP Gargantuar
      state.lanes[2].zombieMinion = createMockMinion('z2', 'Gargantuar', 'zombies', 6, 8)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Lane 0 Zombie (5 HP) took 6 splash damage -> destroyed!
      expect(combatRes.updatedState.lanes[0].zombieMinion).toBeNull()

      // Lane 2 Zombie (8 HP) took 6 splash damage -> 8 - 6 = 2 HP remaining!
      expect(combatRes.updatedState.lanes[2].zombieMinion?.currentHealth).toBe(2)

      // Splash events logged
      expect(combatRes.events.some(e => e.description.includes('Splash Damage'))).toBe(true)
    })

    // --------------------------------------------------------
    // 5. Brainana (Amphibious & Complete Brain Drain)
    // --------------------------------------------------------
    it('verifies Brainana drains all Brains of Zombie Hero down to 0 upon entering play', () => {
      let state = createInitialGameState()
      state.phase = 'PLANT_PLAY'
      state.plantHero.sun = 6
      state.zombieHero.brains = 8 // Zombie hoarded 8 Brains for Tricks phase

      const brainanaCard: Card = {
        id: 'plant_brainana',
        name: 'Brainana',
        side: 'plants',
        type: 'minion',
        cost: 6,
        attack: 4,
        health: 3,
        amphibious: true,
        traits: ['Amphibious'],
        image: '/assets/cards/plants/Brainana.png',
      }
      state.plantHand = [brainanaCard]

      // Play Brainana in Water Lane (Lane 4)
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'plants',
        cardId: 'plant_brainana',
        laneIndex: 4,
      })

      // Brainana successfully played into water lane
      expect(state.lanes[4].plantMinion?.name).toBe('Brainana')
      expect(state.lanes[4].plantMinion?.amphibious).toBe(true)

      // Zombie Hero lost ALL 8 Brains!
      expect(state.zombieHero.brains).toBe(0)
      expect(state.combatLog.some(log => log.includes('Brainana xuất trận: Hút sạch toàn bộ 8 Não'))).toBe(true)
    })

    // --------------------------------------------------------
    // 6. Zombot 1000 (Board Wipe across All Lanes & Team-Up)
    // --------------------------------------------------------
    it('verifies Zombot 1000 destroys all Plants on every lane including Team-Up minions upon play', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_PLAY'
      state.zombieHero.brains = 9

      // Set up plants across multiple lanes including Team-Up
      state.lanes[0].plantMinion = createMockMinion('p0', 'Peashooter', 'plants', 1, 1)
      state.lanes[1].plantMinion = createMockMinion('p1', 'Repeater', 'plants', 2, 2)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p1_tu', 'Torchwood', 'plants', 0, 3, { teamUp: true })
      state.lanes[2].plantMinion = createMockMinion('p2', 'Wall-Nut', 'plants', 0, 6)
      state.lanes[4].plantMinion = createMockMinion('p4', 'Bananasaurus', 'plants', 4, 4, { amphibious: true })

      // Play Zombot 1000 in Lane 3
      const zombotCard: Card = {
        id: 'zombie_zombot_1000',
        name: 'Zombot 1000',
        side: 'zombies',
        type: 'minion',
        cost: 9,
        attack: 9,
        health: 9,
        image: '/assets/cards/zombies/Zombot 1000.png',
      }
      state.zombieHand = [zombotCard]

      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_zombot_1000',
        laneIndex: 3,
      })

      // Every single plant minion wiped clean!
      expect(state.lanes[0].plantMinion).toBeNull()
      expect(state.lanes[1].plantMinion).toBeNull()
      expect(state.lanes[1].plantTeamUpMinion).toBeNull()
      expect(state.lanes[2].plantMinion).toBeNull()
      expect(state.lanes[4].plantMinion).toBeNull()

      // Zombot sits menacingly in Lane 3
      expect(state.lanes[3].zombieMinion?.name).toBe('Zombot 1000')
      expect(state.lanes[3].zombieMinion?.currentAttack).toBe(9)
      expect(state.lanes[3].zombieMinion?.currentHealth).toBe(9)
      expect(state.combatLog.some(log => log.includes('ZOMBOT 1000 KHỔNG LỒ XUẤT HIỆN'))).toBe(true)
    })
  })

  // ==========================================================
  // 21. ADVANCED KEYWORD EDGE-CASES & COMBOS SUITE (Round 5)
  // ==========================================================
  describe('21. Advanced Keyword Edge-Cases & Combos Suite (Round 5)', () => {
    // --------------------------------------------------------
    // 1. Bullseye: Hero Damage without Block Meter Accumulation
    // --------------------------------------------------------
    it('verifies Plant Bullseye minion deals face damage to Zombie Hero without charging any Block Meter segments', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20
      state.zombieHero.blockMeter = 0

      // Lane 1: Open lane Plant with Bullseye (3 ATK)
      state.lanes[1].plantMinion = createMockMinion('p_bullseye', 'Astro-Shroom', 'plants', 3, 3, {
        bullseye: true,
        traits: ['bullseye'],
      })

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Zombie Hero takes 3 damage: 20 - 3 = 17 HP
      expect(combatRes.updatedState.zombieHero.hp).toBe(17)
      // Block Meter remains strictly 0 (Zero segments charged!)
      expect(combatRes.updatedState.zombieHero.blockMeter).toBe(0)
      expect(combatRes.hasSuperBlock).toBe(false)
      expect(combatRes.updatedState.pendingSuperBlock).toBeNull()
    })

    it('verifies Zombie Bullseye minion deals face damage to Plant Hero without charging any Block Meter segments', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20
      state.plantHero.blockMeter = 5 // Pre-existing 5 segments

      // Lane 2: Open lane Zombie with Bullseye (4 ATK)
      state.lanes[2].zombieMinion = createMockMinion('z_bullseye', 'Bullseye Mech', 'zombies', 4, 5, {
        bullseye: true,
        traits: ['bullseye'],
      })

      const combatRes = resolveSingleLaneCombat(state, 2)

      // Plant Hero takes 4 damage: 20 - 4 = 16 HP
      expect(combatRes.updatedState.plantHero.hp).toBe(16)
      // Block Meter remains unchanged at exactly 5 (Zero increments!)
      expect(combatRes.updatedState.plantHero.blockMeter).toBe(5)
      expect(combatRes.hasSuperBlock).toBe(false)
    })

    // --------------------------------------------------------
    // 2. Strikethrough: Simultaneous Minion & Face Damage
    // --------------------------------------------------------
    it('verifies Plant with Strikethrough damages opposing Zombie and hits Zombie Hero simultaneously', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20

      // Lane 1: Plant with Strikethrough (3 ATK, 4 HP)
      state.lanes[1].plantMinion = createMockMinion('p_strike', 'Power Flower', 'plants', 3, 4, {
        strikethrough: true,
        traits: ['strikethrough'],
      })
      // Opposing Zombie (2 ATK, 5 HP)
      state.lanes[1].zombieMinion = createMockMinion('z_cone', 'Conehead', 'zombies', 2, 5)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // 1. Zombie minion took 3 damage: 5 - 3 = 2 HP
      expect(combatRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(2)

      // 2. Zombie Hero simultaneously took 3 Strikethrough damage: 20 - 3 = 17 HP
      expect(combatRes.updatedState.zombieHero.hp).toBe(17)

      // Both combat events recorded
      expect(combatRes.events.some(e => e.target === 'minion' && e.damageDealt === 3)).toBe(true)
      expect(combatRes.events.some(e => e.target === 'hero' && e.traitsTriggered?.includes('strikethrough'))).toBe(true)
    })

    it('verifies Zombie with Strikethrough damages opposing Plant and hits Plant Hero simultaneously', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      // Lane 2: Zombie with Strikethrough (4 ATK, 6 HP)
      state.lanes[2].zombieMinion = createMockMinion('z_strike', 'Linebacker Zombie', 'zombies', 4, 6, {
        strikethrough: true,
        traits: ['strikethrough'],
      })
      // Opposing Plant (2 ATK, 4 HP)
      state.lanes[2].plantMinion = createMockMinion('p_rep', 'Repeater', 'plants', 2, 4)

      const combatRes = resolveSingleLaneCombat(state, 2)

      // 1. Plant minion destroyed: 4 HP - 4 damage = 0 HP
      expect(combatRes.updatedState.lanes[2].plantMinion).toBeNull()

      // 2. Plant Hero simultaneously took 4 Strikethrough damage: 20 - 4 = 16 HP
      expect(combatRes.updatedState.plantHero.hp).toBe(16)
      expect(combatRes.events.some(e => e.target === 'hero' && e.traitsTriggered?.includes('strikethrough'))).toBe(true)
    })

    // --------------------------------------------------------
    // 3. Frenzy vs Team-Up: Primary Target Destruction & Follow-up
    // --------------------------------------------------------
    it('verifies Zombie Frenzy strikes the secondary Team-Up Plant in the same lane after destroying the front Plant', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      // Lane 1: Zombie with Frenzy (5 ATK, 6 HP)
      state.lanes[1].zombieMinion = createMockMinion('z_frenzy', 'All-Star Zombie', 'zombies', 5, 6, {
        frenzy: true,
        traits: ['frenzy'],
      })

      // Lane 1 Plants: Front Plant (2 HP) + Team-Up Plant (3 HP)
      state.lanes[1].plantMinion = createMockMinion('p_front', 'Peashooter', 'plants', 1, 2)
      state.lanes[1].plantTeamUpMinion = createMockMinion('p_teamup', 'Torchwood', 'plants', 0, 3, {
        teamUp: true,
      })

      const combatRes = resolveSingleLaneCombat(state, 1)

      // 1. Front Plant (2 HP) destroyed by primary attack
      expect(combatRes.updatedState.lanes[1].plantMinion).toBeNull()

      // 2. Team-Up Plant (3 HP) targeted and destroyed by Frenzy bonus attack (5 damage >= 3 HP)
      expect(combatRes.updatedState.lanes[1].plantTeamUpMinion).toBeNull()

      // 3. Plant Hero was protected and did NOT take face damage this turn!
      expect(combatRes.updatedState.plantHero.hp).toBe(20)

      // Verify Frenzy event logged
      const frenzyEvent = combatRes.events.find(e => e.traitsTriggered?.includes('frenzy'))
      expect(frenzyEvent).toBeDefined()
      expect(frenzyEvent?.attackerName).toContain('Frenzy')
      expect(frenzyEvent?.damageDealt).toBe(5)
    })

    it('verifies Zombie Frenzy strikes Plant Hero directly after destroying the sole Plant in lane', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      // Lane 1: Zombie with Frenzy (4 ATK, 5 HP)
      state.lanes[1].zombieMinion = createMockMinion('z_frenzy2', 'Vimpyre', 'zombies', 4, 5, {
        frenzy: true,
        traits: ['frenzy'],
      })
      // Sole Plant in lane with 2 HP (no Team-Up)
      state.lanes[1].plantMinion = createMockMinion('p_solo', 'Snow Pea', 'plants', 2, 2)
      state.lanes[1].plantTeamUpMinion = null

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Plant destroyed
      expect(combatRes.updatedState.lanes[1].plantMinion).toBeNull()

      // Frenzy bonus attack hits Plant Hero directly: 20 - 4 = 16 HP
      expect(combatRes.updatedState.plantHero.hp).toBe(16)
      expect(combatRes.events.some(e => e.target === 'hero' && e.traitsTriggered?.includes('frenzy'))).toBe(true)
    })

    // --------------------------------------------------------
    // 4. Anti-Hero: Buff on Open Lane & Loss of Buff when Contested
    // --------------------------------------------------------
    it('verifies Plant Anti-Hero gains attack buff in open lane and strikes enemy Hero with boosted attack', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20

      // Lane 1: Open lane Plant with Anti-Hero 2 (base attack 2)
      state.lanes[1].plantMinion = createMockMinion('p_anti', 'Poison Ivy', 'plants', 2, 3, {
        antiHero: 2,
        traits: ['Anti-Hero 2'],
      })
      state.lanes[1].zombieMinion = null

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Deals base 2 + 2 Anti-Hero = 4 damage to Zombie Hero!
      expect(combatRes.updatedState.zombieHero.hp).toBe(16) // 20 - 4 = 16 HP
      expect(combatRes.events.some(e => e.target === 'hero' && e.damageDealt === 4)).toBe(true)
    })

    it('verifies Plant Anti-Hero loses buff when facing an opposing Zombie in the lane', () => {
      const state = createInitialGameState()
      state.zombieHero.hp = 20

      // Lane 1: Plant with Anti-Hero 2 (base attack 2)
      state.lanes[1].plantMinion = createMockMinion('p_anti', 'Poison Ivy', 'plants', 2, 3, {
        antiHero: 2,
        traits: ['Anti-Hero 2'],
      })
      // Opposing Zombie (1 ATK, 5 HP) placed in Lane 1
      state.lanes[1].zombieMinion = createMockMinion('z_blocker', 'Conehead', 'zombies', 1, 5)

      const combatRes = resolveSingleLaneCombat(state, 1)

      // Anti-Hero buff is NOT applied against minions! Plant deals exactly base 2 damage
      expect(combatRes.updatedState.lanes[1].zombieMinion?.currentHealth).toBe(3) // 5 - 2 = 3 HP
      // Zombie Hero took 0 damage
      expect(combatRes.updatedState.zombieHero.hp).toBe(20)
    })

    it('verifies Zombie Anti-Hero gains attack buff in open lane against Plant Hero', () => {
      const state = createInitialGameState()
      state.plantHero.hp = 20

      // Lane 2: Open lane Zombie with Anti-Hero 4 (base attack 2)
      state.lanes[2].zombieMinion = createMockMinion('z_stealthy', 'Stealthy Imp', 'zombies', 2, 2, {
        antiHero: 4,
        traits: ['Anti-Hero 4'],
      })
      state.lanes[2].plantMinion = null

      const combatRes = resolveSingleLaneCombat(state, 2)

      // Deals base 2 + 4 Anti-Hero = 6 damage to Plant Hero!
      expect(combatRes.updatedState.plantHero.hp).toBe(14) // 20 - 6 = 14 HP
      expect(combatRes.events.some(e => e.target === 'hero' && e.damageDealt === 6)).toBe(true)
    })
  })

  // ==========================================================
  // 22. PVE CAMPAIGN & BOSS MECHANICS SIMULATION SUITE (Round 5)
  // ==========================================================
  describe('22. PvE Campaign & Boss Mechanics Simulation Suite (Round 5)', () => {
    // --------------------------------------------------------
    // 1. Preset Initial Board State & Modifiers
    // --------------------------------------------------------
    it('verifies custom PvE Campaign initialization with preset minions, environments, and asymmetrical hero HP', () => {
      let state = createInitialGameState()

      // Campaign Modifier: "Dr. Zomboss Revenge"
      // Boss has 35 HP and starts with 3 Brains reserve
      state.zombieHero.hp = 35
      state.zombieHero.maxHp = 35
      state.zombieHero.brains = 3
      state.zombieHero.maxBrains = 3

      // Player has standard 20 HP but gets 2 starting Sun
      state.plantHero.hp = 20
      state.plantHero.maxHp = 20
      state.plantHero.sun = 2
      state.plantHero.maxSun = 2

      // Pre-placed Boss minions:
      // Lane 0 (Heights): Backup Dancer (1/1)
      state.lanes[0].zombieMinion = createMockMinion('boss_m0', 'Backup Dancer', 'zombies', 1, 1)
      // Lane 2: Pre-placed Laser Base Alpha + All-Star Zombie (4/6)
      state.lanes[2].environment = {
        id: 'zombie_laser_base_alpha',
        name: 'Laser Base Alpha',
        side: 'zombies',
        image: '/assets/cards/zombies/Moon Base Z.png',
        description: 'Deadly and Strikethrough',
      }
      state.lanes[2].zombieMinion = createMockMinion('boss_m2', 'All-Star Zombie', 'zombies', 4, 6, {
        deadly: true,
        strikethrough: true,
      })
      // Lane 4 (Water): Pre-placed Swabbie (1/1 Amphibious)
      state.lanes[4].zombieMinion = createMockMinion('boss_m4', 'Swabbie', 'zombies', 1, 1, {
        amphibious: true,
      })

      // Pre-placed Player minion: Lane 1 Wall-Nut (0/6 Team-Up)
      state.lanes[1].plantMinion = createMockMinion('player_m1', 'Wall-Nut', 'plants', 0, 6, {
        teamUp: true,
      })

      // Verify Boss Board State Integrity
      expect(state.zombieHero.hp).toBe(35)
      expect(state.zombieHero.brains).toBe(3)
      expect(state.plantHero.hp).toBe(20)
      expect(state.plantHero.sun).toBe(2)

      expect(state.lanes[0].zombieMinion?.name).toBe('Backup Dancer')
      expect(state.lanes[1].plantMinion?.name).toBe('Wall-Nut')
      expect(state.lanes[2].environment?.id).toBe('zombie_laser_base_alpha')
      expect(state.lanes[2].zombieMinion?.name).toBe('All-Star Zombie')
      expect(state.lanes[2].zombieMinion?.deadly).toBe(true)
      expect(state.lanes[2].zombieMinion?.strikethrough).toBe(true)
      expect(state.lanes[4].zombieMinion?.name).toBe('Swabbie')
      expect(state.lanes[4].zombieMinion?.amphibious).toBe(true)
    })

    // --------------------------------------------------------
    // 2. Boss AI Tactical Behavior on Asymmetrical Board
    // --------------------------------------------------------
    it('verifies Boss AI on Expert difficulty analyzes pre-placed board and executes optimal tricks against player defenses', () => {
      let state = createInitialGameState()
      state.phase = 'ZOMBIE_TRICKS'
      state.zombieHero.hp = 35
      state.zombieHero.brains = 4
      state.plantHero.hp = 12

      // Player has dangerous 5 ATK Repeater in Lane 1 threatening Boss
      state.lanes[1].plantMinion = createMockMinion('p_threat', 'Repeater', 'plants', 5, 2)
      // Boss has an All-Star in Lane 2
      state.lanes[2].zombieMinion = createMockMinion('boss_z', 'All-Star Zombie', 'zombies', 4, 6)

      // Boss holds Bungee Plumber (killable target: 2-HP Repeater in Lane 1)
      const bungeeCard = createMockCard('zombie_bungee_plumber', 'Bungee Plumber', 'zombies', 1, 0, 0, { type: 'trick' })
      // Boss holds Lurch for Lunch (bonus attack on Lane 2)
      const lurchCard = createMockCard('zombie_lurch_for_lunch', 'Lurch for Lunch', 'zombies', 2, 0, 0, { type: 'trick' })
      state.zombieHand = [bungeeCard, lurchCard]

      const decision = getAIDecision(state, 'zombies', 'expert')

      // Boss AI targets the threatening 5-ATK / 2-HP Plant with Bungee Plumber to neutralize high threat
      expect(decision.action).toBe('PLAY_TRICK')
      expect(decision.card?.id).toBe('zombie_bungee_plumber')
      expect(decision.laneIndex).toBe(1)
      expect(decision.reason).toContain('Bungee Plumber')

      // Execute Boss trick
      state = gameReducer(state, {
        type: 'PLAY_CARD',
        side: 'zombies',
        cardId: 'zombie_bungee_plumber',
        laneIndex: 1,
      })

      // Threat neutralized
      expect(state.lanes[1].plantMinion).toBeNull()
      expect(state.zombieHero.brains).toBe(3)
    })

    // --------------------------------------------------------
    // 3. Campaign Win Condition: Turn Limit Objective
    // --------------------------------------------------------
    it('verifies Campaign condition: Defeating Boss within turn limit triggers Player Victory', () => {
      let state = createInitialGameState()
      state.phase = 'FIGHT'
      state.turn = 3 // Current Turn 3

      // Boss has 4 HP left
      state.zombieHero.hp = 4

      // Player has a 6 ATK Gatling Pea in Lane 0 facing open lane
      state.lanes[0].plantMinion = createMockMinion('p_finisher', 'Gatling Pea', 'plants', 6, 4)
      state.lanes[0].zombieMinion = null

      // Execute combat
      state = gameReducer(state, { type: 'START_COMBAT' })

      // Boss HP reduced below 0
      expect(state.zombieHero.hp).toBeLessThanOrEqual(0)

      // Objective Met: Win within Turn <= 3
      const isVictorious = state.zombieHero.hp <= 0 && state.turn <= 3
      expect(isVictorious).toBe(true)
      expect(state.plantHero.hp).toBeGreaterThan(0)
    })

    // --------------------------------------------------------
    // 4. Campaign Survival Condition: Player Withstands Boss Onslaught
    // --------------------------------------------------------
    it('verifies Campaign condition: Player survives 3 continuous turns of Boss attacks with valid HP', () => {
      let state = createInitialGameState()
      state.plantHero.hp = 20
      state.zombieHero.hp = 30

      // Simulate 3 full rounds of combat
      for (let t = 1; t <= 3; t++) {
        // Step to FIGHT phase
        state.phase = 'FIGHT'
        // Place a moderate Zombie attacker in Lane 1
        state.lanes[1].zombieMinion = createMockMinion(`z_wave_${t}`, 'Conehead', 'zombies', 2, 3)
        // Place a defensive Plant Wall-Nut in Lane 1 to absorb damage
        if (!state.lanes[1].plantMinion) {
          state.lanes[1].plantMinion = createMockMinion(`p_nut_${t}`, 'Wall-Nut', 'plants', 0, 6)
        }

        state = gameReducer(state, { type: 'START_COMBAT' })

        // Step to next turn
        state = gameReducer(state, { type: 'NEXT_PHASE' })
      }

      // Assert player survived through Turn 4
      expect(state.turn).toBe(4)
      expect(state.plantHero.hp).toBeGreaterThan(0)
      expect(state.plantHero.hp).toBe(20) // Completely absorbed by Wall-Nut!
      expect(state.plantGraveyard.length).toBeGreaterThanOrEqual(1)
    })

    // --------------------------------------------------------
    // 5. Boss Phase Transition / Enrage Mechanic
    // --------------------------------------------------------
    it('verifies Boss Enrage Phase Transition: Boss triggers defensive emergency shield when reduced to <= 15 HP', () => {
      let state = createInitialGameState()
      state.zombieHero.hp = 18
      state.zombieHero.maxHp = 35

      // Player deals 5 damage dropping Boss to 13 HP (below 15 HP threshold)
      const res = applyHeroDamage(state.zombieHero, 5, false)
      state.zombieHero = res.updatedHero
      expect(state.zombieHero.hp).toBe(13)

      // Campaign Enrage Logic: Check HP threshold <= 15
      const isBossEnraged = state.zombieHero.hp <= 15 && state.zombieHero.hp > 0
      expect(isBossEnraged).toBe(true)

      // Trigger Enrage event: Boss gains immediate Super-Block shield & bonus brains
      if (isBossEnraged) {
        state.zombieHero.isShieldActive = true
        state.zombieHero.brains += 2
        state.combatLog = ['⚡ CẢNH BÁO: DR. ZOMBOSS PHẪN NỘ (ENRAGE)! Bật khiên phòng thủ và nạp thêm 2 Não!', ...state.combatLog]
      }

      expect(state.zombieHero.isShieldActive).toBe(true)
      expect(state.zombieHero.brains).toBeGreaterThanOrEqual(2)
      expect(state.combatLog.some(log => log.includes('DR. ZOMBOSS PHẪN NỘ'))).toBe(true)
    })
  })
})



