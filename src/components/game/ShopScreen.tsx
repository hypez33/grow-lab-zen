import { motion, AnimatePresence } from 'framer-motion';
import React, { useMemo, useState } from 'react';
import { useGameStore, Upgrade, Worker, SEED_CATALOG, Rarity } from '@/store/gameStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCocaStore, CocaWorker, COCA_SEED_CATALOG, CocaRarity } from '@/store/cocaStore';
import { useMethStore, MethWorker } from '@/store/methStore';
import { useCustomerStore } from '@/store/customerStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { useNavigationStore } from '@/store/navigationStore';
import { isFeatureUnlocked, FEATURE_UNLOCKS, type FeatureId } from '@/lib/progression';
import { getCurrentRank, getNextRank, getRankProgress, getRankStats, formatRequirements } from '@/data/ranks';
import { detectBottlenecks, getBottleneckCtx, type BottleneckHint } from '@/lib/bottlenecks';
import { useOnboardingStore } from '@/store/onboardingStore';
import { PlayCircle, PauseCircle } from 'lucide-react';
import { ResourceBadge } from './ResourceIcon';
import {
  Zap,
  Leaf,
  Bot,
  Palette,
  Lock,
  Check,
  Users,
  ArrowUp,
  Sprout,
  Snowflake,
  FlaskConical,
  Wind,
  Sparkles,
  Building2,
  ShoppingBag,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

// ============================================================================
// Constants & helpers
// ============================================================================

const categoryIcons = {
  equipment: Zap,
  genetics: Leaf,
  automation: Bot,
  cosmetics: Palette,
  drying: Wind,
  sales: ShoppingBag,
} as const;

const categoryColors = {
  equipment: 'text-neon-green',
  genetics: 'text-resource-seeds',
  automation: 'text-neon-cyan',
  cosmetics: 'text-neon-pink',
  drying: 'text-neon-gold',
  sales: 'text-neon-cyan',
} as const;

const getSeedPrice = (rarity: Rarity | CocaRarity): number => {
  switch (rarity) {
    case 'common': return 5;
    case 'uncommon': return 15;
    case 'rare': return 50;
    case 'epic': return 150;
    case 'legendary': return 500;
    default: return 10;
  }
};

const getRarityColor = (rarity: Rarity | CocaRarity): string => {
  switch (rarity) {
    case 'legendary': return 'hsl(45 100% 55%)';
    case 'epic': return 'hsl(270 70% 55%)';
    case 'rare': return 'hsl(210 100% 60%)';
    case 'uncommon': return 'hsl(180 100% 50%)';
    default: return 'hsl(0 0% 70%)';
  }
};

type ShopTabId =
  | 'recommended'
  | 'seeds'
  | 'growroom'
  | 'drying'
  | 'sales'
  | 'crew'
  | 'business'
  | 'style';

// ============================================================================
// Recommendation engine — backed by shared bottleneck detector.
// ============================================================================

interface Recommendation {
  id: string;
  problem: string;
  action: string;
  why: string;
  cta: string;
  badge?: string;
  /** If set, clicking jumps to that tab instead of navigating away. */
  goToTab?: ShopTabId;
  /** If set, clicking navigates to the given screen. */
  goToScreen?: FeatureId;
  cost?: number;
  locked?: string | null;
  severity?: 'info' | 'warning' | 'urgent' | 'opportunity';
}

const SEVERITY_BADGE: Record<NonNullable<Recommendation['severity']>, string> = {
  urgent: 'Sofort',
  warning: 'Engpass',
  opportunity: 'Optimieren',
  info: 'Tipp',
};

const SEVERITY_DOT: Record<NonNullable<Recommendation['severity']>, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  opportunity: 'bg-neon-green/20 text-neon-green',
  info: 'bg-neon-purple/20 text-neon-purple',
};

// ============================================================================
// Main component
// ============================================================================

export const ShopScreen = () => {
  const [activeTab, setActiveTab] = useState<ShopTabId>('recommended');
  const [bulkSeed, setBulkSeed] = useState<{ name: string; rarity: Rarity | CocaRarity; type: 'weed' | 'coca' } | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState(1);

  const {
    upgrades, budcoins, buyUpgrade, workers, buyWorker, upgradeWorker, buySeed, seeds,
    toggleWorkerPause, level, growSlots, inventory, dryingRacks, autoSellSettings,
  } = useGameStore();

  const koksGrams = useBusinessStore(state => state.warehouseLots.reduce((sum, lot) => (
    lot.drug === 'koks' ? sum + lot.grams : sum
  ), 0));
  const businesses = useBusinessStore(state => state.businesses);
  const { cocaWorkers, buyCocaWorker, upgradeCocaWorker, toggleCocaWorkerPause, cocaSeeds, buyCocaSeed } = useCocaStore();
  const { methWorkers, buyMethWorker, upgradeMethWorker, toggleMethWorkerPause } = useMethStore();
  const customers = useCustomerStore(state => state.customers);
  const territories = useTerritoryStore(state => state.territories);
  const navigateTo = useNavigationStore(state => state.navigateTo);

  const { playPurchase, playError } = useGameSounds();

  // ----- centralized payment helpers --------------------------------------
  const canAfford = (amount: number) => budcoins >= amount;
  const spendCash = (amount: number, reason?: string) => {
    if (!canAfford(amount)) {
      playError();
      toast.error(`Nicht genug $${reason ? ` für ${reason}` : ''}!`);
      return false;
    }
    useGameStore.setState(state => ({ budcoins: state.budcoins - amount }));
    return true;
  };

  // ----- feature unlocks --------------------------------------------------
  const cocaUnlocked = isFeatureUnlocked('koks', level);
  const methUnlocked = isFeatureUnlocked('meth', level);
  const businessUnlocked = isFeatureUnlocked('business', level);
  const turfUnlocked = isFeatureUnlocked('turf', level);
  const customersUnlocked = isFeatureUnlocked('customers', level);

  // ----- recommendation list (shared bottleneck detector) ----------------
  const visited = useOnboardingStore(s => s.visitedFeatures);
  const recommendations = useMemo<Recommendation[]>(() => {
    const ctx = getBottleneckCtx(visited as string[]);
    const hints = detectBottlenecks(ctx);
    if (hints.length === 0) {
      return [{
        id: 'all-good',
        problem: 'Alles läuft rund 🎉',
        action: 'Erkunde die anderen Tabs für Upgrades',
        why: 'Stocke Equipment, Workers oder Style auf, um den nächsten Sprung zu machen.',
        cta: 'Zu Upgrades',
        goToTab: 'growroom',
        severity: 'info',
      }];
    }
    return hints.slice(0, 6).map((h: BottleneckHint): Recommendation => ({
      id: h.id,
      problem: h.text,
      action: h.ctaLabel ? `${h.icon} ${h.ctaLabel}` : `${h.icon} ${h.text}`,
      why: h.reason ?? '',
      cta: h.ctaLabel ?? 'Öffnen',
      badge: SEVERITY_BADGE[h.severity],
      goToTab: h.shopTab as ShopTabId | undefined,
      goToScreen: h.action as FeatureId | undefined,
      severity: h.severity,
    }));
  }, [
    visited, level, budcoins, growSlots, seeds.length, inventory, dryingRacks, customers,
    workers, autoSellSettings, businesses, territories,
  ]);

  // ----- handlers --------------------------------------------------------
  const handleBuyUpgrade = (upgradeId: string, cost: number) => {
    if (!canAfford(cost)) {
      playError();
      return;
    }
    buyUpgrade(upgradeId);
    playPurchase();
  };

  const handleBuyWorker = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || worker.owned) { playError(); return; }
    const needsKoks = (worker.costKoksGrams ?? 0) > 0;
    if (needsKoks) {
      if (koksGrams < (worker.costKoksGrams ?? 0)) {
        playError();
        toast.error('Nicht genug Koks!', { description: `${worker.costKoksGrams}g benötigt.` });
        return;
      }
    } else if (!canAfford(worker.cost)) {
      playError();
      toast.error('Nicht genug $!');
      return;
    }
    if (buyWorker(workerId)) {
      playPurchase();
      toast.success(`${worker.name} eingestellt!`, { description: worker.description });
    }
  };

  const handleUpgradeWorker = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;
    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
    if (!canAfford(upgradeCost)) { playError(); toast.error('Nicht genug $!'); return; }
    if (upgradeWorker(workerId)) {
      playPurchase();
      toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
    }
  };

  const handleBuySeed = (seedName: string, rarity: Rarity) => {
    const cost = getSeedPrice(rarity);
    if (!canAfford(cost)) { playError(); toast.error('Nicht genug $!'); return; }
    if (buySeed(seedName, cost)) {
      playPurchase();
      toast.success(`${seedName} gekauft!`);
    }
  };

  const handleBuyCocaSeed = (seedName: string, rarity: CocaRarity) => {
    const cost = getSeedPrice(rarity);
    const result = buyCocaSeed(seedName, cost, budcoins);
    if (result.success) {
      spendCash(cost, seedName);
      playPurchase();
      toast.success(`${seedName} gekauft!`);
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleBuyCocaWorker = (workerId: string) => {
    const worker = cocaWorkers.find(w => w.id === workerId);
    if (!worker || worker.owned) { playError(); return; }
    if (!canAfford(worker.cost)) { playError(); toast.error('Nicht genug $!'); return; }
    const result = buyCocaWorker(workerId, budcoins);
    if (result.success) {
      spendCash(result.cost, worker.name);
      playPurchase();
      toast.success(`${worker.name} angeheuert!`, { description: worker.description });
    }
  };

  const handleUpgradeCocaWorker = (workerId: string) => {
    const worker = cocaWorkers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;
    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
    if (!canAfford(upgradeCost)) { playError(); toast.error('Nicht genug $!'); return; }
    const result = upgradeCocaWorker(workerId, budcoins);
    if (result.success) {
      spendCash(result.cost, worker.name);
      playPurchase();
      toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
    }
  };

  const handleBuyMethWorker = (workerId: string) => {
    const worker = methWorkers.find(w => w.id === workerId);
    if (!worker || worker.owned) { playError(); return; }
    if (!canAfford(worker.cost)) { playError(); toast.error('Nicht genug $!'); return; }
    const result = buyMethWorker(workerId, budcoins);
    if (result.success) {
      spendCash(result.cost, worker.name);
      playPurchase();
      toast.success(`${worker.name} angeheuert!`, { description: worker.description });
    }
  };

  const handleUpgradeMethWorker = (workerId: string) => {
    const worker = methWorkers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;
    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
    if (!canAfford(upgradeCost)) { playError(); toast.error('Nicht genug $!'); return; }
    const result = upgradeMethWorker(workerId, budcoins);
    if (result.success) {
      spendCash(result.cost, worker.name);
      playPurchase();
      toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
    }
  };

  const openBulkSeedModal = (seedName: string, rarity: Rarity | CocaRarity, type: 'weed' | 'coca') => {
    setBulkSeed({ name: seedName, rarity, type });
    setBulkQuantity(1);
  };

  const handleBulkSeedBuy = () => {
    if (!bulkSeed) return;
    const unitCost = getSeedPrice(bulkSeed.rarity);
    const maxAffordable = unitCost > 0 ? Math.floor(useGameStore.getState().budcoins / unitCost) : 0;
    if (maxAffordable <= 0) { playError(); toast.error('Nicht genug $!'); return; }
    const desiredQuantity = Math.min(Math.max(1, bulkQuantity), maxAffordable);
    let purchased = 0;

    if (bulkSeed.type === 'weed') {
      for (let i = 0; i < desiredQuantity; i += 1) {
        if (!buySeed(bulkSeed.name, unitCost)) break;
        purchased += 1;
      }
    } else {
      let remaining = useGameStore.getState().budcoins;
      for (let i = 0; i < desiredQuantity; i += 1) {
        if (remaining < unitCost) break;
        const result = buyCocaSeed(bulkSeed.name, unitCost, remaining);
        if (!result.success) break;
        remaining -= unitCost;
        purchased += 1;
      }
      if (purchased > 0) spendCash(unitCost * purchased, bulkSeed.name);
    }

    if (purchased > 0) {
      playPurchase();
      toast.success(`${bulkSeed.name} x${purchased} gekauft!`);
      setBulkSeed(null);
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  // ----- tab definitions --------------------------------------------------
  const tabs: { id: ShopTabId; label: string; icon: React.ElementType }[] = [
    { id: 'recommended', label: 'Empfohlen', icon: Sparkles },
    { id: 'seeds', label: 'Seeds', icon: Sprout },
    { id: 'growroom', label: 'Growroom', icon: Zap },
    { id: 'drying', label: 'Trocknung', icon: Wind },
    { id: 'sales', label: 'Verkauf', icon: ShoppingBag },
    { id: 'crew', label: 'Crew', icon: Users },
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'style', label: 'Style', icon: Palette },
  ];

  // Filter upgrades by intended tab
  const growroomUpgrades = upgrades.filter(u => u.category === 'equipment' || (u.category === 'automation' && u.id !== 'tap-power'));
  const dryingUpgrades = upgrades.filter(u => u.category === 'drying');
  const salesUpgrades = upgrades.filter(u => u.category === 'sales');
  const cosmeticUpgrades = upgrades.filter(u => u.category === 'cosmetics');
  const geneticsUpgrades = upgrades.filter(u => u.category === 'genetics');

  const handleRecoClick = (reco: Recommendation) => {
    if (reco.goToTab) setActiveTab(reco.goToTab);
    else if (reco.goToScreen) navigateTo(reco.goToScreen);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-display font-bold text-neon-green">Shop</h1>
        <ResourceBadge type="cash" value={budcoins} size="lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }
              `}
            >
              <Icon size={16} />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {/* RECOMMENDED ----------------------------------------------------- */}
        {activeTab === 'recommended' && (
          <div className="grid gap-3">
            {/* Career Rank guidance */}
            {(() => {
              const stats = getRankStats();
              const current = getCurrentRank(stats);
              const next = getNextRank(stats);
              const prog = getRankProgress(stats);
              return (
                <div className="game-card p-3 border border-neon-purple/30 bg-gradient-to-br from-neon-purple/10 to-transparent">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xl ${current.color}`}>{current.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Aktueller Rang</div>
                      <div className={`text-sm font-bold ${current.color}`}>{current.name}</div>
                    </div>
                    {next && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nächster</div>
                        <div className={`text-xs font-bold ${next.color}`}>{next.icon} {next.name}</div>
                      </div>
                    )}
                  </div>
                  {next && (
                    <>
                      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-secondary via-neon-purple to-neon-gold transition-all"
                          style={{ width: `${Math.round(prog.overall * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Benötigt: {formatRequirements(next.requirements)}
                      </p>
                      {next.reward && (
                        <p className="text-[11px] text-neon-gold mt-0.5">🎁 Belohnung: {next.reward.label}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            <div className="text-sm text-muted-foreground mb-2">
              Personalisierte Vorschläge basierend auf deinem aktuellen Spielstand.
            </div>
            <AnimatePresence mode="popLayout">
              {recommendations.map((reco, idx) => (
                <motion.button
                  key={reco.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => handleRecoClick(reco)}
                  className="game-card p-4 text-left hover:border-primary/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${reco.severity ? SEVERITY_DOT[reco.severity] : 'bg-neon-green/10 text-neon-green'}`}>
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-display font-bold text-foreground">{reco.action}</h3>
                        {reco.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${reco.severity ? SEVERITY_DOT[reco.severity] : 'bg-neon-green/20 text-neon-green'}`}>
                            {reco.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{reco.problem}</p>
                      <p className="text-xs text-foreground/70 italic">{reco.why}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-neon-green">
                        {reco.cta}
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* SEEDS ---------------------------------------------------------- */}
        {activeTab === 'seeds' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Erweitere deine Genetik-Sammlung.
            </div>

            <SectionHeader icon={Leaf} label={`Weed Seeds (${seeds.length} im Lager)`} color="text-neon-green" />
            <AnimatePresence mode="popLayout">
              {SEED_CATALOG.map((catalogSeed, index) => (
                <SeedCard
                  key={catalogSeed.name}
                  name={catalogSeed.name}
                  rarity={catalogSeed.rarity}
                  traits={catalogSeed.traits}
                  baseYield={catalogSeed.baseYield}
                  index={index}
                  emoji="🌱"
                  budcoins={budcoins}
                  onBuy={() => handleBuySeed(catalogSeed.name, catalogSeed.rarity)}
                  onBulk={() => openBulkSeedModal(catalogSeed.name, catalogSeed.rarity, 'weed')}
                />
              ))}
            </AnimatePresence>

            {/* Coca seeds — gated */}
            <SectionHeader
              icon={Snowflake}
              label={`Coca Seeds (${cocaSeeds.length} im Lager)`}
              color="text-amber-400"
              locked={!cocaUnlocked ? `Schaltet auf Level ${FEATURE_UNLOCKS.koks.level} frei (Koks Labor)` : null}
            />
            {cocaUnlocked ? (
              <AnimatePresence mode="popLayout">
                {COCA_SEED_CATALOG.map((catalogSeed, index) => (
                  <SeedCard
                    key={catalogSeed.name}
                    name={catalogSeed.name}
                    rarity={catalogSeed.rarity}
                    traits={catalogSeed.traits}
                    baseYield={catalogSeed.baseYield}
                    index={index}
                    emoji="🌿"
                    budcoins={budcoins}
                    onBuy={() => handleBuyCocaSeed(catalogSeed.name, catalogSeed.rarity)}
                    onBulk={() => openBulkSeedModal(catalogSeed.name, catalogSeed.rarity, 'coca')}
                    accentClass="from-amber-600 to-amber-500"
                  />
                ))}
              </AnimatePresence>
            ) : (
              <LockedHint reason={`Erreiche Level ${FEATURE_UNLOCKS.koks.level} und schalte das Koks Labor frei.`} />
            )}

            <div className="game-card p-3 mt-2">
              <div className="text-xs font-bold text-neon-green mb-1 flex items-center gap-2">
                <Sprout size={14} /> Dünger & Erde
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Verwalte Dünger und Erde direkt im Grow-Raum auf jedem Slot.
              </p>
              <button
                onClick={() => navigateTo('grow')}
                className="text-xs font-semibold text-neon-green flex items-center gap-1"
              >
                Zum Grow-Raum <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* GROWROOM ------------------------------------------------------- */}
        {activeTab === 'growroom' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Mehr Slots, schnelleres Wachstum, höhere Erträge.
            </div>
            <AnimatePresence mode="popLayout">
              {growroomUpgrades.map((upgrade, index) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  canAfford={canAfford(Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  onBuy={() => handleBuyUpgrade(upgrade.id, Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  index={index}
                />
              ))}
            </AnimatePresence>

            <SectionHeader
              icon={Leaf}
              label="Genetik-Tools"
              color="text-resource-seeds"
              locked={!isFeatureUnlocked('genetics', level) ? `Schaltet auf Level ${FEATURE_UNLOCKS.genetics.level} frei` : null}
            />
            {isFeatureUnlocked('genetics', level) ? (
              <AnimatePresence mode="popLayout">
                {geneticsUpgrades.map((upgrade, index) => (
                  <UpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    canAfford={canAfford(Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                    onBuy={() => handleBuyUpgrade(upgrade.id, Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <LockedHint reason={`Genetik-Upgrades erscheinen ab Level ${FEATURE_UNLOCKS.genetics.level}.`} />
            )}
          </div>
        )}

        {/* DRYING --------------------------------------------------------- */}
        {activeTab === 'drying' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Schnelleres Trocknen, höhere Qualität, mehr Profit pro Gramm.
            </div>

            <div className="game-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wind size={16} className="text-neon-gold" />
                <h3 className="font-display font-bold text-sm">Drying Racks</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Kaufe neue Racks oder verwalte sie direkt im Trockenraum.
              </p>
              <button
                onClick={() => navigateTo('dryroom')}
                className="text-xs font-semibold text-neon-gold flex items-center gap-1"
              >
                Zum Trockenraum <ChevronRight size={14} />
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {dryingUpgrades.map((upgrade, index) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  canAfford={canAfford(Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  onBuy={() => handleBuyUpgrade(upgrade.id, Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* SALES ---------------------------------------------------------- */}
        {activeTab === 'sales' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Verkaufskanäle, Auto-Sell und Kunden-Management.
            </div>

            <div className="game-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingBag size={16} className="text-neon-cyan" />
                <h3 className="font-display font-bold text-sm">Verkaufskanäle & Auto-Sell</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Verwalte Runner, Dealer-Netze und Auto-Sell-Einstellungen direkt im Verkaufs-Bildschirm.
              </p>
              <button
                onClick={() => navigateTo('sales')}
                className="text-xs font-semibold text-neon-cyan flex items-center gap-1"
              >
                Zum Verkauf <ChevronRight size={14} />
              </button>
            </div>

            {customersUnlocked ? (
              <div className="game-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-neon-pink" />
                  <h3 className="font-display font-bold text-sm">Kunden-Direktverkauf</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Stamm-Kunden zahlen Premium für hohe Qualität. Aktive Kunden: {customers.length}.
                </p>
                <button
                  onClick={() => navigateTo('customers')}
                  className="text-xs font-semibold text-neon-pink flex items-center gap-1"
                >
                  Zu den Kunden <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <LockedHint reason={`Kunden-System schaltet auf Level ${FEATURE_UNLOCKS.customers.level} frei.`} />
            )}

            {salesUpgrades.length > 0 && (
              <AnimatePresence mode="popLayout">
                {salesUpgrades.map((upgrade, index) => (
                  <UpgradeCard
                    key={upgrade.id}
                    upgrade={upgrade}
                    canAfford={canAfford(Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                    onBuy={() => handleBuyUpgrade(upgrade.id, Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        )}

        {/* CREW ----------------------------------------------------------- */}
        {activeTab === 'crew' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Stelle Mitarbeiter ein, die automatisch für dich arbeiten.
            </div>

            <SectionHeader icon={Leaf} label="Weed Crew" color="text-neon-green" />
            <AnimatePresence mode="popLayout">
              {workers.map((worker, index) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  budcoins={budcoins}
                  koksGrams={koksGrams}
                  onBuy={() => handleBuyWorker(worker.id)}
                  onUpgrade={() => handleUpgradeWorker(worker.id)}
                  onTogglePause={() => toggleWorkerPause(worker.id)}
                  index={index}
                />
              ))}
            </AnimatePresence>

            <SectionHeader
              icon={Snowflake}
              label="Coca Crew"
              color="text-amber-400"
              locked={!cocaUnlocked ? `Schaltet auf Level ${FEATURE_UNLOCKS.koks.level} frei` : null}
            />
            {cocaUnlocked ? (
              <AnimatePresence mode="popLayout">
                {cocaWorkers.map((worker, index) => (
                  <CocaWorkerCard
                    key={worker.id}
                    worker={worker}
                    budcoins={budcoins}
                    onBuy={() => handleBuyCocaWorker(worker.id)}
                    onUpgrade={() => handleUpgradeCocaWorker(worker.id)}
                    onTogglePause={() => toggleCocaWorkerPause(worker.id)}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <LockedHint reason={`Coca-Workers erscheinen mit dem Koks Labor (Lv. ${FEATURE_UNLOCKS.koks.level}).`} />
            )}

            <SectionHeader
              icon={FlaskConical}
              label="Meth Crew"
              color="text-cyan-300"
              locked={!methUnlocked ? `Schaltet auf Level ${FEATURE_UNLOCKS.meth.level} frei` : null}
            />
            {methUnlocked ? (
              <AnimatePresence mode="popLayout">
                {methWorkers.map((worker, index) => (
                  <MethWorkerCard
                    key={worker.id}
                    worker={worker}
                    budcoins={budcoins}
                    onBuy={() => handleBuyMethWorker(worker.id)}
                    onUpgrade={() => handleUpgradeMethWorker(worker.id)}
                    onTogglePause={() => toggleMethWorkerPause(worker.id)}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <LockedHint reason={`Meth-Workers erscheinen mit dem Meth Labor (Lv. ${FEATURE_UNLOCKS.meth.level}).`} />
            )}
          </div>
        )}

        {/* BUSINESS ------------------------------------------------------- */}
        {activeTab === 'business' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Frontläden, Lager und Großhandel.
            </div>
            {businessUnlocked ? (
              <div className="game-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={16} className="text-neon-gold" />
                  <h3 className="font-display font-bold text-sm">Business-Hub</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Eröffne Lagerhäuser, Frontläden und Importverträge im Business-Bildschirm.
                </p>
                <button
                  onClick={() => navigateTo('business')}
                  className="text-xs font-semibold text-neon-gold flex items-center gap-1"
                >
                  Zum Business <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <LockedHint reason={`Business schaltet auf Level ${FEATURE_UNLOCKS.business.level} frei.`} />
            )}

            {turfUnlocked ? (
              <div className="game-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className="text-neon-pink" />
                  <h3 className="font-display font-bold text-sm">Turf & Territorien</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Übernimm Stadtteile für passives Einkommen. Eingenommen: {territories.filter(t => t.assignedDealerIds.length > 0).length}/{territories.length}.
                </p>
                <button
                  onClick={() => navigateTo('turf')}
                  className="text-xs font-semibold text-neon-pink flex items-center gap-1"
                >
                  Zum Turf <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <LockedHint reason={`Turf schaltet auf Level ${FEATURE_UNLOCKS.turf.level} frei.`} />
            )}
          </div>
        )}

        {/* STYLE ---------------------------------------------------------- */}
        {activeTab === 'style' && (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-1">
              Kosmetik & visuelle Effekte für dein Lab.
            </div>
            <AnimatePresence mode="popLayout">
              {cosmeticUpgrades.map((upgrade, index) => (
                <UpgradeCard
                  key={upgrade.id}
                  upgrade={upgrade}
                  canAfford={canAfford(Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  onBuy={() => handleBuyUpgrade(upgrade.id, Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level)))}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bulk-seed dialog (unchanged) */}
      <Dialog open={Boolean(bulkSeed)} onOpenChange={(open) => !open && setBulkSeed(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Seeds im Bulk kaufen</DialogTitle>
          <DialogDescription>Wähle eine Menge und bestätige den Kauf.</DialogDescription>
          {bulkSeed && (() => {
            const unitCost = getSeedPrice(bulkSeed.rarity);
            const maxAffordable = unitCost > 0 ? Math.floor(budcoins / unitCost) : 0;
            const safeQuantity = Math.max(1, Math.floor(bulkQuantity));
            const clampedQuantity = maxAffordable > 0 ? Math.min(safeQuantity, maxAffordable) : safeQuantity;
            return (
              <div className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1">
                  <div className="text-sm font-semibold">{bulkSeed.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {unitCost}$ pro Seed · Budget: {budcoins.toLocaleString()}$
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {maxAffordable > 0 ? `Max: ${maxAffordable}` : 'Nicht genug $ für 1 Seed.'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {[1, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBulkQuantity(n)}
                      className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { if (maxAffordable > 0) setBulkQuantity(maxAffordable); }}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Max
                  </button>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bulk-seed-amount" className="text-xs text-muted-foreground">Menge</label>
                  <input
                    id="bulk-seed-amount"
                    type="number"
                    min={1}
                    value={bulkQuantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      setBulkQuantity(Number.isFinite(next) && next > 0 ? Math.floor(next) : 1);
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Gesamt</span>
                  <span>{(clampedQuantity * unitCost).toLocaleString()}$</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkSeed(null)}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkSeedBuy}
                    disabled={maxAffordable <= 0}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Kaufen
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============================================================================
// Helper sub-components
// ============================================================================

const SectionHeader: React.FC<{
  icon: React.ElementType;
  label: string;
  color: string;
  locked?: string | null;
}> = ({ icon: Icon, label, color, locked }) => (
  <div className="mt-3 mb-1">
    <div className={`text-xs font-bold ${color} flex items-center gap-2`}>
      <Icon size={14} /> {label}
      {locked && (
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
          <Lock size={10} /> {locked}
        </span>
      )}
    </div>
  </div>
);

const LockedHint: React.FC<{ reason: string }> = ({ reason }) => (
  <div className="game-card p-3 opacity-70">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Lock size={14} />
      <span>{reason}</span>
    </div>
  </div>
);

interface SeedCardProps {
  name: string;
  rarity: Rarity | CocaRarity;
  traits: string[];
  baseYield: number;
  index: number;
  emoji: string;
  budcoins: number;
  onBuy: () => void;
  onBulk: () => void;
  accentClass?: string;
}

const SeedCard: React.FC<SeedCardProps> = ({ name, rarity, traits, baseYield, index, emoji, budcoins, onBuy, onBulk, accentClass }) => {
  const cost = getSeedPrice(rarity);
  const canAfford = budcoins >= cost;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`game-card p-3 cursor-pointer transition-all rarity-${rarity}`}
      onClick={() => canAfford && onBuy()}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            backgroundColor: `${getRarityColor(rarity)}20`,
            boxShadow: `0 0 12px ${getRarityColor(rarity)}40`,
          }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{name}</h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: `${getRarityColor(rarity)}20`, color: getRarityColor(rarity) }}
            >
              {rarity}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {traits.slice(0, 2).map(trait => (
              <span key={trait} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                {trait}
              </span>
            ))}
            <span className="text-[9px] text-muted-foreground">+{baseYield}g yield</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(event) => { event.stopPropagation(); if (canAfford) onBuy(); }}
            disabled={!canAfford}
            className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-2 rounded-lg font-bold text-xs transition-all
              ${canAfford
                ? accentClass
                  ? `bg-gradient-to-r ${accentClass} text-black shadow-lg`
                  : 'btn-neon'
                : 'bg-muted/50 text-muted-foreground border border-border'
              }`}
          >
            {canAfford ? (
              <>
                <span>KAUFEN</span>
                <span>{cost}$</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>{cost}$</span>
              </>
            )}
          </motion.button>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); if (canAfford) onBulk(); }}
            disabled={!canAfford}
            className={`h-[52px] min-w-[52px] rounded-lg border text-[10px] font-bold uppercase transition-colors
              ${canAfford ? 'border-neon-green/60 text-neon-green hover:bg-neon-green/10' : 'border-border text-muted-foreground'}`}
          >
            MEHR
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Existing card components (kept intact)
// ============================================================================

interface WorkerCardProps {
  worker: Worker;
  budcoins: number;
  koksGrams: number;
  onBuy: () => void;
  onUpgrade: () => void;
  onTogglePause: () => void;
  index: number;
}

const WorkerCard = React.forwardRef<HTMLDivElement, WorkerCardProps>(({ worker, budcoins, koksGrams, onBuy, onUpgrade, onTogglePause, index }, ref) => {
  const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
  const needsKoks = (worker.costKoksGrams ?? 0) > 0;
  const canAffordBuy = needsKoks ? koksGrams >= (worker.costKoksGrams ?? 0) : budcoins >= worker.cost;
  const canAffordUpgrade = budcoins >= upgradeCost;
  const isMaxed = worker.level >= worker.maxLevel;
  const hireCostLabel = needsKoks ? `${worker.costKoksGrams}g Koks` : worker.cost.toLocaleString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`game-card p-4 ${worker.owned ? (worker.paused ? 'opacity-60' : 'rarity-rare glow-green') : ''}`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="text-4xl"
          animate={worker.owned && !worker.paused ? { y: [0, -3, 0], rotate: [0, 5, -5, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-foreground">{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange">🏖️ Urlaub</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{worker.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map(ability => (
              <span key={ability} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                {ability === 'plant' ? '🌱 Pflanzen' :
                 ability === 'tap' ? '⚡ Boost' :
                 ability === 'harvest' ? '✂️ Ernten' :
                 ability === 'sell' ? '💰 Verkaufen' :
                 '🌬️ Trocknen'}
              </span>
            ))}
          </div>
          {worker.owned && (
            <div className="text-xs text-primary mt-1">Verwaltet {worker.slotsManaged + worker.level - 1} Slots</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBuy}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordBuy ? 'btn-neon text-sm' : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              {canAffordBuy ? (
                <>
                  <span className="text-xs">EINSTELLEN</span>
                  <span className="text-xs">{hireCostLabel}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span className="text-xs mt-0.5">{hireCostLabel}</span>
                </>
              )}
            </motion.button>
          ) : isMaxed ? (
            <div className="flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg bg-muted text-muted-foreground">
              <Check size={18} />
              <span className="text-xs mt-0.5">MAX</span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onUpgrade}
              disabled={!canAffordUpgrade}
              className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordUpgrade ? 'bg-secondary text-secondary-foreground' : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              <ArrowUp size={16} />
              <span className="text-[10px] mt-0.5">{upgradeCost.toLocaleString()}</span>
            </motion.button>
          )}

          {worker.owned && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePause();
                toast.success(worker.paused ? `${worker.name} ist wieder aktiv!` : `${worker.name} ist jetzt im Urlaub`);
              }}
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${worker.paused ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30'}`}
            >
              {worker.paused ? (<><PlayCircle size={14} /><span>Aktivieren</span></>) : (<><PauseCircle size={14} /><span>Pausieren</span></>)}
            </motion.button>
          )}
        </div>
      </div>

      {worker.owned && (
        <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${worker.paused ? 'bg-muted-foreground' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(worker.level / worker.maxLevel) * 100}%` }}
          />
        </div>
      )}
    </motion.div>
  );
});

WorkerCard.displayName = 'WorkerCard';

interface MethWorkerCardProps {
  worker: MethWorker;
  budcoins: number;
  onBuy: () => void;
  onUpgrade: () => void;
  onTogglePause: () => void;
  index: number;
}

const MethWorkerCard = React.forwardRef<HTMLDivElement, MethWorkerCardProps>(({ worker, budcoins, onBuy, onUpgrade, onTogglePause, index }, ref) => {
  const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
  const canAffordBuy = budcoins >= worker.cost;
  const canAffordUpgrade = budcoins >= upgradeCost;
  const isMaxed = worker.level >= worker.maxLevel;
  const slotsToManage = Math.max(1, worker.slotsManaged + worker.level - 1);

  const abilityLabel = (ability: MethWorker['abilities'][number]) => {
    switch (ability) {
      case 'cook': return '🧪 Kochen';
      case 'collect': return '📦 Einsammeln';
      case 'resupply': return '⛽ Nachschub';
      default: return ability;
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`game-card p-4 border-2 ${
        worker.owned
          ? worker.paused ? 'opacity-60 border-cyan-500/20' : 'border-cyan-500/50 shadow-cyan-500/20'
          : 'border-cyan-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="text-4xl"
          animate={worker.owned && !worker.paused ? { y: [0, -3, 0], rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-cyan-300">{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">🔒 Pause</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 italic">{worker.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map((ability) => (
              <span key={ability} className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
                {abilityLabel(ability)}
              </span>
            ))}
          </div>
          {worker.owned && (
            <div className="text-xs mt-1 text-cyan-200">⚗️ Slots/Tick: {slotsToManage}</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(); }}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordBuy ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-sm shadow-lg shadow-cyan-500/30' : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              {canAffordBuy ? (
                <><span className="text-xs">ANHEUERN</span><span className="text-xs">{worker.cost.toLocaleString()}</span></>
              ) : (
                <><Lock size={16} /><span className="text-xs mt-0.5">{worker.cost.toLocaleString()}</span></>
              )}
            </motion.button>
          ) : isMaxed ? (
            <div className="flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-200">
              <Check size={18} />
              <span className="text-xs mt-0.5">BOSS</span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpgrade(); }}
              disabled={!canAffordUpgrade}
              className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordUpgrade ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50' : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              <ArrowUp size={16} />
              <span className="text-[10px] mt-0.5">{upgradeCost.toLocaleString()}</span>
            </motion.button>
          )}

          {worker.owned && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePause();
                toast.success(worker.paused ? `${worker.name} ist wieder aktiv!` : `${worker.name} wurde gestoppt`);
              }}
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${worker.paused ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}
            >
              {worker.paused ? (<><PlayCircle size={14} /><span>Start</span></>) : (<><PauseCircle size={14} /><span>Stop</span></>)}
            </motion.button>
          )}
        </div>
      </div>

      {worker.owned && (
        <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${worker.paused ? 'bg-muted-foreground' : 'bg-cyan-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(worker.level / worker.maxLevel) * 100}%` }}
          />
        </div>
      )}
    </motion.div>
  );
});

MethWorkerCard.displayName = 'MethWorkerCard';

interface CocaWorkerCardProps {
  worker: CocaWorker;
  budcoins: number;
  onBuy: () => void;
  onUpgrade: () => void;
  onTogglePause: () => void;
  index: number;
}

const CocaWorkerCard = React.forwardRef<HTMLDivElement, CocaWorkerCardProps>(({ worker, budcoins, onBuy, onUpgrade, onTogglePause, index }, ref) => {
  const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
  const canAffordBuy = budcoins >= worker.cost;
  const canAffordUpgrade = budcoins >= upgradeCost;
  const isMaxed = worker.level >= worker.maxLevel;
  const isFarmer = worker.type === 'farmer' || worker.type === 'processor';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`game-card p-4 border-2 ${
        isFarmer
          ? worker.owned ? (worker.paused ? 'opacity-60 border-green-500/20' : 'border-green-500/50 shadow-green-500/20') : 'border-green-500/10'
          : worker.owned ? (worker.paused ? 'opacity-60 border-amber-500/20' : 'border-amber-500/50 glow-gold shadow-amber-500/20') : 'border-amber-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="text-4xl"
          animate={worker.owned && !worker.paused ? { y: [0, -3, 0], rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-display font-bold ${isFarmer ? 'text-green-400' : 'text-amber-400'}`}>{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">🔒 Gesperrt</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 italic">{worker.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map(ability => (
              <span
                key={ability}
                className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${isFarmer ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}
              >
                {ability === 'sell' ? '💀 Verkaufen' :
                 ability === 'process' ? '🧪 Verarbeiten' :
                 ability === 'grow' ? '🌿 Anbauen' :
                 ability === 'autoGrow' ? '🌱 Auto-Anbau' :
                 ability === 'autoProcess' ? '⚗️ Auto-Verarbeitung' :
                 ability}
              </span>
            ))}
          </div>
          {worker.owned && (
            <div className={`text-xs mt-1 ${isFarmer ? 'text-green-400' : 'text-amber-400'}`}>
              {worker.type === 'farmer' && `🌱 +${Math.floor(15 * (1 + (worker.level - 1) * 0.15))}% Ertrag`}
              {worker.type === 'processor' && `⚗️ +${Math.floor(10 * worker.level)}% Effizienz`}
              {worker.type === 'dealer' && worker.salesPerTick > 0 && `⚡ ${worker.salesPerTick + Math.floor(worker.level * 0.5)} Verkäufe/Tick`}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(); }}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordBuy
                  ? isFarmer
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white text-sm shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm shadow-lg shadow-amber-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              {canAffordBuy ? (
                <><span className="text-xs">ANHEUERN</span><span className="text-xs">{worker.cost.toLocaleString()}</span></>
              ) : (
                <><Lock size={16} /><span className="text-xs mt-0.5">{worker.cost.toLocaleString()}</span></>
              )}
            </motion.button>
          ) : isMaxed ? (
            <div className="flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Check size={18} />
              <span className="text-xs mt-0.5">BOSS</span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpgrade(); }}
              disabled={!canAffordUpgrade}
              className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordUpgrade ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50' : 'bg-muted/50 text-muted-foreground border border-border'}`}
            >
              <ArrowUp size={16} />
              <span className="text-[10px] mt-0.5">{upgradeCost.toLocaleString()}</span>
            </motion.button>
          )}

          {worker.owned && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePause();
                toast.success(worker.paused ? `${worker.name} ist wieder aktiv!` : `${worker.name} wurde gestoppt`);
              }}
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                ${worker.paused ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
            >
              {worker.paused ? (<><PlayCircle size={14} /><span>Start</span></>) : (<><PauseCircle size={14} /><span>Stop</span></>)}
            </motion.button>
          )}
        </div>
      </div>

      {worker.owned && (
        <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${worker.paused ? 'bg-muted-foreground' : 'bg-amber-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${(worker.level / worker.maxLevel) * 100}%` }}
          />
        </div>
      )}
    </motion.div>
  );
});

CocaWorkerCard.displayName = 'CocaWorkerCard';

interface UpgradeCardProps {
  upgrade: Upgrade;
  canAfford: boolean;
  onBuy: () => void;
  index: number;
}

const UpgradeCard = React.forwardRef<HTMLDivElement, UpgradeCardProps>(({ upgrade, canAfford, onBuy, index }, ref) => {
  const isMaxed = upgrade.level >= upgrade.maxLevel;
  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level));
  const Icon = categoryIcons[upgrade.category] ?? Zap;
  const colorClass = categoryColors[upgrade.category] ?? 'text-neon-green';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`upgrade-card ${isMaxed ? 'opacity-60' : ''} ${
        upgrade.category === 'equipment' ? 'rarity-uncommon'
          : upgrade.category === 'automation' ? 'rarity-rare'
          : upgrade.category === 'genetics' ? 'rarity-epic'
          : 'rarity-legendary'
      }`}
      onClick={() => !isMaxed && canAfford && onBuy()}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-muted/50 ${colorClass}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-foreground truncate">{upgrade.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Lv.{upgrade.level}/{upgrade.maxLevel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{upgrade.description}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-primary font-medium">
              +{(upgrade.effectValue * 100).toFixed(0)}% per level
            </span>
            <span className="text-xs text-muted-foreground">
              (Aktuell: +{(upgrade.effectValue * upgrade.level * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={isMaxed || !canAfford}
          className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all
            ${isMaxed ? 'bg-muted text-muted-foreground' : canAfford ? 'btn-neon text-sm' : 'bg-muted/50 text-muted-foreground border border-border'}`}
        >
          {isMaxed ? (
            <><Check size={18} /><span className="text-xs mt-0.5">MAX</span></>
          ) : !canAfford ? (
            <><Lock size={16} /><span className="text-xs mt-0.5">{cost.toLocaleString()}</span></>
          ) : (
            <><span className="text-xs">BUY</span><span className="text-xs">{cost.toLocaleString()}</span></>
          )}
        </motion.button>
      </div>
      <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(upgrade.level / upgrade.maxLevel) * 100}%` }}
        />
      </div>
    </motion.div>
  );
});

UpgradeCard.displayName = 'UpgradeCard';
