Plan: Customer Request System - Bug Fixes & Verbesserungen
Status
🐛 KRITISCHER BUG: Request-System funktioniert nicht - "Kunde will nicht so viel zahlen" obwohl Preis korrekt 🔨 JETZT: Bug-Fixes + System-Verbesserungen 📋 Später: Territory Control, Customer v3.0
🐛 BUG-ANALYSE: Customer Request System
Problem 1: Falsche Preisberechnung in fulfillRequest()
Location: src/store/customerStore.ts Line 725-732 Aktueller Code:

const territoryMultiplier = getTerritorySalesMultiplier('weed');
const qualityMultiplier = 0.5 + (chosenBud.quality / 100) * 1.5;
const previewRevenue = Math.floor(
  calculateWeedSaleRevenue(customer, pending.gramsRequested, chosenBud.quality) * territoryMultiplier
);
const maxAllowed = Math.floor(pending.maxPrice * qualityMultiplier * territoryMultiplier);
if (previewRevenue > maxAllowed) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
Problem:
calculateWeedSaleRevenue() berechnet BEREITS den korrekten Preis mit:
Loyalty-Bonus: 1 + (loyalty / 100) * 0.3
Spending-Multiplier: 0.8 + (spendingPower / 100) * 0.6
Quality-Multiplier: 0.5 + (quality / 100) * 1.5
Base Price: 15 $/g
Dann wird previewRevenue nochmal mit territoryMultiplier multipliziert → ZU HOCH
maxAllowed basiert auf pending.maxPrice (der schon korrekt berechnet wurde in buildPurchaseRequest)
Aber wird dann NOCHMAL mit qualityMultiplier * territoryMultiplier multipliziert
ABER: pending.maxPrice wurde bereits MIT quality/urgency/loyalty berechnet!
Result: previewRevenue ist fast immer > maxAllowed → Request fails
FIX:

// REMOVE all extra multipliers - just compare actual revenue vs maxPrice
const previewRevenue = calculateWeedSaleRevenue(customer, pending.gramsRequested, chosenBud.quality);

if (previewRevenue > pending.maxPrice) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
Grund: pending.maxPrice wurde in buildPurchaseRequest() bereits korrekt mit calculateMaxPrice() berechnet, der ALLE Multipliers berücksichtigt (urgency, loyalty, spending). Es gibt KEINEN Grund, nochmal zu multiplizieren.
Problem 2: getTerritorySalesMultiplier() ruft nicht-existierenden Store auf
Location: src/store/customerStore.ts Line 226-235 Aktueller Code:

const getTerritorySalesMultiplier = (drug: DrugType) => {
  const bonuses = useTerritoryStore.getState().getActiveBonuses();
  const totalBonus = bonuses
    .filter(b => b.type === 'sales-multiplier' && (b.drug === drug || b.drug === 'all'))
    .reduce((sum, b) => sum + b.value, 0);
  return 1 + totalBonus / 100;
};
Problem:
useTerritoryStore existiert noch nicht (Territory System nicht implementiert)
Code crasht oder gibt undefined zurück
Wird in Line 725 aufgerufen → Bug
FIX:

const getTerritorySalesMultiplier = (drug: DrugType) => {
  try {
    // Check if territoryStore exists (feature not yet implemented)
    if (typeof useTerritoryStore === 'undefined') {
      return 1;
    }
    
    const territoryState = useTerritoryStore.getState();
    if (!territoryState || typeof territoryState.getActiveBonuses !== 'function') {
      return 1;
    }

    const bonuses = territoryState.getActiveBonuses();
    const totalBonus = bonuses
      .filter(b => b.type === 'sales-multiplier' && (b.drug === drug || b.drug === 'all'))
      .reduce((sum, b) => sum + b.value, 0);
    return 1 + totalBonus / 100;
  } catch {
    // Fallback if Territory System not implemented yet
    return 1;
  }
};
ODER (besser): Entferne komplett, da System eh nicht implementiert:

// DELETE Line 226-235
// Territory-Bonus-System wird später implementiert
Problem 3: Kein Cooldown nach Käufen
Problem:
Kunde kauft Weed/Koks/Meth
Im nächsten Tick wird sofort wieder buildPurchaseRequest() aufgerufen
Kunde spammt Requests
Location: src/store/customerStore.ts Line 1111-1134 (runCustomerTick) Aktueller Code:

if (
  nextCustomer.status !== 'prospect' &&
  !nextCustomer.pendingRequest &&
  gameMinutes >= nextCustomer.nextRequestAtMinutes
) {
  const preferredDrug = getPreferredDrug(nextCustomer);
  if (nextCustomer.drugPreferences[preferredDrug]) {
    const request = buildPurchaseRequest(nextCustomer, preferredDrug);
    // ... generate request
  }
}
Problem:
Check ist gameMinutes >= nextRequestAtMinutes
ABER: nextRequestAtMinutes wird NUR in sellToCustomer & sellHardDrug gesetzt
Wenn Request erfüllt wird via fulfillRequest, wird nextRequestAtMinutes NICHT gesetzt! (siehe Line 714)
FIX 1: Set nextRequestAtMinutes nach fulfillRequest:

// In fulfillRequest Line 709-722:
const gameMinutes = useGameStore.getState().gameTimeMinutes;
set((current) => ({
  customers: current.customers.map(c => {
    if (c.id !== customerId) return c;
    const nextRequestAtMinutes = scheduleNextRequestMinutes(c, gameMinutes);  // ADD THIS
    return {
      ...c,
      pendingRequest: null,
      requestHistory: [...c.requestHistory, pending].slice(-20),
      nextRequestAtMinutes,  // ADD THIS (existing code already has it for weed)
    };
  }),
}));
Aktuell: Line 712-716 setzt nur für Weed:

const nextRequestAtMinutes =
  pending.drug === 'weed'
    ? scheduleNextRequestMinutes(c, gameMinutes)
    : c.nextRequestAtMinutes;  // ← BUG: Koks/Meth behalten alte Zeit!
FIX: Remove conditional:

const nextRequestAtMinutes = scheduleNextRequestMinutes(c, gameMinutes);
Problem 4: Requests generieren zu häufig
Location: src/store/customerStore.ts Line 180-196 (getRequestIntervalRange) Aktueller Code:

const getRequestIntervalRange = (customer: Customer): [number, number] => {
  const addiction = getMaxAddiction(customer);
  if (addiction > 80) return [12 * 60, 24 * 60];  // 12-24h
  if (addiction > 50) return [24 * 60, 48 * 60];  // 24-48h
  if (addiction > 20) return [48 * 60, 96 * 60];  // 48-96h

  switch (customer.personalityType) {
    case 'hardcore':
      return [24 * 60, 72 * 60];  // 24-72h
    case 'adventurous':
      return [2 * 24 * 60, 5 * 24 * 60];  // 2-5 days
    case 'paranoid':
      return [4 * 24 * 60, 8 * 24 * 60];  // 4-8 days
    default:
      return [3 * 24 * 60, 7 * 24 * 60];  // 3-7 days
  }
};
Problem:
Casual Customers kaufen nur alle 3-7 TAGE → ZU SELTEN für Gameplay
Addicts kaufen alle 12-24h → OK
Zu große Varianz zwischen Personalities
FIX: Reduziere Intervalle für besseres Gameplay:

const getRequestIntervalRange = (customer: Customer): [number, number] => {
  const addiction = getMaxAddiction(customer);
  
  // Addicts kaufen häufiger
  if (addiction > 80) return [60, 120];  // 1-2h (desperate!)
  if (addiction > 50) return [3 * 60, 6 * 60];  // 3-6h
  if (addiction > 20) return [6 * 60, 12 * 60];  // 6-12h

  // Personalities ohne Addiction
  switch (customer.personalityType) {
    case 'hardcore':
      return [12 * 60, 24 * 60];  // 12-24h
    case 'adventurous':
      return [24 * 60, 48 * 60];  // 1-2 days
    case 'paranoid':
      return [48 * 60, 96 * 60];  // 2-4 days
    default:  // casual
      return [24 * 60, 48 * 60];  // 1-2 days (nicht mehr 3-7!)
  }
};
Problem 5: Same bugs in Koks/Meth fulfillRequest
Location: src/store/customerStore.ts Line 656-701 Aktueller Code für Koks:

if (pending.drug === 'koks') {
  const cocaState = useCocaStore.getState();
  const bestProduct = [...cocaState.cocaProducts]
    .filter(p => p.stage === 'powder' && p.grams >= pending.gramsRequested)
    .sort((a, b) => b.purity + b.quality - (a.purity + a.quality))[0];
  
  if (!bestProduct) {
    return { success: false, message: 'Kein Koks-Pulver verfuegbar.' };
  }
  
  const qualityScore = (bestProduct.quality + bestProduct.purity) / 2;
  const qualityMultiplier = 0.6 + (qualityScore / 100) * 1.2;
  const loyaltyMultiplier = 1 + (customer.loyalty / 100) * 0.3;
  const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
  previewRevenue = Math.floor(
    pending.gramsRequested * BASE_KOKS_PRICE * qualityMultiplier * loyaltyMultiplier * spendingMultiplier
  );
}

// Later...
if (previewRevenue > pending.maxPrice) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
Problem:
Hier wird previewRevenue korrekt berechnet (ohne extra Multipliers)
Aber es wird direkt gegen pending.maxPrice verglichen → SOLLTE funktionieren
ABER: pending.maxPrice wurde mit calculateMaxPrice() berechnet, das AUCH die gleichen Multipliers verwendet
→ Preis ist identisch oder fast identisch → OK!
Mögliches Problem: Rounding-Fehler oder Qualitäts-Unterschied zwischen Request-Zeit und Fulfill-Zeit FIX: Add tolerance:

const PRICE_TOLERANCE = 1.05;  // 5% tolerance
if (previewRevenue > pending.maxPrice * PRICE_TOLERANCE) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
📝 ZUSAMMENFASSUNG: Alle Fixes
Fix 1: fulfillRequest für Weed (Line 711-739)
REPLACE:

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

  // REMOVE all this broken price checking:
  const territoryMultiplier = getTerritorySalesMultiplier('weed');
  const qualityMultiplier = 0.5 + (chosenBud.quality / 100) * 1.5;
  const previewRevenue = Math.floor(
    calculateWeedSaleRevenue(customer, pending.gramsRequested, chosenBud.quality) * territoryMultiplier
  );
  const maxAllowed = Math.floor(pending.maxPrice * qualityMultiplier * territoryMultiplier);
  if (previewRevenue > maxAllowed) {
    return { success: false, message: 'Kunde will nicht so viel zahlen.' };
  }

  const sale = get().sellToCustomer(customerId, chosenBud.id, pending.gramsRequested);
  if (!sale.success) {
    return { success: false, message: sale.message };
  }
  result = { success: true, revenue: sale.revenue, message: sale.message };
}
WITH:

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

  // SIMPLIFIED price check - just compare actual revenue vs customer's max price
  const previewRevenue = calculateWeedSaleRevenue(customer, pending.gramsRequested, chosenBud.quality);
  const PRICE_TOLERANCE = 1.1;  // 10% tolerance for quality fluctuations
  
  if (previewRevenue > pending.maxPrice * PRICE_TOLERANCE) {
    return { success: false, message: 'Kunde will nicht so viel zahlen.' };
  }

  const sale = get().sellToCustomer(customerId, chosenBud.id, pending.gramsRequested);
  if (!sale.success) {
    return { success: false, message: sale.message };
  }
  result = { success: true, revenue: sale.revenue, message: sale.message };
}
Fix 2: fulfillRequest cooldown (Line 709-723)
REPLACE:

const gameMinutes = useGameStore.getState().gameTimeMinutes;
set((current) => ({
  customers: current.customers.map(c => {
    if (c.id !== customerId) return c;
    const nextRequestAtMinutes =
      pending.drug === 'weed'
        ? scheduleNextRequestMinutes(c, gameMinutes)
        : c.nextRequestAtMinutes;  // BUG: Koks/Meth keep old time!
    return {
      ...c,
      pendingRequest: null,
      requestHistory: [...c.requestHistory, pending].slice(-20),
      nextRequestAtMinutes,
    };
  }),
}));
WITH:

const gameMinutes = useGameStore.getState().gameTimeMinutes;
set((current) => ({
  customers: current.customers.map(c => {
    if (c.id !== customerId) return c;
    // FIX: ALWAYS schedule next request for all drug types
    const nextRequestAtMinutes = scheduleNextRequestMinutes(c, gameMinutes);
    return {
      ...c,
      pendingRequest: null,
      requestHistory: [...c.requestHistory, pending].slice(-20),
      nextRequestAtMinutes,
    };
  }),
}));
Fix 3: Delete getTerritorySalesMultiplier (Line 226-235)
DELETE completely:

const getTerritorySalesMultiplier = (drug: DrugType) => {
  const bonuses = useTerritoryStore.getState().getActiveBonuses();
  const totalBonus = bonuses
    .filter(b => b.type === 'sales-multiplier' && (b.drug === drug || b.drug === 'all'))
    .reduce((sum, b) => sum + b.value, 0);
  return 1 + totalBonus / 100;
};
Reason: Territory System nicht implementiert, crasht Code.
Fix 4: Reduce Request Intervals (Line 180-196)
REPLACE:

const getRequestIntervalRange = (customer: Customer): [number, number] => {
  const addiction = getMaxAddiction(customer);
  if (addiction > 80) return [12 * 60, 24 * 60];
  if (addiction > 50) return [24 * 60, 48 * 60];
  if (addiction > 20) return [48 * 60, 96 * 60];

  switch (customer.personalityType) {
    case 'hardcore':
      return [24 * 60, 72 * 60];
    case 'adventurous':
      return [2 * 24 * 60, 5 * 24 * 60];
    case 'paranoid':
      return [4 * 24 * 60, 8 * 24 * 60];
    default:
      return [3 * 24 * 60, 7 * 24 * 60];
  }
};
WITH:

const getRequestIntervalRange = (customer: Customer): [number, number] => {
  const addiction = getMaxAddiction(customer);
  
  // Addicts request more frequently
  if (addiction > 80) return [60, 120];  // 1-2h (desperate)
  if (addiction > 50) return [3 * 60, 6 * 60];  // 3-6h
  if (addiction > 20) return [6 * 60, 12 * 60];  // 6-12h

  // Non-addicted customers
  switch (customer.personalityType) {
    case 'hardcore':
      return [12 * 60, 24 * 60];  // 12-24h
    case 'adventurous':
      return [24 * 60, 48 * 60];  // 1-2 days
    case 'paranoid':
      return [48 * 60, 96 * 60];  // 2-4 days
    default:  // casual
      return [24 * 60, 48 * 60];  // 1-2 days (better than 3-7!)
  }
};
Fix 5: Add Price Tolerance für Koks/Meth (Line 692-694)
REPLACE:

if (previewRevenue > pending.maxPrice) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
WITH:

const PRICE_TOLERANCE = 1.1;  // 10% tolerance
if (previewRevenue > pending.maxPrice * PRICE_TOLERANCE) {
  return { success: false, message: 'Kunde will nicht so viel zahlen.' };
}
🎯 ZUSÄTZLICHE VERBESSERUNGEN
Improvement 1: Add Purchase Cooldown Check
Location: src/store/customerStore.ts Line 1111-1134 (runCustomerTick) ADD before request generation:

// Don't spam requests - minimum 30 minutes since last purchase
const minutesSinceLastPurchase = gameMinutes - nextCustomer.lastPurchaseAt;
const MIN_COOLDOWN = 30;  // 30 minutes

if (
  nextCustomer.status !== 'prospect' &&
  !nextCustomer.pendingRequest &&
  gameMinutes >= nextCustomer.nextRequestAtMinutes &&
  minutesSinceLastPurchase >= MIN_COOLDOWN  // ADD THIS CHECK
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
Improvement 2: Log fulfilled requests
Location: src/store/customerStore.ts Line 735-739 ADD after successful fulfill:

const sale = get().sellToCustomer(customerId, chosenBud.id, pending.gramsRequested);
if (!sale.success) {
  return { success: false, message: sale.message };
}

// ADD: Log successful request fulfillment
console.log(`✅ Request fulfilled: ${customer.name} bought ${pending.gramsRequested}g ${pending.drug} for $${sale.revenue}`);

result = { success: true, revenue: sale.revenue, message: sale.message };
📊 Testing Checklist
Nach allen Fixes:
 Weed-Request kann erfüllt werden (kein "will nicht zahlen" mehr)
 Koks-Request kann erfüllt werden
 Meth-Request kann erfüllt werden
 Customer bekommt neuen Request erst nach Cooldown
 nextRequestAtMinutes wird nach ALLEN Käufen gesetzt
 Addicts (80+ addiction) bekommen Requests alle 1-2h
 Casual customers bekommen Requests alle 1-2 Tage
 Kein Spam von Requests (30min Minimum-Cooldown funktioniert)
 Preis-Tolerance verhindert false negatives
 Keine Crashes wegen territoryStore
📝 Dateien zum Ändern
1. src/store/customerStore.ts (MULTIPLE FIXES)
Änderungen:
Line 226-235: DELETE getTerritorySalesMultiplier
Line 180-196: REDUCE request intervals
Line 711-739: FIX fulfillRequest weed price check
Line 692-694: ADD price tolerance for koks/meth
Line 709-723: FIX nextRequestAtMinutes for all drugs
Line 1111-1134: ADD purchase cooldown check (30min)
Geschätzte Zeit: 2-3 Stunden
⚖️ Balancing-Überlegungen
Request-Frequenzen (NEU):
Desperate Addicts (80+): 1-2h → 12-24 Requests/Tag
Heavy Addicts (50+): 3-6h → 4-8 Requests/Tag
Light Users (20+): 6-12h → 2-4 Requests/Tag
Casual: 1-2 Tage → 0.5-1 Request/Tag
Paranoid: 2-4 Tage → 0.25-0.5 Request/Tag
Ist das zu viel?
Bei 10 aktiven Customers: ~20-50 Requests/Tag
Mit 30min Cooldown: Max 48 Requests/Tag pro Customer (unrealistisch)
Real: ~2-5 Requests/Tag pro aktiven Customer → OK
Price Tolerance:
10% tolerance verhindert false negatives wegen Rounding/Quality-Schwankungen
Customer zahlt max 10% mehr als ursprünglich bereit → Fair