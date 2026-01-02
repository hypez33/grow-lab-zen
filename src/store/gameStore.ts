import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useBusinessStore } from '@/store/businessStore';

// Types
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type PlantStage = 'seed' | 'sprout' | 'veg' | 'flower' | 'harvest';
export type SkillPath = 'producer' | 'alchemist' | 'engineer';
export type BudState = 'wet' | 'drying' | 'dried';

export interface Seed {
  id: string;
  name: string;
  rarity: Rarity;
  traits: string[];
  baseYield: number;
  growthSpeed: number;
  generation?: number; // How many times this strain has been bred (0 = original, higher = more bred)
  yieldMin?: number; // Minimum yield in g/plant
  yieldMax?: number; // Maximum yield in g/plant
  isHybrid?: boolean; // Was this created through breeding?
  parentNames?: [string, string]; // Names of parent strains
}

export interface BudItem {
  id: string;
  strainName: string;
  rarity: Rarity;
  grams: number;
  quality: number; // 1-100, affects price
  state: BudState;
  dryingProgress: number; // 0-100
  traits: string[];
}

export interface DryingRack {
  id: number;
  bud: BudItem | null;
  isUnlocked: boolean;
}

export interface SalesChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
  pricePerGram: number; // base price
  minQuality: number; // minimum quality required
  minLevel: number; // level required to unlock
  maxGramsPerSale: number;
  cooldownMinutes: number;
  lastSaleTime: number;
  unlocked: boolean;
}

export interface GrowSlot {
  id: number;
  plantId: string | null;
  seed: Seed | null;
  stage: PlantStage;
  progress: number;
  isUnlocked: boolean;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  category: 'equipment' | 'genetics' | 'automation' | 'cosmetics' | 'drying' | 'sales';
  baseCost: number;
  costScaling: number;
  level: number;
  maxLevel: number;
  effect: string;
  effectValue: number;
}

export interface SkillNode {
  id: string;
  path: SkillPath;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  requires: string[];
  effect: string;
  effectValue: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement';
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: { type: 'budcoins' | 'gems' | 'seeds' | 'xp'; amount: number };
}

export interface Cosmetic {
  id: string;
  name: string;
  type: 'pot' | 'background' | 'theme';
  rarity: Rarity;
  cost: number;
  owned: boolean;
  equipped: boolean;
}

export interface Worker {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  owned: boolean;
  paused: boolean; // Is worker on vacation/paused
  level: number;
  maxLevel: number;
  slotsManaged: number; // How many slots this worker manages
  abilities: ('plant' | 'tap' | 'harvest' | 'dry' | 'sell')[];
}

// Seed catalog - all possible seeds that can be discovered
export const SEED_CATALOG: Omit<Seed, 'id'>[] = [
  // Common seeds (5)
  { name: 'Green Dream', rarity: 'common', traits: ['Steady'], baseYield: 10, growthSpeed: 1, generation: 0, yieldMin: 8, yieldMax: 12 },
  { name: 'Basic Bud', rarity: 'common', traits: ['Steady'], baseYield: 8, growthSpeed: 1.1, generation: 0, yieldMin: 6, yieldMax: 10 },
  { name: 'Starter Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 6, growthSpeed: 1.3, generation: 0, yieldMin: 4, yieldMax: 8 },
  { name: 'Sunrise Skunk', rarity: 'common', traits: ['Steady'], baseYield: 9, growthSpeed: 1.15, generation: 0, yieldMin: 7, yieldMax: 11 },
  { name: 'City Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 7, growthSpeed: 1.25, generation: 0, yieldMin: 5, yieldMax: 9 },
  // Uncommon seeds (5)
  { name: 'Purple Haze', rarity: 'uncommon', traits: ['Lucky'], baseYield: 25, growthSpeed: 0.9, generation: 0, yieldMin: 20, yieldMax: 30 },
  { name: 'Mint Rush', rarity: 'uncommon', traits: ['SpeedBoost'], baseYield: 20, growthSpeed: 1.4, generation: 0, yieldMin: 15, yieldMax: 25 },
  { name: 'Crystal Kush', rarity: 'uncommon', traits: ['Frost'], baseYield: 22, growthSpeed: 1.0, generation: 0, yieldMin: 18, yieldMax: 26 },
  { name: 'Lemon Drift', rarity: 'uncommon', traits: ['Lucky'], baseYield: 24, growthSpeed: 1.05, generation: 0, yieldMin: 19, yieldMax: 29 },
  { name: 'Aloe Mist', rarity: 'uncommon', traits: ['Frost'], baseYield: 23, growthSpeed: 0.95, generation: 0, yieldMin: 18, yieldMax: 28 },
  // Rare seeds (5)
  { name: 'Golden Leaf', rarity: 'rare', traits: ['Glitter', 'Turbo'], baseYield: 50, growthSpeed: 1.2, generation: 0, yieldMin: 40, yieldMax: 60 },
  { name: 'Thunder Cloud', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 40, growthSpeed: 1.1, generation: 0, yieldMin: 32, yieldMax: 48 },
  { name: 'Coin Crusher', rarity: 'rare', traits: ['GoldRush', 'Lucky'], baseYield: 45, growthSpeed: 0.85, generation: 0, yieldMin: 36, yieldMax: 54 },
  { name: 'Copper Diesel', rarity: 'rare', traits: ['GoldRush', 'Turbo'], baseYield: 48, growthSpeed: 1.0, generation: 0, yieldMin: 38, yieldMax: 58 },
  { name: 'Skyline Blitz', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 42, growthSpeed: 1.15, generation: 0, yieldMin: 34, yieldMax: 50 },
  // Epic seeds (5)
  { name: 'Mystic Essence', rarity: 'epic', traits: ['EssenceFlow', 'Glitter', 'Turbo'], baseYield: 80, growthSpeed: 1.0, generation: 0, yieldMin: 64, yieldMax: 96 },
  { name: 'Phantom OG', rarity: 'epic', traits: ['CritMaster', 'DoubleHarvest'], baseYield: 75, growthSpeed: 0.9, generation: 0, yieldMin: 60, yieldMax: 90 },
  { name: 'Shadow Walker', rarity: 'epic', traits: ['Resilient', 'Bountiful'], baseYield: 70, growthSpeed: 0.95, generation: 0, yieldMin: 56, yieldMax: 84 },
  { name: 'Nebula Mint', rarity: 'epic', traits: ['EssenceFlow', 'Glitter'], baseYield: 78, growthSpeed: 0.95, generation: 0, yieldMin: 62, yieldMax: 94 },
  { name: 'Iron Bloom', rarity: 'epic', traits: ['Resilient', 'Bountiful'], baseYield: 74, growthSpeed: 0.9, generation: 0, yieldMin: 59, yieldMax: 89 },
  // Legendary seeds (4)
  { name: 'Cosmic Blaze', rarity: 'legendary', traits: ['Bountiful', 'LuckyDrop', 'GoldRush'], baseYield: 150, growthSpeed: 0.8, generation: 0, yieldMin: 120, yieldMax: 180 },
  { name: 'Eternal Frost', rarity: 'legendary', traits: ['Frost', 'EssenceFlow', 'CritMaster', 'DoubleHarvest'], baseYield: 200, growthSpeed: 0.7, generation: 0, yieldMin: 160, yieldMax: 240 },
  { name: 'Aurora Nova', rarity: 'legendary', traits: ['GoldRush', 'LuckyDrop', 'CritMaster'], baseYield: 160, growthSpeed: 0.75, generation: 0, yieldMin: 128, yieldMax: 192 },
  { name: 'Glacial Crown', rarity: 'legendary', traits: ['Frost', 'EssenceFlow', 'DoubleHarvest'], baseYield: 190, growthSpeed: 0.7, generation: 0, yieldMin: 150, yieldMax: 230 },
];

// Collection bonuses per rarity tier
export const COLLECTION_BONUSES: Record<Rarity, { label: string; effect: string; value: number }> = {
  common: { label: 'Common Collection', effect: '+10% Growth Speed', value: 0.1 },
  uncommon: { label: 'Uncommon Collection', effect: '+15% Coin Yield', value: 0.15 },
  rare: { label: 'Rare Collection', effect: '+20% Seed Drop Chance', value: 0.2 },
  epic: { label: 'Epic Collection', effect: '+25% All Resources', value: 0.25 },
  legendary: { label: 'Legendary Collection', effect: '+50% XP Gain', value: 0.5 },
};

// Dealer drug effect
export interface DealerDrugEffect {
  type: 'high' | 'wasted' | 'paranoid' | 'hyper' | 'trippy' | 'drunk';
  name: string;
  salesMultiplier: number; // 0.5 = -50%, 1.5 = +50%
  scamChanceBonus: number; // adds to scam chance
  expiresAt: number;
  dealerId: string; // which dealer has this effect
}

// Dealer activity log entry
export interface DealerActivity {
  id: string;
  timestamp: number;
  type: 'sale' | 'meeting' | 'scam' | 'waiting' | 'deal' | 'kill' | 'drugs' | 'random' | 'violence' | 'robbery';
  message: string;
  grams?: number;
  revenue?: number;
  customerName?: string;
  dealerId: string; // which dealer did this
}

export interface GameState {
  // Resources
  budcoins: number;
  resin: number;
  essence: number;
  gems: number;
  xp: number;
  level: number;
  skillPoints: number;

  // Game state
  growSlots: GrowSlot[];
  seeds: Seed[];
  upgrades: Upgrade[];
  skills: SkillNode[];
  quests: Quest[];
  cosmetics: Cosmetic[];
  
  // Workers
  workers: Worker[];
  
  // Inventory & Sales
  inventory: BudItem[];
  dryingRacks: DryingRack[];
  salesChannels: SalesChannel[];
  totalGramsSold: number;
  totalSalesRevenue: number;
  
  // Dealer Activity Log & Effects
  dealerActivities: DealerActivity[];
  dealerDrugEffects: Record<string, DealerDrugEffect | null>; // per dealer drug effects
  
  // Collection
  discoveredSeeds: string[]; // Array of seed names that have been discovered
  discoveredHybridSeeds: Seed[]; // Hybrid seeds discovered via breeding

  // Timestamps
  lastActive: number;
  gameStarted: number;
  gameTimeMinutes: number;

  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  reducedMotion: boolean;
  tutorialComplete: boolean;

  // Stats
  totalHarvests: number;
  totalTaps: number;
  totalCoinsEarned: number;
  totalGramsHarvested: number;

  // Prestige System
  prestige: number;
  prestigePoints: number;

  // Achievements
  claimedAchievements: string[];
  totalBreedings: number;

  // Actions
  tap: () => void;
  tapBatch: (count: number) => void;
  plantSeed: (slotId: number, seed: Seed) => void;
  harvest: (slotId: number) => void;
  buyUpgrade: (upgradeId: string) => void;
  unlockSkill: (skillId: string) => void;
  claimQuest: (questId: string) => void;
  updateProgress: (delta: number) => void;
  calculateOfflineProgress: () => { coins: number; harvests: number };
  advanceGameTime: (realSeconds: number) => number;
  addXp: (amount: number) => void;
  checkLevelUp: () => number;
  discoverSeed: (seedName: string) => void;
  getCollectionBonus: (rarity: Rarity) => boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleReducedMotion: () => void;
  completeTutorial: () => void;
  resetGame: () => void;
  exportSave: () => string;
  importSave: (data: string) => boolean;
  
  // Inventory Actions
  startDrying: (budId: string, rackId: number) => void;
  collectDried: (rackId: number) => void;
  updateDryingProgress: (delta: number) => void;
  sellBuds: (budId: string, channelId: string, grams: number) => { success: boolean; revenue: number; message: string };
  unlockSalesChannel: (channelId: string) => void;
  buyDryingRack: () => { success: boolean; cost: number; message: string };
  getDryingRackCost: () => number;
  
  // Worker Actions
  buyWorker: (workerId: string) => boolean;
  upgradeWorker: (workerId: string) => boolean;
  toggleWorkerPause: (workerId: string) => void;
  runWorkerTick: () => void;
  
  // Seed Shop
  buySeed: (seedName: string, cost: number) => boolean;
  
  // Cheat Actions (Dev Panel)
  cheatAddCoins: (amount: number) => void;
  cheatAddLevel: () => void;
  cheatSetLevel: (level: number) => void;
  cheatAddSeeds: (count: number) => void;
  cheatUnlockAllSlots: () => void;
  cheatUnlockAllWorkers: () => void;
  
  // Achievement Actions
  claimAchievement: (achievementId: string, reward: { coins?: number; gems?: number; seeds?: number }) => boolean;
  incrementBreedings: () => void;
}

// Trait effects documentation:
// - Steady: No special effect, reliable baseline
// - Lucky: +50% chance for seed drops
// - Glitter: +20% gem drop chance
// - Turbo: +30% growth speed (stacks with base growthSpeed)
// - Frost: +25% resin yield
// - DoubleHarvest: 25% chance to harvest twice
// - SpeedBoost: +50% growth speed
// - LuckyDrop: +100% seed drop chance
// - GoldRush: +50% coin yield
// - EssenceFlow: +100% essence yield
// - CritMaster: +15% base crit chance
// - Resilient: Plant auto-replants same seed on harvest (20% chance)
// - Bountiful: +30% to all resource yields

// Initial seeds - expanded variety
const initialSeeds: Seed[] = [
  // Common seeds (5)
  { id: 'seed-1', name: 'Green Dream', rarity: 'common', traits: ['Steady'], baseYield: 10, growthSpeed: 1, generation: 0, yieldMin: 8, yieldMax: 12 },
  { id: 'seed-2', name: 'Basic Bud', rarity: 'common', traits: ['Steady'], baseYield: 8, growthSpeed: 1.1, generation: 0, yieldMin: 6, yieldMax: 10 },
  { id: 'seed-3', name: 'Starter Sprout', rarity: 'common', traits: ['SpeedBoost'], baseYield: 6, growthSpeed: 1.3, generation: 0, yieldMin: 4, yieldMax: 8 },
  
  // Uncommon seeds (4)
  { id: 'seed-4', name: 'Purple Haze', rarity: 'uncommon', traits: ['Lucky'], baseYield: 25, growthSpeed: 0.9, generation: 0, yieldMin: 20, yieldMax: 30 },
  { id: 'seed-5', name: 'Mint Rush', rarity: 'uncommon', traits: ['SpeedBoost'], baseYield: 20, growthSpeed: 1.4, generation: 0, yieldMin: 15, yieldMax: 25 },
  { id: 'seed-6', name: 'Crystal Kush', rarity: 'uncommon', traits: ['Frost'], baseYield: 22, growthSpeed: 1.0, generation: 0, yieldMin: 18, yieldMax: 26 },
  
  // Rare seeds (3)
  { id: 'seed-7', name: 'Golden Leaf', rarity: 'rare', traits: ['Glitter', 'Turbo'], baseYield: 50, growthSpeed: 1.2, generation: 0, yieldMin: 40, yieldMax: 60 },
  { id: 'seed-8', name: 'Thunder Cloud', rarity: 'rare', traits: ['DoubleHarvest', 'SpeedBoost'], baseYield: 40, growthSpeed: 1.1, generation: 0, yieldMin: 32, yieldMax: 48 },
  { id: 'seed-9', name: 'Coin Crusher', rarity: 'rare', traits: ['GoldRush', 'Lucky'], baseYield: 45, growthSpeed: 0.85, generation: 0, yieldMin: 36, yieldMax: 54 },
  
  // Epic seeds (2)
  { id: 'seed-10', name: 'Mystic Essence', rarity: 'epic', traits: ['EssenceFlow', 'Glitter', 'Turbo'], baseYield: 80, growthSpeed: 1.0, generation: 0, yieldMin: 64, yieldMax: 96 },
  { id: 'seed-11', name: 'Phantom OG', rarity: 'epic', traits: ['CritMaster', 'DoubleHarvest'], baseYield: 75, growthSpeed: 0.9, generation: 0, yieldMin: 60, yieldMax: 90 },
  
  // Legendary seed (1)
  { id: 'seed-12', name: 'Cosmic Blaze', rarity: 'legendary', traits: ['Bountiful', 'LuckyDrop', 'GoldRush'], baseYield: 150, growthSpeed: 0.8, generation: 0, yieldMin: 120, yieldMax: 180 },
];

// Initial upgrades
const initialUpgrades: Upgrade[] = [
  // Equipment - Core growth
  { id: 'led-panel', name: 'LED Panel', description: 'Increases growth speed', category: 'equipment', baseCost: 50, costScaling: 1.5, level: 0, maxLevel: 50, effect: 'growthSpeed', effectValue: 0.1 },
  { id: 'ventilation', name: 'Ventilation', description: 'Critical harvest chance', category: 'equipment', baseCost: 100, costScaling: 1.6, level: 0, maxLevel: 30, effect: 'critChance', effectValue: 0.02 },
  { id: 'nutrient', name: 'Nutrient Injector', description: 'Essence multiplier', category: 'equipment', baseCost: 200, costScaling: 1.7, level: 0, maxLevel: 25, effect: 'essenceMult', effectValue: 0.15 },
  { id: 'trimming', name: 'Trimming Station', description: 'Harvest bonus', category: 'equipment', baseCost: 150, costScaling: 1.5, level: 0, maxLevel: 40, effect: 'harvestBonus', effectValue: 0.1 },
  { id: 'grow-slot', name: 'New Grow Slot', description: 'Unlock another pot', category: 'equipment', baseCost: 250, costScaling: 2.5, level: 0, maxLevel: 15, effect: 'slots', effectValue: 1 },
  
  // Automation
  { id: 'tap-power', name: 'Tap Power', description: 'Boost tap effectiveness', category: 'automation', baseCost: 75, costScaling: 1.4, level: 0, maxLevel: 50, effect: 'tapPower', effectValue: 0.2 },
  { id: 'auto-harvest', name: 'Auto-Harvest', description: 'Auto-collect ready plants', category: 'automation', baseCost: 500, costScaling: 2, level: 0, maxLevel: 5, effect: 'autoHarvest', effectValue: 1 },
  
  // Visual effect upgrades
  { id: 'solar-glow', name: 'Solar Intensifier', description: 'Plants emit soft glow', category: 'cosmetics', baseCost: 300, costScaling: 2, level: 0, maxLevel: 3, effect: 'plantGlow', effectValue: 1 },
  { id: 'bioluminescence', name: 'Bio Luminescence', description: 'Pulsing light effect', category: 'cosmetics', baseCost: 500, costScaling: 2.2, level: 0, maxLevel: 3, effect: 'pulseGlow', effectValue: 1 },
  { id: 'particle-trail', name: 'Particle Infuser', description: 'Floating particles', category: 'cosmetics', baseCost: 750, costScaling: 2.5, level: 0, maxLevel: 3, effect: 'particles', effectValue: 1 },
  { id: 'aura-field', name: 'Aura Field', description: 'Radiant energy aura', category: 'cosmetics', baseCost: 1000, costScaling: 2.5, level: 0, maxLevel: 3, effect: 'aura', effectValue: 1 },
  
  // Genetics
  { id: 'gene-splicer', name: 'Gene Splicer', description: 'Better breeding odds', category: 'genetics', baseCost: 1000, costScaling: 2, level: 0, maxLevel: 10, effect: 'breedingOdds', effectValue: 0.05 },
  { id: 'mutation-chamber', name: 'Mutation Chamber', description: 'Rare trait chance', category: 'genetics', baseCost: 800, costScaling: 2, level: 0, maxLevel: 10, effect: 'mutationChance', effectValue: 0.03 },
  
  // Drying upgrades
  { id: 'drying-speed', name: 'Turbo-Lüfter', description: '+15% Trocknungsgeschwindigkeit', category: 'drying', baseCost: 200, costScaling: 1.6, level: 0, maxLevel: 20, effect: 'dryingSpeed', effectValue: 0.15 },
  { id: 'quality-cure', name: 'Qualitäts-Curing', description: '+5% Qualität beim Trocknen', category: 'drying', baseCost: 350, costScaling: 1.7, level: 0, maxLevel: 15, effect: 'dryingQuality', effectValue: 5 },
  { id: 'humidity-control', name: 'Feuchtigkeitskontrolle', description: '+3% Qualität & +8% Speed', category: 'drying', baseCost: 500, costScaling: 1.8, level: 0, maxLevel: 10, effect: 'humidityControl', effectValue: 1 },
  { id: 'uv-treatment', name: 'UV-Behandlung', description: 'Chance auf Rarität-Upgrade', category: 'drying', baseCost: 1000, costScaling: 2.0, level: 0, maxLevel: 5, effect: 'rarityUpgrade', effectValue: 0.05 },
];

// Initial skills
const initialSkills: SkillNode[] = [
  // Producer path
  { id: 'prod-1', path: 'producer', name: 'Coin Boost I', description: '+10% coin yield', cost: 1, unlocked: false, requires: [], effect: 'coinMult', effectValue: 0.1 },
  { id: 'prod-2', path: 'producer', name: 'Coin Boost II', description: '+20% coin yield', cost: 2, unlocked: false, requires: ['prod-1'], effect: 'coinMult', effectValue: 0.2 },
  { id: 'prod-3', path: 'producer', name: 'Golden Touch', description: 'Rare golden harvests', cost: 3, unlocked: false, requires: ['prod-2'], effect: 'goldenChance', effectValue: 0.05 },
  // Alchemist path
  { id: 'alch-1', path: 'alchemist', name: 'Essence Flow', description: '+15% essence', cost: 1, unlocked: false, requires: [], effect: 'essenceMult', effectValue: 0.15 },
  { id: 'alch-2', path: 'alchemist', name: 'Resin Mastery', description: '+20% resin', cost: 2, unlocked: false, requires: ['alch-1'], effect: 'resinMult', effectValue: 0.2 },
  { id: 'alch-3', path: 'alchemist', name: 'Transmutation', description: 'Convert resources', cost: 3, unlocked: false, requires: ['alch-2'], effect: 'transmute', effectValue: 1 },
  // Engineer path
  { id: 'eng-1', path: 'engineer', name: 'Efficiency I', description: 'Faster auto-tap', cost: 1, unlocked: false, requires: [], effect: 'autoSpeed', effectValue: 0.1 },
  { id: 'eng-2', path: 'engineer', name: 'Multi-Harvest', description: 'Auto-harvest ready plants', cost: 2, unlocked: false, requires: ['eng-1'], effect: 'autoHarvest', effectValue: 1 },
  { id: 'eng-3', path: 'engineer', name: 'Overdrive', description: '2x speed for 30s', cost: 3, unlocked: false, requires: ['eng-2'], effect: 'overdrive', effectValue: 2 },
];

// Initial quests
const initialQuests: Quest[] = [
  { id: 'daily-1', name: 'First Harvest', description: 'Harvest 3 plants', type: 'daily', target: 3, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 100 } },
  { id: 'daily-2', name: 'Tap Master', description: 'Tap 50 times', type: 'daily', target: 50, progress: 0, completed: false, claimed: false, reward: { type: 'xp', amount: 50 } },
  { id: 'daily-3', name: 'Collector', description: 'Earn 500 BudCoins', type: 'daily', target: 500, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 5 } },
  { id: 'achieve-1', name: 'Getting Started', description: 'Complete first harvest', type: 'achievement', target: 1, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 10 } },
  { id: 'achieve-2', name: 'Green Thumb', description: 'Harvest 100 plants', type: 'achievement', target: 100, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 50 } },
];

// Initial cosmetics
const initialCosmetics: Cosmetic[] = [
  { id: 'pot-default', name: 'Classic Pot', type: 'pot', rarity: 'common', cost: 0, owned: true, equipped: true },
  { id: 'pot-neon', name: 'Neon Glow Pot', type: 'pot', rarity: 'rare', cost: 100, owned: false, equipped: false },
  { id: 'pot-gold', name: 'Golden Pot', type: 'pot', rarity: 'legendary', cost: 500, owned: false, equipped: false },
  { id: 'bg-default', name: 'Lab Dark', type: 'background', rarity: 'common', cost: 0, owned: true, equipped: true },
  { id: 'bg-purple', name: 'Purple Haze', type: 'background', rarity: 'uncommon', cost: 50, owned: false, equipped: false },
];

// Initial workers
const initialWorkers: Worker[] = [
  { 
    id: 'grower-apprentice', 
    name: 'Grow-Assistent', 
    description: 'Pflanzt automatisch Seeds und klickt auf Pflanzen', 
    icon: '👨‍🌾', 
    cost: 5000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 5,
    slotsManaged: 2,
    abilities: ['plant', 'tap']
  },
  { 
    id: 'harvest-master', 
    name: 'Ernte-Meister', 
    description: 'Erntet automatisch fertige Pflanzen und startet Trocknung', 
    icon: '🧑‍🔬', 
    cost: 10000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 5,
    slotsManaged: 3,
    abilities: ['harvest', 'dry']
  },
  { 
    id: 'farm-manager', 
    name: 'Farm-Manager', 
    description: 'Vollautomatischer Betrieb: Pflanzt, boosted, erntet & trocknet', 
    icon: '👔', 
    cost: 50000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 10,
    slotsManaged: 6,
    abilities: ['plant', 'tap', 'harvest', 'dry']
  },
  { 
    id: 'sales-dealer', 
    name: 'Verkaufs-Dealer', 
    description: 'Verkauft automatisch getrocknete Buds über verfügbare Kanäle', 
    icon: '💼', 
    cost: 25000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 5,
    slotsManaged: 5, // buds per tick
    abilities: ['sell']
  },
  { 
    id: 'street-psycho', 
    name: 'Der Psycho', 
    description: 'Aggressiver Straßendealer. Schneller, brutaler, unberechenbar. Mehr Kohle, mehr Chaos.', 
    icon: '🔪', 
    cost: 75000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 10,
    slotsManaged: 8, // faster sales
    abilities: ['sell']
  },
];

// Initial grow slots (16 total, first unlocked)
const initialGrowSlots: GrowSlot[] = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  plantId: null,
  seed: i === 0 ? initialSeeds[0] : null,
  stage: 'seed' as PlantStage,
  progress: 0,
  isUnlocked: i === 0,
}));

// Initial drying racks (expanded to 8 total)
const initialDryingRacks: DryingRack[] = [
  { id: 0, bud: null, isUnlocked: true },
  { id: 1, bud: null, isUnlocked: true },
  { id: 2, bud: null, isUnlocked: false },
  { id: 3, bud: null, isUnlocked: false },
  { id: 4, bud: null, isUnlocked: false },
  { id: 5, bud: null, isUnlocked: false },
  { id: 6, bud: null, isUnlocked: false },
  { id: 7, bud: null, isUnlocked: false },
];

// Initial sales channels
const initialSalesChannels: SalesChannel[] = [
  { id: 'runner', name: 'Straßenläufer', description: 'Kleine Mengen, schnelles Geld', icon: '🏃', pricePerGram: 5, minQuality: 0, minLevel: 1, maxGramsPerSale: 10, cooldownMinutes: 1, lastSaleTime: 0, unlocked: true },
  { id: 'dealer', name: 'Dealer-Netzwerk', description: 'Bessere Preise, größere Mengen', icon: '🤝', pricePerGram: 8, minQuality: 30, minLevel: 5, maxGramsPerSale: 50, cooldownMinutes: 5, lastSaleTime: 0, unlocked: false },
  { id: 'pharmacy', name: 'Apotheke', description: 'Premium-Preise, hohe Qualität', icon: '💊', pricePerGram: 15, minQuality: 60, minLevel: 10, maxGramsPerSale: 100, cooldownMinutes: 15, lastSaleTime: 0, unlocked: false },
  { id: 'dispensary', name: 'Dispensary', description: 'Legaler Verkauf, Top-Qualität', icon: '🏪', pricePerGram: 20, minQuality: 80, minLevel: 20, maxGramsPerSale: 200, cooldownMinutes: 30, lastSaleTime: 0, unlocked: false },
  { id: 'wholesale', name: 'Großabnehmer', description: 'Massive Mengen, Bulk-Deals', icon: '🏭', pricePerGram: 12, minQuality: 50, minLevel: 30, maxGramsPerSale: 1000, cooldownMinutes: 60, lastSaleTime: 0, unlocked: false },
];

const STAGE_THRESHOLDS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 25,
  veg: 50,
  flower: 75,
  harvest: 100,
};

const getStageFromProgress = (progress: number): PlantStage => {
  if (progress >= 100) return 'harvest';
  if (progress >= 75) return 'flower';
  if (progress >= 50) return 'veg';
  if (progress >= 25) return 'sprout';
  return 'seed';
};

const XP_PER_LEVEL = 100;
const XP_SCALING = 1.5;

const getXpForLevel = (level: number): number => {
  return Math.floor(XP_PER_LEVEL * Math.pow(XP_SCALING, level - 1));
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      budcoins: 500, // Starting coins
      resin: 0,
      essence: 0,
      gems: 10,
      xp: 0,
      level: 1,
      skillPoints: 0,

      growSlots: initialGrowSlots,
      seeds: initialSeeds,
      upgrades: initialUpgrades,
      skills: initialSkills,
      quests: initialQuests,
      cosmetics: initialCosmetics,
      
      // Workers
      workers: initialWorkers,
      
      // Inventory & Sales
      inventory: [] as BudItem[],
      dryingRacks: initialDryingRacks,
      salesChannels: initialSalesChannels,
      totalGramsSold: 0,
      totalSalesRevenue: 0,
      
      // Dealer Activity Log & Effects
      dealerActivities: [] as DealerActivity[],
      dealerDrugEffects: {} as Record<string, DealerDrugEffect | null>,
      
      // Collection - start with first seed discovered
      discoveredSeeds: ['Green Dream'],
      discoveredHybridSeeds: [],

      lastActive: Date.now(),
      gameStarted: Date.now(),
      gameTimeMinutes: 360,

      soundEnabled: true,
      musicEnabled: true,
      reducedMotion: false,
      tutorialComplete: false,

      totalHarvests: 0,
      totalTaps: 0,
      totalCoinsEarned: 0,
      totalGramsHarvested: 0,

      // Prestige System
      prestige: 0,
      prestigePoints: 0,

      // Achievements
      claimedAchievements: [],
      totalBreedings: 0,

      // Actions
      tap: () => set((state) => {
        const newTaps = state.totalTaps + 1;
        
        // Base tap boost value
        const baseTapBoost = 2;
        const tapPowerLevel = state.upgrades.find(u => u.id === 'tap-power')?.level ?? 0;
        const tapValue = baseTapBoost * (1 + tapPowerLevel * 0.2) * (1 + Math.floor(state.level / 10) * 0.1);
        
        // Update quest progress
        const quests = state.quests.map(q => {
          if (q.id === 'daily-2' && !q.completed) {
            const newProgress = q.progress + 1;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        // Tap boosts all plants with seeds
        const growSlots = state.growSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            const growthBonus = state.upgrades.find(u => u.id === 'led-panel')?.level ?? 0;
            const progressGain = tapValue * (1 + growthBonus * 0.1) * (slot.seed.growthSpeed ?? 1);
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getStageFromProgress(newProgress),
            };
          }
          return slot;
        });

        return {
          totalTaps: newTaps,
          growSlots,
          quests,
        };
      }),

      tapBatch: (count: number) => set((state) => {
        const tapCount = Number.isFinite(count) ? Math.floor(count) : 0;
        if (tapCount <= 0) return state;

        const newTaps = state.totalTaps + tapCount;

        // Base tap boost value
        const baseTapBoost = 2;
        const tapPowerLevel = state.upgrades.find(u => u.id === 'tap-power')?.level ?? 0;
        const tapValue = baseTapBoost * (1 + tapPowerLevel * 0.2) * (1 + Math.floor(state.level / 10) * 0.1);
        const tapValueTotal = tapValue * tapCount;

        // Update quest progress
        const quests = state.quests.map(q => {
          if (q.id === 'daily-2' && !q.completed) {
            const newProgress = q.progress + tapCount;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        // Tap boosts all plants with seeds
        const growSlots = state.growSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            const growthBonus = state.upgrades.find(u => u.id === 'led-panel')?.level ?? 0;
            const progressGain = tapValueTotal * (1 + growthBonus * 0.1) * (slot.seed.growthSpeed ?? 1);
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getStageFromProgress(newProgress),
            };
          }
          return slot;
        });

        return {
          totalTaps: newTaps,
          growSlots,
          quests,
        };
      }),

      plantSeed: (slotId: number, seed: Seed) => set((state) => {
        const seeds = state.seeds.filter(s => s.id !== seed.id);
        const growSlots = state.growSlots.map(slot => 
          slot.id === slotId && slot.isUnlocked && !slot.seed
            ? { ...slot, seed, plantId: `plant-${Date.now()}`, stage: 'seed' as PlantStage, progress: 0 }
            : slot
        );
        return { seeds, growSlots };
      }),

      harvest: (slotId: number) => set((state) => {
        const slot = state.growSlots.find(s => s.id === slotId);
        if (!slot || slot.stage !== 'harvest' || !slot.seed) return state;

        const traits = slot.seed.traits;
        const hasTrait = (trait: string) => traits.includes(trait);
        
        // Check collection bonuses
        const checkCollectionBonus = (rarity: Rarity): boolean => {
          const seedsOfRarity = SEED_CATALOG.filter(s => s.rarity === rarity);
          return seedsOfRarity.every(s => state.discoveredSeeds.includes(s.name));
        };
        
        const hasCommonBonus = checkCollectionBonus('common'); // +10% growth (applied elsewhere)
        const hasUncommonBonus = checkCollectionBonus('uncommon'); // +15% coins
        const hasRareBonus = checkCollectionBonus('rare'); // +20% seed drop
        const hasEpicBonus = checkCollectionBonus('epic'); // +25% all resources
        const hasLegendaryBonus = checkCollectionBonus('legendary'); // +50% XP
        const hasMasterBonus = state.discoveredSeeds.length === SEED_CATALOG.length; // +100% all bonuses

        // Base values
        const baseYield = slot.seed.baseYield;
        const harvestBonus = state.upgrades.find(u => u.id === 'trimming')?.level ?? 0;
        
        // Collection bonus multipliers
        const epicResourceMult = hasEpicBonus ? 1.25 : 1;
        const masterMult = hasMasterBonus ? 2 : 1;
        const uncommonCoinMult = hasUncommonBonus ? 1.15 : 1;
        
        // Crit calculation with CritMaster trait
        let critChance = (state.upgrades.find(u => u.id === 'ventilation')?.level ?? 0) * 0.02;
        if (hasTrait('CritMaster')) critChance += 0.15;
        const isCrit = Math.random() < critChance;
        
        // Bountiful trait: +30% all yields
        const bountifulMult = hasTrait('Bountiful') ? 1.3 : 1;
        
        // GoldRush trait: +50% coins
        const goldRushMult = hasTrait('GoldRush') ? 1.5 : 1;
        
        // DoubleHarvest trait: 25% chance for 2x everything
        const doubleHarvest = hasTrait('DoubleHarvest') && Math.random() < 0.25;
        const harvestMult = doubleHarvest ? 2 : 1;
        
        // Calculate coin gain (with collection bonuses)
        let coinGain = Math.floor(baseYield * (1 + harvestBonus * 0.1) * (isCrit ? 2 : 1) * goldRushMult * bountifulMult * harvestMult * uncommonCoinMult * epicResourceMult * masterMult);
        
        // Frost trait: +25% resin
        const frostMult = hasTrait('Frost') ? 1.25 : 1;
        let resinGain = Math.floor(baseYield * 0.1 * frostMult * bountifulMult * harvestMult * epicResourceMult * masterMult);
        
        // EssenceFlow trait: +100% essence
        const essenceFlowMult = hasTrait('EssenceFlow') ? 2 : 1;
        let essenceGain = slot.seed.rarity !== 'common' 
          ? Math.floor(baseYield * 0.05 * essenceFlowMult * bountifulMult * harvestMult * epicResourceMult * masterMult) 
          : 0;
        
        // Gem chance with Glitter trait: +20% gem drop chance
        let gemChance = slot.seed.rarity === 'legendary' ? 0.1 : slot.seed.rarity === 'epic' ? 0.05 : 0.01;
        if (hasTrait('Glitter')) gemChance += 0.2;
        let gemGain = Math.random() < gemChance ? (doubleHarvest ? 2 : 1) : 0;

        // Seed drop chance with Lucky (+50%) and LuckyDrop (+100%) traits + Rare collection bonus
        let seedDropChance = 0.3;
        if (hasTrait('Lucky')) seedDropChance += 0.15; // +50% of base
        if (hasTrait('LuckyDrop')) seedDropChance += 0.3; // +100% of base
        if (hasRareBonus) seedDropChance += 0.06; // +20% of base from collection
        seedDropChance = Math.min(seedDropChance, 0.95); // Cap at 95%
        
        let newSeeds = [...state.seeds];
        if (Math.random() < seedDropChance) {
          newSeeds.push({
            ...slot.seed,
            id: `seed-${Date.now()}`,
          });
          // Double harvest can drop a second seed
          if (doubleHarvest && Math.random() < seedDropChance) {
            newSeeds.push({
              ...slot.seed,
              id: `seed-${Date.now()}-2`,
            });
          }
        }

        // Update quests
        const quests = state.quests.map(q => {
          if ((q.id === 'daily-1' || q.id === 'achieve-1' || q.id === 'achieve-2') && !q.completed) {
            const newProgress = q.progress + (doubleHarvest ? 2 : 1);
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          if (q.id === 'daily-3' && !q.completed) {
            const newProgress = q.progress + coinGain;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        // Reset slot - Resilient trait: 20% chance to auto-replant
        const resilientReplant = hasTrait('Resilient') && Math.random() < 0.2;
        const growSlots = state.growSlots.map(s => 
          s.id === slotId 
            ? resilientReplant 
              ? { ...s, plantId: `plant-${Date.now()}`, stage: 'seed' as PlantStage, progress: 0 }
              : { ...s, seed: null, plantId: null, stage: 'seed' as PlantStage, progress: 0 }
            : s
        );

        // Add XP (bonus for double harvest + legendary collection bonus)
        const baseXp = 10 + (slot.seed.rarity === 'legendary' ? 50 : slot.seed.rarity === 'epic' ? 30 : slot.seed.rarity === 'rare' ? 20 : slot.seed.rarity === 'uncommon' ? 10 : 0);
        const legendaryXpMult = hasLegendaryBonus ? 1.5 : 1;
        const xpGain = Math.floor(baseXp * harvestMult * legendaryXpMult * masterMult);

        // Discover the seed if not already discovered
        const seedName = slot.seed.name;
        const newDiscoveredSeeds = state.discoveredSeeds.includes(seedName) 
          ? state.discoveredSeeds 
          : [...state.discoveredSeeds, seedName];

        // Create wet buds for inventory (grams based on baseYield)
        const gramsHarvested = Math.floor(baseYield * bountifulMult * harvestMult * (1 + harvestBonus * 0.05));
        const quality = Math.min(100, Math.floor(50 + Math.random() * 30 + (isCrit ? 20 : 0) + (hasTrait('Bountiful') ? 10 : 0)));
        
        const newBud: BudItem = {
          id: `bud-${Date.now()}`,
          strainName: slot.seed.name,
          rarity: slot.seed.rarity,
          grams: gramsHarvested,
          quality,
          state: 'wet',
          dryingProgress: 0,
          traits: slot.seed.traits,
        };
        
        const newInventory = [...state.inventory, newBud];

        return {
          budcoins: state.budcoins + coinGain,
          resin: state.resin + resinGain,
          essence: state.essence + essenceGain,
          gems: state.gems + gemGain,
          totalHarvests: state.totalHarvests + harvestMult,
          totalCoinsEarned: state.totalCoinsEarned + coinGain,
          totalGramsHarvested: state.totalGramsHarvested + gramsHarvested,
          growSlots,
          seeds: newSeeds,
          quests,
          xp: state.xp + xpGain,
          discoveredSeeds: newDiscoveredSeeds,
          inventory: newInventory,
        };
      }),

      buyUpgrade: (upgradeId: string) => set((state) => {
        const upgrade = state.upgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) return state;

        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level));
        if (state.budcoins < cost) return state;

        // Handle special upgrades
        let growSlots = state.growSlots;
        if (upgrade.id === 'grow-slot') {
          const nextSlot = growSlots.find(s => !s.isUnlocked);
          if (nextSlot) {
            growSlots = growSlots.map(s => 
              s.id === nextSlot.id ? { ...s, isUnlocked: true } : s
            );
          }
        }

        const upgrades = state.upgrades.map(u => 
          u.id === upgradeId ? { ...u, level: u.level + 1 } : u
        );

        return {
          budcoins: state.budcoins - cost,
          upgrades,
          growSlots,
        };
      }),

      unlockSkill: (skillId: string) => set((state) => {
        const skill = state.skills.find(s => s.id === skillId);
        if (!skill || skill.unlocked || state.skillPoints < skill.cost) return state;

        // Check requirements
        const requirementsMet = skill.requires.every(reqId => 
          state.skills.find(s => s.id === reqId)?.unlocked
        );
        if (!requirementsMet) return state;

        const skills = state.skills.map(s => 
          s.id === skillId ? { ...s, unlocked: true } : s
        );

        return {
          skillPoints: state.skillPoints - skill.cost,
          skills,
        };
      }),

      claimQuest: (questId: string) => set((state) => {
        const quest = state.quests.find(q => q.id === questId);
        if (!quest || !quest.completed || quest.claimed) return state;

        const quests = state.quests.map(q => 
          q.id === questId ? { ...q, claimed: true } : q
        );

        let updates: Partial<GameState> = { quests };

        switch (quest.reward.type) {
          case 'budcoins':
            updates.budcoins = state.budcoins + quest.reward.amount;
            break;
          case 'gems':
            updates.gems = state.gems + quest.reward.amount;
            break;
          case 'xp':
            updates.xp = state.xp + quest.reward.amount;
            break;
        }

        return updates as GameState;
      }),

      updateProgress: (delta: number) => set((state) => {
        // Base passive growth - plants always grow on their own (no tapping required)
        const basePassiveGrowth = 0.8; // ~2 minutes to full growth without tapping
        const growthBonus = state.upgrades.find(u => u.id === 'led-panel')?.level ?? 0;
        
        // Check collection bonus for growth speed
        const checkCollectionBonus = (rarity: Rarity): boolean => {
          const seedsOfRarity = SEED_CATALOG.filter(s => s.rarity === rarity);
          return seedsOfRarity.every(s => state.discoveredSeeds.includes(s.name));
        };
        const hasCommonBonus = checkCollectionBonus('common'); // +10% growth speed
        const collectionGrowthMult = hasCommonBonus ? 1.1 : 1;

        // Auto-progress all plants passively
        let growSlots = state.growSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            // Apply trait bonuses: Turbo (+30%), SpeedBoost (+50%)
            const traits = slot.seed.traits;
            const turboMult = traits.includes('Turbo') ? 1.3 : 1;
            const speedBoostMult = traits.includes('SpeedBoost') ? 1.5 : 1;
            
            const progressGain = delta * basePassiveGrowth * (1 + growthBonus * 0.1) * (slot.seed.growthSpeed ?? 1) * collectionGrowthMult * turboMult * speedBoostMult;
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getStageFromProgress(newProgress),
            };
          }
          return slot;
        });

        // Auto-harvest feature: if upgrade level > 0, auto-collect ready plants
        const autoHarvestLevel = state.upgrades.find(u => u.id === 'auto-harvest')?.level ?? 0;
        let autoHarvestUpdates: Partial<GameState> = {};
        
        if (autoHarvestLevel > 0) {
          // Auto-harvest up to `autoHarvestLevel` plants per tick
          let harvestsRemaining = autoHarvestLevel;
          let totalCoins = 0;
          let totalResin = 0;
          let totalEssence = 0;
          let totalGems = 0;
          let totalHarvests = 0;
          let newSeeds = [...state.seeds];
          let newDiscoveredSeeds = [...state.discoveredSeeds];
          
          growSlots = growSlots.map(slot => {
            if (harvestsRemaining > 0 && slot.seed && slot.isUnlocked && slot.stage === 'harvest') {
              harvestsRemaining--;
              totalHarvests++;
              
              // Simple auto-harvest rewards (without full trait calculations to keep performance)
              const baseYield = slot.seed.baseYield;
              const harvestBonus = state.upgrades.find(u => u.id === 'trimming')?.level ?? 0;
              totalCoins += Math.floor(baseYield * (1 + harvestBonus * 0.1));
              totalResin += Math.floor(baseYield * 0.1);
              if (slot.seed.rarity !== 'common') {
                totalEssence += Math.floor(baseYield * 0.05);
              }
              
              // Seed drop chance
              if (Math.random() < 0.3) {
                newSeeds.push({ ...slot.seed, id: `seed-${Date.now()}-${slot.id}` });
              }
              
              // Discover seed
              if (!newDiscoveredSeeds.includes(slot.seed.name)) {
                newDiscoveredSeeds.push(slot.seed.name);
              }
              
              // Reset slot
              return { ...slot, seed: null, plantId: null, stage: 'seed' as PlantStage, progress: 0 };
            }
            return slot;
          });
          
          if (totalHarvests > 0) {
            autoHarvestUpdates = {
              budcoins: state.budcoins + totalCoins,
              resin: state.resin + totalResin,
              essence: state.essence + totalEssence,
              gems: state.gems + totalGems,
              totalHarvests: state.totalHarvests + totalHarvests,
              totalCoinsEarned: state.totalCoinsEarned + totalCoins,
              seeds: newSeeds,
              discoveredSeeds: newDiscoveredSeeds,
            };
          }
        }

        return { growSlots, lastActive: Date.now(), ...autoHarvestUpdates };
      }),

      calculateOfflineProgress: () => {
        const state = get();
        const now = Date.now();
        const offlineSeconds = Math.min((now - state.lastActive) / 1000, 8 * 60 * 60); // Max 8 hours
        
        // Only calculate if offline for at least 60 seconds
        if (offlineSeconds < 60) return { coins: 0, harvests: 0 };

        // Calculate based on actual plant states
        const basePassiveGrowth = 0.35; // Same as updateProgress
        const ledLevel = state.upgrades.find(u => u.id === 'led-panel')?.level ?? 0;
        const growthMult = 1 + ledLevel * 0.1;
        const harvestBonus = state.upgrades.find(u => u.id === 'trimming')?.level ?? 0;
        
        let totalCoins = 0;
        let totalHarvests = 0;
        
        // Simulate growth for each slot
        state.growSlots.forEach(slot => {
          if (slot.seed && slot.isUnlocked) {
            // Calculate how much progress would be gained
            const traits = slot.seed.traits;
            const turboMult = traits.includes('Turbo') ? 1.3 : 1;
            const speedBoostMult = traits.includes('SpeedBoost') ? 1.5 : 1;
            const seedGrowthMult = slot.seed.growthSpeed ?? 1;
            
            const progressPerSecond = basePassiveGrowth * growthMult * seedGrowthMult * turboMult * speedBoostMult;
            const totalProgress = slot.progress + (progressPerSecond * offlineSeconds);
            
            // Calculate how many full harvests could occur
            const fullCycles = Math.floor(totalProgress / 100);
            
            if (fullCycles > 0) {
              totalHarvests += fullCycles;
              const baseYield = slot.seed.baseYield;
              // Apply trait bonuses
              const goldRushMult = traits.includes('GoldRush') ? 1.5 : 1;
              const bountifulMult = traits.includes('Bountiful') ? 1.3 : 1;
              const coinPerHarvest = Math.floor(baseYield * (1 + harvestBonus * 0.1) * goldRushMult * bountifulMult);
              totalCoins += fullCycles * coinPerHarvest;
            }
          }
        });

        const offlineGameMinutes = Math.floor(offlineSeconds * 5);

        // Apply offline earnings to state
        if (totalCoins > 0) {
          set((state) => ({
            budcoins: state.budcoins + totalCoins,
            totalCoinsEarned: state.totalCoinsEarned + totalCoins,
            totalHarvests: state.totalHarvests + totalHarvests,
            gameTimeMinutes: state.gameTimeMinutes + offlineGameMinutes,
            lastActive: now,
          }));
        } else if (offlineGameMinutes > 0) {
          set((state) => ({
            gameTimeMinutes: state.gameTimeMinutes + offlineGameMinutes,
            lastActive: now,
          }));
        }

        return { coins: totalCoins, harvests: totalHarvests };
      },

      advanceGameTime: (realSeconds: number) => {
        const safeSeconds = Number.isFinite(realSeconds) ? Math.max(0, realSeconds) : 0;
        const deltaMinutes = safeSeconds * 5;
        if (deltaMinutes <= 0) return 0;
        set((state) => ({ gameTimeMinutes: state.gameTimeMinutes + deltaMinutes }));
        return deltaMinutes;
      },

      addXp: (amount: number) => {
        const state = get();
        let newXp = state.xp + amount;
        let newLevel = state.level;
        let newSkillPoints = state.skillPoints;

        while (newXp >= getXpForLevel(newLevel)) {
          newXp -= getXpForLevel(newLevel);
          newLevel++;
          newSkillPoints++;
        }

        set({ xp: newXp, level: newLevel, skillPoints: newSkillPoints });
      },

      // Check and process any pending level ups
      checkLevelUp: () => {
        const state = get();
        let newXp = state.xp;
        let newLevel = state.level;
        let newSkillPoints = state.skillPoints;
        let levelsGained = 0;

        while (newXp >= getXpForLevel(newLevel)) {
          newXp -= getXpForLevel(newLevel);
          newLevel++;
          newSkillPoints++;
          levelsGained++;
        }

        if (levelsGained > 0) {
          set({ xp: newXp, level: newLevel, skillPoints: newSkillPoints });
        }
        
        return levelsGained;
      },

      discoverSeed: (seedName: string) => set((state) => {
        if (state.discoveredSeeds.includes(seedName)) return state;
        return { discoveredSeeds: [...state.discoveredSeeds, seedName] };
      }),

      getCollectionBonus: (rarity: Rarity) => {
        const state = get();
        const seedsOfRarity = SEED_CATALOG.filter(s => s.rarity === rarity);
        const discoveredOfRarity = seedsOfRarity.filter(s => state.discoveredSeeds.includes(s.name));
        return discoveredOfRarity.length === seedsOfRarity.length;
      },

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
      completeTutorial: () => set({ tutorialComplete: true }),

      resetGame: () => {
        // Clear localStorage completely first
        localStorage.removeItem('grow-lab-save');
        
        set({
          budcoins: 999999,
          resin: 0,
          essence: 0,
          gems: 10,
          xp: 0,
          level: 1,
          skillPoints: 0,
          growSlots: JSON.parse(JSON.stringify(initialGrowSlots)),
          seeds: JSON.parse(JSON.stringify(initialSeeds)),
          upgrades: JSON.parse(JSON.stringify(initialUpgrades)),
          skills: JSON.parse(JSON.stringify(initialSkills)),
          quests: JSON.parse(JSON.stringify(initialQuests)),
          cosmetics: JSON.parse(JSON.stringify(initialCosmetics)),
          workers: JSON.parse(JSON.stringify(initialWorkers)),
          discoveredSeeds: ['Green Dream'],
          discoveredHybridSeeds: [],
          lastActive: Date.now(),
          gameStarted: Date.now(),
          gameTimeMinutes: 360,
          tutorialComplete: false,
          totalHarvests: 0,
          totalTaps: 0,
          totalCoinsEarned: 0,
          inventory: [],
          dryingRacks: JSON.parse(JSON.stringify(initialDryingRacks)),
          salesChannels: JSON.parse(JSON.stringify(initialSalesChannels)),
          totalGramsSold: 0,
          totalSalesRevenue: 0,
        });
        
        // Force page reload to ensure clean state
        window.location.reload();
      },

      exportSave: () => {
        const state = get();
        return btoa(JSON.stringify(state));
      },

      importSave: (data: string) => {
        try {
          const parsed = JSON.parse(atob(data));
          set(parsed);
          return true;
        } catch {
          return false;
        }
      },

      // Inventory & Drying Actions
      startDrying: (budId: string, rackId: number) => set((state) => {
        const bud = state.inventory.find(b => b.id === budId);
        const rack = state.dryingRacks.find(r => r.id === rackId);
        
        if (!bud || !rack || rack.bud || !rack.isUnlocked || bud.state !== 'wet') return state;
        
        const inventory = state.inventory.filter(b => b.id !== budId);
        const dryingBud: BudItem = { ...bud, state: 'drying', dryingProgress: 0 };
        const dryingRacks = state.dryingRacks.map(r => 
          r.id === rackId ? { ...r, bud: dryingBud } : r
        );
        
        return { inventory, dryingRacks };
      }),

      collectDried: (rackId: number) => set((state) => {
        const rack = state.dryingRacks.find(r => r.id === rackId);
        
        if (!rack || !rack.bud || rack.bud.dryingProgress < 100) return state;
        
        // Apply quality upgrades when collecting
        const qualityCureLevel = state.upgrades.find(u => u.id === 'quality-cure')?.level ?? 0;
        const humidityLevel = state.upgrades.find(u => u.id === 'humidity-control')?.level ?? 0;
        const uvLevel = state.upgrades.find(u => u.id === 'uv-treatment')?.level ?? 0;
        
        // Quality boost from upgrades
        const qualityBoost = (qualityCureLevel * 5) + (humidityLevel * 3);
        const newQuality = Math.min(100, rack.bud.quality + qualityBoost);
        
        // Rarity upgrade chance from UV treatment
        let newRarity = rack.bud.rarity;
        if (uvLevel > 0) {
          const upgradeChance = uvLevel * 0.05;
          if (Math.random() < upgradeChance) {
            const rarityOrder: Array<typeof newRarity> = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const currentIndex = rarityOrder.indexOf(newRarity);
            if (currentIndex < rarityOrder.length - 1) {
              newRarity = rarityOrder[currentIndex + 1];
            }
          }
        }
        
        const driedBud: BudItem = { 
          ...rack.bud, 
          state: 'dried', 
          quality: newQuality,
          rarity: newRarity 
        };
        const inventory = [...state.inventory, driedBud];
        const dryingRacks = state.dryingRacks.map(r => 
          r.id === rackId ? { ...r, bud: null } : r
        );
        
        return { inventory, dryingRacks };
      }),

      updateDryingProgress: (delta: number) => set((state) => {
        const baseDryingSpeed = 0.5; // ~3-4 minutes to fully dry
        
        // Apply speed upgrades
        const dryingSpeedLevel = state.upgrades.find(u => u.id === 'drying-speed')?.level ?? 0;
        const humidityLevel = state.upgrades.find(u => u.id === 'humidity-control')?.level ?? 0;
        const speedMultiplier = 1 + (dryingSpeedLevel * 0.15) + (humidityLevel * 0.08);
        
        const dryingRacks = state.dryingRacks.map(rack => {
          if (rack.bud && rack.bud.state === 'drying') {
            const newProgress = Math.min(100, rack.bud.dryingProgress + (delta * baseDryingSpeed * speedMultiplier));
            return {
              ...rack,
              bud: { ...rack.bud, dryingProgress: newProgress }
            };
          }
          return rack;
        });
        
        return { dryingRacks };
      }),

      sellBuds: (budId: string, channelId: string, grams: number) => {
        const state = get();
        const bud = state.inventory.find(b => b.id === budId);
        const channel = state.salesChannels.find(c => c.id === channelId);
        
        if (!bud || !channel) {
          return { success: false, revenue: 0, message: 'Produkt oder Kanal nicht gefunden' };
        }
        
        if (!channel.unlocked) {
          return { success: false, revenue: 0, message: 'Verkaufskanal noch nicht freigeschaltet' };
        }
        
        if (bud.state !== 'dried') {
          return { success: false, revenue: 0, message: 'Nur getrocknete Buds können verkauft werden' };
        }
        
        if (bud.quality < channel.minQuality) {
          return { success: false, revenue: 0, message: `Mindestqualität ${channel.minQuality}% erforderlich` };
        }
        
        if (grams > channel.maxGramsPerSale) {
          return { success: false, revenue: 0, message: `Maximal ${channel.maxGramsPerSale}g pro Verkauf` };
        }
        
        if (grams > bud.grams) {
          return { success: false, revenue: 0, message: 'Nicht genug Gramm vorhanden' };
        }
        
        const now = Date.now();
        const cooldownMs = channel.cooldownMinutes * 60 * 1000;
        if (now - channel.lastSaleTime < cooldownMs) {
          const remainingMin = Math.ceil((cooldownMs - (now - channel.lastSaleTime)) / 60000);
          return { success: false, revenue: 0, message: `Noch ${remainingMin} Minuten Cooldown` };
        }
        
        // Calculate revenue with quality bonus
        const qualityBonus = 1 + (bud.quality / 100) * 0.5; // Up to 50% bonus
        const rarityBonus = bud.rarity === 'legendary' ? 2 : bud.rarity === 'epic' ? 1.5 : bud.rarity === 'rare' ? 1.25 : bud.rarity === 'uncommon' ? 1.1 : 1;
        const revenue = Math.floor(grams * channel.pricePerGram * qualityBonus * rarityBonus);
        
        // Update state
        set((state) => {
          let inventory = [...state.inventory];
          const budIndex = inventory.findIndex(b => b.id === budId);
          
          if (grams >= bud.grams) {
            // Remove entire bud
            inventory = inventory.filter(b => b.id !== budId);
          } else {
            // Reduce grams
            inventory[budIndex] = { ...inventory[budIndex], grams: inventory[budIndex].grams - grams };
          }
          
          const salesChannels = state.salesChannels.map(c => 
            c.id === channelId ? { ...c, lastSaleTime: now } : c
          );
          
          return {
            inventory,
            salesChannels,
            budcoins: state.budcoins + revenue,
            totalGramsSold: state.totalGramsSold + grams,
            totalSalesRevenue: state.totalSalesRevenue + revenue,
            totalCoinsEarned: state.totalCoinsEarned + revenue,
          };
        });
        
        return { success: true, revenue, message: `${grams}g für ${revenue} BudCoins verkauft!` };
      },

      unlockSalesChannel: (channelId: string) => set((state) => {
        const channel = state.salesChannels.find(c => c.id === channelId);
        if (!channel || channel.unlocked || state.level < channel.minLevel) return state;
        
        const salesChannels = state.salesChannels.map(c =>
          c.id === channelId ? { ...c, unlocked: true } : c
        );
        
        return { salesChannels };
      }),

      getDryingRackCost: () => {
        const state = get();
        const unlockedCount = state.dryingRacks.filter(r => r.isUnlocked).length;
        // Escalating cost: 500, 1500, 4000, 10000, 25000, 50000
        const baseCost = 500;
        return Math.floor(baseCost * Math.pow(2.5, unlockedCount - 2));
      },

      buyDryingRack: () => {
        const state = get();
        const nextRack = state.dryingRacks.find(r => !r.isUnlocked);
        
        if (!nextRack) {
          return { success: false, cost: 0, message: 'Alle Trocknungsgestelle bereits freigeschaltet!' };
        }
        
        const cost = state.getDryingRackCost();
        
        if (state.budcoins < cost) {
          return { success: false, cost, message: `Nicht genug BudCoins! (${cost} benötigt)` };
        }
        
        set({
          budcoins: state.budcoins - cost,
          dryingRacks: state.dryingRacks.map(r =>
            r.id === nextRack.id ? { ...r, isUnlocked: true } : r
          ),
        });
        
        return { success: true, cost, message: `Trocknungsgestell ${nextRack.id + 1} freigeschaltet!` };
      },

      // Worker Actions
      buyWorker: (workerId: string) => {
        const state = get();
        const worker = state.workers.find(w => w.id === workerId);
        if (!worker || worker.owned || state.budcoins < worker.cost) return false;
        
        set({
          budcoins: state.budcoins - worker.cost,
          workers: state.workers.map(w => 
            w.id === workerId ? { ...w, owned: true } : w
          ),
        });
        return true;
      },

      upgradeWorker: (workerId: string) => {
        const state = get();
        const worker = state.workers.find(w => w.id === workerId);
        if (!worker || !worker.owned || worker.level >= worker.maxLevel) return false;
        
        const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
        if (state.budcoins < upgradeCost) return false;
        
        set({
          budcoins: state.budcoins - upgradeCost,
          workers: state.workers.map(w => 
            w.id === workerId ? { ...w, level: w.level + 1, slotsManaged: w.slotsManaged + 1 } : w
          ),
        });
        return true;
      },

      toggleWorkerPause: (workerId: string) => set((state) => ({
        workers: state.workers.map(w => 
          w.id === workerId && w.owned ? { ...w, paused: !w.paused } : w
        )
      })),

      runWorkerTick: () => set((state) => {
        // Only include workers that are owned AND not paused
        const activeWorkers = state.workers.filter(w => w.owned && !w.paused);
        if (activeWorkers.length === 0) return state;

        let growSlots = [...state.growSlots];
        let seeds = [...state.seeds];
        let inventory = [...state.inventory];
        let dryingRacks = [...state.dryingRacks];
        let budcoins = state.budcoins;
        let resin = state.resin;
        let essence = state.essence;
        let totalHarvests = state.totalHarvests;
        let totalCoinsEarned = state.totalCoinsEarned;
        let discoveredSeeds = [...state.discoveredSeeds];
        let totalGramsSold = state.totalGramsSold;
        let totalSalesRevenue = state.totalSalesRevenue;
        let dealerActivities = [...state.dealerActivities];

        for (const worker of activeWorkers) {
          const slotsToManage = worker.slotsManaged + worker.level - 1;

          // HARVEST ability: Collect ready plants FIRST (so we free up slots)
          if (worker.abilities.includes('harvest')) {
            let harvested = 0;
            growSlots = growSlots.map(slot => {
              if (harvested < slotsToManage && slot.seed && slot.isUnlocked && slot.stage === 'harvest') {
                harvested++;
                totalHarvests++;
                
                const seed = slot.seed;
                const baseYield = seed.baseYield;
                const harvestBonus = state.upgrades.find(u => u.id === 'trimming')?.level ?? 0;
                const coinReward = Math.floor(baseYield * (1 + harvestBonus * 0.1));
                
                budcoins += coinReward;
                totalCoinsEarned += coinReward;
                resin += Math.floor(baseYield * 0.1);
                if (seed.rarity !== 'common') {
                  essence += Math.floor(baseYield * 0.05);
                }

                // Create bud for drying
                const newBud: BudItem = {
                  id: `bud-${Date.now()}-${slot.id}-${Math.random()}`,
                  strainName: seed.name,
                  rarity: seed.rarity,
                  grams: Math.floor(baseYield * 0.5) + Math.floor(Math.random() * baseYield * 0.3),
                  quality: 50 + Math.floor(Math.random() * 40),
                  state: 'wet',
                  dryingProgress: 0,
                  traits: seed.traits,
                };
                inventory.push(newBud);

                // Seed drop chance
                if (Math.random() < 0.3) {
                  seeds.push({ ...seed, id: `seed-${Date.now()}-${slot.id}` });
                }

                // Discover seed
                if (!discoveredSeeds.includes(seed.name)) {
                  discoveredSeeds.push(seed.name);
                }

                return { ...slot, seed: null, progress: 0, stage: 'seed' as PlantStage };
              }
              return slot;
            });
          }

          // PLANT ability: Plant seeds in empty unlocked slots
          if (worker.abilities.includes('plant') && seeds.length > 0) {
            let planted = 0;
            for (let i = 0; i < growSlots.length && planted < slotsToManage && seeds.length > 0; i++) {
              const slot = growSlots[i];
              if (slot.isUnlocked && !slot.seed) {
                const seedToPlant = seeds.shift()!;
                growSlots[i] = { ...slot, seed: seedToPlant, progress: 0, stage: 'seed' as PlantStage };
                planted++;
              }
            }
          }

          // TAP ability: Boost plant growth (more aggressive)
          if (worker.abilities.includes('tap')) {
            const tapBoost = 2 + worker.level; // Increased from 1.5 * level
            let tapped = 0;
            growSlots = growSlots.map(slot => {
              if (tapped < slotsToManage && slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
                tapped++;
                const newProgress = Math.min(100, slot.progress + tapBoost);
                return { ...slot, progress: newProgress, stage: getStageFromProgress(newProgress) };
              }
              return slot;
            });
          }

          // DRY ability: Auto-start drying wet buds
          if (worker.abilities.includes('dry')) {
            const wetBuds = inventory.filter(b => b.state === 'wet');
            
            for (const wetBud of wetBuds) {
              const emptyRackIndex = dryingRacks.findIndex(r => r.isUnlocked && !r.bud);
              if (emptyRackIndex !== -1) {
                dryingRacks[emptyRackIndex] = {
                  ...dryingRacks[emptyRackIndex],
                  bud: { ...wetBud, state: 'drying' as BudState }
                };
                inventory = inventory.filter(b => b.id !== wetBud.id);
              }
            }

            // Auto-collect dried buds
            let collected = 0;
            const qualityCureLevel = state.upgrades.find(u => u.id === 'quality-cure')?.level ?? 0;
            const humidityLevel = state.upgrades.find(u => u.id === 'humidity-control')?.level ?? 0;
            const uvLevel = state.upgrades.find(u => u.id === 'uv-treatment')?.level ?? 0;

            for (let i = 0; i < dryingRacks.length && collected < slotsToManage; i++) {
              const rack = dryingRacks[i];
              if (!rack.bud || rack.bud.dryingProgress < 100) continue;

              const qualityBoost = (qualityCureLevel * 5) + (humidityLevel * 3);
              const newQuality = Math.min(100, rack.bud.quality + qualityBoost);

              let newRarity = rack.bud.rarity;
              if (uvLevel > 0) {
                const upgradeChance = uvLevel * 0.05;
                if (Math.random() < upgradeChance) {
                  const rarityOrder: Array<typeof newRarity> = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
                  const currentIndex = rarityOrder.indexOf(newRarity);
                  if (currentIndex < rarityOrder.length - 1) {
                    newRarity = rarityOrder[currentIndex + 1];
                  }
                }
              }

              const driedBud: BudItem = {
                ...rack.bud,
                state: 'dried',
                quality: newQuality,
                rarity: newRarity,
              };

              inventory.push(driedBud);
              dryingRacks[i] = { ...rack, bud: null };
              collected++;
            }
          }

          // SELL ability: Simulated dealer sales with activities
          if (worker.abilities.includes('sell')) {
            const driedBuds = inventory.filter(b => b.state === 'dried');
            const dealerId = worker.id;
            const isPsycho = dealerId === 'street-psycho';
            
            // Only sell ONE bud per tick to simulate realistic sales
            if (driedBuds.length > 0) {
              // Check and clear expired drug effects for this dealer
              let dealerDrugEffects = { ...state.dealerDrugEffects };
              if (dealerDrugEffects[dealerId] && dealerDrugEffects[dealerId]!.expiresAt < Date.now()) {
                dealerDrugEffects[dealerId] = null;
              }
              
              const currentDrugEffect = dealerDrugEffects[dealerId];
              
              // Get drug effect modifiers
              const salesMult = currentDrugEffect?.salesMultiplier ?? 1;
              const scamBonus = currentDrugEffect?.scamChanceBonus ?? 0;
              
              // Psycho has different probabilities: more violent, faster, more scams
              const killChance = isPsycho ? 8 : 3;
              const drugChance = isPsycho ? 5 : 7;
              const scamChance = isPsycho ? 12 : 7;
              const violenceChance = isPsycho ? 10 : 0; // Psycho-exclusive
              const robberyChance = isPsycho ? 8 : 0; // Psycho-exclusive
              const randomChance = isPsycho ? 5 : 10;
              const meetingChance = isPsycho ? 5 : 15; // Psycho wastes less time talking
              
              // Random chance for different outcomes
              const roll = Math.random() * 100;
              const bud = driedBuds[0];
              
              // Customer names - realistic street names
              const customerNames = [
                'Kevin', 'Marcel', 'Tim', 'Lukas', 'Max', 'Leon', 'Felix', 'Paul', 'Jan', 'Tom',
                'Lisa', 'Anna', 'Sarah', 'Julia', 'Laura', 'Lena', 'Marie', 'Sophie', 'Emma', 'Mia',
                'Digga', 'Bruder', 'Bro', 'Kumpel', 'Homie', 'Alter', 'Kollege', 'der Typ', 'Dude',
                'Stammkunde #42', 'der Student', 'die Studentin', 'der Nachbar', 'der von Nebenan',
                'die Alte von 3. Stock', 'der Assi von der Tanke', 'der Typ mit dem Pitbull',
                'die mit den Extensions', 'der mit dem AMG', 'der Hartzer', 'die vom Späti',
                'der Dönermann', 'der Shisha-Bar-Typ', 'der Security vom Club', 'die Krankenschwester',
                'der Taxifahrer', 'der LKW-Fahrer', 'der Hausmeister', 'der Kioskbesitzer',
                'Mehmet', 'Achmed', 'Dimitri', 'Slavik', 'Ronny', 'Mandy', 'Jacqueline', 'Dustin',
              ];
              const customerName = customerNames[Math.floor(Math.random() * customerNames.length)];
              
              let threshold = 0;
              
              // KILL EVENT
              if (roll < (threshold += killChance)) {
                const killMessages = isPsycho ? [
                  `🔪 ${customerName} hat zu lange gezögert. Liegt jetzt in der Gasse.`,
                  `⚰️ ${customerName} hat dumm geguckt. War ein Fehler.`,
                  `☠️ ${customerName} wollte handeln. Hat er nicht überlebt.`,
                  `💀 "Wo ist mein Geld?!" ${customerName} ist jetzt stumm. Für immer.`,
                  `🩸 ${customerName} hat ihn angerempelt. Großer. Fehler.`,
                  `🪓 ${customerName} hat ihn Psycho genannt. War sein letztes Wort.`,
                  `⚡ ${customerName} wollte wegrennen. Ist nicht weit gekommen.`,
                  `🔥 ${customerName} hat die Ware angezweifelt. Liegt jetzt im Container.`,
                  `💣 ${customerName} hat mit Polizei gedroht. Ruft jetzt nie mehr an.`,
                  `🗡️ ${customerName} hat seinen Namen falsch ausgesprochen. Tödlicher Fehler.`,
                ] : [
                  `☠️ ${customerName} wollte nicht zahlen... Problem gelöst.`,
                  `🔪 ${customerName} hat gedroht zu verpetzen. Schweigt jetzt für immer.`,
                  `💀 ${customerName} war ein Undercover-Cop. War.`,
                  `⚰️ ${customerName} hatte 50 Cent zu wenig dabei. Inakzeptabel.`,
                  `🪦 ${customerName} hat die Ware beleidigt. Ruhe in Frieden.`,
                  `😵 ${customerName} wollte Mengenrabatt. Hat jetzt ewigen Rabatt.`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'kill',
                  message: killMessages[Math.floor(Math.random() * killMessages.length)],
                  customerName,
                  dealerId,
                });
              }
              // VIOLENCE - Psycho only
              else if (isPsycho && roll < (threshold += violenceChance)) {
                const violenceAmount = Math.floor(100 + Math.random() * 400);
                budcoins += violenceAmount;
                totalCoinsEarned += violenceAmount;
                
                const violenceMessages = [
                  `👊 ${customerName} zusammengeschlagen. +${violenceAmount}$ "Lehrgeld"`,
                  `🦷 ${customerName} hat ein paar Zähne weniger. +${violenceAmount}$ Schmerzensgeld`,
                  `🩸 ${customerName} blutet. Aber hat gezahlt. +${violenceAmount}$`,
                  `💢 ${customerName} wollte frech werden. Liegt jetzt flach. +${violenceAmount}$`,
                  `🤕 ${customerName} in die Fresse. Brieftasche mitgenommen. +${violenceAmount}$`,
                  `😈 ${customerName} hat gezittert. Richtig so. +${violenceAmount}$`,
                  `🔨 ${customerName} "überzeugt" zu zahlen. Mit Nachdruck. +${violenceAmount}$`,
                  `💪 ${customerName} wollte abhauen. Wurde eingeholt. +${violenceAmount}$`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'violence',
                  message: violenceMessages[Math.floor(Math.random() * violenceMessages.length)],
                  revenue: violenceAmount,
                  customerName,
                  dealerId,
                });
              }
              // ROBBERY - Psycho only
              else if (isPsycho && roll < (threshold += robberyChance)) {
                const robberyAmount = Math.floor(200 + Math.random() * 600);
                budcoins += robberyAmount;
                totalCoinsEarned += robberyAmount;
                
                const robberyMessages = [
                  `🔫 ${customerName} ausgeraubt. Handy, Kohle, Jacke. +${robberyAmount}$`,
                  `💰 ${customerName} in die Ecke gedrängt. Alles mitgenommen. +${robberyAmount}$`,
                  `🎭 ${customerName} überfallen. "Gib alles her, Bastard!" +${robberyAmount}$`,
                  `🚨 ${customerName} am Geldautomat abgefangen. +${robberyAmount}$`,
                  `🔪 ${customerName} hat "freiwillig" alles gegeben. +${robberyAmount}$`,
                  `😱 ${customerName} hat vor Angst die Hosen voll. Und kein Geld mehr. +${robberyAmount}$`,
                  `🏃 ${customerName} verfolgt und ausgenommen. +${robberyAmount}$`,
                  `💎 ${customerName} seine Kette gerissen. Verkauft für +${robberyAmount}$`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'robbery',
                  message: robberyMessages[Math.floor(Math.random() * robberyMessages.length)],
                  revenue: robberyAmount,
                  customerName,
                  dealerId,
                });
              }
              // DRUG CONSUMPTION
              else if (roll < (threshold += drugChance)) {
                const drugEffects: { effect: Omit<DealerDrugEffect, 'dealerId'>; messages: string[] }[] = isPsycho ? [
                  {
                    effect: { type: 'hyper', name: '💉 Vollgepumpt', salesMultiplier: 2.0, scamChanceBonus: 20, expiresAt: Date.now() + 60000 },
                    messages: [
                      `💉 Hat sich was reingejagt. Augen weit. Verkauft wie ein Irrer. (+100% Verkäufe)`,
                      `❄️ Dicke Line gezogen. Rennt durch die Stadt. (+100% Verkäufe, +20% Scam)`,
                      `⚡ Auf irgendwas. Zittert, aber macht Kohle. (+100% Verkäufe)`,
                      `🔥 Hat was geschluckt. Weiß selbst nicht was. Läuft aber. (+100% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'wasted', name: '💀 Total drauf', salesMultiplier: 0.2, scamChanceBonus: 30, expiresAt: Date.now() + 120000 },
                    messages: [
                      `💀 Zu viel von allem. Sitzt im Hausflur und sabbert. (-80% Verkäufe)`,
                      `☠️ Hat alles gemischt. Kann kaum stehen. (-80% Verkäufe, +30% Scam)`,
                      `🧟 Sieht aus wie ne Leiche. Ist aber noch da. Irgendwie. (-80% Verkäufe)`,
                      `🚑 Fast abgekratzt. Verkauft trotzdem weiter. (-80% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'paranoid', name: '🔪 Aggressiv-Paranoid', salesMultiplier: 0.6, scamChanceBonus: 40, expiresAt: Date.now() + 90000 },
                    messages: [
                      `🔪 Paranoid aber gefährlich. Zieht bei jedem das Messer. (-40%, +40% Scam)`,
                      `😤 Auf Krawall gebürstet. Jeder ist Feind. (-40% Verkäufe)`,
                      `👁️ Traut niemandem. Bedroht jeden Kunden erstmal. (-40%, +40% Scam)`,
                      `🗡️ "WER BIST DU?!" Schreit jeden an. (-40% Verkäufe)`,
                    ]
                  },
                ] : [
                  {
                    effect: { type: 'high', name: '🌿 Breit', salesMultiplier: 0.7, scamChanceBonus: 0, expiresAt: Date.now() + 60000 },
                    messages: [
                      `🚬 *zieht am fetten Joint* "Qualitätskontrolle..." (-30% Verkäufe)`,
                      `💨 Hat 3 Bongs geraucht. Kann sich nicht konzentrieren. (-30% Verkäufe)`,
                      `🌿 "Nur ein kleiner Probezug..." *vergisst was er wollte* (-30% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'hyper', name: '❄️ Aufgeputscht', salesMultiplier: 1.5, scamChanceBonus: 10, expiresAt: Date.now() + 45000 },
                    messages: [
                      `❄️ Hat ne Line gezogen. Redet sehr schnell. (+50% Verkäufe, +10% Scam)`,
                      `💊 Pille eingeworfen. Rennt durch die Stadt. (+50% Verkäufe)`,
                      `⚡ Auf Speed. Hat 47 Leute angesprochen. (+50% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'drunk', name: '🍺 Hackedicht', salesMultiplier: 0.5, scamChanceBonus: 15, expiresAt: Date.now() + 90000 },
                    messages: [
                      `🍺 5 Bier und 3 Kurze. Lallt rum. (-50% Verkäufe, +15% Scam)`,
                      `🥃 Hat ne Flasche Wodka geext. Kann kaum laufen. (-50% Verkäufe)`,
                      `🤮 Kotzt in die Ecke. Verkauft trotzdem weiter. (-50% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'trippy', name: '🍄 Drauf', salesMultiplier: 0.3, scamChanceBonus: 0, expiresAt: Date.now() + 120000 },
                    messages: [
                      `🍄 Hat Pilze gefuttert. Sieht die Wände atmen. (-70% Verkäufe)`,
                      `🧪 LSD-Trip. Spricht mit Bäumen statt Kunden. (-70% Verkäufe)`,
                      `😵‍💫 Hat DMT geraucht. Andere Dimension. (-70% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'wasted', name: '💀 Abgestürzt', salesMultiplier: 0.1, scamChanceBonus: 0, expiresAt: Date.now() + 180000 },
                    messages: [
                      `💀 Hat alles gemischt. Liegt im Gebüsch. (-90% Verkäufe für 3min)`,
                      `😵 Komplett abgestürzt. Pennt im Hauseingang. (-90% Verkäufe)`,
                    ]
                  },
                ];
                
                const selectedDrug = drugEffects[Math.floor(Math.random() * drugEffects.length)];
                dealerDrugEffects[dealerId] = { ...selectedDrug.effect, dealerId };
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'drugs',
                  message: selectedDrug.messages[Math.floor(Math.random() * selectedDrug.messages.length)],
                  dealerId,
                });

                return {
                  ...state,
                  dealerDrugEffects,
                  dealerActivities: dealerActivities.slice(0, 30),
                };
              }
              // SCAM
              else if (roll < (threshold += scamChance + scamBonus)) {
                const scamAmount = Math.floor((isPsycho ? 100 : 50) + Math.random() * (isPsycho ? 350 : 200));
                budcoins += scamAmount;
                totalCoinsEarned += scamAmount;
                
                const scamMessages = isPsycho ? [
                  `💰 ${customerName} eingeschüchtert. Kohle ohne Ware. +${scamAmount}$`,
                  `😈 ${customerName} hat nur Steine bekommen. +${scamAmount}$`,
                  `🧊 ${customerName} hat Kreide als Koks gekauft. +${scamAmount}$`,
                  `📦 ${customerName} eine leere Tüte verkauft. +${scamAmount}$`,
                  `🔪 "Geld her oder Messer rein." ${customerName} hat gezahlt. +${scamAmount}$`,
                ] : [
                  `💰 ${customerName} abgezogen! +${scamAmount}$ (kein Verlust)`,
                  `🎭 ${customerName} wollte auf Pump. Trotzdem kassiert: +${scamAmount}$`,
                  `😈 Fake-Deal mit ${customerName}! +${scamAmount}$ ohne Ware`,
                  `🧊 ${customerName} Badesalz als Crystal verkauft. +${scamAmount}$`,
                  `🌿 ${customerName} Oregano als Haze angedreht. +${scamAmount}$`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'scam',
                  message: scamMessages[Math.floor(Math.random() * scamMessages.length)],
                  revenue: scamAmount,
                  customerName,
                  dealerId,
                });
              }
              // RANDOM EVENTS
              else if (roll < (threshold += randomChance)) {
                const absurdMessages = isPsycho ? [
                  `🚔 Polizeikontrolle. Hat den Cop bedroht. Der ist weggerannt.`,
                  `🔥 Hat nen Mülleimer angezündet. Weil ihm langweilig war.`,
                  `🐕 Ein Hund hat ihn angebellt. Hat den Besitzer verprügelt.`,
                  `🚗 Hat nen AMG geklaut. Für 10 Minuten. "Nur kurz Spritztour."`,
                  `🏪 Späti überfallen. Nur Zigaretten mitgenommen.`,
                  `🎰 Hat am Automaten 800€ gewonnen. Mit Drohung.`,
                  `👊 Prügelei mit 3 Typen. Hat gewonnen.`,
                  `🔪 Hat jemandem das Handy "geliehen". Für immer.`,
                  `🚨 Flucht vor der Polizei. Durch 3 Hinterhöfe. Hat funktioniert.`,
                  `🏚️ Übernachtet in leerstehendem Haus. Ist jetzt seins.`,
                ] : [
                  `👮 Von Polizei angehalten. Hat sie bestochen. Mit Gras.`,
                  `🏃 Wurde von ner Oma verfolgt. Sie war schneller.`,
                  `🐕 Hund hat 5g gefressen. Teuerster Snack seines Lebens.`,
                  `🦝 Waschbär hat die Stash geklaut. Wurde verfolgt. Waschbär hat gewonnen.`,
                  `🏠 Auf falscher Beerdigung gelandet. Hat trotzdem verkauft.`,
                  `💒 Vor ner Kirche gedealt. Pfarrer ist Stammkunde.`,
                  `🚂 Im Zug kontrolliert. Ticket gefunden. Stash nicht.`,
                  `🎤 Hat ausversehen Karaoke gewonnen.`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'random',
                  message: absurdMessages[Math.floor(Math.random() * absurdMessages.length)],
                  dealerId,
                });
              }
              // MEETING (no sale)
              else if (roll < (threshold += meetingChance)) {
                const meetingMessages = isPsycho ? [
                  `🤝 ${customerName} getroffen. "Hast du mein Geld?" - Hat er nicht.`,
                  `😤 ${customerName} wollte reden. "Halt die Fresse." - Gespräch beendet.`,
                  `📱 ${customerName} ruft an. Geht nicht ran. Nie.`,
                  `💀 ${customerName} hat gewunken. Wurde ignoriert.`,
                ] : [
                  `🤝 Mit ${customerName} getroffen. Kein Deal, nur Gelaber.`,
                  `☕ Döner mit ${customerName}. Nur Quatschen, kein Business.`,
                  `📱 ${customerName} hat angerufen. Will später kommen. Kommt nie.`,
                  `⏳ ${customerName} hat kein Geld dabei. "Nächste Woche, Bruder."`,
                  `🗣️ ${customerName} wollte nur reden. 2 Stunden. Über seine Ex.`,
                  `💸 ${customerName} schuldet noch von letzter Woche.`,
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'meeting',
                  message: meetingMessages[Math.floor(Math.random() * meetingMessages.length)],
                  customerName,
                  dealerId,
                });
              }
              // Normal sale
              else {
                const availableChannels = state.salesChannels
                  .filter(ch => ch.unlocked && bud.quality >= ch.minQuality)
                  .sort((a, b) => b.pricePerGram - a.pricePerGram);

                if (availableChannels.length > 0) {
                  const channel = availableChannels[0];
                  
                  // Psycho sells faster (more grams per sale)
                  const baseGrams = isPsycho ? 5 : 2;
                  const maxGrams = isPsycho ? 15 : 8;
                  const maxSaleGrams = Math.min(bud.grams, Math.floor(baseGrams + Math.random() * maxGrams));
                  const gramsToSell = Math.min(maxSaleGrams, channel.maxGramsPerSale);
                  const qualityMultiplier = 1 + (bud.quality - 50) / 100;
                  // Psycho gets slightly better prices (intimidation)
                  const psychoBonus = isPsycho ? 1.2 : 1;
                  const baseRevenue = gramsToSell * channel.pricePerGram * qualityMultiplier * psychoBonus;
                  const revenue = Math.floor(baseRevenue * salesMult);

                  budcoins += revenue;
                  totalCoinsEarned += revenue;
                  totalGramsSold += gramsToSell;
                  totalSalesRevenue += revenue;

                  if (gramsToSell >= bud.grams) {
                    inventory = inventory.filter(b => b.id !== bud.id);
                  } else {
                    inventory = inventory.map(b => 
                      b.id === bud.id ? { ...b, grams: b.grams - gramsToSell } : b
                    );
                  }

                  const saleMessages = isPsycho ? [
                    `💰 ${gramsToSell}g an ${customerName}. "Zähl nach, ich warte." ${revenue}$`,
                    `😈 ${customerName} hat ${gramsToSell}g gekauft. Hatte keine Wahl. ${revenue}$`,
                    `🔥 ${gramsToSell}g vertickt. ${customerName} hat gezittert. ${revenue}$`,
                    `💵 ${customerName}: ${gramsToSell}g für ${revenue}$. "Und jetzt verpiss dich."`,
                    `🗡️ ${gramsToSell}g an ${customerName}. "Erzähl niemandem." ${revenue}$`,
                    `☠️ Deal mit ${customerName}. ${gramsToSell}g. Der hat Schiss. ${revenue}$`,
                    `💀 ${gramsToSell}g an ${customerName} gedrückt. Kein Widerspruch. ${revenue}$`,
                  ] : [
                    `💵 ${gramsToSell}g an ${customerName} vertickt. ${revenue}$`,
                    `✅ Deal mit ${customerName}: ${gramsToSell}g für ${revenue}$`,
                    `🤑 ${customerName} hat ${gramsToSell}g ${bud.strainName} geholt. ${revenue}$`,
                    `💰 ${gramsToSell}g an ${customerName} = ${revenue}$`,
                    `🔥 ${customerName}: "Geiles Zeug!" ${gramsToSell}g, ${revenue}$`,
                    `👌 ${customerName}: "Endlich gutes Zeug!" ${gramsToSell}g weg. ${revenue}$`,
                  ];

                  dealerActivities.unshift({
                    id: `act-${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    type: 'sale',
                    message: saleMessages[Math.floor(Math.random() * saleMessages.length)],
                    grams: gramsToSell,
                    revenue,
                    customerName,
                    dealerId,
                  });
                }
              }
              
              // Keep only last 30 activities (shared between dealers)
              if (dealerActivities.length > 30) {
                dealerActivities = dealerActivities.slice(0, 30);
              }
            } else {
              const bulkTarget = Math.floor((isPsycho ? 10 : 6) + Math.random() * (isPsycho ? 30 : 18));
              const warehouseSale = useBusinessStore.getState().sellWarehouseStock('weed', bulkTarget);

              if (warehouseSale.gramsSold > 0) {
                const quality = warehouseSale.averageQuality || 50;
                const availableChannels = state.salesChannels
                  .filter(ch => ch.unlocked && quality >= ch.minQuality)
                  .sort((a, b) => b.pricePerGram - a.pricePerGram);

                if (availableChannels.length > 0) {
                  const channel = availableChannels[0];
                  const qualityMultiplier = 1 + (quality - 50) / 100;
                  const psychoBonus = isPsycho ? 1.15 : 1;
                  const revenue = Math.floor(warehouseSale.gramsSold * channel.pricePerGram * qualityMultiplier * psychoBonus);

                  budcoins += revenue;
                  totalCoinsEarned += revenue;
                  totalGramsSold += warehouseSale.gramsSold;
                  totalSalesRevenue += revenue;

                  dealerActivities.unshift({
                    id: `act-${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    type: 'sale',
                    message: `📦 Import-Weed verkauft: ${warehouseSale.gramsSold}g (${quality}% Q) = ${revenue}$`,
                    grams: warehouseSale.gramsSold,
                    revenue,
                    dealerId,
                  });

                  if (dealerActivities.length > 30) {
                    dealerActivities = dealerActivities.slice(0, 30);
                  }
                }
              } else if (Math.random() < 0.15) {
                const waitMessages = isPsycho ? [
                  '😤 Wartet. Ungeduldig. Sehr ungeduldig.',
                  '🔪 Spielt mit dem Messer. Langweilt sich.',
                  '👊 Boxt gegen die Wand. Frustabbau.',
                  '😈 Starrt Passanten an. Die gehen schneller.',
                  '🚬 Raucht und flucht vor sich hin.',
                  '💀 Plant den nächsten Überfall. Langeweile.',
                  '🔥 Hat einen Mülleimer angezündet. Zum Spaß.',
                  '🗡️ Schnitzt was in eine Parkbank. Drohungen.',
                ] : [
                  '⏳ Wartet auf Ware...',
                  '📱 Scrollt durch TikTok. Schon 3 Stunden.',
                  '🚬 Raucht eine. Und noch eine. Und noch eine.',
                  '😴 Nickerchen auf der Parkbank.',
                  '🍕 Bestellt die 4. Pizza heute.',
                  '📝 Schreibt SMS. Wird nicht geantwortet.',
                  '🐦 Beobachtet Tauben. Die beobachten zurück.',
                ];
                
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'waiting',
                  message: waitMessages[Math.floor(Math.random() * waitMessages.length)],
                  dealerId,
                });
                
                if (dealerActivities.length > 30) {
                  dealerActivities = dealerActivities.slice(0, 30);
                }
              }
            }
          }
        }

        return {
          growSlots,
          seeds,
          inventory,
          dryingRacks,
          budcoins,
          resin,
          essence,
          totalHarvests,
          totalCoinsEarned,
          discoveredSeeds,
          totalGramsSold,
          totalSalesRevenue,
          dealerActivities,
        };
      }),

      buySeed: (seedName: string, cost: number) => {
        const state = get();
        if (state.budcoins < cost) return false;
        
        const catalogSeed = SEED_CATALOG.find(s => s.name === seedName);
        if (!catalogSeed) return false;
        
        const newSeed: Seed = {
          ...catalogSeed,
          id: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        
        set({
          budcoins: state.budcoins - cost,
          seeds: [...state.seeds, newSeed],
        });
        
        return true;
      },

      // Cheat Actions (Dev Panel)
      cheatAddCoins: (amount: number) => set((state) => ({
        budcoins: state.budcoins + amount,
        totalCoinsEarned: state.totalCoinsEarned + amount,
      })),

      cheatAddLevel: () => {
        const state = get();
        const xpNeeded = getXpForLevel(state.level);
        set({
          xp: state.xp + xpNeeded,
          level: state.level + 1,
          skillPoints: state.skillPoints + 1,
        });
      },

      cheatSetLevel: (targetLevel: number) => {
        const state = get();
        let totalXp = 0;
        for (let i = 1; i < targetLevel; i++) {
          totalXp += getXpForLevel(i);
        }
        set({
          xp: totalXp,
          level: targetLevel,
          skillPoints: state.skillPoints + (targetLevel - state.level),
        });
      },

      cheatAddSeeds: (count: number) => set((state) => {
        const newSeeds = SEED_CATALOG.slice(0, count).map((s, i) => ({
          ...s,
          id: `cheat-seed-${Date.now()}-${i}`,
        }));
        return { seeds: [...state.seeds, ...newSeeds] };
      }),

      cheatUnlockAllSlots: () => set((state) => ({
        growSlots: state.growSlots.map(slot => ({ ...slot, isUnlocked: true })),
      })),

      cheatUnlockAllWorkers: () => set((state) => ({
        workers: state.workers.map(w => ({ ...w, owned: true })),
      })),

      // Achievement Actions
      claimAchievement: (achievementId: string, reward: { coins?: number; gems?: number; seeds?: number }) => {
        const state = get();
        if (state.claimedAchievements.includes(achievementId)) return false;
        
        set({
          claimedAchievements: [...state.claimedAchievements, achievementId],
          budcoins: state.budcoins + (reward.coins || 0),
          gems: state.gems + (reward.gems || 0),
        });
        return true;
      },

      incrementBreedings: () => set((state) => ({
        totalBreedings: state.totalBreedings + 1,
      })),
    }),
    {
      name: 'grow-lab-save',
      version: 8, // Increment to trigger migration
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Add drying upgrades if they don't exist
          const dryingUpgrades = [
            { id: 'drying-speed', name: 'Turbo-Lüfter', description: '+15% Trocknungsgeschwindigkeit', category: 'drying', baseCost: 200, costScaling: 1.6, level: 0, maxLevel: 20, effect: 'dryingSpeed', effectValue: 0.15 },
            { id: 'quality-cure', name: 'Qualitäts-Curing', description: '+5% Qualität beim Trocknen', category: 'drying', baseCost: 350, costScaling: 1.7, level: 0, maxLevel: 15, effect: 'dryingQuality', effectValue: 5 },
            { id: 'humidity-control', name: 'Feuchtigkeitskontrolle', description: '+3% Qualität & +8% Speed', category: 'drying', baseCost: 500, costScaling: 1.8, level: 0, maxLevel: 10, effect: 'humidityControl', effectValue: 1 },
            { id: 'uv-treatment', name: 'UV-Behandlung', description: 'Chance auf Rarität-Upgrade', category: 'drying', baseCost: 1000, costScaling: 2.0, level: 0, maxLevel: 5, effect: 'rarityUpgrade', effectValue: 0.05 },
          ];
          
          const existingUpgrades = persistedState.upgrades || [];
          const existingIds = existingUpgrades.map((u: any) => u.id);
          const newUpgrades = dryingUpgrades.filter(u => !existingIds.includes(u.id));
          
          persistedState.upgrades = [...existingUpgrades, ...newUpgrades];
          
          // Add more drying racks if needed
          if (persistedState.dryingRacks && persistedState.dryingRacks.length < 8) {
            const currentCount = persistedState.dryingRacks.length;
            for (let i = currentCount; i < 8; i++) {
              persistedState.dryingRacks.push({ id: i, bud: null, isUnlocked: false });
            }
          }
        }
        
        if (version < 3) {
          // Add totalGramsHarvested if it doesn't exist
          if (persistedState.totalGramsHarvested === undefined) {
            persistedState.totalGramsHarvested = 0;
          }
        }
        
        if (version < 4) {
          // Expand grow slots to 16 and update grow-slot upgrade maxLevel
          if (persistedState.growSlots && persistedState.growSlots.length < 16) {
            const currentCount = persistedState.growSlots.length;
            for (let i = currentCount; i < 16; i++) {
              persistedState.growSlots.push({ id: i, plantId: null, seed: null, stage: 'seed', progress: 0, isUnlocked: false });
            }
          }
          
          // Update grow-slot upgrade maxLevel
          if (persistedState.upgrades) {
            persistedState.upgrades = persistedState.upgrades.map((u: any) => 
              u.id === 'grow-slot' ? { ...u, maxLevel: 15, costScaling: 2.5 } : u
            );
          }
        }
        
        if (version < 5) {
          // Add the new Psycho dealer if not present
          const streetPsycho = { 
            id: 'street-psycho', 
            name: 'Der Psycho', 
            description: 'Aggressiver Straßendealer. Schneller, brutaler, unberechenbar. Mehr Kohle, mehr Chaos.', 
            icon: '🔪', 
            cost: 75000, 
            owned: false,
            paused: false,
            level: 1, 
            maxLevel: 10,
            slotsManaged: 8,
            abilities: ['sell']
          };
          
          if (persistedState.workers) {
            const hasStreetPsycho = persistedState.workers.some((w: any) => w.id === 'street-psycho');
            if (!hasStreetPsycho) {
              persistedState.workers.push(streetPsycho);
            }
          }
          
          // Convert dealerDrugEffect to dealerDrugEffects
          if (persistedState.dealerDrugEffect !== undefined) {
            persistedState.dealerDrugEffects = {};
            if (persistedState.dealerDrugEffect) {
              persistedState.dealerDrugEffects['sales-dealer'] = {
                ...persistedState.dealerDrugEffect,
                dealerId: 'sales-dealer'
              };
            }
            delete persistedState.dealerDrugEffect;
          } else if (!persistedState.dealerDrugEffects) {
            persistedState.dealerDrugEffects = {};
          }
          
          // Add dealerId to existing dealer activities
          if (persistedState.dealerActivities) {
            persistedState.dealerActivities = persistedState.dealerActivities.map((a: any) => ({
              ...a,
              dealerId: a.dealerId || 'sales-dealer'
            }));
          }
        }

        if (version < 6) {
          if (!Array.isArray(persistedState.discoveredHybridSeeds)) {
            const hybridSeeds = Array.isArray(persistedState.seeds)
              ? persistedState.seeds.filter((seed: any) => seed?.isHybrid)
              : [];
            const uniqueHybridSeeds = Array.from(
              new Map(hybridSeeds.map((seed: any) => [seed.name, seed])).values()
            );
            persistedState.discoveredHybridSeeds = uniqueHybridSeeds;
          }
        }

        if (version < 7) {
          if (typeof persistedState.gameTimeMinutes !== 'number') {
            persistedState.gameTimeMinutes = 360;
          }
        }

        if (version < 8) {
          if (typeof persistedState.gameTimeMinutes !== 'number') {
            persistedState.gameTimeMinutes = 360;
          }
          if (persistedState.advanceGameTime !== undefined) {
            delete persistedState.advanceGameTime;
          }
        }
        
        return persistedState;
      },
    }
  )
);
