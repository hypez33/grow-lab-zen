import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Store, Warehouse, Truck, Lock, CheckCircle2, Briefcase, Package, Car, Music2, Anchor, Shield, Leaf, Waves, Snowflake, Gem } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useBusinessStore } from '@/store/businessStore';
import { useGameStore } from '@/store/gameStore';

interface BusinessShopModalProps {
  open: boolean;
  onClose: () => void;
}

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

export const BusinessShopModal = ({ open, onClose }: BusinessShopModalProps) => {
  const [activeTab, setActiveTab] = useState<'businesses' | 'warehouses' | 'contracts'>('businesses');

  const {
    businesses,
    warehouseUpgrades,
    importContracts,
    warehouseCapacity,
    buyBusiness,
    upgradeBusiness,
    buyWarehouse,
    buyContract,
  } = useBusinessStore();

  const budcoins = useGameStore(state => state.budcoins);
  const level = useGameStore(state => state.level);
  const gameTimeMinutes = useGameStore(state => state.gameTimeMinutes);

  const safeGameMinutes = Number.isFinite(gameTimeMinutes) ? gameTimeMinutes : 0;

  const handleBuyBusiness = (businessId: string) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;

    const result = buyBusiness(businessId, currentState.budcoins, currentState.level, currentMinutes);

    if (!result.success) {
      toast.error(result.error || 'Konnte Geschaeft nicht kaufen.');
      return;
    }

    useGameStore.setState(state => ({
      budcoins: state.budcoins - result.cost,
    }));

    toast.success(`Geschaeft gekauft! -${result.cost}$`);
  };

  const handleBuyWarehouse = (upgradeId: string) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;

    const result = buyWarehouse(upgradeId, currentState.budcoins, currentState.level, currentMinutes);

    if (!result.success) {
      toast.error(result.error || 'Konnte Lager nicht kaufen.');
      return;
    }

    useGameStore.setState(state => ({
      budcoins: state.budcoins - result.cost,
    }));

    toast.success(`Lager erweitert! -${result.cost}$`);
  };

  const handleBuyContract = (contractId: string) => {
    const currentState = useGameStore.getState();
    const currentMinutes = Number.isFinite(currentState.gameTimeMinutes) ? currentState.gameTimeMinutes : safeGameMinutes;

    const result = buyContract(contractId, currentState.budcoins, currentState.level, currentMinutes);

    if (!result.success) {
      toast.error(result.error || 'Konnte Vertrag nicht kaufen.');
      return;
    }

    useGameStore.setState(state => ({
      budcoins: state.budcoins - result.cost,
    }));

    toast.success(`Vertrag aktiviert! -${result.cost}$`);
  };

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onClose();
    }}>
      <DialogContent className="max-w-md max-h-[80vh] p-0 overflow-hidden">
        <div className="sr-only">
          <DialogDescription>Geschäfte, Lagerupgrades und Importverträge kaufen.</DialogDescription>
        </div>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Briefcase size={20} className="text-amber-300" />
              <DialogTitle className="text-lg font-display font-bold">Business Shop</DialogTitle>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-2 bg-muted/30">
            <button
              onClick={() => setActiveTab('businesses')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'businesses'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              Geschäfte
            </button>
            <button
              onClick={() => setActiveTab('warehouses')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'warehouses'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              Lager
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'contracts'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              Verträge
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {activeTab === 'businesses' && (
              <>
                {businesses.map(business => {
                  const lockedByLevel = level < business.minLevel;
                  const lockedByBudget = budcoins < business.cost;
                  const canBuy = !business.owned && !lockedByLevel && !lockedByBudget;

                  const upgradeCost = Math.floor(business.upgradeBaseCost * Math.pow(1.5, business.level - 1));
                  const canUpgrade = business.owned && budcoins >= upgradeCost;

                  const currentProfit = Math.floor(business.profitPerGameHour * (1 + (business.level - 1) * 0.15));
                  const nextProfit = Math.floor(business.profitPerGameHour * (1 + business.level * 0.15));

                  return (
                    <div
                      key={business.id}
                      className={`game-card p-3 flex items-center justify-between gap-3 ${
                        business.owned ? 'border-amber-500/30 bg-amber-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                          {businessIcons[business.icon] ?? <Briefcase size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            {business.name}
                            {business.owned && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                                Lv.{business.level}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{business.description}</div>
                          <div className="text-[10px] text-amber-200">
                            +{currentProfit.toLocaleString()} $/h
                            {business.owned && business.level < 20 && (
                              <span className="text-emerald-300 ml-1">→ {nextProfit.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {business.owned ? (
                        <button
                          type="button"
                          onClick={() => handleUpgradeBusiness(business.id)}
                          disabled={!canUpgrade}
                          tabIndex={0}
                          className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all text-sm shrink-0 ${
                            canUpgrade
                              ? 'btn-neon'
                              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                          }`}
                        >
                          <span className="text-xs">UPGRADE</span>
                          <span className="text-xs">{upgradeCost.toLocaleString()}</span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-end gap-1 shrink-0">
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
                            onClick={() => handleBuyBusiness(business.id)}
                            disabled={!canBuy}
                            tabIndex={0}
                            className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all text-sm ${
                              canBuy
                                ? 'btn-neon'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                          >
                            <span className="text-xs">KAUFEN</span>
                            <span className="text-xs">{business.cost.toLocaleString()}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'warehouses' && (
              <>
                {warehouseUpgrades.map(upgrade => {
                  const lockedByLevel = level < upgrade.minLevel;
                  const lockedByBudget = budcoins < upgrade.cost;
                  const canBuy = !upgrade.owned && !lockedByLevel && !lockedByBudget;

                  return (
                    <div
                      key={upgrade.id}
                      className={`game-card p-3 flex items-center justify-between gap-3 ${
                        upgrade.owned ? 'border-emerald-500/30 bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/40 flex items-center justify-center">
                          {warehouseIcons[upgrade.icon] ?? <Warehouse size={18} />}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{upgrade.name}</div>
                          <div className="text-[10px] text-muted-foreground">{upgrade.description}</div>
                          <div className="text-[10px] text-emerald-200">+{upgrade.capacity}g Kapazität</div>
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
                            onClick={() => handleBuyWarehouse(upgrade.id)}
                            disabled={!canBuy}
                            tabIndex={0}
                            className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all text-sm ${
                              canBuy
                                ? 'btn-neon'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                          >
                            <span className="text-xs">KAUFEN</span>
                            <span className="text-xs">{upgrade.cost.toLocaleString()}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'contracts' && (
              <>
                {importContracts.map(contract => {
                  const needsWarehouse = warehouseCapacity <= 0;
                  const lockedByLevel = level < contract.minLevel;
                  const lockedByBudget = budcoins < contract.cost;
                  const canBuy = !contract.owned && !needsWarehouse && !lockedByLevel && !lockedByBudget;

                  return (
                    <div
                      key={contract.id}
                      className={`game-card p-3 flex items-center justify-between gap-3 ${
                        contract.owned ? 'border-cyan-500/30 bg-cyan-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted/40 flex items-center justify-center">
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
                          {lockedByBudget && !lockedByLevel && !needsWarehouse && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Lock size={10} />
                              Budget
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleBuyContract(contract.id)}
                            disabled={!canBuy}
                            tabIndex={0}
                            className={`flex flex-col items-center justify-center min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all text-sm ${
                              canBuy
                                ? 'btn-neon'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            }`}
                          >
                            <span className="text-xs">KAUFEN</span>
                            <span className="text-xs">{contract.cost.toLocaleString()}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
