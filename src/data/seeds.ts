/**
 * Seed catalogs.
 *
 * - SEED_CATALOG: all known strains (no IDs) — used for shop / discovery / breeding.
 * - INITIAL_SEEDS: starter inventory (with IDs) — used for fresh saves & resets.
 */
import type { Seed, Rarity } from '@/store/gameStore';

export const SEED_CATALOG: Omit<Seed, 'id'>[] = [
  // Common (5)
  { name: 'Green Dream', rarity: 'common', traits: ['Steady'], baseYield: 10, growthSpeed: 1, generation: 0, yieldMin: 8, yieldMax: 12 },
  { name: 'Basic Bud', rarity: 'common', traits: ['Steady'], baseYield: 8, growthSpeed: 1.1, generation: 0, yieldMin: 6, yieldMax: 10 },
  { name: 'Starter Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 6, growthSpeed: 1.3, generation: 0, yieldMin: 4, yieldMax: 8 },
  { name: 'Sunrise Skunk', rarity: 'common', traits: ['Steady'], baseYield: 9, growthSpeed: 1.15, generation: 0, yieldMin: 7, yieldMax: 11 },
  { name: 'City Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 7, growthSpeed: 1.25, generation: 0, yieldMin: 5, yieldMax: 9 },
  // Uncommon (5)
  { name: 'Purple Haze', rarity: 'uncommon', traits: ['Lucky'], baseYield: 25, growthSpeed: 0.9, generation: 0, yieldMin: 20, yieldMax: 30 },
  { name: 'Mint Rush', rarity: 'uncommon', traits: ['SpeedBoost'], baseYield: 20, growthSpeed: 1.4, generation: 0, yieldMin: 15, yieldMax: 25 },
  { name: 'Crystal Kush', rarity: 'uncommon', traits: ['Frost'], baseYield: 22, growthSpeed: 1.0, generation: 0, yieldMin: 18, yieldMax: 26 },
  { name: 'Lemon Drift', rarity: 'uncommon', traits: ['Lucky'], baseYield: 24, growthSpeed: 1.05, generation: 0, yieldMin: 19, yieldMax: 29 },
  { name: 'Aloe Mist', rarity: 'uncommon', traits: ['Frost'], baseYield: 23, growthSpeed: 0.95, generation: 0, yieldMin: 18, yieldMax: 28 },
  // Rare (5)
  { name: 'Golden Leaf', rarity: 'rare', traits: ['Glitter', 'Turbo'], baseYield: 50, growthSpeed: 1.2, generation: 0, yieldMin: 40, yieldMax: 60 },
  { name: 'Thunder Cloud', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 40, growthSpeed: 1.1, generation: 0, yieldMin: 32, yieldMax: 48 },
  { name: 'Coin Crusher', rarity: 'rare', traits: ['GoldRush', 'Lucky'], baseYield: 45, growthSpeed: 0.85, generation: 0, yieldMin: 36, yieldMax: 54 },
  { name: 'Copper Diesel', rarity: 'rare', traits: ['GoldRush', 'Turbo'], baseYield: 48, growthSpeed: 1.0, generation: 0, yieldMin: 38, yieldMax: 58 },
  { name: 'Skyline Blitz', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 42, growthSpeed: 1.15, generation: 0, yieldMin: 34, yieldMax: 50 },
  // Epic (5)
  { name: 'Mystic Essence', rarity: 'epic', traits: ['EssenceFlow', 'Glitter', 'Turbo'], baseYield: 80, growthSpeed: 1.0, generation: 0, yieldMin: 64, yieldMax: 96 },
  { name: 'Phantom OG', rarity: 'epic', traits: ['CritMaster', 'DoubleHarvest'], baseYield: 75, growthSpeed: 0.9, generation: 0, yieldMin: 60, yieldMax: 90 },
  { name: 'Shadow Walker', rarity: 'epic', traits: ['Resilient', 'Bountiful'], baseYield: 70, growthSpeed: 0.95, generation: 0, yieldMin: 56, yieldMax: 84 },
  { name: 'Nebula Mint', rarity: 'epic', traits: ['EssenceFlow', 'Glitter'], baseYield: 78, growthSpeed: 0.95, generation: 0, yieldMin: 62, yieldMax: 94 },
  { name: 'Iron Bloom', rarity: 'epic', traits: ['Resilient', 'Bountiful'], baseYield: 74, growthSpeed: 0.9, generation: 0, yieldMin: 59, yieldMax: 89 },
  // Legendary (4)
  { name: 'Cosmic Blaze', rarity: 'legendary', traits: ['Bountiful', 'LuckyDrop', 'GoldRush'], baseYield: 150, growthSpeed: 0.8, generation: 0, yieldMin: 120, yieldMax: 180 },
  { name: 'Eternal Frost', rarity: 'legendary', traits: ['Frost', 'EssenceFlow', 'CritMaster', 'DoubleHarvest'], baseYield: 200, growthSpeed: 0.7, generation: 0, yieldMin: 160, yieldMax: 240 },
  { name: 'Aurora Nova', rarity: 'legendary', traits: ['GoldRush', 'LuckyDrop', 'CritMaster'], baseYield: 160, growthSpeed: 0.75, generation: 0, yieldMin: 128, yieldMax: 192 },
  { name: 'Glacial Crown', rarity: 'legendary', traits: ['Frost', 'EssenceFlow', 'DoubleHarvest'], baseYield: 190, growthSpeed: 0.7, generation: 0, yieldMin: 150, yieldMax: 230 },
];

export const COLLECTION_BONUSES: Record<Rarity, { label: string; effect: string; value: number }> = {
  common: { label: 'Common Collection', effect: '+10% Growth Speed', value: 0.1 },
  uncommon: { label: 'Uncommon Collection', effect: '+15% Coin Yield', value: 0.15 },
  rare: { label: 'Rare Collection', effect: '+20% Seed Drop Chance', value: 0.2 },
  epic: { label: 'Epic Collection', effect: '+25% All Resources', value: 0.25 },
  legendary: { label: 'Legendary Collection', effect: '+50% XP Gain', value: 0.5 },
};

/** Starter seed inventory (with IDs). Used for fresh saves & resetGame. */
export const INITIAL_SEEDS: Seed[] = [
  // Common seeds (3)
  { id: 'seed-1', name: 'Green Dream', rarity: 'common', traits: ['Steady'], baseYield: 10, growthSpeed: 1, generation: 0, yieldMin: 8, yieldMax: 12 },
  { id: 'seed-2', name: 'Basic Bud', rarity: 'common', traits: ['Steady'], baseYield: 8, growthSpeed: 1.1, generation: 0, yieldMin: 6, yieldMax: 10 },
  { id: 'seed-3', name: 'Starter Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 6, growthSpeed: 1.3, generation: 0, yieldMin: 4, yieldMax: 8 },
  // Uncommon (3)
  { id: 'seed-4', name: 'Purple Haze', rarity: 'uncommon', traits: ['Lucky'], baseYield: 25, growthSpeed: 0.9, generation: 0, yieldMin: 20, yieldMax: 30 },
  { id: 'seed-5', name: 'Mint Rush', rarity: 'uncommon', traits: ['SpeedBoost'], baseYield: 20, growthSpeed: 1.4, generation: 0, yieldMin: 15, yieldMax: 25 },
  { id: 'seed-6', name: 'Crystal Kush', rarity: 'uncommon', traits: ['Frost'], baseYield: 22, growthSpeed: 1.0, generation: 0, yieldMin: 18, yieldMax: 26 },
  // Rare (3)
  { id: 'seed-7', name: 'Golden Leaf', rarity: 'rare', traits: ['Glitter', 'Turbo'], baseYield: 50, growthSpeed: 1.2, generation: 0, yieldMin: 40, yieldMax: 60 },
  { id: 'seed-8', name: 'Thunder Cloud', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 40, growthSpeed: 1.1, generation: 0, yieldMin: 32, yieldMax: 48 },
  { id: 'seed-9', name: 'Coin Crusher', rarity: 'rare', traits: ['GoldRush', 'Lucky'], baseYield: 45, growthSpeed: 0.85, generation: 0, yieldMin: 36, yieldMax: 54 },
  // Epic (2)
  { id: 'seed-10', name: 'Mystic Essence', rarity: 'epic', traits: ['EssenceFlow', 'Glitter', 'Turbo'], baseYield: 80, growthSpeed: 1.0, generation: 0, yieldMin: 64, yieldMax: 96 },
  { id: 'seed-11', name: 'Phantom OG', rarity: 'epic', traits: ['CritMaster', 'DoubleHarvest'], baseYield: 75, growthSpeed: 0.9, generation: 0, yieldMin: 60, yieldMax: 90 },
  // Legendary (1)
  { id: 'seed-12', name: 'Cosmic Blaze', rarity: 'legendary', traits: ['Bountiful', 'LuckyDrop', 'GoldRush'], baseYield: 150, growthSpeed: 0.8, generation: 0, yieldMin: 120, yieldMax: 180 },
];
