import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BusinessDrug = 'weed' | 'koks';

export interface Business {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  profitPerGameHour: number;
  minLevel: number;
  owned: boolean;
}

export interface WarehouseUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  capacity: number;
  cost: number;
  minLevel: number;
  owned: boolean;
}

export interface ShipmentLeg {
  name: string;
  durationMinutes: number;
}

export interface ImportContract {
  id: string;
  name: string;
  description: string;
  drug: BusinessDrug;
  icon: string;
  cost: number;
  minLevel: number;
  cooldownMinutes: number;
  minGrams: number;
  maxGrams: number;
  qualityRange: [number, number];
  route: ShipmentLeg[];
  owned: boolean;
  nextShipmentAt: number | null;
}

export type ShipmentStatus = 'enroute' | 'waiting';

export interface Shipment {
  id: string;
  contractId: string;
  name: string;
  drug: BusinessDrug;
  totalGrams: number;
  quality: number;
  route: ShipmentLeg[];
  legIndex: number;
  legProgressMinutes: number;
  status: ShipmentStatus;
  startedAtMinutes: number;
  etaMinutes: number;
  waitingSinceMinutes?: number;
}

export interface WarehouseLot {
  id: string;
  drug: BusinessDrug;
  grams: number;
  quality: number;
  origin: string;
  arrivedAtMinutes: number;
}

export interface BusinessLog {
  id: number;
  timestampMinutes: number;
  message: string;
  type: 'business' | 'contract' | 'shipment' | 'warehouse';
}

interface PurchaseResult {
  success: boolean;
  cost: number;
  error?: string;
}

export interface WarehouseSaleResult {
  gramsSold: number;
  averageQuality: number;
}

export interface BusinessState {
  businesses: Business[];
  warehouseUpgrades: WarehouseUpgrade[];
  importContracts: ImportContract[];
  shipments: Shipment[];
  warehouseLots: WarehouseLot[];
  warehouseCapacity: number;
  totalBusinessRevenue: number;
  businessLogs: BusinessLog[];

  buyBusiness: (businessId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  buyWarehouse: (upgradeId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  buyContract: (contractId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  tickBusiness: (deltaMinutes: number, gameMinutes: number, luckFactor: number) => { profit: number };
  sellWarehouseStock: (drug: BusinessDrug, grams: number) => WarehouseSaleResult;
}

const BUSINESS_LOG_LIMIT = 60;

const BUSINESS_CATALOG: Omit<Business, 'owned'>[] = [
  {
    id: 'corner-bodega',
    name: 'Bodega',
    description: 'Kleines Frontgeschaeft. Cashflow mit wenig Risiko.',
    icon: 'bodega',
    cost: 5000,
    profitPerGameHour: 120,
    minLevel: 2,
  },
  {
    id: 'car-wash',
    name: 'Car Wash',
    description: 'Saubere Rechnung, dreckiges Geld.',
    icon: 'car-wash',
    cost: 25000,
    profitPerGameHour: 420,
    minLevel: 6,
  },
  {
    id: 'night-club',
    name: 'Night Club',
    description: 'Lauter Beat, leiser Profit.',
    icon: 'club',
    cost: 120000,
    profitPerGameHour: 1600,
    minLevel: 12,
  },
  {
    id: 'logistics-shell',
    name: 'Logistikfirma',
    description: 'Deckung fuer Transporte und sichere Routen.',
    icon: 'logistics',
    cost: 280000,
    profitPerGameHour: 3600,
    minLevel: 18,
  },
];

const WAREHOUSE_CATALOG: Omit<WarehouseUpgrade, 'owned'>[] = [
  {
    id: 'warehouse-starter',
    name: 'Mini Lager',
    description: 'Erster kleiner Raum fuer Imports.',
    icon: 'mini',
    capacity: 500,
    cost: 15000,
    minLevel: 4,
  },
  {
    id: 'warehouse-local',
    name: 'Regional Lagerhaus',
    description: 'Mehr Platz, bessere Sicherung.',
    icon: 'regional',
    capacity: 2000,
    cost: 60000,
    minLevel: 8,
  },
  {
    id: 'warehouse-docks',
    name: 'Dock Lager',
    description: 'Direkt an der Lieferung. Grosse Kapazitaet.',
    icon: 'dock',
    capacity: 6000,
    cost: 200000,
    minLevel: 14,
  },
  {
    id: 'warehouse-fortress',
    name: 'Fort Lager',
    description: 'Endgame Storage fuer Grosslieferungen.',
    icon: 'fortress',
    capacity: 14000,
    cost: 650000,
    minLevel: 22,
  },
];

const ROUTE_CARIBBEAN: ShipmentLeg[] = [
  { name: 'Kingston Dock', durationMinutes: 120 },
  { name: 'Atlantic Route', durationMinutes: 180 },
  { name: 'Rotterdam Gate', durationMinutes: 160 },
  { name: 'Safehouse Hub', durationMinutes: 80 },
];

const ROUTE_MEDITERRANEAN: ShipmentLeg[] = [
  { name: 'Malta Pier', durationMinutes: 90 },
  { name: 'Tyrrhenian Run', durationMinutes: 140 },
  { name: 'Marseille Rail', durationMinutes: 140 },
  { name: 'Safehouse Hub', durationMinutes: 90 },
];

const ROUTE_ANDES: ShipmentLeg[] = [
  { name: 'Andes Airfield', durationMinutes: 100 },
  { name: 'Panama Channel', durationMinutes: 160 },
  { name: 'North Sea', durationMinutes: 180 },
  { name: 'Safehouse Hub', durationMinutes: 120 },
];

const ROUTE_CARTEL: ShipmentLeg[] = [
  { name: 'Cartel Valley', durationMinutes: 140 },
  { name: 'Pacific Run', durationMinutes: 220 },
  { name: 'Baltic Gate', durationMinutes: 200 },
  { name: 'Safehouse Hub', durationMinutes: 140 },
];

const CONTRACT_CATALOG: Omit<ImportContract, 'owned' | 'nextShipmentAt'>[] = [
  {
    id: 'caribbean-grow',
    name: 'Caribbean Grow',
    description: 'Hot-Climate Weed, solide Qualitaet.',
    drug: 'weed',
    icon: 'tropics',
    cost: 75000,
    minLevel: 8,
    cooldownMinutes: 360,
    minGrams: 220,
    maxGrams: 520,
    qualityRange: [55, 78],
    route: ROUTE_CARIBBEAN,
  },
  {
    id: 'mediterranean-haze',
    name: 'Mediterranean Haze',
    description: 'Premium Seeds, smoother Export.',
    drug: 'weed',
    icon: 'med',
    cost: 220000,
    minLevel: 14,
    cooldownMinutes: 720,
    minGrams: 650,
    maxGrams: 1400,
    qualityRange: [68, 88],
    route: ROUTE_MEDITERRANEAN,
  },
  {
    id: 'andes-koks',
    name: 'Andes Powder',
    description: 'Klassischer Koks-Flow aus den Bergen.',
    drug: 'koks',
    icon: 'andes',
    cost: 180000,
    minLevel: 12,
    cooldownMinutes: 600,
    minGrams: 320,
    maxGrams: 820,
    qualityRange: [62, 88],
    route: ROUTE_ANDES,
  },
  {
    id: 'cartel-mega',
    name: 'Cartel Mega Run',
    description: 'Grossproduktion. Riesige Mengen, hohes Risiko.',
    drug: 'koks',
    icon: 'cartel',
    cost: 650000,
    minLevel: 20,
    cooldownMinutes: 1440,
    minGrams: 1400,
    maxGrams: 2800,
    qualityRange: [70, 95],
    route: ROUTE_CARTEL,
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const getWarehouseUsed = (lots: WarehouseLot[]) =>
  lots.reduce((sum, lot) => sum + lot.grams, 0);

const rollQuality = (range: [number, number], luckFactor: number) => {
  const base = randomBetween(range[0], range[1]);
  const luckBoost = (range[1] - base) * luckFactor * (0.5 + Math.random());
  const variance = randomBetween(-3, 3);
  return clamp(Math.round(base + luckBoost + variance), range[0], 100);
};

const rollGrams = (min: number, max: number, luckFactor: number) => {
  const base = randomBetween(min, max);
  const luckBoost = 1 + luckFactor * randomBetween(0, 0.12);
  return Math.max(1, Math.floor(base * luckBoost));
};

const createShipment = (contract: ImportContract, gameMinutes: number, luckFactor: number): Shipment => {
  const totalMinutes = contract.route.reduce((sum, leg) => sum + leg.durationMinutes, 0);
  return {
    id: `shipment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    contractId: contract.id,
    name: contract.name,
    drug: contract.drug,
    totalGrams: rollGrams(contract.minGrams, contract.maxGrams, luckFactor),
    quality: rollQuality(contract.qualityRange, luckFactor),
    route: contract.route,
    legIndex: 0,
    legProgressMinutes: 0,
    status: 'enroute',
    startedAtMinutes: gameMinutes,
    etaMinutes: totalMinutes,
  };
};

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businesses: BUSINESS_CATALOG.map((business) => ({ ...business, owned: false })),
      warehouseUpgrades: WAREHOUSE_CATALOG.map((upgrade) => ({ ...upgrade, owned: false })),
      importContracts: CONTRACT_CATALOG.map((contract) => ({ ...contract, owned: false, nextShipmentAt: null })),
      shipments: [],
      warehouseLots: [],
      warehouseCapacity: 0,
      totalBusinessRevenue: 0,
      businessLogs: [],

      buyBusiness: (businessId, budcoins, playerLevel, gameMinutes) => {
        const state = get();
        const business = state.businesses.find(item => item.id === businessId);
        if (!business) return { success: false, cost: 0, error: 'Geschaeft nicht gefunden.' };
        if (business.owned) return { success: false, cost: 0, error: 'Bereits gekauft.' };
        if (playerLevel < business.minLevel) {
          return { success: false, cost: business.cost, error: `Level ${business.minLevel} benoetigt.` };
        }
        if (budcoins < business.cost) {
          return { success: false, cost: business.cost, error: 'Nicht genug Budcoins.' };
        }

        const logEntry: BusinessLog = {
          id: Date.now(),
          timestampMinutes: gameMinutes,
          message: `${business.name} gekauft. Cashflow aktiviert.`,
          type: 'business',
        };

        set({
          businesses: state.businesses.map(item => item.id === businessId ? { ...item, owned: true } : item),
          businessLogs: [logEntry, ...state.businessLogs].slice(0, BUSINESS_LOG_LIMIT),
        });

        return { success: true, cost: business.cost };
      },

      buyWarehouse: (upgradeId, budcoins, playerLevel, gameMinutes) => {
        const state = get();
        const upgrade = state.warehouseUpgrades.find(item => item.id === upgradeId);
        if (!upgrade) return { success: false, cost: 0, error: 'Lager nicht gefunden.' };
        if (upgrade.owned) return { success: false, cost: 0, error: 'Bereits gekauft.' };
        if (playerLevel < upgrade.minLevel) {
          return { success: false, cost: upgrade.cost, error: `Level ${upgrade.minLevel} benoetigt.` };
        }
        if (budcoins < upgrade.cost) {
          return { success: false, cost: upgrade.cost, error: 'Nicht genug Budcoins.' };
        }

        const logEntry: BusinessLog = {
          id: Date.now(),
          timestampMinutes: gameMinutes,
          message: `${upgrade.name} freigeschaltet. +${upgrade.capacity}g Kapazitaet.`,
          type: 'warehouse',
        };

        set({
          warehouseUpgrades: state.warehouseUpgrades.map(item =>
            item.id === upgradeId ? { ...item, owned: true } : item
          ),
          warehouseCapacity: state.warehouseCapacity + upgrade.capacity,
          businessLogs: [logEntry, ...state.businessLogs].slice(0, BUSINESS_LOG_LIMIT),
        });

        return { success: true, cost: upgrade.cost };
      },

      buyContract: (contractId, budcoins, playerLevel, gameMinutes) => {
        const state = get();
        const contract = state.importContracts.find(item => item.id === contractId);
        if (!contract) return { success: false, cost: 0, error: 'Vertrag nicht gefunden.' };
        if (contract.owned) return { success: false, cost: 0, error: 'Vertrag bereits aktiv.' };
        if (playerLevel < contract.minLevel) {
          return { success: false, cost: contract.cost, error: `Level ${contract.minLevel} benoetigt.` };
        }
        if (state.warehouseCapacity <= 0) {
          return { success: false, cost: contract.cost, error: 'Du brauchst ein Lagerhaus.' };
        }
        if (budcoins < contract.cost) {
          return { success: false, cost: contract.cost, error: 'Nicht genug Budcoins.' };
        }

        const nextShipmentAt = gameMinutes + Math.max(30, Math.floor(contract.cooldownMinutes * 0.25));
        const logEntry: BusinessLog = {
          id: Date.now(),
          timestampMinutes: gameMinutes,
          message: `${contract.name} aktiviert. Erste Lieferung unterwegs.`,
          type: 'contract',
        };

        set({
          importContracts: state.importContracts.map(item =>
            item.id === contractId ? { ...item, owned: true, nextShipmentAt } : item
          ),
          businessLogs: [logEntry, ...state.businessLogs].slice(0, BUSINESS_LOG_LIMIT),
        });

        return { success: true, cost: contract.cost };
      },

      tickBusiness: (deltaMinutes, gameMinutes, luckFactor) => {
        const safeDelta = Math.max(0, deltaMinutes);
        const state = get();
        let profit = 0;
        const ownedBusinesses = state.businesses.filter(item => item.owned);
        if (ownedBusinesses.length > 0) {
          profit = ownedBusinesses.reduce(
            (sum, business) => sum + (business.profitPerGameHour / 60) * safeDelta,
            0
          );
        }

        let importContracts = [...state.importContracts];
        let shipments = [...state.shipments];
        let warehouseLots = [...state.warehouseLots];
        let businessLogs = [...state.businessLogs];

        importContracts = importContracts.map(contract => {
          if (!contract.owned || contract.nextShipmentAt === null) return contract;
          if (gameMinutes < contract.nextShipmentAt) return contract;

          const shipment = createShipment(contract, gameMinutes, luckFactor);
          shipments.push(shipment);
          businessLogs.unshift({
            id: Date.now(),
            timestampMinutes: gameMinutes,
            message: `${contract.name} gestartet. ${shipment.totalGrams}g unterwegs.`,
            type: 'shipment',
          });

          return {
            ...contract,
            nextShipmentAt: gameMinutes + contract.cooldownMinutes,
          };
        });

        const hasCapacityFor = (grams: number) =>
          getWarehouseUsed(warehouseLots) + grams <= state.warehouseCapacity;

        const updatedShipments: Shipment[] = [];
        for (const shipment of shipments) {
          if (shipment.status === 'waiting') {
            if (hasCapacityFor(shipment.totalGrams)) {
              warehouseLots = [
                ...warehouseLots,
                {
                  id: `lot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  drug: shipment.drug,
                  grams: shipment.totalGrams,
                  quality: shipment.quality,
                  origin: shipment.name,
                  arrivedAtMinutes: gameMinutes,
                },
              ];
              businessLogs.unshift({
                id: Date.now(),
                timestampMinutes: gameMinutes,
                message: `${shipment.name} entladen. ${shipment.totalGrams}g im Lager.`,
                type: 'warehouse',
              });
            } else {
              updatedShipments.push(shipment);
            }
            continue;
          }

          let legIndex = shipment.legIndex;
          let legProgress = shipment.legProgressMinutes + safeDelta;

          while (legIndex < shipment.route.length && legProgress >= shipment.route[legIndex].durationMinutes) {
            legProgress -= shipment.route[legIndex].durationMinutes;
            legIndex += 1;
          }

          if (legIndex >= shipment.route.length) {
            if (hasCapacityFor(shipment.totalGrams)) {
              warehouseLots = [
                ...warehouseLots,
                {
                  id: `lot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                  drug: shipment.drug,
                  grams: shipment.totalGrams,
                  quality: shipment.quality,
                  origin: shipment.name,
                  arrivedAtMinutes: gameMinutes,
                },
              ];
              businessLogs.unshift({
                id: Date.now(),
                timestampMinutes: gameMinutes,
                message: `${shipment.name} angekommen. ${shipment.totalGrams}g im Lager.`,
                type: 'warehouse',
              });
            } else {
              updatedShipments.push({
                ...shipment,
                status: 'waiting',
                waitingSinceMinutes: shipment.waitingSinceMinutes ?? gameMinutes,
                legIndex: shipment.route.length - 1,
                legProgressMinutes: shipment.route[shipment.route.length - 1].durationMinutes,
              });
              businessLogs.unshift({
                id: Date.now(),
                timestampMinutes: gameMinutes,
                message: `${shipment.name} wartet auf Lagerplatz.`,
                type: 'shipment',
              });
            }
          } else {
            updatedShipments.push({
              ...shipment,
              legIndex,
              legProgressMinutes: legProgress,
            });
          }
        }

        if (businessLogs.length > BUSINESS_LOG_LIMIT) {
          businessLogs = businessLogs.slice(0, BUSINESS_LOG_LIMIT);
        }

        set({
          importContracts,
          shipments: updatedShipments,
          warehouseLots,
          totalBusinessRevenue: state.totalBusinessRevenue + Math.floor(profit),
          businessLogs,
        });

        return { profit };
      },

      sellWarehouseStock: (drug, grams) => {
        const state = get();
        const targetGrams = Math.max(0, Math.floor(grams));
        if (targetGrams <= 0) return { gramsSold: 0, averageQuality: 0 };

        let remaining = targetGrams;
        let totalTaken = 0;
        let totalQuality = 0;
        const updatedLots: WarehouseLot[] = [];

        for (const lot of state.warehouseLots) {
          if (lot.drug !== drug || remaining <= 0) {
            updatedLots.push(lot);
            continue;
          }

          const take = Math.min(lot.grams, remaining);
          remaining -= take;
          totalTaken += take;
          totalQuality += take * lot.quality;

          if (lot.grams > take) {
            updatedLots.push({ ...lot, grams: lot.grams - take });
          }
        }

        if (totalTaken > 0) {
          set({ warehouseLots: updatedLots });
        }

        return {
          gramsSold: totalTaken,
          averageQuality: totalTaken > 0 ? Math.round(totalQuality / totalTaken) : 0,
        };
      },
    }),
    {
      name: 'business-save',
      version: 1,
    }
  )
);
