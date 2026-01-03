import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Customer, DrugType, MessageAction, useCustomerStore } from '@/store/customerStore';
import type { BudItem } from '@/store/gameStore';
import type { CocaProduct } from '@/store/cocaStore';
import type { MethProduct } from '@/store/methStore';

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

  useEffect(() => {
    if (!customer) return;
    setSampleBudId(sampleOptions[0]?.id ?? '');
    setActiveTab('weed');
    setSelectedDrug({ type: 'weed', id: weedOptions[0]?.id ?? '', grams: 1 });
    setPricePerGram({ ...DEFAULT_PRICE_PER_GRAM });
    setPriceTouched({ weed: false, koks: false, meth: false });
    setPendingOffer(null);
    setShowOfferPanel(false);
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
  const requestBud = requestNeedsWeed
    ? weedOptions.find(bud => bud.id === selectedDrug.id) || weedOptions[0]
    : null;
  const requestGramsNeeded = pendingRequest?.gramsRequested ?? 0;
  const hasRequestStock = !requestNeedsWeed || (requestBud && requestBud.grams >= requestGramsNeeded);

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
    onFulfillRequest(customer, requestNeedsWeed ? requestBud?.id : undefined);
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

  const renderTabButton = (tab: DrugType, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`flex-1 px-3 py-2 text-xs rounded-lg border ${
        activeTab === tab ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/30 text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );

  const renderProductSelect = () => {
    if (activeTab === 'weed') {
      return (
        <select
          value={selectedDrug.id}
          onChange={(event) => setSelectedDrug(prev => ({ ...prev, id: event.target.value }))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
        >
          {weedOptions.length === 0 && <option value="">Keine Buds</option>}
          {weedOptions.map(bud => (
            <option key={bud.id} value={bud.id}>
              {formatBudLabel(bud)}
            </option>
          ))}
        </select>
      );
    }

    if (activeTab === 'koks') {
      return (
        <select
          value={selectedDrug.id}
          onChange={(event) => setSelectedDrug(prev => ({ ...prev, id: event.target.value }))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
        >
          {koksOptions.length === 0 && <option value="">Kein Koks</option>}
          {koksOptions.map(product => (
            <option key={product.id} value={product.id}>
              {formatKoksLabel(product)}
            </option>
          ))}
        </select>
      );
    }

    return (
      <select
        value={selectedDrug.id}
        onChange={(event) => setSelectedDrug(prev => ({ ...prev, id: event.target.value }))}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
      >
        {methOptions.length === 0 && <option value="">Kein Meth</option>}
        {methOptions.map(product => (
          <option key={product.id} value={product.id}>
            {formatMethLabel(product)}
          </option>
        ))}
      </select>
    );
  };

  return (
    <AnimatePresence>
      {customer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-2 sm:p-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="w-full max-w-2xl h-[92vh] h-[92svh] sm:h-auto max-h-[92vh] max-h-[92svh] sm:max-h-[85vh] game-card p-4 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{customer.avatar}</span>
                <div>
                  <div className="font-semibold text-lg">{customer.name}</div>
                  <div className="text-[11px] text-muted-foreground">{customer.status.toUpperCase()}</div>
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-1 rounded-full bg-muted/40">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 pb-6 sm:pb-4">
              {pendingOffer && (
                <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 space-y-2">
                  <div className="text-xs text-orange-200">
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
                      className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}

              {pendingRequest && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-yellow-300">
                      📬 Active Request: {pendingRequest.gramsRequested}g {pendingRequest.drug}
                    </span>
                    <span className="text-[10px] text-red-400">
                      Expires: {formatTimeLeft(pendingRequest.expiresAt)}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Max Price: ${pendingRequest.maxPrice.toLocaleString()}
                  </div>
                  {!hasRequestStock && (
                    <div className="text-[10px] text-red-300">
                      Nicht genug Ware fuer die Anfrage.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleFulfillRequest}
                    disabled={!hasRequestStock}
                    className="btn-neon w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💰 Fulfill Request
                  </button>
                </div>
              )}

              <div className="max-h-none sm:max-h-[40vh] min-h-[160px] sm:min-h-[200px] overflow-y-visible sm:overflow-y-auto space-y-2 pr-1">
                {customer.messages.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Keine Nachrichten.</div>
                ) : (
                  customer.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs break-words ${
                          msg.from === 'customer'
                            ? 'bg-muted/40 text-foreground'
                            : 'bg-primary/20 text-primary-foreground'
                        }`}
                      >
                        <div>{msg.message}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</div>
                        {msg.actions && !msg.actionsUsed && (
                          <div className="mt-2 flex flex-wrap gap-2">
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

              {customer.status === 'prospect' && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Sample Bud auswaehlen</div>
                  <select
                    value={sampleBudId}
                    onChange={(event) => setSampleBudId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
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
                      Qualitaet {selectedSampleBud.quality}% | {selectedSampleBud.grams.toFixed(1)}g verfuegbar
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSampleClick}
                    disabled={!selectedSampleBud}
                    className="btn-neon w-full text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📦 Give Sample (0.5g)
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {renderTabButton('weed', '🌿 WEED')}
                  {renderTabButton('koks', '❄️ KOKS')}
                  {renderTabButton('meth', '🧪 METH')}
                </div>

                {renderProductSelect()}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Menge waehlen</span>
                  <span>Verfuegbar: {maxGrams.toFixed(1)}g</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {suggestions.map(amount => (
                    <button
                      key={`${activeTab}-${amount}`}
                      type="button"
                      onClick={() => setSelectedDrug(prev => ({ ...prev, grams: amount }))}
                      disabled={amount > maxGrams}
                      className={`btn-neon px-2 py-1 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed ${
                        clampedGrams === amount ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      {amount}g
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedDrug(prev => ({ ...prev, grams: Math.max(1, Math.floor(maxGrams)) }))}
                    disabled={maxGrams <= 0}
                    className="btn-neon px-2 py-1 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    MAX
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    <span>Menge (g)</span>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={clampedGrams}
                      onChange={(event) => setSelectedDrug(prev => ({ ...prev, grams: Number(event.target.value) }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </label>
                  <label className="space-y-1 text-[10px] text-muted-foreground">
                    <span>Preis pro g</span>
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
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                  </label>
                </div>

                <div className="text-xs text-emerald-300">Revenue Preview: ~${revenuePreview.toLocaleString()}</div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUnifiedSell}
                    disabled={maxGrams <= 0 || clampedGrams <= 0}
                    className="btn-neon flex-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    💰 SELL TO {customer.name.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-2">
                {!showOfferPanel ? (
                  <button
                    type="button"
                    onClick={() => setShowOfferPanel(true)}
                    className="btn-neon w-full text-xs"
                  >
                    💼 Make Offer
                  </button>
                ) : (
                  <div className="space-y-2 rounded-lg bg-muted/20 p-2">
                    <div className="text-xs font-semibold">Offer Hard Drugs:</div>
                    <select
                      value={offerDrug}
                      onChange={e => setOfferDrug(e.target.value as 'koks' | 'meth')}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    >
                      <option value="koks">❄️ Koks</option>
                      <option value="meth">🧪 Meth</option>
                    </select>
                    <input
                      type="number"
                      value={offerGrams}
                      onChange={e => setOfferGrams(Number(e.target.value))}
                      min={1}
                      max={50}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOfferDrug(customer, offerDrug, offerGrams);
                          setShowOfferPanel(false);
                        }}
                        className="btn-neon flex-1 text-xs"
                      >
                        Offer {offerGrams}g {offerDrug}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOfferPanel(false)}
                        className="flex-1 rounded-lg bg-muted/40 px-3 py-2 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
