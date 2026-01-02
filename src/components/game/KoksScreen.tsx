import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCocaStore, CocaSeed, CocaLeaves, CocaProduct } from '@/store/cocaStore';
import { useGameStore } from '@/store/gameStore';
import { CocaPlantSVG } from './CocaPlantSVG';
import { toast } from 'sonner';
import { X, Zap, Lock, Unlock, Beaker, FlaskConical, Sparkles, Leaf, Package, DollarSign, ChevronDown, ChevronUp, Settings, Dna, Snowflake } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getCocaGenerationDisplay } from '@/lib/cocaBreedingSystem';
import { useScreenShake } from '@/hooks/useScreenShake';
import { ParticleEffect } from '../effects/ParticleEffect';
// Helper function for rarity colors
const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'text-green-400 border-green-500/30 bg-green-500/10';
    case 'uncommon': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    case 'rare': return 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10';
    case 'epic': return 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10';
    case 'legendary': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
  }
};

const getRarityGlow = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'shadow-green-500/20';
    case 'uncommon': return 'shadow-cyan-500/20';
    case 'rare': return 'shadow-indigo-500/30';
    case 'epic': return 'shadow-fuchsia-500/40';
    case 'legendary': return 'shadow-amber-500/50 animate-pulse';
    default: return '';
  }
};

const getRarityAnimation = (rarity: string) => {
  if (rarity === 'legendary') {
    return {
      boxShadow: [
        '0 0 20px rgba(251, 191, 36, 0.3)',
        '0 0 40px rgba(251, 191, 36, 0.6)',
        '0 0 20px rgba(251, 191, 36, 0.3)',
      ],
    };
  }
  if (rarity === 'epic') {
    return {
      boxShadow: [
        '0 0 15px rgba(217, 70, 239, 0.2)',
        '0 0 25px rgba(217, 70, 239, 0.4)',
        '0 0 15px rgba(217, 70, 239, 0.2)',
      ],
    };
  }
  return {};
};

export const KoksScreen = () => {
  const {
    cocaGrowSlots, cocaSeeds, cocaLeaves, cocaProducts, processingStations, cocaUpgrades,
    cocaWorkers, cocaActivityLogs,
    cocaTapBatch, plantCocaSeed, harvestCoca,
    startProcessing, collectProcessed,
    buyCocaUpgrade, sellCocaProduct, totalCocaHarvests, totalPowderProduced,
    unlockProcessingStation, breedCocaSeeds,
  } = useCocaStore();

  const { budcoins } = useGameStore();
  const updateBudcoins = (amount: number) => {
    useGameStore.setState(state => ({ budcoins: state.budcoins + amount }));
  };

  const { playTap, playHarvest } = useGameSounds();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSeedPicker, setShowSeedPicker] = useState(false);
  const [showProcessing, setShowProcessing] = useState(true);
  const [showActivityLog, setShowActivityLog] = useState(true);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
  const [tapRipples, setTapRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingTapCountRef = useRef(0);
  const tapRafRef = useRef<number | null>(null);
  const powderGrams = useMemo(
    () => cocaProducts.filter(p => p.stage === 'powder').reduce((sum, p) => sum + p.grams, 0),
    [cocaProducts]
  );

  // Breeding state
  const [breedingParent1, setBreedingParent1] = useState<CocaSeed | null>(null);
  const [breedingParent2, setBreedingParent2] = useState<CocaSeed | null>(null);

  // Effects
  const { shake } = useScreenShake();
  const [showGodtierEffect, setShowGodtierEffect] = useState(false);

  // Active workers for display
  const activeFarmer = cocaWorkers.find(w => w.id === 'coca-farmer' && w.owned);
  const activeProcessor = cocaWorkers.find(w => w.id === 'coca-processor' && w.owned);
  const activeDealers = cocaWorkers.filter(w => w.type === 'dealer' && w.owned);
  const queueTap = useCallback(() => {
    pendingTapCountRef.current += 1;
    if (tapRafRef.current !== null) return;

    tapRafRef.current = requestAnimationFrame(() => {
      const tapCount = pendingTapCountRef.current;
      pendingTapCountRef.current = 0;
      tapRafRef.current = null;
      if (tapCount > 0) {
        cocaTapBatch(tapCount);
      }
    });
  }, [cocaTapBatch]);

  useEffect(() => {
    return () => {
      if (tapRafRef.current !== null) {
        cancelAnimationFrame(tapRafRef.current);
      }
    };
  }, []);

  const handleTap = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    queueTap();
    playTap();
    
    let rippleX = 50;
    let rippleY = 30;
    
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;
      
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }
      
      rippleX = ((clientX - rect.left) / rect.width) * 100;
      rippleY = ((clientY - rect.top) / rect.height) * 100;
    }
    
    rippleX = Math.max(5, Math.min(95, rippleX));
    rippleY = Math.max(5, Math.min(70, rippleY));
    
    const rippleId = Date.now();
    setTapRipples(prev => [...prev, { id: rippleId, x: rippleX, y: rippleY }]);
    setTimeout(() => setTapRipples(prev => prev.filter(r => r.id !== rippleId)), 700);
    
    const id = Date.now();
    setFloatingNumbers(prev => [...prev, { id, value: '+2%', x: rippleX, y: rippleY - 5 }]);
    setTimeout(() => setFloatingNumbers(prev => prev.filter(n => n.id !== id)), 900);
  }, [queueTap, playTap]);

  const handleHarvest = (slotId: number) => {
    const slot = cocaGrowSlots.find(s => s.id === slotId);
    if (!slot?.seed) return;
    
    harvestCoca(slotId);
    playHarvest();
    
    toast.success(
      <div className="flex flex-col gap-1">
        <div className="font-bold">🌿 {slot.seed.name} geerntet!</div>
        <div className="text-sm text-muted-foreground">Coca-Blätter wurden dem Inventar hinzugefügt</div>
      </div>
    );
  };

  const handlePlantSeed = (seed: CocaSeed) => {
    if (selectedSlot !== null) {
      const slot = cocaGrowSlots.find(s => s.id === selectedSlot);
      if (slot && slot.isUnlocked && !slot.seed) {
        plantCocaSeed(selectedSlot, seed);
        setShowSeedPicker(false);
        setSelectedSlot(null);
        toast.success(`${seed.name} gepflanzt!`);
      }
    }
  };

  const handleSlotClick = (slotId: number) => {
    const slot = cocaGrowSlots.find(s => s.id === slotId);
    if (!slot) return;
    
    if (!slot.isUnlocked) {
      toast.error('Slot ist gesperrt! Kaufe Upgrades im Shop.');
      return;
    }
    
    if (slot.stage === 'harvest') {
      handleHarvest(slotId);
    } else if (!slot.seed) {
      setSelectedSlot(slotId);
      setShowSeedPicker(true);
    } else {
      handleTap();
    }
  };

  const handleStartProcessing = (stationId: string, inputId: string) => {
    const success = startProcessing(stationId, inputId);
    if (success) {
      toast.success('Verarbeitung gestartet!');
      setSelectedStation(null);
    } else {
      toast.error('Verarbeitung fehlgeschlagen!');
    }
  };

  const handleCollect = useCallback((stationId: string) => {
    // Hole IMMER den aktuellsten State vom Store (verhindert Stale State Problem)
    const currentStations = useCocaStore.getState().processingStations;
    const station = currentStations.find(s => s.id === stationId);
    
    if (!station || !station.currentProduct || station.progress < 100) {
      toast.error('Nichts zum Einsammeln!');
      return;
    }
    
    const product = collectProcessed(stationId);
    if (product) {
      playHarvest();
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">✨ {product.grams}g {product.stage === 'powder' ? 'Kokain' : product.stage} fertig!</div>
          <div className="text-sm">Reinheit: {product.purity}%</div>
        </div>
      );
    }
  }, [collectProcessed, playHarvest]);

  const handleSell = (product: CocaProduct) => {
    const result = sellCocaProduct(product.id);
    if (result.success) {
      updateBudcoins(result.revenue);
      toast.success(`💰 ${result.revenue}$ verdient!`);
    }
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const result = buyCocaUpgrade(upgradeId, budcoins);
    if (result.success) {
      updateBudcoins(-result.cost);
      toast.success('Upgrade gekauft!');
    } else {
      toast.error(`Nicht genug Geld! Benötigt: ${result.cost}$`);
    }
  };

  const handleUnlockStation = (stationId: string) => {
    const result = unlockProcessingStation(stationId, budcoins);
    if (result.success) {
      updateBudcoins(-result.cost);
      toast.success('Station freigeschaltet!');
    } else {
      toast.error(`Nicht genug Geld! Benötigt: ${result.cost}$`);
    }
  };

  const handleBreed = () => {
    if (!breedingParent1 || !breedingParent2) {
      toast.error('Wähle 2 Eltern-Samen aus!');
      return;
    }

    const result = breedCocaSeeds(breedingParent1.id, breedingParent2.id);

    if (result.success && result.result) {
      const { seed, outcomeMessage, purityBonus, outcome } = result.result;
      playHarvest();

      // Godtier effects: Screen shake + particles
      if (outcome === 'godtier') {
        shake({ intensity: 'heavy', duration: 0.8 });
        setShowGodtierEffect(true);
        setTimeout(() => setShowGodtierEffect(false), 2500);
      } else if (outcome === 'excellent') {
        shake({ intensity: 'medium', duration: 0.5 });
      } else if (outcome === 'good') {
        shake({ intensity: 'light', duration: 0.3 });
      }

      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-bold">{outcomeMessage}</div>
          <div className="text-sm">Neuer Strain: {seed.name}</div>
          <div className="text-xs text-muted-foreground">
            Reinheit-Bonus: {purityBonus > 0 ? '+' : ''}{purityBonus}% • Gen: {getCocaGenerationDisplay(seed.generation)}
          </div>
        </div>,
        { duration: 5000 }
      );

      // Reset selection
      setBreedingParent1(null);
      setBreedingParent2(null);
    } else {
      toast.error(result.error || 'Breeding fehlgeschlagen!');
    }
  };

  // Get input materials for a station
  const getInputMaterials = (station: typeof processingStations[0]) => {
    if (station.inputStage === 'leaves') {
      return cocaLeaves;
    }
    return cocaProducts.filter(p => p.stage === station.inputStage);
  };

  const unlockedSlots = cocaGrowSlots.filter(s => s.isUnlocked);
  const nextLockedSlot = cocaGrowSlots.find(s => !s.isUnlocked);
  const visibleSlots = nextLockedSlot ? [...unlockedSlots, nextLockedSlot] : unlockedSlots;

  return (
    <div ref={containerRef} className="flex flex-col h-full relative overflow-hidden">
      {/* Godtier Breeding Effect */}
      <ParticleEffect show={showGodtierEffect} type="explosion" count={30} duration={2500} />

      {/* Tap Effects */}
      <AnimatePresence>
        {tapRipples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute w-16 h-16 rounded-full border-2 border-amber-400/60 pointer-events-none z-40"
            style={{ left: `calc(${ripple.x}% - 32px)`, top: `calc(${ripple.y}% - 32px)` }}
          />
        ))}
      </AnimatePresence>
      
      <AnimatePresence>
        {floatingNumbers.map(num => (
          <motion.div
            key={num.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -60, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute text-amber-400 font-bold text-xl pointer-events-none z-50"
            style={{ left: `${num.x}%`, top: `${num.y}%`, transform: 'translateX(-50%)' }}
          >
            {num.value}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        {/* Header Stats */}
        <div className="px-3 pt-3 pb-2">
          <div className="game-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="text-2xl">🌿</span> Coca-Labor
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <DollarSign size={14} className="text-green-400" />
                  <span className="font-bold">{budcoins.toLocaleString()}$</span>
                </div>
                <div className="flex items-center gap-1">
                  <Leaf size={14} className="text-green-400" />
                  <span>{cocaLeaves.reduce((sum, l) => sum + l.grams, 0).toFixed(0)}g</span>
                </div>
                <div className="flex items-center gap-1">
                  <Snowflake size={14} className="text-cyan-300" />
                  <span>{powderGrams.toFixed(0)}g</span>
                  <span className="text-[10px] text-muted-foreground">Koks</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>🌱 {totalCocaHarvests} Ernten</span>
              <span>•</span>
              <span>💊 {totalPowderProduced.toFixed(0)}g produziert</span>
            </div>
          </div>
        </div>

        {/* Grow Slots */}
        <div className="px-3 mb-3">
          <div className="grid grid-cols-2 gap-2">
            {visibleSlots.map(slot => (
              <motion.div
                key={slot.id}
                whileTap={{ scale: slot.isUnlocked ? 0.95 : 1 }}
                onClick={() => handleSlotClick(slot.id)}
                className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all
                  ${slot.isUnlocked 
                    ? slot.stage === 'harvest' 
                      ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20' 
                      : 'bg-gradient-to-br from-green-900/20 to-emerald-800/10 border border-green-500/30'
                    : 'bg-muted/30 border border-border/50'
                  }`}
              >
                {!slot.isUnlocked ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <Lock size={24} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Gesperrt</span>
                  </div>
                ) : !slot.seed ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-dashed border-green-500/40 flex items-center justify-center"
                    >
                      <span className="text-xl">+</span>
                    </motion.div>
                    <span className="text-xs text-muted-foreground">Pflanzen</span>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CocaPlantSVG 
                        stage={slot.stage} 
                        rarity={slot.seed.rarity}
                        size={90}
                      />
                    </div>
                    {/* Progress bar */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${slot.stage === 'harvest' ? 'bg-amber-400' : 'bg-green-400'}`}
                          style={{ width: `${slot.progress}%` }}
                        />
                      </div>
                    </div>
                    {/* Strain name */}
                    <div className="absolute top-2 left-2 right-2">
                      <div className={`text-[10px] font-medium truncate px-1.5 py-0.5 rounded ${getRarityColor(slot.seed.rarity)}`}>
                        {slot.seed.name}
                      </div>
                    </div>
                    {/* Harvest indicator */}
                    {slot.stage === 'harvest' && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full"
                      >
                        Ernten!
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tap Button */}
        <div className="px-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleTap}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
          >
            <Zap size={20} />
            Wachstum boosten
          </motion.button>
        </div>

        {/* Processing Section */}
        <div className="px-3">
          <motion.div 
            className="game-card overflow-hidden"
            animate={{ height: showProcessing ? 'auto' : '48px' }}
          >
            <button
              onClick={() => setShowProcessing(!showProcessing)}
              className="w-full p-3 flex items-center justify-between"
            >
              <h3 className="font-display font-bold flex items-center gap-2">
                <Beaker size={18} className="text-amber-400" />
                Verarbeitung
              </h3>
              {showProcessing ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            <AnimatePresence>
              {showProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 pb-3 space-y-2"
                >
                  {processingStations.map(station => {
                    const inputMaterials = getInputMaterials(station);
                    const isProcessing = station.currentProduct !== null;
                    const isComplete = station.progress >= 100;
                    
                    return (
                      <div
                        key={station.id}
                        className={`p-3 rounded-lg border transition-all ${
                          !station.isUnlocked 
                            ? 'bg-muted/30 border-border/30 opacity-60'
                            : isComplete
                              ? 'bg-amber-500/10 border-amber-500/40'
                              : 'bg-card/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FlaskConical size={16} className={station.isUnlocked ? 'text-amber-400' : 'text-muted-foreground'} />
                            <span className="font-medium text-sm">{station.name}</span>
                          </div>
                          {!station.isUnlocked && (
                            <div className="flex items-center gap-2">
                              <Lock size={14} className="text-muted-foreground" />
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleUnlockStation(station.id);
                                }}
                                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded text-xs font-bold text-amber-400 transition-all relative z-10 cursor-pointer"
                                style={{ pointerEvents: 'auto' }}
                              >
                                {station.id === 'oxidation' ? '10k$' : '50k$'}
                              </motion.button>
                            </div>
                          )}
                        </div>
                        
                        {station.isUnlocked && (
                          <>
                            {isProcessing ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {station.currentProduct?.strainName} → {station.outputStage}
                                  </span>
                                  <span>{Math.floor(station.progress)}%</span>
                                </div>
                                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                    style={{ width: `${station.progress}%` }}
                                  />
                                </div>
                                {isComplete && (
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCollect(station.id);
                                    }}
                                    className="w-full py-2 bg-amber-500 text-black font-bold rounded-lg text-sm relative z-10 cursor-pointer"
                                    style={{ pointerEvents: 'auto' }}
                                  >
                                    Einsammeln
                                  </motion.button>
                                )}
                              </div>
                            ) : inputMaterials.length > 0 ? (
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground mb-2">
                                  Material auswählen:
                                </div>
                                <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                                  {inputMaterials.slice(0, 4).map((material) => (
                                    <motion.button
                                      key={material.id}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleStartProcessing(station.id, material.id)}
                                      className={`p-2 rounded text-xs border ${getRarityColor(material.rarity)}`}
                                    >
                                      <div className="font-medium truncate">{material.strainName}</div>
                                      <div className="text-[10px] opacity-70">{material.grams}g</div>
                                    </motion.button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground text-center py-2">
                                Kein Material verfügbar
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Worker Activity Log */}
        {(activeFarmer || activeProcessor || activeDealers.length > 0) && (
          <div className="px-3 mt-3">
            <motion.div 
              className="game-card overflow-hidden border-amber-500/30"
              animate={{ height: showActivityLog ? 'auto' : '48px' }}
            >
              <button
                onClick={() => setShowActivityLog(!showActivityLog)}
                className="w-full p-3 flex items-center justify-between"
              >
                <h3 className="font-display font-bold flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  Mitarbeiter-Aktivität
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                    {cocaWorkers.filter(w => w.owned && !w.paused).length} aktiv
                  </span>
                </h3>
                {showActivityLog ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              <AnimatePresence>
                {showActivityLog && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {/* Active Workers Status */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {activeFarmer && (
                        <div className={`p-2 rounded-lg border ${activeFarmer.paused ? 'bg-muted/30 border-border/30 opacity-60' : 'bg-green-500/10 border-green-500/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{activeFarmer.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{activeFarmer.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Lv.{activeFarmer.level} • {activeFarmer.paused ? '⏸️ Pausiert' : '🌱 Anbau'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeProcessor && (
                        <div className={`p-2 rounded-lg border ${activeProcessor.paused ? 'bg-muted/30 border-border/30 opacity-60' : 'bg-blue-500/10 border-blue-500/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{activeProcessor.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{activeProcessor.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                Lv.{activeProcessor.level} • {activeProcessor.paused ? '⏸️ Pausiert' : '🧪 Verarbeitet'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {activeDealers.slice(0, 2).map(dealer => (
                        <div 
                          key={dealer.id}
                          className={`p-2 rounded-lg border ${dealer.paused ? 'bg-muted/30 border-border/30 opacity-60' : 'bg-amber-500/10 border-amber-500/30'}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{dealer.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{dealer.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Lv.{dealer.level} • {dealer.paused
                            ? '⏸️ Pausiert'
                            : (() => {
                                const baseSales = dealer.salesPerTick + Math.floor(dealer.level * 0.5);
                                const totalSales = Math.max(1, Math.floor(baseSales * 1.6));
                                return `💀 ${totalSales}/Tick`;
                              })()
                          }
                        </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Activity Log */}
                    <div className="bg-black/30 rounded-lg p-2 max-h-32 overflow-y-auto scrollbar-hide">
                      {cocaActivityLogs.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          Keine Aktivitäten... Stelle Mitarbeiter ein!
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {cocaActivityLogs.slice(0, 15).map((log, index) => (
                            <motion.div
                              key={`${log.id}-${index}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                                log.workerId === 'coca-farmer' 
                                  ? 'bg-green-500/10 border-l-2 border-green-500' 
                                  : log.workerId === 'coca-processor'
                                    ? 'bg-blue-500/10 border-l-2 border-blue-500'
                                    : 'bg-amber-500/10 border-l-2 border-amber-500'
                              }`}
                            >
                              <span className="text-base">{log.workerIcon}</span>
                              <span className="flex-1 whitespace-normal break-words">{log.action}</span>
                              {log.amount && (
                                <span className="text-amber-400 font-bold shrink-0">+{log.amount}g</span>
                              )}
                              {log.revenue && (
                                <span className="text-green-400 font-bold shrink-0">${log.revenue}</span>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
        {/* Products for Sale */}
        {cocaProducts.length > 0 && (
          <div className="px-3 mt-3">
            <div className="game-card p-3">
              <h3 className="font-display font-bold mb-2 flex items-center gap-2">
                <Package size={16} className="text-amber-400" />
                Produkte ({cocaProducts.length})
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {cocaProducts.map(product => {
                  const stagePrices: Record<string, number> = { leaves: 2, paste: 15, base: 50, powder: 150 };
                  const basePrice = stagePrices[product.stage] || 10;
                  const purityMult = 0.5 + (product.purity / 100) * 1.5;
                  const estimatedPrice = Math.floor(product.grams * basePrice * purityMult);
                  
                  return (
                    <motion.div
                      key={product.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSell(product)}
                      animate={getRarityAnimation(product.rarity)}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className={`p-2 rounded-lg border cursor-pointer ${getRarityColor(product.rarity)} ${getRarityGlow(product.rarity)} shadow-lg`}
                    >
                      <div className="font-medium text-xs truncate">{product.strainName}</div>
                      <div className="text-[10px] opacity-70 capitalize">{product.stage}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs">{product.grams}g • {product.purity}%</span>
                        <span className="text-xs font-bold text-green-400">${estimatedPrice}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Breeding & Upgrades Section */}
        <div className="px-3 mt-3 pb-4 space-y-2">
          {/* Breeding Button & Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full game-card p-3 flex items-center justify-between hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Dna size={18} className="text-purple-400" />
                  <span className="font-display font-bold">Coca Breeding</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{cocaSeeds.length} Samen</span>
                  <Sparkles size={14} className="text-purple-400" />
                </div>
              </motion.button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] bg-background/95 backdrop-blur-lg border-purple-500/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-purple-400 font-display">
                  <Dna size={20} />
                  Coca-Züchtung
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {/* Parent Selection */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Eltern auswählen:</div>

                  {/* Parent 1 */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Elternteil 1:</div>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {cocaSeeds.map(seed => (
                        <motion.button
                          key={seed.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setBreedingParent1(seed)}
                          className={`p-2 rounded border text-left text-xs transition-all ${
                            breedingParent1?.id === seed.id
                              ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                              : breedingParent2?.id === seed.id
                                ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                                : `${getRarityColor(seed.rarity)}`
                          }`}
                          disabled={breedingParent2?.id === seed.id}
                        >
                          <div className="font-bold truncate">{seed.name}</div>
                          <div className="text-[10px] opacity-70">
                            {seed.baseYield}g • {getCocaGenerationDisplay(seed.generation)}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Parent 2 */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Elternteil 2:</div>
                    <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                      {cocaSeeds.map(seed => (
                        <motion.button
                          key={seed.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setBreedingParent2(seed)}
                          className={`p-2 rounded border text-left text-xs transition-all ${
                            breedingParent2?.id === seed.id
                              ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                              : breedingParent1?.id === seed.id
                                ? 'border-border/30 bg-muted/20 opacity-50 cursor-not-allowed'
                                : `${getRarityColor(seed.rarity)}`
                          }`}
                          disabled={breedingParent1?.id === seed.id}
                        >
                          <div className="font-bold truncate">{seed.name}</div>
                          <div className="text-[10px] opacity-70">
                            {seed.baseYield}g • {getCocaGenerationDisplay(seed.generation)}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Parents Preview */}
                {(breedingParent1 || breedingParent2) && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="text-xs font-medium mb-2">Ausgewählte Eltern:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Elternteil 1:</span>
                        <span className="font-bold">{breedingParent1?.name || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Elternteil 2:</span>
                        <span className="font-bold">{breedingParent2?.name || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Breed Button */}
                <motion.button
                  whileTap={{ scale: breedingParent1 && breedingParent2 ? 0.95 : 1 }}
                  onClick={handleBreed}
                  disabled={!breedingParent1 || !breedingParent2}
                  className={`w-full py-3 rounded-lg font-bold transition-all ${
                    breedingParent1 && breedingParent2
                      ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  🧬 Züchten
                </motion.button>

                {/* Breeding Info */}
                <div className="text-xs text-muted-foreground bg-black/20 p-2 rounded">
                  <div className="font-bold mb-1">ℹ️ Breeding Info:</div>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>Beide Eltern-Samen werden verbraucht</li>
                    <li>Höhere Generation = höheres Risiko & Belohnung</li>
                    <li>Hybrid-Samen können bessere Stats haben</li>
                    <li>Reinheits-Bonus wird auf Produkte angewendet</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Upgrades Button & Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.98 }}
                className="w-full game-card p-3 flex items-center justify-between hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-amber-400" />
                  <span className="font-display font-bold">Upgrades</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{cocaUpgrades.reduce((sum, u) => sum + u.level, 0)} Levels</span>
                  <Sparkles size={14} className="text-amber-400" />
                </div>
              </motion.button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] bg-background/95 backdrop-blur-lg border-amber-500/30">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-amber-400 font-display">
                  <Sparkles size={20} />
                  Coca-Labor Upgrades
                </DialogTitle>
              </DialogHeader>
              <div className="overflow-y-auto max-h-[60vh] space-y-2 pr-2">
                {cocaUpgrades.map(upgrade => {
                  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, upgrade.level));
                  const canAfford = budcoins >= cost;
                  const isMaxed = upgrade.level >= upgrade.maxLevel;
                  
                  return (
                    <motion.button
                      key={upgrade.id}
                      whileTap={{ scale: canAfford && !isMaxed ? 0.98 : 1 }}
                      onClick={() => !isMaxed && handleBuyUpgrade(upgrade.id)}
                      disabled={isMaxed}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        isMaxed 
                          ? 'bg-muted/20 border-border/30 opacity-60' 
                          : canAfford 
                            ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20' 
                            : 'bg-card/50 border-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {upgrade.name}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
                              upgrade.category === 'growing' ? 'bg-green-500/20 text-green-400' :
                              upgrade.category === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {upgrade.category}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{upgrade.description}</div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="text-xs text-amber-400 font-bold">Lv.{upgrade.level}/{upgrade.maxLevel}</div>
                          {!isMaxed && (
                            <div className={`text-sm font-bold ${canAfford ? 'text-green-400' : 'text-muted-foreground'}`}>
                              ${cost.toLocaleString()}
                            </div>
                          )}
                          {isMaxed && (
                            <div className="text-xs text-muted-foreground">MAX</div>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${(upgrade.level / upgrade.maxLevel) * 100}%` }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seed Picker Modal */}
      <AnimatePresence>
        {showSeedPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-display font-bold">Coca-Samen wählen</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowSeedPicker(false); setSelectedSlot(null); }}
                className="p-2 rounded-full bg-muted"
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {cocaSeeds.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Leaf size={40} className="mx-auto mb-2 opacity-50" />
                  <p>Keine Samen verfügbar!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {cocaSeeds.map(seed => (
                    <motion.button
                      key={seed.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePlantSeed(seed)}
                      animate={getRarityAnimation(seed.rarity)}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className={`p-3 rounded-xl border text-left ${getRarityColor(seed.rarity)} ${getRarityGlow(seed.rarity)} shadow-lg`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <CocaPlantSVG stage="bush" rarity={seed.rarity} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate flex items-center gap-1">
                            {seed.name}
                            {seed.isHybrid && <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1 py-0.5 rounded">🧬</span>}
                          </div>
                          <div className="text-xs capitalize opacity-70">
                            {seed.rarity} • {getCocaGenerationDisplay(seed.generation)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs opacity-70">
                        Ertrag: ~{seed.baseYield}g • Speed: {seed.growthSpeed.toFixed(1)}x
                      </div>
                      {seed.parentNames && seed.parentNames.length > 0 && (
                        <div className="text-[10px] opacity-60 mt-0.5 truncate">
                          {seed.parentNames[0]} × {seed.parentNames[1]}
                        </div>
                      )}
                      {seed.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {seed.traits.map(trait => (
                            <span key={trait} className="px-1.5 py-0.5 bg-black/20 rounded text-[10px]">
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
