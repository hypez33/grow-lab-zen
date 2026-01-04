import { motion } from 'framer-motion';
import { Clock, MessageSquare, Zap, TrendingUp } from 'lucide-react';
import { Customer } from '@/store/customerStore';

interface CustomerCardProps {
  customer: Customer;
  unreadCount: number;
  lastActivityLabel: string;
  onOpen: (customer: Customer) => void;
  onGiveSample: (customer: Customer) => void;
  onSell: (customer: Customer) => void;
  sampleCandidates: number;
}

const getStatusConfig = (status: Customer['status']) => {
  switch (status) {
    case 'vip':
      return {
        bg: 'bg-gradient-to-r from-amber-500/20 to-amber-600/10',
        border: 'border-amber-500/30',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        glow: 'shadow-amber-500/10',
        icon: '👑',
      };
    case 'loyal':
      return {
        bg: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/10',
        border: 'border-emerald-500/30',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        glow: 'shadow-emerald-500/10',
        icon: '⭐',
      };
    case 'active':
      return {
        bg: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10',
        border: 'border-blue-500/30',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        glow: 'shadow-blue-500/10',
        icon: '✓',
      };
    default:
      return {
        bg: 'bg-gradient-to-r from-muted/30 to-muted/20',
        border: 'border-border/50',
        badge: 'bg-muted/40 text-muted-foreground border-border/50',
        glow: '',
        icon: '🆕',
      };
  }
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
  const hasHighAddiction = addictionKoks > 50 || addictionMeth > 50;
  const statusConfig = getStatusConfig(customer.status);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(customer)}
      className={`relative rounded-xl border ${statusConfig.border} ${statusConfig.bg} p-3 cursor-pointer transition-all hover:shadow-lg ${statusConfig.glow} overflow-hidden`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-current transform translate-x-16 -translate-y-16" />
      </div>

      {/* Content */}
      <div className="relative space-y-2.5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-card/80 flex items-center justify-center text-xl border border-border/30">
                {customer.avatar}
              </div>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{customer.name}</span>
                {/* Drug preference icons */}
                {customer.drugPreferences?.koks && (
                  <span className="text-[10px]" title="Akzeptiert Koks">❄️</span>
                )}
                {customer.drugPreferences?.meth && (
                  <span className="text-[10px]" title="Akzeptiert Meth">💎</span>
                )}
              </div>
              <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${statusConfig.badge}`}>
                <span>{statusConfig.icon}</span>
                <span>{customer.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Right Side Badges */}
          <div className="flex flex-col items-end gap-1">
            {customer.pendingRequest && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-1 text-[10px] text-red-300"
              >
                <Clock size={10} className="text-red-400" />
                <span>{formatTimeLeft(customer.pendingRequest.expiresAt)}</span>
              </motion.div>
            )}
            {hasHighAddiction && (
              <div className="flex items-center gap-1 text-[10px] text-orange-300">
                <Zap size={10} />
                <span>Süchtig</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          {/* Loyalty Bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Loyalität</span>
              <span className="font-medium text-foreground">{customer.loyalty}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${customer.loyalty}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  customer.loyalty >= 80 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  customer.loyalty >= 40 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                  'bg-gradient-to-r from-blue-400 to-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Spending Power */}
          <div className="text-center px-2">
            <div className="text-xs font-semibold text-emerald-400">${customer.spendingPower}</div>
            <div className="text-[9px] text-muted-foreground">Power</div>
          </div>
        </div>

        {/* Addiction Badges */}
        {(addictionKoks > 20 || addictionMeth > 20) && (
          <div className="flex gap-2">
            {addictionKoks > 20 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px]">
                <span>❄️</span>
                <span className="text-blue-300">{Math.round(addictionKoks)}%</span>
              </div>
            )}
            {addictionMeth > 20 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[10px]">
                <span>💎</span>
                <span className="text-purple-300">{Math.round(addictionMeth)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MessageSquare size={10} />
            <span>{lastActivityLabel}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {customer.status === 'prospect' ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGiveSample(customer);
                }}
                disabled={!hasSamples}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                🎁 Sample
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSell(customer);
                }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
              >
                <TrendingUp size={10} />
                Deal
              </button>
            )}
          </div>
        </div>

        {/* Total Spent Badge */}
        {customer.totalSpent > 0 && (
          <div className="absolute top-2 right-2 text-[9px] text-muted-foreground">
            ${customer.totalSpent.toLocaleString()}
          </div>
        )}
      </div>
    </motion.div>
  );
};
