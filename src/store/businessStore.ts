import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useTerritoryStore } from '@/store/territoryStore';

export type BusinessDrug = 'weed' | 'koks';
export type BusinessEventType = 'bonus-shipment' | 'premium-quality' | 'raid' | 'seizure';

export interface Business {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  profitPerGameHour: number;
  minLevel: number;
  owned: boolean;
  level: number;
  upgradeBaseCost: number;
  pausedUntilMinutes: number;
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

export interface BusinessEvent {
  id: number;
  type: BusinessEventType;
  timestampMinutes: number;
  message: string;
  profit: number;
  loss: number;
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
  businessEvents: BusinessEvent[];
  totalEvents: number;
  totalEventProfit: number;
  totalEventLoss: number;
  lastEventCheckMinutes: number;

  buyBusiness: (businessId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  upgradeBusiness: (businessId: string, budcoins: number, gameMinutes: number) => PurchaseResult;
  buyWarehouse: (upgradeId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  buyContract: (contractId: string, budcoins: number, playerLevel: number, gameMinutes: number) => PurchaseResult;
  dispatchContractShipment: (contractId: string, gameMinutes: number, luckFactor: number) => PurchaseResult;
  tickBusiness: (deltaMinutes: number, gameMinutes: number, luckFactor: number) => { profit: number; events: BusinessEvent[] };
  sellWarehouseStock: (drug: BusinessDrug, grams: number, preferBestQuality: boolean) => WarehouseSaleResult;
  triggerRandomEvent: (gameMinutes: number, luckFactor: number) => BusinessEvent[];
}

const BUSINESS_LOG_LIMIT = 60;
const BUSINESS_EVENT_LIMIT = 30;
const GAME_MINUTES_PER_HOUR = 60;
let businessLogCounter = 0;
let businessEventCounter = 0;

const createBusinessLogId = () => {
  businessLogCounter = (businessLogCounter + 1) % 1000;
  return Date.now() * 1000 + businessLogCounter;
};

const createBusinessEventId = () => {
  businessEventCounter = (businessEventCounter + 1) % 1000;
  return Date.now() * 1000 + businessEventCounter;
};

const BUSINESS_CATALOG: Omit<Business, 'owned' | 'level' | 'pausedUntilMinutes'>[] = [
  {
    id: 'corner-bodega',
    name: 'Bodega',
    description: 'Kleines Frontgeschaeft. Cashflow mit wenig Risiko.',
    icon: 'bodega',
    cost: 5000,
    profitPerGameHour: 120,
    upgradeBaseCost: 3000,
    minLevel: 2,
  },
  {
    id: 'car-wash',
    name: 'Car Wash',
    description: 'Saubere Rechnung, dreckiges Geld.',
    icon: 'car-wash',
    cost: 25000,
    profitPerGameHour: 420,
    upgradeBaseCost: 15000,
    minLevel: 6,
  },
  {
    id: 'night-club',
    name: 'Night Club',
    description: 'Lauter Beat, leiser Profit.',
    icon: 'club',
    cost: 120000,
    profitPerGameHour: 1600,
    upgradeBaseCost: 70000,
    minLevel: 12,
  },
  {
    id: 'logistics-shell',
    name: 'Logistikfirma',
    description: 'Deckung fuer Transporte und sichere Routen.',
    icon: 'logistics',
    cost: 280000,
    profitPerGameHour: 3600,
    upgradeBaseCost: 160000,
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

const getImportSpeedMultiplier = () => {
  const bonuses = useTerritoryStore.getState().getActiveBonuses();
  const totalBonus = bonuses
    .filter(bonus => bonus.type === 'import-speed')
    .reduce((sum, bonus) => sum + bonus.value, 0);
  return 1 + totalBonus / 100;
};

const getDrugBasePrice = (drug: BusinessDrug) => (drug === 'weed' ? 15 : 45);

const getPricePerGram = (drug: BusinessDrug, quality: number) =>
  getDrugBasePrice(drug) * (0.5 + (quality / 100) * 1.5);

const estimateLotValue = (drug: BusinessDrug, grams: number, quality: number) =>
  Math.max(0, Math.floor(grams * getPricePerGram(drug, quality)));

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

type BusinessEventResult = {
  events: BusinessEvent[];
  businesses: Business[];
  shipments: Shipment[];
  warehouseLots: WarehouseLot[];
  businessLogs: BusinessLog[];
  eventProfit: number;
  eventLoss: number;
};

const applyRandomBusinessEvent = (
  input: {
    businesses: Business[];
    shipments: Shipment[];
    warehouseLots: WarehouseLot[];
    businessLogs: BusinessLog[];
  },
  gameMinutes: number,
  luckFactor: number
): BusinessEventResult => {
  const positiveChance = Math.min(0.18, 0.1 + luckFactor * 0.12);
  const negativeChance = Math.max(0.02, 0.05 - luckFactor * 0.04);
  const roll = Math.random();

  let businesses = [...input.businesses];
  let shipments = [...input.shipments];
  let warehouseLots = [...input.warehouseLots];
  let businessLogs = [...input.businessLogs];
  const events: BusinessEvent[] = [];
  let eventProfit = 0;
  let eventLoss = 0;

  const pushEvent = (type: BusinessEventType, message: string, profit: number, loss: number, logType: BusinessLog['type']) => {
    const eventEntry: BusinessEvent = {
      id: createBusinessEventId(),
      type,
      timestampMinutes: gameMinutes,
      message,
      profit,
      loss,
    };
    events.push(eventEntry);
    businessLogs.unshift({
      id: createBusinessLogId(),
      timestampMinutes: gameMinutes,
      message,
      type: logType,
    });
    eventProfit += profit;
    eventLoss += loss;
  };

  const pickRandomShipment = () => {
    if (shipments.length === 0) return null;
    return shipments[Math.floor(Math.random() * shipments.length)];
  };

  const pickRandomLotIndex = () => {
    if (warehouseLots.length === 0) return -1;
    return Math.floor(Math.random() * warehouseLots.length);
  };

  const pickRandomBusinessIndex = () => {
    const candidates = businesses
      .map((business, index) => ({ business, index }))
      .filter(item => item.business.owned && item.business.pausedUntilMinutes <= gameMinutes);
    if (candidates.length === 0) return -1;
    return candidates[Math.floor(Math.random() * candidates.length)].index;
  };

  if (roll < positiveChance) {
    const outcomeRoll = Math.random();
    const shipment = pickRandomShipment();
    if (!shipment) {
      return { events, businesses, shipments, warehouseLots, businessLogs, eventProfit, eventLoss };
    }

    if (outcomeRoll < 0.34) {
      const bonusGrams = Math.max(1, Math.floor(shipment.totalGrams * 0.2));
      shipments = shipments.map(item =>
        item.id === shipment.id ? { ...item, totalGrams: item.totalGrams + bonusGrams } : item
      );
      const profit = estimateLotValue(shipment.drug, bonusGrams, shipment.quality);
      pushEvent('bonus-shipment', `🎉 Bonuslieferung: ${shipment.name} +${bonusGrams}g`, profit, 0, 'shipment');
    } else if (outcomeRoll < 0.67) {
      const newQuality = clamp(Math.round(shipment.quality + 15), 0, 100);
      const qualityGain = Math.max(0, newQuality - shipment.quality);
      shipments = shipments.map(item =>
        item.id === shipment.id ? { ...item, quality: newQuality } : item
      );
      const profit = estimateLotValue(shipment.drug, shipment.totalGrams, newQuality)
        - estimateLotValue(shipment.drug, shipment.totalGrams, shipment.quality);
      pushEvent('premium-quality', `💎 Premium-Qualitaet: ${shipment.name} +${qualityGain}%`, Math.max(0, profit), 0, 'shipment');
    } else {
      shipments = shipments.map(item => {
        if (item.id !== shipment.id) return item;
        const currentLeg = item.route[item.legIndex];
        if (!currentLeg) return item;
        const boostedProgress = Math.min(currentLeg.durationMinutes, item.legProgressMinutes + 30);
        return {
          ...item,
          etaMinutes: Math.max(0, item.etaMinutes - 30),
          legProgressMinutes: boostedProgress,
        };
      });
      pushEvent('bonus-shipment', `🚀 Express-Route: ${shipment.name} ist schneller unterwegs.`, 0, 0, 'shipment');
    }
  } else if (roll < positiveChance + negativeChance) {
    const outcomeRoll = Math.random();
    if (outcomeRoll < 0.4) {
      const businessIndex = pickRandomBusinessIndex();
      if (businessIndex < 0) {
        return { events, businesses, shipments, warehouseLots, businessLogs, eventProfit, eventLoss };
      }
      const pausedUntilMinutes = gameMinutes + 240;
      const target = businesses[businessIndex];
      businesses = businesses.map((item, index) =>
        index === businessIndex ? { ...item, pausedUntilMinutes } : item
      );
      pushEvent('raid', `🚔 Razzia bei ${target.name}. Geschaeft pausiert fuer 4h.`, 0, 0, 'business');
    } else if (outcomeRoll < 0.75) {
      const shipment = pickRandomShipment();
      if (!shipment) {
        return { events, businesses, shipments, warehouseLots, businessLogs, eventProfit, eventLoss };
      }
      shipments = shipments.filter(item => item.id !== shipment.id);
      const fullValue = estimateLotValue(shipment.drug, shipment.totalGrams, shipment.quality);
      const refund = Math.floor(fullValue * 0.5);
      const loss = Math.max(0, fullValue - refund);
      pushEvent('seizure', `📦 Beschlagnahmt: ${shipment.name} verloren. 50% Refund.`, refund, loss, 'shipment');
    } else {
      const lotIndex = pickRandomLotIndex();
      if (lotIndex < 0) {
        return { events, businesses, shipments, warehouseLots, businessLogs, eventProfit, eventLoss };
      }
      const lot = warehouseLots[lotIndex];
      const lossGrams = Math.max(1, Math.floor(lot.grams * 0.1));
      const lossValue = estimateLotValue(lot.drug, lossGrams, lot.quality);
      if (lot.grams <= lossGrams) {
        warehouseLots = warehouseLots.filter((_, index) => index !== lotIndex);
      } else {
        warehouseLots = warehouseLots.map((item, index) =>
          index === lotIndex ? { ...item, grams: item.grams - lossGrams } : item
        );
      }
      pushEvent('seizure', `🔥 Lagerschaden: ${lossGrams}g aus ${lot.origin} verloren.`, 0, lossValue, 'warehouse');
    }
  }

  return { events, businesses, shipments, warehouseLots, businessLogs, eventProfit, eventLoss };
};

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set, get) => ({
      businesses: BUSINESS_CATALOG.map((business) => ({
        ...business,
        owned: false,
        level: 1,
        pausedUntilMinutes: 0,
      })),
      warehouseUpgrades: WAREHOUSE_CATALOG.map((upgrade) => ({ ...upgrade, owned: false })),
      importContracts: CONTRACT_CATALOG.map((contract) => ({ ...contract, owned: false, nextShipmentAt: null })),
      shipments: [],
      warehouseLots: [],
      warehouseCapacity: 0,
      totalBusinessRevenue: 0,
      businessLogs: [],
      businessEvents: [],
      totalEvents: 0,
      totalEventProfit: 0,
      totalEventLoss: 0,
      lastEventCheckMinutes: 0,

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
          id: createBusinessLogId(),
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

      upgradeBusiness: (businessId, budcoins, gameMinutes) => {
        const state = get();
        const business = state.businesses.find(item => item.id === businessId);
        if (!business) return { success: false, cost: 0, error: 'Geschaeft nicht gefunden.' };
        if (!business.owned) return { success: false, cost: 0, error: 'Geschaeft nicht gekauft.' };

        // Upgrade cost increases exponentially with level
        const upgradeCost = Math.floor(business.upgradeBaseCost * Math.pow(1.5, business.level - 1));

        if (budcoins < upgradeCost) {
          return { success: false, cost: upgradeCost, error: 'Nicht genug Budcoins.' };
        }

        const newLevel = business.level + 1;
        const oldProfit = Math.floor(business.profitPerGameHour * (1 + (business.level - 1) * 0.15));
        const newProfit = Math.floor(business.profitPerGameHour * (1 + (newLevel - 1) * 0.15));

        const logEntry: BusinessLog = {
          id: Date.now(),
          timestampMinutes: gameMinutes,
          message: `${business.name} auf Lv.${newLevel} upgraded. Profit: ${oldProfit}$/h → ${newProfit}$/h`,
          type: 'business',
        };

        set({
          businesses: state.businesses.map(item =>
            item.id === businessId ? { ...item, level: newLevel } : item
          ),
          businessLogs: [logEntry, ...state.businessLogs].slice(0, BUSINESS_LOG_LIMIT),
        });

        return { success: true, cost: upgradeCost };
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
          id: createBusinessLogId(),
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
          id: createBusinessLogId(),
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

      dispatchContractShipment: (contractId, gameMinutes, luckFactor) => {
        const state = get();
        const contract = state.importContracts.find(item => item.id === contractId);
        if (!contract) return { success: false, cost: 0, error: 'Vertrag nicht gefunden.' };
        if (!contract.owned) return { success: false, cost: 0, error: 'Vertrag nicht aktiv.' };

        const readyAt = contract.nextShipmentAt ?? gameMinutes;
        if (gameMinutes < readyAt) {
          return { success: false, cost: 0, error: 'Lieferung noch nicht bereit.' };
        }

        const shipment = createShipment(contract, gameMinutes, luckFactor);
        const logEntry: BusinessLog = {
          id: createBusinessLogId(),
          timestampMinutes: gameMinutes,
          message: `${contract.name} manuell gestartet. ${shipment.totalGrams}g unterwegs.`,
          type: 'shipment',
        };

        set({
          importContracts: state.importContracts.map(item =>
            item.id === contractId ? { ...item, nextShipmentAt: gameMinutes + contract.cooldownMinutes } : item
          ),
          shipments: [...state.shipments, shipment],
          businessLogs: [logEntry, ...state.businessLogs].slice(0, BUSINESS_LOG_LIMIT),
        });

        return { success: true, cost: 0 };
      },

      triggerRandomEvent: (gameMinutes, luckFactor) => {
        const state = get();
        const result = applyRandomBusinessEvent(
          {
            businesses: state.businesses,
            shipments: state.shipments,
            warehouseLots: state.warehouseLots,
            businessLogs: state.businessLogs,
          },
          gameMinutes,
          luckFactor
        );

        if (result.events.length === 0) {
          return [];
        }

        set((s) => ({
          shipments: result.shipments,
          warehouseLots: result.warehouseLots,
          businesses: result.businesses,
          businessLogs: result.businessLogs.slice(0, BUSINESS_LOG_LIMIT),
          businessEvents: [...result.events, ...s.businessEvents].slice(0, BUSINESS_EVENT_LIMIT),
          totalEvents: s.totalEvents + result.events.length,
          totalEventProfit: s.totalEventProfit + result.eventProfit,
          totalEventLoss: s.totalEventLoss + result.eventLoss,
          lastEventCheckMinutes: gameMinutes,
        }));

        return result.events;
      },

      tickBusiness: (deltaMinutes, gameMinutes, luckFactor) => {
        const safeDelta = Math.max(0, deltaMinutes);
        const importSpeedMultiplier = getImportSpeedMultiplier();
        const shipmentDelta = safeDelta * importSpeedMultiplier;
        const state = get();
        const profit = 0;

        let businesses = state.businesses.map(business => (
          business.pausedUntilMinutes > 0 && business.pausedUntilMinutes <= gameMinutes
            ? { ...business, pausedUntilMinutes: 0 }
            : business
        ));
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
            id: createBusinessLogId(),
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
                id: createBusinessLogId(),
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
          let legProgress = shipment.legProgressMinutes + shipmentDelta;

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
                id: createBusinessLogId(),
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
                id: createBusinessLogId(),
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
          businesses,
          importContracts,
          shipments: updatedShipments,
          warehouseLots,
          totalBusinessRevenue: state.totalBusinessRevenue,
          businessLogs: businessLogs.slice(0, BUSINESS_LOG_LIMIT),
        });

        const currentHour = Math.floor(gameMinutes / GAME_MINUTES_PER_HOUR);
        const lastHour = Math.floor((state.lastEventCheckMinutes ?? 0) / GAME_MINUTES_PER_HOUR);
        if (currentHour <= lastHour) {
          return { profit, events: [] };
        }

        const events = get().triggerRandomEvent(gameMinutes, luckFactor);
        if (events.length === 0) {
          set({ lastEventCheckMinutes: gameMinutes });
        }

        return { profit, events };
      },

      sellWarehouseStock: (drug, grams, preferBestQuality) => {
        const state = get();
        const targetGrams = Math.max(0, Math.floor(grams));
        if (targetGrams <= 0) return { gramsSold: 0, averageQuality: 0 };

        let remaining = targetGrams;
        let totalTaken = 0;
        let totalQuality = 0;

        const saleLots = preferBestQuality
          ? state.warehouseLots
              .filter(lot => lot.drug === drug)
              .sort((a, b) => b.quality - a.quality)
          : state.warehouseLots.filter(lot => lot.drug === drug);
        const deductions = new Map<string, number>();

        for (const lot of saleLots) {
          if (remaining <= 0) break;
          const take = Math.min(lot.grams, remaining);
          remaining -= take;
          totalTaken += take;
          totalQuality += take * lot.quality;
          deductions.set(lot.id, take);
        }

        const updatedLots: WarehouseLot[] = [];
        for (const lot of state.warehouseLots) {
          const take = deductions.get(lot.id);
          if (!take) {
            updatedLots.push(lot);
            continue;
          }
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
      version: 4,
      migrate: (persistedState: any) => {
        const state = persistedState && typeof persistedState === 'object' ? persistedState : {};
        const existingBusinesses = Array.isArray(state.businesses) ? state.businesses : [];
        const existingUpgrades = Array.isArray(state.warehouseUpgrades) ? state.warehouseUpgrades : [];
        const existingContracts = Array.isArray(state.importContracts) ? state.importContracts : [];

        const businesses = BUSINESS_CATALOG.map((business) => {
          const existing = existingBusinesses.find((item: any) => item.id === business.id);
          return {
            ...business,
            owned: existing?.owned ?? false,
            level: Number.isFinite(existing?.level) && existing.level >= 1 ? existing.level : 1,
            pausedUntilMinutes: Number.isFinite(existing?.pausedUntilMinutes) ? existing.pausedUntilMinutes : 0,
          };
        });

        const warehouseUpgrades = WAREHOUSE_CATALOG.map((upgrade) => {
          const existing = existingUpgrades.find((item: any) => item.id === upgrade.id);
          return {
            ...upgrade,
            owned: existing?.owned ?? false,
          };
        });

        const importContracts = CONTRACT_CATALOG.map((contract) => {
          const existing = existingContracts.find((item: any) => item.id === contract.id);
          return {
            ...contract,
            owned: existing?.owned ?? false,
            nextShipmentAt: existing?.nextShipmentAt ?? null,
          };
        });

        const warehouseLots = Array.isArray(state.warehouseLots)
          ? state.warehouseLots
              .filter((lot: any) => lot && typeof lot === 'object' && typeof lot.drug === 'string')
              .map((lot: any) => ({
                ...lot,
                grams: Number.isFinite(lot.grams) ? lot.grams : 0,
                quality: Number.isFinite(lot.quality) ? lot.quality : 0,
                arrivedAtMinutes: Number.isFinite(lot.arrivedAtMinutes) ? lot.arrivedAtMinutes : 0,
              }))
          : [];

        const shipments = Array.isArray(state.shipments) ? state.shipments : [];
        const businessLogs = Array.isArray(state.businessLogs)
          ? state.businessLogs.slice(0, BUSINESS_LOG_LIMIT)
          : [];
        const businessEvents = Array.isArray(state.businessEvents)
          ? state.businessEvents.slice(0, BUSINESS_EVENT_LIMIT)
          : [];

        const persistedCapacity = Number.isFinite(state.warehouseCapacity) ? state.warehouseCapacity : 0;
        const computedCapacity = warehouseUpgrades
          .filter((upgrade) => upgrade.owned)
          .reduce((sum, upgrade) => sum + upgrade.capacity, 0);

        return {
          ...state,
          businesses,
          warehouseUpgrades,
          importContracts,
          shipments,
          warehouseLots,
          warehouseCapacity: Math.max(persistedCapacity, computedCapacity),
          totalBusinessRevenue: Number.isFinite(state.totalBusinessRevenue) ? state.totalBusinessRevenue : 0,
          businessLogs,
          businessEvents,
          totalEvents: Number.isFinite(state.totalEvents) ? state.totalEvents : 0,
          totalEventProfit: Number.isFinite(state.totalEventProfit) ? state.totalEventProfit : 0,
          totalEventLoss: Number.isFinite(state.totalEventLoss) ? state.totalEventLoss : 0,
          lastEventCheckMinutes: Number.isFinite(state.lastEventCheckMinutes) ? state.lastEventCheckMinutes : 0,
        };
      },
    }
  )
);
