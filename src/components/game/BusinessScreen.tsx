import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Clock, DollarSign, TrendingUp, Warehouse, Package, ShoppingCart, MapPin, Truck, Zap, Activity, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import { useBusinessStore } from '@/store/businessStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';
import { useMethStore } from '@/store/methStore';
import { Progress } from '@/components/ui/progress';
import { BusinessShopModal } from './BusinessShopModal';
import { toast } from 'sonner';

const GAME_MINUTES_PER_DAY = 60 * 24;
const SALES_WINDOW_MS = 60 * 60 * 1000;

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

const formatDuration = (totalMinutes: number) => {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const days = Math.floor(safeMinutes / GAME_MINUTES_PER_DAY);
  const hours = Math.floor((safeMinutes % GAME_MINUTES_PER_DAY) / 60);
  const minutes = safeMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(' ');
};

export const BusinessScreen = () => {
  const {
    businesses,
    importContracts,
    shipments,
    warehouseLots,
    warehouseCapacity,
    totalBusinessRevenue,
    businessLogs,
    sellWarehouseStock,
    upgradeBusiness,
    dispatchContractShipment,
  } = useBusinessStore();

  const budcoins = useGameStore(state => state.budcoins);
  const level = useGameStore(state => state.level);
  const gems = useGameStore(state => state.gems);
  const gameTimeMinutes = useGameStore(state => state.gameTimeMinutes);
  const weedSalesWindow = useGameStore(state => state.weedSalesWindow);
  const cocaSalesWindow = useCocaStore(state => state.cocaSalesWindow);
  const methSalesWindow = useMethStore(state => state.methSalesWindow);

  const [showShopModal, setShowShopModal] = useState(false);
  const [showWarehouseSale, setShowWarehouseSale] = useState(false);
  const [showWarehouseDetails, setShowWarehouseDetails] = useState(false);
  const [showRevenueBreakdown, setShowRevenueBreakdown] = useState(false);
  const [lotFilter, setLotFilter] = useState<'all' | 'weed' | 'koks'>('all');
  const [lotSort, setLotSort] = useState<'quality-desc' | 'quality-asc' | 'age-desc' | 'grams-desc'>('quality-desc');
  const [bestQualityFirst, setBestQualityFirst] = useState(false);
  const [liveEarningsPerMinute, setLiveEarningsPerMinute] = useState(0);
  const [warehouseSalesHistory, setWarehouseSalesHistory] = useState<Array<{ minute: number; revenue: number }>>([]);
  const lastCoinsRef = useRef(useGameStore.getState().totalCoinsEarned);
  const revenueWindowRef = useRef<number[]>([]);

  const safeGameMinutes = Number.isFinite(gameTimeMinutes) ? gameTimeMinutes : 0;
  const { day, time } = useMemo(() => formatGameTime(safeGameMinutes), [safeGameMinutes]);
  const ownedBusinesses = useMemo(() => businesses.filter(item => item.owned), [businesses]);
  const ownedContracts = useMemo(() => importContracts.filter(item => item.owned), [importContracts]);
  const luckFactor = useMemo(() => (
    Math.min(0.25, Math.floor(level / 5) * 0.015 + Math.min(0.1, gems * 0.002))
  ), [level, gems]);

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

  const sortedLots = useMemo(() => {
    const lots = [...warehouseLots];
    switch (lotSort) {
      case 'quality-asc':
        return lots.sort((a, b) => a.quality - b.quality);
      case 'age-desc':
        return lots.sort((a, b) => a.arrivedAtMinutes - b.arrivedAtMinutes);
      case 'grams-desc':
        return lots.sort((a, b) => b.grams - a.grams);
      case 'quality-desc':
      default:
        return lots.sort((a, b) => b.quality - a.quality);
    }
  }, [warehouseLots, lotSort]);

  const filteredLots = useMemo(() => {
    if (lotFilter === 'all') return sortedLots;
    return sortedLots.filter(lot => lot.drug === lotFilter);
  }, [lotFilter, sortedLots]);

  const liveEarningsPerHour = Math.max(0, Math.round(liveEarningsPerMinute * 60));
  const combinedPerHour = liveEarningsPerHour;

  const getBusinessProfit = (profitPerGameHour: number, levelValue: number) =>
    Math.floor(profitPerGameHour * (1 + (levelValue - 1) * 0.15));

  const getBusinessUpgradeCost = (upgradeBaseCost: number, levelValue: number) =>
    Math.floor(upgradeBaseCost * Math.pow(1.5, levelValue - 1));

  const totalBusinessProfitPerHour = useMemo(
    () => ownedBusinesses.reduce((sum, business) => {
      if (business.pausedUntilMinutes && business.pausedUntilMinutes > safeGameMinutes) {
        return sum;
      }
      return sum + getBusinessProfit(business.profitPerGameHour, business.level);
    }, 0),
    [ownedBusinesses, safeGameMinutes]
  );

  const warehouseSalesPerHour = useMemo(() => {
    const cutoff = safeGameMinutes - 60;
    return warehouseSalesHistory
      .filter(entry => entry.minute >= cutoff)
      .reduce((sum, entry) => sum + entry.revenue, 0);
  }, [safeGameMinutes, warehouseSalesHistory]);

  const totalRevenuePerHour = totalBusinessProfitPerHour + warehouseSalesPerHour;

  const drugSalesStats = useMemo(() => {
    const now = Date.now();
    const buildStats = (entries: Array<{ timestamp: number; revenue: number }>) => {
      const safeEntries = Array.isArray(entries) ? entries : [];
      const recent = safeEntries.filter(entry => now - entry.timestamp <= SALES_WINDOW_MS);
      const revenue = recent.reduce((sum, entry) => sum + entry.revenue, 0);
      const midpoint = now - SALES_WINDOW_MS / 2;
      const recentHalf = recent.filter(entry => entry.timestamp >= midpoint).reduce((sum, entry) => sum + entry.revenue, 0);
      const previousHalf = recent.filter(entry => entry.timestamp < midpoint).reduce((sum, entry) => sum + entry.revenue, 0);
      let trend: 'up' | 'down' | 'flat' = 'flat';
      if (recentHalf > previousHalf) trend = 'up';
      if (recentHalf < previousHalf) trend = 'down';
      return {
        revenuePerHour: Math.max(0, Math.round(revenue)),
        salesCount: recent.length,
        trend,
      };
    };

    return {
      weed: buildStats(weedSalesWindow),
      coca: buildStats(cocaSalesWindow),
      meth: buildStats(methSalesWindow),
    };
  }, [weedSalesWindow, cocaSalesWindow, methSalesWindow]);

  const lotFilters: Array<{ id: 'all' | 'weed' | 'koks'; label: string }> = [
    { id: 'all', label: 'Alle' },
    { id: 'weed', label: 'Nur Weed' },
    { id: 'koks', label: 'Nur Koks' },
  ];

  useEffect(() => {
    lastCoinsRef.current = useGameStore.getState().totalCoinsEarned;
    const interval = setInterval(() => {
      const currentCoins = useGameStore.getState().totalCoinsEarned;
      const earned = Math.max(0, currentCoins - lastCoinsRef.current);
      lastCoinsRef.current = currentCoins;
      revenueWindowRef.current = [...revenueWindowRef.current, earned].slice(-60);
      const total = revenueWindowRef.current.reduce((sum, value) => sum + value, 0);
      setLiveEarningsPerMinute(total);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const storedPreference = localStorage.getItem('business.sellBestQualityFirst');
    if (storedPreference !== null) {
      setBestQualityFirst(storedPreference === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('business.sellBestQualityFirst', String(bestQualityFirst));
  }, [bestQualityFirst]);

  const handleUpgradeBusiness = (businessId: string) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;
    const result = upgradeBusiness(businessId, currentState.budcoins, currentMinutes);

    if (!result.success) {
      toast.error(result.error || 'Konnte Geschaeft nicht upgraden.');
      return;
    }

    useGameStore.setState(state => ({
      budcoins: state.budcoins - result.cost,
    }));

    toast.success(`Geschaeft upgraded! -${result.cost}$`);
  };

  const handleDispatchContract = (contractId: string) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;
    const contract = importContracts.find(item => item.id === contractId);
    const contractLabel = contract?.name ?? 'Vertrag';
    const result = dispatchContractShipment(contractId, currentMinutes, luckFactor);

    if (!result.success) {
      toast.error(result.error || 'Lieferung konnte nicht gestartet werden.');
      return;
    }

    toast.success(`${contractLabel}: Lieferung gestartet.`);
  };

  const activeShipments = shipments.filter(s => s.status === 'enroute');
  const waitingShipments = shipments.filter(s => s.status === 'waiting');

  const handleSellDrug = (drug: 'weed' | 'koks', percentage: number) => {
    const drugLots = warehouseLots.filter(lot => lot.drug === drug);
    const totalGrams = drugLots.reduce((sum, lot) => sum + lot.grams, 0);

    if (totalGrams <= 0) {
      toast.error(`Keine ${drug === 'weed' ? 'Weed' : 'Koks'} im Lager!`);
      return;
    }

    const gramsToSell = Math.floor(totalGrams * (percentage / 100));
    const result = sellWarehouseStock(drug, gramsToSell, bestQualityFirst);

    if (result.gramsSold <= 0) {
      toast.error('Verkauf fehlgeschlagen!');
      return;
    }

    // Base price per gram depends on drug and quality
    const basePrice = drug === 'weed' ? 15 : 45;
    const qualityMultiplier = 0.5 + (result.averageQuality / 100) * 1.5;
    const revenue = Math.floor(result.gramsSold * basePrice * qualityMultiplier);

    useGameStore.setState(state => ({
      budcoins: state.budcoins + revenue,
      totalCoinsEarned: state.totalCoinsEarned + revenue,
    }));
    useBusinessStore.setState(state => ({
      totalBusinessRevenue: state.totalBusinessRevenue + revenue,
    }));
    setWarehouseSalesHistory((prev) => {
      const next = [...prev, { minute: safeGameMinutes, revenue }];
      return next.slice(-120);
    });

    toast.success(
      <div className="flex flex-col gap-1">
        <div className="font-bold">Verkauft!</div>
        <div className="text-sm">{result.gramsSold}g {drug === 'weed' ? 'Weed' : 'Koks'}</div>
        <div className="text-xs text-emerald-300">+{revenue.toLocaleString()}$ (Q{result.averageQuality}%)</div>
      </div>,
      { duration: 3000 }
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Briefcase size={24} className="text-amber-300" />
          <h1 className="text-2xl font-display font-bold">Business</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} />
            Tag {day} - {time}
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowShopModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold text-sm shadow-lg"
          >
            <ShoppingCart size={16} />
            Shop
          </motion.button>
        </div>
      </div>

      {/* Main Content - Activity Focus */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4">
        {/* Revenue Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <DollarSign size={16} className="text-emerald-300" />
              Revenue Breakdown
            </div>
            <button
              type="button"
              onClick={() => setShowRevenueBreakdown(!showRevenueBreakdown)}
              className="btn-neon text-[10px] px-2 py-1"
            >
              {showRevenueBreakdown ? (
                <span className="inline-flex items-center gap-1">
                  <ChevronUp size={12} /> Einklappen
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ChevronDown size={12} /> Ausklappen
                </span>
              )}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-emerald-300">{totalBusinessProfitPerHour.toLocaleString()} $/h</div>
              <div className="text-[10px] text-muted-foreground">Business Profit</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-emerald-300">{warehouseSalesPerHour.toLocaleString()} $/h</div>
              <div className="text-[10px] text-muted-foreground">Warehouse Sales</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-emerald-300">{totalRevenuePerHour.toLocaleString()} $/h</div>
              <div className="text-[10px] text-muted-foreground">Gesamt</div>
            </div>
          </div>

          {showRevenueBreakdown && (
            <div className="space-y-2">
              <div className="text-[10px] text-muted-foreground">ROI Rechner (Break-even)</div>
              {ownedBusinesses.length === 0 ? (
                <div className="rounded-lg bg-muted/20 p-2 text-xs text-muted-foreground">
                  Keine Businesses aktiv.
                </div>
              ) : (
                <div className="grid gap-2">
                  {ownedBusinesses.map((business) => {
                    const currentProfit = getBusinessProfit(business.profitPerGameHour, business.level);
                    const roiHours = currentProfit > 0 ? Math.ceil(business.cost / currentProfit) : null;
                    const paused = business.pausedUntilMinutes > safeGameMinutes;
                    return (
                      <div key={business.id} className="flex items-center justify-between rounded-lg bg-muted/20 p-2 text-xs">
                        <div>
                          <div className="font-semibold">{business.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {paused ? 'Pausiert' : `${currentProfit.toLocaleString()} $/h`}
                          </div>
                        </div>
                        <div className="text-[10px] text-emerald-300">
                          {paused ? '—' : roiHours ? `${roiHours}h` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Drug Sales Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Activity size={16} className="text-cyan-300" />
            Drug Sales Breakdown
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { id: 'weed', label: 'Weed', color: 'text-emerald-300' },
              { id: 'coca', label: 'Coca', color: 'text-amber-300' },
              { id: 'meth', label: 'Meth', color: 'text-cyan-300' },
            ].map((item) => {
              const stats = drugSalesStats[item.id as keyof typeof drugSalesStats];
              const trend =
                stats.trend === 'up' ? '↑' : stats.trend === 'down' ? '↓' : '→';
              const trendColor =
                stats.trend === 'up'
                  ? 'text-emerald-300'
                  : stats.trend === 'down'
                    ? 'text-red-400'
                    : 'text-muted-foreground';
              return (
                <div key={item.id} className="rounded-lg bg-muted/30 p-2">
                  <div className={`font-bold ${item.color}`}>
                    {stats.revenuePerHour.toLocaleString()} $/h
                  </div>
                  <div className="text-[10px] text-muted-foreground">{item.label}</div>
                  <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                    <span>{stats.salesCount} Sales</span>
                    <span className={trendColor}>{trend}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Cashflow Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <TrendingUp size={16} />
              Cashflow Übersicht
            </div>
            <div className="text-xs text-muted-foreground">Level {level}</div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-resource-budcoin" />
              <span className="text-xl font-display font-bold">{budcoins.toLocaleString()} $</span>
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="flex items-center gap-1 text-sm text-amber-200"
            >
              <Zap size={14} />
              +{combinedPerHour.toLocaleString()} $/h
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-amber-300">{ownedBusinesses.length}</div>
              <div className="text-[10px] text-muted-foreground">Geschäfte</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-emerald-300">{liveEarningsPerHour.toLocaleString()} $/h</div>
              <div className="text-[10px] text-muted-foreground">Verkäufe</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <div className="font-bold text-cyan-300">{totalBusinessRevenue.toLocaleString()} $</div>
              <div className="text-[10px] text-muted-foreground">Gesamt</div>
            </div>
          </div>
        </motion.div>

        {/* Business Portfolio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Briefcase size={16} className="text-amber-300" />
              Business Portfolio
            </div>
            <div className="text-[10px] text-muted-foreground">{ownedBusinesses.length} aktiv</div>
          </div>

          {ownedBusinesses.length === 0 ? (
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground text-center">
              Keine Geschaefte aktiv. Schalte sie im Shop frei.
            </div>
          ) : (
            <div className="space-y-2">
              {ownedBusinesses.map((business) => {
                const isPaused = business.pausedUntilMinutes > safeGameMinutes;
                const currentProfit = isPaused ? 0 : getBusinessProfit(business.profitPerGameHour, business.level);
                const nextProfit = getBusinessProfit(business.profitPerGameHour, business.level + 1);
                const upgradeCost = getBusinessUpgradeCost(business.upgradeBaseCost, business.level);
                const profitGain = Math.max(0, nextProfit - currentProfit);
                const roiHours = profitGain > 0 ? Math.ceil(upgradeCost / profitGain) : null;
                const canUpgrade = budcoins >= upgradeCost;

                return (
                  <div key={business.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{business.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Lv.{business.level} · {isPaused ? 'Pausiert' : `${currentProfit.toLocaleString()} $/h`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpgradeBusiness(business.id)}
                        disabled={!canUpgrade}
                        className={`px-3 py-2 rounded-lg text-[10px] font-semibold transition-colors ${
                          canUpgrade
                            ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                            : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        Upgrade {upgradeCost.toLocaleString()}$
                      </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>+{profitGain.toLocaleString()} $/h naechstes Level</span>
                      <span>{roiHours ? `ROI ~ ${roiHours}h` : 'ROI --'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Contract Operations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Package size={16} className="text-emerald-300" />
              Import-Vertraege
            </div>
            <div className="text-[10px] text-muted-foreground">{ownedContracts.length} aktiv</div>
          </div>

          {ownedContracts.length === 0 ? (
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground text-center">
              Keine Vertraege aktiv. Starte neue Importe im Shop.
            </div>
          ) : (
            <div className="space-y-2">
              {ownedContracts.map((contract) => {
                const readyAt = contract.nextShipmentAt ?? safeGameMinutes;
                const minutesUntil = Math.max(0, Math.ceil(readyAt - safeGameMinutes));
                const isReady = contract.nextShipmentAt === null || safeGameMinutes >= contract.nextShipmentAt;
                const drugLabel = contract.drug === 'weed' ? 'Weed' : 'Koks';

                return (
                  <div key={contract.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{contract.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {drugLabel} · {contract.minGrams}-{contract.maxGrams}g · Cooldown {formatDuration(contract.cooldownMinutes)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDispatchContract(contract.id)}
                        disabled={!isReady}
                        className={`px-3 py-2 rounded-lg text-[10px] font-semibold transition-colors ${
                          isReady
                            ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                            : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {isReady ? 'Dispatch' : `In ${formatDuration(minutesUntil)}`}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Qualitaet {contract.qualityRange[0]}-{contract.qualityRange[1]}%</span>
                      <span>{isReady ? 'Bereit' : `naechste Lieferung in ${formatDuration(minutesUntil)}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Warehouse Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="game-card p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Warehouse size={16} className="text-cyan-300" />
              Lagerverwaltung
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="rounded-full bg-muted/40 px-2 py-0.5">
                {activeShipments.length} unterwegs
              </div>
              <div
                className={`rounded-full px-2 py-0.5 ${
                  waitingShipments.length > 0
                    ? 'bg-amber-500/20 text-amber-200'
                    : 'bg-muted/40'
                }`}
              >
                {waitingShipments.length} warten
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Kapazität</span>
              <span>{warehouseUsed.toLocaleString()}g / {warehouseCapacity.toLocaleString()}g</span>
            </div>
            <div className="relative">
              <Progress value={warehouseFillPercent} className="h-3" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white drop-shadow-lg">
                  {warehouseFillPercent}%
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-3">
              <div className="text-xs text-muted-foreground mb-1">🌿 Weed</div>
              <div className="text-lg font-bold">{warehouseTotals.weed.grams}g</div>
              <div className="text-[10px] text-emerald-200">
                {warehouseTotals.weed.grams > 0 ? `Qualität ${warehouseTotals.weed.quality}%` : 'Kein Bestand'}
              </div>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-3">
              <div className="text-xs text-muted-foreground mb-1">❄️ Koks</div>
              <div className="text-lg font-bold">{warehouseTotals.koks.grams}g</div>
              <div className="text-[10px] text-cyan-200">
                {warehouseTotals.koks.grams > 0 ? `Qualität ${warehouseTotals.koks.quality}%` : 'Kein Bestand'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Coins size={16} className="text-green-400" />
                Lager verkaufen
              </div>
              <button
                onClick={() => setShowWarehouseSale(!showWarehouseSale)}
                className="text-xs text-primary hover:underline"
              >
                {showWarehouseSale ? 'Schließen' : 'Öffnen'}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showWarehouseSale && (
                <motion.div
                  key="warehouse-sale"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-2">
                    {warehouseUsed === 0 ? (
                      <div className="rounded-lg bg-muted/20 p-3 text-center text-xs text-muted-foreground space-y-2">
                        <div>Kein Bestand im Lager.</div>
                        <button
                          type="button"
                          onClick={() => setShowShopModal(true)}
                          className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                        >
                          Verträge öffnen
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Weed Sale */}
                        {warehouseTotals.weed.grams > 0 && (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-green-400">🌿 Weed verkaufen</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {warehouseTotals.weed.grams}g @ Q{warehouseTotals.weed.quality}%
                                </div>
                              </div>
                              <div className="text-xs text-emerald-300">
                                ≈{Math.floor(warehouseTotals.weed.grams * 15 * (0.5 + warehouseTotals.weed.quality / 100 * 1.5)).toLocaleString()}$
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleSellDrug('weed', pct)}
                                  className="px-2 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 font-bold text-xs transition-colors"
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Koks Sale */}
                        {warehouseTotals.koks.grams > 0 && (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-cyan-400">❄️ Koks verkaufen</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {warehouseTotals.koks.grams}g @ Q{warehouseTotals.koks.quality}%
                                </div>
                              </div>
                              <div className="text-xs text-cyan-300">
                                ≈{Math.floor(warehouseTotals.koks.grams * 45 * (0.5 + warehouseTotals.koks.quality / 100 * 1.5)).toLocaleString()}$
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => handleSellDrug('koks', pct)}
                                  className="px-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-xs transition-colors"
                                >
                                  {pct}%
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-muted-foreground text-center bg-muted/20 rounded p-2">
                          💡 Tipp: Höhere Qualität = höherer Verkaufspreis!
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Warehouse Lots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="game-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Package size={16} className="text-cyan-300" />
              Warehouse-Details
            </div>
            <button
              type="button"
              onClick={() => setShowWarehouseDetails(!showWarehouseDetails)}
              className="btn-neon text-[10px] px-2 py-1"
            >
              {showWarehouseDetails ? (
                <span className="inline-flex items-center gap-1">
                  <ChevronUp size={12} /> Ausblenden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ChevronDown size={12} /> Anzeigen
                </span>
              )}
            </button>
          </div>

          {showWarehouseDetails && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {lotFilters.map(filter => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setLotFilter(filter.id)}
                      className={`btn-neon text-[10px] px-2 py-1 ${lotFilter === filter.id ? '' : 'opacity-70'}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <select
                  value={lotSort}
                  onChange={(event) => setLotSort(event.target.value as typeof lotSort)}
                  className="rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-[10px]"
                >
                  <option value="quality-desc">Qualitaet ↓</option>
                  <option value="quality-asc">Qualitaet ↑</option>
                  <option value="age-desc">Alter ↓</option>
                  <option value="grams-desc">Gramm ↓</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">Beste Qualitaet zuerst verkaufen</div>
                <button
                  type="button"
                  onClick={() => setBestQualityFirst(!bestQualityFirst)}
                  className="btn-neon text-[10px] px-2 py-1"
                >
                  {bestQualityFirst ? 'Aktiv' : 'Aus'}
                </button>
              </div>

              {filteredLots.length === 0 ? (
                <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground text-center">
                  Keine Lagerposten verfuegbar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredLots.map((lot) => {
                    const ageDays = Math.max(0, Math.floor((safeGameMinutes - lot.arrivedAtMinutes) / GAME_MINUTES_PER_DAY));
                    const originLabel = lot.origin || 'Unbekannt';
                    const qualityClass = lot.quality < 60
                      ? 'text-rose-300'
                      : lot.quality <= 80
                        ? 'text-amber-200'
                        : 'text-emerald-300';

                    return (
                      <div
                        key={lot.id}
                        className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{originLabel}</span>
                          <span>{lot.grams}g</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{lot.drug === 'weed' ? '🌿 Weed' : '❄️ Koks'}</span>
                          <span className={qualityClass}>Q{lot.quality}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">Alter: {ageDays} Tage</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Active Shipments */}
        {activeShipments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Truck size={16} className="text-orange-300" />
              Aktive Lieferungen ({activeShipments.length})
            </div>
            <div className="space-y-2">
              {activeShipments.map((shipment, index) => {
                const totalMinutes = shipment.route.reduce((sum, leg) => sum + leg.durationMinutes, 0);
                const elapsed = shipment.route
                  .slice(0, shipment.legIndex)
                  .reduce((sum, leg) => sum + leg.durationMinutes, 0) + shipment.legProgressMinutes;
                const progress = totalMinutes > 0 ? Math.min(100, Math.round((elapsed / totalMinutes) * 100)) : 0;
                const currentLeg = shipment.route[Math.min(shipment.legIndex, shipment.route.length - 1)];

                return (
                  <motion.div
                    key={shipment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="game-card p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <Truck size={14} className="text-orange-300" />
                        </motion.div>
                        <span className="text-sm font-semibold">{shipment.name}</span>
                      </div>
                      <div className="text-xs text-cyan-200">{progress}%</div>
                    </div>

                    <div className="relative">
                      <Progress value={progress} className="h-2" />
                      <motion.div
                        className="absolute top-0 left-0 h-2 w-1 bg-orange-400 rounded-full"
                        style={{ left: `${progress}%` }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} />
                        {currentLeg?.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Package size={10} />
                        {shipment.totalGrams}g - Q{shipment.quality}%
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Waiting Shipments */}
        {waitingShipments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="game-card p-3 border-amber-500/30 bg-amber-500/5"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300 mb-2">
              <Activity size={16} />
              Warten auf Lagerplatz ({waitingShipments.length})
            </div>
            <div className="space-y-1">
              {waitingShipments.map(shipment => (
                <div key={shipment.id} className="flex items-center justify-between text-xs">
                  <span>{shipment.name}</span>
                  <span className="text-muted-foreground">{shipment.totalGrams}g</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Activity size={16} />
            Live Activity Feed
          </div>
          <div className="bg-black/30 rounded-lg p-3 max-h-60 overflow-y-auto space-y-1">
            {businessLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                Keine Aktivitäten. Kaufe Geschäfte und Verträge um loszulegen!
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {businessLogs.slice(0, 30).map((log, index) => (
                  <motion.div
                    key={`${log.id}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-start gap-2 text-xs rounded bg-muted/30 p-2 border-l-2 border-primary/30"
                  >
                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                      D{Math.floor(log.timestampMinutes / GAME_MINUTES_PER_DAY) + 1} {formatGameTime(log.timestampMinutes).time}
                    </div>
                    <div className="flex items-center gap-1">
                      {log.type === 'shipment' && <Truck size={10} className="text-orange-300" />}
                      {log.type === 'warehouse' && <Warehouse size={10} className="text-cyan-300" />}
                      {log.type === 'business' && <Briefcase size={10} className="text-amber-300" />}
                      {log.type === 'contract' && <Package size={10} className="text-green-300" />}
                    </div>
                    <div className="flex-1">{log.message}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* Floating Shop Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowShopModal(true)}
        className="fixed bottom-20 right-6 z-10 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/50 flex items-center justify-center"
      >
        <ShoppingCart size={24} className="text-primary-foreground" />
      </motion.button>

      {/* Shop Modal */}
      <BusinessShopModal open={showShopModal} onClose={() => setShowShopModal(false)} />
    </div>
  );
};
