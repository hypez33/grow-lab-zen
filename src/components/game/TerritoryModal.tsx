import { Territory, TerritoryBonus } from '@/store/territoryStore';
import { X } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl game-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{territory.icon}</span>
              <h2 className="text-lg font-semibold">{territory.name}</h2>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Control: {Math.round(territory.control)}% | Tier {tierPercent}%
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full bg-muted/40">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-muted-foreground">Customer Density</div>
            <div className="font-semibold">{territory.customerDensity}</div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-muted-foreground">Difficulty</div>
            <div className="font-semibold">{territory.difficulty}</div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-muted-foreground">Heat Modifier</div>
            <div className="font-semibold">
              {territory.heatModifier > 0 ? '+' : ''}{territory.heatModifier}%
            </div>
          </div>
          <div className="rounded-lg bg-muted/20 p-2">
            <div className="text-muted-foreground">Next Contest</div>
            <div className="font-semibold">
              {territory.nextContestAt > 0 ? formatTimeLeft(territory.nextContestAt) : 'n/a'}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold">Bonuses at 100% Control</div>
          {territory.bonuses.map((bonus) => (
            <div key={bonus.id} className="text-[11px] text-muted-foreground">
              {bonus.icon} {bonus.description}
            </div>
          ))}
          {scaledBonuses.length > 0 && (
            <div className="text-[11px] text-primary">
              Active: {scaledBonuses.map(bonus => `${bonus.icon} ${Math.round(bonus.value)}%`).join(' | ')}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Assigned Dealers ({assignedDealers.length})</span>
            <span className="text-[11px] text-muted-foreground">Upkeep: -${upkeepPerHour}/h</span>
          </div>
          {assignedDealers.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">Keine Dealer zugewiesen.</div>
          ) : (
            <div className="space-y-2">
              {assignedDealers.map(dealer => (
                <div key={dealer.id} className="flex items-center justify-between rounded-lg bg-muted/20 p-2">
                  <div className="flex items-center gap-2">
                    <span>{dealer.icon}</span>
                    <div>
                      <div className="text-xs font-semibold">{dealer.name}</div>
                      <div className="text-[10px] text-muted-foreground">Lv.{dealer.level}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUnassign(territory.id, dealer.id)}
                    className="rounded-lg bg-muted/40 px-2 py-1 text-[10px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Available Dealers ({unassignedDealers.length})</div>
          {unassignedDealers.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">Keine freien Dealer.</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {unassignedDealers.map(dealer => (
                <div key={dealer.id} className="flex items-center justify-between rounded-lg bg-muted/10 p-2">
                  <div className="flex items-center gap-2">
                    <span>{dealer.icon}</span>
                    <div>
                      <div className="text-xs font-semibold">{dealer.name}</div>
                      <div className="text-[10px] text-muted-foreground">Lv.{dealer.level}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAssign(territory.id, dealer.id)}
                    className="btn-neon px-2 py-1 text-[10px]"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {territory.control > 50 && (
          <button
            type="button"
            onClick={() => onFortify(territory.id)}
            className="btn-neon w-full text-xs"
          >
            🛡️ Fortify Defense ($5,000)
          </button>
        )}
      </div>
    </div>
  );
};
