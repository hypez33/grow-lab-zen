import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';
import { useMethStore } from '@/store/methStore';
import { useTerritoryStore } from '@/store/territoryStore';

export type DrugType = 'weed' | 'koks' | 'meth';
export type PersonalityType = 'casual' | 'adventurous' | 'paranoid' | 'hardcore';

export interface PurchaseRequest {
  id: string;
  timestamp: number;
  drug: DrugType;
  gramsRequested: number;
  maxPrice: number;
  expiresAt: number;
  urgency: 'low' | 'medium' | 'high' | 'desperate';
  message: string;
}

export interface MessageAction {
  id: string;
  label: string;
  type: 'accept-request' | 'counter-offer' | 'offer-drug' | 'ignore';
  payload?: {
    drug?: DrugType;
    grams?: number;
  };
}

export interface CustomerMessage {
  id: string;
  timestamp: number;
  from: 'customer' | 'player';
  message: string;
  type:
    | 'sample-request'
    | 'sample-response'
    | 'purchase'
    | 'purchase-request'
    | 'request'
    | 'offer'
    | 'complaint'
    | 'praise'
    | 'casual'
    | 'timeout'
    | 'timeout-angry'
    | 'drug-rejection'
    | 'drug-rejection-soft'
    | 'drug-rejection-angry'
    | 'drug-acceptance'
    | 'addiction-plea'
    | 'addiction-light'
    | 'addiction-medium'
    | 'addiction-desperate';
  read: boolean;
  actions?: MessageAction[];
  actionsUsed?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  avatar: string;
  loyalty: number;
  satisfaction: number;
  spendingPower: number;
  lastPurchaseAt: number;
  totalPurchases: number;
  totalSpent: number;
  preferredStrain: string | null;
  messages: CustomerMessage[];
  status: 'prospect' | 'active' | 'loyal' | 'vip';
  lastInactivityAt: number;
  drugPreferences: {
    weed: boolean;
    koks: boolean;
    meth: boolean;
  };
  addiction: {
    koks: number;
    meth: number;
  };
  pendingRequest: PurchaseRequest | null;
  requestHistory: PurchaseRequest[];
  personalityType: PersonalityType;
  nextRequestAtMinutes: number;
}

interface CustomerState {
  customers: Customer[];
  totalCustomerRevenue: number;
  nextProspectAtMinutes: number;

  addProspect: () => Customer | null;
  giveSample: (customerId: string, budId: string) => { success: boolean; message?: string };
  sellToCustomer: (
    customerId: string,
    budId: string,
    grams: number,
    customPrice?: number
  ) => { success: boolean; message?: string; revenue?: number };
  createPurchaseRequest: (customerId: string, drug: DrugType) => { success: boolean; reason?: string; request?: PurchaseRequest };
  fulfillRequest: (customerId: string, options?: { budId?: string }) => { success: boolean; message?: string; revenue?: number };
  offerDrug: (customerId: string, drug: 'koks' | 'meth', grams: number) => { success: boolean; reason?: string; revenue?: number; message?: string };
  sellHardDrug: (
    customerId: string,
    drug: 'koks' | 'meth',
    grams: number,
    productId?: string,
    customPrice?: number
  ) => { success: boolean; reason?: string; revenue?: number; message?: string };
  markCustomerRead: (customerId: string) => void;
  runCustomerTick: (gameMinutes: number) => void;
}

const SAMPLE_GRAMS = 0.5;
const INACTIVITY_MINUTES = 7 * 24 * 60;
const MAX_MESSAGES = 50;
const MAX_CUSTOMERS = 100;
const AUTO_PROSPECT_LIMIT = 50;
const BASE_WEED_PRICE = 15;
const BASE_KOKS_PRICE = 150;
const BASE_METH_PRICE = 80;
const REQUEST_COOLDOWN_MINUTES = 30;

const PERSONALITY_POOL: Array<{ type: PersonalityType; weight: number }> = [
  { type: 'casual', weight: 40 },
  { type: 'adventurous', weight: 30 },
  { type: 'paranoid', weight: 20 },
  { type: 'hardcore', weight: 10 },
];

const PERSONALITY_OPENERS: Record<PersonalityType, string> = {
  casual: 'Just looking for some chill vibes.',
  adventurous: 'Always down to try something new.',
  paranoid: 'Keep it lowkey, yeah?',
  hardcore: 'Got anything strong? 💊',
};

const REQUEST_MESSAGES: Record<PurchaseRequest['urgency'], string[]> = {
  low: [
    'Yo, got any {drug}? No rush.',
    'Thinking about picking up some {drug}.',
  ],
  medium: [
    'Need to grab some {drug} soon. You got?',
    'Running low on {drug}. Hook me up?',
  ],
  high: [
    'Yo I NEED {drug} asap!',
    '{drug}. Today. Can you?',
  ],
  desperate: [
    'BRO WHERE ARE YOU I NEED {drug} NOW 🙏',
    'PLEASE I need {drug} like right now!!!',
  ],
};

const CUSTOMER_NAMES = [
  'Marcus', 'Sarah', 'Kevin', 'Lisa', 'Jonas', 'Eren', 'Mila', 'Noah', 'Chantal', 'Yasmin',
  'Timo', 'Ali', 'Murat', 'Deniz', 'Omar', 'Sven', 'Luca', 'Maya', 'Sophia', 'Emre',
  'Jan', 'Paul', 'Lea', 'Lena', 'Aylin', 'Nico', 'Nadine', 'Finn', 'Mats', 'Karim',
];

const CUSTOMER_AVATARS = ['😎', '🤔', '🌟', '👤', '🧢', '🧿', '💬', '🧃', '🎧', '🕶️', '🥷', '🎯'];

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
const pickWeighted = <T,>(items: Array<{ value: T; weight: number }>): T => {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    if (roll < item.weight) return item.value;
    roll -= item.weight;
  }
  return items[items.length - 1].value;
};

const createMessage = (payload: Omit<CustomerMessage, 'id' | 'timestamp' | 'read'>): CustomerMessage => ({
  ...payload,
  id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  timestamp: Date.now(),
  read: false,
  actionsUsed: payload.actionsUsed ?? false,
});

const getStatusForLoyalty = (loyalty: number): Customer['status'] => {
  if (loyalty >= 81) return 'vip';
  if (loyalty >= 41) return 'loyal';
  if (loyalty >= 1) return 'active';
  return 'prospect';
};

const getPersonalityType = () =>
  pickWeighted(PERSONALITY_POOL.map(item => ({ value: item.type, weight: item.weight })));

const getInitialPreferences = (personality: PersonalityType): Customer['drugPreferences'] => {
  if (personality === 'hardcore') {
    return { weed: true, koks: true, meth: true };
  }
  return { weed: true, koks: false, meth: false };
};

const getMaxAddiction = (customer: Customer) => Math.max(customer.addiction.koks, customer.addiction.meth);

const getRequestIntervalRange = (customer: Customer): [number, number] => {
  const addiction = getMaxAddiction(customer);
  if (addiction > 80) return [60, 120];
  if (addiction > 50) return [3 * 60, 6 * 60];
  if (addiction > 20) return [6 * 60, 12 * 60];

  switch (customer.personalityType) {
    case 'hardcore':
      return [12 * 60, 24 * 60];
    case 'adventurous':
      return [24 * 60, 48 * 60];
    case 'paranoid':
      return [48 * 60, 96 * 60];
    default:
      return [24 * 60, 48 * 60];
  }
};

const getBasePricePerGram = (drug: DrugType) => {
  if (drug === 'koks') return BASE_KOKS_PRICE;
  if (drug === 'meth') return BASE_METH_PRICE;
  return BASE_WEED_PRICE;
};

const getTerritorySalesMultiplier = (drug: DrugType) => {
  try {
    const territoryState = useTerritoryStore?.getState?.();
    if (!territoryState || typeof territoryState.getActiveBonuses !== 'function') {
      return 1;
    }
    const bonuses = territoryState.getActiveBonuses();
    const totalBonus = bonuses
      .filter(bonus => bonus.type === 'sales-multiplier' && (bonus.drug === drug || bonus.drug === 'all'))
      .reduce((sum, bonus) => sum + bonus.value, 0);
    return 1 + totalBonus / 100;
  } catch {
    return 1;
  }
};

const calculateMaxPrice = (
  customer: Customer,
  drug: DrugType,
  urgency: PurchaseRequest['urgency'],
  grams: number
) => {
  const urgencyMultiplier = urgency === 'desperate' ? 1.6 : urgency === 'high' ? 1.35 : urgency === 'medium' ? 1.15 : 1;
  const loyaltyMultiplier = 0.9 + (customer.loyalty / 100) * 0.4;
  const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
  const basePrice = getBasePricePerGram(drug);
  return Math.floor(grams * basePrice * urgencyMultiplier * loyaltyMultiplier * spendingMultiplier);
};

const generateRequestMessage = (drug: DrugType, urgency: PurchaseRequest['urgency']) => {
  const template = pickRandom(REQUEST_MESSAGES[urgency]);
  return template.replace('{drug}', drug);
};

const getPreferredDrug = (customer: Customer): DrugType => {
  const candidates: DrugType[] = ['weed', 'koks', 'meth'].filter(drug => customer.drugPreferences[drug]) as DrugType[];
  if (candidates.length === 0) return 'weed';

  let bestDrug = candidates[0];
  let bestScore = drugScore(customer, bestDrug);
  for (const drug of candidates.slice(1)) {
    const score = drugScore(customer, drug);
    if (score > bestScore) {
      bestScore = score;
      bestDrug = drug;
    }
  }
  return bestDrug;
};

const drugScore = (customer: Customer, drug: DrugType) => {
  if (drug === 'koks') return customer.addiction.koks;
  if (drug === 'meth') return customer.addiction.meth;
  return 0;
};

const scheduleNextRequestMinutes = (customer: Customer, gameMinutes: number) => {
  const [minDelay, maxDelay] = getRequestIntervalRange(customer);
  return Math.floor(gameMinutes + randomBetween(minDelay, maxDelay));
};

const calculateWeedSaleRevenue = (customer: Customer, grams: number, quality: number) => {
  const loyaltyBonus = 1 + (customer.loyalty / 100) * 0.3;
  const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
  const qualityMultiplier = 0.5 + (quality / 100) * 1.5;
  return Math.floor(grams * BASE_WEED_PRICE * loyaltyBonus * spendingMultiplier * qualityMultiplier);
};

const buildPurchaseRequest = (customer: Customer, drug: DrugType): PurchaseRequest => {
  const addiction = drug === 'koks' ? customer.addiction.koks : drug === 'meth' ? customer.addiction.meth : 0;
  const urgency =
    addiction > 80
      ? 'desperate'
      : addiction > 50
        ? 'high'
        : customer.loyalty > 60
          ? 'medium'
          : 'low';

  const gramsRequested =
    urgency === 'desperate'
      ? 10 + Math.random() * 40
      : urgency === 'high'
        ? 5 + Math.random() * 20
        : urgency === 'medium'
          ? 2 + Math.random() * 10
          : 1 + Math.random() * 5;

  const expiryMinutes =
    urgency === 'desperate'
      ? 5
      : urgency === 'high'
        ? 15
        : urgency === 'medium'
          ? 60
          : 180;

  const roundedGrams = Math.round(gramsRequested * 10) / 10;

  return {
    id: `req-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: Date.now(),
    drug,
    gramsRequested: roundedGrams,
    maxPrice: calculateMaxPrice(customer, drug, urgency, roundedGrams),
    expiresAt: Date.now() + expiryMinutes * 60000,
    urgency,
    message: generateRequestMessage(drug, urgency),
  };
};

const generateSpontaneousRequest = (customer: Customer): CustomerMessage | null => {
  if (customer.status === 'prospect') return null;
  const maxAddiction = getMaxAddiction(customer);
  const requestChance =
    maxAddiction > 80 ? 0.3 :
      maxAddiction > 50 ? 0.15 :
        maxAddiction > 20 ? 0.05 :
          0.01;
  const chancePerTick = requestChance / 12;

  if (Math.random() > chancePerTick) return null;

  const preferredDrug = getPreferredDrug(customer);
  const addiction = preferredDrug === 'koks' ? customer.addiction.koks : preferredDrug === 'meth' ? customer.addiction.meth : 0;

  const gramsNeeded =
    addiction > 80
      ? Math.floor(10 + Math.random() * 30)
      : addiction > 50
        ? Math.floor(5 + Math.random() * 15)
        : Math.floor(1 + Math.random() * 10);

  const messages = [
    `Yo hab gerade Lust auf ${gramsNeeded}g ${preferredDrug}. Du da?`,
    `Need ${gramsNeeded}g ${preferredDrug} asap. You free?`,
    `Can you do ${gramsNeeded}g ${preferredDrug} today?`,
  ];

  return createMessage({
    from: 'customer',
    type: 'request',
    message: pickRandom(messages),
    actions: [
      {
        id: 'accept',
        label: `✅ Sell ${gramsNeeded}g`,
        type: 'accept-request',
        payload: { drug: preferredDrug, grams: gramsNeeded },
      },
      {
        id: 'ignore',
        label: '❌ Busy',
        type: 'ignore',
      },
    ],
  });
};

const createProspect = (existingNames: string[]): Customer => {
  const personalityType = getPersonalityType();
  const drugPreferences = getInitialPreferences(personalityType);
  const availableNames = CUSTOMER_NAMES.filter(name => !existingNames.includes(name));
  const name = availableNames.length > 0 ? pickRandom(availableNames) : `Kunde #${Date.now()}`;
  const avatar = pickRandom(CUSTOMER_AVATARS);
  const spendingPower = Math.floor(randomBetween(35, 85));
  const baseSatisfaction = Math.floor(randomBetween(35, 70));
  const messages = [
    createMessage({
      from: 'customer',
      type: 'sample-request',
      message: `Yo, ich hab gehoert du hast gutes Zeug. Kann ich ein Sample haben? - ${name}`,
    }),
    createMessage({
      from: 'customer',
      type: 'casual',
      message: PERSONALITY_OPENERS[personalityType],
    }),
  ];

  return {
    id: `cust-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    avatar,
    loyalty: 0,
    satisfaction: baseSatisfaction,
    spendingPower,
    lastPurchaseAt: 0,
    totalPurchases: 0,
    totalSpent: 0,
    preferredStrain: null,
    messages,
    status: 'prospect',
    lastInactivityAt: 0,
    drugPreferences,
    addiction: { koks: 0, meth: 0 },
    pendingRequest: null,
    requestHistory: [],
    personalityType,
    nextRequestAtMinutes: 0,
  };
};

const pruneMessages = (messages: CustomerMessage[]) => messages.slice(-MAX_MESSAGES);

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      totalCustomerRevenue: 0,
      nextProspectAtMinutes: 0,

      addProspect: () => {
        const state = get();
        if (state.customers.length >= MAX_CUSTOMERS) return null;
        const existingNames = state.customers.map(c => c.name);
        const prospect = createProspect(existingNames);
        set({ customers: [...state.customers, prospect] });
        return prospect;
      },

      giveSample: (customerId, budId) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer || customer.status !== 'prospect') {
          return { success: false, message: 'Sample nur fuer Prospects.' };
        }

        const gameState = useGameStore.getState();
        const bud = gameState.inventory.find(item => item.id === budId);
        if (!bud) {
          return { success: false, message: 'Buds nicht gefunden.' };
        }
        if (bud.grams < SAMPLE_GRAMS) {
          return { success: false, message: 'Nicht genug Gramm fuer Sample.' };
        }

        const conversionChance = 0.3 + (bud.quality / 100) * 0.5;
        const converted = Math.random() < conversionChance;

        const positiveMessages = [
          `Das ist 🔥! Meld dich, wenn du mehr hast.`,
          `Okay wow, das ballert. Ich brauch Nachschub.`,
          `Heftig! Schick mir mehr davon.`,
        ];
        const negativeMessages = [
          `Meh, hatte schon besseres...`,
          `Nicht schlecht, aber auch nix Besonderes.`,
          `Ist okay, aber ich check noch andere Quellen.`,
        ];

        const newMessages = [
          createMessage({
            from: 'player',
            type: 'sample-request',
            message: `Sample geschickt: ${bud.strainName} (${bud.quality}% Q).`,
          }),
          createMessage({
            from: 'customer',
            type: 'sample-response',
            message: converted ? pickRandom(positiveMessages) : pickRandom(negativeMessages),
          }),
        ];

        useGameStore.setState((game) => {
          const inventory = [...game.inventory];
          const index = inventory.findIndex(item => item.id === budId);
          if (index === -1) return game;
          const remaining = inventory[index].grams - SAMPLE_GRAMS;
          if (remaining <= 0) {
            return { inventory: inventory.filter(item => item.id !== budId) };
          }
          inventory[index] = { ...inventory[index], grams: Number(remaining.toFixed(2)) };
          return { inventory };
        });

        const nextCustomers = state.customers.map((c): Customer => {
          if (c.id !== customerId) return c;
          const nextStatus: Customer['status'] = converted ? 'active' : 'prospect';
          const nextLoyalty = converted ? 1 : 0;
          const nextSatisfaction = converted
            ? clamp(50 + bud.quality / 2, 0, 100)
            : c.satisfaction;
          const nextMessages = pruneMessages([...c.messages, ...newMessages]);
          return {
            ...c,
            loyalty: nextLoyalty,
            satisfaction: nextSatisfaction,
            preferredStrain: converted && bud.quality > 75 ? bud.strainName : c.preferredStrain,
            status: nextStatus,
            messages: nextMessages,
          };
        });

        set({
          customers: nextCustomers,
        });

        return { success: true, message: converted ? 'Prospect wurde Kunde!' : 'Prospect ist noch unsicher.' };
      },

      sellToCustomer: (customerId, budId, grams, customPrice) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer || customer.status === 'prospect') {
          return { success: false, message: 'Dieser Kunde ist noch Prospect.' };
        }

        const gameState = useGameStore.getState();
        const bud = gameState.inventory.find(item => item.id === budId);
        if (!bud || bud.state !== 'dried') {
          return { success: false, message: 'Buds nicht gefunden.' };
        }
        if (bud.grams <= 0) {
          return { success: false, message: 'Nicht genug Gramm.' };
        }

        const gramsToSell = Math.min(bud.grams, Math.max(0, grams));
        if (!Number.isFinite(gramsToSell) || gramsToSell <= 0) {
          return { success: false, message: 'Ungueltige Menge.' };
        }

        const territoryMultiplier = getTerritorySalesMultiplier('weed');
        const customPriceValue = Number.isFinite(customPrice) && customPrice > 0 ? customPrice : null;
        const revenue = customPriceValue
          ? Math.floor(gramsToSell * customPriceValue)
          : Math.floor(calculateWeedSaleRevenue(customer, gramsToSell, bud.quality) * territoryMultiplier);
        const saleTimestamp = Date.now();
        const saleGameMinutes = useGameStore.getState().gameTimeMinutes;

        useGameStore.setState((game) => {
          const inventory = [...game.inventory];
          const index = inventory.findIndex(item => item.id === budId);
          if (index === -1) return game;
          const remaining = inventory[index].grams - gramsToSell;
          if (remaining <= 0) {
            return {
              inventory: inventory.filter(item => item.id !== budId),
              budcoins: game.budcoins + revenue,
              totalCoinsEarned: game.totalCoinsEarned + revenue,
              totalGramsSold: game.totalGramsSold + gramsToSell,
              totalSalesRevenue: game.totalSalesRevenue + revenue,
              weedSalesWindow: [
                ...game.weedSalesWindow,
                { timestamp: saleTimestamp, revenue },
              ].filter(entry => saleTimestamp - entry.timestamp <= 60 * 60 * 1000),
              lastWeedSalesMinute: saleTimestamp,
            };
          }
          inventory[index] = { ...inventory[index], grams: Number(remaining.toFixed(2)) };
          return {
            inventory,
            budcoins: game.budcoins + revenue,
            totalCoinsEarned: game.totalCoinsEarned + revenue,
            totalGramsSold: game.totalGramsSold + gramsToSell,
            totalSalesRevenue: game.totalSalesRevenue + revenue,
            weedSalesWindow: [
              ...game.weedSalesWindow,
              { timestamp: saleTimestamp, revenue },
            ].filter(entry => saleTimestamp - entry.timestamp <= 60 * 60 * 1000),
            lastWeedSalesMinute: saleTimestamp,
          };
        });

        const satisfactionDelta = bud.quality > 80 ? 5 : bud.quality < 60 ? -3 : 0;
        const newLoyalty = clamp(customer.loyalty + 2, 0, 100);
        const newSatisfaction = clamp(customer.satisfaction + satisfactionDelta, 0, 100);
        const nextStatus = getStatusForLoyalty(newLoyalty);
        const wasLoyal = customer.status === 'loyal';
        const wasVip = customer.status === 'vip';
        const statusChanged = nextStatus !== customer.status;

        const purchaseMessages = [
          `Hab gerade nochmal nachgelegt. Danke! 💯`,
          `Gerade ${gramsToSell}g geholt. Stark.`,
          `Wieder mal top Zeug. Bin dabei.`,
        ];
        const complaintMessages = [
          `Qualitaet war mies. Mach besser.`,
          `Bro, das Zeug war schwach. Fix das.`,
        ];
        const praiseMessages = [
          `Du bist der Plug! Das war premium.`,
          `Quali war krank. Immer wieder.`,
        ];

        const messages: CustomerMessage[] = [
          createMessage({
            from: 'player',
            type: 'purchase',
            message: `Verkauft: ${gramsToSell}g ${bud.strainName} fuer ${revenue}$`,
          }),
          createMessage({
            from: 'customer',
            type: bud.quality < 60 ? 'complaint' : bud.quality > 80 ? 'praise' : 'purchase',
            message:
              bud.quality < 60
                ? pickRandom(complaintMessages)
                : bud.quality > 80
                  ? pickRandom(praiseMessages)
                  : pickRandom(purchaseMessages),
          }),
        ];

        if (statusChanged && nextStatus === 'loyal' && !wasLoyal) {
          messages.push(
            createMessage({
              from: 'customer',
              type: 'praise',
              message: 'Bin jetzt Stammkunde. Du lieferst.',
            })
          );
        }

        if (statusChanged && nextStatus === 'vip' && !wasVip) {
          messages.push(
            createMessage({
              from: 'customer',
              type: 'praise',
              message: 'Du bist mein Go-To. Nur Premium ab jetzt.',
            })
          );
        }

        const nextCustomers = state.customers
          .map((c) => {
            if (c.id !== customerId) return c;
            const adjustedLoyalty = c.status === 'prospect' ? 0 : Math.max(1, newLoyalty);
          return {
            ...c,
            loyalty: adjustedLoyalty,
            satisfaction: newSatisfaction,
            totalPurchases: c.totalPurchases + 1,
            totalSpent: c.totalSpent + revenue,
            preferredStrain: c.preferredStrain || (bud.quality >= 70 && Math.random() < 0.3 ? bud.strainName : null),
            status: nextStatus,
            lastPurchaseAt: saleGameMinutes,
            nextRequestAtMinutes: scheduleNextRequestMinutes(c, saleGameMinutes),
            messages: pruneMessages([...c.messages, ...messages]),
          };
        })
          .filter((c) => c.satisfaction >= 30);

        set((current) => ({
          customers: nextCustomers,
          totalCustomerRevenue: current.totalCustomerRevenue + revenue,
        }));

        return { success: true, message: 'Deal abgeschlossen.', revenue };
      },

      createPurchaseRequest: (customerId, drug) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer) {
          return { success: false, reason: 'not-found' };
        }
        if (customer.pendingRequest) {
          return { success: false, reason: 'pending' };
        }
        if (!customer.drugPreferences[drug]) {
          return { success: false, reason: 'not-interested' };
        }

        const request = buildPurchaseRequest(customer, drug);
        const message = createMessage({
          from: 'customer',
          type: 'purchase-request',
          message: request.message,
        });

        set({
          customers: state.customers.map(c =>
            c.id === customerId
              ? {
                  ...c,
                  pendingRequest: request,
                  messages: pruneMessages([...c.messages, message]),
                }
              : c
          ),
        });

        return { success: true, request };
      },

      fulfillRequest: (customerId, options = {}) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer || !customer.pendingRequest) {
          return { success: false, message: 'Keine offene Anfrage.' };
        }

        const pending = customer.pendingRequest;
        let result: { success: boolean; revenue?: number; message?: string } = { success: false };

        if (pending.drug === 'weed') {
          const gameState = useGameStore.getState();
          const driedBuds = gameState.inventory.filter(bud => bud.state === 'dried');
          const chosenBud =
            driedBuds.find(bud => bud.id === options.budId) ??
            [...driedBuds].sort((a, b) => b.quality - a.quality)[0];

          if (!chosenBud) {
            return { success: false, message: 'Keine getrockneten Buds verfuegbar.' };
          }
          if (chosenBud.grams < pending.gramsRequested) {
            return { success: false, message: 'Nicht genug Gramm fuer die Anfrage.' };
          }

          const customPrice = pending.maxPrice / pending.gramsRequested;
          const sale = get().sellToCustomer(
            customerId,
            chosenBud.id,
            pending.gramsRequested,
            Number.isFinite(customPrice) ? customPrice : undefined
          );
          if (!sale.success) {
            return { success: false, message: sale.message };
          }
          result = { success: true, revenue: sale.revenue, message: sale.message };
        } else {
          const customPrice = pending.maxPrice / pending.gramsRequested;
          let productId: string | undefined;
          if (pending.drug === 'koks') {
            const cocaState = useCocaStore.getState();
            const bestProduct = [...cocaState.cocaProducts]
              .filter(p => p.stage === 'powder' && p.grams >= pending.gramsRequested)
              .sort((a, b) => b.purity + b.quality - (a.purity + a.quality))[0];
            if (!bestProduct) {
              return { success: false, message: 'Kein Koks-Pulver verfuegbar.' };
            }
            productId = bestProduct.id;
          }
          if (pending.drug === 'meth') {
            const methState = useMethStore.getState();
            const bestProduct = [...methState.methInventory]
              .filter(p => p.grams >= pending.gramsRequested)
              .sort((a, b) => b.purity + b.quality - (a.purity + a.quality))[0];
            if (!bestProduct) {
              return { success: false, message: 'Kein Meth verfuegbar.' };
            }
            productId = bestProduct.id;
          }

          const sale = get().sellHardDrug(
            customerId,
            pending.drug,
            pending.gramsRequested,
            productId,
            Number.isFinite(customPrice) ? customPrice : undefined
          );
          if (!sale.success) {
            return { success: false, message: sale.message || 'Anfrage konnte nicht erfuellt werden.' };
          }
          result = { success: true, revenue: sale.revenue };
        }

        if (!result.success) {
          return result;
        }

        const gameMinutes = useGameStore.getState().gameTimeMinutes;
        set((current) => ({
          customers: current.customers.map(c => {
            if (c.id !== customerId) return c;
            const nextRequestAtMinutes = scheduleNextRequestMinutes(c, gameMinutes);
            return {
              ...c,
              pendingRequest: null,
              requestHistory: [...c.requestHistory, pending].slice(-20),
              nextRequestAtMinutes,
            };
          }),
        }));

        if (customer) {
          const revenueValue = result.revenue ?? 0;
          console.log(
            `Request fulfilled: ${customer.name} bought ${pending.gramsRequested}g ${pending.drug} for $${revenueValue}`
          );
        }

        return result;
      },

      offerDrug: (customerId, drug, grams) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer) {
          return { success: false, reason: 'not-found' };
        }

        if (customer.drugPreferences[drug]) {
          return get().sellHardDrug(customerId, drug, grams);
        }

        if (customer.personalityType === 'paranoid') {
          const message = createMessage({
            from: 'customer',
            type: 'drug-rejection-angry',
            message: 'Are you trying to set me up?? We\'re done! 🚨',
          });

          // Paranoid customer blocks the player - remove them from the list entirely
          set((current) => ({
            customers: current.customers.filter(c => c.id !== customerId),
          }));

          return { success: false, reason: 'blocked', message: `${customer.name} hat dich blockiert und wurde aus deiner Kontaktliste entfernt.` };
        }

        if (customer.personalityType === 'hardcore') {
          const message = createMessage({
            from: 'customer',
            type: 'drug-acceptance',
            message: 'Hell yeah! This is what I\'m talking about 🔥',
          });
          set((current) => ({
            customers: current.customers.map(c =>
              c.id === customerId
                ? {
                    ...c,
                    drugPreferences: { ...c.drugPreferences, [drug]: true },
                    addiction: { ...c.addiction, [drug]: Math.max(15, c.addiction[drug]) },
                    messages: pruneMessages([...c.messages, message]),
                  }
                : c
            ),
          }));
          return get().sellHardDrug(customerId, drug, grams);
        }

        if (customer.personalityType === 'adventurous') {
          if (Math.random() < 0.3) {
            const message = createMessage({
              from: 'customer',
              type: 'drug-acceptance',
              message: 'Alright, let\'s see what this is about 🤔',
            });
            set((current) => ({
              customers: current.customers.map(c =>
                c.id === customerId
                  ? {
                      ...c,
                      drugPreferences: { ...c.drugPreferences, [drug]: true },
                      addiction: { ...c.addiction, [drug]: Math.max(10, c.addiction[drug]) },
                      messages: pruneMessages([...c.messages, message]),
                    }
                  : c
              ),
            }));
            return get().sellHardDrug(customerId, drug, grams);
          }

          const message = createMessage({
            from: 'customer',
            type: 'drug-rejection-soft',
            message: 'Nah I\'m good man. Stick to green for now.',
          });
          set((current) => ({
            customers: current.customers.map(c =>
              c.id === customerId
                ? {
                    ...c,
                    loyalty: clamp(c.loyalty - 5, 0, 100),
                    status: getStatusForLoyalty(clamp(c.loyalty - 5, 0, 100)) === 'prospect'
                      ? 'active'
                      : getStatusForLoyalty(clamp(c.loyalty - 5, 0, 100)),
                    messages: pruneMessages([...c.messages, message]),
                  }
                : c
            ),
          }));
          return { success: false, reason: 'rejected-soft' };
        }

        const message = createMessage({
          from: 'customer',
          type: 'drug-rejection',
          message: 'Yo that\'s not my thing. Just weed bro.',
        });
        set((current) => ({
          customers: current.customers.map(c =>
            c.id === customerId
              ? {
                  ...c,
                  loyalty: clamp(c.loyalty - 10, 0, 100),
                  status: getStatusForLoyalty(clamp(c.loyalty - 10, 0, 100)) === 'prospect'
                    ? 'active'
                    : getStatusForLoyalty(clamp(c.loyalty - 10, 0, 100)),
                  messages: pruneMessages([...c.messages, message]),
                }
              : c
          ),
        }));
        return { success: false, reason: 'rejected' };
      },

      sellHardDrug: (customerId, drug, grams, productId, customPrice) => {
        const state = get();
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer) {
          return { success: false, reason: 'not-found', message: 'Kunde nicht gefunden.' };
        }
        if (!customer.drugPreferences[drug]) {
          return { success: false, reason: 'not-accepted', message: 'Kunde will dieses Drug nicht.' };
        }

        const targetGrams = Math.max(0, Math.round(grams * 10) / 10);
        if (!Number.isFinite(targetGrams) || targetGrams <= 0) {
          return { success: false, reason: 'invalid-grams', message: 'Ungueltige Menge.' };
        }

        const now = Date.now();
        let qualityScore = 60;
        let revenue = 0;
        const customPriceValue = Number.isFinite(customPrice) && customPrice > 0 ? customPrice : null;
        let inventoryUpdated = false;

        if (drug === 'koks') {
          const cocaState = useCocaStore.getState();
          let chosenProduct = productId
            ? cocaState.cocaProducts.find(p => p.id === productId && p.stage === 'powder')
            : undefined;

          if (chosenProduct && chosenProduct.grams < targetGrams) {
            return { success: false, reason: 'no-stock', message: 'Nicht genug Gramm im ausgewaehlten Koks-Produkt.' };
          }

          if (!chosenProduct) {
            chosenProduct = [...cocaState.cocaProducts]
              .filter(p => p.stage === 'powder' && p.grams >= targetGrams)
              .sort((a, b) => b.purity + b.quality - (a.purity + a.quality))[0];
          }

          if (!chosenProduct) {
            return { success: false, reason: 'no-stock', message: 'Kein Koks-Pulver verfuegbar.' };
          }

          qualityScore = (chosenProduct.quality + chosenProduct.purity) / 2;
          const qualityMultiplier = 0.6 + (qualityScore / 100) * 1.2;
          const loyaltyMultiplier = 1 + (customer.loyalty / 100) * 0.3;
          const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
          if (customPriceValue) {
            revenue = Math.floor(targetGrams * customPriceValue);
          } else {
            const pricePerGram = BASE_KOKS_PRICE * qualityMultiplier;
            const territoryMultiplier = getTerritorySalesMultiplier('koks');
            revenue = Math.floor(
              targetGrams * pricePerGram * loyaltyMultiplier * spendingMultiplier * territoryMultiplier
            );
          }

          useCocaStore.setState((coca) => {
            const products = coca.cocaProducts.map(product => {
              if (product.id !== chosenProduct?.id) return product;
              return { ...product, grams: Number((product.grams - targetGrams).toFixed(2)) };
            }).filter(product => product.grams > 0);

            return {
              cocaProducts: products,
              totalCocaRevenue: coca.totalCocaRevenue + revenue,
              totalCocaSales: coca.totalCocaSales + 1,
              cocaSalesWindow: [
                ...coca.cocaSalesWindow,
                { timestamp: now, revenue },
              ].filter(entry => now - entry.timestamp <= 60 * 60 * 1000),
              lastCocaSalesMinute: now,
            };
          });
          inventoryUpdated = true;
        }

        if (drug === 'meth') {
          const methState = useMethStore.getState();
          let chosenProduct = productId
            ? methState.methInventory.find(p => p.id === productId)
            : undefined;

          if (chosenProduct && chosenProduct.grams < targetGrams) {
            return { success: false, reason: 'no-stock', message: 'Nicht genug Gramm im ausgewaehlten Meth-Produkt.' };
          }

          if (!chosenProduct) {
            chosenProduct = [...methState.methInventory]
              .filter(p => p.grams >= targetGrams)
              .sort((a, b) => b.purity + b.quality - (a.purity + a.quality))[0];
          }

          if (!chosenProduct) {
            return { success: false, reason: 'no-stock', message: 'Kein Meth verfuegbar.' };
          }

          qualityScore = (chosenProduct.quality + chosenProduct.purity) / 2;
          const qualityMultiplier = 0.6 + (qualityScore / 100) * 1.2;
          const loyaltyMultiplier = 1 + (customer.loyalty / 100) * 0.3;
          const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
          if (customPriceValue) {
            revenue = Math.floor(targetGrams * customPriceValue);
          } else {
            const rawPricePerGram = BASE_METH_PRICE * qualityMultiplier;
            const pricePerGram = Math.min(100, rawPricePerGram);
            const territoryMultiplier = getTerritorySalesMultiplier('meth');
            revenue = Math.floor(
              targetGrams * pricePerGram * loyaltyMultiplier * spendingMultiplier * territoryMultiplier
            );
          }

          useMethStore.setState((meth) => {
            const inventory = meth.methInventory.map(product => {
              if (product.id !== chosenProduct?.id) return product;
              return { ...product, grams: Number((product.grams - targetGrams).toFixed(2)) };
            }).filter(product => product.grams > 0);

            return {
              methInventory: inventory,
              totalMethRevenue: meth.totalMethRevenue + revenue,
              totalMethSold: meth.totalMethSold + targetGrams,
              methSalesWindow: [
                ...meth.methSalesWindow,
                { timestamp: now, revenue },
              ].filter(entry => now - entry.timestamp <= 60 * 60 * 1000),
              lastMethSalesMinute: now,
            };
          });
          inventoryUpdated = true;
        }

        if (!inventoryUpdated) {
          return { success: false, reason: 'no-stock', message: 'Keine Ware verfuegbar.' };
        }

        useGameStore.setState((game) => ({
          budcoins: game.budcoins + revenue,
          totalCoinsEarned: game.totalCoinsEarned + revenue,
        }));

        const satisfactionDelta = qualityScore > 80 ? 5 : qualityScore < 60 ? -3 : 0;
        const addictionIncrease =
          customer.personalityType === 'hardcore'
            ? 5 + Math.random() * 3
            : customer.personalityType === 'adventurous'
              ? 3 + Math.random() * 2
              : 2 + Math.random() * 2;

        const updatedAddiction = clamp(customer.addiction[drug] + addictionIncrease, 0, 100);
        const addictionMessage =
          updatedAddiction > 80
            ? {
                type: 'addiction-desperate' as const,
                message: 'I NEED more. Like... I really need it. Please. 🙏',
              }
            : updatedAddiction > 50
              ? {
                  type: 'addiction-medium' as const,
                  message: 'That hit the spot. When can I get more? 😬',
                }
              : updatedAddiction > 20
                ? {
                    type: 'addiction-light' as const,
                    message: 'Damn that was good. I\'ll be back for more 😏',
                  }
                : null;

        const gameMinutes = useGameStore.getState().gameTimeMinutes;

        const saleMessage = createMessage({
          from: 'player',
          type: 'purchase',
          message: `Verkauft: ${targetGrams}g ${drug} fuer ${revenue}$`,
        });

        const nextCustomers = state.customers
          .map(c => {
            if (c.id !== customerId) return c;
            const nextAddiction = { ...c.addiction, [drug]: updatedAddiction };
            const nextLoyalty = clamp(c.loyalty + 2, 0, 100);
            const nextStatus = getStatusForLoyalty(nextLoyalty);
            const nextSatisfaction = clamp(c.satisfaction + satisfactionDelta, 0, 100);
            const nextMessages = [saleMessage];
            if (addictionMessage) {
              nextMessages.push(
                createMessage({
                  from: 'customer',
                  type: addictionMessage.type,
                  message: addictionMessage.message,
                })
              );
            }
            return {
              ...c,
              addiction: nextAddiction,
              loyalty: nextLoyalty,
              satisfaction: nextSatisfaction,
              status: nextStatus === 'prospect' ? 'active' : nextStatus,
              totalPurchases: c.totalPurchases + 1,
              totalSpent: c.totalSpent + revenue,
              lastPurchaseAt: gameMinutes,
              messages: pruneMessages([...c.messages, ...nextMessages]),
              nextRequestAtMinutes: addictionMessage
                ? Math.floor(
                    gameMinutes +
                      (addictionMessage.type === 'addiction-desperate'
                        ? randomBetween(12 * 60, 24 * 60)
                        : addictionMessage.type === 'addiction-medium'
                          ? randomBetween(24 * 60, 48 * 60)
                          : randomBetween(48 * 60, 96 * 60))
                  )
                : scheduleNextRequestMinutes(c, gameMinutes),
            };
          })
          .filter(c => c.satisfaction >= 30);

        set((current) => ({
          customers: nextCustomers,
          totalCustomerRevenue: current.totalCustomerRevenue + revenue,
        }));

        return { success: true, revenue, message: 'Deal abgeschlossen.' };
      },

      markCustomerRead: (customerId) => set((state) => ({
        customers: state.customers.map(customer => {
          if (customer.id !== customerId) return customer;
          const messages = customer.messages.map(msg => ({ ...msg, read: true }));
          return { ...customer, messages };
        }),
      })),

      runCustomerTick: (gameMinutes) => {
        set((state) => {
          let customers = [...state.customers];
          let nextProspectAtMinutes = state.nextProspectAtMinutes;
          const now = Date.now();

          if (!Number.isFinite(nextProspectAtMinutes) || nextProspectAtMinutes <= 0) {
            nextProspectAtMinutes = Math.floor(gameMinutes + randomBetween(30, 60));
          }

          if (
            customers.length < AUTO_PROSPECT_LIMIT &&
            customers.length < MAX_CUSTOMERS &&
            gameMinutes >= nextProspectAtMinutes
          ) {
            const existingNames = customers.map(c => c.name);
            const prospect = createProspect(existingNames);
            customers = [...customers, prospect];
            nextProspectAtMinutes = Math.floor(gameMinutes + randomBetween(30, 60));
          }

          const updatedCustomers = customers.map((customer) => {
            let nextCustomer = { ...customer };

            if (!Number.isFinite(nextCustomer.nextRequestAtMinutes) || nextCustomer.nextRequestAtMinutes <= 0) {
              nextCustomer.nextRequestAtMinutes = scheduleNextRequestMinutes(nextCustomer, gameMinutes);
            }

            if (nextCustomer.pendingRequest && now > nextCustomer.pendingRequest.expiresAt) {
              const expired = nextCustomer.pendingRequest;
              const penalties =
                expired.urgency === 'desperate'
                  ? { loyalty: 15, satisfaction: 20, type: 'timeout-angry', message: 'Forget it. Found someone else. Don\'t hit me up. 😤' }
                  : expired.urgency === 'high'
                    ? { loyalty: 8, satisfaction: 0, type: 'timeout', message: 'Yo where were you? Had to go elsewhere...' }
                    : { loyalty: 3, satisfaction: 0, type: 'timeout', message: 'Nvm, got sorted elsewhere.' };
              const nextLoyalty = clamp(nextCustomer.loyalty - penalties.loyalty, 0, 100);
              const nextStatus = getStatusForLoyalty(nextLoyalty);

              nextCustomer = {
                ...nextCustomer,
                loyalty: nextCustomer.status === 'prospect' ? 0 : Math.max(1, nextLoyalty),
                status: nextStatus === 'prospect' ? 'active' : nextStatus,
                satisfaction: clamp(nextCustomer.satisfaction - penalties.satisfaction, 0, 100),
                pendingRequest: null,
                requestHistory: [...nextCustomer.requestHistory, expired].slice(-20),
                messages: pruneMessages([
                  ...nextCustomer.messages,
                  createMessage({
                    from: 'customer',
                    type: penalties.type as CustomerMessage['type'],
                    message: penalties.message,
                  }),
                ]),
                nextRequestAtMinutes:
                  nextCustomer.satisfaction > 30
                    ? Math.floor(gameMinutes + randomBetween(120, 360))
                    : nextCustomer.nextRequestAtMinutes,
              };
            }

            const minutesSinceLastPurchase = Number.isFinite(nextCustomer.lastPurchaseAt)
              ? gameMinutes - nextCustomer.lastPurchaseAt
              : Number.POSITIVE_INFINITY;

            if (
              nextCustomer.status !== 'prospect' &&
              !nextCustomer.pendingRequest &&
              gameMinutes >= nextCustomer.nextRequestAtMinutes &&
              minutesSinceLastPurchase >= REQUEST_COOLDOWN_MINUTES
            ) {
              const preferredDrug = getPreferredDrug(nextCustomer);
              if (nextCustomer.drugPreferences[preferredDrug]) {
                const request = buildPurchaseRequest(nextCustomer, preferredDrug);
                nextCustomer = {
                  ...nextCustomer,
                  pendingRequest: request,
                  messages: pruneMessages([
                    ...nextCustomer.messages,
                    createMessage({
                      from: 'customer',
                      type: 'purchase-request',
                      message: request.message,
                    }),
                  ]),
                };
              } else {
                nextCustomer.nextRequestAtMinutes = scheduleNextRequestMinutes(nextCustomer, gameMinutes);
              }
            }

            if (nextCustomer.status !== 'prospect') {
              const spontaneous = generateSpontaneousRequest(nextCustomer);
              if (spontaneous) {
                nextCustomer = {
                  ...nextCustomer,
                  messages: pruneMessages([...nextCustomer.messages, spontaneous]),
                };
              }
            }

            if (nextCustomer.status !== 'prospect' && Number.isFinite(nextCustomer.lastPurchaseAt)) {
              const minutesSince = gameMinutes - nextCustomer.lastPurchaseAt;
              const minutesSincePenalty = gameMinutes - nextCustomer.lastInactivityAt;
              if (minutesSince >= INACTIVITY_MINUTES && minutesSincePenalty >= INACTIVITY_MINUTES) {
                const newLoyalty = clamp(nextCustomer.loyalty - 10, 0, 100);
                const nextStatus = getStatusForLoyalty(newLoyalty);
                const inactivityMessage = createMessage({
                  from: 'customer',
                  type: 'casual',
                  message: 'Yo, wo warst du? Brauch Nachschub!',
                });

                const finalStatus: Customer['status'] = nextStatus === 'prospect' ? 'active' : nextStatus;
                nextCustomer = {
                  ...nextCustomer,
                  loyalty: Math.max(1, newLoyalty),
                  status: finalStatus,
                  lastInactivityAt: gameMinutes,
                  messages: pruneMessages([...nextCustomer.messages, inactivityMessage]),
                };
              }
            }

            return nextCustomer;
          });

          return { customers: updatedCustomers, nextProspectAtMinutes };
        });
      },
    }),
    {
      name: 'customer-network-save',
      version: 6,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        return {
          ...persistedState,
          customers: Array.isArray(persistedState.customers)
            ? persistedState.customers.map((customer: Customer) => ({
                ...customer,
                drugPreferences: customer.drugPreferences ?? { weed: true, koks: false, meth: false },
                addiction: customer.addiction ?? { koks: 0, meth: 0 },
                pendingRequest: customer.pendingRequest ?? null,
                requestHistory: customer.requestHistory ?? [],
                personalityType: customer.personalityType ?? 'casual',
                nextRequestAtMinutes: Number.isFinite(customer.nextRequestAtMinutes)
                  ? customer.nextRequestAtMinutes
                  : 0,
              }))
            : [],
          totalCustomerRevenue: Number.isFinite(persistedState.totalCustomerRevenue)
            ? persistedState.totalCustomerRevenue
            : 0,
          nextProspectAtMinutes: Number.isFinite(persistedState.nextProspectAtMinutes)
            ? persistedState.nextProspectAtMinutes
            : 0,
        };
      },
    }
  )
);
