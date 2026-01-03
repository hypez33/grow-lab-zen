import { useEffect, useMemo, useState } from 'react';
import { Users, Bell, UserPlus, Package, Search, Filter, TrendingUp, Crown, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerStore, Customer } from '@/store/customerStore';
import { useCocaStore } from '@/store/cocaStore';
import { useMethStore } from '@/store/methStore';
import { useGameStore } from '@/store/gameStore';
import { CustomerCard } from './CustomerCard';
import { CustomerModal } from './CustomerModal';

const statusOrder: Record<Customer['status'], number> = {
  vip: 0,
  loyal: 1,
  active: 2,
  prospect: 3,
};

type FilterType = 'all' | 'vip' | 'loyal' | 'active' | 'prospect';

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return 'keine Aktivität';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const CustomersScreen = () => {
  const {
    customers,
    totalCustomerRevenue,
    addProspect,
    giveSample,
    sellToCustomer,
    fulfillRequest,
    offerDrug,
    sellHardDrug,
    markCustomerRead,
  } = useCustomerStore();
  const inventory = useGameStore(state => state.inventory);
  const cocaProducts = useCocaStore(state => state.cocaProducts);
  const methInventory = useMethStore(state => state.methInventory);

  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showMessages, setShowMessages] = useState(false);

  const activeCustomer = customers.find(c => c.id === activeCustomerId) || null;

  useEffect(() => {
    if (customers.length === 0) {
      for (let i = 0; i < 3; i += 1) {
        addProspect();
      }
    }
  }, [customers.length, addProspect]);

  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(query));
    }
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => c.status === activeFilter);
    }
    
    // Sort by status priority, then loyalty
    return filtered.sort((a, b) => {
      const order = statusOrder[a.status] - statusOrder[b.status];
      if (order !== 0) return order;
      return b.loyalty - a.loyalty;
    });
  }, [customers, searchQuery, activeFilter]);

  const unreadMessages = useMemo(() => {
    return customers.flatMap(customer =>
      customer.messages
        .filter(msg => !msg.read)
        .map(msg => ({ customer, msg }))
    ).sort((a, b) => b.msg.timestamp - a.msg.timestamp);
  }, [customers]);

  const stats = useMemo(() => {
    const total = customers.length;
    const activeCount = customers.filter(c => c.status !== 'prospect').length;
    const vipCount = customers.filter(c => c.status === 'vip').length;
    const loyalCount = customers.filter(c => c.status === 'loyal').length;
    const prospectCount = customers.filter(c => c.status === 'prospect').length;
    const pendingRequests = customers.filter(c => c.pendingRequest).length;
    return { total, activeCount, vipCount, loyalCount, prospectCount, pendingRequests };
  }, [customers]);

  const sampleCandidates = useMemo(
    () => inventory.filter(bud => bud.grams >= 0.5),
    [inventory]
  );

  const driedBuds = useMemo(
    () => inventory.filter(bud => bud.state === 'dried'),
    [inventory]
  );

  const bestSampleBudId = useMemo(() => {
    let best: string | null = null;
    let bestQuality = -1;
    for (const bud of sampleCandidates) {
      if (bud.quality > bestQuality) {
        bestQuality = bud.quality;
        best = bud.id;
      }
    }
    return best;
  }, [sampleCandidates]);

  const handleOpenCustomer = (customer: Customer) => {
    markCustomerRead(customer.id);
    setActiveCustomerId(customer.id);
  };

  const handleGiveSample = (customer: Customer, budId?: string) => {
    const selectedBudId = budId ?? bestSampleBudId;
    if (!selectedBudId) {
      toast.error('Keine Buds für Samples verfügbar.');
      return;
    }
    const result = giveSample(customer.id, selectedBudId);
    if (!result.success) {
      toast.error(result.message || 'Sample konnte nicht gegeben werden.');
      return;
    }
    toast.success(result.message || 'Sample verteilt.');
  };

  const handleSell = (customer: Customer, budId: string, grams: number, customPrice?: number) => {
    const result = sellToCustomer(customer.id, budId, grams, customPrice);
    if (!result.success) {
      toast.error(result.message || 'Verkauf fehlgeschlagen.');
      return;
    }
    toast.success(`Deal abgeschlossen +${result.revenue?.toLocaleString() || 0}$`);
  };

  const handleFulfillRequest = (customer: Customer, budId?: string) => {
    const result = fulfillRequest(customer.id, { budId });
    if (!result.success) {
      toast.error(result.message || 'Anfrage konnte nicht erfüllt werden.');
      return;
    }
    toast.success(`Anfrage erfüllt +${result.revenue?.toLocaleString() || 0}$`);
  };

  const handleSellHardDrug = (
    customer: Customer,
    drug: 'koks' | 'meth',
    grams: number,
    productId?: string,
    customPrice?: number
  ) => {
    const result = sellHardDrug(customer.id, drug, grams, productId, customPrice);
    if (!result.success) {
      toast.error(result.message || 'Verkauf fehlgeschlagen.');
      return;
    }
    toast.success(`${drug.toUpperCase()} verkauft +${result.revenue?.toLocaleString() || 0}$`);
  };

  const handleOfferDrug = (customer: Customer, drug: 'koks' | 'meth', grams: number) => {
    const result = offerDrug(customer.id, drug, grams);
    if (!result.success) {
      if (result.reason === 'blocked') {
        toast.error(result.message || `${customer.name} hat dich blockiert!`);
      } else if (result.reason === 'rejected-soft') {
        toast.warning(`${customer.name} lehnt ab. Loyalty -5`);
      } else if (result.reason === 'rejected') {
        toast.warning(`${customer.name} will nur Weed. Loyalty -10`);
      } else {
        toast.error('Angebot fehlgeschlagen.');
      }
      return;
    }
    toast.success(`${customer.name} hat ${drug} akzeptiert! +${result.revenue?.toLocaleString() || 0}$`);
  };

  const filterButtons: { key: FilterType; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'all', label: 'Alle', icon: Users, count: stats.total },
    { key: 'vip', label: 'VIP', icon: Crown, count: stats.vipCount },
    { key: 'loyal', label: 'Loyal', icon: Star, count: stats.loyalCount },
    { key: 'active', label: 'Aktiv', icon: User, count: stats.activeCount - stats.vipCount - stats.loyalCount },
    { key: 'prospect', label: 'Neu', icon: UserPlus, count: stats.prospectCount },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-background to-background/95">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/20">
              <Users size={20} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Kunden</h1>
              <p className="text-xs text-muted-foreground">{stats.total} Kontakte</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => addProspect()}
            className="btn-neon px-3 py-2 text-xs flex items-center gap-2"
          >
            <UserPlus size={14} />
            Neu
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-400">${(totalCustomerRevenue / 1000).toFixed(1)}k</div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp size={10} />
              Revenue
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-2.5 text-center">
            <div className="text-lg font-bold text-amber-400">{stats.vipCount}</div>
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Crown size={10} />
              VIPs
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-2.5 text-center">
            <div className="text-lg font-bold text-blue-400">{stats.activeCount}</div>
            <div className="text-[10px] text-muted-foreground">Aktiv</div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/20 p-2.5 text-center">
            <div className="text-lg font-bold text-red-400">{stats.pendingRequests}</div>
            <div className="text-[10px] text-muted-foreground">Anfragen</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kunden suchen..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card/60 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {filterButtons.map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Icon size={12} />
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeFilter === key ? 'bg-primary-foreground/20' : 'bg-background/50'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Toggle */}
        {unreadMessages.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMessages(!showMessages)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-all"
          >
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-primary" />
              <span className="text-sm font-medium">{unreadMessages.length} neue Nachrichten</span>
            </div>
            <motion.div
              animate={{ rotate: showMessages ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Filter size={14} className="text-primary" />
            </motion.div>
          </button>
        )}

        {/* Messages Panel */}
        <AnimatePresence>
          {showMessages && unreadMessages.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {unreadMessages.slice(0, 5).map(({ customer, msg }) => (
                  <motion.div
                    key={msg.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="rounded-xl bg-card/80 border border-border/50 p-3 cursor-pointer hover:bg-card transition-colors"
                    onClick={() => handleOpenCustomer(customer)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{customer.avatar}</span>
                      <span className="font-medium text-sm">{customer.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatRelativeTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inventory Info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <Package size={10} />
            <span>{driedBuds.length} Buds | {sampleCandidates.length} Samples</span>
          </div>
          <span>{filteredCustomers.length} Kunden angezeigt</span>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredCustomers.map((customer, index) => {
              const unreadCount = customer.messages.filter(msg => !msg.read).length;
              const lastMessage = customer.messages[customer.messages.length - 1];
              const lastActivityLabel = formatRelativeTime(lastMessage?.timestamp);

              return (
                <motion.div
                  key={customer.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <CustomerCard
                    customer={customer}
                    unreadCount={unreadCount}
                    lastActivityLabel={lastActivityLabel}
                    onOpen={handleOpenCustomer}
                    onGiveSample={handleGiveSample}
                    onSell={handleOpenCustomer}
                    sampleCandidates={sampleCandidates.length}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <Users size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Keine Kunden gefunden</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery ? 'Versuche einen anderen Suchbegriff' : 'Füge neue Kunden hinzu'}
            </p>
          </div>
        )}
      </div>

      <CustomerModal
        customer={activeCustomer}
        inventory={inventory}
        cocaProducts={cocaProducts}
        methInventory={methInventory}
        onClose={() => setActiveCustomerId(null)}
        onGiveSample={handleGiveSample}
        onSell={handleSell}
        onSellHardDrug={handleSellHardDrug}
        onOfferDrug={handleOfferDrug}
        onFulfillRequest={handleFulfillRequest}
      />
    </div>
  );
};
