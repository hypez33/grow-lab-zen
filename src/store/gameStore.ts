import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useBusinessStore } from '@/store/businessStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { getFeaturesUnlockedAt } from '@/lib/progression';

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

// Fertilizer types for growing
export interface Fertilizer {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  cost: number;
  growthBoost: number; // 0.1 = +10% growth speed
  yieldBoost: number; // 0.1 = +10% yield
  qualityBoost: number; // 0-15 quality points
  duration: number; // uses left (0 = infinite for permanent ones)
}

// Soil types for growing
export interface Soil {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  cost: number;
  growthBoost: number;
  yieldBoost: number;
  qualityBoost: number;
  traitBoostChance: number; // 0.1 = +10% chance for trait bonus
  waterRetention: number; // affects how often you need to tend (passive growth multiplier)
}

export interface GrowSlot {
  id: number;
  plantId: string | null;
  seed: Seed | null;
  stage: PlantStage;
  progress: number;
  isUnlocked: boolean;
  fertilizer: Fertilizer | null;
  soil: Soil | null;
  fertilizerUsesLeft: number;
  waterLevel: number; // 0-100, decreases over time
  lastWatered: number; // timestamp
  budGrowth: number; // 0-100, grows exponentially during flower stage, affects final yield
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
  costKoksGrams?: number;
  owned: boolean;
  paused: boolean; // Is worker on vacation/paused
  level: number;
  maxLevel: number;
  slotsManaged: number; // How many slots this worker manages
  abilities: ('plant' | 'tap' | 'harvest' | 'dry' | 'sell' | 'water')[];
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

export interface SalesWindowEntry {
  timestamp: number;
  revenue: number;
}

export interface AutoSellSettings {
  enabled: boolean;
  minQuality: number; // 0-100
  preferredChannel: string | 'auto';
  onlyWhenFull: boolean;
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
  
  // Growing Supplies
  fertilizerInventory: { fertilizer: Fertilizer; quantity: number }[];
  soilInventory: { soil: Soil; quantity: number }[];
  
  // Dealer Activity Log & Effects
  dealerActivities: DealerActivity[];
  dealerDrugEffects: Record<string, DealerDrugEffect | null>; // per dealer drug effects

  // Sales Tracking
  weedSalesWindow: SalesWindowEntry[];
  lastWeedSalesMinute: number;
  autoSellSettings: AutoSellSettings;
  lastAutoSellAt: number;
  
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

  // Blow Drying Stats
  blowStats: {
    totalBlowTime: number; // Total seconds spent blowing
    longestBlowSession: number; // Longest single session in seconds
    totalGramsDriedByBlowing: number; // Grams dried through blowing
    currentSessionTime: number; // Current session time (resets when stopping)
  };

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
  setAutoSellSettings: (settings: Partial<AutoSellSettings>) => void;
  runAutoSellTick: () => void;
  
  // Worker Actions
  buyWorker: (workerId: string) => boolean;
  upgradeWorker: (workerId: string) => boolean;
  toggleWorkerPause: (workerId: string) => void;
  runWorkerTick: () => void;
  
  // Seed Shop
  buySeed: (seedName: string, cost: number) => boolean;
  
  // Growing Supplies Actions
  buyFertilizer: (fertilizerId: string) => boolean;
  buySoil: (soilId: string) => boolean;
  applyFertilizer: (slotId: number, fertilizerId: string) => boolean;
  applySoil: (slotId: number, soilId: string) => boolean;
  waterPlant: (slotId: number) => boolean;
  waterAllPlants: () => number;
  
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
  
  // Blow Stats Actions
  updateBlowStats: (blowTime: number, gramsDried: number) => void;
  endBlowSession: () => void;
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

const SALES_WINDOW_MS = 60 * 60 * 1000;

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
    id: 'dealer-giulio', 
    name: 'Giulio',
    description: 'Spielsüchtiger, drogensüchtiger Dealer. Zockt ständig, verkauft trotzdem weiter.', 
    icon: '🎰', 
    cost: 35000,
    costKoksGrams: 10,
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 6,
    slotsManaged: 6, // buds per tick
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
  { 
    id: 'auto-waterer', 
    name: 'Bewässerungs-Bot', 
    description: 'Automatisches Bewässerungssystem. Gießt alle Pflanzen unter 50% Wasser.', 
    icon: '💧', 
    cost: 15000, 
    owned: false,
    paused: false,
    level: 1, 
    maxLevel: 5,
    slotsManaged: 16, // all slots
    abilities: ['water']
  },
];

// Initial fertilizers available in the game
export const FERTILIZER_CATALOG: Fertilizer[] = [
  { id: 'basic-fert', name: 'Basis-Dünger', description: 'Einfacher Dünger für leichten Wachstums-Boost', icon: '🌱', rarity: 'common', cost: 50, growthBoost: 0.1, yieldBoost: 0.05, qualityBoost: 2, duration: 3 },
  { id: 'growth-boost', name: 'Turbo-Grow', description: 'Beschleunigt das Wachstum deutlich', icon: '⚡', rarity: 'uncommon', cost: 150, growthBoost: 0.25, yieldBoost: 0.1, qualityBoost: 5, duration: 3 },
  { id: 'yield-master', name: 'Ernte-König', description: 'Maximiert den Ertrag jeder Ernte', icon: '🌾', rarity: 'rare', cost: 300, growthBoost: 0.1, yieldBoost: 0.35, qualityBoost: 8, duration: 2 },
  { id: 'crystal-feed', name: 'Kristall-Nahrung', description: 'Premium Nährstoffe für Top-Qualität', icon: '💎', rarity: 'epic', cost: 600, growthBoost: 0.2, yieldBoost: 0.25, qualityBoost: 15, duration: 2 },
  { id: 'cosmic-boost', name: 'Kosmischer Boost', description: 'Außerirdische Nährstoffe für legendäre Ernten', icon: '🌌', rarity: 'legendary', cost: 1500, growthBoost: 0.4, yieldBoost: 0.5, qualityBoost: 25, duration: 1 },
];

// Initial soil types available
export const SOIL_CATALOG: Soil[] = [
  { id: 'basic-soil', name: 'Standard-Erde', description: 'Normale Blumenerde ohne Extras', icon: '🟤', rarity: 'common', cost: 0, growthBoost: 0, yieldBoost: 0, qualityBoost: 0, traitBoostChance: 0, waterRetention: 1 },
  { id: 'premium-soil', name: 'Premium-Erde', description: 'Nährstoffreiche Erde für besseres Wachstum', icon: '🌍', rarity: 'uncommon', cost: 100, growthBoost: 0.15, yieldBoost: 0.1, qualityBoost: 5, traitBoostChance: 0.05, waterRetention: 1.1 },
  { id: 'coco-mix', name: 'Kokos-Mix', description: 'Perfekte Drainage und Belüftung', icon: '🥥', rarity: 'uncommon', cost: 150, growthBoost: 0.2, yieldBoost: 0.05, qualityBoost: 3, traitBoostChance: 0.08, waterRetention: 1.25 },
  { id: 'living-soil', name: 'Living Soil', description: 'Lebendige Erde mit Mikroorganismen', icon: '🦠', rarity: 'rare', cost: 350, growthBoost: 0.15, yieldBoost: 0.25, qualityBoost: 10, traitBoostChance: 0.15, waterRetention: 1.3 },
  { id: 'super-soil', name: 'Super Soil', description: 'Vollständig aufgeladene organische Erde', icon: '⭐', rarity: 'epic', cost: 700, growthBoost: 0.25, yieldBoost: 0.35, qualityBoost: 15, traitBoostChance: 0.2, waterRetention: 1.5 },
  { id: 'alien-substrate', name: 'Alien-Substrat', description: 'Mysteriöse außerirdische Erde', icon: '👽', rarity: 'legendary', cost: 2000, growthBoost: 0.5, yieldBoost: 0.6, qualityBoost: 25, traitBoostChance: 0.35, waterRetention: 2 },
];

// Initial grow slots (16 total, first unlocked)
const initialGrowSlots: GrowSlot[] = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  plantId: null,
  seed: i === 0 ? initialSeeds[0] : null,
  stage: 'seed' as PlantStage,
  progress: 0,
  isUnlocked: i === 0,
  fertilizer: null,
  soil: SOIL_CATALOG[0], // Default to basic soil
  fertilizerUsesLeft: 0,
  waterLevel: 100, // Start fully watered
  lastWatered: Date.now(),
  budGrowth: 0, // Buds start growing in flower stage
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

const getTerritorySalesMultiplier = (drug: 'weed') => {
  const bonuses = useTerritoryStore.getState().getActiveBonuses();
  const totalBonus = bonuses
    .filter(bonus => bonus.type === 'sales-multiplier' && (bonus.drug === drug || bonus.drug === 'all'))
    .reduce((sum, bonus) => sum + bonus.value, 0);
  return 1 + totalBonus / 100;
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
      
      // Growing Supplies - start with some basic fertilizer and soil
      fertilizerInventory: [
        { fertilizer: FERTILIZER_CATALOG[0], quantity: 3 }, // 3x Basic Fertilizer
      ],
      soilInventory: [
        { soil: SOIL_CATALOG[0], quantity: 99 }, // Unlimited basic soil
        { soil: SOIL_CATALOG[1], quantity: 2 }, // 2x Premium Soil
      ],
      
      // Dealer Activity Log & Effects
      dealerActivities: [] as DealerActivity[],
      dealerDrugEffects: {} as Record<string, DealerDrugEffect | null>,

      // Sales Tracking
      weedSalesWindow: [] as SalesWindowEntry[],
      lastWeedSalesMinute: 0,
      autoSellSettings: {
        enabled: false,
        minQuality: 60,
        preferredChannel: 'auto',
        onlyWhenFull: false,
      },
      lastAutoSellAt: 0,
      
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

      // Blow Drying Stats
      blowStats: {
        totalBlowTime: 0,
        longestBlowSession: 0,
        totalGramsDriedByBlowing: 0,
        currentSessionTime: 0,
      },

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
            // Apply fertilizer and soil bonuses
            const fertilizerGrowthBoost = slot.fertilizer?.growthBoost ?? 0;
            const soilGrowthBoost = slot.soil?.growthBoost ?? 0;
            const totalGrowthMult = (1 + growthBonus * 0.1) * (1 + fertilizerGrowthBoost) * (1 + soilGrowthBoost);
            const progressGain = tapValue * totalGrowthMult * (slot.seed.growthSpeed ?? 1);
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
            // Apply fertilizer and soil bonuses
            const fertilizerGrowthBoost = slot.fertilizer?.growthBoost ?? 0;
            const soilGrowthBoost = slot.soil?.growthBoost ?? 0;
            const totalGrowthMult = (1 + growthBonus * 0.1) * (1 + fertilizerGrowthBoost) * (1 + soilGrowthBoost);
            const progressGain = tapValueTotal * totalGrowthMult * (slot.seed.growthSpeed ?? 1);
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
            ? { ...slot, seed, plantId: `plant-${Date.now()}`, stage: 'seed' as PlantStage, progress: 0, budGrowth: 0 }
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
        
        // Fertilizer and Soil bonuses
        const fertilizerYieldBoost = slot.fertilizer?.yieldBoost ?? 0;
        const fertilizerQualityBoost = slot.fertilizer?.qualityBoost ?? 0;
        const soilYieldBoost = slot.soil?.yieldBoost ?? 0;
        const soilQualityBoost = slot.soil?.qualityBoost ?? 0;
        const soilTraitBoostChance = slot.soil?.traitBoostChance ?? 0;
        
        // Total yield multiplier from fertilizer/soil
        const supplyYieldMult = (1 + fertilizerYieldBoost) * (1 + soilYieldBoost);
        
        // Collection bonus multipliers
        const epicResourceMult = hasEpicBonus ? 1.25 : 1;
        const masterMult = hasMasterBonus ? 2 : 1;
        const uncommonCoinMult = hasUncommonBonus ? 1.15 : 1;
        
        // Crit calculation with CritMaster trait
        let critChance = (state.upgrades.find(u => u.id === 'ventilation')?.level ?? 0) * 0.02;
        if (hasTrait('CritMaster')) critChance += 0.15;
        const isCrit = Math.random() < critChance;
        
        // Bountiful trait: +30% all yields (boosted by soil trait chance)
        const bountifulActive = hasTrait('Bountiful') || (soilTraitBoostChance > 0 && Math.random() < soilTraitBoostChance);
        const bountifulMult = bountifulActive ? 1.3 : 1;
        
        // GoldRush trait: +50% coins
        const goldRushMult = hasTrait('GoldRush') ? 1.5 : 1;
        
        // DoubleHarvest trait: 25% chance for 2x everything
        const doubleHarvest = hasTrait('DoubleHarvest') && Math.random() < 0.25;
        const harvestMult = doubleHarvest ? 2 : 1;
        
        // Calculate coin gain (with collection bonuses + supply bonuses)
        let coinGain = Math.floor(baseYield * (1 + harvestBonus * 0.1) * (isCrit ? 2 : 1) * goldRushMult * bountifulMult * harvestMult * uncommonCoinMult * epicResourceMult * masterMult * supplyYieldMult);
        
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
          // Note: daily-3 ("Earn BudCoins") now progresses via sales, not harvests.
          return q;
        });

        // Reset slot - Resilient trait: 20% chance to auto-replant
        // Also handle fertilizer uses
        const resilientReplant = hasTrait('Resilient') && Math.random() < 0.2;
        const growSlots = state.growSlots.map(s => {
          if (s.id !== slotId) return s;
          
          // Reduce fertilizer uses
          let newFertilizer = s.fertilizer;
          let newFertUsesLeft = s.fertilizerUsesLeft;
          if (s.fertilizer && s.fertilizerUsesLeft > 0) {
            newFertUsesLeft = s.fertilizerUsesLeft - 1;
            if (newFertUsesLeft <= 0) {
              newFertilizer = null;
            }
          }
          
          if (resilientReplant) {
            return { ...s, plantId: `plant-${Date.now()}`, stage: 'seed' as PlantStage, progress: 0, budGrowth: 0, fertilizer: newFertilizer, fertilizerUsesLeft: newFertUsesLeft };
          } else {
            return { ...s, seed: null, plantId: null, stage: 'seed' as PlantStage, progress: 0, budGrowth: 0, fertilizer: newFertilizer, fertilizerUsesLeft: newFertUsesLeft };
          }
        });

        // Add XP (bonus for double harvest + legendary collection bonus)
        const baseXp = 10 + (slot.seed.rarity === 'legendary' ? 50 : slot.seed.rarity === 'epic' ? 30 : slot.seed.rarity === 'rare' ? 20 : slot.seed.rarity === 'uncommon' ? 10 : 0);
        const legendaryXpMult = hasLegendaryBonus ? 1.5 : 1;
        const xpGain = Math.floor(baseXp * harvestMult * legendaryXpMult * masterMult);

        // Discover the seed if not already discovered
        const seedName = slot.seed.name;
        const newDiscoveredSeeds = state.discoveredSeeds.includes(seedName) 
          ? state.discoveredSeeds 
          : [...state.discoveredSeeds, seedName];

        // Create wet buds for inventory (grams based on baseYield with RNG variance + supply bonuses + bud growth)
        // budGrowth multiplier: 0% = 20% yield, 50% = 60% yield, 100% = 100% yield (exponential curve)
        const budGrowthPercent = slot.budGrowth ?? 100; // Default to 100 for old saves
        const budGrowthMult = 0.2 + (budGrowthPercent / 100) * 0.8; // 20% base + up to 80% from growth
        
        // RNG yield: baseYield * random multiplier between 0.8 and 1.2 (proportional to plant tier)
        // This ensures all tiers scale properly - legendary gets 160-240g, common gets 8-12g etc.
        const seedBaseYield = slot.seed.baseYield;
        const yieldVariance = 0.8 + Math.random() * 0.4; // 0.8 to 1.2 (±20% variance)
        const randomBaseYield = seedBaseYield * yieldVariance;
        
        const gramsHarvested = Math.floor(randomBaseYield * bountifulMult * harvestMult * supplyYieldMult * budGrowthMult * (1 + harvestBonus * 0.05));
        const quality = Math.min(100, Math.floor(50 + Math.random() * 30 + (isCrit ? 20 : 0) + (hasTrait('Bountiful') ? 10 : 0) + fertilizerQualityBoost + soilQualityBoost + (budGrowthPercent / 10))); // Higher bud growth = better quality
        
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

        // Auto-progress all plants passively + handle water depletion + bud growth
        let growSlots = state.growSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            // Water depletion: -1% per tick (about 100 seconds to empty)
            // Soil waterRetention slows water loss
            const waterRetention = slot.soil?.waterRetention ?? 1;
            const waterLoss = delta * (1 / waterRetention);
            const newWaterLevel = Math.max(0, slot.waterLevel - waterLoss);
            
            // Growth is reduced based on water level
            // 100% water = 100% growth, 50% water = 75% growth, 0% water = 25% growth
            const waterGrowthMult = 0.25 + (newWaterLevel / 100) * 0.75;
            
            // Apply trait bonuses: Turbo (+30%), SpeedBoost (+50%)
            const traits = slot.seed.traits;
            const turboMult = traits.includes('Turbo') ? 1.3 : 1;
            const speedBoostMult = traits.includes('SpeedBoost') ? 1.5 : 1;
            
            // Fertilizer and soil growth boosts
            const fertilizerGrowthBoost = slot.fertilizer?.growthBoost ?? 0;
            const soilGrowthBoost = slot.soil?.growthBoost ?? 0;
            
            const progressGain = delta * basePassiveGrowth * (1 + growthBonus * 0.1) * (1 + fertilizerGrowthBoost) * (1 + soilGrowthBoost) * (slot.seed.growthSpeed ?? 1) * collectionGrowthMult * turboMult * speedBoostMult * waterGrowthMult;
            const newProgress = Math.min(100, slot.progress + progressGain);
            const newStage = getStageFromProgress(newProgress);
            
            // Bud growth: starts in flower stage (progress >= 75), grows exponentially
            // budGrowth represents the size/yield potential of the buds (0-100)
            let newBudGrowth = slot.budGrowth ?? 0;
            if (newStage === 'flower' || newStage === 'harvest') {
              // Calculate how far into flower stage we are (0-100%)
              const flowerProgress = newStage === 'harvest' ? 100 : ((newProgress - 75) / 25) * 100;
              
              // Exponential growth curve: starts slow, accelerates towards harvest
              // Formula: budGrowth = (flowerProgress / 100)^1.5 * 100
              // This means at 50% flower progress, buds are only at ~35% size
              // But at 90% flower progress, buds are at ~85% size
              const targetBudGrowth = Math.pow(flowerProgress / 100, 1.5) * 100;
              
              // Smoothly approach target (can only increase, never decrease)
              newBudGrowth = Math.max(newBudGrowth, targetBudGrowth);
              
              // Fertilizer boosts bud growth rate
              const fertilizerBudBoost = 1 + (slot.fertilizer?.yieldBoost ?? 0) * 0.5;
              newBudGrowth = Math.min(100, newBudGrowth * fertilizerBudBoost);
            }
            
            return {
              ...slot,
              progress: newProgress,
              stage: newStage,
              waterLevel: newWaterLevel,
              budGrowth: newBudGrowth,
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
        let bonusBudcoins = 0;
        let bonusGems = 0;
        let bonusPremiumSeeds = 0;
        let levelsGained = 0;

        while (newXp >= getXpForLevel(newLevel)) {
          newXp -= getXpForLevel(newLevel);
          newLevel++;
          newSkillPoints++;
          levelsGained++;

          // Stage-unlock bonuses
          const newlyUnlocked = getFeaturesUnlockedAt(newLevel);
          newlyUnlocked.forEach(f => {
            if (!f.reward) return;
            if (f.reward.budcoins) bonusBudcoins += f.reward.budcoins;
            if (f.reward.gems) bonusGems += f.reward.gems;
            if (f.reward.skillPoints) newSkillPoints += f.reward.skillPoints;
            if (f.reward.premiumSeed) bonusPremiumSeeds += 1;
          });
        }

        if (levelsGained > 0) {
          // Build a premium-seed reward (rare random pick from catalog)
          let extraSeeds = state.seeds;
          if (bonusPremiumSeeds > 0) {
            const pool = SEED_CATALOG.filter(s => s.rarity === 'rare' || s.rarity === 'epic');
            const newSeeds: typeof state.seeds = [];
            for (let i = 0; i < bonusPremiumSeeds; i++) {
              const pick = pool[Math.floor(Math.random() * pool.length)];
              newSeeds.push({ ...pick, id: `bonus-${Date.now()}-${i}` });
            }
            extraSeeds = [...state.seeds, ...newSeeds];
          }

          set({
            xp: newXp,
            level: newLevel,
            skillPoints: newSkillPoints,
            budcoins: state.budcoins + bonusBudcoins,
            gems: state.gems + bonusGems,
            seeds: extraSeeds,
          });
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
          weedSalesWindow: [],
          lastWeedSalesMinute: 0,
          autoSellSettings: {
            enabled: false,
            minQuality: 60,
            preferredChannel: 'auto',
            onlyWhenFull: false,
          },
          lastAutoSellAt: 0,
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
        const territoryMultiplier = getTerritorySalesMultiplier('weed');
        const revenue = Math.floor(grams * channel.pricePerGram * qualityBonus * rarityBonus * territoryMultiplier);
        
        // Update state
        set((state) => {
          const saleTimestamp = now;
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

          const weedSalesWindow = [
            ...state.weedSalesWindow,
            { timestamp: saleTimestamp, revenue },
          ].filter(entry => saleTimestamp - entry.timestamp <= SALES_WINDOW_MS);
          
          return {
            inventory,
            salesChannels,
            budcoins: state.budcoins + revenue,
            totalGramsSold: state.totalGramsSold + grams,
            totalSalesRevenue: state.totalSalesRevenue + revenue,
            totalCoinsEarned: state.totalCoinsEarned + revenue,
            weedSalesWindow,
            lastWeedSalesMinute: saleTimestamp,
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

      setAutoSellSettings: (settings: Partial<AutoSellSettings>) => set((state) => {
        const next = { ...state.autoSellSettings, ...settings };
        const normalizedQuality = Math.max(0, Math.min(100, Math.floor(next.minQuality)));
        const preferredChannel = typeof next.preferredChannel === 'string' ? next.preferredChannel : 'auto';
        const hasChannel = preferredChannel === 'auto' || state.salesChannels.some(c => c.id === preferredChannel);
        return {
          autoSellSettings: {
            ...next,
            minQuality: normalizedQuality,
            preferredChannel: hasChannel ? preferredChannel : 'auto',
          },
        };
      }),

      runAutoSellTick: () => set((state) => {
        if (!state.autoSellSettings.enabled) return state;

        const now = Date.now();
        if (now - state.lastAutoSellAt < 1000) {
          return state;
        }

        const driedBuds = state.inventory.filter(
          bud => bud.state === 'dried' && bud.quality >= state.autoSellSettings.minQuality
        );

        if (driedBuds.length === 0) {
          return { lastAutoSellAt: now };
        }

        if (state.autoSellSettings.onlyWhenFull) {
          const unlockedRacks = state.dryingRacks.filter(r => r.isUnlocked).length;
          const fullnessTarget = Math.max(1, Math.ceil(unlockedRacks * 0.8));
          if (driedBuds.length < fullnessTarget) {
            return { lastAutoSellAt: now };
          }
        }

        const sortedBuds = [...driedBuds].sort((a, b) => {
          if (a.quality !== b.quality) return a.quality - b.quality;
          return a.grams - b.grams;
        });

        for (const bud of sortedBuds) {
          const eligibleChannels = state.salesChannels.filter((channel) => {
            if (!channel.unlocked || bud.quality < channel.minQuality) return false;
            if (state.autoSellSettings.preferredChannel !== 'auto' && channel.id !== state.autoSellSettings.preferredChannel) {
              return false;
            }
            const cooldownMs = channel.cooldownMinutes * 60 * 1000;
            return now - channel.lastSaleTime >= cooldownMs;
          });

          if (eligibleChannels.length === 0) {
            continue;
          }

          const channel = state.autoSellSettings.preferredChannel === 'auto'
            ? eligibleChannels.sort((a, b) => b.pricePerGram - a.pricePerGram)[0]
            : eligibleChannels[0];

          if (!channel) continue;

          const gramsToSell = Math.min(bud.grams, channel.maxGramsPerSale);
          const qualityBonus = 1 + (bud.quality / 100) * 0.5;
          const rarityBonus = bud.rarity === 'legendary'
            ? 2
            : bud.rarity === 'epic'
              ? 1.5
              : bud.rarity === 'rare'
                ? 1.25
                : bud.rarity === 'uncommon'
                  ? 1.1
                  : 1;
          const territoryMultiplier = getTerritorySalesMultiplier('weed');
          const revenue = Math.floor(gramsToSell * channel.pricePerGram * qualityBonus * rarityBonus * territoryMultiplier);

          let inventory = [...state.inventory];
          const budIndex = inventory.findIndex(b => b.id === bud.id);
          if (budIndex === -1) continue;
          if (gramsToSell >= bud.grams) {
            inventory = inventory.filter(b => b.id !== bud.id);
          } else {
            inventory[budIndex] = { ...inventory[budIndex], grams: inventory[budIndex].grams - gramsToSell };
          }

          const salesChannels = state.salesChannels.map(c =>
            c.id === channel.id ? { ...c, lastSaleTime: now } : c
          );

          const weedSalesWindow = [
            ...state.weedSalesWindow,
            { timestamp: now, revenue },
          ].filter(entry => now - entry.timestamp <= SALES_WINDOW_MS);

          return {
            inventory,
            salesChannels,
            budcoins: state.budcoins + revenue,
            totalGramsSold: state.totalGramsSold + gramsToSell,
            totalSalesRevenue: state.totalSalesRevenue + revenue,
            totalCoinsEarned: state.totalCoinsEarned + revenue,
            weedSalesWindow,
            lastWeedSalesMinute: now,
            lastAutoSellAt: now,
          };
        }

        return { lastAutoSellAt: now };
      }),

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
        if (!worker || worker.owned) return false;

        if (worker.costKoksGrams && worker.costKoksGrams > 0) {
          const businessState = useBusinessStore.getState();
          const availableKoks = businessState.warehouseLots
            .filter(lot => lot.drug === 'koks')
            .reduce((sum, lot) => sum + lot.grams, 0);

          if (availableKoks < worker.costKoksGrams) return false;

          const consumed = businessState.sellWarehouseStock('koks', worker.costKoksGrams, false);
          if (consumed.gramsSold < worker.costKoksGrams) return false;

          set({
            workers: state.workers.map(w => 
              w.id === workerId ? { ...w, owned: true } : w
            ),
          });
          return true;
        }

        if (state.budcoins < worker.cost) return false;

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
        let xp = state.xp;
        let level = state.level;
        let skillPoints = state.skillPoints;
        let weedSalesWindow = [...state.weedSalesWindow];
        let lastWeedSalesMinute = state.lastWeedSalesMinute;

        const grantXp = (amount: number) => {
          if (!Number.isFinite(amount) || amount <= 0) return;
          let newXp = xp + Math.floor(amount);
          let newLevel = level;
          let newSkillPoints = skillPoints;
          while (newXp >= getXpForLevel(newLevel)) {
            newXp -= getXpForLevel(newLevel);
            newLevel += 1;
            newSkillPoints += 1;
          }
          xp = newXp;
          level = newLevel;
          skillPoints = newSkillPoints;
        };

        const getWorkerHarvestXp = (rarity: Rarity) => {
          switch (rarity) {
            case 'legendary':
              return 8;
            case 'epic':
              return 6;
            case 'rare':
              return 4;
            case 'uncommon':
              return 3;
            default:
              return 2;
          }
        };

        const getDealerSaleXp = (gramsSold: number) => Math.max(1, Math.floor(gramsSold / 5));
        const recordWeedSale = (revenue: number) => {
          const stamp = Date.now();
          weedSalesWindow.push({ timestamp: stamp, revenue });
          lastWeedSalesMinute = stamp;
        };

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
                grantXp(getWorkerHarvestXp(seed.rarity));

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

          // PLANT ability: Smart-plant best available seed in empty slots
          if (worker.abilities.includes('plant') && seeds.length > 0) {
            const rarityRank: Record<Rarity, number> = {
              common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
            };
            // Sort a copy by descending rarity so workers plant the best seeds first
            const seedQueue = [...seeds].sort(
              (a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]
            );
            let planted = 0;
            for (let i = 0; i < growSlots.length && planted < slotsToManage && seedQueue.length > 0; i++) {
              const slot = growSlots[i];
              if (slot.isUnlocked && !slot.seed) {
                const seedToPlant = seedQueue.shift()!;
                // Remove from real seeds array (by id)
                const idx = seeds.findIndex(s => s.id === seedToPlant.id);
                if (idx !== -1) seeds.splice(idx, 1);
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

          // WATER ability: Auto-water plants — smarter, level-scaled threshold
          if (worker.abilities.includes('water')) {
            // Higher level workers water more pre-emptively (50 -> 80)
            const waterThreshold = Math.min(80, 50 + worker.level * 5);
            let watered = 0;
            growSlots = growSlots.map(slot => {
              if (
                watered < slotsToManage &&
                slot.seed &&
                slot.isUnlocked &&
                slot.stage !== 'harvest' &&
                slot.waterLevel < waterThreshold
              ) {
                watered++;
                return { ...slot, waterLevel: 100, lastWatered: Date.now() };
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
            const isGiulio = dealerId === 'dealer-giulio';

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
            const getRandomCustomerName = () => customerNames[Math.floor(Math.random() * customerNames.length)];
            const getRandomEventMessages = () => (
              isPsycho ? [
                `🚔 Polizeikontrolle. Hat den Cop bedroht. Der ist weggerannt, mit blutiger Nase.`,
                `🔥 Hat nen Mülleimer angezündet. Weil ihm langweilig war. Hat den ganzen Block abgefackelt.`,
                `🐕 Ein Hund hat ihn angebellt. Hat den Besitzer verprügelt. Und den Hund gefressen.`,
                `🚗 Hat nen AMG geklaut. Für 10 Minuten. "Nur kurz Spritztour." Hat ihn in den Fluss gefahren.`,
                `🏪 Späti überfallen. Nur Zigaretten mitgenommen. Und den Verkäufer als Geisel.`,
                `🎰 Hat am Automaten 800€ gewonnen. Mit Drohung. Hat den Automaten danach zerlegt.`,
                `👊 Prügelei mit 3 Typen. Hat gewonnen. Hat ihre Organe verkauft.`,
                `🔪 Hat jemandem das Handy "geliehen". Für immer. Mit abgetrenntem Finger.`,
                `🚨 Flucht vor der Polizei. Durch 3 Hinterhöfe. Hat funktioniert. Hat Fallen mit Glasscherben gelegt.`,
                `🏚️ Übernachtet in leerstehendem Haus. Ist jetzt seins. Hat den Geist vertrieben, indem er ihn gefoltert.`,
                `🚦 Hat die Ampel umgetreten. "Die glotzt mich an." Hat sie dann als Waffe benutzt.`,
                `🏍️ Macht ne Spritztour auf fremdem Roller. Hat den Eigentümer überfahren.`,
                `🦄 Hat ein imaginäres Einhorn gejagt. Es war der Nachbarskatze. Hat sie in Stücke gerissen.`,
                `🍔 Burger-Laden terrorisiert. Weil der Ketchup "zu rot" war. Hat den Koch mit Ketchup ertränkt.`,
                `👻 Geisterbahn besucht. Hat die Geister verprügelt. "Zu gruselig." Hat echte Leichen hinzugefügt.`,
                `🚀 Rakete gebaut aus Müll. Startversuch im Park. Fehlschlag episch. Hat Kinder verbrannt.`,
                `🐢 Schildkröte herausgefordert. Verloren. "Zu langsam für mich." Hat sie zertrampelt und gegessen.`,
                `📺 Fernseher angeschrien. Weil die Werbung ihn ignoriert. Hat ihn mit Axt zerhackt.`,
                `🌳 Baum umarmt. Dann gefällt. "Er hat zurückgeumarmt." Hat Möbel aus seinen Knochen gemacht.`,
                `🎈 Ballons geklaut. Für eine "Luftschlacht" mit Tauben. Hat sie mit Giftgas gefüllt.`,
                `💀 Hat einen Friedhof umdekoriert. Mit Party-Lichtern. "Zu düster." Hat Gräber geöffnet und Partys gefeiert.`,
                `🧟 Zombie-Apokalypse simuliert. Nachbarn erschreckt. Polizei gerufen. Hat echte Viren freigesetzt.`,
                `🔥 Hat sein eigenes Auto angezündet. "Es hat mich verraten." Hat darin geschlafen.`,
                `🩸 Blutspende-Station überfallen. Wollte "frisches Blut" für Kunst. Hat es getrunken.`,
                `🤡 Clown-Kostüm angezogen. Dann Kinderparty gecrasht. Chaos. Hat die Kinder als Clowns verkleidet und entführt.`,
                `🧠 Hat einen Psychiater bedroht. "Du bist der Verrückte hier!" Hat sein Gehirn gewaschen.`,
                `🐍 Schlangen als Haustiere freigelassen. Im Supermarkt. Hat sie mit Gift aufgeladen.`,
                `🕷️ Spinnenfarm gestartet. In der Nachbarwohnung. Hat Nachbarn als Futter verwendet.`,
                `🧪 Chemie-Set missbraucht. Hat den Block evakuiert. Hat Nervengas produziert.`,
                `👹 Maske aufgesetzt. Hat sich selbst erschreckt. Spiegel zertrümmert. Hat sein Gesicht zerschnitten.`,
              ] : isGiulio ? [
                `🎰 Hat das komplette Wechselgeld in den Automaten geworfen. 0€ raus. Hat den Automaten verflucht und zertrümmert.`,
                `🎲 Hat Würfel gezückt. "Ich geh doppelt oder nix." Hat seine Seele verwettet.`,
                `🃏 Verliert beim Kartenabend. Zahlt mit Gras. Und mit seinem linken Auge.`,
                `🍒 "Gleich Jackpot!" Der Jackpot bleibt aus. Hat den Automaten mit Säure übergossen.`,
                `💸 Zockt sein ganzes Trinkgeld weg. Tja. Hat dann seine Organe verzockt.`,
                `🎮 Spielhalle statt Kunden. Prioritäten. Hat die Halle in Brand gesteckt aus Frust.`,
                `🧾 Hat Schulden beim Zocker-Kiosk. Verspricht "morgen" zu zahlen. Hat den Kioskbesitzer erpresst.`,
                `🪙 Hat die letzte Münze verzockt. Gute Nacht. Hat dann seinen Schatten verzockt.`,
                `🃏 Deal ausgesetzt, weil Pokerturnier läuft. Hat das Turnier mit gefälschten Karten sabotiert.`,
                `🏇 Gewettet auf ein Pferd. Es ist umgefallen. Beim Start. Hat das Pferd geschlachtet.`,
                `🎲 Würfelt gegen sich selbst. Verliert. Zweimal. Hat sich selbst bestraft mit Peitsche.`,
                `🤑 Hat den Automaten umarmt. Für Glück. Hat Stromschlag bekommen. Hat den Automaten verklagt.`,
                `🃏 Karten getauscht. Mit unsichtbaren. Hat trotzdem verloren. Hat die Karten verbrannt.`,
                `🍀 Vierblättriges Kleeblatt gekauft. War fake. Verloren wieder. Hat den Verkäufer verflucht.`,
                `🎰 Automat gehackt. Mit Hammer. Jetzt kaputt. Hat die Teile gegessen.`,
                `💰 Hat auf "sicher" gesetzt. War unsicher. Verloren. Hat das Casino angezündet.`,
                `🪄 Zaubertrick beim Zocken. Karten verschwunden. Geld auch. Hat den Zauberer ermordet.`,
                `🤑 Hat seinen eigenen Schatten verzockt. Jetzt schattenlos. Hat die Sonne verklagt.`,
                `🎲 Würfelt um sein Leben. Gewinnt. Aber verliert die Würfel. Hat neue aus Knochen gemacht.`,
                `🃏 Pokerface trainiert. Im Spiegel. Verliert gegen sich selbst. Hat den Spiegel zertrümmert.`,
                `💸 Hat auf den Weltuntergang gewettet. Wartet immer noch. Hat den Untergang herbeigeführt.`,
                `🍒 Frucht-Automat. Isst echte Früchte statt zu zocken. Verliert Hunger. Hat sich selbst gefressen.`,
                `🏆 Turnier gewonnen. Mit Schummeln. Wurde disqualifiziert. Hat die Jury bestochen.`,
                `🧠 Hat sein Gedächtnis verzockt. Vergisst, was er verloren hat. Hat sein Gehirn verzockt.`,
                `🎰 Automat als Freund betrachtet. Hat ihn verlassen. Für einen anderen. Hat den alten zerstört.`,
                `💰 Geld verdoppelt. Im Traum. Wacht auf. Pleite. Hat den Traum verklagt.`,
                `🪙 Münze geworfen. Kopf oder Zahl? Landet auf Kante. Universum crasht. Hat das Universum resettet.`,
              ] : [
                `👮 Von Polizei angehalten. Hat sie bestochen. Mit Gras. Und mit einer Niere.`,
                `🏃 Wurde von ner Oma verfolgt. Sie war schneller. Hat sie umgerannt und bestohlen.`,
                `🐕 Hund hat 5g gefressen. Teuerster Snack seines Lebens. Hat den Hund operiert, um es zurückzuholen.`,
                `🦝 Waschbär hat die Stash geklaut. Wurde verfolgt. Waschbär hat gewonnen. Hat den Waschbär gejagt und gehäutet.`,
                `🏠 Auf falscher Beerdigung gelandet. Hat trotzdem verkauft. Hat den Sarg als Stash verwendet.`,
                `💒 Vor ner Kirche gedealt. Pfarrer ist Stammkunde. Hat den Altar profaniert.`,
                `🚂 Im Zug kontrolliert. Ticket gefunden. Stash nicht. Hat den Kontrolleur high gemacht.`,
                `🎤 Hat ausversehen Karaoke gewonnen. Hat das Mikrofon als Waffe benutzt.`,
                `🏀 Hat nen Streetball gewonnen, dann verkauft. Hat die Spieler als Sklaven verkauft.`,
                `🛵 Lieferando-Fahrer verjagt. Deal verzögert. Hat den Fahrer überfahren.`,
                `🛸 Aliens getroffen. Hat Space-Gras verkauft. Nun berühmt im Universum. Hat die Erde verraten.`,
                `🎭 Im Theater gedealt. Mitten in der Szene. Standing Ovations. Hat die Schauspieler süchtig gemacht.`,
                `🍦 Eisverkäufer verwechselt. Hat Gras statt Vanille verkauft. Hat Kinder high gemacht.`,
                `🦸 Als Superheld verkleidet. Hat "Rettung" mit Deal kombiniert. Hat die Stadt terrorisiert.`,
                `📚 In Bibliothek gedealt. Bücher als Tarnung. "Lesen bildet." Hat Bücher mit Gift verseucht.`,
                `🎪 Zirkus besucht. Hat Clowns high gemacht. Show chaotisch. Hat die Tiere freigelassen.`,
                `🧳 Im Urlaub gedealt. Am Flughafen. Fast erwischt. Hat den Sicherheitsmann bestochen.`,
                `🐧 Pinguine im Zoo. Hat versucht zu dealen. Sie watscheln weg. Hat den Zoo geflutet.`,
              ]
            );
            const getMeetingMessages = (customerName: string) => (
              isPsycho ? [
                `🤝 ${customerName} getroffen. "Hast du mein Geld?" - Hat er nicht.`,
                `😤 ${customerName} wollte reden. "Halt die Fresse." - Gespräch beendet.`,
                `📱 ${customerName} ruft an. Geht nicht ran. Nie.`,
                `💀 ${customerName} hat gewunken. Wurde ignoriert.`,
                `🗣️ ${customerName} wollte quatschen. Wurde abgewürgt.`,
                `📵 ${customerName} schreibt. Wird blockiert.`,
              ] : isGiulio ? [
                `🎰 ${customerName} wollte kaufen. Giulio war am Automaten.`,
                `🃏 ${customerName} trifft ihn beim Kartenabend. Kein Deal.`,
                `💸 ${customerName} fragt nach Rabatt. Giulio will nur Geld für den Einsatz.`,
                `🍺 ${customerName} ruft an. Giulio ist zu breit.`,
                `🎲 ${customerName} wartet. Giulio würfelt um den Preis.`,
                `🧃 ${customerName} bringt Bier. Deal verschoben.`,
              ] : [
                `🤝 Mit ${customerName} getroffen. Kein Deal, nur Gelaber.`,
                `☕ Döner mit ${customerName}. Nur Quatschen, kein Business.`,
                `📱 ${customerName} hat angerufen. Will später kommen. Kommt nie.`,
                `⏳ ${customerName} hat kein Geld dabei. "Nächste Woche, Bruder."`,
                `🗣️ ${customerName} wollte nur reden. 2 Stunden. Über seine Ex.`,
                `💸 ${customerName} schuldet noch von letzter Woche.`,
                `🕒 ${customerName} kam zu spät. Deal geplatzt.`,
                `📝 ${customerName} will Vertrag. Dealer lacht.`,
              ]
            );

            const killChance = isPsycho ? 8 : isGiulio ? 1 : 3;
            const drugChance = isPsycho ? 5 : isGiulio ? 16 : 7;
            const scamChance = isPsycho ? 12 : isGiulio ? 9 : 7;
            const violenceChance = isPsycho ? 10 : 0; // Psycho-exclusive
            const robberyChance = isPsycho ? 8 : 0; // Psycho-exclusive
            const randomChance = isPsycho ? 5 : isGiulio ? 18 : 10;
            const meetingChance = isPsycho ? 5 : isGiulio ? 12 : 15; // Psycho wastes less time talking
            
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
              
              // Random chance for different outcomes
              const roll = Math.random() * 100;
              const bud = driedBuds[0];
              
              const customerName = getRandomCustomerName();
              
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
                  `🪦 ${customerName} hat gelacht. Das war das letzte Mal.`,
                  `🥀 ${customerName} wollte zurückreden. Jetzt ist Ruhe.`,
                ] : [
                  `☠️ ${customerName} wollte nicht zahlen... Problem gelöst.`,
                  `🔪 ${customerName} hat gedroht zu verpetzen. Schweigt jetzt für immer.`,
                  `💀 ${customerName} war ein Undercover-Cop. War.`,
                  `⚰️ ${customerName} hatte 50 Cent zu wenig dabei. Inakzeptabel.`,
                  `🪦 ${customerName} hat die Ware beleidigt. Ruhe in Frieden.`,
                  `😵 ${customerName} wollte Mengenrabatt. Hat jetzt ewigen Rabatt.`,
                  `🧯 ${customerName} hat Alarm gemacht. Jetzt ist er leise.`,
                  `🚬 ${customerName} meinte "später zahlen". Gibt kein später.`,
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
                  `🥊 ${customerName} kassiert Haken. Portemonnaie auch. +${violenceAmount}$`,
                  `🪑 ${customerName} gegen den Tisch gedrückt. Hat bezahlt. +${violenceAmount}$`,
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
                  `🧢 ${customerName} seine Tasche geschnappt. +${robberyAmount}$`,
                  `🧤 ${customerName} leergeräumt. Handschuhe an. +${robberyAmount}$`,
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
                      `💥 Adrenalin pur. Verkauft wie im Rausch. (+100% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'wasted', name: '💀 Total drauf', salesMultiplier: 0.2, scamChanceBonus: 30, expiresAt: Date.now() + 120000 },
                    messages: [
                      `💀 Zu viel von allem. Sitzt im Hausflur und sabbert. (-80% Verkäufe)`,
                      `☠️ Hat alles gemischt. Kann kaum stehen. (-80% Verkäufe, +30% Scam)`,
                      `🧟 Sieht aus wie ne Leiche. Ist aber noch da. Irgendwie. (-80% Verkäufe)`,
                      `🚑 Fast abgekratzt. Verkauft trotzdem weiter. (-80% Verkäufe)`,
                      `🫥 Ist komplett weggetreten. Nur Automatismus. (-80% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'paranoid', name: '🔪 Aggressiv-Paranoid', salesMultiplier: 0.6, scamChanceBonus: 40, expiresAt: Date.now() + 90000 },
                    messages: [
                      `🔪 Paranoid aber gefährlich. Zieht bei jedem das Messer. (-40%, +40% Scam)`,
                      `😤 Auf Krawall gebürstet. Jeder ist Feind. (-40% Verkäufe)`,
                      `👁️ Traut niemandem. Bedroht jeden Kunden erstmal. (-40%, +40% Scam)`,
                      `🗡️ "WER BIST DU?!" Schreit jeden an. (-40% Verkäufe)`,
                      `🚫 Lässt niemanden ran, außer mit Cash. (-40% Verkäufe, +40% Scam)`,
                    ]
                  },
                ] : isGiulio ? [
                  {
                    effect: { type: 'hyper', name: '🎰 Aufgedreht', salesMultiplier: 1.6, scamChanceBonus: 15, expiresAt: Date.now() + 50000 },
                    messages: [
                      `🎰 Hat am Automaten gewonnen. Jetzt läuft er heiß. (+60% Verkäufe, +15% Scam)`,
                      `❄️ Dünne Line, dicke Klappe. Zockt und verkauft gleichzeitig. (+60% Verkäufe)`,
                      `⚡ "Nur noch ein Spin!" Verkauft trotzdem wie verrückt. (+60% Verkäufe)`,
                      `🃏 Glückssträhne. Verkauft und verzockt in einem Atemzug. (+60% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'wasted', name: '💀 Total drauf', salesMultiplier: 0.25, scamChanceBonus: 25, expiresAt: Date.now() + 120000 },
                    messages: [
                      `💀 Hat alles gemischt. Sitzt vorm Automaten und sabbert. (-75% Verkäufe)`,
                      `🎲 Verliert den Überblick. Chips leer, Kopf leer. (-75% Verkäufe)`,
                      `🤢 Neben der Spielhalle abgestürzt. (-75% Verkäufe, +25% Scam)`,
                      `🥴 Keine Kontrolle mehr. Tüten vertauscht. (-75% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'drunk', name: '🍺 Besoffen', salesMultiplier: 0.55, scamChanceBonus: 20, expiresAt: Date.now() + 90000 },
                    messages: [
                      `🍺 Hat sein Taschengeld in Bier verwandelt. Lallt rum. (-45% Verkäufe)`,
                      `🥃 "Nur ein Shot" wurden acht. (-45% Verkäufe, +20% Scam)`,
                      `🎰 Trinkt und drückt. Der Automat gewinnt. (-45% Verkäufe)`,
                      `🍻 Verlässt die Theke nicht. Verkauf stockt. (-45% Verkäufe)`,
                    ]
                  },
                ] : [
                  {
                    effect: { type: 'high', name: '🌿 Breit', salesMultiplier: 0.7, scamChanceBonus: 0, expiresAt: Date.now() + 60000 },
                    messages: [
                      `🚬 *zieht am fetten Joint* "Qualitätskontrolle..." (-30% Verkäufe)`,
                      `💨 Hat 3 Bongs geraucht. Kann sich nicht konzentrieren. (-30% Verkäufe)`,
                      `🌿 "Nur ein kleiner Probezug..." *vergisst was er wollte* (-30% Verkäufe)`,
                      `🥬 Kann die Ware nicht aus der Hand legen. (-30% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'hyper', name: '❄️ Aufgeputscht', salesMultiplier: 1.5, scamChanceBonus: 10, expiresAt: Date.now() + 45000 },
                    messages: [
                      `❄️ Hat ne Line gezogen. Redet sehr schnell. (+50% Verkäufe, +10% Scam)`,
                      `💊 Pille eingeworfen. Rennt durch die Stadt. (+50% Verkäufe)`,
                      `⚡ Auf Speed. Hat 47 Leute angesprochen. (+50% Verkäufe)`,
                      `🏃 Sprintet durch den Kiez. Verkäufe explodieren. (+50% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'drunk', name: '🍺 Hackedicht', salesMultiplier: 0.5, scamChanceBonus: 15, expiresAt: Date.now() + 90000 },
                    messages: [
                      `🍺 5 Bier und 3 Kurze. Lallt rum. (-50% Verkäufe, +15% Scam)`,
                      `🥃 Hat ne Flasche Wodka geext. Kann kaum laufen. (-50% Verkäufe)`,
                      `🤮 Kotzt in die Ecke. Verkauft trotzdem weiter. (-50% Verkäufe)`,
                      `🍷 Lallt Preise falsch. Kaum Deals. (-50% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'trippy', name: '🍄 Drauf', salesMultiplier: 0.3, scamChanceBonus: 0, expiresAt: Date.now() + 120000 },
                    messages: [
                      `🍄 Hat Pilze gefuttert. Sieht die Wände atmen. (-70% Verkäufe)`,
                      `🧪 LSD-Trip. Spricht mit Bäumen statt Kunden. (-70% Verkäufe)`,
                      `😵‍💫 Hat DMT geraucht. Andere Dimension. (-70% Verkäufe)`,
                      `🌀 Redet mit Ampeln. Kunden warten. (-70% Verkäufe)`,
                    ]
                  },
                  {
                    effect: { type: 'wasted', name: '💀 Abgestürzt', salesMultiplier: 0.1, scamChanceBonus: 0, expiresAt: Date.now() + 180000 },
                    messages: [
                      `💀 Hat alles gemischt. Liegt im Gebüsch. (-90% Verkäufe für 3min)`,
                      `😵 Komplett abgestürzt. Pennt im Hauseingang. (-90% Verkäufe)`,
                      `🛌 Schläft auf dem Bordstein. Kein Deal. (-90% Verkäufe)`,
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
                  `💣 ${customerName} wollte diskutieren. Hat jetzt gezahlt. +${scamAmount}$`,
                  `🕶️ ${customerName} hat Angst bekommen. Kohle ohne Ware. +${scamAmount}$`,
                ] : [
                  `💰 ${customerName} abgezogen! +${scamAmount}$ (kein Verlust)`,
                  `🎭 ${customerName} wollte auf Pump. Trotzdem kassiert: +${scamAmount}$`,
                  `😈 Fake-Deal mit ${customerName}! +${scamAmount}$ ohne Ware`,
                  `🧊 ${customerName} Badesalz als Crystal verkauft. +${scamAmount}$`,
                  `🌿 ${customerName} Oregano als Haze angedreht. +${scamAmount}$`,
                  `📉 ${customerName} hat "Rabatt" bekommen. Ware war Luft. +${scamAmount}$`,
                  `🧃 ${customerName} hat Sirup statt Öl bekommen. +${scamAmount}$`,
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
                const absurdMessages = getRandomEventMessages();
                
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
                const meetingMessages = getMeetingMessages(customerName);
                
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
                  const territoryMultiplier = getTerritorySalesMultiplier('weed');
                  const revenue = Math.floor(baseRevenue * salesMult * territoryMultiplier);

                  budcoins += revenue;
                  totalCoinsEarned += revenue;
                  totalGramsSold += gramsToSell;
                  totalSalesRevenue += revenue;
                  grantXp(getDealerSaleXp(gramsToSell));
                  recordWeedSale(revenue);

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
                    `🧨 ${customerName} bekommt ${gramsToSell}g. "Kein Stress." ${revenue}$`,
                    `🪓 ${gramsToSell}g an ${customerName}. Blick sagt alles. ${revenue}$`,
                  ] : isGiulio ? [
                    `🎰 ${gramsToSell}g an ${customerName}. "Jackpot kommt gleich." ${revenue}$`,
                    `🃏 Deal mit ${customerName}: ${gramsToSell}g für ${revenue}$. "Nur noch ein Spiel."`,
                    `💸 ${customerName} zahlt. Giulio rennt direkt zur Spielhalle. ${revenue}$`,
                    `🍒 ${gramsToSell}g vertickt. "Ich hol das Geld zurück." ${revenue}$`,
                    `🎲 ${customerName}: ${gramsToSell}g für ${revenue}$. Würfelglück heute.`,
                    `🎮 ${gramsToSell}g an ${customerName}. "Noch eine Runde." ${revenue}$`,
                    `💳 ${customerName} zahlt schnell. Giulio zockt schneller. ${revenue}$`,
                  ] : [
                    `💵 ${gramsToSell}g an ${customerName} vertickt. ${revenue}$`,
                    `✅ Deal mit ${customerName}: ${gramsToSell}g für ${revenue}$`,
                    `🤑 ${customerName} hat ${gramsToSell}g ${bud.strainName} geholt. ${revenue}$`,
                    `💰 ${gramsToSell}g an ${customerName} = ${revenue}$`,
                    `🔥 ${customerName}: "Geiles Zeug!" ${gramsToSell}g, ${revenue}$`,
                    `👌 ${customerName}: "Endlich gutes Zeug!" ${gramsToSell}g weg. ${revenue}$`,
                    `📦 ${customerName} nimmt ${gramsToSell}g ${bud.strainName}. ${revenue}$`,
                    `🤝 ${gramsToSell}g Deal mit ${customerName}. ${revenue}$`,
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
              const customerName = getRandomCustomerName();
              const warehouseRoll = Math.random() * 100;
              let warehouseThreshold = 0;

              if (warehouseRoll < (warehouseThreshold += meetingChance)) {
                const meetingMessages = getMeetingMessages(customerName);
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'meeting',
                  message: meetingMessages[Math.floor(Math.random() * meetingMessages.length)],
                  customerName,
                  dealerId,
                });
              } else if (warehouseRoll < (warehouseThreshold += randomChance)) {
                const absurdMessages = getRandomEventMessages();
                dealerActivities.unshift({
                  id: `act-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  type: 'random',
                  message: absurdMessages[Math.floor(Math.random() * absurdMessages.length)],
                  dealerId,
                });
              } else {
                const bulkTarget = Math.floor((isPsycho ? 10 : 6) + Math.random() * (isPsycho ? 30 : 18));
                const warehouseSale = useBusinessStore.getState().sellWarehouseStock('weed', bulkTarget, false);

                if (warehouseSale.gramsSold > 0) {
                  const quality = warehouseSale.averageQuality || 50;
                  const availableChannels = state.salesChannels
                    .filter(ch => ch.unlocked && quality >= ch.minQuality)
                    .sort((a, b) => b.pricePerGram - a.pricePerGram);

                  if (availableChannels.length > 0) {
                    const channel = availableChannels[0];
                    const qualityMultiplier = 1 + (quality - 50) / 100;
                    const psychoBonus = isPsycho ? 1.15 : 1;
                    const territoryMultiplier = getTerritorySalesMultiplier('weed');
                    const revenue = Math.floor(warehouseSale.gramsSold * channel.pricePerGram * qualityMultiplier * psychoBonus * territoryMultiplier);

                    budcoins += revenue;
                    totalCoinsEarned += revenue;
                    totalGramsSold += warehouseSale.gramsSold;
                    totalSalesRevenue += revenue;
                    grantXp(getDealerSaleXp(warehouseSale.gramsSold));
                    recordWeedSale(revenue);

                    const importSaleMessages = isPsycho ? [
                      `📦 ${warehouseSale.gramsSold}g Import-Weed an ${customerName}. "Kein Wort." ${revenue}$`,
                      `💀 ${customerName} kriegt ${warehouseSale.gramsSold}g Import. ${revenue}$ und weg.`,
                      `🗡️ ${warehouseSale.gramsSold}g Import-Weed gedrückt. ${customerName} sagt nix. ${revenue}$`,
                      `🧨 Import-Deal mit ${customerName}: ${warehouseSale.gramsSold}g. ${revenue}$`,
                      `🚫 ${customerName} nimmt Import. Kein Gerede. ${revenue}$`,
                    ] : isGiulio ? [
                      `🎰 ${customerName} nimmt ${warehouseSale.gramsSold}g Import-Weed (${quality}% Q). ${revenue}$`,
                      `🃏 Import-Deal: ${customerName} holt ${warehouseSale.gramsSold}g. ${revenue}$`,
                      `🍒 ${warehouseSale.gramsSold}g Import-Weed weg. Giulio will "nur kurz zocken". ${revenue}$`,
                      `🎲 ${customerName} kriegt ${warehouseSale.gramsSold}g Import. "Glück bringt's." ${revenue}$`,
                      `💸 Import-Deal durch. Giulio direkt weiter zum Automaten. ${revenue}$`,
                    ] : [
                      `🤝 ${customerName} nimmt ${warehouseSale.gramsSold}g Import-Weed (${quality}% Q). ${revenue}$`,
                      `📦 Import-Deal mit ${customerName}: ${warehouseSale.gramsSold}g für ${revenue}$`,
                      `💵 ${warehouseSale.gramsSold}g Import-Weed an ${customerName}. ${revenue}$`,
                      `✅ Import-Ware weg: ${warehouseSale.gramsSold}g an ${customerName}. ${revenue}$`,
                      `📈 ${customerName} holt ${warehouseSale.gramsSold}g Import. ${revenue}$`,
                    ];

                    dealerActivities.unshift({
                      id: `act-${Date.now()}-${Math.random()}`,
                      timestamp: Date.now(),
                      type: 'sale',
                      message: importSaleMessages[Math.floor(Math.random() * importSaleMessages.length)],
                      grams: warehouseSale.gramsSold,
                      revenue,
                      customerName,
                      dealerId,
                    });
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
                    '🧨 Zündet Böller. Einfach so.',
                    '👁️ Glotzt jeden an. Keiner traut sich.',
                  ] : isGiulio ? [
                    '🎰 Hängt am Automaten. "Nur noch ein Spin."',
                    '🧾 Rechnet seine Schulden durch. Wird nicht besser.',
                    '🍻 Sitzt vorm Kiosk. "Ich wart nur kurz."',
                    '🎲 Würfelt gegen die Zeit. Zeit gewinnt.',
                    '😵‍💫 Zieht eine Line. Vergisst, warum er hier steht.',
                    '📉 Hat alles verzockt. Wartet trotzdem auf Ware.',
                    '👀 Checkt Leute ab. Keiner kauft. Schade.',
                    '🃏 Karten mischen, kein Kunde in Sicht.',
                    '🪙 Zählt Münzen. Sind zu wenig.',
                  ] : [
                    '⏳ Wartet auf Ware...',
                    '📱 Scrollt durch TikTok. Schon 3 Stunden.',
                    '🚬 Raucht eine. Und noch eine. Und noch eine.',
                    '😴 Nickerchen auf der Parkbank.',
                    '🍕 Bestellt die 4. Pizza heute.',
                    '📝 Schreibt SMS. Wird nicht geantwortet.',
                    '🐦 Beobachtet Tauben. Die beobachten zurück.',
                    '🎧 Hört Musik. Keine Deals.',
                    '🧋 Holt sich nen Bubble Tea. Wartet weiter.',
                  ];
                  
                  dealerActivities.unshift({
                    id: `act-${Date.now()}-${Math.random()}`,
                    timestamp: Date.now(),
                    type: 'waiting',
                    message: waitMessages[Math.floor(Math.random() * waitMessages.length)],
                    dealerId,
                  });
                }
              }

              if (dealerActivities.length > 30) {
                dealerActivities = dealerActivities.slice(0, 30);
              }
            }
          }
        }

        const pruneTimestamp = Date.now();
        weedSalesWindow = weedSalesWindow.filter(entry => pruneTimestamp - entry.timestamp <= SALES_WINDOW_MS);

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
          weedSalesWindow,
          lastWeedSalesMinute,
          xp,
          level,
          skillPoints,
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

      // Growing Supplies Actions
      buyFertilizer: (fertilizerId: string) => {
        const state = get();
        const fertilizer = FERTILIZER_CATALOG.find(f => f.id === fertilizerId);
        if (!fertilizer) return false;
        if (state.budcoins < fertilizer.cost) return false;
        
        const existingIndex = state.fertilizerInventory.findIndex(f => f.fertilizer.id === fertilizerId);
        let newInventory;
        
        if (existingIndex >= 0) {
          newInventory = state.fertilizerInventory.map((item, idx) => 
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newInventory = [...state.fertilizerInventory, { fertilizer, quantity: 1 }];
        }
        
        set({
          budcoins: state.budcoins - fertilizer.cost,
          fertilizerInventory: newInventory,
        });
        return true;
      },

      buySoil: (soilId: string) => {
        const state = get();
        const soil = SOIL_CATALOG.find(s => s.id === soilId);
        if (!soil) return false;
        if (state.budcoins < soil.cost) return false;
        
        const existingIndex = state.soilInventory.findIndex(s => s.soil.id === soilId);
        let newInventory;
        
        if (existingIndex >= 0) {
          newInventory = state.soilInventory.map((item, idx) => 
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newInventory = [...state.soilInventory, { soil, quantity: 1 }];
        }
        
        set({
          budcoins: state.budcoins - soil.cost,
          soilInventory: newInventory,
        });
        return true;
      },

      applyFertilizer: (slotId: number, fertilizerId: string) => {
        const state = get();
        const slot = state.growSlots.find(s => s.id === slotId);
        if (!slot || !slot.isUnlocked) return false;
        
        const invItem = state.fertilizerInventory.find(f => f.fertilizer.id === fertilizerId);
        if (!invItem || invItem.quantity <= 0) return false;
        
        const newFertInventory = state.fertilizerInventory.map(item => 
          item.fertilizer.id === fertilizerId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ).filter(item => item.quantity > 0);
        
        const newGrowSlots = state.growSlots.map(s => 
          s.id === slotId 
            ? { ...s, fertilizer: invItem.fertilizer, fertilizerUsesLeft: invItem.fertilizer.duration }
            : s
        );
        
        set({
          fertilizerInventory: newFertInventory,
          growSlots: newGrowSlots,
        });
        return true;
      },

      applySoil: (slotId: number, soilId: string) => {
        const state = get();
        const slot = state.growSlots.find(s => s.id === slotId);
        if (!slot || !slot.isUnlocked || slot.seed) return false; // Can only change soil when empty
        
        const invItem = state.soilInventory.find(s => s.soil.id === soilId);
        if (!invItem || invItem.quantity <= 0) return false;
        
        // Don't consume basic soil (id: basic-soil)
        const consumeSoil = soilId !== 'basic-soil';
        
        const newSoilInventory = consumeSoil 
          ? state.soilInventory.map(item => 
              item.soil.id === soilId 
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ).filter(item => item.quantity > 0 || item.soil.id === 'basic-soil')
          : state.soilInventory;
        
        const newGrowSlots = state.growSlots.map(s => 
          s.id === slotId 
            ? { ...s, soil: invItem.soil }
            : s
        );
        
        set({
          soilInventory: newSoilInventory,
          growSlots: newGrowSlots,
        });
        return true;
      },

      waterPlant: (slotId: number) => {
        const state = get();
        const slot = state.growSlots.find(s => s.id === slotId);
        if (!slot || !slot.isUnlocked || !slot.seed) return false;
        
        // Already fully watered
        if (slot.waterLevel >= 100) return false;
        
        const newGrowSlots = state.growSlots.map(s => 
          s.id === slotId 
            ? { ...s, waterLevel: 100, lastWatered: Date.now() }
            : s
        );
        
        set({ growSlots: newGrowSlots });
        return true;
      },

      waterAllPlants: () => {
        const state = get();
        let watered = 0;
        
        const newGrowSlots = state.growSlots.map(s => {
          if (s.isUnlocked && s.seed && s.waterLevel < 100) {
            watered++;
            return { ...s, waterLevel: 100, lastWatered: Date.now() };
          }
          return s;
        });
        
        if (watered > 0) {
          set({ growSlots: newGrowSlots });
        }
        return watered;
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

      // Blow Stats Actions
      updateBlowStats: (blowTime: number, gramsDried: number) => set((state) => ({
        blowStats: {
          ...state.blowStats,
          totalBlowTime: state.blowStats.totalBlowTime + blowTime,
          totalGramsDriedByBlowing: state.blowStats.totalGramsDriedByBlowing + gramsDried,
          currentSessionTime: state.blowStats.currentSessionTime + blowTime,
          longestBlowSession: Math.max(
            state.blowStats.longestBlowSession,
            state.blowStats.currentSessionTime + blowTime
          ),
        },
      })),

      endBlowSession: () => set((state) => ({
        blowStats: {
          ...state.blowStats,
          currentSessionTime: 0,
        },
      })),
    }),
    {
      name: 'grow-lab-save',
      version: 15, // Increment to trigger migration (Dejan -> Giulio rename)
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

        if (version < 9) {
          if (!Number.isFinite(persistedState.level)) {
            persistedState.level = 1;
          }
        }

        if (version < 10) {
          const giulioWorker = {
            id: 'dealer-giulio',
            name: 'Giulio',
            description: 'Spielsüchtiger, drogensüchtiger Dealer. Zockt ständig, verkauft trotzdem weiter.',
            icon: '🎰',
            cost: 35000,
            costKoksGrams: 10,
            owned: false,
            paused: false,
            level: 1,
            maxLevel: 6,
            slotsManaged: 6,
            abilities: ['sell'],
          };

          if (Array.isArray(persistedState.workers)) {
            // Migrate old dealer-dejan to dealer-giulio
            const existingDejan = persistedState.workers.find((worker: any) => worker.id === 'dealer-dejan');
            if (existingDejan) {
              existingDejan.id = 'dealer-giulio';
              existingDejan.name = 'Giulio';
              if (!Number.isFinite(existingDejan.costKoksGrams)) {
                existingDejan.costKoksGrams = 10;
              }
            }
            const existingGiulio = persistedState.workers.find((worker: any) => worker.id === 'dealer-giulio');
            if (!existingGiulio && !existingDejan) {
              persistedState.workers.push(giulioWorker);
            }
          } else {
            persistedState.workers = [...initialWorkers];
          }
        }

        if (version < 11) {
          if (!Array.isArray(persistedState.weedSalesWindow)) {
            persistedState.weedSalesWindow = [];
          }
          if (!Number.isFinite(persistedState.lastWeedSalesMinute)) {
            persistedState.lastWeedSalesMinute = 0;
          }
          if (!persistedState.autoSellSettings) {
            persistedState.autoSellSettings = {
              enabled: false,
              minQuality: 60,
              preferredChannel: 'auto',
              onlyWhenFull: false,
            };
          } else {
            persistedState.autoSellSettings = {
              enabled: Boolean(persistedState.autoSellSettings.enabled),
              minQuality: Number.isFinite(persistedState.autoSellSettings.minQuality)
                ? persistedState.autoSellSettings.minQuality
                : 60,
              preferredChannel: typeof persistedState.autoSellSettings.preferredChannel === 'string'
                ? persistedState.autoSellSettings.preferredChannel
                : 'auto',
              onlyWhenFull: Boolean(persistedState.autoSellSettings.onlyWhenFull),
            };
          }
          if (!Number.isFinite(persistedState.lastAutoSellAt)) {
            persistedState.lastAutoSellAt = 0;
          }
        }

        // Version 12: Add waterLevel and lastWatered to growSlots + auto-waterer worker
        if (version < 12) {
          if (Array.isArray(persistedState.growSlots)) {
            persistedState.growSlots = persistedState.growSlots.map((slot: any) => ({
              ...slot,
              waterLevel: typeof slot.waterLevel === 'number' ? slot.waterLevel : 100,
              lastWatered: typeof slot.lastWatered === 'number' ? slot.lastWatered : Date.now(),
            }));
          }
          
          // Add auto-waterer worker
          const autoWaterer = {
            id: 'auto-waterer',
            name: 'Bewässerungs-Bot',
            description: 'Automatisches Bewässerungssystem. Gießt alle Pflanzen unter 50% Wasser.',
            icon: '💧',
            cost: 15000,
            owned: false,
            paused: false,
            level: 1,
            maxLevel: 5,
            slotsManaged: 16,
            abilities: ['water'],
          };
          
          if (Array.isArray(persistedState.workers)) {
            const hasAutoWaterer = persistedState.workers.some((w: any) => w.id === 'auto-waterer');
            if (!hasAutoWaterer) {
              persistedState.workers.push(autoWaterer);
            }
          }
        }

        // Version 13: Ensure fertilizer/soil objects are properly set for grow slots
        if (version < 13) {
          const basicSoil = { id: 'basic-soil', name: 'Standard-Erde', description: 'Normale Blumenerde ohne Extras', icon: '🟤', rarity: 'common', cost: 0, growthBoost: 0, yieldBoost: 0, qualityBoost: 0, traitBoostChance: 0, waterRetention: 1 };
          
          if (Array.isArray(persistedState.growSlots)) {
            persistedState.growSlots = persistedState.growSlots.map((slot: any) => ({
              ...slot,
              // Ensure soil exists (default to basic soil if missing)
              soil: slot.soil && typeof slot.soil === 'object' && slot.soil.id ? slot.soil : basicSoil,
              // Ensure fertilizer is null if not a valid object
              fertilizer: slot.fertilizer && typeof slot.fertilizer === 'object' && slot.fertilizer.id ? slot.fertilizer : null,
              // Ensure fertilizerUsesLeft is a number
              fertilizerUsesLeft: typeof slot.fertilizerUsesLeft === 'number' ? slot.fertilizerUsesLeft : 0,
            }));
          }
        }

        // Version 14: Add budGrowth to grow slots for exponential bud growth during flower stage
        if (version < 14) {
          if (Array.isArray(persistedState.growSlots)) {
            persistedState.growSlots = persistedState.growSlots.map((slot: any) => ({
              ...slot,
              budGrowth: typeof slot.budGrowth === 'number' ? slot.budGrowth : (slot.stage === 'harvest' ? 100 : 0),
            }));
          }
        }

        // Version 15: Rename dealer-dejan to dealer-giulio
        if (version < 15) {
          if (Array.isArray(persistedState.workers)) {
            persistedState.workers = persistedState.workers.map((worker: any) => {
              if (worker.id === 'dealer-dejan') {
                return { ...worker, id: 'dealer-giulio', name: 'Giulio' };
              }
              return worker;
            });
          }
          
          // Add blowStats if missing
          if (!persistedState.blowStats) {
            persistedState.blowStats = {
              totalBlowTime: 0,
              longestBlowSession: 0,
              totalGramsDriedByBlowing: 0,
              currentSessionTime: 0,
            };
          }
        }
        
        return persistedState;
      },
    }
  )
);
