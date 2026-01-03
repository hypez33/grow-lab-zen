import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Beaker, FlaskConical, Package, Lock, Plus, Play, Download, DollarSign, 
  Users, Skull, Flame, Sparkles, Zap, TrendingUp, Atom, Droplets, 
  AlertTriangle, ChevronRight, Layers, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useMethStore, METH_RECIPES, METH_PRECURSOR_COST, 
  METH_SLOT_UNLOCK_BASE_COST, METH_SLOT_UNLOCK_COST_SCALING, 
  METH_DEALER_PROFILES, MethStage 
} from '@/store/methStore';
import type { MethLogType } from '@/store/methStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';

const stageLabels: Record<MethStage, string> = {
  maceration: 'Mazeration',
  oxidation: 'Oxidation',
  crystallization: 'Kristallisation',
  ready: 'Fertig',
};

const stageIcons: Record<MethStage, React.ReactNode> = {
  maceration: <Droplets size={12} className="text-blue-400" />,
  oxidation: <Flame size={12} className="text-orange-400" />,
  crystallization: <Atom size={12} className="text-cyan-400" />,
  ready: <Sparkles size={12} className="text-emerald-400" />,
};

const stageColors: Record<MethStage, string> = {
  maceration: 'from-blue-500 to-blue-600',
  oxidation: 'from-orange-500 to-amber-500',
  crystallization: 'from-cyan-400 to-cyan-500',
  ready: 'from-emerald-400 to-emerald-500',
};

const MIN_METH_RECIPE_COST = METH_RECIPES.length > 0
  ? METH_RECIPES.reduce((min, recipe) => Math.min(min, recipe.precursorCost), METH_RECIPES[0].precursorCost)
  : 0;

const logTypeMeta: Record<MethLogType, { label: string; card: string; badge: string; icon: React.ReactNode }> = {
  sale: {
    label: 'Deal',
    card: 'border-cyan-500/40 bg-gradient-to-r from-cyan-500/15 to-cyan-600/5',
    badge: 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/30',
    icon: <DollarSign size={14} className="text-cyan-400" />,
  },
  dealer: {
    label: 'Dealer',
    card: 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-amber-600/5',
    badge: 'bg-amber-500/30 text-amber-200 border border-amber-500/30',
    icon: <Skull size={14} className="text-amber-400" />,
  },
  bonus: {
    label: 'Bonus',
    card: 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-600/5',
    badge: 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/30',
    icon: <Sparkles size={14} className="text-emerald-400" />,
  },
  risk: {
    label: 'Risiko',
    card: 'border-rose-500/40 bg-gradient-to-r from-rose-500/15 to-rose-600/5',
    badge: 'bg-rose-500/30 text-rose-200 border border-rose-500/30',
    icon: <AlertTriangle size={14} className="text-rose-400" />,
  },
  info: {
    label: 'Info',
    card: 'border-slate-500/40 bg-gradient-to-r from-slate-500/15 to-slate-600/5',
    badge: 'bg-slate-500/30 text-slate-200 border border-slate-500/30',
    icon: <Activity size={14} className="text-slate-400" />,
  },
};

const resolveLogType = (log: { type?: MethLogType; dealerName?: string }): MethLogType => (
  log.type ?? (log.dealerName ? 'dealer' : 'sale')
);

// Animated stat card component
const StatCard = ({ 
  value, 
  label, 
  icon: Icon, 
  color = 'cyan',
  suffix = ''
}: { 
  value: number | string; 
  label: string; 
  icon: React.ElementType;
  color?: 'cyan' | 'orange' | 'emerald' | 'amber' | 'rose';
  suffix?: string;
}) => {
  const colorClasses = {
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/30 text-orange-400',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`rounded-xl bg-gradient-to-br ${colorClasses[color]} border p-3 text-center`}
    >
      <Icon size={16} className={`mx-auto mb-1 ${colorClasses[color].split(' ').pop()}`} />
      <div className="text-lg font-bold font-display">{value}{suffix}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </motion.div>
  );
};

export const MethScreen = () => {
  const {
    precursors,
    methSlots,
    methInventory,
    methCustomers,
    methSamples,
    methProspects,
    methActivityLogs,
    methWorkers,
    buyPrecursors,
    unlockMethSlot,
    startMethCook,
    collectMeth,
    sellMethProduct,
    createMethSamples,
    acquireMethCustomer,
    totalMethCooked,
    totalMethSold,
    totalMethRevenue,
  } = useMethStore();

  const budcoins = useGameStore(state => state.budcoins);
  const cocaWorkers = useCocaStore(state => state.cocaWorkers);

  const updateBudcoins = (amount: number) => {
    useGameStore.setState(state => ({ budcoins: state.budcoins + amount }));
  };

  const [selectedRecipeId, setSelectedRecipeId] = useState(METH_RECIPES[0]?.id ?? '');
  const [activeTab, setActiveTab] = useState<'lab' | 'kunden'>('lab');

  const selectedRecipe = useMemo(() => (
    METH_RECIPES.find(r => r.id === selectedRecipeId) ?? METH_RECIPES[0]
  ), [selectedRecipeId]);

  const inventoryGrams = useMemo(
    () => methInventory.reduce((sum, product) => sum + product.grams, 0),
    [methInventory]
  );
  const averagePurity = useMemo(() => {
    if (methInventory.length === 0) return 0;
    const total = methInventory.reduce((sum, product) => sum + product.purity, 0);
    return Math.round(total / methInventory.length);
  }, [methInventory]);
  const averageQuality = useMemo(() => {
    if (methInventory.length === 0) return 0;
    const total = methInventory.reduce((sum, product) => sum + product.quality, 0);
    return Math.round(total / methInventory.length);
  }, [methInventory]);

  const averageAddiction = useMemo(() => {
    if (methCustomers.length === 0) return 0;
    const total = methCustomers.reduce((sum, customer) => sum + customer.addiction, 0);
    return Math.round(total / methCustomers.length);
  }, [methCustomers]);
  const averageGreed = useMemo(() => {
    if (methCustomers.length === 0) return 0;
    const total = methCustomers.reduce((sum, customer) => sum + customer.greed, 0);
    return Math.round(total / methCustomers.length);
  }, [methCustomers]);

  const topCustomers = useMemo(
    () => [...methCustomers]
      .sort((a, b) => (b.addiction + b.greed) - (a.addiction + a.greed))
      .slice(0, 6),
    [methCustomers]
  );

  const activeDealers = useMemo(
    () => cocaWorkers.filter(worker => worker.type === 'dealer' && worker.owned),
    [cocaWorkers]
  );
  const sellingDealers = useMemo(
    () => activeDealers.filter(worker => worker.abilities.includes('sell')),
    [activeDealers]
  );
  const liveSellingDealers = useMemo(
    () => sellingDealers.filter(worker => !worker.paused),
    [sellingDealers]
  );
  const dealerSalesPerTick = useMemo(
    () => liveSellingDealers.reduce((sum, dealer) => {
      const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
      const totalSales = Math.max(1, Math.floor(baseSales * 1.6));
      return sum + totalSales;
    }, 0),
    [liveSellingDealers]
  );

  const ownedMethWorkers = useMemo(
    () => methWorkers.filter(worker => worker.owned),
    [methWorkers]
  );
  const activeMethWorkers = useMemo(
    () => ownedMethWorkers.filter(worker => !worker.paused),
    [ownedMethWorkers]
  );
  const activeCookers = useMemo(
    () => activeMethWorkers.filter(worker => worker.abilities.includes('cook')),
    [activeMethWorkers]
  );
  const activeCollectors = useMemo(
    () => activeMethWorkers.filter(worker => worker.abilities.includes('collect')),
    [activeMethWorkers]
  );
  const readySlotCount = useMemo(
    () => methSlots.filter(slot => slot.isUnlocked && slot.batch?.stage === 'ready').length,
    [methSlots]
  );
  const emptySlotCount = useMemo(
    () => methSlots.filter(slot => slot.isUnlocked && !slot.batch).length,
    [methSlots]
  );
  const cookStatus = activeCookers.length === 0
    ? 'aus'
    : (emptySlotCount > 0 && precursors >= MIN_METH_RECIPE_COST ? 'kocht' : 'wartet');
  const collectStatus = activeCollectors.length === 0
    ? 'aus'
    : (readySlotCount > 0 ? 'sammelt' : 'wartet');

  const stageTotals = useMemo(() => {
    const totals = {
      maceration: 0,
      oxidation: 0,
      crystallization: 0,
      ready: 0,
    };
    for (const slot of methSlots) {
      if (slot.batch) {
        totals[slot.batch.stage] += slot.batch.grams;
      }
    }
    return totals;
  }, [methSlots]);

  const unlockedCount = methSlots.filter(s => s.isUnlocked).length;
  const nextLockedSlot = methSlots.find(s => !s.isUnlocked);
  const unlockCost = nextLockedSlot
    ? Math.floor(METH_SLOT_UNLOCK_BASE_COST * Math.pow(METH_SLOT_UNLOCK_COST_SCALING, Math.max(0, unlockedCount - 1)))
    : 0;
  const canUnlock = Boolean(nextLockedSlot && budcoins >= unlockCost);

  const handleBuyPrecursors = (amount: number) => {
    const currentBudcoins = useGameStore.getState().budcoins;
    const result = buyPrecursors(amount, currentBudcoins);
    if (!result.success) {
      toast.error('Nicht genug Budcoins.');
      return;
    }
    updateBudcoins(-result.cost);
    toast.success(`+${amount} Precursors gekauft.`);
  };

  const handleUnlockSlot = () => {
    if (!nextLockedSlot) return;
    const currentBudcoins = useGameStore.getState().budcoins;
    const result = unlockMethSlot(nextLockedSlot.id, currentBudcoins);
    if (!result.success) {
      toast.error('Slot kann nicht freigeschaltet werden.');
      return;
    }
    updateBudcoins(-result.cost);
    toast.success('Neuer Meth-Slot freigeschaltet!');
  };

  const handleStartCook = (slotId: number) => {
    if (!selectedRecipe) {
      toast.error('Bitte ein Rezept waehlen.');
      return;
    }
    const result = startMethCook(slotId, selectedRecipe.id);
    if (!result.success) {
      toast.error(result.error || 'Cook konnte nicht gestartet werden.');
      return;
    }
    toast.success(`${selectedRecipe.name} gestartet.`);
  };

  const handleCollect = (slotId: number) => {
    const product = collectMeth(slotId);
    if (!product) {
      toast.error('Noch nicht fertig.');
      return;
    }
    toast.success(`Batch eingesammelt: ${product.grams}g`);
  };

  const handleSell = (productId: string) => {
    const result = sellMethProduct(productId);
    if (!result.success) {
      toast.error(result.error || 'Verkauf fehlgeschlagen.');
      return;
    }
    updateBudcoins(result.revenue);
    toast.success(`+${result.revenue}$ verdient.`);
  };

  const handleCreateSamples = (grams: number) => {
    const result = createMethSamples(grams);
    if (!result.success) {
      toast.error(result.error || 'Samples konnten nicht erstellt werden.');
      return;
    }
    toast.success(`+${result.grams} Sample(s) erstellt.`);
  };

  const handleAcquireCustomer = () => {
    const result = acquireMethCustomer();
    if (!result.success) {
      toast.error(result.error || 'Kunde konnte nicht gewonnen werden.');
      return;
    }
    toast.success(`Neuer Kunde: ${result.customer?.name}`);
  };

  const tabItems = [
    { key: 'lab' as const, label: 'Labor', icon: Beaker },
    { key: 'kunden' as const, label: 'Kunden', icon: Users },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-background via-background to-cyan-950/10">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ 
                boxShadow: ['0 0 20px rgba(6, 182, 212, 0.3)', '0 0 30px rgba(6, 182, 212, 0.5)', '0 0 20px rgba(6, 182, 212, 0.3)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 flex items-center justify-center border border-cyan-500/30"
            >
              <Beaker size={24} className="text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-xl font-display font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Crystal Lab
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FlaskConical size={10} className="text-cyan-500" />
                {precursors} Precursors verfügbar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-semibold">
              {inventoryGrams}g
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted/30 border border-border/30">
          {tabItems.map(tab => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'lab' && (
            <motion.div
              key="lab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={`$${(budcoins / 1000).toFixed(1)}k`} label="Budget" icon={DollarSign} color="amber" />
                <StatCard value={`${averagePurity}%`} label="Reinheit" icon={Atom} color="cyan" />
                <StatCard value={`${averageQuality}%`} label="Qualität" icon={Sparkles} color="emerald" />
                <StatCard value={methInventory.length} label="Chargen" icon={Package} color="orange" />
              </div>

              {/* Production Pipeline */}
              <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyan-950/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-cyan-400" />
                    <span className="text-sm font-semibold">Produktionspipeline</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {stageTotals.maceration + stageTotals.oxidation + stageTotals.crystallization + stageTotals.ready}g in Produktion
                  </div>
                </div>
                
                {/* Stage Pipeline Visual - Compact with Progress */}
                <div className="flex items-center gap-0.5 bg-muted/20 rounded-lg p-1">
                  {(['maceration', 'oxidation', 'crystallization', 'ready'] as MethStage[]).map((stage, idx) => {
                    const activeInStage = methSlots.filter(s => s.batch?.stage === stage);
                    const hasActive = activeInStage.length > 0;
                    const avgProgress = hasActive 
                      ? Math.round(activeInStage.reduce((sum, s) => sum + s.progress, 0) / activeInStage.length)
                      : 0;
                    
                    return (
                      <div key={stage} className="flex items-center flex-1">
                        <div className={`flex-1 relative rounded-md overflow-hidden bg-gradient-to-r ${stageColors[stage]}/15`}>
                          {/* Progress bar background */}
                          {hasActive && stage !== 'ready' && (
                            <motion.div
                              className={`absolute inset-0 bg-gradient-to-r ${stageColors[stage]}/30`}
                              initial={{ width: 0 }}
                              animate={{ width: `${avgProgress}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          )}
                          {/* Shimmer effect for active stages */}
                          {hasActive && stage !== 'ready' && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                              animate={{ x: ['-100%', '200%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                          <div className="relative flex items-center justify-center gap-1.5 py-1.5 px-1">
                            <motion.div
                              animate={hasActive && stage !== 'ready' ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              {stageIcons[stage]}
                            </motion.div>
                            <span className="text-[10px] font-bold tabular-nums">{stageTotals[stage]}g</span>
                            {hasActive && stage !== 'ready' && (
                              <span className="text-[8px] text-white/60">({avgProgress}%)</span>
                            )}
                          </div>
                        </div>
                        {idx < 3 && <ChevronRight size={10} className="text-muted-foreground/50 mx-0.5 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                {/* Crew Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-300 flex items-center gap-1">
                        <Users size={12} />
                        Meth Crew
                      </span>
                      <span className="text-cyan-400 font-semibold">{activeMethWorkers.length}/{ownedMethWorkers.length}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-cyan-200/70">
                      <span className={cookStatus === 'kocht' ? 'text-emerald-400' : ''}>🧪 {cookStatus}</span>
                      <span className={collectStatus === 'sammelt' ? 'text-emerald-400' : ''}>📦 {collectStatus}</span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-300 flex items-center gap-1">
                        <Skull size={12} />
                        Dealer
                      </span>
                      <span className="text-amber-400 font-semibold">{liveSellingDealers.length} aktiv</span>
                    </div>
                    <div className="mt-1 text-[10px] text-amber-200/70">
                      {dealerSalesPerTick}g/Tick Vertrieb
                    </div>
                  </div>
                </div>

                {/* Buy Precursors */}
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBuyPrecursors(1)}
                    disabled={budcoins < METH_PRECURSOR_COST}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      budcoins >= METH_PRECURSOR_COST 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30' 
                        : 'bg-muted/20 text-muted-foreground border border-border/30'
                    }`}
                  >
                    <Plus size={14} />
                    +1 Precursor ({METH_PRECURSOR_COST}$)
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBuyPrecursors(5)}
                    disabled={budcoins < METH_PRECURSOR_COST * 5}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      budcoins >= METH_PRECURSOR_COST * 5 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/30' 
                        : 'bg-muted/20 text-muted-foreground border border-border/30'
                    }`}
                  >
                    <Plus size={14} />
                    +5 Precursors ({METH_PRECURSOR_COST * 5}$)
                  </motion.button>
                </div>
              </div>

              {/* Recipe Selection */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-cyan-400" />
                  <span className="text-sm font-semibold">Rezepte</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {METH_RECIPES.map(recipe => {
                    const isSelected = recipe.id === selectedRecipeId;
                    const canAfford = precursors >= recipe.precursorCost;
                    return (
                      <motion.button
                        key={recipe.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRecipeId(recipe.id)}
                        className={`relative rounded-xl border p-3 text-left transition-all overflow-hidden ${
                          isSelected 
                            ? 'border-cyan-500/50 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 shadow-lg shadow-cyan-500/10' 
                            : 'border-border/40 bg-muted/20 hover:border-border/60'
                        }`}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId="recipe-indicator"
                            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400"
                          />
                        )}
                        <div className="font-semibold text-sm">{recipe.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{recipe.description}</div>
                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          <span className="text-cyan-400">{recipe.baseGrams}g</span>
                          <span className={canAfford ? 'text-emerald-400' : 'text-rose-400'}>
                            {recipe.precursorCost} Prec.
                          </span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-1">
                          Reinheit {recipe.purityRange[0]}-{recipe.purityRange[1]}%
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Lab Slots */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Beaker size={16} className="text-cyan-400" />
                    <span className="text-sm font-semibold">Lab Slots</span>
                  </div>
                  {nextLockedSlot && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUnlockSlot}
                      disabled={!canUnlock}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        canUnlock 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      +Slot ({unlockCost}$)
                    </motion.button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {methSlots.map(slot => (
                    <motion.div
                      key={slot.id}
                      whileHover={{ scale: slot.isUnlocked ? 1.02 : 1 }}
                      className={`relative rounded-xl border p-3 min-h-[100px] transition-all ${
                        slot.isUnlocked 
                          ? 'bg-gradient-to-br from-card to-card/80 border-border/50 hover:border-cyan-500/30' 
                          : 'bg-muted/20 border-border/20'
                      }`}
                    >
                      {!slot.isUnlocked && (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                          <Lock size={20} />
                          <span className="text-[10px] font-semibold">Gesperrt</span>
                        </div>
                      )}

                      {slot.isUnlocked && !slot.batch && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleStartCook(slot.id)}
                          disabled={!selectedRecipe || precursors < (selectedRecipe?.precursorCost ?? 0)}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-cyan-500/30 text-cyan-400/70 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all"
                        >
                          <Plus size={20} />
                          <span className="text-xs font-semibold">{selectedRecipe?.name || 'Rezept'}</span>
                        </motion.button>
                      )}

                      {slot.isUnlocked && slot.batch && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold truncate">{slot.batch.recipeName}</span>
                            <div className="flex items-center gap-1">
                              {stageIcons[slot.batch.stage]}
                            </div>
                          </div>
                          
                          <div className="relative h-2 overflow-hidden rounded-full bg-muted/40">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, slot.progress)}%` }}
                              className={`h-full bg-gradient-to-r ${stageColors[slot.batch.stage]}`}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{stageLabels[slot.batch.stage]}</span>
                            <span className="font-semibold">{slot.batch.grams}g</span>
                          </div>
                          
                          {slot.batch.stage === 'ready' ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCollect(slot.id)}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 px-2 py-2 text-xs font-semibold text-emerald-400"
                            >
                              <Download size={14} />
                              Einsammeln
                            </motion.button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 text-[10px] text-cyan-400/70">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Activity size={12} />
                              </motion.div>
                              <span>{Math.round(slot.progress)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Inventory */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-cyan-400" />
                    <span className="text-sm font-semibold">Inventar</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{inventoryGrams}g total</span>
                </div>
                
                {methInventory.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <FlaskConical size={24} className="mx-auto mb-2 opacity-30" />
                    Keine Produkte vorhanden
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {methInventory.map(product => (
                      <motion.div
                        key={product.id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">{product.recipeName}</div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span className="text-cyan-400">{product.grams}g</span>
                            <span>•</span>
                            <span>{product.purity}% rein</span>
                            <span>•</span>
                            <span>{product.quality}% Q</span>
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSell(product.id)}
                          className="rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400"
                        >
                          Verkaufen
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity Log */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-cyan-400" />
                  <span className="text-sm font-semibold">Aktivität</span>
                </div>
                
                {methActivityLogs.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Noch keine Aktivitäten
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto">
                    {methActivityLogs.slice(0, 10).map(log => {
                      const logType = resolveLogType(log);
                      const typeMeta = logTypeMeta[logType];
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-start gap-2 rounded-xl border p-2.5 text-xs ${typeMeta.card}`}
                        >
                          <div className="mt-0.5">{typeMeta.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{log.message}</div>
                            {log.detail && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{log.detail}</div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${typeMeta.badge}`}>
                              {typeMeta.label}
                            </span>
                            {log.revenue && (
                              <span className="text-[10px] font-semibold text-emerald-400">+${log.revenue}</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-cyan-400" />
                  <span className="text-sm font-semibold">Statistiken</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-muted/30 p-3 text-center">
                    <div className="text-lg font-bold text-cyan-400">{totalMethCooked.toLocaleString()}g</div>
                    <div className="text-[10px] text-muted-foreground">Gekocht</div>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 text-center">
                    <div className="text-lg font-bold text-emerald-400">{totalMethSold.toLocaleString()}g</div>
                    <div className="text-[10px] text-muted-foreground">Verkauft</div>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 text-center">
                    <div className="text-lg font-bold text-amber-400">${(totalMethRevenue/1000).toFixed(1)}k</div>
                    <div className="text-[10px] text-muted-foreground">Umsatz</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'kunden' && (
            <motion.div
              key="kunden"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Customer Stats */}
              <div className="grid grid-cols-4 gap-2">
                <StatCard value={methCustomers.length} label="Kunden" icon={Users} color="cyan" />
                <StatCard value={methProspects.length} label="Prospects" icon={Users} color="amber" />
                <StatCard value={`${averageAddiction}%`} label="Ø Sucht" icon={Flame} color="orange" />
                <StatCard value={methSamples} label="Samples" icon={Package} color="emerald" />
              </div>

              {/* Customer Acquisition */}
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-emerald-950/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-emerald-400" />
                    <span className="text-sm font-semibold">Kundenaufbau</span>
                  </div>
                  <span className="text-xs text-emerald-400">{methSamples} Samples</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCreateSamples(1)}
                    disabled={inventoryGrams < 1}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      inventoryGrams >= 1 
                        ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-300' 
                        : 'bg-muted/20 text-muted-foreground border border-border/30'
                    }`}
                  >
                    +1 Sample
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCreateSamples(5)}
                    disabled={inventoryGrams < 5}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      inventoryGrams >= 5 
                        ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 text-emerald-300' 
                        : 'bg-muted/20 text-muted-foreground border border-border/30'
                    }`}
                  >
                    +5 Samples
                  </motion.button>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAcquireCustomer}
                  disabled={methSamples <= 0 || methProspects.length === 0}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    methSamples > 0 && methProspects.length > 0
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-muted/20 text-muted-foreground border border-border/30'
                  }`}
                >
                  Kunde akquirieren (1 Sample)
                </motion.button>
              </div>

              {/* Customer List */}
              <div className="rounded-2xl border border-border/30 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-400" />
                    <span className="text-sm font-semibold">Kundenliste</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{methCustomers.length} aktiv</span>
                </div>
                
                {methCustomers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    <Users size={24} className="mx-auto mb-2 opacity-30" />
                    Noch keine Kunden gewonnen
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {methCustomers.map(customer => (
                      <motion.div
                        key={customer.id}
                        whileHover={{ scale: 1.01 }}
                        className="rounded-xl border border-border/40 bg-muted/20 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">{customer.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {customer.purchases} Käufe
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Flame size={12} className="text-orange-400 flex-shrink-0" />
                            <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${customer.addiction}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                              />
                            </div>
                            <span className="text-[10px] text-orange-400 w-8 text-right">{customer.addiction}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Sparkles size={12} className="text-cyan-400 flex-shrink-0" />
                            <div className="h-1.5 flex-1 rounded-full bg-muted/40 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${customer.greed}%` }}
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500"
                              />
                            </div>
                            <span className="text-[10px] text-cyan-400 w-8 text-right">{customer.greed}%</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dealer Network */}
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-amber-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skull size={16} className="text-amber-400" />
                  <span className="text-sm font-semibold">Dealer Netzwerk</span>
                </div>
                
                {activeDealers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Keine Dealer aktiv
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeDealers.map(dealer => {
                      const canSell = dealer.abilities.includes('sell');
                      const profile = METH_DEALER_PROFILES[dealer.id] ?? METH_DEALER_PROFILES.default;
                      const totalBonus = Math.round((dealer.level * 0.08 + profile.bonus) * 100);
                      const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
                      const salesPerTick = Math.max(1, Math.floor(baseSales * 1.6));
                      
                      return (
                        <motion.div
                          key={dealer.id}
                          whileHover={{ scale: 1.01 }}
                          className={`flex items-center gap-3 rounded-xl border p-3 ${
                            dealer.paused
                              ? 'border-border/30 bg-muted/20 opacity-60'
                              : 'border-amber-500/30 bg-amber-500/10'
                          }`}
                        >
                          <span className="text-2xl">{dealer.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{dealer.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              Lv.{dealer.level} • {profile.label} • +{totalBonus}%
                            </div>
                          </div>
                          {canSell && !dealer.paused && (
                            <div className="text-right">
                              <div className="text-xs font-semibold text-amber-400">{salesPerTick}/Tick</div>
                              <div className="text-[10px] text-amber-200/60">Meth</div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
