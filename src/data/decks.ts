/**
 * PvZ Heroes Replicate - Pre-built Starter Decks & Utilities
 * 20-card balanced decks for Plants and Zombies
 * Ready for Core Game Engine & Frontend Battle Board
 */

import { getCardById } from './cards';
import type { CardData, Team } from './cards';

function getCard(id: string): CardData {
 const card = getCardById(id);
 if (!card) {
 throw new Error(`Card not found in database: ${id}`);
 }
 return { ...card };
}

/**
 * 20-card Starter Plant Deck
 * Mana curve:
 * 1-drop (11): 3x Peashooter, 3x Sunflower, 3x Wall-Nut, 2x Bonk Choy
 * 2-drop (7): 2x Snow Pea, 2x Black-Eyed Pea, 2x Berry Blast, 1x Spikeweed Sector
 * 4-drop (1): 1x Bananasaurus Rex
 * 5-drop (1): 1x Squash
 */
export const STARTER_PLANT_DECK: CardData[] = [
 // 1-cost minions (11)
 getCard('plant_peashooter'),
 getCard('plant_peashooter'),
 getCard('plant_peashooter'),
 getCard('plant_sunflower'),
 getCard('plant_sunflower'),
 getCard('plant_sunflower'),
 getCard('plant_wall_nut'),
 getCard('plant_wall_nut'),
 getCard('plant_wall_nut'),
 getCard('plant_bonk_choy'),
 getCard('plant_bonk_choy'),

 // 2-cost minions, tricks & environment (7)
 getCard('plant_snow_pea'),
 getCard('plant_snow_pea'),
 getCard('plant_black_eyed_pea'),
 getCard('plant_black_eyed_pea'),
 getCard('plant_berry_blast'),
 getCard('plant_berry_blast'),
 getCard('plant_spikeweed_sector'),

 // 4-cost finisher (1)
 getCard('plant_bananasaurus_rex'),

 // 5-cost removal trick (1)
 getCard('plant_squash')
];

/**
 * 20-card Starter Zombie Deck
 * Mana curve:
 * 0-drop (3): 3x Swabbie (Amphibious)
 * 1-drop (5): 3x Arm Wrestler, 2x Bungee Plumber
 * 2-drop (7): 3x Newspaper Zombie, 2x Conga Zombie, 2x Lurch for Lunch
 * 3-drop (4): 2x Disco Zombie, 1x Area 22, 1x Weed Spray
 * 5-drop (1): 1x Locust Swarm
 */
export const STARTER_ZOMBIE_DECK: CardData[] = [
 // 0-cost minion (3)
 getCard('zombie_swabbie'),
 getCard('zombie_swabbie'),
 getCard('zombie_swabbie'),

 // 1-cost minions & trick (5)
 getCard('zombie_arm_wrestler'),
 getCard('zombie_arm_wrestler'),
 getCard('zombie_arm_wrestler'),
 getCard('zombie_bungee_plumber'),
 getCard('zombie_bungee_plumber'),

 // 2-cost minions & trick (7)
 getCard('zombie_newspaper_zombie'),
 getCard('zombie_newspaper_zombie'),
 getCard('zombie_newspaper_zombie'),
 getCard('zombie_conga_zombie'),
 getCard('zombie_conga_zombie'),
 getCard('zombie_lurch_for_lunch'),
 getCard('zombie_lurch_for_lunch'),

 // 3-cost minions, trick & environment (4)
 getCard('zombie_disco_zombie'),
 getCard('zombie_disco_zombie'),
 getCard('zombie_area_22'),
 getCard('zombie_weed_spray'),

 // 5-cost removal trick (1)
 getCard('zombie_locust_swarm')
];

/**
 * Returns a cloned 20-card starter deck for the requested side.
 */
export function getStarterDeck(side: 'plant' | 'zombie' | Team): CardData[] {
 const isPlant = side === 'plant' || side === 'plants';
 const source = isPlant ? STARTER_PLANT_DECK : STARTER_ZOMBIE_DECK;
 return source.map((card) => ({ ...card }));
}

/**
 * Pure Fisher-Yates shuffle algorithm returning a new shuffled copy of the deck.
 */
export function shuffleDeck<T>(deck: T[]): T[] {
 const result = [...deck];
 for (let i = result.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 const temp = result[i];
 result[i] = result[j];
 result[j] = temp;
 }
 return result;
}

/**
 * Utility to build a custom deck from a list of card IDs.
 */
export function createCustomDeck(cardIds: string[]): CardData[] {
 return cardIds.map((id) => getCard(id));
}