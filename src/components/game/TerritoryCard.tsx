import { Territory, TerritoryBonus } from '@/store/territoryStore';

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
    case 'full':
      return 'FULL';
    case 'dominant':
      return 'DOMINANT';
    case 'majority':
      return 'MAJORITY';
    case 'contested':
      return 'CONTESTED';
    default:
      return 'NONE';
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'full':
      return 'text-emerald-300';
    case 'dominant':
      return 'text-emerald-200';
    case 'majority':
      return 'text-amber-200';
    case 'contested':
      return 'text-orange-200';
    default:
      return 'text-muted-foreground';
  }
};

const getTierBarColor = (tier: string) => {
  switch (tier) {
    case 'full':
      return 'bg-emerald-500';
    case 'dominant':
      return 'bg-emerald-400';
    case 'majority':
      return 'bg-amber-400';
    case 'contested':
      return 'bg-orange-400';
    default:
      return 'bg-muted';
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
  const passiveIncome = territory.control >= 100 ? territory.passiveIncome : 0;

  return (
    <div className="game-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{territory.icon}</span>
          <div>
            <div className="font-semibold text-sm">{territory.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {territory.customerDensity} density
            </div>
          </div>
        </div>
        {passiveIncome > 0 && (
          <div className="text-[10px] text-emerald-300">+${passiveIncome}/h</div>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className={`font-semibold ${getTierColor(tier)}`}>{getTierLabel(tier)}</span>
          <span>{Math.round(territory.control)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className={`h-full transition-all ${getTierBarColor(tier)}`}
            style={{ width: `${Math.min(100, Math.max(0, territory.control))}%` }}
          />
        </div>
      </div>

      {activeBonuses.length > 0 && (
        <div className="space-y-1 text-[10px]">
          {activeBonuses.slice(0, 3).map((bonus) => (
            <div key={bonus.id} className="flex items-center gap-1 text-primary">
              <span>{bonus.icon}</span>
              <span>{bonus.description.replace(/\d+%/, `${Math.round(bonus.value)}%`)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{assignedCount} Dealers</span>
        {nextContestLabel && <span className="text-red-300">{nextContestLabel}</span>}
      </div>

      <button
        type="button"
        onClick={() => onManage(territory)}
        className="btn-neon w-full text-xs"
      >
        {assignedCount > 0 ? 'MANAGE' : 'ASSIGN DEALERS'}
      </button>
    </div>
  );
};
