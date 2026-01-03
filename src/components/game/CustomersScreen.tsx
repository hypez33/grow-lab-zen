import { useEffect, useMemo, useState } from 'react';
import { Users, Bell, UserPlus, Package } from 'lucide-react';
import { toast } from 'sonner';
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

const formatRelativeTime = (timestamp?: number) => {
  if (!timestamp) return 'keine Aktivitaet';
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

  const activeCustomer = customers.find(c => c.id === activeCustomerId) || null;

  useEffect(() => {
    if (customers.length === 0) {
      for (let i = 0; i < 3; i += 1) {
        addProspect();
      }
    }
  }, [customers.length, addProspect]);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => {
      const order = statusOrder[a.status] - statusOrder[b.status];
      if (order !== 0) return order;
      return b.loyalty - a.loyalty;
    }),
    [customers]
  );

  const unreadMessages = useMemo(() => {
    return customers.flatMap(customer =>
      customer.messages
        .filter(msg => !msg.read)
        .map(msg => ({ customer, msg }))
    ).sort((a, b) => b.msg.timestamp - a.msg.timestamp);
  }, [customers]);

  const overview = useMemo(() => {
    const activeCount = customers.filter(c => c.status !== 'prospect').length;
    const vipCount = customers.filter(c => c.status === 'vip').length;
    return { activeCount, vipCount };
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
      toast.error('Keine Buds fuer Samples verfuegbar.');
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
      toast.error(result.message || 'Anfrage konnte nicht erfuellt werden.');
      return;
    }
    toast.success(`Anfrage erfuellt +${result.revenue?.toLocaleString() || 0}$`);
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
      if (result.reason === 'rejected-paranoid') {
        toast.error(`${customer.name} hat dich geblockt! (Paranoid)`);
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

  const driedBudsCount = driedBuds.length;

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={24} className="text-emerald-300" />
          <h1 className="text-2xl font-display font-bold">Kunden</h1>
        </div>
        <button
          type="button"
          onClick={() => addProspect()}
          className="btn-neon px-3 py-2 text-xs flex items-center gap-2"
        >
          <UserPlus size={14} />
          Neuer Kunde
        </button>
      </div>

      <div className="game-card p-3 mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Overview</span>
          <span>Sample-Buds: {sampleCandidates.length}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-muted/30 p-2">
            <div className="font-bold text-emerald-300">{overview.activeCount}</div>
            <div className="text-[10px] text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <div className="font-bold text-amber-300">{overview.vipCount}</div>
            <div className="text-[10px] text-muted-foreground">VIPs</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-2">
            <div className="font-bold text-emerald-300">{totalCustomerRevenue.toLocaleString()} $</div>
            <div className="text-[10px] text-muted-foreground">Revenue</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package size={12} />
            <span>Getrocknete Buds: {driedBudsCount}</span>
          </div>
          <span>Samples nutzen direkt Buds aus dem Lager.</span>
        </div>
      </div>

      <div className="game-card p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Bell size={14} />
            Recent Messages
          </div>
          {unreadMessages.length > 0 && (
            <span className="text-[10px] text-primary">{unreadMessages.length} neu</span>
          )}
        </div>
        {unreadMessages.length === 0 ? (
          <div className="text-xs text-muted-foreground">Keine neuen Nachrichten.</div>
        ) : (
          <div className="space-y-2">
            {unreadMessages.slice(0, 3).map(({ customer, msg }) => (
              <div key={msg.id} className="rounded-lg bg-muted/30 p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{customer.name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatRelativeTime(msg.timestamp)}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{msg.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sortedCustomers.map((customer) => {
          const unreadCount = customer.messages.filter(msg => !msg.read).length;
          const lastMessage = customer.messages[customer.messages.length - 1];
          const lastActivityLabel = formatRelativeTime(lastMessage?.timestamp);

          return (
            <CustomerCard
              key={customer.id}
              customer={customer}
              unreadCount={unreadCount}
              lastActivityLabel={lastActivityLabel}
              onOpen={handleOpenCustomer}
              onGiveSample={handleGiveSample}
              onSell={handleOpenCustomer}
              sampleCandidates={sampleCandidates.length}
            />
          );
        })}
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
