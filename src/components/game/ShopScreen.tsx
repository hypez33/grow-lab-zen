import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import { useGameStore, Upgrade, Worker, SEED_CATALOG, Rarity } from '@/store/gameStore';
import { useBusinessStore } from '@/store/businessStore';
import { useCocaStore, CocaWorker, COCA_WORKERS, COCA_SEED_CATALOG, CocaRarity } from '@/store/cocaStore';
import { useMethStore, MethWorker } from '@/store/methStore';
import { PlayCircle, PauseCircle } from 'lucide-react';
import { ResourceBadge } from './ResourceIcon';
import { Zap, Leaf, Bot, Palette, Lock, Check, Users, ArrowUp, Sprout, Snowflake, FlaskConical } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

import { Wind } from 'lucide-react';

const categoryIcons = {
  equipment: Zap,
  genetics: Leaf,
  automation: Bot,
  cosmetics: Palette,
  drying: Wind,
};

const categoryColors = {
  equipment: 'text-neon-green',
  genetics: 'text-resource-seeds',
  automation: 'text-neon-cyan',
  cosmetics: 'text-neon-pink',
  drying: 'text-neon-gold',
};

const getSeedPrice = (rarity: Rarity): number => {
  switch (rarity) {
    case 'common': return 5;
    case 'uncommon': return 15;
    case 'rare': return 50;
    case 'epic': return 150;
    case 'legendary': return 500;
    default: return 10;
  }
};

const getRarityColor = (rarity: Rarity): string => {
  switch (rarity) {
    case 'legendary': return 'hsl(45 100% 55%)';
    case 'epic': return 'hsl(270 70% 55%)';
    case 'rare': return 'hsl(210 100% 60%)';
    case 'uncommon': return 'hsl(180 100% 50%)';
    default: return 'hsl(0 0% 70%)';
  }
};

export const ShopScreen = () => {
  const [activeTab, setActiveTab] = useState<'equipment' | 'genetics' | 'automation' | 'cosmetics' | 'workers' | 'seeds' | 'drying'>('equipment');
  const [bulkSeed, setBulkSeed] = useState<{ name: string; rarity: Rarity | CocaRarity; type: 'weed' | 'coca' } | null>(null);
  const [bulkQuantity, setBulkQuantity] = useState(1);
  const { upgrades, budcoins, buyUpgrade, workers, buyWorker, upgradeWorker, buySeed, seeds, toggleWorkerPause } = useGameStore();
  const koksGrams = useBusinessStore(state => state.warehouseLots.reduce((sum, lot) => (
    lot.drug === 'koks' ? sum + lot.grams : sum
  ), 0));
  const { cocaWorkers, buyCocaWorker, upgradeCocaWorker, toggleCocaWorkerPause, cocaSeeds, buyCocaSeed } = useCocaStore();
  const { methWorkers, buyMethWorker, upgradeMethWorker, toggleMethWorkerPause } = useMethStore();
  const updateBudcoins = (amount: number) => {
    useGameStore.setState(state => ({ budcoins: state.budcoins + amount }));
  };
  const { playPurchase, playError } = useGameSounds();

  const filteredUpgrades = upgrades.filter(u => u.category === activeTab);

  const handleBuy = (upgradeId: string, canAfford: boolean) => {
    if (canAfford) {
      buyUpgrade(upgradeId);
      playPurchase();
    } else {
      playError();
    }
  };

  const handleBuyWorker = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    
    if (worker.owned) {
      playError();
      return;
    }

    const needsKoks = (worker.costKoksGrams ?? 0) > 0;
    if (needsKoks) {
      if (koksGrams < (worker.costKoksGrams ?? 0)) {
        playError();
        toast.error('Nicht genug Koks!', {
          description: `${worker.costKoksGrams}g benötigt.`,
        });
        return;
      }
    } else if (budcoins < worker.cost) {
      playError();
      toast.error('Nicht genug $!');
      return;
    }

    const success = buyWorker(workerId);
    if (success) {
      playPurchase();
      toast.success(`${worker.name} eingestellt!`, {
        description: worker.description,
      });
    } else {
      playError();
      toast.error('Einstellen fehlgeschlagen.');
    }
  };

  const handleUpgradeWorker = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;
    
    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
    
    if (budcoins >= upgradeCost) {
      const success = upgradeWorker(workerId);
      if (success) {
        playPurchase();
        toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleBuySeed = (seedName: string, rarity: Rarity) => {
    const cost = getSeedPrice(rarity);
    if (budcoins >= cost) {
      const success = buySeed(seedName, cost);
      if (success) {
        playPurchase();
        toast.success(`${seedName} gekauft!`);
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const openBulkSeedModal = (seedName: string, rarity: Rarity | CocaRarity, type: 'weed' | 'coca') => {
    setBulkSeed({ name: seedName, rarity, type });
    setBulkQuantity(1);
  };

  const handleBulkSeedBuy = () => {
    if (!bulkSeed) return;
    const unitCost = getSeedPrice(bulkSeed.rarity as Rarity);
    const maxAffordable = unitCost > 0 ? Math.floor(useGameStore.getState().budcoins / unitCost) : 0;
    if (maxAffordable <= 0) {
      playError();
      toast.error('Nicht genug $!');
      return;
    }

    const desiredQuantity = Math.min(Math.max(1, bulkQuantity), maxAffordable);
    let purchased = 0;

    if (bulkSeed.type === 'weed') {
      for (let i = 0; i < desiredQuantity; i += 1) {
        const success = buySeed(bulkSeed.name, unitCost);
        if (!success) break;
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
      if (purchased > 0) {
        useGameStore.setState(state => ({ budcoins: state.budcoins - unitCost * purchased }));
      }
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

  const handleBuyCocaSeed = (seedName: string, rarity: CocaRarity) => {
    const cost = getSeedPrice(rarity);
    const result = buyCocaSeed(seedName, cost, budcoins);
    if (result.success) {
      updateBudcoins(-cost);
      playPurchase();
      toast.success(`${seedName} gekauft!`);
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleBuyCocaWorker = (workerId: string) => {
    const worker = cocaWorkers.find(w => w.id === workerId);
    if (!worker) return;
    
    if (worker.owned) {
      playError();
      return;
    }
    
    if (budcoins >= worker.cost) {
      const result = buyCocaWorker(workerId, budcoins);
      if (result.success) {
        updateBudcoins(-result.cost);
        playPurchase();
        toast.success(`${worker.name} angeheuert!`, {
          description: worker.description,
        });
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleUpgradeCocaWorker = (workerId: string) => {
    const worker = cocaWorkers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;
    
    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));
    
    if (budcoins >= upgradeCost) {
      const result = upgradeCocaWorker(workerId, budcoins);
      if (result.success) {
        updateBudcoins(-result.cost);
        playPurchase();
        toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleBuyMethWorker = (workerId: string) => {
    const worker = methWorkers.find(w => w.id === workerId);
    if (!worker) return;

    if (worker.owned) {
      playError();
      return;
    }

    if (budcoins >= worker.cost) {
      const result = buyMethWorker(workerId, budcoins);
      if (result.success) {
        updateBudcoins(-result.cost);
        playPurchase();
        toast.success(`${worker.name} angeheuert!`, {
          description: worker.description,
        });
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const handleUpgradeMethWorker = (workerId: string) => {
    const worker = methWorkers.find(w => w.id === workerId);
    if (!worker || !worker.owned) return;

    const upgradeCost = Math.floor(worker.cost * 0.5 * Math.pow(1.8, worker.level));

    if (budcoins >= upgradeCost) {
      const result = upgradeMethWorker(workerId, budcoins);
      if (result.success) {
        updateBudcoins(-result.cost);
        playPurchase();
        toast.success(`${worker.name} auf Level ${worker.level + 1} verbessert!`);
      }
    } else {
      playError();
      toast.error('Nicht genug $!');
    }
  };

  const tabs = [
    { id: 'equipment' as const, label: 'Equip', icon: Zap },
    { id: 'drying' as const, label: 'Trocknung', icon: Wind },
    { id: 'seeds' as const, label: 'Seeds', icon: Sprout },
    { id: 'workers' as const, label: 'Workers', icon: Users },
    { id: 'automation' as const, label: 'Auto', icon: Bot },
    { id: 'genetics' as const, label: 'Genes', icon: Leaf },
    { id: 'cosmetics' as const, label: 'Style', icon: Palette },
  ];

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
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all
                ${activeTab === tab.id 
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
        {activeTab === 'seeds' ? (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-2">
              Kaufe Seeds um deine Sammlung zu erweitern!
            </div>

            {/* Weed Seeds */}
            <div className="text-xs font-bold text-neon-green mb-1 flex items-center gap-2">
              <Leaf size={14} /> Weed Seeds ({seeds.length})
            </div>
            <AnimatePresence mode="popLayout">
              {SEED_CATALOG.map((catalogSeed, index) => {
                const cost = getSeedPrice(catalogSeed.rarity);
                const canAfford = budcoins >= cost;
                return (
                  <motion.div
                    key={catalogSeed.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`game-card p-3 cursor-pointer transition-all rarity-${catalogSeed.rarity}`}
                    onClick={() => canAfford && handleBuySeed(catalogSeed.name, catalogSeed.rarity)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
                        style={{ 
                          backgroundColor: `${getRarityColor(catalogSeed.rarity)}20`,
                          boxShadow: `0 0 12px ${getRarityColor(catalogSeed.rarity)}40`
                        }}
                      >
                        🌱
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{catalogSeed.name}</h3>
                          <span 
                            className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                            style={{ 
                              backgroundColor: `${getRarityColor(catalogSeed.rarity)}20`,
                              color: getRarityColor(catalogSeed.rarity)
                            }}
                          >
                            {catalogSeed.rarity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {catalogSeed.traits.slice(0, 2).map(trait => (
                            <span key={trait} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                              {trait}
                            </span>
                          ))}
                          <span className="text-[9px] text-muted-foreground">
                            +{catalogSeed.baseYield} yield
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canAfford) handleBuySeed(catalogSeed.name, catalogSeed.rarity);
                          }}
                          disabled={!canAfford}
                          className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-2 rounded-lg font-bold text-xs transition-all
                            ${canAfford 
                              ? 'btn-neon'
                              : 'bg-muted/50 text-muted-foreground border border-border'
                            }
                          `}
                        >
                          {canAfford ? (
                            <>
                              <span>KAUFEN</span>
                              <span>{cost}</span>
                            </>
                          ) : (
                            <>
                              <Lock size={14} />
                              <span>{cost}</span>
                            </>
                          )}
                        </motion.button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canAfford) openBulkSeedModal(catalogSeed.name, catalogSeed.rarity, 'weed');
                          }}
                          disabled={!canAfford}
                          className={`h-[52px] min-w-[52px] rounded-lg border text-[10px] font-bold uppercase transition-colors
                            ${canAfford
                              ? 'border-neon-green/60 text-neon-green hover:bg-neon-green/10'
                              : 'border-border text-muted-foreground'
                            }
                          `}
                        >
                          MEHR
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Coca Seeds */}
            <div className="text-xs font-bold text-amber-400 mb-1 mt-4 flex items-center gap-2">
              <Snowflake size={14} /> Coca Seeds ({cocaSeeds.length})
            </div>
            <AnimatePresence mode="popLayout">
              {COCA_SEED_CATALOG.map((catalogSeed, index) => {
                const cost = getSeedPrice(catalogSeed.rarity);
                const canAfford = budcoins >= cost;
                return (
                  <motion.div
                    key={catalogSeed.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`game-card p-3 cursor-pointer transition-all rarity-${catalogSeed.rarity}`}
                    onClick={() => canAfford && handleBuyCocaSeed(catalogSeed.name, catalogSeed.rarity)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
                        style={{
                          backgroundColor: `${getRarityColor(catalogSeed.rarity)}20`,
                          boxShadow: `0 0 12px ${getRarityColor(catalogSeed.rarity)}40`
                        }}
                      >
                        🌿
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{catalogSeed.name}</h3>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                            style={{
                              backgroundColor: `${getRarityColor(catalogSeed.rarity)}20`,
                              color: getRarityColor(catalogSeed.rarity)
                            }}
                          >
                            {catalogSeed.rarity}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {catalogSeed.traits.slice(0, 2).map(trait => (
                            <span key={trait} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                              {trait}
                            </span>
                          ))}
                          <span className="text-[9px] text-muted-foreground">
                            +{catalogSeed.baseYield}g yield
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canAfford) handleBuyCocaSeed(catalogSeed.name, catalogSeed.rarity);
                          }}
                          disabled={!canAfford}
                          className={`flex flex-col items-center justify-center min-w-[70px] px-3 py-2 rounded-lg font-bold text-xs transition-all
                            ${canAfford
                              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-black shadow-lg shadow-amber-500/30'
                              : 'bg-muted/50 text-muted-foreground border border-border'
                            }
                          `}
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
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canAfford) openBulkSeedModal(catalogSeed.name, catalogSeed.rarity, 'coca');
                          }}
                          disabled={!canAfford}
                          className={`h-[52px] min-w-[52px] rounded-lg border text-[10px] font-bold uppercase transition-colors
                            ${canAfford
                              ? 'border-amber-300/60 text-amber-200 hover:bg-amber-500/10'
                              : 'border-border text-muted-foreground'
                            }
                          `}
                        >
                          MEHR
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : activeTab === 'workers' ? (
          <div className="grid gap-3">
            <div className="text-sm text-muted-foreground mb-2">
              Stelle Mitarbeiter ein, die automatisch für dich arbeiten!
            </div>
            
            {/* Weed Workers */}
            <div className="text-xs font-bold text-neon-green mb-1 flex items-center gap-2">
              <Leaf size={14} /> Weed Dealer
            </div>
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

            {/* Meth Lab Workers */}
            <div className="text-xs font-bold text-cyan-300 mt-4 mb-1 flex items-center gap-2">
              <FlaskConical size={14} /> Meth Labor
            </div>
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

            {/* Coca Auto Workers (Farmer & Processor) */}
            <div className="text-xs font-bold text-green-400 mt-4 mb-1 flex items-center gap-2">
              <Sprout size={14} /> Coca Produktion
            </div>
            <AnimatePresence mode="popLayout">
              {cocaWorkers.filter(w => w.type === 'farmer' || w.type === 'processor').map((worker, index) => (
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

            {/* Coca Dealers */}
            <div className="text-xs font-bold text-amber-400 mt-4 mb-1 flex items-center gap-2">
              <Snowflake size={14} /> Coca Kartell
            </div>
            <AnimatePresence mode="popLayout">
              {cocaWorkers.filter(w => w.type === 'dealer').map((worker, index) => (
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
          </div>
        ) : (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredUpgrades.map((upgrade, index) => {
                const canAfford = budcoins >= Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level));
                return (
                  <UpgradeCard 
                    key={upgrade.id} 
                    upgrade={upgrade} 
                    canAfford={canAfford}
                    onBuy={() => handleBuy(upgrade.id, canAfford)}
                    index={index}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={Boolean(bulkSeed)} onOpenChange={(open) => !open && setBulkSeed(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Seeds im Bulk kaufen</DialogTitle>
          <DialogDescription>Wähle eine Menge und bestätige den Kauf.</DialogDescription>
          {bulkSeed && (() => {
            const unitCost = getSeedPrice(bulkSeed.rarity as Rarity);
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
                  <button
                    type="button"
                    onClick={() => setBulkQuantity(1)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkQuantity(5)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    5
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkQuantity(10)}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    10
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (maxAffordable > 0) setBulkQuantity(maxAffordable);
                    }}
                    className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Max
                  </button>
                </div>

                <div className="space-y-2">
                  <label htmlFor="bulk-seed-amount" className="text-xs text-muted-foreground">
                    Menge
                  </label>
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
  const canAffordBuy = needsKoks
    ? koksGrams >= (worker.costKoksGrams ?? 0)
    : budcoins >= worker.cost;
  const canAffordUpgrade = budcoins >= upgradeCost;
  const isMaxed = worker.level >= worker.maxLevel;
  const hireCostLabel = needsKoks
    ? `${worker.costKoksGrams}g Koks`
    : worker.cost.toLocaleString();

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
        {/* Icon */}
        <motion.div 
          className="text-4xl"
          animate={worker.owned && !worker.paused ? { 
            y: [0, -3, 0],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-foreground">{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange">
                🏖️ Urlaub
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{worker.description}</p>
          
          {/* Abilities */}
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map(ability => (
              <span 
                key={ability} 
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize"
              >
                {ability === 'plant' ? '🌱 Pflanzen' : 
                 ability === 'tap' ? '⚡ Boost' : 
                 ability === 'harvest' ? '✂️ Ernten' : 
                 ability === 'sell' ? '💰 Verkaufen' :
                 '🌬️ Trocknen'}
              </span>
            ))}
          </div>
          
          {worker.owned && (
            <div className="text-xs text-primary mt-1">
              Verwaltet {worker.slotsManaged + worker.level - 1} Slots
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {/* Buy/Upgrade button */}
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBuy}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all
                ${canAffordBuy 
                  ? 'btn-neon text-sm'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
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
                ${canAffordUpgrade 
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
            >
              <ArrowUp size={16} />
              <span className="text-[10px] mt-0.5">{upgradeCost.toLocaleString()}</span>
            </motion.button>
          )}

          {/* Pause/Resume button for owned workers */}
          {worker.owned && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePause();
                toast.success(worker.paused ? `${worker.name} ist wieder aktiv!` : `${worker.name} ist jetzt im Urlaub`);
              }}
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all relative z-10 cursor-pointer
                ${worker.paused
                  ? 'bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30'
                  : 'bg-neon-orange/20 text-neon-orange border border-neon-orange/30 hover:bg-neon-orange/30'
                }
              `}
              style={{ pointerEvents: 'auto' }}
            >
              {worker.paused ? (
                <>
                  <PlayCircle size={14} />
                  <span>Aktivieren</span>
                </>
              ) : (
                <>
                  <PauseCircle size={14} />
                  <span>Pausieren</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Level progress */}
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
      case 'cook':
        return '🧪 Kochen';
      case 'collect':
        return '📦 Einsammeln';
      case 'resupply':
        return '⛽ Nachschub';
      default:
        return ability;
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
          ? worker.paused
            ? 'opacity-60 border-cyan-500/20'
            : 'border-cyan-500/50 shadow-cyan-500/20'
          : 'border-cyan-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="text-4xl"
          animate={worker.owned && !worker.paused ? {
            y: [0, -3, 0],
            rotate: [0, 6, -6, 0],
            scale: [1, 1.08, 1],
          } : {}}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-cyan-300">{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                🔒 Pause
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 italic">{worker.description}</p>

          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map((ability) => (
              <span
                key={ability}
                className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200"
              >
                {abilityLabel(ability)}
              </span>
            ))}
          </div>

          {worker.owned && (
            <div className="text-xs mt-1 text-cyan-200">
              ⚗️ Slots/Tick: {slotsToManage}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBuy();
              }}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all relative z-10 cursor-pointer
                ${canAffordBuy
                  ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-sm shadow-lg shadow-cyan-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
              style={{ pointerEvents: canAffordBuy ? 'auto' : 'none' }}
            >
              {canAffordBuy ? (
                <>
                  <span className="text-xs">ANHEUERN</span>
                  <span className="text-xs">{worker.cost.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span className="text-xs mt-0.5">{worker.cost.toLocaleString()}</span>
                </>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpgrade();
              }}
              disabled={!canAffordUpgrade}
              className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all relative z-10 cursor-pointer
                ${canAffordUpgrade
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-500/50'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
              style={{ pointerEvents: canAffordUpgrade ? 'auto' : 'none' }}
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
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all relative z-10 cursor-pointer
                ${worker.paused
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                }
              `}
              style={{ pointerEvents: 'auto' }}
            >
              {worker.paused ? (
                <>
                  <PlayCircle size={14} />
                  <span>Start</span>
                </>
              ) : (
                <>
                  <PauseCircle size={14} />
                  <span>Stop</span>
                </>
              )}
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

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`game-card p-4 border-2 ${
        worker.type === 'farmer' || worker.type === 'processor'
          ? worker.owned ? (worker.paused ? 'opacity-60 border-green-500/20' : 'border-green-500/50 shadow-green-500/20') : 'border-green-500/10'
          : worker.owned ? (worker.paused ? 'opacity-60 border-amber-500/20' : 'border-amber-500/50 glow-gold shadow-amber-500/20') : 'border-amber-500/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <motion.div 
          className="text-4xl"
          animate={worker.owned && !worker.paused ? { 
            y: [0, -3, 0],
            rotate: [0, -8, 8, 0],
            scale: [1, 1.1, 1]
          } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {worker.icon}
        </motion.div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-display font-bold ${worker.type === 'farmer' || worker.type === 'processor' ? 'text-green-400' : 'text-amber-400'}`}>{worker.name}</h3>
            {worker.owned && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Lv.{worker.level}/{worker.maxLevel}
              </span>
            )}
            {worker.owned && worker.paused && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                🔒 Gesperrt
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 italic">{worker.description}</p>
          
          {/* Abilities */}
          <div className="flex flex-wrap gap-1 mt-2">
            {worker.abilities.map(ability => (
              <span 
                key={ability} 
                className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                  worker.type === 'farmer' || worker.type === 'processor'
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
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
          
          {/* Stats for owned workers */}
          {worker.owned && (
            <div className={`text-xs mt-1 ${worker.type === 'farmer' || worker.type === 'processor' ? 'text-green-400' : 'text-amber-400'}`}>
              {worker.type === 'farmer' && `🌱 +${Math.floor(15 * (1 + (worker.level - 1) * 0.15))}% Ertrag`}
              {worker.type === 'processor' && `⚗️ +${Math.floor(10 * worker.level)}% Effizienz`}
              {worker.type === 'dealer' && worker.salesPerTick > 0 && `⚡ ${worker.salesPerTick + Math.floor(worker.level * 0.5)} Verkäufe/Tick`}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          {!worker.owned ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBuy();
              }}
              disabled={!canAffordBuy}
              className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all relative z-10 cursor-pointer
                ${canAffordBuy
                  ? worker.type === 'farmer' || worker.type === 'processor'
                    ? 'bg-gradient-to-r from-green-600 to-green-500 text-white text-sm shadow-lg shadow-green-500/30'
                    : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black text-sm shadow-lg shadow-amber-500/30'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
              style={{ pointerEvents: canAffordBuy ? 'auto' : 'none' }}
            >
              {canAffordBuy ? (
                <>
                  <span className="text-xs">ANHEUERN</span>
                  <span className="text-xs">{worker.cost.toLocaleString()}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span className="text-xs mt-0.5">{worker.cost.toLocaleString()}</span>
                </>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpgrade();
              }}
              disabled={!canAffordUpgrade}
              className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all relative z-10 cursor-pointer
                ${canAffordUpgrade
                  ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                  : 'bg-muted/50 text-muted-foreground border border-border'
                }
              `}
              style={{ pointerEvents: canAffordUpgrade ? 'auto' : 'none' }}
            >
              <ArrowUp size={16} />
              <span className="text-[10px] mt-0.5">{upgradeCost.toLocaleString()}</span>
            </motion.button>
          )}

          {/* Pause/Resume button */}
          {worker.owned && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePause();
                toast.success(worker.paused ? `${worker.name} ist wieder aktiv!` : `${worker.name} wurde gestoppt`);
              }}
              className={`flex items-center justify-center gap-1 min-w-[72px] px-2 py-1.5 rounded-lg text-xs font-medium transition-all relative z-10 cursor-pointer
                ${worker.paused
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                }
              `}
              style={{ pointerEvents: 'auto' }}
            >
              {worker.paused ? (
                <>
                  <PlayCircle size={14} />
                  <span>Start</span>
                </>
              ) : (
                <>
                  <PauseCircle size={14} />
                  <span>Stop</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Level progress */}
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
  const Icon = categoryIcons[upgrade.category];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      className={`upgrade-card ${isMaxed ? 'opacity-60' : ''} ${upgrade.category === 'equipment' ? 'rarity-uncommon' : upgrade.category === 'automation' ? 'rarity-rare' : upgrade.category === 'genetics' ? 'rarity-epic' : 'rarity-legendary'}`}
      onClick={() => !isMaxed && canAfford && onBuy()}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg bg-muted/50 ${categoryColors[upgrade.category]}`}>
          <Icon size={24} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-foreground truncate">{upgrade.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Lv.{upgrade.level}/{upgrade.maxLevel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{upgrade.description}</p>
          
          {/* Effect preview */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-primary font-medium">
              +{(upgrade.effectValue * 100).toFixed(0)}% per level
            </span>
            <span className="text-xs text-muted-foreground">
              (Current: +{(upgrade.effectValue * upgrade.level * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Buy button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={isMaxed || !canAfford}
          className={`flex flex-col items-center justify-center min-w-[72px] px-3 py-2 rounded-lg font-bold transition-all
            ${isMaxed 
              ? 'bg-muted text-muted-foreground' 
              : canAfford 
                ? 'btn-neon text-sm'
                : 'bg-muted/50 text-muted-foreground border border-border'
            }
          `}
        >
          {isMaxed ? (
            <>
              <Check size={18} />
              <span className="text-xs mt-0.5">MAX</span>
            </>
          ) : !canAfford ? (
            <>
              <Lock size={16} />
              <span className="text-xs mt-0.5">{cost.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="text-xs">BUY</span>
              <span className="text-xs">{cost.toLocaleString()}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Level progress */}
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
