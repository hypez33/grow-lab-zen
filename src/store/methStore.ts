import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MethStage = 'maceration' | 'oxidation' | 'crystallization' | 'ready';

export interface MethRecipe {
  id: string;
  name: string;
  description: string;
  precursorCost: number;
  baseGrams: number;
  purityRange: [number, number];
  qualityRange: [number, number];
  speedMultiplier: number;
}

export interface MethBatch {
  id: string;
  recipeId: string;
  recipeName: string;
  stage: MethStage;
  grams: number;
  purity: number;
  quality: number;
}

export interface MethLabSlot {
  id: number;
  batch: MethBatch | null;
  progress: number;
  isUnlocked: boolean;
}

export interface MethProduct {
  id: string;
  recipeName: string;
  grams: number;
  purity: number;
  quality: number;
}

export interface MethCustomer {
  id: string;
  name: string;
  addiction: number;
  greed: number;
  lastPurchaseAt: number;
}

export interface MethActivityLog {
  id: number;
  timestamp: number;
  message: string;
  grams?: number;
  revenue?: number;
  customerName?: string;
  dealerName?: string;
  dealerIcon?: string;
  addiction?: number;
  greed?: number;
}

export interface MethDealer {
  id: string;
  name: string;
  icon: string;
  level: number;
  salesPerTick: number;
}

export interface MethDealerSale {
  dealerId: string;
  dealerName: string;
  dealerIcon: string;
  grams: number;
  revenue: number;
  productName: string;
  customerName: string;
  addiction: number;
  greed: number;
  message: string;
}

export const METH_RECIPES: MethRecipe[] = [
  {
    id: 'red-phosphorus',
    name: 'Red P',
    description: 'Hohe Ausbeute, mehr Hitze, stabile Qualitaet.',
    precursorCost: 3,
    baseGrams: 40,
    purityRange: [72, 90],
    qualityRange: [65, 88],
    speedMultiplier: 0.95,
  },
  {
    id: 'one-pot',
    name: 'One Pot',
    description: 'Schnell, dreckiger, aber guenstig.',
    precursorCost: 2,
    baseGrams: 28,
    purityRange: [55, 78],
    qualityRange: [50, 70],
    speedMultiplier: 1.2,
  },
  {
    id: 'cold-cook',
    name: 'Cold Cook',
    description: 'Langsam, sauberer, hohe Reinheit.',
    precursorCost: 4,
    baseGrams: 32,
    purityRange: [80, 96],
    qualityRange: [72, 95],
    speedMultiplier: 0.85,
  },
];

export const METH_SLOT_UNLOCK_BASE_COST = 20000;
export const METH_SLOT_UNLOCK_COST_SCALING = 1.8;
export const METH_PRECURSOR_COST = 750;
const MAX_METH_LOGS = 40;
const BASE_METH_PRICE = 140;

const STAGE_DURATIONS: Record<MethStage, number> = {
  maceration: 12,
  oxidation: 18,
  crystallization: 16,
  ready: 0,
};

const STAGE_FLOW: MethStage[] = ['maceration', 'oxidation', 'crystallization', 'ready'];

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const pickRandom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const METH_CUSTOMER_NAMES = [
  'Luis', 'Mara', 'Kenny', 'Tina', 'Jorge', 'Valerie', 'Rico', 'Mila',
  'Stefan', 'Kim', 'Joey', 'Luz', 'Nico', 'Viktor', 'Elli', 'Santos',
  'Nina', 'Ibrahim', 'Yara', 'Bruno',
];

const createInitialMethCustomers = (): MethCustomer[] =>
  METH_CUSTOMER_NAMES.slice(0, 12).map((name, index) => ({
    id: `meth-customer-${index}`,
    name,
    addiction: Math.floor(randomBetween(12, 35)),
    greed: Math.floor(randomBetween(8, 22)),
    lastPurchaseAt: 0,
  }));

const getQualityScore = (product: MethProduct) => (product.purity * 0.6 + product.quality * 0.4) / 100;

const pickWeightedCustomer = (customers: MethCustomer[]): MethCustomer => {
  if (customers.length === 0) {
    return {
      id: 'meth-customer-default',
      name: 'Unbekannt',
      addiction: 10,
      greed: 10,
      lastPurchaseAt: 0,
    };
  }

  const weights = customers.map((customer) => 1 + customer.addiction / 40 + customer.greed / 60);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < customers.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return customers[i];
    }
  }

  return customers[0];
};

const getMethSaleRevenue = (product: MethProduct, grams: number, customer: MethCustomer, dealerBonus = 1) => {
  const purityMultiplier = 0.6 + (product.purity / 100) * 1.6;
  const qualityMultiplier = 0.8 + (product.quality / 100) * 0.5;
  const addictionMultiplier = 0.85 + (customer.addiction / 100) * 0.55;
  const greedMultiplier = 0.9 + (customer.greed / 100) * 0.5;
  const pricePerGram = BASE_METH_PRICE * purityMultiplier * qualityMultiplier * addictionMultiplier * greedMultiplier * dealerBonus;
  return Math.max(1, Math.floor(grams * pricePerGram));
};

const applyCustomerCraving = (customer: MethCustomer, product: MethProduct, now: number) => {
  const qualityScore = getQualityScore(product);
  const addictionGain = Math.round(2 + qualityScore * 8 + Math.random() * 3);
  const greedGain = Math.round(1 + qualityScore * 6 + Math.random() * 2);

  return {
    updatedCustomer: {
      ...customer,
      addiction: clamp(customer.addiction + addictionGain, 0, 100),
      greed: clamp(customer.greed + greedGain, 0, 100),
      lastPurchaseAt: now,
    },
    addictionGain,
    greedGain,
  };
};

const buildMethSaleMessage = (product: MethProduct, grams: number, customer: MethCustomer, source: 'dealer' | 'direct') => {
  const prefix = source === 'dealer' ? 'Meth-Deal' : 'Direktverkauf';
  return `${prefix}: ${grams}g ${product.recipeName} an ${customer.name}`;
};

const createMethLogId = () => Date.now() + Math.floor(Math.random() * 1000);

const pickBestProductIndex = (products: MethProduct[]) => {
  let bestIndex = 0;
  let bestScore = -1;
  for (let i = 0; i < products.length; i += 1) {
    const score = products[i].purity + products[i].quality;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
};

export interface MethState {
  precursors: number;
  methSlots: MethLabSlot[];
  methInventory: MethProduct[];
  methCustomers: MethCustomer[];
  methActivityLogs: MethActivityLog[];
  totalMethCooked: number;
  totalMethSold: number;
  totalMethRevenue: number;

  buyPrecursors: (amount: number, budcoins: number) => { success: boolean; cost: number };
  unlockMethSlot: (slotId: number, budcoins: number) => { success: boolean; cost: number };
  startMethCook: (slotId: number, recipeId: string) => { success: boolean; error?: string };
  updateMethProgress: (delta: number) => void;
  collectMeth: (slotId: number) => MethProduct | null;
  sellMethProduct: (productId: string) => { success: boolean; revenue: number };
  addMethActivityLog: (log: Omit<MethActivityLog, 'id' | 'timestamp'>) => void;
  runMethDealerTick: (dealers: MethDealer[]) => { soldGrams: number; revenue: number; dealerSales: MethDealerSale[] };
}

const initialMethSlots: MethLabSlot[] = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  batch: null,
  progress: 0,
  isUnlocked: i === 0,
}));

export const useMethStore = create<MethState>()(
  persist(
    (set, get) => ({
      precursors: 4,
      methSlots: initialMethSlots,
      methInventory: [],
      methCustomers: createInitialMethCustomers(),
      methActivityLogs: [],
      totalMethCooked: 0,
      totalMethSold: 0,
      totalMethRevenue: 0,

      buyPrecursors: (amount, budcoins) => {
        const cost = METH_PRECURSOR_COST * amount;
        if (budcoins < cost) {
          return { success: false, cost };
        }
        set((state) => ({ precursors: state.precursors + amount }));
        return { success: true, cost };
      },

      unlockMethSlot: (slotId, budcoins) => {
        const state = get();
        const slot = state.methSlots.find(s => s.id === slotId);
        if (!slot || slot.isUnlocked) {
          return { success: false, cost: 0 };
        }

        const unlockedCount = state.methSlots.filter(s => s.isUnlocked).length;
        const cost = Math.floor(METH_SLOT_UNLOCK_BASE_COST * Math.pow(METH_SLOT_UNLOCK_COST_SCALING, Math.max(0, unlockedCount - 1)));
        if (budcoins < cost) {
          return { success: false, cost };
        }

        set((s) => ({
          methSlots: s.methSlots.map(m => (m.id === slotId ? { ...m, isUnlocked: true } : m)),
        }));
        return { success: true, cost };
      },

      startMethCook: (slotId, recipeId) => {
        const state = get();
        const slot = state.methSlots.find(s => s.id === slotId);
        if (!slot || !slot.isUnlocked) {
          return { success: false, error: 'Slot ist gesperrt.' };
        }
        if (slot.batch) {
          return { success: false, error: 'Slot ist bereits belegt.' };
        }

        const recipe = METH_RECIPES.find(r => r.id === recipeId);
        if (!recipe) {
          return { success: false, error: 'Rezept nicht gefunden.' };
        }
        if (state.precursors < recipe.precursorCost) {
          return { success: false, error: 'Nicht genug Precursors.' };
        }

        const purity = Math.floor(randomBetween(recipe.purityRange[0], recipe.purityRange[1]));
        const quality = Math.floor(randomBetween(recipe.qualityRange[0], recipe.qualityRange[1]));
        const grams = Math.floor(recipe.baseGrams * randomBetween(0.85, 1.2));

        const batch: MethBatch = {
          id: `meth-batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          recipeId: recipe.id,
          recipeName: recipe.name,
          stage: 'maceration',
          grams,
          purity: clamp(purity, 1, 100),
          quality: clamp(quality, 1, 100),
        };

        set((s) => ({
          precursors: s.precursors - recipe.precursorCost,
          methSlots: s.methSlots.map(m => (m.id === slotId ? { ...m, batch, progress: 0 } : m)),
        }));

        return { success: true };
      },

      updateMethProgress: (delta) => {
        const state = get();
        let updated = false;
        const methSlots = state.methSlots.map(slot => {
          if (!slot.batch || slot.batch.stage === 'ready') {
            return slot;
          }

          const recipe = METH_RECIPES.find(r => r.id === slot.batch!.recipeId);
          const speed = recipe?.speedMultiplier ?? 1;
          const stageDuration = STAGE_DURATIONS[slot.batch.stage] ?? STAGE_DURATIONS.maceration;
          const duration = stageDuration / speed;
          const progress = slot.progress + (delta / duration) * 100;

          if (progress < 100) {
            updated = true;
            return { ...slot, progress };
          }

          const nextStageIndex = STAGE_FLOW.indexOf(slot.batch.stage) + 1;
          const nextStage = STAGE_FLOW[Math.min(nextStageIndex, STAGE_FLOW.length - 1)];
          updated = true;
          return {
            ...slot,
            progress: nextStage === 'ready' ? 100 : 0,
            batch: { ...slot.batch, stage: nextStage },
          };
        });

        if (updated) {
          set({ methSlots });
        }
      },

      collectMeth: (slotId) => {
        const state = get();
        const slot = state.methSlots.find(s => s.id === slotId);
        if (!slot || !slot.batch || slot.batch.stage !== 'ready') {
          return null;
        }

        const product: MethProduct = {
          id: `meth-product-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          recipeName: slot.batch.recipeName,
          grams: slot.batch.grams,
          purity: slot.batch.purity,
          quality: slot.batch.quality,
        };

        set((s) => ({
          methInventory: [...s.methInventory, product],
          methSlots: s.methSlots.map(m => (m.id === slotId ? { ...m, batch: null, progress: 0 } : m)),
          totalMethCooked: s.totalMethCooked + product.grams,
        }));

        return product;
      },

      sellMethProduct: (productId) => {
        const state = get();
        const product = state.methInventory.find(p => p.id === productId);
        if (!product) {
          return { success: false, revenue: 0 };
        }

        const customer = pickWeightedCustomer(state.methCustomers);
        const now = Date.now();
        const logId = createMethLogId();
        const { updatedCustomer } = applyCustomerCraving(customer, product, now);
        const revenue = getMethSaleRevenue(product, product.grams, customer, 1);
        const logPayload: Omit<MethActivityLog, 'id' | 'timestamp'> = {
          message: buildMethSaleMessage(product, product.grams, customer, 'direct'),
          grams: product.grams,
          revenue,
          customerName: customer.name,
          addiction: updatedCustomer.addiction,
          greed: updatedCustomer.greed,
        };

        set((s) => {
          const customerIndex = s.methCustomers.findIndex(c => c.id === customer.id);
          const updatedCustomers = customerIndex >= 0
            ? s.methCustomers.map((c, index) => (index === customerIndex ? updatedCustomer : c))
            : s.methCustomers;

          const newLog: MethActivityLog = {
            ...logPayload,
            id: logId,
            timestamp: now,
          };

          return {
            methInventory: s.methInventory.filter(p => p.id !== productId),
            totalMethSold: s.totalMethSold + product.grams,
            totalMethRevenue: s.totalMethRevenue + revenue,
            methCustomers: updatedCustomers,
            methActivityLogs: [newLog, ...s.methActivityLogs].slice(0, MAX_METH_LOGS),
          };
        });

        return { success: true, revenue };
      },

      addMethActivityLog: (log) => set((state) => {
        const now = Date.now();
        const logId = createMethLogId();
        const newLog: MethActivityLog = {
          ...log,
          id: logId,
          timestamp: now,
        };
        return {
          methActivityLogs: [newLog, ...state.methActivityLogs].slice(0, MAX_METH_LOGS),
        };
      }),

      runMethDealerTick: (dealers) => {
        const state = get();
        const activeDealers = dealers.filter(dealer => dealer.salesPerTick > 0);
        if (activeDealers.length === 0 || state.methInventory.length === 0) {
          return { soldGrams: 0, revenue: 0, dealerSales: [] };
        }

        let remainingInventory = [...state.methInventory];
        let updatedCustomers = [...state.methCustomers];
        let totalSoldGrams = 0;
        let totalRevenue = 0;
        const dealerSales: MethDealerSale[] = [];
        const newLogs: MethActivityLog[] = [];

        for (const dealer of activeDealers) {
          const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
          const salesToMake = Math.max(1, Math.floor(baseSales * 1.6));
          const dealerBonus = 1 + dealer.level * 0.08;

          for (let i = 0; i < salesToMake; i += 1) {
            if (remainingInventory.length === 0) break;
            const productIndex = pickBestProductIndex(remainingInventory);
            const product = remainingInventory[productIndex];
            if (!product) break;

            const customer = pickWeightedCustomer(updatedCustomers);
            const now = Date.now();
            const minDeal = 3 + Math.floor(dealer.level * 0.4);
            const maxDeal = 10 + Math.floor(dealer.level * 0.8);
            const dealGrams = Math.min(
              product.grams,
              Math.max(1, Math.floor(randomBetween(minDeal, maxDeal)))
            );
            const { updatedCustomer } = applyCustomerCraving(customer, product, now);
            const revenue = getMethSaleRevenue(product, dealGrams, customer, dealerBonus);
            const message = buildMethSaleMessage(product, dealGrams, customer, 'dealer');
            const logId = createMethLogId();

            totalSoldGrams += dealGrams;
            totalRevenue += revenue;
            if (dealGrams >= product.grams) {
              remainingInventory.splice(productIndex, 1);
            } else {
              remainingInventory[productIndex] = { ...product, grams: product.grams - dealGrams };
            }

            const customerIndex = updatedCustomers.findIndex(c => c.id === customer.id);
            if (customerIndex >= 0) {
              updatedCustomers = updatedCustomers.map((c, index) => (index === customerIndex ? updatedCustomer : c));
            }

            dealerSales.push({
              dealerId: dealer.id,
              dealerName: dealer.name,
              dealerIcon: dealer.icon,
              grams: dealGrams,
              revenue,
              productName: product.recipeName,
              customerName: customer.name,
              addiction: updatedCustomer.addiction,
              greed: updatedCustomer.greed,
              message,
            });

            newLogs.push({
              id: logId,
              timestamp: now,
              message,
              grams: dealGrams,
              revenue,
              customerName: customer.name,
              dealerName: dealer.name,
              dealerIcon: dealer.icon,
              addiction: updatedCustomer.addiction,
              greed: updatedCustomer.greed,
            });
          }
        }

        if (totalSoldGrams > 0) {
          set((s) => ({
            methInventory: remainingInventory,
            totalMethSold: s.totalMethSold + totalSoldGrams,
            totalMethRevenue: s.totalMethRevenue + totalRevenue,
            methCustomers: updatedCustomers,
            methActivityLogs: [...newLogs, ...s.methActivityLogs].slice(0, MAX_METH_LOGS),
          }));
        }

        return { soldGrams: totalSoldGrams, revenue: totalRevenue, dealerSales };
      },
    }),
    {
      name: 'meth-lab-save',
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState) return persistedState;
        if (version < 3 && Array.isArray(persistedState.methSlots)) {
          const stageMap: Record<string, MethStage> = {
            mixing: 'maceration',
            cooking: 'oxidation',
            crystallizing: 'crystallization',
            maceration: 'maceration',
            oxidation: 'oxidation',
            crystallization: 'crystallization',
            ready: 'ready',
          };
          persistedState.methSlots = persistedState.methSlots.map((slot: MethLabSlot) => {
            if (!slot.batch) return slot;
            const nextStage = stageMap[slot.batch.stage] ?? 'maceration';
            return {
              ...slot,
              batch: {
                ...slot.batch,
                stage: nextStage,
              },
            };
          });
        }
        return {
          ...persistedState,
          methCustomers: Array.isArray(persistedState.methCustomers)
            ? persistedState.methCustomers
            : createInitialMethCustomers(),
          methActivityLogs: Array.isArray(persistedState.methActivityLogs)
            ? persistedState.methActivityLogs
            : [],
        };
      },
    }
  )
);
