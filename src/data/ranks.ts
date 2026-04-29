/**
 * Career Rank system — sits on top of XP-based Level.
 *
 * Level = action XP, paces feature unlocks.
 * Rank  = career milestone, derived purely from cumulative game stats.
 *
 * Ranks are derived (not persisted) so saves stay backwards-compatible.
 */
import { useGameStore } from '@/store/gameStore';
import { useCustomerStore } from '@/store/customerStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { useBusinessStore } from '@/store/businessStore';

export type RankId =
  | 'homegrower'
  | 'street_dealer'
  | 'regular_supplier'
  | 'growroom_operator'
  | 'crew_boss'
  | 'turf_boss'
  | 'business_owner'
  | 'empire';

export interface RankRequirements {
  level?: number;
  totalHarvests?: number;
  totalGramsHarvested?: number;
  totalGramsSold?: number;
  totalSalesRevenue?: number;
  customers?: number;
  loyalCustomers?: number;
  vipCustomers?: number;
  workers?: number;
  territoriesControlled?: number;
  businessesOwned?: number;
  warehouseCapacity?: number;
}

export interface RankDef {
  id: RankId;
  name: string;
  description: string;
  unlockText: string;
  icon: string;
  /** Tailwind text color class for UI accents. */
  color: string;
  requirements: RankRequirements;
  reward?: {
    budcoins?: number;
    gems?: number;
    skillPoints?: number;
    label: string;
  };
}

export const RANKS: RankDef[] = [
  {
    id: 'homegrower',
    name: 'Homegrower',
    description: 'Erste Pflanze, erste Ernte. Dein Hobby beginnt.',
    unlockText: 'Spiele dein erstes Game.',
    icon: '🌱',
    color: 'text-emerald-300',
    requirements: { level: 1 },
  },
  {
    id: 'street_dealer',
    name: 'Street Dealer',
    description: 'Du bewegst Ware auf der Straße.',
    unlockText: '10 Ernten und 150g verkauft.',
    icon: '🛵',
    color: 'text-cyan-300',
    requirements: { totalHarvests: 10, totalGramsSold: 150 },
    reward: { budcoins: 750, label: '+750 $ Starter-Boost' },
  },
  {
    id: 'regular_supplier',
    name: 'Regular Supplier',
    description: 'Stamm-Kunden zählen auf dich.',
    unlockText: '4 Kunden, 1.000g verkauft, Level 5.',
    icon: '📦',
    color: 'text-sky-300',
    requirements: { customers: 4, totalGramsSold: 1000, level: 5 },
    reward: { budcoins: 2500, label: '+2.500 $' },
  },
  {
    id: 'growroom_operator',
    name: 'Growroom Operator',
    description: 'Echte Produktion, echtes Volumen.',
    unlockText: '100 Ernten, 10.000g geerntet, 1 Worker.',
    icon: '🏭',
    color: 'text-primary',
    requirements: { totalHarvests: 100, totalGramsHarvested: 10000, workers: 1 },
    reward: { budcoins: 8000, skillPoints: 1, label: '+8.000 $ & +1 Skill Point' },
  },
  {
    id: 'crew_boss',
    name: 'Crew Boss',
    description: 'Eine ganze Crew arbeitet für dich.',
    unlockText: '3 Worker, 10 Loyale Kunden, 50.000 $ Umsatz.',
    icon: '👔',
    color: 'text-secondary',
    requirements: { workers: 3, loyalCustomers: 10, totalSalesRevenue: 50000 },
    reward: { budcoins: 25000, skillPoints: 1, label: '+25.000 $ & +1 Skill Point' },
  },
  {
    id: 'turf_boss',
    name: 'Turf Boss',
    description: 'Du kontrollierst die Straßen.',
    unlockText: '2 Territorien kontrolliert, 3 VIP-Kunden, 200.000 $ Umsatz.',
    icon: '🗺️',
    color: 'text-neon-purple',
    requirements: { territoriesControlled: 2, vipCustomers: 3, totalSalesRevenue: 200000 },
    reward: { budcoins: 75000, gems: 5, label: '+75.000 $ & +5 Gems' },
  },
  {
    id: 'business_owner',
    name: 'Business Owner',
    description: 'Legitime Fronten, schmutziges Geld.',
    unlockText: '3 Businesses, 4 Territorien, 750.000 $ Umsatz.',
    icon: '🏢',
    color: 'text-amber-300',
    requirements: { businessesOwned: 3, territoriesControlled: 4, totalSalesRevenue: 750000 },
    reward: { budcoins: 200000, gems: 10, skillPoints: 2, label: '+200.000 $, +10 Gems & +2 Skill Points' },
  },
  {
    id: 'empire',
    name: 'Empire',
    description: 'Die Stadt gehört dir.',
    unlockText: '6 Businesses, 6 Territorien, 5 Mio $ Umsatz.',
    icon: '👑',
    color: 'text-neon-gold',
    requirements: { businessesOwned: 6, territoriesControlled: 6, totalSalesRevenue: 5000000 },
    reward: { budcoins: 1000000, gems: 50, skillPoints: 5, label: '+1.000.000 $, +50 Gems & +5 Skill Points' },
  },
];

export const RANK_BY_ID: Record<RankId, RankDef> = RANKS.reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<RankId, RankDef>
);

// ---------- Stats snapshot --------------------------------------------------

export interface RankStats {
  level: number;
  totalHarvests: number;
  totalGramsHarvested: number;
  totalGramsSold: number;
  totalSalesRevenue: number;
  customers: number;
  loyalCustomers: number;
  vipCustomers: number;
  workers: number;
  territoriesControlled: number;
  businessesOwned: number;
  warehouseCapacity: number;
}

/** Pull a fresh snapshot from all relevant stores. Cheap. */
export const getRankStats = (): RankStats => {
  const game = useGameStore.getState();
  const customer = useCustomerStore.getState();
  const territory = useTerritoryStore.getState();
  const business = useBusinessStore.getState();

  const customers = customer.customers ?? [];
  const loyalCustomers = customers.filter((c: any) => c.status === 'loyal' || c.status === 'vip').length;
  const vipCustomers = customers.filter((c: any) => c.status === 'vip').length;

  const territoriesControlled = (territory.territories ?? []).filter((t: any) => (t.control ?? 0) >= 25).length;
  const businessesOwned = (business.businesses ?? []).filter((b: any) => b.owned).length;
  const warehouseCapacity = business.warehouseCapacity ?? 0;
  const workers = (game.workers ?? []).filter((w: any) => w.owned).length;

  return {
    level: game.level ?? 1,
    totalHarvests: game.totalHarvests ?? 0,
    totalGramsHarvested: game.totalGramsHarvested ?? 0,
    totalGramsSold: game.totalGramsSold ?? 0,
    totalSalesRevenue: game.totalSalesRevenue ?? 0,
    customers: customers.length,
    loyalCustomers,
    vipCustomers,
    workers,
    territoriesControlled,
    businessesOwned,
    warehouseCapacity,
  };
};

// ---------- Helpers ---------------------------------------------------------

const REQ_KEYS: (keyof RankRequirements)[] = [
  'level',
  'totalHarvests',
  'totalGramsHarvested',
  'totalGramsSold',
  'totalSalesRevenue',
  'customers',
  'loyalCustomers',
  'vipCustomers',
  'workers',
  'territoriesControlled',
  'businessesOwned',
  'warehouseCapacity',
];

const REQ_LABEL: Record<keyof RankRequirements, string> = {
  level: 'Level',
  totalHarvests: 'Ernten',
  totalGramsHarvested: 'g geerntet',
  totalGramsSold: 'g verkauft',
  totalSalesRevenue: '$ Umsatz',
  customers: 'Kunden',
  loyalCustomers: 'Loyale Kunden',
  vipCustomers: 'VIP-Kunden',
  workers: 'Worker',
  territoriesControlled: 'Territorien (≥25%)',
  businessesOwned: 'Businesses',
  warehouseCapacity: 'Lager-Kapazität',
};

export const meetsRequirements = (req: RankRequirements, stats: RankStats): boolean => {
  return REQ_KEYS.every(k => {
    const need = req[k];
    if (need === undefined) return true;
    return (stats[k as keyof RankStats] ?? 0) >= need;
  });
};

export const isRankUnlocked = (rankId: RankId, stats: RankStats = getRankStats()): boolean => {
  const def = RANK_BY_ID[rankId];
  if (!def) return false;
  return meetsRequirements(def.requirements, stats);
};

/** Highest rank whose requirements are met. Falls back to Homegrower. */
export const getCurrentRank = (stats: RankStats = getRankStats()): RankDef => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (meetsRequirements(RANKS[i].requirements, stats)) return RANKS[i];
  }
  return RANKS[0];
};

/** Next rank above current, or null if at max. */
export const getNextRank = (stats: RankStats = getRankStats()): RankDef | null => {
  const current = getCurrentRank(stats);
  const idx = RANKS.findIndex(r => r.id === current.id);
  return RANKS[idx + 1] ?? null;
};

export interface RankRequirementProgress {
  key: keyof RankRequirements;
  label: string;
  current: number;
  needed: number;
  done: boolean;
  /** 0..1 */
  pct: number;
}

export interface RankProgress {
  current: RankDef;
  next: RankDef | null;
  /** Overall fraction toward next rank (avg of remaining requirements), 0..1. */
  overall: number;
  requirements: RankRequirementProgress[];
  /** Top requirements still to do (sorted: closest-to-done first). */
  checklist: RankRequirementProgress[];
}

export const getRankProgress = (stats: RankStats = getRankStats()): RankProgress => {
  const current = getCurrentRank(stats);
  const next = getNextRank(stats);

  if (!next) {
    return { current, next: null, overall: 1, requirements: [], checklist: [] };
  }

  const requirements: RankRequirementProgress[] = REQ_KEYS
    .filter(k => next.requirements[k] !== undefined)
    .map(k => {
      const needed = next.requirements[k] as number;
      const cur = stats[k as keyof RankStats] ?? 0;
      const pct = needed > 0 ? Math.min(1, cur / needed) : 1;
      return {
        key: k,
        label: REQ_LABEL[k],
        current: cur,
        needed,
        done: cur >= needed,
        pct,
      };
    });

  const overall = requirements.length
    ? requirements.reduce((s, r) => s + r.pct, 0) / requirements.length
    : 0;

  // Checklist: open items first (closest to done), then completed; cap at 4.
  const open = requirements.filter(r => !r.done).sort((a, b) => b.pct - a.pct);
  const done = requirements.filter(r => r.done);
  const checklist = [...open, ...done].slice(0, 4);

  return { current, next, overall, requirements, checklist };
};

/** Format human-readable requirement summary, e.g. "5 Kunden · 1.500g verkauft · Level 5". */
export const formatRequirements = (req: RankRequirements): string => {
  return REQ_KEYS
    .filter(k => req[k] !== undefined)
    .map(k => {
      const v = req[k] as number;
      const label = REQ_LABEL[k];
      if (k === 'level') return `Level ${v}`;
      if (k === 'totalSalesRevenue') return `${v.toLocaleString('de-DE')} $`;
      return `${v.toLocaleString('de-DE')} ${label}`;
    })
    .join(' · ');
};
