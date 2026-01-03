import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Customer } from '@/store/customerStore';
import { Progress } from '@/components/ui/progress';

interface CustomerCardProps {
  customer: Customer;
  unreadCount: number;
  lastActivityLabel: string;
  onOpen: (customer: Customer) => void;
  onGiveSample: (customer: Customer) => void;
  onSell: (customer: Customer) => void;
  sampleCandidates: number;
}

const getStatusColor = (status: Customer['status']) => {
  switch (status) {
    case 'vip':
      return 'bg-amber-500/20 text-amber-200';
    case 'loyal':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'active':
      return 'bg-cyan-500/20 text-cyan-200';
    default:
      return 'bg-muted/40 text-muted-foreground';
  }
};

const getSatisfactionEmoji = (value: number) => {
  if (value >= 70) return '😊';
  if (value >= 40) return '😐';
  return '😞';
};

const formatTimeLeft = (timestamp: number) => {
  const diff = Math.max(0, timestamp - Date.now());
  const minutes = Math.ceil(diff / 60000);
  if (minutes <= 1) return '1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

export const CustomerCard = ({
  customer,
  unreadCount,
  lastActivityLabel,
  onOpen,
  onGiveSample,
  onSell,
  sampleCandidates,
}: CustomerCardProps) => {
  const hasSamples = sampleCandidates > 0;
  const addictionKoks = customer.addiction?.koks ?? 0;
  const addictionMeth = customer.addiction?.meth ?? 0;
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="game-card p-3 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{customer.avatar}</span>
          <div>
            <div className="font-semibold text-sm">{customer.name}</div>
            <div className={`text-[10px] px-2 py-0.5 rounded-full inline-flex ${getStatusColor(customer.status)}`}>
              {customer.status.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {customer.pendingRequest && (
            <div className="flex items-center gap-1 rounded-full border border-red-500/60 bg-red-500/20 px-2 py-1 text-[10px] text-red-300">
              <Clock size={12} className="text-red-400" />
              <span>{formatTimeLeft(customer.pendingRequest.expiresAt)}</span>
              <span className="uppercase">{customer.pendingRequest.drug}</span>
            </div>
          )}
          {unreadCount > 0 && (
            <div className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              💬 {unreadCount}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Loyalty {customer.loyalty}%</span>
          <span>{getSatisfactionEmoji(customer.satisfaction)} {customer.satisfaction}%</span>
        </div>
        <Progress value={customer.loyalty} className="h-1.5" />
      </div>

      {(addictionKoks > 30 || addictionMeth > 30) && (
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          {addictionKoks > 30 && <span>❄️ {Math.round(addictionKoks)}%</span>}
          {addictionMeth > 30 && <span>💎 {Math.round(addictionMeth)}%</span>}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Letzte Aktivitaet</span>
        <span>{lastActivityLabel}</span>
      </div>

      <div className="flex items-center gap-2 pt-1">
        {customer.status === 'prospect' ? (
          <button
            type="button"
            onClick={() => onGiveSample(customer)}
            disabled={!hasSamples}
            className="btn-neon px-3 py-1 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sample
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSell(customer)}
            className="btn-neon px-3 py-1 text-[10px]"
          >
            Sell
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpen(customer)}
          className="px-3 py-1 rounded-lg text-[10px] bg-muted/40 hover:bg-muted/60"
        >
          Nachricht
        </button>
      </div>
    </motion.div>
  );
};
