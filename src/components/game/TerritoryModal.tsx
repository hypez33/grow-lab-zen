import { Territory, TerritoryBonus } from '@/store/territoryStore';
import { X, Users, Shield, MapPin, Flame, TrendingUp, Minus, Plus, Crown, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface TerritoryDealer {
  id: string;
  name: string;
  icon: string;
  level: number;
  salesPerTick?: number;
}

interface TerritoryModalProps {
  territory: Territory | null;
  availableDealers: TerritoryDealer[];
  onClose: () => void;
  onAssign: (territoryId: string, dealerId: string) => void;
  onUnassign: (territoryId: string, dealerId: string) => void;
  onFortify: (territoryId: string) => void;
}

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

const getScaledBonuses = (bonuses: TerritoryBonus[], control: number) => {
  const tierPercent = getControlTierPercent(control);
  if (tierPercent <= 0) return [];
  return bonuses.map((bonus) => ({
    ...bonus,
    value: (bonus.value * tierPercent) / 100,
  }));
};

const getTierLabel = (tier: number) => {
  if (tier >= 100) return 'FULL CONTROL';
  if (tier >= 75) return 'DOMINANT';
  if (tier >= 50) return 'MAJORITY';
  if (tier >= 25) return 'CONTESTED';
  return 'UNCLAIMED';
};

const getTierColor = (tier: number) => {
  if (tier >= 100) return 'text-amber-400';
  if (tier >= 75) return 'text-emerald-400';
  if (tier >= 50) return 'text-primary';
  if (tier >= 25) return 'text-orange-400';
  return 'text-muted-foreground';
};

export const TerritoryModal = ({
  territory,
  availableDealers,
  onClose,
  onAssign,
  onUnassign,
  onFortify,
}: TerritoryModalProps) => {
  if (!territory) return null;

  const assignedDealers = availableDealers.filter(dealer => territory.assignedDealerIds.includes(dealer.id));
  const unassignedDealers = availableDealers.filter(dealer => !territory.assignedDealerIds.includes(dealer.id));
  const tierPercent = getControlTierPercent(territory.control);
  const scaledBonuses = getScaledBonuses(territory.bonuses, territory.control);
  const upkeepPerHour = assignedDealers.length * 50;
  const isFullControl = territory.control >= 100;

  return (
    <Dialog open={!!territory} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className={`p-4 border-b border-border/30 ${isFullControl ? 'bg-gradient-to-r from-amber-500/10 to-amber-600/5' : 'bg-gradient-to-r from-primary/10 to-transparent'}`}>
          <DialogHeader className="space-y-0">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-background/50 flex items-center justify-center text-3xl shadow-inner border border-border/30">
                {territory.icon}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  {territory.name}
                  {isFullControl && <Crown size={16} className="text-amber-400" />}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{territory.description}</p>
                <div className={`text-xs font-semibold mt-1 ${getTierColor(tierPercent)}`}>
                  {getTierLabel(tierPercent)} • {Math.round(territory.control)}%
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Control Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Territory Control</span>
              <span className="font-semibold">{Math.round(territory.control)}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted/30 overflow-hidden relative">
              <motion.div
                className={`h-full rounded-full ${isFullControl ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-primary to-purple-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, territory.control))}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="absolute inset-0 flex">
                <div className="w-1/4 border-r border-background/50" />
                <div className="w-1/4 border-r border-background/50" />
                <div className="w-1/4 border-r border-background/50" />
                <div className="w-1/4" />
              </div>
            </div>
          </div>

          {/* Territory Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/20 p-3 border border-border/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin size={12} />
                <span className="text-[10px] uppercase tracking-wider">Density</span>
              </div>
              <div className="text-sm font-semibold capitalize">{territory.customerDensity}</div>
            </div>
            <div className="rounded-xl bg-muted/20 p-3 border border-border/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Zap size={12} />
                <span className="text-[10px] uppercase tracking-wider">Difficulty</span>
              </div>
              <div className="text-sm font-semibold capitalize">{territory.difficulty.replace('-', ' ')}</div>
            </div>
            <div className="rounded-xl bg-muted/20 p-3 border border-border/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Flame size={12} />
                <span className="text-[10px] uppercase tracking-wider">Heat Mod</span>
              </div>
              <div className={`text-sm font-semibold ${territory.heatModifier > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {territory.heatModifier > 0 ? '+' : ''}{territory.heatModifier}%
              </div>
            </div>
            <div className="rounded-xl bg-muted/20 p-3 border border-border/20">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp size={12} />
                <span className="text-[10px] uppercase tracking-wider">Income</span>
              </div>
              <div className={`text-sm font-semibold ${isFullControl ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {isFullControl ? `+$${territory.passiveIncome}/h` : 'Unlock at 100%'}
              </div>
            </div>
          </div>

          {/* Next Contest Warning */}
          {territory.nextContestAt > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Flame size={18} className="text-red-400" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-red-400">Contest Incoming!</div>
                <div className="text-[10px] text-muted-foreground">
                  Rivals will attack in {formatTimeLeft(territory.nextContestAt)}
                </div>
              </div>
            </motion.div>
          )}

          {/* Bonuses Section */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Territory Bonuses
            </div>
            <div className="space-y-1.5">
              {territory.bonuses.map((bonus) => {
                const scaledBonus = scaledBonuses.find(b => b.id === bonus.id);
                const isActive = !!scaledBonus;
                return (
                  <div 
                    key={bonus.id} 
                    className={`flex items-center justify-between p-2.5 rounded-lg ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-muted/10 border border-border/10'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{bonus.icon}</span>
                      <span className={`text-xs ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {bonus.description}
                      </span>
                    </div>
                    {isActive && scaledBonus && (
                      <span className="text-xs font-bold text-primary">
                        {Math.round(scaledBonus.value)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assigned Dealers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned Dealers ({assignedDealers.length})
                </span>
              </div>
              <span className="text-[10px] text-red-400">-${upkeepPerHour}/h upkeep</span>
            </div>
            
            <AnimatePresence mode="popLayout">
              {assignedDealers.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-muted-foreground text-center py-4 bg-muted/10 rounded-lg border border-dashed border-border/30"
                >
                  No dealers assigned. Assign dealers to gain control.
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {assignedDealers.map((dealer) => (
                    <motion.div 
                      key={dealer.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center text-xl">
                          {dealer.icon}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{dealer.name}</div>
                          <div className="text-[10px] text-muted-foreground">Level {dealer.level}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUnassign(territory.id, dealer.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Available Dealers */}
          {unassignedDealers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Dealers ({unassignedDealers.length})
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
                {unassignedDealers.map((dealer) => (
                  <motion.div 
                    key={dealer.id}
                    whileHover={{ scale: 1.01 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/20 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center text-xl">
                        {dealer.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{dealer.name}</div>
                        <div className="text-[10px] text-muted-foreground">Level {dealer.level}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAssign(territory.id, dealer.id)}
                      className="w-8 h-8 rounded-lg bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {territory.control > 50 && (
          <div className="p-4 border-t border-border/30 bg-muted/5">
            <button
              type="button"
              onClick={() => onFortify(territory.id)}
              disabled={territory.fortified}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                territory.fortified 
                  ? 'bg-muted/20 text-muted-foreground cursor-not-allowed' 
                  : 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-400 border border-amber-500/30'
              }`}
            >
              <Shield size={16} />
              {territory.fortified ? 'Already Fortified' : 'Fortify Defense ($5,000)'}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
