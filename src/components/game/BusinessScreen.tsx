import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock, DollarSign, TrendingUp, Warehouse, Package, Lock, CheckCircle2, MapPin, Truck, Store, Car, Music2, Waves, Leaf, Snowflake, Gem, Anchor, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessStore } from '@/store/businessStore';
import { useGameStore } from '@/store/gameStore';
import { Progress } from '@/components/ui/progress';

const GAME_MINUTES_PER_DAY = 60 * 24;

const formatGameTime = (totalMinutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const day = Math.floor(safeMinutes / GAME_MINUTES_PER_DAY) + 1;
  const minutesInDay = safeMinutes % GAME_MINUTES_PER_DAY;
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return {
    day,
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
};

const businessIcons: Record<string, JSX.Element> = {
  bodega: <Store size={18} className="text-amber-300" />,
  'car-wash': <Car size={18} className="text-cyan-300" />,
  club: <Music2 size={18} className="text-fuchsia-300" />,
  logistics: <Truck size={18} className="text-orange-300" />,
};

const warehouseIcons: Record<string, JSX.Element> = {
  mini: <Package size={18} className="text-emerald-300" />,
  regional: <Warehouse size={18} className="text-cyan-300" />,
  dock: <Anchor size={18} className="text-blue-300" />,
  fortress: <Shield size={18} className="text-amber-300" />,
};

const contractIcons: Record<string, JSX.Element> = {
  tropics: <Leaf size={18} className="text-green-300" />,
  med: <Waves size={18} className="text-sky-300" />,
  andes: <Snowflake size={18} className="text-cyan-200" />,
  cartel: <Gem size={18} className="text-fuchsia-300" />,
};

export const BusinessScreen = () => {
  const {
    businesses,
    warehouseUpgrades,
    importContracts,
    shipments,
    warehouseLots,
    warehouseCapacity,
    totalBusinessRevenue,
    businessLogs,
    buyBusiness,
    buyWarehouse,
    buyContract,
  } = useBusinessStore();

  const { budcoins, level, gameTimeMinutes } = useGameStore();

  const safeGameMinutes = Number.isFinite(gameTimeMinutes) ? gameTimeMinutes : 0;
  const { day, time } = useMemo(() => formatGameTime(safeGameMinutes), [safeGameMinutes]);

  const warehouseUsed = useMemo(
    () => warehouseLots.reduce((sum, lot) => sum + lot.grams, 0),
    [warehouseLots]
  );

  const warehouseFillPercent = warehouseCapacity > 0
    ? Math.min(100, Math.round((warehouseUsed / warehouseCapacity) * 100))
    : 0;

  const warehouseTotals = useMemo(() => {
    const totals = { weed: 0, koks: 0 };
    const qualityTotals = { weed: 0, koks: 0 };
    for (const lot of warehouseLots) {
      totals[lot.drug] += lot.grams;
      qualityTotals[lot.drug] += lot.grams * lot.quality;
    }
    return {
      weed: {
        grams: totals.weed,
        quality: totals.weed > 0 ? Math.round(qualityTotals.weed / totals.weed) : 0,
      },
      koks: {
        grams: totals.koks,
        quality: totals.koks > 0 ? Math.round(qualityTotals.koks / totals.koks) : 0,
      },
    };
  }, [warehouseLots]);

  const profitPerHour = useMemo(
    () => businesses.filter(item => item.owned).reduce((sum, item) => sum + item.profitPerGameHour, 0),
    [businesses]
  );

  const handleBuyBusiness = (businessId: string, cost: number) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;
    const result = buyBusiness(businessId, currentState.budcoins, currentState.level, currentMinutes);
    if (!result.success) {
      toast.error(result.error || 'Konnte Geschaeft nicht kaufen.');
      return;
    }
    useGameStore.setState(state => ({
      budcoins: state.budcoins - cost,
    }));
    toast.success('Geschaeft gekauft!');
  };

  const handleBuyWarehouse = (upgradeId: string, cost: number) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;
    const result = buyWarehouse(upgradeId, currentState.budcoins, currentState.level, currentMinutes);
    if (!result.success) {
      toast.error(result.error || 'Konnte Lager nicht kaufen.');
      return;
    }
    useGameStore.setState(state => ({
      budcoins: state.budcoins - cost,
    }));
    toast.success('Lager erweitert!');
  };

  const handleBuyContract = (contractId: string, cost: number) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;
    const result = buyContract(contractId, currentState.budcoins, currentState.level, currentMinutes);
    if (!result.success) {
      toast.error(result.error || 'Konnte Vertrag nicht kaufen.');
      return;
    }
    useGameStore.setState(state => ({
      budcoins: state.budcoins - cost,
    }));
    toast.success('Vertrag aktiviert!');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Briefcase size={24} className="text-amber-300" />
          <h1 className="text-2xl font-display font-bold">Business</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock size={14} />
          Tag {day} - {time}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        <div className="game-card p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <TrendingUp size={16} />
              Cashflow
            </div>
            <div className="text-xs text-muted-foreground">Level {level}</div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-resource-budcoin" />
              {budcoins.toLocaleString()} $
            </div>
            <div className="text-xs text-amber-200">+{profitPerHour.toLocaleString()} $/h</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{businesses.filter(item => item.owned).length}</div>
              <div className="text-[10px] text-muted-foreground">Geschaefte</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{totalBusinessRevenue.toLocaleString()} $</div>
              <div className="text-[10px] text-muted-foreground">Gesamt</div>
            </div>
          </div>
        </div>

        <div className="game-card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Warehouse size={16} className="text-cyan-300" />
              Lagerhaus
            </div>
            <div className="text-[10px] text-muted-foreground">
              {warehouseUsed.toLocaleString()}g / {warehouseCapacity.toLocaleString()}g
            </div>
          </div>
          <Progress value={warehouseFillPercent} className="h-2" />
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{warehouseTotals.weed.grams}g</div>
              <div className="text-[10px] text-muted-foreground">Weed ({warehouseTotals.weed.quality}% Q)</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold">{warehouseTotals.koks.grams}g</div>
              <div className="text-[10px] text-muted-foreground">Koks ({warehouseTotals.koks.quality}% Q)</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Warehouse size={16} />
            Lager Upgrades
          </div>
          <div className="grid gap-2">
            {warehouseUpgrades.map(upgrade => {
              const lockedByLevel = level < upgrade.minLevel;
              const lockedByBudget = budcoins < upgrade.cost;
              const canBuy = !upgrade.owned && !lockedByLevel && !lockedByBudget;
              return (
                <motion.div
                  key={upgrade.id}
                  whileTap={{ scale: canBuy ? 0.98 : 1 }}
                  className={`game-card p-3 flex items-center justify-between gap-3 ${
                    upgrade.owned ? 'border-emerald-500/30 bg-emerald-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/40 flex items-center justify-center">
                      {warehouseIcons[upgrade.icon] ?? <Warehouse size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{upgrade.name}</div>
                      <div className="text-[10px] text-muted-foreground">{upgrade.description}</div>
                      <div className="text-[10px] text-emerald-200">+{upgrade.capacity}g Kapazitaet</div>
                    </div>
                  </div>
                  {upgrade.owned ? (
                    <CheckCircle2 size={18} className="text-emerald-300" />
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      {lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Lvl {upgrade.minLevel}
                        </div>
                      )}
                      {lockedByBudget && !lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Budget
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBuyWarehouse(upgrade.id, upgrade.cost)}
                        disabled={!canBuy}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          canBuy ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {upgrade.cost.toLocaleString()} $
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Briefcase size={16} />
            Geschaefte
          </div>
          <div className="grid gap-2">
            {businesses.map(business => {
              const lockedByLevel = level < business.minLevel;
              const lockedByBudget = budcoins < business.cost;
              const canBuy = !business.owned && !lockedByLevel && !lockedByBudget;
              return (
                <motion.div
                  key={business.id}
                  whileTap={{ scale: canBuy ? 0.98 : 1 }}
                  className={`game-card p-3 flex items-center justify-between gap-3 ${
                    business.owned ? 'border-amber-500/30 bg-amber-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/40 flex items-center justify-center">
                      {businessIcons[business.icon] ?? <Briefcase size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{business.name}</div>
                      <div className="text-[10px] text-muted-foreground">{business.description}</div>
                      <div className="text-[10px] text-amber-200">+{business.profitPerGameHour} $/h</div>
                    </div>
                  </div>
                  {business.owned ? (
                    <CheckCircle2 size={18} className="text-amber-300" />
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      {lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Lvl {business.minLevel}
                        </div>
                      )}
                      {lockedByBudget && !lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Budget
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBuyBusiness(business.id, business.cost)}
                        disabled={!canBuy}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          canBuy ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {business.cost.toLocaleString()} $
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Truck size={16} />
            Import Vertraege
          </div>
          <div className="grid gap-2">
            {importContracts.map(contract => {
              const needsWarehouse = warehouseCapacity <= 0;
              const lockedByLevel = level < contract.minLevel;
              const canBuy = !contract.owned && budcoins >= contract.cost && !needsWarehouse && !lockedByLevel;
              return (
                <motion.div
                  key={contract.id}
                  whileTap={{ scale: canBuy ? 0.98 : 1 }}
                  className={`game-card p-3 flex items-center justify-between gap-3 ${
                    contract.owned ? 'border-cyan-500/30 bg-cyan-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted/40 flex items-center justify-center">
                      {contractIcons[contract.icon] ?? <Package size={18} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{contract.name}</div>
                      <div className="text-[10px] text-muted-foreground">{contract.description}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {contract.minGrams}-{contract.maxGrams}g - Q {contract.qualityRange[0]}-{contract.qualityRange[1]}%
                      </div>
                    </div>
                  </div>
                  {contract.owned ? (
                    <CheckCircle2 size={18} className="text-cyan-300" />
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      {lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Lvl {contract.minLevel}
                        </div>
                      )}
                      {needsWarehouse && !lockedByLevel && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock size={10} />
                          Lagerhaus
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBuyContract(contract.id, contract.cost)}
                        disabled={!canBuy}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                          canBuy ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {contract.cost.toLocaleString()} $
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MapPin size={16} />
            Shipment Tracker
          </div>
          {shipments.length === 0 ? (
            <div className="game-card p-4 text-xs text-muted-foreground text-center">
              Keine Lieferungen unterwegs.
            </div>
          ) : (
            <div className="space-y-2">
              {shipments.map(shipment => {
                const totalMinutes = shipment.route.reduce((sum, leg) => sum + leg.durationMinutes, 0);
                const elapsed = shipment.route
                  .slice(0, shipment.legIndex)
                  .reduce((sum, leg) => sum + leg.durationMinutes, 0) + shipment.legProgressMinutes;
                const progress = totalMinutes > 0 ? Math.min(100, Math.round((elapsed / totalMinutes) * 100)) : 0;
                const currentLeg = shipment.route[Math.min(shipment.legIndex, shipment.route.length - 1)];
                const nextLeg = shipment.route[shipment.legIndex + 1];

                return (
                  <div key={shipment.id} className="game-card p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="font-semibold">{shipment.name}</div>
                      <div className={`text-[10px] ${shipment.status === 'waiting' ? 'text-amber-300' : 'text-cyan-200'}`}>
                        {shipment.status === 'waiting' ? 'Wartet auf Lager' : `${progress}% unterwegs`}
                      </div>
                    </div>
                    <Progress value={shipment.status === 'waiting' ? 100 : progress} className="h-2" />
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} />
                        {shipment.status === 'waiting' ? 'Safehouse Hub' : currentLeg?.name}
                      </div>
                      {nextLeg && shipment.status !== 'waiting' && (
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          Naechster Stop: {nextLeg.name}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {shipment.totalGrams}g - Q {shipment.quality}% - ETA {shipment.etaMinutes} min
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Package size={16} />
            Business Log
          </div>
          <div className="bg-black/30 rounded-lg p-2 max-h-40 overflow-y-auto">
            {businessLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-2">Keine Logs.</div>
            ) : (
              <div className="space-y-1">
                {businessLogs.slice(0, 20).map(log => (
                  <div key={log.id} className="flex items-start gap-2 text-xs rounded bg-muted/30 p-2">
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      D{Math.floor(log.timestampMinutes / GAME_MINUTES_PER_DAY) + 1} {formatGameTime(log.timestampMinutes).time}
                    </div>
                    <div className="flex-1 whitespace-normal break-words">{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
