import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTerritoryStore } from '@/store/territoryStore';

export type MethStage = 'maceration' | 'oxidation' | 'crystallization' | 'ready';
export type MethLogType = 'sale' | 'dealer' | 'bonus' | 'risk' | 'info';

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
  purchases: number;
}

export interface MethActivityLog {
  id: number;
  timestamp: number;
  message: string;
  type?: MethLogType;
  detail?: string;
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

export type MethWorkerAbility = 'cook' | 'collect' | 'resupply';

export interface MethWorker {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  owned: boolean;
  paused: boolean;
  level: number;
  maxLevel: number;
  slotsManaged: number;
  abilities: MethWorkerAbility[];
}

const SALES_WINDOW_MS = 60 * 60 * 1000;

const pruneSalesWindow = (entries: Array<{ timestamp: number; revenue: number }>, now: number) =>
  entries.filter(entry => now - entry.timestamp <= SALES_WINDOW_MS);

const getTerritorySalesMultiplier = (drug: 'meth') => {
  const bonuses = useTerritoryStore.getState().getActiveBonuses();
  const totalBonus = bonuses
    .filter(bonus => bonus.type === 'sales-multiplier' && (bonus.drug === drug || bonus.drug === 'all'))
    .reduce((sum, bonus) => sum + bonus.value, 0);
  return 1 + totalBonus / 100;
};

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

export const METH_WORKERS: MethWorker[] = [
  {
    id: 'meth-assistant',
    name: 'Laborhelfer',
    description: 'Startet automatisch neue Kochen, sobald Slots frei sind.',
    icon: '🧪',
    cost: 25000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 6,
    slotsManaged: 1,
    abilities: ['cook'],
  },
  {
    id: 'crystal-collector',
    name: 'Kristallsammler',
    description: 'Sammelt fertige Batches automatisch ein.',
    icon: '💎',
    cost: 35000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 6,
    slotsManaged: 1,
    abilities: ['collect'],
  },
  {
    id: 'night-chemist',
    name: 'Nachtschicht-Chemiker',
    description: 'Sammelt fertige Ware und startet sofort neue Kochen.',
    icon: '🥼',
    cost: 90000,
    owned: false,
    paused: false,
    level: 1,
    maxLevel: 8,
    slotsManaged: 2,
    abilities: ['cook', 'collect'],
  },
];

export const METH_SLOT_UNLOCK_BASE_COST = 20000;
export const METH_SLOT_UNLOCK_COST_SCALING = 1.8;
export const METH_PRECURSOR_COST = 750;
const MAX_METH_LOGS = 40;
const BASE_METH_PRICE = 18;
const MAX_METH_PRICE_PER_GRAM = 100;

type MethDealEvent = {
  note: string;
  multiplier: number;
  logType: MethLogType;
};

type MethDealerProfile = {
  label: string;
  bonus: number;
  messages: string[];
};

export const METH_DEALER_PROFILES: Record<string, MethDealerProfile> = {
  'coca-mule': {
    label: 'Grenzlaeufer',
    bonus: 0.03,
    messages: [
      'wechselt mehrfach die Route',
      'tarnt die Ware als Reisegepaeck',
      'taucht kurz im Busdepot ab',
    ],
  },
  'cartel-sicario': {
    label: 'Hartes Durchgreifen',
    bonus: 0.08,
    messages: [
      'zieht die Kontrolle mit eiserner Hand durch',
      'schafft sofort Respekt am Spot',
      'raeumt Konkurrenz brutal aus dem Weg',
    ],
  },
  'corrupt-cop': {
    label: 'Schutzgeld',
    bonus: 0.06,
    messages: [
      'blockt Streifen mit einer Ausrede',
      'nimmt Schmiergeld und winkt durch',
      'stellt die Deals unter Polizeischutz',
    ],
  },
  'chemist-zombie': {
    label: 'Labor-Nerd',
    bonus: 0.04,
    messages: [
      'mischt saubere Portionen in der Pause',
      'optimiert die Mischung vor dem Drop',
      'liefert besonders reine Ware aus',
    ],
  },
  'ghost-dealer': {
    label: 'Schattennetz',
    bonus: 0.12,
    messages: [
      'bleibt unsichtbar und verteilt Stashes',
      'setzt Lockvogel-Treffpunkte',
      'taucht nur fuer die Uebergabe auf',
    ],
  },
  default: {
    label: 'Strassenkontakt',
    bonus: 0,
    messages: [
      'macht einen schnellen Buergersteig-Deal',
      'koordiniert die Uebergabe per Burner',
      'trifft sich hinter dem Block',
    ],
  },
};

const METH_DIRECT_DEAL_EVENTS: MethDealEvent[] = [
  { note: 'VIP-Tipp', multiplier: 1.15, logType: 'bonus' },
  { note: 'Schneller Tausch', multiplier: 1.05, logType: 'sale' },
  { note: 'Bargeld knapp', multiplier: 0.9, logType: 'risk' },
  { note: 'Zu viel Aufsehen', multiplier: 0.85, logType: 'risk' },
  { note: 'Neuer Stammkunde', multiplier: 1.08, logType: 'bonus' },
  { note: 'Routine-Deal', multiplier: 1, logType: 'sale' },
];

const METH_DEALER_DEAL_EVENTS: MethDealEvent[] = [
  { note: 'Hotspot brummt', multiplier: 1.12, logType: 'bonus' },
  { note: 'Streife in der Naehe', multiplier: 0.85, logType: 'risk' },
  { note: 'Schatten-Route', multiplier: 1.05, logType: 'dealer' },
  { note: 'Enger Zeitplan', multiplier: 0.92, logType: 'risk' },
  { note: 'Stammkunden-Boost', multiplier: 1.1, logType: 'bonus' },
  { note: 'Routine-Deal', multiplier: 1, logType: 'dealer' },
];

const METH_DIRECT_SALE_TEMPLATES = [
  'Direktverkauf: {grams}g {product} an {customer}',
  'Rueckbank-Deal: {grams}g {product} an {customer}',
  'Kaffeebecher-Tausch: {grams}g {product} an {customer}',
  'Fenster-Deal: {grams}g {product} an {customer}',
  'Gassen-Treffen: {grams}g {product} an {customer}',
];

const METH_DEALER_SALE_TEMPLATES = [
  'Meth-Deal: {grams}g {product} an {customer}',
  'Drop im Parkhaus: {grams}g {product} an {customer}',
  'Uebergabe im Hinterhof: {grams}g {product} an {customer}',
  'Hotspot-Deal: {grams}g {product} an {customer}',
  'Night-Run: {grams}g {product} an {customer}',
];

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
const fillMethSaleTemplate = (template: string, product: MethProduct, grams: number, customer: MethCustomer) => (
  template
    .replace('{grams}', `${grams}`)
    .replace('{product}', product.recipeName)
    .replace('{customer}', customer.name)
);
const buildMethSaleDetail = (styleNote?: string, outcomeNote?: string) => {
  const parts = [styleNote, outcomeNote].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(' | ') : undefined;
};
const capMethRevenue = (grams: number, revenue: number) => (
  Math.min(revenue, Math.floor(grams * MAX_METH_PRICE_PER_GRAM))
);

const METH_CUSTOMER_NAMES = [
  'Luis', 'Mara', 'Kenny', 'Tina', 'Jorge', 'Valerie', 'Rico', 'Mila',
  'Stefan', 'Kim', 'Joey', 'Luz', 'Nico', 'Viktor', 'Elli', 'Santos',
  'Nina', 'Ibrahim', 'Yara', 'Bruno',
];

const createInitialMethCustomers = (): MethCustomer[] => [];

const createInitialMethProspects = (): string[] => [...METH_CUSTOMER_NAMES];

const createMethCustomerId = () => `meth-customer-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createMethCustomer = (name: string): MethCustomer => ({
  id: createMethCustomerId(),
  name,
  addiction: Math.floor(randomBetween(6, 18)),
  greed: Math.floor(randomBetween(5, 14)),
  lastPurchaseAt: 0,
  purchases: 0,
});

const getQualityScore = (product: MethProduct) => (product.purity * 0.6 + product.quality * 0.4) / 100;

const pickWeightedCustomer = (customers: MethCustomer[]): MethCustomer => {
  if (customers.length === 0) {
    return {
      id: 'meth-customer-default',
      name: 'Unbekannt',
      addiction: 10,
      greed: 10,
      lastPurchaseAt: 0,
      purchases: 0,
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
  const cappedPrice = Math.min(MAX_METH_PRICE_PER_GRAM, pricePerGram);
  return Math.max(1, Math.floor(grams * cappedPrice));
};

const applyCustomerCraving = (customer: MethCustomer, product: MethProduct, now: number) => {
  const qualityScore = getQualityScore(product);
  const purchaseCount = Number.isFinite(customer.purchases) ? customer.purchases : 0;
  const addictionBoost = 1 + Math.min(0.65, purchaseCount * 0.05);
  const greedBoost = 1 + Math.min(0.35, purchaseCount * 0.03);
  const addictionGain = Math.round((2 + qualityScore * 8 + Math.random() * 3) * addictionBoost);
  const greedGain = Math.round((1 + qualityScore * 6 + Math.random() * 2) * greedBoost);

  return {
    updatedCustomer: {
      ...customer,
      addiction: clamp(customer.addiction + addictionGain, 0, 100),
      greed: clamp(customer.greed + greedGain, 0, 100),
      lastPurchaseAt: now,
      purchases: purchaseCount + 1,
    },
    addictionGain,
    greedGain,
  };
};

const buildMethSaleMessage = (
  product: MethProduct,
  grams: number,
  customer: MethCustomer,
  source: 'dealer' | 'direct',
  template?: string
) => {
  const templates = source === 'dealer' ? METH_DEALER_SALE_TEMPLATES : METH_DIRECT_SALE_TEMPLATES;
  const baseTemplate = template ?? pickRandom(templates);
  return fillMethSaleTemplate(baseTemplate, product, grams, customer);
};

const pickAutoCookRecipe = (availablePrecursors: number) => {
  const affordable = METH_RECIPES.filter(recipe => recipe.precursorCost <= availablePrecursors);
  if (affordable.length === 0) return null;
  return affordable.reduce((best, recipe) => {
    const recipeScore = recipe.baseGrams / recipe.precursorCost;
    const bestScore = best.baseGrams / best.precursorCost;
    if (recipeScore > bestScore) return recipe;
    if (recipeScore === bestScore && recipe.baseGrams > best.baseGrams) return recipe;
    return best;
  });
};

const createMethBatch = (recipe: MethRecipe): MethBatch => {
  const purity = Math.floor(randomBetween(recipe.purityRange[0], recipe.purityRange[1]));
  const quality = Math.floor(randomBetween(recipe.qualityRange[0], recipe.qualityRange[1]));
  const grams = Math.floor(recipe.baseGrams * randomBetween(0.85, 1.2));

  return {
    id: `meth-batch-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    recipeId: recipe.id,
    recipeName: recipe.name,
    stage: 'maceration',
    grams,
    purity: clamp(purity, 1, 100),
    quality: clamp(quality, 1, 100),
  };
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

const pickWorstProductIndex = (products: MethProduct[]) => {
  let worstIndex = 0;
  let worstScore = Number.POSITIVE_INFINITY;
  for (let i = 0; i < products.length; i += 1) {
    const score = products[i].purity + products[i].quality;
    if (score < worstScore) {
      worstScore = score;
      worstIndex = i;
    }
  }
  return worstIndex;
};

export interface MethState {
  precursors: number;
  methSlots: MethLabSlot[];
  methInventory: MethProduct[];
  methCustomers: MethCustomer[];
  methSamples: number;
  methProspects: string[];
  methActivityLogs: MethActivityLog[];
  methWorkers: MethWorker[];
  totalMethCooked: number;
  totalMethSold: number;
  totalMethRevenue: number;
  methSalesWindow: Array<{ timestamp: number; revenue: number }>;
  lastMethSalesMinute: number;

  buyPrecursors: (amount: number, budcoins: number) => { success: boolean; cost: number };
  unlockMethSlot: (slotId: number, budcoins: number) => { success: boolean; cost: number };
  startMethCook: (slotId: number, recipeId: string) => { success: boolean; error?: string };
  updateMethProgress: (delta: number) => void;
  collectMeth: (slotId: number) => MethProduct | null;
  sellMethProduct: (productId: string) => { success: boolean; revenue: number; error?: string };
  createMethSamples: (grams: number) => { success: boolean; grams: number; error?: string };
  acquireMethCustomer: () => { success: boolean; customer?: MethCustomer; error?: string };
  addMethActivityLog: (log: Omit<MethActivityLog, 'id' | 'timestamp'>) => void;
  runMethDealerTick: (dealers: MethDealer[]) => { soldGrams: number; revenue: number; dealerSales: MethDealerSale[] };
  buyMethWorker: (workerId: string, budcoins: number) => { success: boolean; cost: number };
  upgradeMethWorker: (workerId: string, budcoins: number) => { success: boolean; cost: number };
  toggleMethWorkerPause: (workerId: string) => void;
  runMethAutoWorkerTick: () => void;
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
      methSamples: 0,
      methProspects: createInitialMethProspects(),
      methActivityLogs: [],
      methWorkers: METH_WORKERS.map(worker => ({ ...worker })),
      totalMethCooked: 0,
      totalMethSold: 0,
      totalMethRevenue: 0,
      methSalesWindow: [],
      lastMethSalesMinute: 0,

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
          return { success: false, revenue: 0, error: 'Produkt nicht gefunden.' };
        }
        if (state.methCustomers.length === 0) {
          return { success: false, revenue: 0, error: 'Keine Kunden verfuegbar.' };
        }

        const customer = pickWeightedCustomer(state.methCustomers);
        const now = Date.now();
        const logId = createMethLogId();
        const { updatedCustomer } = applyCustomerCraving(customer, product, now);
        const directEvent = pickRandom(METH_DIRECT_DEAL_EVENTS);
        const directTemplate = pickRandom(METH_DIRECT_SALE_TEMPLATES);
        const territoryMultiplier = getTerritorySalesMultiplier('meth');
        const baseRevenue = getMethSaleRevenue(product, product.grams, customer, territoryMultiplier);
        const revenue = capMethRevenue(
          product.grams,
          Math.max(1, Math.floor(baseRevenue * directEvent.multiplier))
        );
        const detail = buildMethSaleDetail(undefined, directEvent.note);
        const logPayload: Omit<MethActivityLog, 'id' | 'timestamp'> = {
          message: buildMethSaleMessage(product, product.grams, customer, 'direct', directTemplate),
          type: directEvent.logType,
          detail,
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
            methSalesWindow: pruneSalesWindow(
              [...s.methSalesWindow, { timestamp: now, revenue }],
              now
            ),
            lastMethSalesMinute: now,
          };
        });

        return { success: true, revenue };
      },

      createMethSamples: (grams) => {
        const targetGrams = Math.max(0, Math.floor(grams));
        if (targetGrams <= 0) {
          return { success: false, grams: 0, error: 'Ungueltige Menge.' };
        }

        const state = get();
        const inventoryTotal = state.methInventory.reduce((sum, product) => sum + product.grams, 0);
        if (inventoryTotal < targetGrams) {
          return { success: false, grams: 0, error: 'Nicht genug Ware im Lager.' };
        }

        let remaining = targetGrams;
        const updatedInventory = [...state.methInventory];

        while (remaining > 0 && updatedInventory.length > 0) {
          const index = pickWorstProductIndex(updatedInventory);
          const product = updatedInventory[index];
          const take = Math.min(product.grams, remaining);
          remaining -= take;
          if (product.grams <= take) {
            updatedInventory.splice(index, 1);
          } else {
            updatedInventory[index] = { ...product, grams: product.grams - take };
          }
        }

        set((s) => ({
          methInventory: updatedInventory,
          methSamples: s.methSamples + targetGrams,
        }));

        return { success: true, grams: targetGrams };
      },

      acquireMethCustomer: () => {
        const state = get();
        if (state.methSamples <= 0) {
          return { success: false, error: 'Keine Samples verfuegbar.' };
        }
        if (state.methProspects.length === 0) {
          return { success: false, error: 'Keine Kunden in Sicht.' };
        }

        const pickIndex = Math.floor(Math.random() * state.methProspects.length);
        const name = state.methProspects[pickIndex];
        const newCustomer = createMethCustomer(name);
        const newProspects = state.methProspects.filter((_, index) => index !== pickIndex);
        const now = Date.now();

        set((s) => ({
          methCustomers: [...s.methCustomers, newCustomer],
          methProspects: newProspects,
          methSamples: s.methSamples - 1,
          methActivityLogs: [
            {
              id: createMethLogId(),
              timestamp: now,
              message: `Sample verteilt: ${newCustomer.name} ist jetzt Kunde.`,
              type: 'info',
              customerName: newCustomer.name,
              addiction: newCustomer.addiction,
              greed: newCustomer.greed,
            },
            ...s.methActivityLogs,
          ].slice(0, MAX_METH_LOGS),
        }));

        return { success: true, customer: newCustomer };
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

      buyMethWorker: (workerId, budcoins) => {
        const state = get();
        const worker = state.methWorkers.find(w => w.id === workerId);
        if (!worker || worker.owned) {
          return { success: false, cost: 0 };
        }
        if (budcoins < worker.cost) {
          return { success: false, cost: worker.cost };
        }
        set((s) => ({
          methWorkers: s.methWorkers.map(w => (w.id === workerId ? { ...w, owned: true } : w)),
        }));
        return { success: true, cost: worker.cost };
      },

      upgradeMethWorker: (workerId, budcoins) => {
        const state = get();
        const worker = state.methWorkers.find(w => w.id === workerId);
        if (!worker || !worker.owned || worker.level >= worker.maxLevel) {
          return { success: false, cost: 0 };
        }
        const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
        if (budcoins < upgradeCost) {
          return { success: false, cost: upgradeCost };
        }
        set((s) => ({
          methWorkers: s.methWorkers.map(w =>
            w.id === workerId ? { ...w, level: w.level + 1, slotsManaged: w.slotsManaged + 1 } : w
          ),
        }));
        return { success: true, cost: upgradeCost };
      },

      toggleMethWorkerPause: (workerId) => set((state) => ({
        methWorkers: state.methWorkers.map(w =>
          w.id === workerId && w.owned ? { ...w, paused: !w.paused } : w
        ),
      })),

      runMethAutoWorkerTick: () => set((state) => {
        const activeWorkers = state.methWorkers.filter(w => w.owned && !w.paused);
        if (activeWorkers.length === 0) return state;

        let methSlots = state.methSlots.map(slot => ({
          ...slot,
          batch: slot.batch ? { ...slot.batch } : null,
        }));
        let methInventory = [...state.methInventory];
        let precursors = state.precursors;
        let totalMethCooked = state.totalMethCooked;
        let didChange = false;

        for (const worker of activeWorkers) {
          const slotsToManage = Math.max(1, worker.slotsManaged + worker.level - 1);

          if (worker.abilities.includes('collect')) {
            let collected = 0;
            for (let i = 0; i < methSlots.length && collected < slotsToManage; i += 1) {
              const slot = methSlots[i];
              if (!slot.isUnlocked || !slot.batch || slot.batch.stage !== 'ready') continue;
              const batch = slot.batch;
              const product: MethProduct = {
                id: `meth-product-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                recipeName: batch.recipeName,
                grams: batch.grams,
                purity: batch.purity,
                quality: batch.quality,
              };
              methInventory.push(product);
              totalMethCooked += product.grams;
              methSlots[i] = { ...slot, batch: null, progress: 0 };
              collected += 1;
              didChange = true;
            }
          }

          if (worker.abilities.includes('cook')) {
            let started = 0;
            for (let i = 0; i < methSlots.length && started < slotsToManage; i += 1) {
              const slot = methSlots[i];
              if (!slot.isUnlocked || slot.batch) continue;
              const recipe = pickAutoCookRecipe(precursors);
              if (!recipe || precursors < recipe.precursorCost) break;
              const batch = createMethBatch(recipe);
              precursors -= recipe.precursorCost;
              methSlots[i] = { ...slot, batch, progress: 0 };
              started += 1;
              didChange = true;
            }
          }
        }

        if (!didChange) {
          return state;
        }

        return {
          ...state,
          methSlots,
          methInventory,
          precursors,
          totalMethCooked,
        };
      }),

      runMethDealerTick: (dealers) => {
        const state = get();
        const activeDealers = dealers.filter(dealer => dealer.salesPerTick > 0);
        if (activeDealers.length === 0 || state.methInventory.length === 0 || state.methCustomers.length === 0) {
          return { soldGrams: 0, revenue: 0, dealerSales: [] };
        }

        let remainingInventory = [...state.methInventory];
        let updatedCustomers = [...state.methCustomers];
        let totalSoldGrams = 0;
        let totalRevenue = 0;
        const dealerSales: MethDealerSale[] = [];
        const newLogs: MethActivityLog[] = [];
        const saleEntries: Array<{ timestamp: number; revenue: number }> = [];

        for (const dealer of activeDealers) {
          const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
          const salesToMake = Math.max(1, Math.floor(baseSales * 1.6));
          const profile = METH_DEALER_PROFILES[dealer.id] ?? METH_DEALER_PROFILES.default;
          const dealerBonus = 1 + dealer.level * 0.08 + profile.bonus;

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
            const dealerEvent = pickRandom(METH_DEALER_DEAL_EVENTS);
            const dealerTemplate = pickRandom(METH_DEALER_SALE_TEMPLATES);
            const styleNote = pickRandom(profile.messages);
            const detail = buildMethSaleDetail(styleNote, dealerEvent.note);
            const territoryMultiplier = getTerritorySalesMultiplier('meth');
            const baseRevenue = getMethSaleRevenue(product, dealGrams, customer, dealerBonus * territoryMultiplier);
            const revenue = capMethRevenue(
              dealGrams,
              Math.max(1, Math.floor(baseRevenue * dealerEvent.multiplier))
            );
            const message = buildMethSaleMessage(product, dealGrams, customer, 'dealer', dealerTemplate);
            const logId = createMethLogId();

            saleEntries.push({ timestamp: now, revenue });
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
              type: dealerEvent.logType,
              detail,
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
            methSalesWindow: saleEntries.length > 0
              ? pruneSalesWindow([...s.methSalesWindow, ...saleEntries], saleEntries[saleEntries.length - 1].timestamp)
              : s.methSalesWindow,
            lastMethSalesMinute: saleEntries.length > 0
              ? saleEntries[saleEntries.length - 1].timestamp
              : s.lastMethSalesMinute,
          }));
        }

        return { soldGrams: totalSoldGrams, revenue: totalRevenue, dealerSales };
      },
    }),
    {
      name: 'meth-lab-save',
      version: 6,
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
        const existingWorkers = Array.isArray(persistedState.methWorkers)
          ? persistedState.methWorkers
          : [];
        const mergedWorkers = METH_WORKERS.map((templateWorker) => {
          const existingWorker = existingWorkers.find((worker: MethWorker) => worker.id === templateWorker.id);
          if (existingWorker) {
            return {
              ...templateWorker,
              owned: existingWorker.owned ?? false,
              paused: existingWorker.paused ?? false,
              level: existingWorker.level ?? 1,
              slotsManaged: existingWorker.slotsManaged ?? templateWorker.slotsManaged,
            };
          }
          return templateWorker;
        });
        const rawCustomers = Array.isArray(persistedState.methCustomers)
          ? persistedState.methCustomers
          : [];
        const normalizedCustomers = rawCustomers.map((customer: MethCustomer) => ({
          ...customer,
          addiction: Number.isFinite(customer.addiction) ? customer.addiction : 0,
          greed: Number.isFinite(customer.greed) ? customer.greed : 0,
          lastPurchaseAt: Number.isFinite(customer.lastPurchaseAt) ? customer.lastPurchaseAt : 0,
          purchases: Number.isFinite(customer.purchases) ? customer.purchases : 0,
        }));
        if (version < 6) {
          if (!Array.isArray(persistedState.methSalesWindow)) {
            persistedState.methSalesWindow = [];
          }
          if (!Number.isFinite(persistedState.lastMethSalesMinute)) {
            persistedState.lastMethSalesMinute = 0;
          }
        }
        const knownNames = new Set(normalizedCustomers.map(customer => customer.name));
        const defaultProspects = METH_CUSTOMER_NAMES.filter(name => !knownNames.has(name));
        const storedProspects = Array.isArray(persistedState.methProspects)
          ? persistedState.methProspects.filter((name: any) => typeof name === 'string')
          : [];
        const mergedProspects = storedProspects.length > 0
          ? storedProspects.filter(name => !knownNames.has(name))
          : defaultProspects;
        const storedSamples = Number.isFinite(persistedState.methSamples) ? persistedState.methSamples : 0;

        return {
          ...persistedState,
          methCustomers: normalizedCustomers.length > 0 ? normalizedCustomers : createInitialMethCustomers(),
          methProspects: mergedProspects,
          methSamples: storedSamples,
          methActivityLogs: Array.isArray(persistedState.methActivityLogs)
            ? persistedState.methActivityLogs
            : [],
          methWorkers: mergedWorkers,
        };
      },
    }
  )
);
