import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, MessageSquare, Package, DollarSign, Gift, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Customer, DrugType, MessageAction, useCustomerStore } from '@/store/customerStore';
import type { BudItem } from '@/store/gameStore';
import type { CocaProduct } from '@/store/cocaStore';
import type { MethProduct } from '@/store/methStore';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CustomerModalProps {
  customer: Customer | null;
  inventory: BudItem[];
  cocaProducts: CocaProduct[];
  methInventory: MethProduct[];
  onClose: () => void;
  onGiveSample: (customer: Customer, budId: string) => void;
  onSell: (customer: Customer, budId: string, grams: number, customPrice?: number) => void;
  onSellHardDrug: (
    customer: Customer,
    drug: 'koks' | 'meth',
    grams: number,
    productId?: string,
    customPrice?: number
  ) => void;
  onOfferDrug: (customer: Customer, drug: 'koks' | 'meth', grams: number) => void;
  onFulfillRequest: (customer: Customer, budId?: string) => void;
}

const SAMPLE_GRAMS = 0.5;
const QUICK_AMOUNTS = [1, 5, 10, 25];
const DEFAULT_PRICE_PER_GRAM: Record<DrugType, number> = {
  weed: 15,
  koks: 150,
  meth: 80,
};

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const formatTimeLeft = (timestamp: number) => {
  const diff = Math.max(0, timestamp - Date.now());
  const minutes = Math.ceil(diff / 60000);
  if (minutes <= 1) return 'unter 1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

const formatBudLabel = (bud: BudItem) => {
  const stateLabel = bud.state === 'dried' ? '' : ` (${bud.state})`;
  return `${bud.strainName} - ${bud.grams.toFixed(1)}g - ${bud.quality}% Q${stateLabel}`;
};

const formatKoksLabel = (product: CocaProduct) =>
  `${product.strainName} - ${product.grams.toFixed(1)}g - ${product.purity}% P / ${product.quality}% Q`;

const formatMethLabel = (product: MethProduct) =>
  `${product.recipeName} - ${product.grams.toFixed(1)}g - ${product.purity}% P / ${product.quality}% Q`;

const getSuggestedQuantities = (customer: Customer, drug: DrugType): number[] => {
  const addiction = drug === 'koks' ? customer.addiction.koks : drug === 'meth' ? customer.addiction.meth : 0;

  if (addiction > 80) return [10, 25, 50, 100];
  if (addiction > 40) return [5, 10, 20, 50];
  if (addiction > 10) return [2, 5, 10, 25];

  if (customer.status === 'vip') return [5, 10, 20, 50];
  if (customer.status === 'loyal') return [2, 5, 10, 20];

  return [1, 2, 5, 10];
};

const calculateWeedRevenue = (customer: Customer, grams: number, quality: number) => {
  const loyaltyBonus = 1 + (customer.loyalty / 100) * 0.3;
  const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
  const qualityMultiplier = 0.5 + (quality / 100) * 1.5;
  return Math.floor(grams * 15 * loyaltyBonus * spendingMultiplier * qualityMultiplier);
};

const calculateHardRevenue = (customer: Customer, grams: number, qualityScore: number, basePrice: number, cap?: number) => {
  const qualityMultiplier = 0.6 + (qualityScore / 100) * 1.2;
  const loyaltyMultiplier = 1 + (customer.loyalty / 100) * 0.3;
  const spendingMultiplier = 0.8 + (customer.spendingPower / 100) * 0.6;
  const pricePerGram = cap ? Math.min(cap, basePrice * qualityMultiplier) : basePrice * qualityMultiplier;
  return Math.floor(grams * pricePerGram * loyaltyMultiplier * spendingMultiplier);
};

// Section Header Component
const SectionHeader = ({ 
  icon: Icon, 
  title, 
  badge,
  isOpen,
  variant = 'default'
}: { 
  icon: React.ElementType; 
  title: string; 
  badge?: string;
  isOpen: boolean;
  variant?: 'default' | 'warning' | 'success';
}) => {
  const variantStyles = {
    default: 'bg-card/60 border-border/50 hover:bg-card/80',
    warning: 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
  };

  const iconColors = {
    default: 'text-primary',
    warning: 'text-yellow-400',
    success: 'text-emerald-400',
  };

  return (
    <div className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg border transition-all ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={iconColors[variant]} />
        <span className="text-xs font-medium">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary">
            {badge}
          </span>
        )}
      </div>
      <ChevronDown 
        size={14} 
        className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
      />
    </div>
  );
};

export const CustomerModal = ({
  customer,
  inventory,
  cocaProducts,
  methInventory,
  onClose,
  onGiveSample,
  onSell,
  onSellHardDrug,
  onOfferDrug,
  onFulfillRequest,
}: CustomerModalProps) => {
  const sampleOptions = useMemo(
    () => inventory.filter(bud => bud.grams >= SAMPLE_GRAMS),
    [inventory]
  );
  const weedOptions = useMemo(
    () => inventory.filter(bud => bud.state === 'dried' && bud.grams > 0),
    [inventory]
  );
  const koksOptions = useMemo(
    () => cocaProducts.filter(product => product.stage === 'powder' && product.grams > 0),
    [cocaProducts]
  );
  const methOptions = useMemo(
    () => methInventory.filter(product => product.grams > 0),
    [methInventory]
  );

  const [sampleBudId, setSampleBudId] = useState('');
  const [activeTab, setActiveTab] = useState<DrugType>('weed');
  const [selectedDrug, setSelectedDrug] = useState<{ type: DrugType; id: string; grams: number }>({
    type: 'weed',
    id: '',
    grams: 1,
  });
  const [pricePerGram, setPricePerGram] = useState<Record<DrugType, number>>({ ...DEFAULT_PRICE_PER_GRAM });
  const [priceTouched, setPriceTouched] = useState<Record<DrugType, boolean>>({
    weed: false,
    koks: false,
    meth: false,
  });
  const [pendingOffer, setPendingOffer] = useState<{ drug: 'koks' | 'meth'; grams: number } | null>(null);
  const [showOfferPanel, setShowOfferPanel] = useState(false);
  const [offerDrug, setOfferDrug] = useState<'koks' | 'meth'>('koks');
  const [offerGrams, setOfferGrams] = useState(5);

  // Collapsible states
  const [messagesOpen, setMessagesOpen] = useState(true);
  const [sellOpen, setSellOpen] = useState(true);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setSampleBudId(sampleOptions[0]?.id ?? '');
    setActiveTab('weed');
    setSelectedDrug({ type: 'weed', id: weedOptions[0]?.id ?? '', grams: 1 });
    setPricePerGram({ ...DEFAULT_PRICE_PER_GRAM });
    setPriceTouched({ weed: false, koks: false, meth: false });
    setPendingOffer(null);
    setShowOfferPanel(false);
    setMessagesOpen(customer.messages.length > 0);
    setSellOpen(true);
    setOfferOpen(false);
  }, [customer?.id]);

  useEffect(() => {
    if (!customer) return;
    if (!sampleOptions.some(bud => bud.id === sampleBudId)) {
      setSampleBudId(sampleOptions[0]?.id ?? '');
    }
  }, [customer?.id, sampleOptions, sampleBudId]);

  useEffect(() => {
    if (!customer) return;
    const optionsByTab: Record<DrugType, Array<{ id: string }>> = {
      weed: weedOptions,
      koks: koksOptions,
      meth: methOptions,
    };
    const options = optionsByTab[activeTab];
    const nextId = options[0]?.id ?? '';
    setSelectedDrug(prev => ({
      type: activeTab,
      id: prev.type === activeTab && options.some(item => item.id === prev.id) ? prev.id : nextId,
      grams: prev.type === activeTab ? prev.grams : 1,
    }));
  }, [activeTab, weedOptions, koksOptions, methOptions, customer?.id]);

  const selectedSampleBud = sampleOptions.find(bud => bud.id === sampleBudId) || null;
  const pendingRequest = customer?.pendingRequest ?? null;
  const requestNeedsWeed = pendingRequest?.drug === 'weed';
  const requestGramsNeeded = pendingRequest?.gramsRequested ?? 0;
  
  // Check if we have enough stock for the request - check ANY dried bud, not just the selected one
  const hasRequestStock = useMemo(() => {
    if (!pendingRequest) return true;
    
    if (pendingRequest.drug === 'weed') {
      // Check if any dried bud has enough grams
      return weedOptions.some(bud => bud.grams >= requestGramsNeeded);
    }
    if (pendingRequest.drug === 'koks') {
      // Check if any koks product has enough grams
      return koksOptions.some(product => product.grams >= requestGramsNeeded);
    }
    if (pendingRequest.drug === 'meth') {
      // Check if any meth product has enough grams
      return methOptions.some(product => product.grams >= requestGramsNeeded);
    }
    return true;
  }, [pendingRequest, weedOptions, koksOptions, methOptions, requestGramsNeeded]);

  const currentWeed = weedOptions.find(bud => bud.id === selectedDrug.id) || null;
  const currentKoks = koksOptions.find(product => product.id === selectedDrug.id) || null;
  const currentMeth = methOptions.find(product => product.id === selectedDrug.id) || null;
  const maxGrams =
    activeTab === 'weed'
      ? currentWeed?.grams ?? 0
      : activeTab === 'koks'
        ? currentKoks?.grams ?? 0
        : currentMeth?.grams ?? 0;

  const clampedGrams = maxGrams > 0 ? Math.min(selectedDrug.grams, maxGrams) : selectedDrug.grams;
  const suggestions = customer ? getSuggestedQuantities(customer, activeTab) : QUICK_AMOUNTS;

  const recommendedPricePerGram = useMemo(() => {
    if (!customer) return DEFAULT_PRICE_PER_GRAM[activeTab];
    if (activeTab === 'weed') {
      if (!currentWeed) return DEFAULT_PRICE_PER_GRAM.weed;
      return Math.max(1, calculateWeedRevenue(customer, 1, currentWeed.quality));
    }
    if (activeTab === 'koks') {
      if (!currentKoks) return DEFAULT_PRICE_PER_GRAM.koks;
      const qualityScore = (currentKoks.quality + currentKoks.purity) / 2;
      return Math.max(1, calculateHardRevenue(customer, 1, qualityScore, 150));
    }
    if (!currentMeth) return DEFAULT_PRICE_PER_GRAM.meth;
    const qualityScore = (currentMeth.quality + currentMeth.purity) / 2;
    return Math.max(1, calculateHardRevenue(customer, 1, qualityScore, 80, 100));
  }, [activeTab, customer, currentKoks, currentMeth, currentWeed]);

  useEffect(() => {
    if (!customer) return;
    if (!priceTouched[activeTab]) {
      setPricePerGram(prev => ({ ...prev, [activeTab]: recommendedPricePerGram }));
    }
  }, [activeTab, customer, priceTouched, recommendedPricePerGram]);

  useEffect(() => {
    if (!maxGrams) return;
    if (selectedDrug.grams > maxGrams) {
      setSelectedDrug(prev => ({ ...prev, grams: Math.floor(maxGrams) }));
    }
  }, [maxGrams, selectedDrug.grams]);

  const currentPricePerGram = Number.isFinite(pricePerGram[activeTab]) ? pricePerGram[activeTab] : 0;
  const revenuePreview = useMemo(() => {
    if (clampedGrams <= 0 || currentPricePerGram <= 0) return 0;
    return Math.floor(clampedGrams * currentPricePerGram);
  }, [clampedGrams, currentPricePerGram]);

  const handleSampleClick = () => {
    if (!customer || !selectedSampleBud) return;
    onGiveSample(customer, selectedSampleBud.id);
  };

  const handleFulfillRequest = () => {
    if (!customer || !pendingRequest) return;
    // Let the store automatically choose the best product
    onFulfillRequest(customer, undefined);
  };

  const handleUnifiedSell = () => {
    if (!customer) return;
    if (customer.status === 'prospect') {
      toast.error('Prospects brauchen erst ein Sample.');
      return;
    }

    if (currentPricePerGram <= 0) {
      toast.error('Preis pro g fehlt.');
      return;
    }

    if (activeTab === 'weed') {
      if (!currentWeed) {
        toast.error('Keine Buds verfuegbar.');
        return;
      }
      onSell(customer, currentWeed.id, clampedGrams, currentPricePerGram);
      return;
    }

    if (activeTab === 'koks' || activeTab === 'meth') {
      const selectedProductId = activeTab === 'koks' ? currentKoks?.id : currentMeth?.id;
      if (!selectedProductId) {
        toast.error('Keine Ware ausgewaehlt.');
        return;
      }
      if (!customer.drugPreferences[activeTab]) {
        setPendingOffer({ drug: activeTab, grams: clampedGrams });
        return;
      }
      onSellHardDrug(customer, activeTab, clampedGrams, selectedProductId, currentPricePerGram);
    }
  };

  const handleOfferConfirm = () => {
    if (!customer || !pendingOffer) return;
    onOfferDrug(customer, pendingOffer.drug, pendingOffer.grams);
    setPendingOffer(null);
  };

  const handleMessageAction = (messageId: string, action: MessageAction) => {
    if (!customer) return;
    const payloadDrug = action.payload?.drug;
    const payloadGrams = action.payload?.grams ?? 1;

    if (action.type === 'ignore') {
      useCustomerStore.setState(state => ({
        customers: state.customers.map(c =>
          c.id === customer.id
            ? { ...c, loyalty: Math.max(0, c.loyalty - 5) }
            : c
        ),
      }));
    } else if (action.type === 'offer-drug' && payloadDrug && payloadGrams) {
      if (payloadDrug === 'koks' || payloadDrug === 'meth') {
        onOfferDrug(customer, payloadDrug, payloadGrams);
      }
    } else if ((action.type === 'accept-request' || action.type === 'counter-offer') && payloadDrug && payloadGrams) {
      if (payloadDrug === 'weed') {
        const bestBud = [...weedOptions].sort((a, b) => b.quality - a.quality)[0];
        if (!bestBud) {
          toast.error('Keine Buds verfuegbar.');
        } else {
          onSell(customer, bestBud.id, payloadGrams);
        }
      } else if (payloadDrug === 'koks' || payloadDrug === 'meth') {
        if (!customer.drugPreferences[payloadDrug]) {
          setPendingOffer({ drug: payloadDrug, grams: payloadGrams });
        } else {
          onSellHardDrug(customer, payloadDrug, payloadGrams);
        }
      }
    }

    useCustomerStore.setState(state => ({
      customers: state.customers.map(c => {
        if (c.id !== customer.id) return c;
        return {
          ...c,
          messages: c.messages.map(msg =>
            msg.id === messageId ? { ...msg, actionsUsed: true } : msg
          ),
        };
      }),
    }));
  };

  const renderProductSelect = () => {
    const options = activeTab === 'weed' ? weedOptions : activeTab === 'koks' ? koksOptions : methOptions;
    const formatLabel = activeTab === 'weed' ? formatBudLabel : activeTab === 'koks' ? formatKoksLabel : formatMethLabel;
    const emptyLabel = activeTab === 'weed' ? 'Keine Buds' : activeTab === 'koks' ? 'Kein Koks' : 'Kein Meth';

    return (
      <select
        value={selectedDrug.id}
        onChange={(event) => setSelectedDrug(prev => ({ ...prev, id: event.target.value }))}
        className="w-full rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      >
        {options.length === 0 && <option value="">{emptyLabel}</option>}
        {options.map(item => (
          <option key={item.id} value={item.id}>
            {formatLabel(item as any)}
          </option>
        ))}
      </select>
    );
  };

  const drugTabs = [
    { type: 'weed' as DrugType, label: '🌿 Weed', count: weedOptions.length },
    { type: 'koks' as DrugType, label: '❄️ Koks', count: koksOptions.length },
    { type: 'meth' as DrugType, label: '🧪 Meth', count: methOptions.length },
  ];

  return (
    <AnimatePresence>
      {customer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-lg h-[92vh] h-[92svh] sm:h-auto max-h-[92vh] max-h-[92svh] sm:max-h-[85vh] bg-gradient-to-b from-card to-card/95 border border-border/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-border/30 bg-card/80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl border border-primary/20">
                  {customer.avatar}
                </div>
                <div>
                  <div className="font-semibold text-base">{customer.name}</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      customer.status === 'vip' ? 'bg-amber-500/20 text-amber-400' :
                      customer.status === 'loyal' ? 'bg-emerald-500/20 text-emerald-400' :
                      customer.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {customer.status.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      💰 {customer.spendingPower}% | ❤️ {customer.loyalty}%
                    </span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="p-2 rounded-full bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {/* Pending Offer Alert */}
              {pendingOffer && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-500/10 to-amber-500/10 p-3 space-y-2"
                >
                  <div className="text-xs text-orange-200 flex items-center gap-2">
                    <Zap size={14} className="text-orange-400" />
                    Willst du {customer.name} mit {pendingOffer.grams}g {pendingOffer.drug} anfixen?
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleOfferConfirm}
                      className="btn-neon flex-1 text-xs"
                    >
                      Ja, anbieten
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingOffer(null)}
                      className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-xs hover:bg-muted/60 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Pending Request */}
              {pendingRequest && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/5 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-yellow-300 flex items-center gap-2">
                      📬 Anfrage: {pendingRequest.gramsRequested}g {pendingRequest.drug}
                    </span>
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                      ⏱ {formatTimeLeft(pendingRequest.expiresAt)}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Max: <span className="text-emerald-400 font-medium">${pendingRequest.maxPrice.toLocaleString()}</span>
                  </div>
                  {!hasRequestStock && (
                    <div className="text-[10px] text-red-300 bg-red-500/10 rounded-lg px-2 py-1">
                      ⚠️ Nicht genug Ware
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleFulfillRequest}
                    disabled={!hasRequestStock}
                    className="btn-neon w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💰 Anfrage erfüllen
                  </button>
                </motion.div>
              )}

              {/* Sample Section for Prospects */}
              {customer.status === 'prospect' && (
                <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Gift size={14} />
                    Sample geben
                  </div>
                  <select
                    value={sampleBudId}
                    onChange={(event) => setSampleBudId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs"
                  >
                    {sampleOptions.length === 0 && (
                      <option value="">Keine Buds verfuegbar</option>
                    )}
                    {sampleOptions.map(bud => (
                      <option key={bud.id} value={bud.id}>
                        {formatBudLabel(bud)}
                      </option>
                    ))}
                  </select>
                  {selectedSampleBud && (
                    <div className="text-[10px] text-muted-foreground">
                      Qualität {selectedSampleBud.quality}% | {selectedSampleBud.grams.toFixed(1)}g verfügbar
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSampleClick}
                    disabled={!selectedSampleBud}
                    className="btn-neon w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📦 Sample geben (0.5g)
                  </button>
                </div>
              )}

              {/* Messages Section */}
              <Collapsible open={messagesOpen} onOpenChange={setMessagesOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full">
                    <SectionHeader 
                      icon={MessageSquare} 
                      title="Nachrichten" 
                      badge={customer.messages.length > 0 ? `${customer.messages.length}` : undefined}
                      isOpen={messagesOpen}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 max-h-[200px] overflow-y-auto space-y-2 pr-1 rounded-lg bg-muted/10 p-2">
                    {customer.messages.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-4">Keine Nachrichten</div>
                    ) : (
                      customer.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.from === 'customer' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-3 py-2 text-xs break-words ${
                              msg.from === 'customer'
                                ? 'bg-muted/50 text-foreground rounded-tl-sm'
                                : 'bg-primary/20 text-primary-foreground rounded-tr-sm'
                            }`}
                          >
                            <div>{msg.message}</div>
                            <div className="mt-1 text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</div>
                            {msg.actions && !msg.actionsUsed && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {msg.actions.map(action => (
                                  <button
                                    key={action.id}
                                    type="button"
                                    onClick={() => handleMessageAction(msg.id, action)}
                                    className="btn-neon px-2 py-1 text-[10px]"
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Sell Section */}
              <Collapsible open={sellOpen} onOpenChange={setSellOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full">
                    <SectionHeader 
                      icon={DollarSign} 
                      title="Verkaufen" 
                      isOpen={sellOpen}
                      variant="success"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-3 rounded-lg bg-muted/10 p-3">
                    {/* Drug Type Tabs */}
                    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
                      {drugTabs.map(tab => (
                        <button
                          key={tab.type}
                          type="button"
                          onClick={() => setActiveTab(tab.type)}
                          className={`flex-1 px-2 py-2 text-[11px] rounded-md transition-all ${
                            activeTab === tab.type 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          {tab.label}
                          {tab.count > 0 && (
                            <span className="ml-1 opacity-70">({tab.count})</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Product Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Produkt wählen</label>
                      {renderProductSelect()}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-muted-foreground">Menge</label>
                        <span className="text-[10px] text-muted-foreground">
                          Verfügbar: <span className="text-foreground font-medium">{maxGrams.toFixed(1)}g</span>
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        {suggestions.map(amount => (
                          <button
                            key={`${activeTab}-${amount}`}
                            type="button"
                            onClick={() => setSelectedDrug(prev => ({ ...prev, grams: amount }))}
                            disabled={amount > maxGrams}
                            className={`flex-1 py-2 text-[11px] rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                              clampedGrams === amount 
                                ? 'border-primary bg-primary/20 text-primary' 
                                : 'border-border bg-card/60 hover:bg-muted/50'
                            }`}
                          >
                            {amount}g
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedDrug(prev => ({ ...prev, grams: Math.max(1, Math.floor(maxGrams)) }))}
                          disabled={maxGrams <= 0}
                          className="flex-1 py-2 text-[11px] rounded-lg border border-border bg-card/60 hover:bg-muted/50 transition-all disabled:opacity-30"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Custom Input Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Menge (g)</label>
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={clampedGrams}
                          onChange={(event) => setSelectedDrug(prev => ({ ...prev, grams: Number(event.target.value) }))}
                          className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">$/g</label>
                        <input
                          type="number"
                          min={0.1}
                          step={0.1}
                          value={pricePerGram[activeTab]}
                          onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            setPricePerGram(prev => ({ ...prev, [activeTab]: nextValue }));
                            setPriceTouched(prev => ({ ...prev, [activeTab]: true }));
                          }}
                          className="w-full rounded-lg border border-border bg-card/60 px-3 py-2 text-xs focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        />
                      </div>
                    </div>

                    {/* Revenue Preview */}
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[11px] text-muted-foreground">Einnahmen</span>
                      <span className="text-sm font-bold text-emerald-400">${revenuePreview.toLocaleString()}</span>
                    </div>

                    {/* Sell Button */}
                    <button
                      type="button"
                      onClick={handleUnifiedSell}
                      disabled={maxGrams <= 0 || clampedGrams <= 0}
                      className="btn-neon w-full py-3 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      💰 AN {customer.name.toUpperCase()} VERKAUFEN
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Make Offer Section */}
              <Collapsible open={offerOpen} onOpenChange={setOfferOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full">
                    <SectionHeader 
                      icon={Package} 
                      title="Angebot machen" 
                      isOpen={offerOpen}
                      variant="warning"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-3 rounded-lg bg-muted/10 p-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Droge wählen</label>
                      <select
                        value={offerDrug}
                        onChange={e => setOfferDrug(e.target.value as 'koks' | 'meth')}
                        className="w-full rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary/50 transition-all"
                      >
                        <option value="koks">❄️ Koks</option>
                        <option value="meth">🧪 Meth</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Menge (g)</label>
                      <input
                        type="number"
                        value={offerGrams}
                        onChange={e => setOfferGrams(Number(e.target.value))}
                        min={1}
                        max={50}
                        className="w-full rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs focus:ring-2 focus:ring-primary/50 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onOfferDrug(customer, offerDrug, offerGrams);
                        setOfferOpen(false);
                      }}
                      className="btn-neon w-full py-2.5 text-xs"
                    >
                      💼 {offerGrams}g {offerDrug === 'koks' ? 'Koks' : 'Meth'} anbieten
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border/30 bg-card/80">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-muted/40 hover:bg-muted/60 px-4 py-2.5 text-xs font-medium transition-colors"
              >
                Schließen
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
