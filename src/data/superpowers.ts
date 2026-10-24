/**
 * PvZ Heroes Replicate - Hero Superpowers Database
 * Signature Superpowers for Plant & Zombie Heroes
 * 0-cost Tricks triggered at start of game or on Super-Block Meter (8 charges)
 */

export type SuperpowerType = 'superpower' | 'trick';
export type SuperpowerEffectType = 'damage' | 'buff' | 'destroy' | 'draw' | 'move';

export interface SuperpowerData {
 id: string;
 name: string;
 heroId: string;
 cost: number;
 type: 'superpower' | 'trick';
 description: string;
 effectType: 'damage' | 'buff' | 'destroy' | 'draw' | 'move';
 assetPath: string;
}

export const SUPERPOWERS: SuperpowerData[] = [
 // Plant Heroes Signature Superpowers
 {
 id: 'sp_precision_blast',
 name: 'Precision Blast',
 heroId: 'hero_green_shadow',
 cost: 0,
 type: 'superpower',
 description: 'Attack for 5 damage in the middle lane.',
 effectType: 'damage',
 assetPath: '/assets/heroes/plants/Green Shadow.png'
 },
 {
 id: 'sp_sunburn',
 name: 'Sunburn',
 heroId: 'hero_solar_flare',
 cost: 0,
 type: 'superpower',
 description: 'Do 2 damage. You get +1 Sun for the rest of the game.',
 effectType: 'damage',
 assetPath: '/assets/heroes/plants/Solar Flare.png'
 },
 {
 id: 'sp_uncrackable',
 name: 'Uncrackable',
 heroId: 'hero_wall_knight',
 cost: 0,
 type: 'superpower',
 description: 'Your Hero cannot be hurt this turn. Draw a card.',
 effectType: 'draw',
 assetPath: '/assets/heroes/plants/Wall-Knight.png'
 },
 {
 id: 'sp_tater_toss',
 name: 'Tater Toss',
 heroId: 'hero_spudow',
 cost: 0,
 type: 'superpower',
 description: 'Make a 0/1 Hothead with Team-Up that deals 6 damage when destroyed.',
 effectType: 'buff',
 assetPath: '/assets/heroes/plants/Spudow.png'
 },
 {
 id: 'sp_blazing_bark',
 name: 'Blazing Bark',
 heroId: 'hero_captain_combustible',
 cost: 0,
 type: 'superpower',
 description: 'A Plant gets +4 Attack.',
 effectType: 'buff',
 assetPath: '/assets/heroes/plants/Captain Combustible.png'
 },
 {
 id: 'sp_power_pummel',
 name: 'Power Pummel',
 heroId: 'hero_grass_knuckles',
 cost: 0,
 type: 'superpower',
 description: 'Attack for 2 damage in each Ground lane.',
 effectType: 'damage',
 assetPath: '/assets/heroes/plants/Grass Knuckles.png'
 },
 {
 id: 'sp_mush_boom',
 name: 'Mush-Boom',
 heroId: 'hero_nightcap',
 cost: 0,
 type: 'superpower',
 description: 'Make a 1/1 Poison Mushroom with Anti-Hero 2. Do 2 damage to a Zombie here.',
 effectType: 'damage',
 assetPath: '/assets/heroes/plants/Nightcap.png'
 },
 {
 id: 'sp_goatify',
 name: 'Goatify',
 heroId: 'hero_rose',
 cost: 0,
 type: 'superpower',
 description: 'Transform a Zombie with the highest Attack into a 1/1 Goat.',
 effectType: 'destroy',
 assetPath: '/assets/heroes/plants/Rose.png'
 },
 {
 id: 'sp_peel_shield',
 name: 'Peel Shield',
 heroId: 'hero_citron',
 cost: 0,
 type: 'superpower',
 description: 'Plants cannot be hurt this turn. Draw a card.',
 effectType: 'draw',
 assetPath: '/assets/heroes/plants/Citron.png'
 },
 {
 id: 'sp_devour',
 name: 'Devour',
 heroId: 'hero_chompzilla',
 cost: 0,
 type: 'superpower',
 description: 'Destroy a Zombie with the lowest Health.',
 effectType: 'destroy',
 assetPath: '/assets/heroes/plants/Chompzilla.png'
 },
 {
 id: 'sp_genetic_amplification',
 name: 'Genetic Amplification',
 heroId: 'hero_beta_carrotina',
 cost: 0,
 type: 'superpower',
 description: 'Conjure a 1-cost Plant, then give it +1/+1, Amphibious, and Team-Up.',
 effectType: 'buff',
 assetPath: '/assets/heroes/plants/Beta-Carrotina.png'
 },

 // Zombie Heroes Signature Superpowers
 {
 id: 'sp_carried_away',
 name: 'Carried Away',
 heroId: 'hero_super_brainz',
 cost: 0,
 type: 'superpower',
 description: 'Move a Zombie. It does a Bonus Attack.',
 effectType: 'move',
 assetPath: '/assets/heroes/zombies/Super Brainz.png'
 },
 {
 id: 'sp_slammin_pumpkin',
 name: 'Slammin\u0027 Pumpkin',
 heroId: 'hero_the_smash',
 cost: 0,
 type: 'superpower',
 description: 'Destroy a Plant with 4 Attack or less.',
 effectType: 'destroy',
 assetPath: '/assets/heroes/zombies/The Smash.png'
 },
 {
 id: 'sp_triple_threat',
 name: 'Triple Threat',
 heroId: 'hero_impfinity',
 cost: 0,
 type: 'superpower',
 description: 'Make two 2/1 Imp Clones with Amphibious in random lanes.',
 effectType: 'buff',
 assetPath: '/assets/heroes/zombies/Impfinity.png'
 },
 {
 id: 'sp_shrink_ray',
 name: 'Shrink Ray',
 heroId: 'hero_rustbolt',
 cost: 0,
 type: 'superpower',
 description: 'A Plant gets -3 Attack. Draw a card.',
 effectType: 'draw',
 assetPath: '/assets/heroes/zombies/Rustbolt.png'
 },
 {
 id: 'sp_stayin_alive',
 name: 'Stayin\u0027 Alive',
 heroId: 'hero_electric_boogaloo',
 cost: 0,
 type: 'superpower',
 description: 'Do 3 damage to a Plant. Heal your Hero for 3.',
 effectType: 'damage',
 assetPath: '/assets/heroes/zombies/Electric Boogaloo.png'
 },
 {
 id: 'sp_frozen_tundra',
 name: 'Frozen Tundra',
 heroId: 'hero_brain_freeze',
 cost: 0,
 type: 'superpower',
 description: 'Freeze all Plants on the Ground.',
 effectType: 'damage',
 assetPath: '/assets/heroes/zombies/Brain Freeze.png'
 },
 {
 id: 'sp_eureka',
 name: 'Eureka',
 heroId: 'hero_professor_brainstorm',
 cost: 0,
 type: 'superpower',
 description: 'Conjure 3 random cards from the entire game.',
 effectType: 'draw',
 assetPath: '/assets/heroes/zombies/Professor Brainstorm.png'
 },
 {
 id: 'sp_witchs_familiar',
 name: 'Witch\u0027s Familiar',
 heroId: 'hero_immorticia',
 cost: 0,
 type: 'superpower',
 description: 'Make a 2/1 Zombat with Amphibious that draws a card when it hurts a Plant.',
 effectType: 'draw',
 assetPath: '/assets/heroes/zombies/Immorticia.png'
 },
 {
 id: 'sp_missile_madness',
 name: 'Missile Madness',
 heroId: 'hero_z_mech',
 cost: 0,
 type: 'superpower',
 description: 'Do 3 damage to a Plant and 1 damage to all other Plants.',
 effectType: 'damage',
 assetPath: '/assets/heroes/zombies/Z-Mech.png'
 },
 {
 id: 'sp_octo_pult',
 name: 'Octo-Pult',
 heroId: 'hero_neptuna',
 cost: 0,
 type: 'superpower',
 description: 'Make a 3/2 Octo-Pet with Amphibious.',
 effectType: 'buff',
 assetPath: '/assets/heroes/zombies/Neptuna.png'
 },
 {
 id: 'sp_terror_former_10000',
 name: 'Terror-Former 10,000',
 heroId: 'hero_huge_gigantacus',
 cost: 0,
 type: 'superpower',
 description: 'Transform a lane into an Environment. All cards in your hand cost 1 less.',
 effectType: 'buff',
 assetPath: '/assets/heroes/zombies/Huge-Gigantacus.png'
 }
];

export function getSuperpowerById(id: string): SuperpowerData | undefined {
 return SUPERPOWERS.find((sp) => sp.id === id);
}

export function getSuperpowerByHeroId(heroId: string): SuperpowerData | undefined {
 return SUPERPOWERS.find((sp) => sp.heroId === heroId);
}

export function getAllSuperpowers(): SuperpowerData[] {
 return SUPERPOWERS;
}