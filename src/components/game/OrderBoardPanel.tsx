import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Clock, AlertTriangle, Sparkles, DollarSign, Star, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerStore, matchWeedRequest, type Customer, type PurchaseRequest } from '@/store/customerStore';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore } from '@/store/cocaStore';
import { useMethStore } from '@/store/methStore';

interface OrderBoardPanelProps {
  variant?: 'full' | 'compact';
  onOpenCustomer?: (customer: Customer) => void;
  /** Limit number of orders shown in compact mode */
  maxItems?: number;
  title?: string;
}

const URGENCY_STYLES: Record<PurchaseRequest['urgency'], { ring: string; chip: string; pulse: boolean; label: string }> = {
  low: { ring: 'border-border/40', chip: 'bg-muted/40 text-muted-foreground', pulse: false, label: 'Low' },
  medium: { ring: 'border-cyan-500/40', chip: 'bg-cyan-500/15 text-cyan-300', pulse: false, label: 'Medium' },
  high: { ring: 'border-amber-500/50', chip: 'bg-amber-500/15 text-amber-300', pulse: false, label: 'High' },
  desperate: { ring: 'border-red-500/60', chip: 'bg-red-500/20 text-red-300', pulse: true, label: 'Desperate' },
};

const SOURCE_BADGE: Record<NonNullable<PurchaseRequest['source']>, { icon: React.ElementType; label: string; tint: string }> = {
  customer: { icon: Star, label: 'Kunde', tint: 'text-blue-300' },
  vip: { icon: Crown, label: 'VIP', tint: 'text-amber-300' },
  
  street: { icon: Sparkles, label: 'Straße', tint: 'text-purple-300' },
  bulk: { icon: ClipboardList, label: 'Bulk', tint: 'text-cyan-300' },
  business: { icon: ClipboardList, label: 'Business', tint: 'text-indigo-300' },
};

const formatTimeLeft = (timestamp: number) => {
  const diff = Math.max(0, timestamp - Date.now());
  const minutes = Math.ceil(diff / 60000);
  if (minutes <= 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const drugLabel = (drug: PurchaseRequest['drug']) =>
  drug === 'weed' ? 'Weed' : drug === 'koks' ? 'Koks' : 'Meth';

interface MissingInfo {
  ok: boolean;
  reason?: string;
}

export const OrderBoardPanel = ({ variant = 'full', onOpenCustomer, maxItems, title = 'Order Board' }: OrderBoardPanelProps) => {
  const customers = useCustomerStore(s => s.customers);
  const fulfillRequest = useCustomerStore(s => s.fulfillRequest);
  const inventory = useGameStore(s => s.inventory);
  const cocaProducts = useCocaStore(s => s.cocaProducts);
  const methInventory = useMethStore(s => s.methInventory);

  // Tick to keep deadlines fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const orders = useMemo(() => {
    const list = customers
      .filter(c => c.pendingRequest)
      .map(c => ({ customer: c, request: c.pendingRequest as PurchaseRequest }));
    // Sort: desperate > high > medium > low, then by deadline
    const urgencyRank: Record<PurchaseRequest['urgency'], number> = {
      desperate: 0, high: 1, medium: 2, low: 3,
    };
    list.sort((a, b) => {
      const u = urgencyRank[a.request.urgency] - urgencyRank[b.request.urgency];
      if (u !== 0) return u;
      return a.request.expiresAt - b.request.expiresAt;
    });
    return maxItems ? list.slice(0, maxItems) : list;
  }, [customers, maxItems]);

  const checkAvailability = (req: PurchaseRequest): MissingInfo => {
    if (req.drug === 'weed') {
      const m = matchWeedRequest(req, inventory);
      if (m.best) return { ok: true };
      return { ok: false, reason: m.issues[0]?.message ?? 'Kein passender Vorrat' };
    }
    if (req.drug === 'koks') {
      const ok = cocaProducts.some(p => p.stage === 'powder' && p.grams >= req.gramsRequested);
      return ok ? { ok: true } : { ok: false, reason: 'Kein Koks-Pulver verfügbar' };
    }
    if (req.drug === 'meth') {
      const ok = methInventory.some(p => p.grams >= req.gramsRequested);
      return ok ? { ok: true } : { ok: false, reason: 'Kein Meth verfügbar' };
    }
    return { ok: false, reason: 'Unbekannt' };
  };

  const handleFulfill = (customer: Customer) => {
    const result = fulfillRequest(customer.id);
    if (!result.success) {
      toast.error(result.message ?? 'Bestellung konnte nicht erfüllt werden');
      return;
    }
    toast.success(`Bestellung erfüllt +$${result.revenue?.toLocaleString() ?? 0}`);
  };

  if (orders.length === 0) {
    return (
      <div className={`rounded-xl border border-border/40 bg-card/50 p-3 ${variant === 'compact' ? 'text-xs' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground">Keine offenen Bestellungen. Deine Kunden melden sich bald.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-emerald-400" />
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
            {orders.length}
          </span>
        </div>
      </div>

      <div className={`space-y-2 ${variant === 'compact' ? 'max-h-[260px] overflow-y-auto pr-1 scrollbar-hide' : ''}`}>
        <AnimatePresence initial={false}>
          {orders.map(({ customer, request }) => {
            const urg = URGENCY_STYLES[request.urgency];
            const avail = checkAvailability(request);
            const sourceKey = (request.source ?? 'customer') as keyof typeof SOURCE_BADGE;
            const SourceMeta = SOURCE_BADGE[sourceKey] ?? SOURCE_BADGE.customer;
            const SourceIcon = SourceMeta.icon;

            return (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`rounded-lg border ${urg.ring} bg-card/70 p-2.5 ${urg.pulse ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenCustomer?.(customer)}
                    className="flex items-center gap-2 min-w-0 text-left"
                  >
                    <span className="text-lg leading-none">{customer.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{customer.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <SourceIcon size={9} className={SourceMeta.tint} />
                        <span>{SourceMeta.label}</span>
                      </div>
                    </div>
                  </button>
                  <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${urg.chip}`}>
                    {request.urgency === 'desperate' && <AlertTriangle size={9} />}
                    <Clock size={9} />
                    {formatTimeLeft(request.expiresAt)}
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="rounded-md bg-muted/30 px-2 py-1">
                    <div className="text-muted-foreground">Produkt</div>
                    <div className="font-semibold text-foreground">
                      {request.gramsRequested}g {drugLabel(request.drug)}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted/30 px-2 py-1">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <DollarSign size={9} />
                      Reward
                    </div>
                    <div className="font-semibold text-emerald-300">
                      ${request.maxPrice.toLocaleString()}
                      {request.xpReward ? <span className="text-purple-300 ml-1">+{request.xpReward}xp</span> : null}
                    </div>
                  </div>
                </div>

                {(request.minQuality || request.preferredStrain || request.minRarity || request.preferredTraits?.length) ? (
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[9px]">
                    {request.minQuality ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        Q ≥ {request.minQuality}%
                      </span>
                    ) : null}
                    {request.preferredStrain ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Strain: {request.preferredStrain}
                      </span>
                    ) : null}
                    {request.minRarity ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        ≥ {request.minRarity}
                      </span>
                    ) : null}
                    {request.preferredTraits?.map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Trait: {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {!avail.ok && (
                  <div className="mt-1.5 text-[10px] text-red-300 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {avail.reason}
                  </div>
                )}

                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    disabled={!avail.ok}
                    onClick={() => handleFulfill(customer)}
                    className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                      avail.ok
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-muted/30 text-muted-foreground border border-border/30 cursor-not-allowed'
                    }`}
                  >
                    {avail.ok ? '✅ Erfüllen' : 'Vorrat fehlt'}
                  </button>
                  {onOpenCustomer && (
                    <button
                      type="button"
                      onClick={() => onOpenCustomer(customer)}
                      className="px-2 py-1.5 rounded-md text-[11px] bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      Chat
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
