import { useMemo, useState } from 'react';
import { Map, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Territory, TerritoryBonus, useTerritoryStore } from '@/store/territoryStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';
import { TerritoryCard } from './TerritoryCard';
import { TerritoryModal, TerritoryDealer } from './TerritoryModal';

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

  const availableDealers = useMemo<TerritoryDealer[]>(
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

  const controlledCount = territories.filter(t => t.control >= 25).length;
  const assignedDealersCount = territories.reduce((sum, t) => sum + t.assignedDealerIds.length, 0);

  const nextContests = useMemo(() => {
    const upcoming = territories
      .filter(t => t.nextContestAt > 0)
      .map(t => ({ id: t.id, name: t.name, icon: t.icon, timeLeft: formatTimeLeft(t.nextContestAt), at: t.nextContestAt }))
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map size={22} className="text-emerald-300" />
          <h1 className="text-2xl font-display font-bold">Turf Wars</h1>
        </div>
        <div className="text-xs text-emerald-300">
          Total +${Math.round(totalPassiveIncome).toLocaleString()}/h
        </div>
      </div>

      <div className="game-card p-3 mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Overview</span>
          <span>Assigned Dealers: {assignedDealersCount}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-muted/30 p-3 min-h-[64px] flex flex-col justify-between">
            <div className="font-bold text-emerald-300">{controlledCount}/6</div>
            <div className="text-[10px] text-muted-foreground">Controlled</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 min-h-[64px] flex flex-col justify-between">
            <div className="font-bold text-emerald-300">+${Math.round(totalPassiveIncome).toLocaleString()}/h</div>
            <div className="text-[10px] text-muted-foreground">Passive Income</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 min-h-[64px] flex flex-col justify-between">
            <div className="font-bold text-red-300">-${Math.round(totalUpkeepCost).toLocaleString()}/h</div>
            <div className="text-[10px] text-muted-foreground">Upkeep</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3 min-h-[64px] flex flex-col justify-between">
            <div className="font-bold text-emerald-300">{assignedDealersCount}</div>
            <div className="text-[10px] text-muted-foreground">Dealers Assigned</div>
          </div>
        </div>
      </div>

      <div className="game-card p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ShieldAlert size={14} />
            Next Contests
          </div>
        </div>
        {nextContests.length === 0 ? (
          <div className="text-xs text-muted-foreground">Keine aktiven Contests.</div>
        ) : (
          <div className="space-y-1 text-xs">
            {nextContests.map(contest => (
              <div key={contest.id} className="flex items-center justify-between rounded-lg bg-muted/20 px-2 py-1">
                <span>{contest.icon} {contest.name}</span>
                <span className="text-red-300">{contest.timeLeft}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {territories.map(territory => {
          const activeBonuses = getActiveBonusesForTerritory(territory);
          const nextContestLabel = territory.nextContestAt > 0 ? `⚠ ${formatTimeLeft(territory.nextContestAt)}` : null;
          return (
            <TerritoryCard
              key={territory.id}
              territory={territory}
              activeBonuses={activeBonuses}
              assignedCount={territory.assignedDealerIds.length}
              nextContestLabel={nextContestLabel}
              onManage={setActiveTerritory}
            />
          );
        })}
      </div>

      <TerritoryModal
        territory={activeTerritory}
        availableDealers={availableDealers}
        onClose={() => setActiveTerritory(null)}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onFortify={handleFortify}
      />
    </div>
  );
};
