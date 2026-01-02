import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { breedCocaSeeds as breedCocaSeedsLib } from '@/lib/cocaBreedingSystem';
import { useBusinessStore } from '@/store/businessStore';

// Types
export type CocaRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CocaPlantStage = 'seed' | 'sprout' | 'bush' | 'flowering' | 'harvest';
export type CocaProcessingStage = 'leaves' | 'paste' | 'base' | 'powder';

export interface CocaSeed {
  id: string;
  name: string;
  rarity: CocaRarity;
  traits: string[];
  baseYield: number; // grams of leaves
  growthSpeed: number;
  generation?: number; // Breeding generation (0 = original, 1+ = hybrid)
  isHybrid?: boolean; // True if created through breeding
  parentNames?: string[]; // Names of parent strains
}

export interface CocaLeaves {
  id: string;
  strainName: string;
  rarity: CocaRarity;
  grams: number;
  quality: number; // 1-100
}

export interface CocaProduct {
  id: string;
  stage: CocaProcessingStage;
  strainName: string;
  rarity: CocaRarity;
  grams: number;
  quality: number;
  purity: number; // 0-100, affects price
}

export interface CocaGrowSlot {
  id: number;
  plantId: string | null;
  seed: CocaSeed | null;
  stage: CocaPlantStage;
  progress: number;
  isUnlocked: boolean;
}

export interface ProcessingStation {
  id: string;
  name: string;
  inputStage: CocaProcessingStage | 'leaves';
  outputStage: CocaProcessingStage;
  processingTime: number; // seconds
  currentProduct: CocaProduct | null;
  progress: number;
  isUnlocked: boolean;
  level: number;
  maxLevel: number;
}

export interface CocaUpgrade {
  id: string;
  name: string;
  description: string;
  category: 'growing' | 'processing' | 'quality';
  baseCost: number;
  costScaling: number;
  level: number;
  maxLevel: number;
  effect: string;
  effectValue: number;
}

export interface CocaWorker {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  owned: boolean;
  paused: boolean;
  level: number;
  maxLevel: number;
  abilities: ('grow' | 'process' | 'sell' | 'autoGrow' | 'autoProcess')[];
  salesPerTick: number;
  type: 'dealer' | 'farmer' | 'processor';
}

export interface CocaActivityLog {
  id: number;
  workerId: string;
  workerName: string;
  workerIcon: string;
  action: string;
  amount?: number;
  revenue?: number;
  timestamp: number;
}

type CartelShift = 'morning' | 'day' | 'evening' | 'night';

// Coca Workers - even more messed up than the Psycho
export const COCA_WORKERS: CocaWorker[] = [
  // === AUTO WORKERS (Farmer & Processor) ===
  {
    id: 'coca-farmer',
    name: 'El Campesino',
    description: 'Kolumbianischer Bauer. Baut automatisch Coca an. Hat schon Kartelle kommen und gehen sehen.',
    icon: '👨‍🌾',
    cost: 25000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 15,
    abilities: ['autoGrow'],
    salesPerTick: 0,
    type: 'farmer',
  },
  {
    id: 'coca-processor',
    name: 'El Cocinero',
    description: 'Der Chefkoch. Verarbeitet Blätter automatisch zu reinstem Schnee. Trägt keine Handschuhe.',
    icon: '👨‍🍳',
    cost: 40000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 15,
    abilities: ['autoProcess'],
    salesPerTick: 0,
    type: 'processor',
  },
  // === DEALERS ===
  {
    id: 'coca-mule',
    name: 'Der Maultier-Kid',
    description: 'Schmuggelt Kokain über die Grenze. Schluckt Bälle. Keine Fragen.',
    icon: '🫃',
    cost: 50000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 10,
    abilities: ['sell'],
    salesPerTick: 3,
    type: 'dealer',
  },
  {
    id: 'cartel-sicario',
    name: 'El Sicario',
    description: 'Kartell-Killer. Macht kurzen Prozess mit Problemen. Und Konkurrenz. Und Zeugen.',
    icon: '💀',
    cost: 150000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 10,
    abilities: ['sell', 'process'],
    salesPerTick: 8,
    type: 'dealer',
  },
  {
    id: 'corrupt-cop',
    name: 'Officer Schweinehund',
    description: 'Korrupter Bulle. Beschützt dein Business. Erpresst die Kunden. Schießt zurück.',
    icon: '🐷',
    cost: 250000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 10,
    abilities: ['sell'],
    salesPerTick: 12,
    type: 'dealer',
  },
  {
    id: 'chemist-zombie',
    name: 'Dr. Frankenstein',
    description: 'Hat sich selbst zu oft getestet. Zittert. Sabbert. Aber kocht das reinste Zeug.',
    icon: '🧟',
    cost: 100000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 10,
    abilities: ['process', 'grow'],
    salesPerTick: 0,
    type: 'dealer',
  },
  {
    id: 'ghost-dealer',
    name: 'El Fantasma',
    description: 'Niemand hat ihn je gesehen. Nur die Leichen. Und die leeren Tresore der Konkurrenz.',
    icon: '👻',
    cost: 500000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 15,
    abilities: ['sell', 'process', 'grow'],
    salesPerTick: 20,
    type: 'dealer',
  },
];

const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const CARTEL_SHIFT_LABELS: Record<CartelShift, string> = {
  morning: '🌅 Morgen',
  day: '🌞 Tag',
  evening: '🌆 Abend',
  night: '🌙 Nacht',
};

const CARTEL_SHIFT_ACTIVITIES: Record<CartelShift, string[]> = {
  morning: [
    'checkt die Safehouses und verteilt Ware.',
    'zählt die Nachtkasse und lädt neue Burner-Phones.',
    'koordiniert Routen für die erste Lieferung.',
    'überprüft Funkkanäle und wechselt Treffpunkte.',
  ],
  day: [
    'klappert Hotspots ab und bedient Stammkunden.',
    'liefert Nachschub an Runner.',
    'brieft die Crew zu neuen Regeln.',
    'sichtet Streifen und lenkt sie um.',
  ],
  evening: [
    'sammelt Cash ein und klärt offene Schulden.',
    'verlegt Ware in Nachtverstecke.',
    'trifft Zwischenhändler im Hinterhof.',
    'organisiert Schutz für die Nachtschicht.',
  ],
  night: [
    'fährt Schleichwege, meidet Checkpoints.',
    'führt stille Übergaben in Hintergassen durch.',
    'wechselt Kennzeichen und Lagerorte.',
    'zählt Cash im Safehouse und zieht Bilanz.',
  ],
};

const CARTEL_IDLE_ACTIVITIES: Record<CartelShift, string[]> = {
  morning: [
    'hat keinen Stoff. Organisiert Nachschub.',
    'wartet auf die erste Lieferung des Tages.',
    'sitzt im Safehouse und checkt die Lage.',
  ],
  day: [
    'kein Produkt – hält die Gegend ruhig.',
    'wartet auf den nächsten Drop.',
    'verschiebt Deals wegen leeren Vorräten.',
  ],
  evening: [
    'Ware knapp – Kunden werden vertröstet.',
    'hält sich bedeckt, bis Nachschub kommt.',
    'checkt Lager, aber es ist leer.',
  ],
  night: [
    'trocken – legt sich in den Schatten.',
    'verzieht sich, bis die Lieferung da ist.',
    'hält Nachtwache ohne Ware.',
  ],
};

const CARTEL_DEALER_ACTIVITIES: Record<string, Partial<Record<CartelShift, string[]>>> = {
  'coca-mule': {
    morning: [
      'trainiert die Schluckrouten für die Grenze.',
      'prüft Bodypacks und Kontaktpunkte.',
    ],
    day: [
      'kundschaftet Grenzübergänge aus.',
      'übergibt Päckchen an Kuriere.',
    ],
    night: [
      'schleicht über Nebenrouten an der Grenze vorbei.',
      'taktet den nächsten Schmuggel-Run.',
    ],
  },
  'cartel-sicario': {
    morning: [
      'checkt Waffen, Magazine, Ausrüstung.',
      'sichert die Route der Crew.',
    ],
    day: [
      'zieht Schutzgeld ein.',
      'schickt eine klare Botschaft an die Konkurrenz.',
    ],
    evening: [
      'beobachtet ein Ziel und wartet auf Signal.',
      'klärt ein "Problem" diskret.',
    ],
  },
  'corrupt-cop': {
    morning: [
      'scannt Funkverkehr und Polizeipläne.',
      'markiert sichere Routen im Streifenplan.',
    ],
    day: [
      'lenkt Kontrollen um.',
      'nimmt Schutzgeld von Dealern.',
    ],
    evening: [
      'schiebt eine Razzia auf morgen.',
      'lässt Beweise verschwinden.',
    ],
  },
  'chemist-zombie': {
    morning: [
      'kalibriert die Laborgeräte.',
      'testet Reinheit mit eigener Nase.',
    ],
    day: [
      'führt Laborchecks durch.',
      'reinigt Filter und reagiert nervös.',
    ],
    night: [
      'schläft nicht und kocht weiter.',
      'schleppt Proben in den Keller.',
    ],
  },
  'ghost-dealer': {
    morning: [
      'taucht kurz auf, keiner sieht ihn.',
      'prüft leise die Übergabepunkte.',
    ],
    evening: [
      'folgt Schatten durch leere Gassen.',
      'bereitet lautlose Drops vor.',
    ],
    night: [
      'macht einen unsichtbaren Nacht-Deal.',
      'verschwindet ohne Spuren.',
    ],
  },
};

const getCartelShift = (timestamp: number): CartelShift => {
  const hour = new Date(timestamp).getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

const getCartelRoutine = (workerId: string, shift: CartelShift, hasStock: boolean): string => {
  const baseActivities = hasStock ? CARTEL_SHIFT_ACTIVITIES[shift] : CARTEL_IDLE_ACTIVITIES[shift];
  const dealerExtras = CARTEL_DEALER_ACTIVITIES[workerId]?.[shift] ?? [];
  const options = dealerExtras.length > 0 ? [...baseActivities, ...dealerExtras] : baseActivities;
  return pickRandom(options);
};

// Seed catalog
export const COCA_SEED_CATALOG: Omit<CocaSeed, 'id'>[] = [
  { name: 'Boliviana Negra', rarity: 'common', traits: ['Hardy'], baseYield: 15, growthSpeed: 1.0 },
  { name: 'Colombian Red', rarity: 'common', traits: ['FastGrow'], baseYield: 12, growthSpeed: 1.2 },
  { name: 'Huánuco Classic', rarity: 'common', traits: ['Steady'], baseYield: 18, growthSpeed: 0.9 },
  { name: 'Peruvian White', rarity: 'uncommon', traits: ['HighYield'], baseYield: 25, growthSpeed: 1.0 },
  { name: 'Amazon Gold', rarity: 'uncommon', traits: ['PurityBoost'], baseYield: 22, growthSpeed: 1.1 },
  { name: 'Chapare Special', rarity: 'rare', traits: ['HighYield', 'FastGrow'], baseYield: 35, growthSpeed: 1.15 },
  { name: 'Andes Premium', rarity: 'rare', traits: ['PurityBoost', 'Hardy'], baseYield: 40, growthSpeed: 0.95 },
  { name: 'Medellín Blanca', rarity: 'epic', traits: ['HighYield', 'PurityBoost', 'FastGrow'], baseYield: 60, growthSpeed: 1.1 },
  { name: 'Pablo\'s Legacy', rarity: 'legendary', traits: ['HighYield', 'PurityBoost', 'FastGrow', 'DoubleRefine'], baseYield: 100, growthSpeed: 1.0 },
];

const initialCocaSeeds: CocaSeed[] = [
  { id: 'coca-seed-1', name: 'Boliviana Negra', rarity: 'common', traits: ['Hardy'], baseYield: 15, growthSpeed: 1.0 },
  { id: 'coca-seed-2', name: 'Colombian Red', rarity: 'common', traits: ['FastGrow'], baseYield: 12, growthSpeed: 1.2 },
  { id: 'coca-seed-3', name: 'Huánuco Classic', rarity: 'common', traits: ['Steady'], baseYield: 18, growthSpeed: 0.9 },
];

const initialCocaGrowSlots: CocaGrowSlot[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  plantId: null,
  seed: i === 0 ? initialCocaSeeds[0] : null,
  stage: 'seed' as CocaPlantStage,
  progress: 0,
  isUnlocked: i < 2,
}));

const initialProcessingStations: ProcessingStation[] = [
  { id: 'maceration', name: 'Mazerations-Grube', inputStage: 'leaves', outputStage: 'paste', processingTime: 60, currentProduct: null, progress: 0, isUnlocked: true, level: 1, maxLevel: 10 },
  { id: 'oxidation', name: 'Oxidations-Becken', inputStage: 'paste', outputStage: 'base', processingTime: 120, currentProduct: null, progress: 0, isUnlocked: false, level: 1, maxLevel: 10 },
  { id: 'crystallization', name: 'Kristallisations-Labor', inputStage: 'base', outputStage: 'powder', processingTime: 180, currentProduct: null, progress: 0, isUnlocked: false, level: 1, maxLevel: 10 },
];

const initialCocaUpgrades: CocaUpgrade[] = [
  { id: 'coca-light', name: 'UV-Lampen', description: '+15% Wachstumsgeschwindigkeit', category: 'growing', baseCost: 1000, costScaling: 1.5, level: 0, maxLevel: 20, effect: 'growthSpeed', effectValue: 0.15 },
  { id: 'coca-soil', name: 'Anden-Erde', description: '+10% Blatt-Ertrag', category: 'growing', baseCost: 1500, costScaling: 1.6, level: 0, maxLevel: 15, effect: 'yieldBonus', effectValue: 0.10 },
  { id: 'coca-slot', name: 'Neuer Anbau-Slot', description: 'Schalte einen weiteren Slot frei', category: 'growing', baseCost: 5000, costScaling: 2.5, level: 0, maxLevel: 6, effect: 'slots', effectValue: 1 },
  { id: 'processing-speed', name: 'Schnellere Verarbeitung', description: '+20% Verarbeitungsgeschwindigkeit', category: 'processing', baseCost: 2000, costScaling: 1.7, level: 0, maxLevel: 20, effect: 'processingSpeed', effectValue: 0.20 },
  { id: 'purity-boost', name: 'Reinheits-Optimierung', description: '+5% Reinheit bei der Verarbeitung', category: 'quality', baseCost: 3000, costScaling: 1.8, level: 0, maxLevel: 15, effect: 'purityBonus', effectValue: 5 },
  { id: 'yield-efficiency', name: 'Effizienz-Steigerung', description: '-10% Materialverlust', category: 'processing', baseCost: 2500, costScaling: 1.6, level: 0, maxLevel: 10, effect: 'yieldEfficiency', effectValue: 0.10 },
];

const COCA_STAGE_THRESHOLDS: Record<CocaPlantStage, number> = {
  seed: 0,
  sprout: 20,
  bush: 45,
  flowering: 70,
  harvest: 100,
};

const getCocaStageFromProgress = (progress: number): CocaPlantStage => {
  if (progress >= 100) return 'harvest';
  if (progress >= 70) return 'flowering';
  if (progress >= 45) return 'bush';
  if (progress >= 20) return 'sprout';
  return 'seed';
};

export interface CocaQuest {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'achievement';
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: { type: 'budcoins' | 'gems' | 'cocaSeeds'; amount: number };
}

const initialCocaQuests: CocaQuest[] = [
  // Daily Quests
  { id: 'coca-daily-1', name: 'Ernte-König', description: 'Ernte 5 Coca-Pflanzen', type: 'daily', target: 5, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 500 } },
  { id: 'coca-daily-2', name: 'Chemiker', description: 'Verarbeite 3x Material', type: 'daily', target: 3, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 750 } },
  { id: 'coca-daily-3', name: 'Dealer des Tages', description: 'Verkaufe 50g Produkte', type: 'daily', target: 50, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 10 } },
  // Achievements
  { id: 'coca-ach-1', name: 'Pablo wäre stolz', description: 'Produziere 100g Kokain', type: 'achievement', target: 100, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 5000 } },
  { id: 'coca-ach-2', name: 'Kartell-Boss', description: 'Verdiene 50.000$ mit Coca', type: 'achievement', target: 50000, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 50 } },
  { id: 'coca-ach-3', name: 'Ernte-Maschine', description: 'Ernte 50 Coca-Pflanzen', type: 'achievement', target: 50, progress: 0, completed: false, claimed: false, reward: { type: 'cocaSeeds', amount: 3 } },
  { id: 'coca-ach-4', name: 'Reinheits-Fanatiker', description: 'Verkaufe Kokain mit 90%+ Reinheit', type: 'achievement', target: 1, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 2500 } },
];

export interface CocaState {
  // Resources
  cocaCoins: number;
  
  // Growing
  cocaGrowSlots: CocaGrowSlot[];
  cocaSeeds: CocaSeed[];
  
  // Inventory
  cocaLeaves: CocaLeaves[];
  cocaProducts: CocaProduct[];
  
  // Processing
  processingStations: ProcessingStation[];
  
  // Upgrades
  cocaUpgrades: CocaUpgrade[];
  
  // Workers
  cocaWorkers: CocaWorker[];
  cocaActivityLogs: CocaActivityLog[];
  cocaDealerLastActivityAt: Record<string, number>;
  
  // Quests
  cocaQuests: CocaQuest[];
  
  // Stats
  totalCocaHarvests: number;
  totalPowderProduced: number;
  totalCocaSales: number;
  totalCocaRevenue: number;
  totalProcessed: number;
  
  // Actions
  cocaTap: () => void;
  cocaTapBatch: (count: number) => void;
  plantCocaSeed: (slotId: number, seed: CocaSeed) => void;
  harvestCoca: (slotId: number) => void;
  updateCocaProgress: (delta: number) => void;
  startProcessing: (stationId: string, productId: string) => boolean;
  collectProcessed: (stationId: string) => CocaProduct | null;
  updateProcessingProgress: (delta: number) => void;
  buyCocaUpgrade: (upgradeId: string, budcoins: number) => { success: boolean; cost: number };
  unlockProcessingStation: (stationId: string, budcoins: number) => { success: boolean; cost: number };
  buyCocaSeed: (seedName: string, cost: number, budcoins: number) => { success: boolean };
  sellCocaProduct: (productId: string) => { success: boolean; revenue: number };
  
  // Worker Actions
  buyCocaWorker: (workerId: string, budcoins: number) => { success: boolean; cost: number };
  upgradeCocaWorker: (workerId: string, budcoins: number) => { success: boolean; cost: number };
  toggleCocaWorkerPause: (workerId: string) => void;
  runCocaWorkerTick: () => { soldGrams: number; revenue: number };
  runCocaAutoWorkerTick: () => void;
  addCocaActivityLog: (log: Omit<CocaActivityLog, 'id' | 'timestamp'>) => void;
  
  // Quest Actions
  claimCocaQuest: (questId: string) => { success: boolean; reward: CocaQuest['reward'] | null };
  resetDailyCocaQuests: () => void;
  
  // Breeding
  breedCocaSeeds: (parent1Id: string, parent2Id: string) => { success: boolean; result?: { seed: CocaSeed; outcome: string; outcomeMessage: string; purityBonus: number }; error?: string };

  // Cheat
  cheatAddCocaSeeds: (count: number) => void;
}

export const useCocaStore = create<CocaState>()(
  persist(
    (set, get) => ({
      // Initial state
      cocaCoins: 0,
      cocaGrowSlots: initialCocaGrowSlots,
      cocaSeeds: initialCocaSeeds,
      cocaLeaves: [],
      cocaProducts: [],
      processingStations: initialProcessingStations,
      cocaUpgrades: initialCocaUpgrades,
      cocaWorkers: COCA_WORKERS.map(w => ({ ...w })),
      cocaActivityLogs: [],
      cocaDealerLastActivityAt: {},
      cocaQuests: initialCocaQuests,
      totalCocaHarvests: 0,
      totalPowderProduced: 0,
      totalCocaSales: 0,
      totalCocaRevenue: 0,
      totalProcessed: 0,

      // Tap to boost growth
      cocaTap: () => set((state) => {
        const upgrades = state.cocaUpgrades;
        const growthSpeedLevel = upgrades.find(u => u.id === 'coca-light')?.level ?? 0;
        const baseTapBoost = 2;
        const tapValue = baseTapBoost * (1 + growthSpeedLevel * 0.15);
        
        const cocaGrowSlots = state.cocaGrowSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            const progressGain = tapValue * (slot.seed.growthSpeed ?? 1);
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getCocaStageFromProgress(newProgress),
            };
          }
          return slot;
        });

        return { cocaGrowSlots };
      }),

      cocaTapBatch: (count: number) => set((state) => {
        const tapCount = Number.isFinite(count) ? Math.floor(count) : 0;
        if (tapCount <= 0) return state;

        const upgrades = state.cocaUpgrades;
        const growthSpeedLevel = upgrades.find(u => u.id === 'coca-light')?.level ?? 0;
        const baseTapBoost = 2;
        const tapValue = baseTapBoost * (1 + growthSpeedLevel * 0.15) * tapCount;

        const cocaGrowSlots = state.cocaGrowSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            const progressGain = tapValue * (slot.seed.growthSpeed ?? 1);
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getCocaStageFromProgress(newProgress),
            };
          }
          return slot;
        });

        return { cocaGrowSlots };
      }),

      plantCocaSeed: (slotId: number, seed: CocaSeed) => set((state) => {
        const cocaSeeds = state.cocaSeeds.filter(s => s.id !== seed.id);
        const cocaGrowSlots = state.cocaGrowSlots.map(slot =>
          slot.id === slotId && slot.isUnlocked && !slot.seed
            ? { ...slot, seed, plantId: `coca-plant-${Date.now()}`, stage: 'seed' as CocaPlantStage, progress: 0 }
            : slot
        );
        return { cocaSeeds, cocaGrowSlots };
      }),

      harvestCoca: (slotId: number) => set((state) => {
        const slot = state.cocaGrowSlots.find(s => s.id === slotId);
        if (!slot || slot.stage !== 'harvest' || !slot.seed) return state;

        const seed = slot.seed;
        const yieldBonusLevel = state.cocaUpgrades.find(u => u.id === 'coca-soil')?.level ?? 0;
        const yieldMultiplier = 1 + yieldBonusLevel * 0.10;
        
        const baseGrams = seed.baseYield * yieldMultiplier;
        const variance = 0.2;
        const actualGrams = Math.floor(baseGrams * (1 - variance + Math.random() * variance * 2));
        
        // Quality based on rarity
        const rarityQuality: Record<CocaRarity, number> = {
          common: 50,
          uncommon: 65,
          rare: 75,
          epic: 85,
          legendary: 95,
        };
        const quality = Math.min(100, rarityQuality[seed.rarity] + Math.floor(Math.random() * 10));
        
        const newLeaves: CocaLeaves = {
          id: `coca-leaves-${Date.now()}`,
          strainName: seed.name,
          rarity: seed.rarity,
          grams: actualGrams,
          quality,
        };
        
        // Chance to get seed back
        const seedDropChance = 0.4;
        let newSeeds = [...state.cocaSeeds];
        if (Math.random() < seedDropChance) {
          newSeeds.push({ ...seed, id: `coca-seed-${Date.now()}` });
        }
        
        const cocaGrowSlots = state.cocaGrowSlots.map(s =>
          s.id === slotId
            ? { ...s, seed: null, plantId: null, stage: 'seed' as CocaPlantStage, progress: 0 }
            : s
        );

        // Update quest progress for harvests
        const cocaQuests = state.cocaQuests.map(q => {
          if ((q.id === 'coca-daily-1' || q.id === 'coca-ach-3') && !q.completed) {
            const newProgress = q.progress + 1;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });

        return {
          cocaGrowSlots,
          cocaLeaves: [...state.cocaLeaves, newLeaves],
          cocaSeeds: newSeeds,
          totalCocaHarvests: state.totalCocaHarvests + 1,
          cocaQuests,
        };
      }),

      updateCocaProgress: (delta: number) => set((state) => {
        const upgrades = state.cocaUpgrades;
        const growthSpeedLevel = upgrades.find(u => u.id === 'coca-light')?.level ?? 0;
        const growthMultiplier = 1 + growthSpeedLevel * 0.15;
        
        const cocaGrowSlots = state.cocaGrowSlots.map(slot => {
          if (slot.seed && slot.isUnlocked && slot.stage !== 'harvest') {
            const baseGrowth = 0.5 * delta;
            const progressGain = baseGrowth * growthMultiplier * (slot.seed.growthSpeed ?? 1);
            const newProgress = Math.min(100, slot.progress + progressGain);
            return {
              ...slot,
              progress: newProgress,
              stage: getCocaStageFromProgress(newProgress),
            };
          }
          return slot;
        });
        
        return { cocaGrowSlots };
      }),

      startProcessing: (stationId: string, productId: string) => {
        const state = get();
        const station = state.processingStations.find(s => s.id === stationId);
        if (!station || !station.isUnlocked || station.currentProduct) return false;
        
        // Find input material
        let inputProduct: CocaLeaves | CocaProduct | undefined;
        let newLeaves = state.cocaLeaves;
        let newProducts = state.cocaProducts;
        
        if (station.inputStage === 'leaves') {
          inputProduct = state.cocaLeaves.find(l => l.id === productId);
          if (inputProduct) {
            newLeaves = state.cocaLeaves.filter(l => l.id !== productId);
          }
        } else {
          inputProduct = state.cocaProducts.find(p => p.id === productId && p.stage === station.inputStage);
          if (inputProduct) {
            newProducts = state.cocaProducts.filter(p => p.id !== productId);
          }
        }
        
        if (!inputProduct) return false;
        
        // Create processing product
        const yieldEfficiencyLevel = state.cocaUpgrades.find(u => u.id === 'yield-efficiency')?.level ?? 0;
        const yieldRetention = 1 - (0.3 - yieldEfficiencyLevel * 0.03); // Less loss with upgrades
        
        const purityBonusLevel = state.cocaUpgrades.find(u => u.id === 'purity-boost')?.level ?? 0;
        const basePurity = 'purity' in inputProduct ? inputProduct.purity : inputProduct.quality;
        
        const processingProduct: CocaProduct = {
          id: `coca-processing-${Date.now()}`,
          stage: station.outputStage,
          strainName: inputProduct.strainName,
          rarity: inputProduct.rarity,
          grams: Math.floor(inputProduct.grams * yieldRetention),
          quality: inputProduct.quality,
          purity: Math.min(100, basePurity + 5 + purityBonusLevel * 5),
        };
        
        const processingStations = state.processingStations.map(s =>
          s.id === stationId
            ? { ...s, currentProduct: processingProduct, progress: 0 }
            : s
        );
        
        // Update quest progress for processing
        const cocaQuests = state.cocaQuests.map(q => {
          if (q.id === 'coca-daily-2' && !q.completed) {
            const newProgress = q.progress + 1;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          return q;
        });
        
        set({ cocaLeaves: newLeaves, cocaProducts: newProducts, processingStations, totalProcessed: state.totalProcessed + 1, cocaQuests });
        return true;
      },

      collectProcessed: (stationId: string) => {
        const state = get();
        const station = state.processingStations.find(s => s.id === stationId);
        if (!station || !station.currentProduct || station.progress < 100) return null;
        
        const product = station.currentProduct;
        
        const processingStations = state.processingStations.map(s =>
          s.id === stationId
            ? { ...s, currentProduct: null, progress: 0 }
            : s
        );
        
        const newTotalPowder = product.stage === 'powder' 
          ? state.totalPowderProduced + product.grams 
          : state.totalPowderProduced;
        
        set({
          cocaProducts: [...state.cocaProducts, product],
          processingStations,
          totalPowderProduced: newTotalPowder,
        });
        
        return product;
      },

      updateProcessingProgress: (delta: number) => set((state) => {
        const processingSpeedLevel = state.cocaUpgrades.find(u => u.id === 'processing-speed')?.level ?? 0;
        const speedMultiplier = 1 + processingSpeedLevel * 0.20;
        
        // Check if auto-processor is active
        const processor = state.cocaWorkers.find(w => w.id === 'coca-processor' && w.owned && !w.paused);
        const maxProgress = processor ? 105 : 100; // Allow progress beyond 100 for auto-collect delay
        
        const processingStations = state.processingStations.map(station => {
          if (station.currentProduct && station.progress < maxProgress) {
            const progressPerSecond = (100 / station.processingTime) * speedMultiplier * station.level;
            const newProgress = Math.min(maxProgress, station.progress + progressPerSecond * delta);
            return { ...station, progress: newProgress };
          }
          return station;
        });
        
        return { processingStations };
      }),

      buyCocaUpgrade: (upgradeId: string, budcoins: number) => {
        const state = get();
        const upgrade = state.cocaUpgrades.find(u => u.id === upgradeId);
        if (!upgrade || upgrade.level >= upgrade.maxLevel) {
          return { success: false, cost: 0 };
        }
        
        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level));
        if (budcoins < cost) {
          return { success: false, cost };
        }
        
        // Handle slot unlock
        if (upgrade.effect === 'slots') {
          const nextLockedSlot = state.cocaGrowSlots.find(s => !s.isUnlocked);
          if (nextLockedSlot) {
            set({
              cocaGrowSlots: state.cocaGrowSlots.map(s =>
                s.id === nextLockedSlot.id ? { ...s, isUnlocked: true } : s
              ),
              cocaUpgrades: state.cocaUpgrades.map(u =>
                u.id === upgradeId ? { ...u, level: u.level + 1 } : u
              ),
            });
          }
        } else {
          set({
            cocaUpgrades: state.cocaUpgrades.map(u =>
              u.id === upgradeId ? { ...u, level: u.level + 1 } : u
            ),
          });
        }
        
        return { success: true, cost };
      },

      unlockProcessingStation: (stationId: string, budcoins: number) => {
        const state = get();
        const station = state.processingStations.find(s => s.id === stationId);
        if (!station || station.isUnlocked) {
          return { success: false, cost: 0 };
        }
        
        const costs: Record<string, number> = {
          oxidation: 10000,
          crystallization: 50000,
        };
        const cost = costs[stationId] || 0;
        
        if (budcoins < cost) {
          return { success: false, cost };
        }
        
        set({
          processingStations: state.processingStations.map(s =>
            s.id === stationId ? { ...s, isUnlocked: true } : s
          ),
        });
        
        return { success: true, cost };
      },

      buyCocaSeed: (seedName: string, cost: number, budcoins: number) => {
        if (budcoins < cost) return { success: false };
        
        const catalogSeed = COCA_SEED_CATALOG.find(s => s.name === seedName);
        if (!catalogSeed) return { success: false };
        
        const newSeed: CocaSeed = {
          ...catalogSeed,
          id: `coca-seed-${Date.now()}`,
        };
        
        set((state) => ({
          cocaSeeds: [...state.cocaSeeds, newSeed],
        }));
        
        return { success: true };
      },

      sellCocaProduct: (productId: string) => {
        const state = get();
        const product = state.cocaProducts.find(p => p.id === productId);
        if (!product) return { success: false, revenue: 0 };
        
        // Price per gram based on processing stage and purity
        const stagePrices: Record<CocaProcessingStage, number> = {
          leaves: 2,
          paste: 15,
          base: 50,
          powder: 150,
        };
        
        const basePrice = stagePrices[product.stage];
        const purityMultiplier = 0.5 + (product.purity / 100) * 1.5; // 0.5x at 0% purity, 2x at 100%
        const qualityMultiplier = 0.8 + (product.quality / 100) * 0.4;
        const pricePerGram = basePrice * purityMultiplier * qualityMultiplier;
        const revenue = Math.floor(product.grams * pricePerGram);
        
        // Update quest progress for sales and achievements
        const cocaQuests = state.cocaQuests.map(q => {
          if (q.id === 'coca-daily-3' && !q.completed) {
            const newProgress = q.progress + product.grams;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          if (q.id === 'coca-ach-1' && product.stage === 'powder' && !q.completed) {
            const newProgress = state.totalPowderProduced + product.grams;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          if (q.id === 'coca-ach-2' && !q.completed) {
            const newProgress = state.totalCocaRevenue + revenue;
            return { ...q, progress: newProgress, completed: newProgress >= q.target };
          }
          if (q.id === 'coca-ach-4' && product.stage === 'powder' && product.purity >= 90 && !q.completed) {
            return { ...q, progress: 1, completed: true };
          }
          return q;
        });
        
        set({
          cocaProducts: state.cocaProducts.filter(p => p.id !== productId),
          cocaCoins: state.cocaCoins + revenue,
          totalCocaSales: state.totalCocaSales + 1,
          totalCocaRevenue: state.totalCocaRevenue + revenue,
          cocaQuests,
        });
        
        return { success: true, revenue };
      },

      // Breeding
      breedCocaSeeds: (parent1Id: string, parent2Id: string) => {
        const state = get();
        const parent1 = state.cocaSeeds.find(s => s.id === parent1Id);
        const parent2 = state.cocaSeeds.find(s => s.id === parent2Id);

        if (!parent1 || !parent2) {
          return { success: false, error: 'Eltern-Seeds nicht gefunden' };
        }

        if (parent1.id === parent2.id) {
          return { success: false, error: 'Du kannst nicht denselben Samen zweimal verwenden' };
        }

        const breedingResult = breedCocaSeedsLib(parent1, parent2);

        // Remove both parent seeds
        set({
          cocaSeeds: state.cocaSeeds.filter(s => s.id !== parent1Id && s.id !== parent2Id),
        });

        // Add new hybrid seed
        set((s) => ({
          cocaSeeds: [...s.cocaSeeds, breedingResult.seed],
        }));

        return {
          success: true,
          result: {
            seed: breedingResult.seed,
            outcome: breedingResult.outcome,
            outcomeMessage: breedingResult.outcomeMessage,
            purityBonus: breedingResult.purityBonus,
          },
        };
      },

      cheatAddCocaSeeds: (count: number) => set((state) => {
        const newSeeds = COCA_SEED_CATALOG.slice(0, count).map((s, i) => ({
          ...s,
          id: `cheat-coca-seed-${Date.now()}-${i}`,
        }));
        return { cocaSeeds: [...state.cocaSeeds, ...newSeeds] };
      }),

      // Worker Actions
      buyCocaWorker: (workerId: string, budcoins: number) => {
        const state = get();
        // Find worker from COCA_WORKERS if not in state
        let worker = state.cocaWorkers.find(w => w.id === workerId);
        
        // If worker not found in state, find from template
        if (!worker) {
          const template = COCA_WORKERS.find(w => w.id === workerId);
          if (!template) return { success: false, cost: 0 };
          worker = template;
        }
        
        if (worker.owned) return { success: false, cost: 0 };
        if (budcoins < worker.cost) return { success: false, cost: worker.cost };
        
        // Check if worker exists in state, if not add it
        const workerExistsInState = state.cocaWorkers.some(w => w.id === workerId);
        
        if (workerExistsInState) {
          set({
            cocaWorkers: state.cocaWorkers.map(w =>
              w.id === workerId ? { ...w, owned: true } : w
            ),
          });
        } else {
          // Add the worker to the state with owned: true
          const newWorker = { ...COCA_WORKERS.find(w => w.id === workerId)!, owned: true };
          set({
            cocaWorkers: [...state.cocaWorkers, newWorker],
          });
        }
        
        return { success: true, cost: worker.cost };
      },

      upgradeCocaWorker: (workerId: string, budcoins: number) => {
        const state = get();
        const worker = state.cocaWorkers.find(w => w.id === workerId);
        if (!worker || !worker.owned || worker.level >= worker.maxLevel) {
          return { success: false, cost: 0 };
        }
        
        const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
        if (budcoins < upgradeCost) return { success: false, cost: upgradeCost };
        
        set({
          cocaWorkers: state.cocaWorkers.map(w =>
            w.id === workerId ? { ...w, level: w.level + 1 } : w
          ),
        });
        
        return { success: true, cost: upgradeCost };
      },

      toggleCocaWorkerPause: (workerId: string) => set((state) => ({
        cocaWorkers: state.cocaWorkers.map(w =>
          w.id === workerId && w.owned ? { ...w, paused: !w.paused } : w
        ),
      })),

      runCocaWorkerTick: () => {
        const state = get();
        let totalSoldGrams = 0;
        let totalRevenue = 0;
        
        const activeWorkers = state.cocaWorkers.filter(w => w.owned && !w.paused && w.abilities.includes('sell'));
        
        if (activeWorkers.length === 0) {
          return { soldGrams: 0, revenue: 0 };
        }

        const now = Date.now();
        const shift = getCartelShift(now);
        const shiftLabel = CARTEL_SHIFT_LABELS[shift];

        const logRoutine = (worker: CocaWorker, hasStock: boolean, salesMade: number) => {
          const lastActivityAt = get().cocaDealerLastActivityAt?.[worker.id] ?? 0;
          const cooldownMs = salesMade > 0 ? 25000 : 15000;
          const activityChance = salesMade > 0 ? 0.12 : 0.35;

          if (now - lastActivityAt < cooldownMs || Math.random() > activityChance) return;
          const activity = getCartelRoutine(worker.id, shift, hasStock);
          get().addCocaActivityLog({
            workerId: worker.id,
            workerName: worker.name,
            workerIcon: worker.icon,
            action: `${shiftLabel} ${activity}`,
          });
        };

        const businessLots = useBusinessStore.getState().warehouseLots;
        const warehouseKoksAvailable = businessLots
          .filter((lot) => lot.drug === 'koks')
          .reduce((sum, lot) => sum + lot.grams, 0);

        if (state.cocaProducts.length === 0 && warehouseKoksAvailable <= 0) {
          for (const worker of activeWorkers) {
            logRoutine(worker, false, 0);
          }
          return { soldGrams: 0, revenue: 0 };
        }

        if (state.cocaProducts.length === 0 && warehouseKoksAvailable > 0) {
          for (const worker of activeWorkers) {
            const baseSales = worker.salesPerTick + Math.floor(worker.level * 0.5);
            const salesToMake = Math.max(1, Math.floor(baseSales * 1.6));
            let salesMade = 0;

            for (let i = 0; i < salesToMake; i++) {
              const minDeal = 6 + Math.floor(worker.level * 0.6);
              const maxDeal = 18 + Math.floor(worker.level * 1.4);
              const targetGrams = Math.floor(randomBetween(minDeal, maxDeal));
              const warehouseSale = useBusinessStore.getState().sellWarehouseStock('koks', targetGrams);
              if (warehouseSale.gramsSold <= 0) {
                break;
              }

              const basePrice = 150;
              const purityMultiplier = 0.5 + (warehouseSale.averageQuality / 100) * 1.5;
              const qualityMultiplier = 0.8 + (warehouseSale.averageQuality / 100) * 0.4;
              const workerBonus = 1 + worker.level * 0.1;
              const revenue = Math.floor(
                warehouseSale.gramsSold * basePrice * purityMultiplier * qualityMultiplier * workerBonus
              );

              totalSoldGrams += warehouseSale.gramsSold;
              totalRevenue += revenue;
              salesMade += 1;

              get().addCocaActivityLog({
                workerId: worker.id,
                workerName: worker.name,
                workerIcon: worker.icon,
                action: `verkaufte ${warehouseSale.gramsSold}g Import-Koks (${warehouseSale.averageQuality}% rein)`,
                amount: warehouseSale.gramsSold,
                revenue: revenue,
              });
            }

            logRoutine(worker, warehouseKoksAvailable > 0, salesMade);
          }

          if (totalSoldGrams > 0) {
            const summaryWorker = activeWorkers[0];
            if (summaryWorker) {
              get().addCocaActivityLog({
                workerId: summaryWorker.id,
                workerName: summaryWorker.name,
                workerIcon: summaryWorker.icon,
                action: `Dealers haben insgesamt ${totalSoldGrams}g Import-Koks verkauft`,
                amount: totalSoldGrams,
                revenue: totalRevenue,
              });
            }
          }

          if (totalRevenue > 0) {
            set({
              cocaCoins: state.cocaCoins + totalRevenue,
              totalCocaSales: state.totalCocaSales + totalRevenue,
              totalCocaRevenue: state.totalCocaRevenue + totalRevenue,
            });
          }

          return { soldGrams: totalSoldGrams, revenue: totalRevenue };
        }
        
        // Each worker sells based on their salesPerTick + level bonus
        let remainingProducts = [...state.cocaProducts];
        
        for (const worker of activeWorkers) {
          const baseSales = worker.salesPerTick + Math.floor(worker.level * 0.5);
          const salesToMake = Math.max(1, Math.floor(baseSales * 1.6));
          let salesMade = 0;
          
          for (let i = 0; i < salesToMake && remainingProducts.length > 0; i++) {
            // Prefer to sell powder first, then work backwards
            const powderIndex = remainingProducts.findIndex(p => p.stage === 'powder');
            const targetIndex = powderIndex >= 0 ? powderIndex : 0;
            const product = remainingProducts[targetIndex];
            
            if (!product) break;

            const dealRanges: Record<CocaProcessingStage, [number, number]> = {
              leaves: [12, 28],
              paste: [8, 20],
              base: [6, 16],
              powder: [4, 12],
            };
            const [minDeal, maxDeal] = dealRanges[product.stage];
            const levelBoost = Math.floor(worker.level * 0.6);
            const dealGrams = Math.min(
              product.grams,
              Math.max(1, Math.floor(randomBetween(minDeal + levelBoost, maxDeal + levelBoost)))
            );
            
            // Calculate price
            const stagePrices: Record<CocaProcessingStage, number> = {
              leaves: 2,
              paste: 15,
              base: 50,
              powder: 150,
            };
            
            const basePrice = stagePrices[product.stage];
            const purityMultiplier = 0.5 + (product.purity / 100) * 1.5;
            const qualityMultiplier = 0.8 + (product.quality / 100) * 0.4;
            const workerBonus = 1 + worker.level * 0.1;
            const pricePerGram = basePrice * purityMultiplier * qualityMultiplier * workerBonus;
            const revenue = Math.floor(dealGrams * pricePerGram);
            
            totalSoldGrams += dealGrams;
            totalRevenue += revenue;
            salesMade += 1;

            if (dealGrams >= product.grams) {
              remainingProducts.splice(targetIndex, 1);
            } else {
              remainingProducts[targetIndex] = { ...product, grams: product.grams - dealGrams };
            }

            // Add violent/funny activity logs for dealers
            const soldGrams = dealGrams;
            const dealerMessages: Record<string, string[]> = {
              'coca-mule': [
                `hat ${soldGrams}g geschluckt und über die Grenze geschmuggelt 🤢`,
                `kam blutend zurück, aber die ${soldGrams}g sind durch 💊`,
                `wurde vom Zoll durchsucht - alles sauber, ${soldGrams}g verkauft 🚔`,
                `kotzte ${soldGrams}g aus und verkaufte sie trotzdem 🤮`,
                `überquerte 3 Grenzen mit ${soldGrams}g im Bauch 🫃`,
              ],
              'cartel-sicario': [
                `verkaufte ${soldGrams}g und kaltstellte den Käufer. Doppelt verdient 💀`,
                `erledigte die Konkurrenz UND verkaufte ${soldGrams}g. Produktiver Tag ⚰️`,
                `machte ${soldGrams}g Deal. Zeuge verschwindet 🔫`,
                `${soldGrams}g verkauft. Kunde zahlt oder wird begraben 🪦`,
                `verkaufte ${soldGrams}g am Tatort des letzten Deals 💥`,
                `löschte Polizeizeugen aus und vertickte ${soldGrams}g 🩸`,
              ],
              'corrupt-cop': [
                `beschlagnahmte ${soldGrams}g und verkaufte es selbst 🐷`,
                `erpresste Dealer für ${soldGrams}g Schutzgeld-Koks 🚓`,
                `verhaftete Konkurrenz und übernahm deren ${soldGrams}g 👮`,
                `fälschte Beweismittel und klaute ${soldGrams}g aus Asservatenkammer 🔒`,
                `tauschte ${soldGrams}g gegen Straffreiheit. Win-win! 🤝`,
                `verriet Kartell-Konkurrenz an FBI und verkaufte ${soldGrams}g selbst 🎖️`,
              ],
              'chemist-zombie': [
                `zitterte ${soldGrams}g zusammen und vertickte sie sabbernd 🧟`,
                `testete die Qualität (${product.purity}% rein) mit der Nase und verkaufte ${soldGrams}g 👃`,
                `kratzte ${soldGrams}g vom Labortisch und verkaufte seine "Proben" 🔬`,
                `halluzinierte rosa Elefanten aber verkaufte trotzdem ${soldGrams}g 🐘`,
                `kochte versehentlich Meth, verkaufte aber ${soldGrams}g Koks 🧪`,
                `hat seit 4 Tagen nicht geschlafen, ${soldGrams}g vertickt 😵`,
              ],
              'ghost-dealer': [
                `erschien aus dem Nichts, verkaufte ${soldGrams}g, verschwand wieder 👻`,
                `Kunde wachte mit ${soldGrams}g weniger auf. Niemand sah was 🌫️`,
                `hinterließ nur eine Leiche und ${soldGrams}g weniger Inventar ☠️`,
                `war nie da. Trotzdem sind ${soldGrams}g weg und das Geld da 💸`,
                `liquidierte die Konkurrenz-Familie und verkaufte ${soldGrams}g 🗡️`,
                `Dealer verschwanden spurlos. ${soldGrams}g auch. Niemand spricht darüber 🤫`,
              ],
            };

            const messages = dealerMessages[worker.id] || [`verkaufte ${soldGrams}g für ${revenue}$`];
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];

            get().addCocaActivityLog({
              workerId: worker.id,
              workerName: worker.name,
              workerIcon: worker.icon,
              action: randomMessage,
              amount: soldGrams,
              revenue: revenue,
            });
          }

          logRoutine(worker, remainingProducts.length > 0, salesMade);
        }

        if (totalSoldGrams > 0) {
          const summaryWorker = activeWorkers[0];
          if (summaryWorker) {
            get().addCocaActivityLog({
              workerId: summaryWorker.id,
              workerName: summaryWorker.name,
              workerIcon: summaryWorker.icon,
              action: `Dealers haben insgesamt ${totalSoldGrams}g Koks verkauft`,
              amount: totalSoldGrams,
              revenue: totalRevenue,
            });
          }
        }

        if (totalRevenue > 0) {
          set({
            cocaProducts: remainingProducts,
            cocaCoins: state.cocaCoins + totalRevenue,
            totalCocaSales: state.totalCocaSales + totalRevenue,
          });
        }

        return { soldGrams: totalSoldGrams, revenue: totalRevenue };
      },

      // Quest Actions
      claimCocaQuest: (questId: string) => {
        const state = get();
        const quest = state.cocaQuests.find(q => q.id === questId);
        if (!quest || !quest.completed || quest.claimed) {
          return { success: false, reward: null };
        }

        set({
          cocaQuests: state.cocaQuests.map(q =>
            q.id === questId ? { ...q, claimed: true } : q
          ),
        });

        return { success: true, reward: quest.reward };
      },

      resetDailyCocaQuests: () => set((state) => ({
        cocaQuests: state.cocaQuests.map(q =>
          q.type === 'daily' ? { ...q, progress: 0, completed: false, claimed: false } : q
        ),
      })),

      addCocaActivityLog: (log) => set((state) => {
        const now = Date.now();
        const newLog: CocaActivityLog = {
          ...log,
          id: now + Math.floor(Math.random() * 1000),
          timestamp: now,
        };
        // Keep only the last 50 logs
        const logs = [newLog, ...state.cocaActivityLogs].slice(0, 50);
        return {
          cocaActivityLogs: logs,
          cocaDealerLastActivityAt: {
            ...state.cocaDealerLastActivityAt,
            [log.workerId]: now,
          },
        };
      }),

      runCocaAutoWorkerTick: () => {
        const state = get();
        const farmer = state.cocaWorkers.find(w => w.id === 'coca-farmer' && w.owned && !w.paused);
        const processor = state.cocaWorkers.find(w => w.id === 'coca-processor' && w.owned && !w.paused);
        
        // FARMER: Auto-plant and auto-harvest
        if (farmer) {
          const farmerBonus = 1 + (farmer.level - 1) * 0.15;
          
          // Find empty unlocked slots and plant seeds
          const emptySlots = state.cocaGrowSlots.filter(s => s.isUnlocked && !s.seed);
          const availableSeeds = [...state.cocaSeeds];
          
          for (const slot of emptySlots) {
            if (availableSeeds.length === 0) break;
            const seed = availableSeeds.shift()!;
            
            // Plant the seed
            set((s) => ({
              cocaSeeds: s.cocaSeeds.filter(se => se.id !== seed.id),
              cocaGrowSlots: s.cocaGrowSlots.map(sl =>
                sl.id === slot.id
                  ? { ...sl, seed, plantId: `coca-plant-${Date.now()}-${slot.id}`, stage: 'seed' as CocaPlantStage, progress: 0 }
                  : sl
              ),
            }));
            
            get().addCocaActivityLog({
              workerId: farmer.id,
              workerName: farmer.name,
              workerIcon: farmer.icon,
              action: `hat ${seed.name} gepflanzt`,
            });
          }
          
          // Auto-harvest ready plants
          const harvestableSlots = get().cocaGrowSlots.filter(s => s.stage === 'harvest' && s.seed);
          for (const slot of harvestableSlots) {
            const seed = slot.seed!;
            const yieldBonusLevel = get().cocaUpgrades.find(u => u.id === 'coca-soil')?.level ?? 0;
            const yieldMultiplier = (1 + yieldBonusLevel * 0.10) * farmerBonus;
            const baseGrams = seed.baseYield * yieldMultiplier;
            const actualGrams = Math.floor(baseGrams * (0.9 + Math.random() * 0.2));
            
            const rarityQuality: Record<CocaRarity, number> = {
              common: 50, uncommon: 65, rare: 75, epic: 85, legendary: 95,
            };
            const quality = Math.min(100, rarityQuality[seed.rarity] + Math.floor(Math.random() * 10));
            
            const newLeaves: CocaLeaves = {
              id: `coca-leaves-${Date.now()}-${slot.id}`,
              strainName: seed.name,
              rarity: seed.rarity,
              grams: actualGrams,
              quality,
            };
            
            // Seed drop chance
            const seedDropChance = 0.4;
            const droppedSeed = Math.random() < seedDropChance ? { ...seed, id: `coca-seed-${Date.now()}-${slot.id}` } : null;
            
            set((s) => ({
              cocaGrowSlots: s.cocaGrowSlots.map(sl =>
                sl.id === slot.id
                  ? { ...sl, seed: null, plantId: null, stage: 'seed' as CocaPlantStage, progress: 0 }
                  : sl
              ),
              cocaLeaves: [...s.cocaLeaves, newLeaves],
              cocaSeeds: droppedSeed ? [...s.cocaSeeds, droppedSeed] : s.cocaSeeds,
              totalCocaHarvests: s.totalCocaHarvests + 1,
            }));
            
            get().addCocaActivityLog({
              workerId: farmer.id,
              workerName: farmer.name,
              workerIcon: farmer.icon,
              action: `hat ${actualGrams}g ${seed.name} Blätter geerntet`,
              amount: actualGrams,
            });
          }
        }
        
        // PROCESSOR: Auto-process leaves through all stations
        if (processor) {
          const processorBonus = 1 + (processor.level - 1) * 0.1;
          const stations = get().processingStations.filter(s => s.isUnlocked);
          
          for (const station of stations) {
            // If station is idle, start processing
            if (!station.currentProduct) {
              let inputMaterial: CocaLeaves | CocaProduct | undefined;
              
              if (station.inputStage === 'leaves') {
                inputMaterial = get().cocaLeaves[0];
              } else {
                inputMaterial = get().cocaProducts.find(p => p.stage === station.inputStage);
              }
              
              if (inputMaterial) {
                const success = get().startProcessing(station.id, inputMaterial.id);
                if (success) {
                  get().addCocaActivityLog({
                    workerId: processor.id,
                    workerName: processor.name,
                    workerIcon: processor.icon,
                    action: `hat ${inputMaterial.strainName} in ${station.name} gestartet`,
                  });
                }
              }
            }
            
            // Auto-collect nur wenn Progress >= 105%, damit User Zeit hat manuell zu sammeln
            const currentStation = get().processingStations.find(s => s.id === station.id);
            if (currentStation && currentStation.progress >= 105 && currentStation.currentProduct) {
              const product = get().collectProcessed(station.id);
              if (product) {
                get().addCocaActivityLog({
                  workerId: processor.id,
                  workerName: processor.name,
                  workerIcon: processor.icon,
                  action: `hat ${product.grams}g ${product.stage} hergestellt (${product.purity}% rein)`,
                  amount: product.grams,
                });
              }
            }
          }
        }
      },
    }),
    {
      name: 'coca-lab-save',
      version: 6,
      migrate: (persistedState: any, version: number) => {
        // Always ensure all COCA_WORKERS are in the state
        const existingWorkers = persistedState.cocaWorkers || [];
        const mergedWorkers = COCA_WORKERS.map(templateWorker => {
          const existingWorker = existingWorkers.find((w: any) => w.id === templateWorker.id);
          if (existingWorker) {
            // Preserve owned, paused, level from existing worker but use template for new fields
            return {
              ...templateWorker,
              owned: existingWorker.owned ?? false,
              paused: existingWorker.paused ?? false,
              level: existingWorker.level ?? 1,
            };
          }
          return templateWorker;
        });
        
        return {
          ...persistedState,
          cocaActivityLogs: persistedState.cocaActivityLogs || [],
          cocaDealerLastActivityAt: persistedState.cocaDealerLastActivityAt || {},
          cocaWorkers: mergedWorkers,
        };
      },
    }
  )
);
