import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Beaker, FlaskConical, Package, Lock, Plus, Play, Download, DollarSign, Users, Skull, Flame, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useMethStore, METH_RECIPES, METH_PRECURSOR_COST, METH_SLOT_UNLOCK_BASE_COST, METH_SLOT_UNLOCK_COST_SCALING, MethStage } from '@/store/methStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';

const stageLabels: Record<MethStage, string> = {
  maceration: 'Mazeration',
  oxidation: 'Oxidation',
  crystallization: 'Kristallisation',
  ready: 'Fertig',
};

export const MethScreen = () => {
  const {
    precursors,
    methSlots,
    methInventory,
    methCustomers,
    methActivityLogs,
    buyPrecursors,
    unlockMethSlot,
    startMethCook,
    collectMeth,
    sellMethProduct,
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
      toast.error('Verkauf fehlgeschlagen.');
      return;
    }
    updateBudcoins(result.revenue);
    toast.success(`+${result.revenue}$ verdient.`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Beaker size={24} className="text-primary" />
          <h1 className="text-2xl font-display font-bold">Meth Lab</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        <div className="grid gap-3">
          <div className="game-card p-3 space-y-3 bg-gradient-to-br from-slate-900/60 via-slate-900/30 to-cyan-500/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign size={16} className="text-resource-budcoin" />
                Budget & Vorrat
              </div>
              <div className="text-[10px] text-muted-foreground">{inventoryGrams}g im Lager</div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign size={16} className="text-resource-budcoin" />
                {budcoins.toLocaleString()} $
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical size={16} className="text-neon-cyan" />
                {precursors} Precursors
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold">{averagePurity}%</div>
                <div className="text-[10px] text-muted-foreground">Reinheit</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold">{averageQuality}%</div>
                <div className="text-[10px] text-muted-foreground">Qualitaet</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2 col-span-2">
                <div className="font-bold">{methInventory.length}</div>
                <div className="text-[10px] text-muted-foreground">Chargen</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">Zwischenprodukte</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold">{stageTotals.maceration}g</div>
                <div className="text-[10px] text-muted-foreground">Mazeration</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold">{stageTotals.oxidation}g</div>
                <div className="text-[10px] text-muted-foreground">Oxidation</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold">{stageTotals.crystallization}g</div>
                <div className="text-[10px] text-muted-foreground">Kristalle</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleBuyPrecursors(1)}
                aria-disabled={budcoins < METH_PRECURSOR_COST}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold ${
                  budcoins >= METH_PRECURSOR_COST ? 'bg-muted/40' : 'bg-muted/20 text-muted-foreground'
                }`}
              >
                +1 Precursors ({METH_PRECURSOR_COST}$)
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => handleBuyPrecursors(5)}
                aria-disabled={budcoins < METH_PRECURSOR_COST * 5}
                className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold ${
                  budcoins >= METH_PRECURSOR_COST * 5 ? 'bg-muted/40' : 'bg-muted/20 text-muted-foreground'
                }`}
              >
                +5 Precursors ({METH_PRECURSOR_COST * 5}$)
              </motion.button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-amber-200">
                <Skull size={14} className="text-amber-400" />
                Dealer Vertrieb
              </div>
              <span className="text-amber-100">
                {liveSellingDealers.length} aktiv - {dealerSalesPerTick}/Tick
              </span>
            </div>
          </div>

          <div className="game-card p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Beaker size={16} className="text-neon-cyan" />
                Lab Slots
              </div>
              {nextLockedSlot && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleUnlockSlot}
                  disabled={!canUnlock}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                    canUnlock ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Slot freischalten ({unlockCost}$)
                </motion.button>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Ablauf: Mazeration {'->'} Oxidation {'->'} Kristallisation
            </div>
            <div className="grid grid-cols-2 gap-2">
              {methSlots.map(slot => (
                <motion.div
                  key={slot.id}
                  className={`relative rounded-xl border p-3 ${
                    slot.isUnlocked ? 'bg-card border-border/60' : 'bg-muted/30 border-border/30'
                  }`}
                >
                  {!slot.isUnlocked && (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Lock size={22} />
                      <span className="text-xs font-semibold">Locked</span>
                    </div>
                  )}

                  {slot.isUnlocked && !slot.batch && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleStartCook(slot.id)}
                      className="w-full rounded-lg border border-dashed border-border/60 px-2 py-3 text-xs font-semibold text-muted-foreground hover:border-primary/60 hover:text-primary"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Plus size={14} />
                        Start {selectedRecipe?.name || 'Rezept'}
                      </div>
                    </motion.button>
                  )}

                  {slot.isUnlocked && slot.batch && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold">{slot.batch.recipeName}</div>
                        <div className="text-[10px] text-muted-foreground">{stageLabels[slot.batch.stage]}</div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, slot.progress)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{Math.round(slot.progress)}%</span>
                        <span>{slot.batch.grams}g</span>
                      </div>
                      {slot.batch.stage === 'ready' ? (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleCollect(slot.id)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/20 px-2 py-1.5 text-xs font-semibold text-primary"
                        >
                          <Download size={14} />
                          Einsammeln
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Play size={12} />
                          Laeuft...
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="game-card p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users size={16} className="text-cyan-300" />
                Kundenprofil
              </div>
              <div className="text-[10px] text-muted-foreground">{methCustomers.length} Kunden</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold text-orange-300">{averageAddiction}%</div>
                <div className="text-[10px] text-muted-foreground">Sucht Schnitt</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <div className="font-bold text-cyan-300">{averageGreed}%</div>
                <div className="text-[10px] text-muted-foreground">Gier Schnitt</div>
              </div>
            </div>
            {topCustomers.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine Kunden verfuegbar.</div>
            ) : (
              <div className="space-y-2">
                {topCustomers.map(customer => (
                  <div key={customer.id} className="rounded-lg border border-border/40 bg-muted/30 p-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">{customer.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        Sucht {customer.addiction}% - Gier {customer.greed}%
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Flame size={12} className="text-orange-400" />
                        <div className="h-1.5 flex-1 rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-orange-400"
                            style={{ width: `${customer.addiction}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Sparkles size={12} className="text-cyan-300" />
                        <div className="h-1.5 flex-1 rounded-full bg-muted/40">
                          <div
                            className="h-full rounded-full bg-cyan-400"
                            style={{ width: `${customer.greed}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="game-card p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Zap size={16} className="text-neon-cyan" />
              Rezepte
            </div>
            <div className="grid grid-cols-2 gap-2">
              {METH_RECIPES.map(recipe => {
                const isSelected = recipe.id === selectedRecipeId;
                return (
                  <motion.button
                    key={recipe.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedRecipeId(recipe.id)}
                    className={`rounded-lg border p-2 text-left text-xs transition-colors ${
                      isSelected ? 'border-primary bg-primary/10' : 'border-border/50 bg-muted/30'
                    }`}
                  >
                    <div className="font-semibold text-sm">{recipe.name}</div>
                    <div className="text-muted-foreground">{recipe.description}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {recipe.baseGrams}g - Reinheit {recipe.purityRange[0]}-{recipe.purityRange[1]}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Cost: {recipe.precursorCost} Precursors
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="game-card p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Skull size={16} className="text-amber-400" />
              Dealer Netzwerk
            </div>
            {activeDealers.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine Dealer aktiv.</div>
            ) : (
              <div className="space-y-2">
                {activeDealers.map(dealer => {
                  const canSell = dealer.abilities.includes('sell');
                  const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
                  const salesPerTick = Math.max(1, Math.floor(baseSales * 1.6));
                  return (
                    <div
                      key={dealer.id}
                      className={`flex items-center gap-2 rounded-lg border p-2 ${
                        dealer.paused
                          ? 'border-border/30 bg-muted/30 opacity-70'
                          : 'border-amber-500/30 bg-amber-500/10'
                      }`}
                    >
                      <span className="text-2xl">{dealer.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{dealer.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Lv.{dealer.level} - {dealer.paused ? 'Pausiert' : canSell ? `${salesPerTick}/Tick` : 'kein Vertrieb'}
                        </div>
                      </div>
                      {canSell && !dealer.paused && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                          Meth
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="game-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-muted-foreground">
              <div className="flex items-center gap-2">
                <Package size={16} />
                Inventar
              </div>
              <span className="text-[10px] text-muted-foreground">{inventoryGrams}g</span>
            </div>
            {methInventory.length === 0 ? (
              <div className="text-xs text-muted-foreground">Keine Produkte verfuegbar.</div>
            ) : (
              <div className="space-y-2">
                {methInventory.map(product => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{product.recipeName}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {product.grams}g - Reinheit {product.purity}% - Qualitaet {product.quality}%
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSell(product.id)}
                      className="rounded-lg bg-green-500/20 px-2 py-1 text-[11px] font-semibold text-green-300"
                    >
                      Verkaufen
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="game-card p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Sparkles size={16} className="text-cyan-300" />
              Aktivitaet
            </div>
            {methActivityLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground">Noch keine Aktivitaeten.</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {methActivityLogs.slice(0, 12).map(log => (
                  <div
                    key={log.id}
                    className={`flex items-start gap-2 rounded-lg border p-2 text-xs ${
                      log.dealerName ? 'border-amber-500/30 bg-amber-500/10' : 'border-cyan-500/30 bg-cyan-500/10'
                    }`}
                  >
                    {log.dealerIcon ? (
                      <span className="text-lg">{log.dealerIcon}</span>
                    ) : (
                      <FlaskConical size={16} className="text-neon-cyan mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold whitespace-normal break-words">{log.message}</div>
                      {log.customerName && (
                        <div className="text-[10px] text-muted-foreground">
                          {log.customerName} - Sucht {log.addiction ?? 0}% - Gier {log.greed ?? 0}%
                        </div>
                      )}
                    </div>
                    {log.revenue && (
                      <span className="text-[10px] font-semibold text-green-300">+${log.revenue}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="game-card p-3">
          <div className="text-sm font-semibold text-muted-foreground mb-2">Stats</div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{totalMethCooked.toLocaleString()}g</div>
              <div className="text-[10px] text-muted-foreground">Gekocht</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{totalMethSold.toLocaleString()}g</div>
              <div className="text-[10px] text-muted-foreground">Verkauft</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">${totalMethRevenue.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Umsatz</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
