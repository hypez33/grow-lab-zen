/**
 * Shared bottleneck / opportunity detection.
 *
 * Single source of truth for both the SmartCoach hint banner and the
 * Shop "Recommended" tab. Pure data: takes a snapshot of relevant store
 * fields and returns prioritized hints.
 */
import type { NavFocus, Screen } from '@/store/navigationStore';
import { useGameStore } from '@/store/gameStore';
import { useCustomerStore, matchWeedRequest } from '@/store/customerStore';
import { useBusinessStore } from '@/store/businessStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { isFeatureUnlocked } from '@/lib/progression';
import { getRankProgress, getRankStats } from '@/data/ranks';

export type HintSeverity = 'info' | 'warning' | 'urgent' | 'opportunity';

export interface BottleneckHint {
  /** Stable id for throttling / deduping. */
  id: string;
  icon: string;
  /** Short text for compact UI (MiniDashboard / QuickActions). */
  text: string;
  /** Higher = surfaced first. */
  priority: number;
  severity: HintSeverity;

  /** Optional CTA button label (e.g. "Verkaufen"). */
  ctaLabel?: string;
  /** Why this matters (1 sentence). */
  reason?: string;
  /** Optional secondary line for richer surfaces (Shop reco card). */
  secondaryText?: string;

  /** Where to navigate when clicked. */
  action?: Screen;
  /** Optional deep-link target inside the destination screen. */
  focus?: NavFocus;
  /** Optional in-shop tab target (used by Shop reco). */
  shopTab?: 'recommended' | 'seeds' | 'growroom' | 'drying' | 'sales' | 'crew' | 'business' | 'style';
  /** Optional related upgrade/item id (e.g. for "Buy this rack"). */
  targetId?: string;
}

// Snapshot of all store data used by the detector, taken once per call.
interface BottleneckCtx {
  level: number;
  budcoins: number;

  // Grow
  emptySlots: number;
  totalSlots: number;
  thirstyCount: number;
  thirstySlotId: number | null;
  readyHarvestCount: number;
  readyHarvestSlotId: number | null;

  // Drying
  wetBuds: number;
  wetGrams: number;
  freeRacks: number;
  totalRacks: number;
  freeRackId: number | null;
  fullRacks: number;
  fullRackId: number | null;
  rackCapacityShortGrams: number;

  // Inventory & sales
  driedBuds: number;
  driedGrams: number;
  seedsCount: number;
  autoSellEnabled: boolean;
  recentlySold: boolean;
  visitedSales: boolean;

  // Customers
  customersUnlocked: boolean;
  pendingRequests: number;
  fulfillableRequestId: string | null;
  fulfillableSecondary?: string;
  expiringRequestId: string | null;
  expiringSecondary?: string;
  unmatchedRequestId: string | null;
  unmatchedSecondary?: string;

  // Workers
  weedWorkersOwned: number;
  weedWorkersAvailable: number;

  // Business / warehouse
  businessUnlocked: boolean;
  hasBusiness: boolean;
  hasWarehouse: boolean;
  warehouseFreeRatio: number; // 0..1, 1 means fully empty
  warehouseWaitingShipments: number;

  // Territory
  turfUnlocked: boolean;
  territoriesOwned: number;
  dealersAssigned: number;

  // Global meta
  heatLevelId: 'safe' | 'warm' | 'high' | 'critical';
  rankProgressOverall: number;
  nextRankName: string | null;
  nextRankIcon: string | null;
}

/** Pull a fresh snapshot from all relevant stores. Cheap. */
export const getBottleneckCtx = (visitedFeatures: string[] = []): BottleneckCtx => {
  const game = useGameStore.getState();
  const customer = useCustomerStore.getState();
  const business = useBusinessStore.getState();
  const territory = useTerritoryStore.getState();

  // Grow
  const unlockedSlots = game.growSlots.filter(s => s.isUnlocked);
  const emptySlotList = unlockedSlots.filter(s => !s.seed);
  const thirstyList = unlockedSlots.filter(s => s.seed && s.waterLevel < 25);
  const readyHarvestList = unlockedSlots.filter(s => s.seed && s.stage === 'harvest' && s.progress >= 100);

  // Drying
  const wetItems = game.inventory.filter(b => b.state === 'wet');
  const wetBuds = wetItems.length;
  const wetGrams = wetItems.reduce((sum, b) => sum + (b.grams ?? 0), 0);
  const unlockedRacks = game.dryingRacks.filter(r => r.isUnlocked);
  const freeRacks = unlockedRacks.filter(r => !r.bud);
  const fullRacks = unlockedRacks.filter(r => r.bud && r.bud.dryingProgress >= 100);
  const rackCapacityShortGrams = Math.max(0, wetGrams - freeRacks.length * 10); // ~10g/rack heuristic

  // Inventory
  const driedItems = game.inventory.filter(b => b.state === 'dried');
  const driedBuds = driedItems.length;
  const driedGrams = driedItems.reduce((sum, b) => sum + (b.grams ?? 0), 0);

  const lastSale = (game as any).lastAutoSellAt ?? 0;
  const recentlySold = lastSale > 0 && Date.now() - lastSale < 60_000;
  const visitedSales = visitedFeatures.includes('sales');

  // Customers — find a fulfillable, expiring, unmatched request.
  const customers = customer.customers ?? [];
  let fulfillableRequestId: string | null = null;
  let fulfillableSecondary: string | undefined;
  let expiringRequestId: string | null = null;
  let expiringSecondary: string | undefined;
  let unmatchedRequestId: string | null = null;
  let unmatchedSecondary: string | undefined;
  let pendingRequests = 0;
  const now = Date.now();

  for (const c of customers) {
    const req = c.pendingRequest;
    if (!req) continue;
    pendingRequests++;
    const msLeft = req.expiresAt - now;

    if (req.drug === 'weed') {
      const result = matchWeedRequest(req, game.inventory);
      if (result.best) {
        if (!fulfillableRequestId) {
          fulfillableRequestId = req.id;
          fulfillableSecondary = `${c.name}: ${req.gramsRequested}g · max $${req.maxPrice}`;
        }
      } else if (result.issues.length > 0) {
        if (!unmatchedRequestId) {
          unmatchedRequestId = req.id;
          unmatchedSecondary = `${c.name}: ${result.issues[0].message}`;
        }
      }
    }

    if (msLeft > 0 && msLeft < 90_000 && !expiringRequestId) {
      expiringRequestId = req.id;
      const mins = Math.max(1, Math.round(msLeft / 60_000));
      expiringSecondary = `${c.name}: läuft in ${mins} Min ab`;
    }
  }

  // Workers
  const weedWorkersOwned = game.workers.filter(w => w.owned).length;

  // Business / warehouse
  const businesses = business.businesses ?? [];
  const ownedBusinesses = businesses.filter((b: any) => b.owned);
  const hasBusiness = ownedBusinesses.length > 0;
  const hasWarehouse = ownedBusinesses.some((b: any) => typeof b.id === 'string' && b.id.startsWith('warehouse-'));
  const warehouseCapacity = (business as any).warehouseCapacity ?? 0;
  const warehouseUsed = ((business as any).warehouseLots ?? []).reduce(
    (sum: number, lot: any) => sum + (lot.grams ?? 0),
    0
  );
  const warehouseFreeRatio = warehouseCapacity > 0
    ? Math.max(0, (warehouseCapacity - warehouseUsed) / warehouseCapacity)
    : 1;
  const warehouseWaitingShipments = ((business as any).shipments ?? []).filter(
    (s: any) => s.status === 'waiting'
  ).length;

  // Territory
  const territories = territory.territories ?? [];
  const territoriesOwned = territories.filter((t: any) => (t.control ?? 0) >= 25).length;
  const dealersAssigned = territories.reduce((sum: number, t: any) => sum + ((t.assignedDealerIds ?? []).length), 0);

  // Heat & Rank
  const heatLevel = typeof game.getHeatLevel === 'function' ? game.getHeatLevel() : { id: 'safe' as const };
  let rankProgressOverall = 0;
  let nextRankName: string | null = null;
  let nextRankIcon: string | null = null;
  try {
    const prog = getRankProgress(getRankStats());
    rankProgressOverall = prog.overall;
    nextRankName = prog.next?.name ?? null;
    nextRankIcon = prog.next?.icon ?? null;
  } catch { /* ranks optional */ }

  return {
    level: game.level,
    budcoins: game.budcoins,

    emptySlots: emptySlotList.length,
    totalSlots: unlockedSlots.length,
    thirstyCount: thirstyList.length,
    thirstySlotId: thirstyList[0]?.id ?? null,
    readyHarvestCount: readyHarvestList.length,
    readyHarvestSlotId: readyHarvestList[0]?.id ?? null,

    wetBuds,
    wetGrams,
    freeRacks: freeRacks.length,
    totalRacks: unlockedRacks.length,
    freeRackId: freeRacks[0]?.id ?? null,
    fullRacks: fullRacks.length,
    fullRackId: fullRacks[0]?.id ?? null,
    rackCapacityShortGrams,

    driedBuds,
    driedGrams,
    seedsCount: game.seeds.length,
    autoSellEnabled: game.autoSellSettings?.enabled ?? false,
    recentlySold,
    visitedSales,

    customersUnlocked: isFeatureUnlocked('customers', game.level),
    pendingRequests,
    fulfillableRequestId,
    fulfillableSecondary,
    expiringRequestId,
    expiringSecondary,
    unmatchedRequestId,
    unmatchedSecondary,

    weedWorkersOwned,
    weedWorkersAvailable: game.workers.length,

    businessUnlocked: isFeatureUnlocked('business', game.level),
    hasBusiness,
    hasWarehouse,
    warehouseFreeRatio,
    warehouseWaitingShipments,

    turfUnlocked: isFeatureUnlocked('turf', game.level),
    territoriesOwned,
    dealersAssigned,

    heatLevelId: (heatLevel?.id ?? 'safe') as BottleneckCtx['heatLevelId'],
    rankProgressOverall,
    nextRankName,
    nextRankIcon,
  };
};

// ---------- Detector --------------------------------------------------------

export const detectBottlenecks = (ctx: BottleneckCtx): BottleneckHint[] => {
  const hints: BottleneckHint[] = [];

  // ---- urgent operations ----
  if (ctx.readyHarvestCount > 0) {
    hints.push({
      id: 'harvest',
      icon: '🌿',
      text: `${ctx.readyHarvestCount} Pflanze${ctx.readyHarvestCount > 1 ? 'n' : ''} erntereif!`,
      priority: 100,
      severity: 'urgent',
      ctaLabel: 'Ernten',
      reason: 'Reife Pflanzen blockieren Slots, bis du erntest.',
      action: 'grow',
      focus: ctx.readyHarvestSlotId !== null ? { type: 'slot', id: ctx.readyHarvestSlotId } : undefined,
    });
  }

  if (ctx.fullRacks > 0) {
    hints.push({
      id: 'dried',
      icon: '✨',
      text: `${ctx.fullRacks} Bud${ctx.fullRacks > 1 ? 's' : ''} fertig getrocknet!`,
      priority: 95,
      severity: 'urgent',
      ctaLabel: 'Abräumen',
      reason: 'Lass kein Premium-Material in den Racks vergammeln.',
      action: 'dryroom',
      focus: ctx.fullRackId !== null ? { type: 'rack', id: ctx.fullRackId } : undefined,
    });
  }

  if (ctx.thirstyCount > 0) {
    hints.push({
      id: 'thirsty',
      icon: '💧',
      text: `${ctx.thirstyCount} Pflanze${ctx.thirstyCount > 1 ? 'n' : ''} dringend gießen!`,
      priority: 90,
      severity: 'urgent',
      ctaLabel: 'Gießen',
      reason: 'Trockene Pflanzen wachsen langsamer und können absterben.',
      action: 'grow',
      focus: ctx.thirstySlotId !== null ? { type: 'slot', id: ctx.thirstySlotId } : undefined,
    });
  }

  // ---- customer requests ----
  if (ctx.customersUnlocked && ctx.expiringRequestId) {
    hints.push({
      id: `req-expire-${ctx.expiringRequestId}`,
      icon: '⏰',
      text: 'Kunden-Anfrage läuft bald ab!',
      priority: 88,
      severity: 'urgent',
      ctaLabel: 'Erledigen',
      reason: 'Verpasste Anfragen kosten Loyalität & Reputation.',
      secondaryText: ctx.expiringSecondary,
      action: 'customers',
    });
  }

  if (ctx.customersUnlocked && ctx.fulfillableRequestId) {
    hints.push({
      id: `req-fulfil-${ctx.fulfillableRequestId}`,
      icon: '🤝',
      text: 'Du kannst eine Kunden-Anfrage erfüllen',
      priority: 75,
      severity: 'opportunity',
      ctaLabel: 'Liefern',
      reason: 'Erfüllte Anfragen geben Cash, XP, Rep und Loyalität.',
      secondaryText: ctx.fulfillableSecondary,
      action: 'customers',
    });
  }

  if (ctx.customersUnlocked && ctx.unmatchedRequestId && !ctx.fulfillableRequestId) {
    hints.push({
      id: `req-mismatch-${ctx.unmatchedRequestId}`,
      icon: '🔍',
      text: 'Anfrage passt nicht zu deinem Lager',
      priority: 60,
      severity: 'warning',
      ctaLabel: 'Passende Ware bauen',
      reason: 'Andere Strain, höhere Qualität oder Rarität nötig.',
      secondaryText: ctx.unmatchedSecondary,
      action: 'grow',
    });
  }

  // ---- drying flow ----
  if (ctx.wetBuds > 0 && ctx.freeRacks > 0) {
    hints.push({
      id: 'dry-now',
      icon: '🌬️',
      text: `${ctx.wetBuds} nasse Buds → ${ctx.freeRacks} freie Racks`,
      priority: 70,
      severity: 'opportunity',
      ctaLabel: 'Trocknen',
      reason: 'Nass = unverkäuflich. Trocknen sofort starten.',
      action: 'dryroom',
      focus: ctx.freeRackId !== null ? { type: 'rack', id: ctx.freeRackId } : undefined,
    });
  } else if (ctx.wetBuds > 0 && ctx.freeRacks === 0 && ctx.totalRacks > 0) {
    hints.push({
      id: 'racks-full-grams',
      icon: '📦',
      text: `Racks voll — ${ctx.wetGrams.toFixed(0)}g warten`,
      priority: 72,
      severity: 'warning',
      ctaLabel: 'Mehr Racks',
      reason: 'Wachsender Backlog blockiert deinen Cashflow.',
      secondaryText: ctx.rackCapacityShortGrams > 0
        ? `Etwa ${ctx.rackCapacityShortGrams.toFixed(0)}g zu viel für aktuelle Kapazität`
        : undefined,
      action: 'shop',
      shopTab: 'drying',
    });
  } else if (ctx.wetBuds > 0 && ctx.totalRacks === 0) {
    hints.push({
      id: 'first-rack',
      icon: '📦',
      text: 'Du brauchst dein erstes Drying Rack',
      priority: 73,
      severity: 'warning',
      ctaLabel: 'Rack kaufen',
      reason: 'Ohne Rack lässt sich nichts trocknen oder verkaufen.',
      action: 'shop',
      shopTab: 'drying',
    });
  }

  // ---- sales bottlenecks ----
  if (ctx.driedBuds > 0 && !ctx.visitedSales) {
    hints.push({
      id: 'visit-sales',
      icon: '🏷️',
      text: `${ctx.driedBuds} verkaufsfertige Buds — Sales öffnen`,
      priority: 65,
      severity: 'opportunity',
      ctaLabel: 'Sales',
      reason: 'Verkauf ist deine Hauptgeldquelle, nicht die Ernte.',
      action: 'sales',
    });
  } else if (ctx.driedGrams >= 50 && !ctx.recentlySold && !ctx.autoSellEnabled) {
    hints.push({
      id: 'sales-stalled',
      icon: '💰',
      text: `${ctx.driedGrams.toFixed(0)}g liegen rum — verkaufe!`,
      priority: 58,
      severity: 'warning',
      ctaLabel: 'Auto-Sell?',
      reason: 'Lager-Stau ohne Cashflow. Auto-Sell oder bessere Kanäle nutzen.',
      action: 'sales',
    });
  } else if (ctx.driedBuds >= 6 && !ctx.autoSellEnabled) {
    hints.push({
      id: 'enable-auto-sell',
      icon: '⚙️',
      text: 'Auto-Sell aktivieren',
      priority: 45,
      severity: 'opportunity',
      ctaLabel: 'Aktivieren',
      reason: 'Verkauft kontinuierlich an die besten Kanäle, auch offline.',
      action: 'sales',
    });
  } else if (ctx.driedBuds >= 10) {
    hints.push({
      id: 'sell-stack',
      icon: '💰',
      text: `${ctx.driedBuds} fertige Buds — Zeit zu verkaufen!`,
      priority: 50,
      severity: 'opportunity',
      ctaLabel: 'Verkaufen',
      reason: 'Cashflow rein, Lager raus.',
      action: 'sales',
    });
  }

  // ---- heat & meta ----
  if (ctx.heatLevelId === 'critical') {
    hints.push({
      id: 'heat-critical',
      icon: '🔥',
      text: 'Heat kritisch — runterfahren!',
      priority: 92,
      severity: 'urgent',
      ctaLabel: 'Cover ausbauen',
      reason: 'Hohe Heat senkt Anfragen und Verkaufseffizienz. Front-Businesses helfen.',
      action: 'business',
    });
  } else if (ctx.heatLevelId === 'high') {
    hints.push({
      id: 'heat-high',
      icon: '🔥',
      text: 'Heat steigt — Tempo drosseln',
      priority: 55,
      severity: 'warning',
      ctaLabel: 'Business',
      reason: 'Front-Businesses senken Heat passiv.',
      action: 'business',
    });
  }

  // ---- mid/late game scaling ----
  if (ctx.businessUnlocked && !ctx.hasBusiness) {
    hints.push({
      id: 'first-business',
      icon: '🏢',
      text: 'Business freigeschaltet — eröffne deinen ersten Front',
      priority: 42,
      severity: 'opportunity',
      ctaLabel: 'Business',
      reason: 'Passives Einkommen + senkt Heat.',
      action: 'business',
    });
  }

  if (ctx.hasWarehouse && ctx.warehouseFreeRatio <= 0.05) {
    hints.push({
      id: 'warehouse-full',
      icon: '🏗️',
      text: 'Warehouse voll — Großhandel verkaufen',
      priority: 78,
      severity: 'warning',
      ctaLabel: 'Bulk Sale',
      reason: 'Volles Lager blockiert neue Lieferungen.',
      action: 'business',
    });
  }

  if (ctx.warehouseWaitingShipments > 0 && ctx.warehouseFreeRatio <= 0.1) {
    hints.push({
      id: 'shipment-waiting',
      icon: '🚚',
      text: `${ctx.warehouseWaitingShipments} Lieferung(en) wartet auf Platz`,
      priority: 76,
      severity: 'warning',
      ctaLabel: 'Platz schaffen',
      reason: 'Warenfluss steht — verkaufe oder erweitere das Lager.',
      action: 'business',
    });
  }

  if (ctx.turfUnlocked && ctx.territoriesOwned > 0 && ctx.dealersAssigned === 0) {
    hints.push({
      id: 'assign-dealer',
      icon: '🗺️',
      text: 'Territorium ohne Dealer',
      priority: 40,
      severity: 'opportunity',
      ctaLabel: 'Zuweisen',
      reason: 'Ohne Dealer kein passives Turf-Einkommen.',
      action: 'turf',
    });
  }

  // ---- foundational ----
  if (ctx.emptySlots > 0 && ctx.seedsCount > 0) {
    hints.push({
      id: 'plant',
      icon: '🌱',
      text: `${ctx.emptySlots} leere Slots — pflanze etwas an!`,
      priority: 30,
      severity: 'info',
      ctaLabel: 'Pflanzen',
      reason: 'Leere Slots produzieren nichts.',
      action: 'grow',
    });
  } else if (ctx.emptySlots > 0 && ctx.seedsCount === 0) {
    hints.push({
      id: 'buy-seeds',
      icon: '🛒',
      text: 'Keine Samen mehr — besuche den Shop',
      priority: 35,
      severity: 'warning',
      ctaLabel: 'Seeds',
      reason: 'Ohne Samen keine Produktion.',
      action: 'shop',
      shopTab: 'seeds',
    });
  }

  if (ctx.level >= 5 && ctx.weedWorkersOwned === 0 && ctx.weedWorkersAvailable > 0) {
    hints.push({
      id: 'first-worker',
      icon: '👔',
      text: 'Stelle deinen ersten Worker ein',
      priority: 38,
      severity: 'opportunity',
      ctaLabel: 'Crew',
      reason: 'Worker pflanzen, ernten und trocknen automatisch — auch offline.',
      action: 'shop',
      shopTab: 'crew',
    });
  }

  // Rank close to next milestone
  if (ctx.rankProgressOverall >= 0.75 && ctx.nextRankName) {
    hints.push({
      id: `rank-near-${ctx.nextRankName}`,
      icon: ctx.nextRankIcon ?? '🏆',
      text: `Rang ${ctx.nextRankName} ist greifbar (${Math.round(ctx.rankProgressOverall * 100)}%)`,
      priority: 36,
      severity: 'opportunity',
      ctaLabel: 'Roadmap',
      reason: 'Schließe die letzten Anforderungen für die Belohnung ab.',
      action: 'shop',
      shopTab: 'recommended',
    });
  }

  // Sort by priority desc
  hints.sort((a, b) => b.priority - a.priority);
  return hints;
};

// ---------- Convenience ----------------------------------------------------

export const SEVERITY_CLASS: Record<HintSeverity, string> = {
  info: 'from-neon-purple/15 to-neon-cyan/15 border-neon-purple/25 text-foreground',
  opportunity: 'from-neon-green/15 to-emerald-500/10 border-neon-green/30 text-foreground',
  warning: 'from-amber-500/15 to-orange-500/10 border-amber-500/40 text-foreground',
  urgent: 'from-red-500/20 to-rose-500/10 border-red-500/50 text-foreground',
};

export const SEVERITY_ICON_COLOR: Record<HintSeverity, string> = {
  info: 'text-neon-purple',
  opportunity: 'text-neon-green',
  warning: 'text-amber-400',
  urgent: 'text-red-400',
};
