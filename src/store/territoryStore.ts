import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type TerritoryDealerType = 'street' | 'business';

export interface TerritoryDealerPower {
  id: string;
  level: number;
  type: TerritoryDealerType;
}

export type TerritoryDifficulty = 'very-easy' | 'easy' | 'medium' | 'hard';
export type CustomerDensity = 'low' | 'medium' | 'high' | 'very-high';
export type TerritoryBonusType =
  | 'sales-multiplier'
  | 'heat-reduction'
  | 'import-speed'
  | 'cost-reduction'
  | 'customer-boost';

export interface TerritoryBonus {
  id: string;
  type: TerritoryBonusType;
  drug?: 'weed' | 'koks' | 'meth' | 'all';
  value: number;
  description: string;
  icon: string;
}

export type CustomerArchetype = 'student' | 'professional' | 'partygoer' | 'worker' | 'wholesaler' | 'wealthy';
export type TerritoryDemandRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface TerritoryIdentity {
  /** Short tagline shown in UI */
  demandProfile: string;
  /** Drugs that thrive here. Order = priority. */
  preferredDrugTypes: Array<'weed' | 'koks' | 'meth'>;
  /** Bud rarities customers in this territory tend to ask for */
  preferredRarities: TerritoryDemandRarity[];
  /** Trait names that score better here */
  preferredTraits: string[];
  /** Multiplier on order grams (1 = baseline). Stack-multiplied across territories. */
  averageOrderSizeModifier: number;
  /** Multiplier on customer maxPrice (1 = baseline). Stack-multiplied. */
  priceModifier: number;
  /** Customer archetype weights for prospect generation (relative weights) */
  customerTypeWeights: Partial<Record<CustomerArchetype, number>>;
  /** Recommended player level to invest here */
  minReputationRequired?: number;
  /** Strategy hint shown in UI */
  suggestedStrategy: string;
  /** Recommended dealer slot count */
  recommendedDealers: number;
}

export interface Territory {
  id: string;
  name: string;
  icon: string;
  description: string;
  customerDensity: CustomerDensity;
  difficulty: TerritoryDifficulty;
  heatModifier: number;
  control: number;
  assignedDealerIds: string[];
  nextContestAt: number;
  fortified: boolean;
  lastContestResult: 'win' | 'lose' | null;
  passiveIncome: number;
  bonuses: TerritoryBonus[];
  /** Optional in older saves; migration always backfills. */
  identity?: TerritoryIdentity;
}

export interface TerritoryContestEvent {
  territoryId: string;
  territoryName: string;
  result: 'win' | 'lose';
  controlChange: number;
}

interface TerritoryState {
  territories: Territory[];
  totalPassiveIncome: number;
  totalUpkeepCost: number;
  assignDealer: (territoryId: string, dealerId: string) => { success: boolean; message?: string };
  unassignDealer: (territoryId: string, dealerId: string) => void;
  fortifyTerritory: (territoryId: string, budcoins: number) => { success: boolean; message?: string };
  runTerritoryTick: (
    deltaMinutes: number,
    gameMinutes: number,
    dealers: TerritoryDealerPower[]
  ) => { events: TerritoryContestEvent[]; passiveIncome: number; upkeepCost: number };
  runContest: (
    territoryId: string,
    dealers: TerritoryDealerPower[]
  ) => { result: 'win' | 'lose'; controlChange: number };
  getActiveBonuses: () => TerritoryBonus[];
}

const TERRITORY_CATALOG: Omit<Territory, 'control' | 'assignedDealerIds' | 'nextContestAt' | 'fortified' | 'lastContestResult'>[] = [
  {
    id: 'university',
    name: 'University',
    icon: '🎓',
    description: 'Student-heavy area with high weed demand.',
    customerDensity: 'high',
    difficulty: 'easy',
    heatModifier: -20,
    passiveIncome: 500,
    bonuses: [
      { id: 'weed-boost', type: 'sales-multiplier', drug: 'weed', value: 30, description: '+30% Weed Sales', icon: '🌿' },
      { id: 'heat-reduction', type: 'heat-reduction', value: 20, description: '-20% Heat Generation', icon: '❄️' },
      { id: 'student-boost', type: 'customer-boost', value: 15, description: '+15 Customers (Students)', icon: '🎓' },
    ],
  },
  {
    id: 'docks',
    name: 'Docks',
    icon: '🚢',
    description: 'Import hub with fast shipments but high heat.',
    customerDensity: 'low',
    difficulty: 'hard',
    heatModifier: 40,
    passiveIncome: 1200,
    bonuses: [
      { id: 'import-speed', type: 'import-speed', value: 50, description: '+50% Import Speed', icon: '⚡' },
      { id: 'contract-discount', type: 'cost-reduction', value: 15, description: '-15% Contract Costs', icon: '💸' },
    ],
  },
  {
    id: 'downtown',
    name: 'Downtown',
    icon: '🏙️',
    description: 'Financial district with wealthy customers.',
    customerDensity: 'medium',
    difficulty: 'medium',
    heatModifier: 30,
    passiveIncome: 800,
    bonuses: [
      { id: 'price-boost', type: 'sales-multiplier', drug: 'all', value: 20, description: '+20% ALL Drug Prices', icon: '💰' },
      { id: 'spending-boost', type: 'customer-boost', value: 10, description: '+10% Customer Spending Power', icon: '🏦' },
    ],
  },
  {
    id: 'nightlife',
    name: 'Nightlife',
    icon: '🌃',
    description: 'Party district with high coca demand.',
    customerDensity: 'very-high',
    difficulty: 'medium',
    heatModifier: 15,
    passiveIncome: 1000,
    bonuses: [
      { id: 'coca-boost', type: 'sales-multiplier', drug: 'koks', value: 40, description: '+40% Coca Sales', icon: '❄️' },
      { id: 'party-boost', type: 'customer-boost', value: 20, description: '+20 Customers (Partygoers)', icon: '🎉' },
    ],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    icon: '🏭',
    description: 'Working class area with meth demand.',
    customerDensity: 'medium',
    difficulty: 'easy',
    heatModifier: 25,
    passiveIncome: 600,
    bonuses: [
      { id: 'meth-boost', type: 'sales-multiplier', drug: 'meth', value: 35, description: '+35% Meth Sales', icon: '🧪' },
      { id: 'worker-discount', type: 'cost-reduction', value: 20, description: '-20% Worker Upkeep', icon: '👷' },
    ],
  },
  {
    id: 'suburbs',
    name: 'Suburbs',
    icon: '🏡',
    description: 'Safe residential area with low heat.',
    customerDensity: 'low',
    difficulty: 'very-easy',
    heatModifier: -40,
    passiveIncome: 400,
    bonuses: [
      { id: 'heat-safe-haven', type: 'heat-reduction', value: 40, description: '-40% Heat (Safe Haven)', icon: '🛡️' },
      { id: 'sales-boost', type: 'sales-multiplier', drug: 'all', value: 10, description: '+10% ALL Sales', icon: '📈' },
      { id: 'vip-boost', type: 'customer-boost', value: 5, description: '+5 VIP Customers', icon: '⭐' },
    ],
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getControlTierPercent = (control: number) => {
  if (control >= 100) return 100;
  if (control >= 75) return 75;
  if (control >= 50) return 50;
  if (control >= 25) return 25;
  return 0;
};

const getDifficultyBasePower = (difficulty: TerritoryDifficulty) => {
  switch (difficulty) {
    case 'very-easy':
      return 10;
    case 'easy':
      return 20;
    case 'medium':
      return 30;
    default:
      return 40;
  }
};

export const useTerritoryStore = create<TerritoryState>()(
  persist(
    (set, get) => ({
      territories: TERRITORY_CATALOG.map((territory) => ({
        ...territory,
        control: 0,
        assignedDealerIds: [],
        nextContestAt: 0,
        fortified: false,
        lastContestResult: null,
      })),
      totalPassiveIncome: 0,
      totalUpkeepCost: 0,

      assignDealer: (territoryId, dealerId) => {
        const state = get();
        const territory = state.territories.find(t => t.id === territoryId);
        if (!territory) return { success: false, message: 'Territory nicht gefunden.' };

        const alreadyAssigned = state.territories.some(t => t.assignedDealerIds.includes(dealerId));
        if (alreadyAssigned) {
          return { success: false, message: 'Dealer ist bereits zugewiesen.' };
        }

        set({
          territories: state.territories.map(t =>
            t.id === territoryId
              ? { ...t, assignedDealerIds: [...t.assignedDealerIds, dealerId] }
              : t
          ),
        });

        return { success: true };
      },

      unassignDealer: (territoryId, dealerId) => {
        set(state => ({
          territories: state.territories.map(t =>
            t.id === territoryId
              ? { ...t, assignedDealerIds: t.assignedDealerIds.filter(id => id !== dealerId) }
              : t
          ),
        }));
      },

      fortifyTerritory: (territoryId, budcoins) => {
        if (budcoins < 5000) {
          return { success: false, message: 'Nicht genug BudCoins.' };
        }
        set(state => ({
          territories: state.territories.map(t =>
            t.id === territoryId ? { ...t, fortified: true } : t
          ),
        }));

        return { success: true };
      },

      runTerritoryTick: (deltaMinutes, gameMinutes, dealers) => {
        const safeDelta = Number.isFinite(deltaMinutes) ? Math.max(0, deltaMinutes) : 0;
        const state = get();
        const now = Date.now();
        const safeDealers = Array.isArray(dealers) ? dealers : [];

        let totalPassiveIncome = 0;
        let totalUpkeepCost = 0;
        const events: TerritoryContestEvent[] = [];

        const updatedTerritories = state.territories.map((territory) => {
          const assignedDealers = safeDealers.filter(dealer => territory.assignedDealerIds.includes(dealer.id));
          const controlGainPerHour = assignedDealers.reduce((sum, dealer) => {
            const basePower = dealer.level * 2;
            const typeMultiplier = dealer.type === 'street' ? 1.5 : 1.0;
            return sum + basePower * typeMultiplier;
          }, 0);
          const controlGain = (controlGainPerHour / 60) * safeDelta;
          const newControl = clamp(territory.control + controlGain, 0, 100);

          if (newControl >= 100) {
            totalPassiveIncome += (territory.passiveIncome / 60) * safeDelta;
          }
          totalUpkeepCost += (assignedDealers.length * 50 / 60) * safeDelta;

          let nextContestAt = territory.nextContestAt;
          let lastContestResult = territory.lastContestResult;
          let fortified = territory.fortified;

          if (nextContestAt <= 0 && newControl > 50 && assignedDealers.length > 0) {
            const hoursUntil = 6 + Math.random() * 6;
            nextContestAt = now + hoursUntil * 60 * 60 * 1000;
          }

          if (nextContestAt > 0 && now >= nextContestAt && newControl > 50) {
            const contest = get().runContest(territory.id, safeDealers);
            lastContestResult = contest.result;
            fortified = false;
            nextContestAt = now + (6 + Math.random() * 6) * 60 * 60 * 1000;
            events.push({
              territoryId: territory.id,
              territoryName: territory.name,
              result: contest.result,
              controlChange: contest.controlChange,
            });

            return {
              ...territory,
              control: clamp(newControl + contest.controlChange, 0, 100),
              nextContestAt,
              lastContestResult,
              fortified,
            };
          }

          return {
            ...territory,
            control: newControl,
            nextContestAt,
            lastContestResult,
            fortified,
          };
        });

        set({
          territories: updatedTerritories,
          totalPassiveIncome: totalPassiveIncome * 60,
          totalUpkeepCost: totalUpkeepCost * 60,
        });

        return { events, passiveIncome: totalPassiveIncome, upkeepCost: totalUpkeepCost };
      },

      runContest: (territoryId, dealers) => {
        const state = get();
        const territory = state.territories.find(t => t.id === territoryId);
        if (!territory) return { result: 'lose', controlChange: 0 };
        const safeDealers = Array.isArray(dealers) ? dealers : [];
        const assigned = safeDealers.filter(dealer => territory.assignedDealerIds.includes(dealer.id));
        const playerPower = assigned.reduce((sum, dealer) => sum + dealer.level * 2, 0);
        const fortifyBonus = territory.fortified ? 20 : 0;
        const totalPlayerPower = playerPower + fortifyBonus;

        const basePower = getDifficultyBasePower(territory.difficulty);
        const rivalPower = basePower + Math.random() * 20;

        if (totalPlayerPower >= rivalPower) {
          return { result: 'win', controlChange: 5 };
        }

        const loss = Math.floor((rivalPower - totalPlayerPower) / 2);
        return { result: 'lose', controlChange: -Math.min(loss, 15) };
      },

      getActiveBonuses: () => {
        const state = get();
        const activeBonuses: TerritoryBonus[] = [];

        state.territories.forEach(territory => {
          const tierPercent = getControlTierPercent(territory.control);
          if (tierPercent <= 0) return;
          territory.bonuses.forEach(bonus => {
            activeBonuses.push({
              ...bonus,
              value: (bonus.value * tierPercent) / 100,
            });
          });
        });

        return activeBonuses;
      },
    }),
    {
      name: 'territory-control-save',
      version: 1,
    }
  )
);
