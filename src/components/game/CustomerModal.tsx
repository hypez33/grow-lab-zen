import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ChevronDown, MessageSquare, Package, DollarSign, Gift, Zap, Send, User, Bot, Clock, Sparkles, AlertCircle, CheckCircle2, Heart, TrendingUp, Check, Pill, Repeat, XCircle, ArrowDown, MessagesSquare } from 'lucide-react';
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

// Pre-canned chat replies grouped so the player can answer common situations
// without typing on mobile. The label is the button text, the message is what
// gets pushed into the chat as a casual player message.
type QuickReply = { id: string; label: string; message: string; tone?: 'positive' | 'neutral' | 'warn' };
const QUICK_REPLIES: QuickReply[] = [
  { id: 'wait',     label: '⏳ Bisschen Geduld', message: 'Bin gerade dran, gib mir 5 Min 🙏', tone: 'neutral' },
  { id: 'soon',     label: '🚀 Gleich da',       message: 'Gleich am Start, halt die Ohren steif!', tone: 'positive' },
  { id: 'price',    label: '💸 Bester Preis',    message: 'Hab dir den besten Preis gemacht, Bruder.', tone: 'positive' },
  { id: 'thanks',   label: '🙏 Danke dir',       message: 'Danke fürs Vertrauen — bis bald!', tone: 'positive' },
  { id: 'oos',      label: '📉 Aktuell leer',    message: 'Bin grad ausverkauft, melde mich wenn frische Ware da ist.', tone: 'warn' },
  { id: 'check',    label: '👀 Check ich',       message: 'Lass mich kurz checken, ich melde mich gleich.', tone: 'neutral' },
];


const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `Vor ${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std`;
  const days = Math.floor(hours / 24);
  return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;
};

// Message type display helpers
const getMessageTypeLabel = (type: string): { label: string; color: string; icon: React.ElementType } => {
  const types: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    'sample-request': { label: 'Sample Anfrage', color: 'text-blue-400', icon: Gift },
    'sample-response': { label: 'Sample Feedback', color: 'text-emerald-400', icon: CheckCircle2 },
    'purchase': { label: 'Kauf', color: 'text-emerald-400', icon: DollarSign },
    'purchase-request': { label: 'Bestellung', color: 'text-amber-400', icon: Package },
    'request': { label: 'Anfrage', color: 'text-amber-400', icon: MessageSquare },
    'offer': { label: 'Angebot', color: 'text-purple-400', icon: Sparkles },
    'complaint': { label: 'Beschwerde', color: 'text-red-400', icon: AlertCircle },
    'praise': { label: 'Lob', color: 'text-emerald-400', icon: Heart },
    'casual': { label: 'Chat', color: 'text-muted-foreground', icon: MessageSquare },
    'timeout': { label: 'Timeout', color: 'text-orange-400', icon: Clock },
    'timeout-angry': { label: 'Verärgert', color: 'text-red-400', icon: AlertCircle },
    'drug-rejection': { label: 'Ablehnung', color: 'text-red-400', icon: X },
    'drug-rejection-soft': { label: 'Ablehnung', color: 'text-orange-400', icon: AlertCircle },
    'drug-rejection-angry': { label: 'Ablehnung', color: 'text-red-500', icon: AlertCircle },
    'drug-acceptance': { label: 'Akzeptiert', color: 'text-emerald-400', icon: CheckCircle2 },
    'addiction-plea': { label: 'Bitte', color: 'text-purple-400', icon: Heart },
    'addiction-light': { label: 'Nachfrage', color: 'text-blue-400', icon: TrendingUp },
    'addiction-medium': { label: 'Dringend', color: 'text-orange-400', icon: AlertCircle },
    'addiction-desperate': { label: 'Verzweifelt', color: 'text-red-400', icon: AlertCircle },
  };
  return types[type] || { label: 'Nachricht', color: 'text-muted-foreground', icon: MessageSquare };
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

type ModalTab = 'chat' | 'sell' | 'offer';


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

  // Chat auto-scroll ref + jump-to-latest pill state
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Composer state — quick-replies + free-text fallback.
  const [composerText, setComposerText] = useState('');
  const reduceMotion = useReducedMotion();
  const [typingPlayer, setTypingPlayer] = useState(false); // brief typing indicator after sending


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
    setComposerText('');
    setTypingPlayer(false);
  }, [customer?.id]);

  // Auto-scroll chat to newest message — but only if user is already near the bottom.
  useEffect(() => {
    if (chatContainerRef.current && customer?.messages?.length) {
      const el = chatContainerRef.current;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      const timer = setTimeout(() => {
        if (chatContainerRef.current && (nearBottom || messagesOpen)) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          setShowJumpToLatest(false);
        } else {
          setShowJumpToLatest(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [customer?.messages?.length, messagesOpen, customer?.id]);

  const handleChatScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setShowJumpToLatest(!nearBottom);
  };

  const scrollChatToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowJumpToLatest(false);
  };

  // Push a casual player message into the active customer's chat. Uses the
  // same shape as the store's createMessage so message rendering is identical.
  const sendChatMessage = (text: string) => {
    if (!customer) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setTypingPlayer(true);
    useCustomerStore.setState(state => ({
      customers: state.customers.map(c => {
        if (c.id !== customer.id) return c;
        const newMsg = {
          id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          from: 'player' as const,
          type: 'casual' as const,
          message: trimmed,
          timestamp: Date.now(),
          read: true,
        };
        return { ...c, messages: [...c.messages, newMsg] };
      }),
    }));
    // Brief typing-indicator hide so the bubble lands smoothly.
    window.setTimeout(() => setTypingPlayer(false), reduceMotion ? 0 : 350);
    setComposerText('');
    // Auto-scroll on next paint.
    requestAnimationFrame(() => scrollChatToBottom());
  };

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
    if (!customer || !pendingRequest) {
      console.log('handleFulfillRequest: no customer or pendingRequest', { customer, pendingRequest });
      return;
    }
    console.log('handleFulfillRequest: calling onFulfillRequest', { customerId: customer.id, pendingRequest });
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
                aria-label="Schließen"
                className="flex-shrink-0 w-10 h-10 rounded-full bg-muted/40 hover:bg-muted/60 active:bg-muted/80 transition-colors flex items-center justify-center"
              >
                <X size={20} />
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
              {/* Pending Request - now just a subtle indicator, main action is in chat */}
              {pendingRequest && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-[10px] text-yellow-300/80 flex items-center gap-1.5">
                    📬 Offene Anfrage: {pendingRequest.gramsRequested}g {pendingRequest.drug}
                  </span>
                  <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    ⏱ {formatTimeLeft(pendingRequest.expiresAt)}
                  </span>
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

              {/* Messages Section - Enhanced Chat UI */}
              <Collapsible open={messagesOpen} onOpenChange={setMessagesOpen}>
                <CollapsibleTrigger asChild>
                  <button type="button" className="w-full">
                    <SectionHeader 
                      icon={MessageSquare} 
                      title="Chat-Verlauf" 
                      badge={customer.messages.filter(m => !m.read).length > 0 ? `${customer.messages.filter(m => !m.read).length} neu` : undefined}
                      isOpen={messagesOpen}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 rounded-xl border border-border/30 bg-gradient-to-b from-card/80 to-card/40 overflow-hidden">
                    {/* Chat Header */}
                    <div className="px-3 py-2 border-b border-border/20 bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                          {customer.avatar}
                        </div>
                        <span className="text-[11px] font-medium">{customer.name}</span>
                        <span className={`w-2 h-2 rounded-full ${customer.status === 'vip' ? 'bg-amber-400' : customer.status === 'loyal' ? 'bg-emerald-400' : 'bg-blue-400'} animate-pulse`} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {customer.messages.length} Nachrichten
                      </span>
                    </div>
                    
                    {/* Messages Container */}
                    <div className="relative">
                      <div 
                        ref={chatContainerRef}
                        onScroll={handleChatScroll}
                        className="max-h-[300px] overflow-y-auto p-3 space-y-1.5 scrollbar-hide"
                      >
                      {customer.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                            <MessageSquare size={20} className="text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">Noch keine Nachrichten</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1 mb-3">
                            {customer.status === 'prospect' 
                              ? 'Gib ein Sample um die Konversation zu starten!' 
                              : 'Der Kunde wird sich bald melden...'}
                          </p>
                          {customer.status === 'prospect' && sampleOptions.length > 0 && (
                            <button
                              type="button"
                              onClick={handleSampleClick}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-[11px] font-medium transition-all"
                            >
                              <Gift size={12} />
                              Sample geben (0.5g)
                            </button>
                          )}
                        </div>
                      ) : (
                        customer.messages.map((msg, index) => {
                          const typeInfo = getMessageTypeLabel(msg.type);
                          const TypeIcon = typeInfo.icon;
                          const isCustomer = msg.from === 'customer';
                          const prev = customer.messages[index - 1];
                          const showDateDivider = index === 0 || 
                            new Date(msg.timestamp).toDateString() !== new Date(prev?.timestamp || 0).toDateString();
                          // Group consecutive messages from the same author within ~2min — hide avatar + type badge.
                          const isGrouped = !showDateDivider && prev && prev.from === msg.from && (msg.timestamp - prev.timestamp) < 2 * 60 * 1000;
                          
                          return (
                            <div key={msg.id}>
                              {showDateDivider && (
                                <div className="flex items-center gap-2 my-3">
                                  <div className="flex-1 h-px bg-border/30" />
                                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                                    {new Date(msg.timestamp).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                  <div className="flex-1 h-px bg-border/30" />
                                </div>
                              )}
                              <motion.div
                                initial={reduceMotion ? false : { opacity: 0, y: 5, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                                className={`flex gap-2 ${isCustomer ? 'justify-start' : 'justify-end'} ${isGrouped ? 'mt-0.5' : 'mt-2'}`}
                              >
                                {/* Customer Avatar (hidden on grouped follow-ups) */}
                                {isCustomer && (
                                  isGrouped
                                    ? <div className="flex-shrink-0 w-7" />
                                    : <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-muted/60 to-muted/30 flex items-center justify-center text-sm border border-border/30">
                                        {customer.avatar}
                                      </div>
                                )}
                                
                                <div className={`max-w-[80%] ${isCustomer ? '' : 'text-right'}`}>
                                  {/* Message Bubble */}
                                  <div
                                    className={`relative rounded-2xl px-3 py-2 text-xs leading-relaxed break-words ${
                                      isCustomer
                                        ? `bg-gradient-to-br from-muted/60 to-muted/40 text-foreground border border-border/20 ${isGrouped ? 'rounded-tl-2xl' : 'rounded-tl-md'}`
                                        : `bg-gradient-to-br from-primary/30 to-primary/20 text-foreground border border-primary/20 ${isGrouped ? 'rounded-tr-2xl' : 'rounded-tr-md'}`
                                    } ${!msg.read && isCustomer ? 'ring-1 ring-primary/40' : ''}`}
                                  >
                                    <div className="whitespace-pre-wrap">{msg.message}</div>
                                    
                                    {/* Inline Sell Button for purchase requests */}
                                    {isCustomer && (msg.type === 'purchase-request' || msg.type === 'request') && pendingRequest && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mt-2 pt-2 border-t border-border/20"
                                      >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <span className="text-[9px] text-muted-foreground">
                                            {pendingRequest.gramsRequested}g • Max ${pendingRequest.maxPrice}
                                          </span>
                                          {!hasRequestStock && (
                                            <span className="text-[8px] text-red-400">⚠️ Kein Vorrat</span>
                                          )}
                                        </div>
                                        <motion.button
                                          type="button"
                                          onClick={handleFulfillRequest}
                                          disabled={!hasRequestStock}
                                          whileHover={{ scale: hasRequestStock ? 1.02 : 1 }}
                                          whileTap={{ scale: hasRequestStock ? 0.98 : 1 }}
                                          className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-lg transition-all min-h-[34px] ${
                                            hasRequestStock
                                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                              : 'bg-muted/30 text-muted-foreground border border-border/30 cursor-not-allowed'
                                          }`}
                                        >
                                          <DollarSign size={12} />
                                          Verkaufen
                                        </motion.button>
                                      </motion.div>
                                    )}
                                    
                                    {/* Unread indicator */}
                                    {!msg.read && isCustomer && (
                                      <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                                    )}
                                  </div>
                                  
                                  {/* Compact meta row: type label + timestamp inline (hidden on grouped) */}
                                  {!isGrouped && (
                                    <div className={`flex items-center gap-1.5 mt-1 ${isCustomer ? '' : 'justify-end'}`}>
                                      <TypeIcon size={9} className={typeInfo.color} />
                                      <span className={`text-[9px] font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                      <span className="text-muted-foreground/40">·</span>
                                      <Clock size={9} className="text-muted-foreground/50" />
                                      <span className="text-[9px] text-muted-foreground/60">{formatTime(msg.timestamp)}</span>
                                    </div>
                                  )}
                                  
                                  {/* Action Buttons */}
                                  {msg.actions && !msg.actionsUsed && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`mt-2 flex flex-wrap gap-1.5 ${isCustomer ? '' : 'justify-end'}`}
                                    >
                                      {msg.actions.map(action => {
                                        const ActionIcon =
                                          action.type === 'accept-request' ? Check :
                                          action.type === 'offer-drug' ? Pill :
                                          action.type === 'counter-offer' ? Repeat :
                                          action.type === 'ignore' ? XCircle : Sparkles;
                                        return (
                                          <motion.button
                                            key={action.id}
                                            type="button"
                                            onClick={() => handleMessageAction(msg.id, action)}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg transition-all min-h-[34px] ${
                                              action.type === 'accept-request' || action.type === 'offer-drug'
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                : action.type === 'ignore'
                                                  ? 'bg-muted/40 text-muted-foreground border border-border/30 hover:bg-muted/60'
                                                  : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                                            }`}
                                          >
                                            <ActionIcon size={12} />
                                            {action.label}
                                          </motion.button>
                                        );
                                      })}
                                    </motion.div>
                                  )}
                                </div>
                                
                                {/* Player Avatar (hidden on grouped follow-ups) */}
                                {!isCustomer && (
                                  isGrouped
                                    ? <div className="flex-shrink-0 w-7" />
                                    : <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
                                        <User size={12} className="text-primary" />
                                      </div>
                                )}
                              </motion.div>
                            </div>
                          );
                        })
                      )}
                      </div>

                      {/* Jump-to-latest pill */}
                      <AnimatePresence>
                        {showJumpToLatest && customer.messages.length > 3 && (
                          <motion.button
                            type="button"
                            onClick={scrollChatToBottom}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shadow-lg shadow-primary/30"
                          >
                            <ArrowDown size={11} />
                            Neueste
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Player typing indicator — brief animation while sending */}
                    <AnimatePresence>
                      {typingPlayer && (
                        <motion.div
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: reduceMotion ? 0 : 0.18 }}
                          className="px-3 pt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"
                        >
                          <span>Du tippst</span>
                          <span className="flex gap-0.5">
                            <span className={`w-1 h-1 rounded-full bg-primary/70 ${reduceMotion ? '' : 'animate-bounce'}`} style={{ animationDelay: '0ms' }} />
                            <span className={`w-1 h-1 rounded-full bg-primary/70 ${reduceMotion ? '' : 'animate-bounce'}`} style={{ animationDelay: '120ms' }} />
                            <span className={`w-1 h-1 rounded-full bg-primary/70 ${reduceMotion ? '' : 'animate-bounce'}`} style={{ animationDelay: '240ms' }} />
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quick replies — pre-canned answers above the composer for fast mobile replies */}
                    <div className="px-3 pt-2 pb-1.5 border-t border-border/20 bg-muted/5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MessagesSquare size={10} className="text-muted-foreground/70" />
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                          Schnellantworten
                        </span>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 snap-x">
                        {QUICK_REPLIES.map(qr => {
                          const toneClass =
                            qr.tone === 'positive' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' :
                            qr.tone === 'warn'     ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' :
                                                     'border-border/40 bg-card/60 text-foreground/80 hover:bg-card/80';
                          return (
                            <motion.button
                              key={qr.id}
                              type="button"
                              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                              onClick={() => sendChatMessage(qr.message)}
                              className={`shrink-0 snap-start px-2.5 py-1.5 rounded-full border text-[11px] font-medium whitespace-nowrap min-h-[32px] transition-colors ${toneClass}`}
                            >
                              {qr.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Composer — mobile-friendly: large input, big send button, enter-to-send */}
                    <div className="px-3 py-2 border-t border-border/20 bg-card/40 flex items-end gap-2">
                      <div className="flex-1 min-w-0 rounded-2xl border border-border/40 bg-background/60 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
                        <textarea
                          value={composerText}
                          onChange={e => setComposerText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChatMessage(composerText);
                            }
                          }}
                          placeholder={`Nachricht an ${customer.name}…`}
                          rows={1}
                          className="w-full resize-none bg-transparent px-3 py-2 text-xs leading-snug placeholder:text-muted-foreground/50 focus:outline-none max-h-24"
                          aria-label="Nachricht eingeben"
                        />
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => sendChatMessage(composerText)}
                        disabled={!composerText.trim()}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        aria-label="Senden"
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          composerText.trim()
                            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30'
                            : 'bg-muted/40 text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Send size={16} />
                      </motion.button>
                    </div>

                    {/* Quick Actions Footer */}
                    {customer.messages.length > 0 && (
                      <div className="px-3 py-2 border-t border-border/20 bg-muted/10 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {customer.messages.filter(m => !m.actionsUsed && m.actions?.length).length > 0 
                            ? `${customer.messages.filter(m => !m.actionsUsed && m.actions?.length).length} ausstehende Aktionen`
                            : 'Alle Aktionen erledigt'}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground/60">Loyalität:</span>
                          <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
                              style={{ width: `${customer.loyalty}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-primary font-medium">{customer.loyalty}%</span>
                        </div>
                      </div>
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
