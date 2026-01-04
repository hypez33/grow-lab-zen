import { Territory, TerritoryBonus } from '@/store/territoryStore';
import { Users, Flame, Shield, Crown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface TerritoryCardProps {
  territory: Territory;
  activeBonuses: TerritoryBonus[];
  assignedCount: number;
  nextContestLabel: string | null;
  onManage: (territory: Territory) => void;
}

const getControlTier = (control: number) => {
  if (control >= 100) return 'full';
  if (control >= 75) return 'dominant';
  if (control >= 50) return 'majority';
  if (control >= 25) return 'contested';
  return 'none';
};

const getTierLabel = (tier: string) => {
  switch (tier) {
    case 'full': return 'FULL CONTROL';
    case 'dominant': return 'DOMINANT';
    case 'majority': return 'MAJORITY';
    case 'contested': return 'CONTESTED';
    default: return 'UNCLAIMED';
  }
};

const getTierColors = (tier: string) => {
  switch (tier) {
    case 'full':
      return {
        text: 'text-amber-300',
        bg: 'from-amber-500/20 to-amber-600/10',
        bar: 'from-amber-400 to-amber-500',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/20'
      };
    case 'dominant':
      return {
        text: 'text-emerald-300',
        bg: 'from-emerald-500/20 to-emerald-600/10',
        bar: 'from-emerald-400 to-emerald-500',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/20'
      };
    case 'majority':
      return {
        text: 'text-primary',
        bg: 'from-primary/20 to-primary/10',
        bar: 'from-primary to-purple-500',
        border: 'border-primary/30',
        glow: 'shadow-primary/20'
      };
    case 'contested':
      return {
        text: 'text-orange-300',
        bg: 'from-orange-500/20 to-orange-600/10',
        bar: 'from-orange-400 to-orange-500',
        border: 'border-orange-500/30',
        glow: 'shadow-orange-500/20'
      };
    default:
      return {
        text: 'text-muted-foreground',
        bg: 'from-muted/20 to-muted/10',
        bar: 'from-muted to-muted',
        border: 'border-muted/30',
        glow: ''
      };
  }
};

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'very-easy': return { label: 'Easy', color: 'bg-emerald-500/20 text-emerald-300' };
    case 'easy': return { label: 'Easy', color: 'bg-emerald-500/20 text-emerald-300' };
    case 'medium': return { label: 'Medium', color: 'bg-amber-500/20 text-amber-300' };
    case 'hard': return { label: 'Hard', color: 'bg-red-500/20 text-red-300' };
    default: return { label: difficulty, color: 'bg-muted text-muted-foreground' };
  }
};

export const TerritoryCard = ({
  territory,
  activeBonuses,
  assignedCount,
  nextContestLabel,
  onManage,
}: TerritoryCardProps) => {
  const tier = getControlTier(territory.control);
  const colors = getTierColors(tier);
  const passiveIncome = territory.control >= 100 ? territory.passiveIncome : 0;
  const difficulty = getDifficultyBadge(territory.difficulty);

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onManage(territory)}
      className={`game-card p-0 overflow-hidden cursor-pointer group relative ${colors.border} border ${tier === 'full' ? 'shadow-lg ' + colors.glow : ''}`}
    >
      {/* Header with gradient based on tier */}
      <div className={`bg-gradient-to-r ${colors.bg} p-3 border-b border-border/30`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center text-2xl shadow-inner">
              {territory.icon}
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                {territory.name}
                {tier === 'full' && <Crown size={12} className="text-amber-400" />}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${difficulty.color}`}>
                  {difficulty.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  • {territory.customerDensity} density
                </span>
              </div>
            </div>
          </div>
          {passiveIncome > 0 && (
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-400">+${passiveIncome}/h</div>
              <div className="text-[9px] text-muted-foreground">passive</div>
            </div>
          )}
        </div>
      </div>

      {/* Control Progress */}
      <div className="p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className={`font-bold ${colors.text}`}>{getTierLabel(tier)}</span>
            <span className="text-muted-foreground">{Math.round(territory.control)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden relative">
            <motion.div
              className={`h-full bg-gradient-to-r ${colors.bar} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, territory.control))}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {/* Tier markers */}
            <div className="absolute inset-0 flex">
              <div className="w-1/4 border-r border-background/50" />
              <div className="w-1/4 border-r border-background/50" />
              <div className="w-1/4 border-r border-background/50" />
              <div className="w-1/4" />
            </div>
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground/50">
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Active Bonuses */}
        {activeBonuses.length > 0 && (
          <div className="space-y-1">
            {activeBonuses.slice(0, 2).map((bonus) => (
              <div key={bonus.id} className="flex items-center gap-1.5 text-[10px] text-primary/80">
                <span>{bonus.icon}</span>
                <span className="truncate">{bonus.description.replace(/\d+%/, `${Math.round(bonus.value)}%`)}</span>
              </div>
            ))}
            {activeBonuses.length > 2 && (
              <div className="text-[10px] text-muted-foreground">
                +{activeBonuses.length - 2} more bonuses
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users size={11} />
              <span>{assignedCount} Dealers</span>
            </div>
            {territory.fortified && (
              <div className="flex items-center gap-1 text-amber-400">
                <Shield size={11} />
                <span>Fortified</span>
              </div>
            )}
          </div>
          {nextContestLabel && (
            <div className="flex items-center gap-1 text-[10px] text-red-400 animate-pulse">
              <Flame size={11} />
              <span>{nextContestLabel}</span>
            </div>
          )}
        </div>

        {/* Manage Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onManage(territory);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium transition-all group-hover:bg-primary/20"
        >
          {assignedCount > 0 ? 'Manage Territory' : 'Claim Territory'}
          <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </motion.div>
  );
};
