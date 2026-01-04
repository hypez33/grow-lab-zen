import { useMemo, useState } from 'react';
import { Map, ShieldAlert, Users, DollarSign, TrendingUp, Flame, Crown, Swords } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Territory, TerritoryBonus, useTerritoryStore } from '@/store/territoryStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';
import { TerritoryCard } from './TerritoryCard';
import { TerritoryModal, TerritoryDealer } from './TerritoryModal';
import { TerritoryMap } from './TerritoryMap';

const getControlTierPercent = (control: number) => {
  if (control >= 100) return 100;
  if (control >= 75) return 75;
  if (control >= 50) return 50;
  if (control >= 25) return 25;
  return 0;
};

const formatTimeLeft = (timestamp: number) => {
  const diff = Math.max(0, timestamp - Date.now());
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const getActiveBonusesForTerritory = (territory: Territory): TerritoryBonus[] => {
  const tierPercent = getControlTierPercent(territory.control);
  if (tierPercent <= 0) return [];
  return territory.bonuses.map((bonus) => ({
    ...bonus,
    value: (bonus.value * tierPercent) / 100,
  }));
};

export const TerritoryScreen = () => {
  const {
    territories,
    totalPassiveIncome,
    totalUpkeepCost,
    assignDealer,
    unassignDealer,
    fortifyTerritory,
  } = useTerritoryStore();
  const workers = useGameStore(state => state.workers);
  const budcoins = useGameStore(state => state.budcoins);
  const cocaWorkers = useCocaStore(state => state.cocaWorkers);

  const weedDealers = useMemo(
    () => workers.filter(worker => worker.owned && !worker.paused && worker.abilities.includes('sell')),
    [workers]
  );
  const cocaDealers = useMemo(
    () => cocaWorkers.filter(worker => worker.owned && !worker.paused && worker.type === 'dealer' && worker.abilities.includes('sell')),
    [cocaWorkers]
  );

  const [activeTerritory, setActiveTerritory] = useState<Territory | null>(null);

  // All dealers (not filtered) - TerritoryModal handles filtering per territory
  const allDealers = useMemo<TerritoryDealer[]>(
    () => [
      ...weedDealers.map(dealer => ({
        id: dealer.id,
        name: dealer.name,
        icon: dealer.icon,
        level: dealer.level,
        salesPerTick: dealer.slotsManaged,
      })),
      ...cocaDealers.map(dealer => ({
        id: dealer.id,
        name: dealer.name,
        icon: dealer.icon,
        level: dealer.level,
        salesPerTick: dealer.salesPerTick,
      })),
    ],
    [weedDealers, cocaDealers]
  );

  // Dealers not assigned to ANY territory (for stats display)
  const unassignedDealers = useMemo(() => {
    const allAssigned = territories.flatMap(t => t.assignedDealerIds);
    return allDealers.filter(d => !allAssigned.includes(d.id));
  }, [allDealers, territories]);

  const controlledCount = territories.filter(t => t.control >= 25).length;
  const fullyControlledCount = territories.filter(t => t.control >= 100).length;
  const assignedDealersCount = territories.reduce((sum, t) => sum + t.assignedDealerIds.length, 0);
  const netIncome = totalPassiveIncome - totalUpkeepCost;

  const nextContests = useMemo(() => {
    const upcoming = territories
      .filter(t => t.nextContestAt > 0)
      .map(t => ({ id: t.id, name: t.name, icon: t.icon, timeLeft: formatTimeLeft(t.nextContestAt), at: t.nextContestAt, control: t.control }))
      .sort((a, b) => a.at - b.at);
    return upcoming.slice(0, 3);
  }, [territories]);

  const handleAssign = (territoryId: string, dealerId: string) => {
    const result = assignDealer(territoryId, dealerId);
    if (!result.success) {
      toast.error(result.message || 'Dealer konnte nicht zugewiesen werden.');
      return;
    }
    toast.success('Dealer zugewiesen.');
  };

  const handleUnassign = (territoryId: string, dealerId: string) => {
    unassignDealer(territoryId, dealerId);
    toast.success('Dealer entfernt.');
  };

  const handleFortify = (territoryId: string) => {
    const result = fortifyTerritory(territoryId, budcoins);
    if (!result.success) {
      toast.error(result.message || 'Fortify fehlgeschlagen.');
      return;
    }
    useGameStore.setState(game => ({ budcoins: game.budcoins - 5000 }));
    toast.success('Territory fortifiziert.');
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-700/30 flex items-center justify-center border border-emerald-500/30">
            <Map size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">
              Turf Wars
            </h1>
            <p className="text-[10px] text-muted-foreground">Control territories, earn passive income</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className={`text-sm font-bold ${netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netIncome >= 0 ? '+' : ''}${Math.round(netIncome).toLocaleString()}/h
          </div>
          <div className="text-[10px] text-muted-foreground">Net Income</div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-4 gap-2 mb-4"
      >
        <div className="game-card p-3 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Crown size={16} className="mx-auto mb-1 text-amber-400" />
          <div className="text-lg font-bold text-foreground">{fullyControlledCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Full Control</div>
        </div>
        <div className="game-card p-3 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <TrendingUp size={16} className="mx-auto mb-1 text-emerald-400" />
          <div className="text-lg font-bold text-emerald-400">+${Math.round(totalPassiveIncome).toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Income/h</div>
        </div>
        <div className="game-card p-3 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <DollarSign size={16} className="mx-auto mb-1 text-red-400" />
          <div className="text-lg font-bold text-red-400">-${Math.round(totalUpkeepCost).toLocaleString()}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Upkeep/h</div>
        </div>
        <div className="game-card p-3 text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Users size={16} className="mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold text-foreground">{assignedDealersCount}</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Dealers</div>
        </div>
      </motion.div>

      {/* Upcoming Contests */}
      <AnimatePresence>
        {nextContests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="game-card p-3 mb-4 border-l-2 border-l-red-500/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Swords size={12} className="text-red-400" />
              </div>
              <span className="text-xs font-semibold text-red-400">Upcoming Contests</span>
              <div className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-[10px] text-red-300">
                {nextContests.length} pending
              </div>
            </div>
            <div className="space-y-1.5">
              {nextContests.map((contest, index) => (
                <motion.div 
                  key={contest.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{contest.icon}</span>
                    <div>
                      <div className="text-xs font-medium">{contest.name}</div>
                      <div className="text-[10px] text-muted-foreground">{Math.round(contest.control)}% control</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-red-400 animate-pulse">{contest.timeLeft}</div>
                    <Flame size={14} className="text-red-400" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empire Progress */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="game-card p-3 mb-4"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">Empire Progress</span>
          <span className="text-xs font-bold text-primary">{controlledCount}/6 Territories</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 via-primary to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${(controlledCount / 6) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
          <span>Newcomer</span>
          <span>Rising Power</span>
          <span>Kingpin</span>
        </div>
      </motion.div>

      {/* Territory Map */}
      <TerritoryMap 
        territories={territories}
        onSelectTerritory={setActiveTerritory}
      />

      {/* Territory Grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">All Territories</h2>
          <span className="text-[10px] text-muted-foreground">{unassignedDealers.length} dealers available</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {territories.map((territory, index) => {
            const activeBonuses = getActiveBonusesForTerritory(territory);
            const nextContestLabel = territory.nextContestAt > 0 ? `⚔️ ${formatTimeLeft(territory.nextContestAt)}` : null;
            return (
              <motion.div
                key={territory.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <TerritoryCard
                  territory={territory}
                  activeBonuses={activeBonuses}
                  assignedCount={territory.assignedDealerIds.length}
                  nextContestLabel={nextContestLabel}
                  onManage={setActiveTerritory}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      <TerritoryModal
        territory={activeTerritory}
        availableDealers={allDealers}
        onClose={() => setActiveTerritory(null)}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onFortify={handleFortify}
      />
    </div>
  );
};
