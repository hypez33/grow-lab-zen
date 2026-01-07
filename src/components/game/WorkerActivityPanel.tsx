import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Loader2, Leaf, Sparkles, Scissors, Wind, DollarSign, Clock, Skull, Handshake, Package, Swords } from 'lucide-react';

export const WorkerActivityPanel = () => {
  const workers = useGameStore(state => state.workers);
  const growSlots = useGameStore(state => state.growSlots);
  const seeds = useGameStore(state => state.seeds);
  const inventory = useGameStore(state => state.inventory);
  const dryingRacks = useGameStore(state => state.dryingRacks);
  const dealerActivities = useGameStore(state => state.dealerActivities);
  const dealerDrugEffects = useGameStore(state => state.dealerDrugEffects);

  const activeWorkers = workers.filter(w => w.owned);
  const workingWorkers = workers.filter(w => w.owned && !w.paused);
  
  // Get both dealer types
  const salesDealer = workers.find(w => w.id === 'sales-dealer' && w.owned);
  const streetPsycho = workers.find(w => w.id === 'street-psycho' && w.owned);

  if (activeWorkers.length === 0) {
    return null;
  }

  // Calculate what each worker is doing
  const getWorkerActivity = (worker: typeof workers[0]) => {
    const activities: { icon: typeof Leaf; label: string; active: boolean }[] = [];
    const slotsToManage = worker.slotsManaged + worker.level - 1;

    // Check planting activity
    if (worker.abilities.includes('plant')) {
      const emptySlots = growSlots.filter(s => s.isUnlocked && !s.seed).length;
      const canPlant = emptySlots > 0 && seeds.length > 0;
      activities.push({
        icon: Leaf,
        label: canPlant ? `Pflanzt (${Math.min(emptySlots, slotsToManage, seeds.length)} Slots)` : 'Wartet auf Seeds/Slots',
        active: canPlant
      });
    }

    // Check tapping activity
    if (worker.abilities.includes('tap')) {
      const growingPlants = growSlots.filter(s => s.seed && s.isUnlocked && s.stage !== 'harvest').length;
      const tapping = growingPlants > 0;
      activities.push({
        icon: Sparkles,
        label: tapping ? `Boosted ${Math.min(growingPlants, slotsToManage)} Pflanzen` : 'Keine wachsenden Pflanzen',
        active: tapping
      });
    }

    // Check harvesting activity
    if (worker.abilities.includes('harvest')) {
      const readyPlants = growSlots.filter(s => s.seed && s.isUnlocked && s.stage === 'harvest').length;
      const harvesting = readyPlants > 0;
      activities.push({
        icon: Scissors,
        label: harvesting ? `Erntet ${Math.min(readyPlants, slotsToManage)} Pflanzen` : 'Keine erntereifen Pflanzen',
        active: harvesting
      });
    }

    // Check drying activity
    if (worker.abilities.includes('dry')) {
      const wetBuds = inventory.filter(b => b.state === 'wet').length;
      const emptyRacks = dryingRacks.filter(r => r.isUnlocked && !r.bud).length;
      const drying = wetBuds > 0 && emptyRacks > 0;
      activities.push({
        icon: Wind,
        label: drying ? `Trocknet ${Math.min(wetBuds, emptyRacks)} Buds` : wetBuds > 0 ? 'Keine freien Racks' : 'Keine nassen Buds',
        active: drying
      });
    }

    // Check selling activity - but don't show generic status for dealers (we have activity log)
    if (worker.abilities.includes('sell') && !['sales-dealer', 'street-psycho', 'dealer-giulio'].includes(worker.id)) {
      const driedBuds = inventory.filter(b => b.state === 'dried').length;
      const selling = driedBuds > 0;
      activities.push({
        icon: DollarSign,
        label: selling ? `Verkauft ${Math.min(driedBuds, slotsToManage)} Buds` : 'Keine getrockneten Buds',
        active: selling
      });
    }

    return activities;
  };

  // Get icon for dealer activity type
  const getDealerActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return <DollarSign size={12} className="text-neon-green" />;
      case 'scam': return <Skull size={12} className="text-neon-gold" />;
      case 'meeting': return <Handshake size={12} className="text-neon-cyan" />;
      case 'waiting': return <Clock size={12} className="text-muted-foreground" />;
      case 'deal': return <Package size={12} className="text-primary" />;
      case 'kill': return <Skull size={12} className="text-red-500" />;
      case 'violence': return <Swords size={12} className="text-orange-500" />;
      case 'robbery': return <span className="text-xs">🔫</span>;
      case 'drugs': return <span className="text-xs">🚬</span>;
      case 'random': return <span className="text-xs">🎲</span>;
      default: return <DollarSign size={12} />;
    }
  };

  // Get activity background color based on type
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'sale': return 'bg-neon-green/10 border border-neon-green/20';
      case 'scam': return 'bg-neon-gold/10 border border-neon-gold/20';
      case 'meeting': return 'bg-neon-cyan/10 border border-neon-cyan/20';
      case 'kill': return 'bg-red-500/20 border border-red-500/30';
      case 'violence': return 'bg-orange-500/20 border border-orange-500/30';
      case 'robbery': return 'bg-purple-500/20 border border-purple-500/30';
      case 'drugs': return 'bg-pink-500/10 border border-pink-500/20';
      default: return 'bg-muted/30 border border-border/30';
    }
  };

  // Check if worker is a dealer type
  const isDealerType = (workerId: string) => ['sales-dealer', 'street-psycho', 'dealer-giulio'].includes(workerId);

  return (
    <div className="game-card p-3 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Loader2 size={12} className="animate-spin text-primary" />
        <span>Worker-Aktivität</span>
      </div>

      <div className="space-y-2">
        {activeWorkers.map(worker => {
          const activities = getWorkerActivity(worker);
          const isWorking = activities.some(a => a.active) && !worker.paused;
          const isDealer = isDealerType(worker.id);
          const isPaused = worker.paused;
          const isPsycho = worker.id === 'street-psycho';
          const isGiulio = worker.id === 'dealer-giulio';
          
          // Get activities for this specific dealer
          const dealerSpecificActivities = isDealer 
            ? dealerActivities.filter(a => a.dealerId === worker.id)
            : [];
          
          // Get drug effect for this dealer
          const currentDrugEffect = isDealer ? dealerDrugEffects[worker.id] : null;
          const hasDrugEffect = currentDrugEffect && currentDrugEffect.expiresAt > Date.now();

          return (
            <motion.div
              key={worker.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-2 rounded-lg border transition-colors ${
                isPaused
                  ? 'bg-neon-orange/10 border-neon-orange/30 opacity-60'
                  : isPsycho
                    ? 'bg-red-500/10 border-red-500/30'
                    : isGiulio
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : isWorking || (isDealer && dealerSpecificActivities.length > 0)
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-border/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{worker.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-semibold ${isPsycho ? 'text-red-400' : isGiulio ? 'text-amber-300' : ''}`}>
                      {worker.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Lv.{worker.level}</span>
                    {isPaused ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-neon-orange/20 text-neon-orange">
                        🏖️ Urlaub
                      </span>
                    ) : (isWorking || (isDealer && inventory.filter(b => b.state === 'dried').length > 0)) ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: isPsycho ? 0.5 : 1.5 }}
                        className={`w-2 h-2 rounded-full ${isPsycho ? 'bg-red-500' : isGiulio ? 'bg-amber-400' : 'bg-primary'}`}
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                    {isPsycho && !isPaused && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        ☠️ Gefährlich
                      </span>
                    )}
                    {isGiulio && !isPaused && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                        🎰 Süchtig
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Paused message */}
              {isPaused && (
                <div className="text-xs text-neon-orange text-center py-2">
                  Mitarbeiter ist im Urlaub und arbeitet nicht
                </div>
              )}

              {/* Regular worker activities */}
              {!isDealer && !isPaused && activities.length > 0 && (
                <div className="grid grid-cols-2 gap-1">
                  <AnimatePresence mode="popLayout">
                    {activities.map((activity, i) => {
                      const Icon = activity.icon;
                      return (
                        <motion.div
                          key={i}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-1.5 text-xs p-1 rounded ${
                            activity.active 
                              ? 'text-primary' 
                              : 'text-muted-foreground/60'
                          }`}
                        >
                          {activity.active ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            >
                              <Icon size={12} />
                            </motion.div>
                          ) : (
                            <Icon size={12} />
                          )}
                          <span className="min-w-0 whitespace-normal break-words">{activity.label}</span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Dealer drug effect status */}
              {isDealer && !isPaused && hasDrugEffect && currentDrugEffect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-2 p-2 rounded-lg text-xs ${
                    isPsycho
                      ? 'bg-red-500/30 border border-red-500/40'
                      : isGiulio
                        ? 'bg-amber-500/20 border border-amber-500/30'
                        : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse">{currentDrugEffect.name}</span>
                    <span className="text-muted-foreground">
                      ({currentDrugEffect.salesMultiplier < 1 ? '-' : '+'}{Math.abs(Math.round((currentDrugEffect.salesMultiplier - 1) * 100))}% Verkäufe)
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Dealer activity log */}
              {isDealer && !isPaused && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {dealerSpecificActivities.length === 0 ? (
                    <div className={`text-xs text-center py-2 ${isPsycho ? 'text-red-300' : isGiulio ? 'text-amber-200' : 'text-muted-foreground'}`}>
                      {isPsycho
                        ? 'Wartet ungeduldig auf Ware... Spielt mit dem Messer.'
                        : isGiulio
                          ? 'Keine Aktivitäten - Hängt am Automaten, wartet auf Ware.'
                          : 'Keine Aktivitäten - Warte auf getrocknete Buds'}
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {dealerSpecificActivities.slice(0, 5).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: isPsycho ? 20 : -20 }}
                          animate={{ opacity: 1 - index * 0.15, x: 0 }}
                          exit={{ opacity: 0, x: isPsycho ? -20 : 20 }}
                        className={`flex items-start gap-2 text-xs p-1.5 rounded ${getActivityBgColor(activity.type)}`}
                      >
                        {getDealerActivityIcon(activity.type)}
                        <span className="flex-1 min-w-0 whitespace-normal break-words leading-4">{activity.message}</span>
                        {activity.revenue && (
                          <span className={`font-bold ${
                            activity.type === 'violence' || activity.type === 'robbery' 
                                ? 'text-orange-400' 
                                : 'text-neon-green'
                            }`}>
                              +{activity.revenue}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
