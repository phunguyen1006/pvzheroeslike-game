/**
 * PvZ Heroes Replicate - Card & Hero Database
 * All 44 cards (22 Plants, 22 Zombies) and 22 Heroes (11 Plants, 11 Zombies)
 * Strictly mapped to assets in public/assets/
 */

export type Team = 'plants' | 'zombies'
export type CardType = 'plant' | 'zombie' | 'trick' | 'environment'
export type PlantClass = 'Guardian' | 'Kabloom' | 'Mega-Grow' | 'Smarty' | 'Solar'
export type ZombieClass = 'Beastly' | 'Brainy' | 'Crazy' | 'Hearty' | 'Sneaky'
export type HeroClass = PlantClass | ZombieClass

export interface CardData {
 id: string
 name: string
 team: Team
 type: CardType
 cost: number
 attack: number
 hp: number
 health: number
 traits: string[]
 assetPath: string
 image: string
 description: string
 heroClass: HeroClass
 laneRequirement?: 'ground' | 'heights' | 'water' | 'any'
}

export interface HeroData {
 id: string
 name: string
 team: Team
 hp: number
 maxHp: number
 classes: HeroClass[]
 superPower: string
 superPowerDescription: string
 assetPath: string
 avatar: string
}

export const PLANT_CARDS: CardData[] = [
 {
 id: 'plant_admiral_navy_bean',
 name: 'Admiral Navy Bean',
 team: 'plants',
 type: 'plant',
 cost: 2,
 attack: 1,
 hp: 1,
 health: 1,
 traits: ['Amphibious', 'Team-Up'],
 assetPath: '/assets/cards/plants/Admiral Navy Bean.png',
 image: '/assets/cards/plants/Admiral Navy Bean.png',
 description: 'Amphibious, Team-Up. When you play another Bean, do 2 damage to the Zombie Hero.',
 heroClass: 'Smarty',
 laneRequirement: 'water'
 },
 {
 id: 'plant_astro_shroom',
 name: 'Astro-Shroom',
 team: 'plants',
 type: 'plant',
 cost: 1,
 attack: 1,
 hp: 1,
 health: 1,
 traits: ['Bullseye'],
 assetPath: '/assets/cards/plants/Astro-Shroom.png',
 image: '/assets/cards/plants/Astro-Shroom.png',
 description: 'Bullseye. When you play another Plant, do 1 damage to the Zombie Hero.',
 heroClass: 'Kabloom',
 laneRequirement: 'any'
 },
 {
 id: 'plant_bananasaurus_rex',
 name: 'Bananasaurus Rex',
 team: 'plants',
 type: 'plant',
 cost: 4,
 attack: 3,
 hp: 3,
 health: 3,
 traits: ['Double Strike'],
 assetPath: '/assets/cards/plants/Bananasaurus Rex.png',
 image: '/assets/cards/plants/Bananasaurus Rex.png',
 description: 'Double Strike. Dino-Roar: This gets +1/+1.',
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_berry_blast',
 name: 'Berry Blast',
 team: 'plants',
 type: 'trick',
 cost: 2,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Berry Blast.png',
 image: '/assets/cards/plants/Berry Blast.png',
 description: 'Do 3 damage to any Zombie or the Zombie Hero.',
 heroClass: 'Kabloom'
 },
 {
 id: 'plant_black_eyed_pea',
 name: 'Black-Eyed Pea',
 team: 'plants',
 type: 'plant',
 cost: 2,
 attack: 2,
 hp: 3,
 health: 3,
 traits: [],
 assetPath: '/assets/cards/plants/Black-Eyed Pea.png',
 image: '/assets/cards/plants/Black-Eyed Pea.png',
 description: 'When a Zombie Trick is played, this gets +1/+1.',
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_bonk_choy',
 name: 'Bonk Choy',
 team: 'plants',
 type: 'plant',
 cost: 1,
 attack: 2,
 hp: 1,
 health: 1,
 traits: [],
 assetPath: '/assets/cards/plants/Bonk Choy.png',
 image: '/assets/cards/plants/Bonk Choy.png',
 description: 'When played: This gets +1 Attack this turn.',
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_captain_cucumber',
 name: 'Captain Cucumber',
 team: 'plants',
 type: 'plant',
 cost: 3,
 attack: 1,
 hp: 4,
 health: 4,
 traits: [],
 assetPath: '/assets/cards/plants/Captain Cucumber.png',
 image: '/assets/cards/plants/Captain Cucumber.png',
 description: 'Other Cards in your hand cost 1 less. When this hurts the Zombie Hero, Conjure a Legendary card.',
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_cherry_bomb',
 name: 'Cherry Bomb',
 team: 'plants',
 type: 'trick',
 cost: 6,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Cherry Bomb.png',
 image: '/assets/cards/plants/Cherry Bomb.png',
 description: 'Do 4 damage to a Zombie and all Zombies next door.',
 heroClass: 'Kabloom'
 },
 {
 id: 'plant_dark_matter_dragonfruit',
 name: 'Dark Matter Dragonfruit',
 team: 'plants',
 type: 'plant',
 cost: 8,
 attack: 5,
 hp: 7,
 health: 7,
 traits: ['Amphibious', 'Splash Damage 6'],
 assetPath: '/assets/cards/plants/Dark Matter Dragonfruit.png',
 image: '/assets/cards/plants/Dark Matter Dragonfruit.png',
 description: 'Amphibious, Splash Damage 6. Zombie Tricks cost 6 more.',
 heroClass: 'Smarty',
 laneRequirement: 'any'
 },
 {
 id: 'plant_doubled_mint',
 name: 'Doubled Mint',
 team: 'plants',
 type: 'plant',
 cost: 2,
 attack: 1,
 hp: 2,
 health: 2,
 traits: [],
 assetPath: '/assets/cards/plants/Doubled Mint.png',
 image: '/assets/cards/plants/Doubled Mint.png',
 description: "Start of Turn: Double this Plant's Attack and Health.",
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_kernel_corn',
 name: 'Kernel Corn',
 team: 'plants',
 type: 'plant',
 cost: 8,
 attack: 6,
 hp: 6,
 health: 6,
 traits: [],
 assetPath: '/assets/cards/plants/Kernel Corn.png',
 image: '/assets/cards/plants/Kernel Corn.png',
 description: 'When played: Do 4 damage to each Zombie.',
 heroClass: 'Solar',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_peashooter',
 name: 'Peashooter',
 team: 'plants',
 type: 'plant',
 cost: 1,
 attack: 1,
 hp: 1,
 health: 1,
 traits: [],
 assetPath: '/assets/cards/plants/Peashooter.png',
 image: '/assets/cards/plants/Peashooter.png',
 description: 'A classic pea shooter with steady aim.',
 heroClass: 'Mega-Grow',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_planet_of_the_grapes',
 name: 'Planet of the Grapes',
 team: 'plants',
 type: 'environment',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Planet of the Grapes.png',
 image: '/assets/cards/plants/Planet of the Grapes.png',
 description: 'Environment: When a Plant here hurts the Zombie Hero, draw a card.',
 heroClass: 'Smarty',
 laneRequirement: 'any'
 },
 {
 id: 'plant_shamrocket',
 name: 'Shamrocket',
 team: 'plants',
 type: 'trick',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Shamrocket.png',
 image: '/assets/cards/plants/Shamrocket.png',
 description: 'Destroy a Zombie that has 4 Attack or more.',
 heroClass: 'Guardian'
 },
 {
 id: 'plant_snow_pea',
 name: 'Snow Pea',
 team: 'plants',
 type: 'plant',
 cost: 2,
 attack: 2,
 hp: 2,
 health: 2,
 traits: ['Freeze'],
 assetPath: '/assets/cards/plants/Snow Pea.png',
 image: '/assets/cards/plants/Snow Pea.png',
 description: 'When this hurts a Zombie, Freeze that Zombie.',
 heroClass: 'Smarty',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_solar_winds',
 name: 'Solar Winds',
 team: 'plants',
 type: 'environment',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Solar Winds.png',
 image: '/assets/cards/plants/Solar Winds.png',
 description: 'Environment: End of Turn: If there are no Zombies here, make a Sunflower here.',
 heroClass: 'Solar',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_spikeweed_sector',
 name: 'Spikeweed Sector',
 team: 'plants',
 type: 'environment',
 cost: 2,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Spikeweed Sector.png',
 image: '/assets/cards/plants/Spikeweed Sector.png',
 description: 'Environment: Before combat here, do 2 damage to a Zombie here.',
 heroClass: 'Guardian',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_spring_bean',
 name: 'Spring Bean',
 team: 'plants',
 type: 'trick',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Spring Bean.png',
 image: '/assets/cards/plants/Spring Bean.png',
 description: 'Bounce a Zombie.',
 heroClass: 'Smarty'
 },
 {
 id: 'plant_squash',
 name: 'Squash',
 team: 'plants',
 type: 'trick',
 cost: 5,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/plants/Squash.png',
 image: '/assets/cards/plants/Squash.png',
 description: 'Destroy a Zombie.',
 heroClass: 'Solar'
 },
 {
 id: 'plant_sunflower',
 name: 'Sunflower',
 team: 'plants',
 type: 'plant',
 cost: 1,
 attack: 0,
 hp: 1,
 health: 1,
 traits: ['Team-Up'],
 assetPath: '/assets/cards/plants/Sunflower.png',
 image: '/assets/cards/plants/Sunflower.png',
 description: 'Team-Up. Start of Turn: You get +1 Sun.',
 heroClass: 'Solar',
 laneRequirement: 'ground'
 },
 {
 id: 'plant_the_great_zucchini',
 name: 'The Great Zucchini',
 team: 'plants',
 type: 'plant',
 cost: 9,
 attack: 7,
 hp: 7,
 health: 7,
 traits: ['Amphibious'],
 assetPath: '/assets/cards/plants/The Great Zucchini.png',
 image: '/assets/cards/plants/The Great Zucchini.png',
 description: 'Amphibious. When played: Transform all Zombies into 1/1 Zombies with no abilities.',
 heroClass: 'Smarty',
 laneRequirement: 'any'
 },
 {
 id: 'plant_wall_nut',
 name: 'Wall-Nut',
 team: 'plants',
 type: 'plant',
 cost: 1,
 attack: 0,
 hp: 6,
 health: 6,
 traits: ['Team-Up'],
 assetPath: '/assets/cards/plants/Wall-Nut.png',
 image: '/assets/cards/plants/Wall-Nut.png',
 description: 'Team-Up. High health plant that protects teammates.',
 heroClass: 'Guardian',
 laneRequirement: 'ground'
 }
];

export const ZOMBIE_CARDS: CardData[] = [
 {
 id: 'zombie_area_22',
 name: 'Area 22',
 team: 'zombies',
 type: 'environment',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: ['Frenzy'],
 assetPath: '/assets/cards/zombies/Area 22.png',
 image: '/assets/cards/zombies/Area 22.png',
 description: 'Environment: Zombies here get +2/+2 and Frenzy.',
 heroClass: 'Beastly',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_arm_wrestler',
 name: 'Arm Wrestler',
 team: 'zombies',
 type: 'zombie',
 cost: 1,
 attack: 2,
 hp: 2,
 health: 2,
 traits: [],
 assetPath: '/assets/cards/zombies/Arm Wrestler.png',
 image: '/assets/cards/zombies/Arm Wrestler.png',
 description: 'When a Plant is played in this lane, this gets +1/+1.',
 heroClass: 'Hearty',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_bad_moon_rising',
 name: 'Bad Moon Rising',
 team: 'zombies',
 type: 'trick',
 cost: 7,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Bad Moon Rising.png',
 image: '/assets/cards/zombies/Bad Moon Rising.png',
 description: 'Transform all Zombies into random Zombies that cost 5 Brains or more.',
 heroClass: 'Brainy'
 },
 {
 id: 'zombie_bungee_plumber',
 name: 'Bungee Plumber',
 team: 'zombies',
 type: 'trick',
 cost: 1,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Bungee Plumber.png',
 image: '/assets/cards/zombies/Bungee Plumber.png',
 description: 'Do 2 damage to any Plant or the Plant Hero.',
 heroClass: 'Crazy'
 },
 {
 id: 'zombie_conga_zombie',
 name: 'Conga Zombie',
 team: 'zombies',
 type: 'zombie',
 cost: 2,
 attack: 2,
 hp: 2,
 health: 2,
 traits: [],
 assetPath: '/assets/cards/zombies/Conga Zombie.png',
 image: '/assets/cards/zombies/Conga Zombie.png',
 description: 'When played: Do 1 damage.',
 heroClass: 'Crazy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_disco_zombie',
 name: 'Disco Zombie',
 team: 'zombies',
 type: 'zombie',
 cost: 3,
 attack: 3,
 hp: 1,
 health: 1,
 traits: [],
 assetPath: '/assets/cards/zombies/Disco Zombie.png',
 image: '/assets/cards/zombies/Disco Zombie.png',
 description: 'When played: Make a 1/1 Backup Dancer in a random lane.',
 heroClass: 'Crazy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_dr_spacetime',
 name: 'Dr. Spacetime',
 team: 'zombies',
 type: 'zombie',
 cost: 2,
 attack: 1,
 hp: 5,
 health: 5,
 traits: ['Bullseye'],
 assetPath: '/assets/cards/zombies/Dr. Spacetime.png',
 image: '/assets/cards/zombies/Dr. Spacetime.png',
 description: 'Bullseye. Cards you Conjure cost 1 Brain less. When this hurts the Plant Hero, Conjure a Galactic Gardens card.',
 heroClass: 'Sneaky',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_final_mission',
 name: 'Final Mission',
 team: 'zombies',
 type: 'trick',
 cost: 2,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Final Mission.png',
 image: '/assets/cards/zombies/Final Mission.png',
 description: 'Destroy a Zombie. Do 4 damage to any Plant or the Plant Hero.',
 heroClass: 'Crazy'
 },
 {
 id: 'zombie_locust_swarm',
 name: 'Locust Swarm',
 team: 'zombies',
 type: 'trick',
 cost: 5,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Locust Swarm.png',
 image: '/assets/cards/zombies/Locust Swarm.png',
 description: 'Destroy a Plant.',
 heroClass: 'Beastly'
 },
 {
 id: 'zombie_lurch_for_lunch',
 name: 'Lurch for Lunch',
 team: 'zombies',
 type: 'trick',
 cost: 2,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Lurch for Lunch.png',
 image: '/assets/cards/zombies/Lurch for Lunch.png',
 description: 'A Zombie does a Bonus Attack.',
 heroClass: 'Brainy'
 },
 {
 id: 'zombie_medulla_nebula',
 name: 'Medulla Nebula',
 team: 'zombies',
 type: 'environment',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Medulla Nebula.png',
 image: '/assets/cards/zombies/Medulla Nebula.png',
 description: 'Environment: When you play a Zombie here, you get +2 Brains this turn.',
 heroClass: 'Brainy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_moon_base_z',
 name: 'Moon Base Z',
 team: 'zombies',
 type: 'environment',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: ['Overshoot 3'],
 assetPath: '/assets/cards/zombies/Moon Base Z.png',
 image: '/assets/cards/zombies/Moon Base Z.png',
 description: 'Environment: Before combat here, Zombies here do 3 damage to the Plant Hero (Overshoot 3).',
 heroClass: 'Crazy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_newspaper_zombie',
 name: 'Newspaper Zombie',
 team: 'zombies',
 type: 'zombie',
 cost: 2,
 attack: 1,
 hp: 4,
 health: 4,
 traits: ['Frenzy'],
 assetPath: '/assets/cards/zombies/Newspaper Zombie.png',
 image: '/assets/cards/zombies/Newspaper Zombie.png',
 description: 'When hurt: This gets +4 Attack and Frenzy.',
 heroClass: 'Crazy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_ra_zombie',
 name: 'Ra Zombie',
 team: 'zombies',
 type: 'zombie',
 cost: 6,
 attack: 3,
 hp: 4,
 health: 4,
 traits: [],
 assetPath: '/assets/cards/zombies/Ra Zombie.png',
 image: '/assets/cards/zombies/Ra Zombie.png',
 description: 'When played: The Plant Hero loses 2 Sun this turn.',
 heroClass: 'Hearty',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_rocket_science',
 name: 'Rocket Science',
 team: 'zombies',
 type: 'trick',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Rocket Science.png',
 image: '/assets/cards/zombies/Rocket Science.png',
 description: 'Destroy a Plant that has 4 Attack or more.',
 heroClass: 'Brainy'
 },
 {
 id: 'zombie_swabbie',
 name: 'Swabbie',
 team: 'zombies',
 type: 'zombie',
 cost: 0,
 attack: 1,
 hp: 1,
 health: 1,
 traits: ['Amphibious'],
 assetPath: '/assets/cards/zombies/Swabbie.png',
 image: '/assets/cards/zombies/Swabbie.png',
 description: 'Amphibious. 0-cost pirate imp minion.',
 heroClass: 'Sneaky',
 laneRequirement: 'water'
 },
 {
 id: 'zombie_teleport',
 name: 'Teleport',
 team: 'zombies',
 type: 'trick',
 cost: 1,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Teleport.png',
 image: '/assets/cards/zombies/Teleport.png',
 description: "You may play a Zombie when it's time for Tricks this turn. Draw a card.",
 heroClass: 'Brainy'
 },
 {
 id: 'zombie_total_eclipse',
 name: 'Total Eclipse',
 team: 'zombies',
 type: 'environment',
 cost: 2,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Total Eclipse.png',
 image: '/assets/cards/zombies/Total Eclipse.png',
 description: 'Environment: Plants here get -1/-1.',
 heroClass: 'Beastly',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_trickster',
 name: 'Trickster',
 team: 'zombies',
 type: 'zombie',
 cost: 10,
 attack: 6,
 hp: 6,
 health: 6,
 traits: [],
 assetPath: '/assets/cards/zombies/Trickster.png',
 image: '/assets/cards/zombies/Trickster.png',
 description: 'While in your hand, this costs 1 Brain less when you play a Trick. When played: This does a Bonus Attack.',
 heroClass: 'Brainy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_valkyrie',
 name: 'Valkyrie',
 team: 'zombies',
 type: 'zombie',
 cost: 3,
 attack: 0,
 hp: 6,
 health: 6,
 traits: [],
 assetPath: '/assets/cards/zombies/Valkyrie.png',
 image: '/assets/cards/zombies/Valkyrie.png',
 description: 'While in your hand, this gets +2 Attack when a Zombie is destroyed.',
 heroClass: 'Crazy',
 laneRequirement: 'ground'
 },
 {
 id: 'zombie_weed_spray',
 name: 'Weed Spray',
 team: 'zombies',
 type: 'trick',
 cost: 3,
 attack: 0,
 hp: 0,
 health: 0,
 traits: [],
 assetPath: '/assets/cards/zombies/Weed Spray.png',
 image: '/assets/cards/zombies/Weed Spray.png',
 description: 'Destroy each Plant with 2 Attack or less.',
 heroClass: 'Hearty'
 },
 {
 id: 'zombie_zombot_1000',
 name: 'Zombot 1000',
 team: 'zombies',
 type: 'zombie',
 cost: 9,
 attack: 9,
 hp: 9,
 health: 9,
 traits: ['Graveturning'],
 assetPath: '/assets/cards/zombies/Zombot 1000.png',
 image: '/assets/cards/zombies/Zombot 1000.png',
 description: 'When played: Destroy all Plants.',
 heroClass: 'Beastly',
 laneRequirement: 'ground'
 }
];

export const ALL_CARDS: CardData[] = [...PLANT_CARDS, ...ZOMBIE_CARDS];

export const PLANT_HEROES: HeroData[] = [
 {
 id: 'hero_beta_carrotina',
 name: 'Beta-Carrotina',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Guardian', 'Smarty'],
 superPower: 'Genetic Amplification',
 superPowerDescription: 'Conjure a 1-cost Plant. It gets +1/+1, Amphibious, and Team-Up.',
 assetPath: '/assets/heroes/plants/Beta-Carrotina.png',
 avatar: '/assets/heroes/plants/Beta-Carrotina.png'
 },
 {
 id: 'hero_captain_combustible',
 name: 'Captain Combustible',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Kabloom', 'Mega-Grow'],
 superPower: 'Blazing Bark',
 superPowerDescription: 'A Plant gets +4 Attack.',
 assetPath: '/assets/heroes/plants/Captain Combustible.png',
 avatar: '/assets/heroes/plants/Captain Combustible.png'
 },
 {
 id: 'hero_chompzilla',
 name: 'Chompzilla',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Mega-Grow', 'Solar'],
 superPower: 'Devour',
 superPowerDescription: 'Destroy a Zombie with the lowest Health.',
 assetPath: '/assets/heroes/plants/Chompzilla.png',
 avatar: '/assets/heroes/plants/Chompzilla.png'
 },
 {
 id: 'hero_citron',
 name: 'Citron',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Guardian', 'Smarty'],
 superPower: 'Peel Shield',
 superPowerDescription: 'Plants cannot be hurt this turn. Draw a card.',
 assetPath: '/assets/heroes/plants/Citron.png',
 avatar: '/assets/heroes/plants/Citron.png'
 },
 {
 id: 'hero_grass_knuckles',
 name: 'Grass Knuckles',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Mega-Grow', 'Guardian'],
 superPower: 'Power Pummel',
 superPowerDescription: 'Attack for 2 damage in each Ground lane.',
 assetPath: '/assets/heroes/plants/Grass Knuckles.png',
 avatar: '/assets/heroes/plants/Grass Knuckles.png'
 },
 {
 id: 'hero_green_shadow',
 name: 'Green Shadow',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Mega-Grow', 'Smarty'],
 superPower: 'Precision Blast',
 superPowerDescription: 'Do 5 damage in the middle lane.',
 assetPath: '/assets/heroes/plants/Green Shadow.png',
 avatar: '/assets/heroes/plants/Green Shadow.png'
 },
 {
 id: 'hero_nightcap',
 name: 'Nightcap',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Kabloom', 'Smarty'],
 superPower: 'Mush-Boom',
 superPowerDescription: 'Make a 1/1 Poison Mushroom with Anti-Hero 2. Do 2 damage to a Zombie here.',
 assetPath: '/assets/heroes/plants/Nightcap.png',
 avatar: '/assets/heroes/plants/Nightcap.png'
 },
 {
 id: 'hero_rose',
 name: 'Rose',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Smarty', 'Solar'],
 superPower: 'Goatify',
 superPowerDescription: 'Transform a Zombie with the highest Attack into a 1/1 Goat.',
 assetPath: '/assets/heroes/plants/Rose.png',
 avatar: '/assets/heroes/plants/Rose.png'
 },
 {
 id: 'hero_solar_flare',
 name: 'Solar Flare',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Kabloom', 'Solar'],
 superPower: 'Sunburn',
 superPowerDescription: 'Do 2 damage. You get +1 Sun for the rest of the game.',
 assetPath: '/assets/heroes/plants/Solar Flare.png',
 avatar: '/assets/heroes/plants/Solar Flare.png'
 },
 {
 id: 'hero_spudow',
 name: 'Spudow',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Kabloom', 'Guardian'],
 superPower: 'Tater Toss',
 superPowerDescription: 'Make a 0/1 Hothead that has: When destroyed: Do 6 damage to a Zombie here.',
 assetPath: '/assets/heroes/plants/Spudow.png',
 avatar: '/assets/heroes/plants/Spudow.png'
 },
 {
 id: 'hero_wall_knight',
 name: 'Wall-Knight',
 team: 'plants',
 hp: 20,
 maxHp: 20,
 classes: ['Guardian', 'Solar'],
 superPower: 'Uncrackable',
 superPowerDescription: 'Your Hero cannot be hurt this turn. Draw a card.',
 assetPath: '/assets/heroes/plants/Wall-Knight.png',
 avatar: '/assets/heroes/plants/Wall-Knight.png'
 }
];

export const ZOMBIE_HEROES: HeroData[] = [
 {
 id: 'hero_brain_freeze',
 name: 'Brain Freeze',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Beastly', 'Sneaky'],
 superPower: 'Frozen Tundra',
 superPowerDescription: 'Freeze all Plants on the Ground.',
 assetPath: '/assets/heroes/zombies/Brain Freeze.png',
 avatar: '/assets/heroes/zombies/Brain Freeze.png'
 },
 {
 id: 'hero_electric_boogaloo',
 name: 'Electric Boogaloo',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Beastly', 'Crazy'],
 superPower: "Stayin' Alive",
 superPowerDescription: 'Do 3 damage to a Plant. Heal your Hero for 3.',
 assetPath: '/assets/heroes/zombies/Electric Boogaloo.png',
 avatar: '/assets/heroes/zombies/Electric Boogaloo.png'
 },
 {
 id: 'hero_huge_gigantacus',
 name: 'Huge-Gigantacus',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Brainy', 'Sneaky'],
 superPower: 'Terror-Former 10,000',
 superPowerDescription: 'All cards in your hand cost 1 less Brain. Conjure an Environment.',
 assetPath: '/assets/heroes/zombies/Huge-Gigantacus.png',
 avatar: '/assets/heroes/zombies/Huge-Gigantacus.png'
 },
 {
 id: 'hero_immorticia',
 name: 'Immorticia',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Beastly', 'Brainy'],
 superPower: "Witch's Familiar",
 superPowerDescription: 'Make a 2/1 Zombat with Amphibious that has: When this hurts a Plant, draw a card.',
 assetPath: '/assets/heroes/zombies/Immorticia.png',
 avatar: '/assets/heroes/zombies/Immorticia.png'
 },
 {
 id: 'hero_impfinity',
 name: 'Impfinity',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Crazy', 'Sneaky'],
 superPower: 'Triple Threat',
 superPowerDescription: 'Make two 2/1 Impfinity Clones with Amphibious in random lanes.',
 assetPath: '/assets/heroes/zombies/Impfinity.png',
 avatar: '/assets/heroes/zombies/Impfinity.png'
 },
 {
 id: 'hero_neptuna',
 name: 'Neptuna',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Hearty', 'Sneaky'],
 superPower: 'Octo-Pult',
 superPowerDescription: 'Make a 3/2 Octo-Pet with Amphibious in the Water lane.',
 assetPath: '/assets/heroes/zombies/Neptuna.png',
 avatar: '/assets/heroes/zombies/Neptuna.png'
 },
 {
 id: 'hero_professor_brainstorm',
 name: 'Professor Brainstorm',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Brainy', 'Crazy'],
 superPower: 'Eureka',
 superPowerDescription: 'Conjure 3 random cards from the entire game.',
 assetPath: '/assets/heroes/zombies/Professor Brainstorm.png',
 avatar: '/assets/heroes/zombies/Professor Brainstorm.png'
 },
 {
 id: 'hero_rustbolt',
 name: 'Rustbolt',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Brainy', 'Hearty'],
 superPower: 'Shrink Ray',
 superPowerDescription: 'A Plant gets -3 Attack. Draw a card.',
 assetPath: '/assets/heroes/zombies/Rustbolt.png',
 avatar: '/assets/heroes/zombies/Rustbolt.png'
 },
 {
 id: 'hero_super_brainz',
 name: 'Super Brainz',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Brainy', 'Sneaky'],
 superPower: 'Carried Away',
 superPowerDescription: 'Move a Zombie. It does a Bonus Attack.',
 assetPath: '/assets/heroes/zombies/Super Brainz.png',
 avatar: '/assets/heroes/zombies/Super Brainz.png'
 },
 {
 id: 'hero_the_smash',
 name: 'The Smash',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Beastly', 'Hearty'],
 superPower: "Slammin' Harold",
 superPowerDescription: 'Destroy a Plant with 4 Attack or less.',
 assetPath: '/assets/heroes/zombies/The Smash.png',
 avatar: '/assets/heroes/zombies/The Smash.png'
 },
 {
 id: 'hero_z_mech',
 name: 'Z-Mech',
 team: 'zombies',
 hp: 20,
 maxHp: 20,
 classes: ['Crazy', 'Hearty'],
 superPower: 'Missile Madness',
 superPowerDescription: 'Do 3 damage to a Plant and 1 damage to all other Plants.',
 assetPath: '/assets/heroes/zombies/Z-Mech.png',
 avatar: '/assets/heroes/zombies/Z-Mech.png'
 }
];

export const ALL_HEROES: HeroData[] = [...PLANT_HEROES, ...ZOMBIE_HEROES];

export const TRAIT_ASSETS = {
 AntiHero: '/assets/traits/Trait_AntiHero.png',
 Armored: '/assets/traits/Trait_Armored.png',
 Bullseye: '/assets/traits/Trait_Bullseye.png',
 Deadly: '/assets/traits/Trait_Deadly.png',
 Frenzy: '/assets/traits/Trait_Frenzy.png',
 Frozen: '/assets/traits/Trait_Frozen.png',
 Strikethrough: '/assets/traits/Trait_Strikethrough.png',
 ResourceBrain: '/assets/traits/Resource_Brain.png',
 ResourceHeart: '/assets/traits/Resource_Health_Heart.png'
} as const;

export const CLASS_ASSETS = {
 Guardian: '/assets/traits/Plant_Class_Guardian.png',
 Kabloom: '/assets/traits/Plant_Class_Kabloom.png',
 MegaGrow: '/assets/traits/Plant_Class_MegaGrow.png',
 Smarty: '/assets/traits/Plant_Class_Smarty.png',
 Solar: '/assets/traits/Plant_Class_Solar.png',
 Beastly: '/assets/traits/Zombie_Class_Beastly.png',
 Brainy: '/assets/traits/Zombie_Class_Brainy.png',
 Crazy: '/assets/traits/Zombie_Class_Crazy.png',
 Hearty: '/assets/traits/Zombie_Class_Hearty.png',
 Sneaky: '/assets/traits/Zombie_Class_Sneaky.png'
} as const;

export function getCardById(id: string): CardData | undefined {
 return ALL_CARDS.find((card) => card.id === id);
}

export function getCardsBySide(side: 'plant' | 'zombie' | Team): CardData[] {
 if (side === 'plant' || side === 'plants') {
 return PLANT_CARDS;
 }
 return ZOMBIE_CARDS;
}

export function getCardsByType(type: CardType): CardData[] {
 return ALL_CARDS.filter((card) => card.type === type);
}

export function getAllCards(): CardData[] {
 return ALL_CARDS;
}

export function getAllHeroes(): HeroData[] {
 return ALL_HEROES;
}

export function getHeroById(id: string): HeroData | undefined {
 return ALL_HEROES.find((hero) => hero.id === id);
}

export function getInitialDeck(side: 'plant' | 'zombie' | Team): CardData[] {
 const pool = getCardsBySide(side);
 return pool.slice(0, 10);
}
