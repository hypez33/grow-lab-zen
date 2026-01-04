import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Seed } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';
import { GrowSlot } from './GrowSlot';
import { GrowSuppliesModal } from './GrowSuppliesModal';
import { ResourceBadge } from './ResourceIcon';
import { PlantSVG } from './PlantSVG';
import { WorkerActivityPanel } from './WorkerActivityPanel';
import { GoldenHourEvent } from './GoldenHourEvent';
import { LiveStatsPanel } from './LiveStatsPanel';
import { QuickActionsBar } from './QuickActionsBar';
import { MiniDashboard } from './MiniDashboard';
import { toast } from 'sonner';
import { X, Zap, Unlock, Wind, Droplets } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';
import { useCanvasParticles } from '@/components/effects/CanvasParticleSystem';

export const GrowScreen = () => {
  const { 
    growSlots, seeds, budcoins, resin, essence, gems, level, xp,
    tapBatch, harvest, plantSeed, updateProgress, calculateOfflineProgress,
    tutorialComplete, completeTutorial, buyUpgrade, upgrades, waterPlant, waterAllPlants
  } = useGameStore();
  
  const { playTap, playHarvest } = useGameSounds();
  const { emitBurst } = useCanvasParticles();
  
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSeedPicker, setShowSeedPicker] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [suppliesMode, setSuppliesMode] = useState<'fertilizer' | 'soil' | 'shop'>('fertilizer');
  const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: string; x: number; y: number }[]>([]);
  const [tapRipples, setTapRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showOfflinePopup, setShowOfflinePopup] = useState(false);
  const [offlineEarnings, setOfflineEarnings] = useState({ coins: 0, harvests: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingTapCountRef = useRef(0);
  const tapRafRef = useRef<number | null>(null);
  const harvestParticleColors = useMemo<Record<string, string[]>>(() => ({
    common: ['#bbf7d0', '#22c55e', '#86efac'],
    uncommon: ['#34d399', '#22c55e', '#a7f3d0'],
    rare: ['#38bdf8', '#22d3ee', '#a7f3d0'],
    epic: ['#a855f7', '#ec4899', '#c4b5fd'],
    legendary: ['#facc15', '#f97316', '#fde68a'],
  }), []);

  const queueTap = useCallback(() => {
    pendingTapCountRef.current += 1;
    if (tapRafRef.current !== null) return;

    tapRafRef.current = requestAnimationFrame(() => {
      const tapCount = pendingTapCountRef.current;
      pendingTapCountRef.current = 0;
      tapRafRef.current = null;
      if (tapCount > 0) {
        tapBatch(tapCount);
      }
    });
  }, [tapBatch]);

  // Calculate offline progress on mount
  useEffect(() => {
    const earnings = calculateOfflineProgress();
    if (earnings.coins > 0) {
      setOfflineEarnings(earnings);
      setShowOfflinePopup(true);
    }
  }, []);

  // Game loop for passive auto-growth (plants grow on their own)
  useEffect(() => {
    const interval = setInterval(() => {
      updateProgress(1); // 1 second delta
    }, 1000);
    return () => clearInterval(interval);
  }, [updateProgress]);

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
    
    // Get tap position relative to container using ref
    let rippleX = 50;
    let rippleY = 45;
    const rect = containerRef.current?.getBoundingClientRect();
    let clientX: number | null = null;
    let clientY: number | null = null;

    if (e) {
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('changedTouches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
    }

    if ((clientX === null || clientY === null) && rect) {
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    if (rect && clientX !== null && clientY !== null) {
      rippleX = ((clientX - rect.left) / rect.width) * 100;
      rippleY = ((clientY - rect.top) / rect.height) * 100;
    }
    
    // Clamp values
    rippleX = Math.max(5, Math.min(95, rippleX));
    rippleY = Math.max(5, Math.min(95, rippleY));
    
    // Smooth ripple effect at tap position
    const rippleId = Date.now();
    setTapRipples(prev => [...prev, { id: rippleId, x: rippleX, y: rippleY }]);
    setTimeout(() => {
      setTapRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 700);
    
    // Calculate actual tap boost for display
    const tapPowerLevel = useGameStore.getState().upgrades.find(u => u.id === 'tap-power')?.level ?? 0;
    const playerLevel = useGameStore.getState().level;
    const baseTapBoost = 2;
    const actualBoost = Math.round(baseTapBoost * (1 + tapPowerLevel * 0.2) * (1 + Math.floor(playerLevel / 10) * 0.1));
    
    // Add floating number near tap position
    const id = Date.now();
    setFloatingNumbers(prev => [...prev, { id, value: `+${actualBoost}%`, x: rippleX, y: rippleY - 5 }]);
    
    if (clientX !== null && clientY !== null) {
      emitBurst({ preset: 'tap', x: clientX, y: clientY, space: 'client' });
    }
    
    // Remove floating number after animation
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== id));
    }, 900);
  }, [queueTap, playTap, emitBurst]);

  const handleHarvest = useCallback((slotId: number, e?: React.MouseEvent) => {
    const slot = growSlots.find(s => s.id === slotId);
    if (!slot?.seed) return;

    const seed = slot.seed;
    const traits = seed.traits;
    const hasTrait = (t: string) => traits.includes(t);
    
    // Calculate grams harvested (same logic as in store)
    const baseGrams = Math.floor(seed.baseYield * 0.5) + Math.floor(Math.random() * seed.baseYield * 0.3);
    
    // Calculate bonuses for display
    const bonuses: string[] = [];
    if (hasTrait('GoldRush')) bonuses.push('💰 Gold Rush!');
    if (hasTrait('DoubleHarvest') && Math.random() < 0.25) bonuses.push('🎉 Double!');
    if (hasTrait('Bountiful')) bonuses.push('✨ Bountiful!');
    if (hasTrait('EssenceFlow')) bonuses.push('💎 Essence!');
    if (hasTrait('Frost')) bonuses.push('❄️ Frost!');
    if (hasTrait('LuckyDrop')) bonuses.push('🍀 Lucky!');

    const rect = containerRef.current?.getBoundingClientRect();
    let clientX: number | null = e?.clientX ?? null;
    let clientY: number | null = e?.clientY ?? null;

    if ((clientX === null || clientY === null) && rect) {
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    if (clientX !== null && clientY !== null) {
      const rarityBoost = seed.rarity === 'legendary' ? 18 : seed.rarity === 'epic' ? 10 : seed.rarity === 'rare' ? 6 : 0;
      emitBurst({
        preset: 'harvest',
        x: clientX,
        y: clientY,
        space: 'client',
        count: 28 + rarityBoost,
        colors: harvestParticleColors[seed.rarity] ?? harvestParticleColors.common,
      });
    }

    harvest(slotId);
    playHarvest();
    
    // Enhanced harvest toast with action button
    toast.success(
      <div className="flex flex-col gap-1">
        <div className="font-bold text-base">🌿 {seed.name} geerntet!</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
            {baseGrams}g
          </span>
          <span className="text-muted-foreground">+{seed.baseYield} 💰</span>
        </div>
        {bonuses.length > 0 && (
          <div className="text-xs text-muted-foreground">{bonuses.join(' • ')}</div>
        )}
      </div>,
      {
        duration: 4000,
        action: {
          label: (
            <span className="flex items-center gap-1">
              <Wind size={14} /> Zum Trocknen
            </span>
          ),
          onClick: () => useNavigationStore.getState().setActiveScreen('dryroom'),
        },
      }
    );
  }, [growSlots, harvest, playHarvest, emitBurst, harvestParticleColors]);

  const handlePlantSeed = (seed: Seed) => {
    if (selectedSlot !== null) {
      const slot = growSlots.find(s => s.id === selectedSlot);
      if (slot && slot.isUnlocked && !slot.seed) {
        plantSeed(selectedSlot, seed);
        setShowSeedPicker(false);
        setSelectedSlot(null);
        toast.success(`Planted ${seed.name}!`);
      }
    }
  };

  const handleSlotSelect = (slotId: number) => {
    const slot = growSlots.find(s => s.id === slotId);
    if (slot?.isUnlocked && !slot.seed) {
      setSelectedSlot(slotId);
      setShowSeedPicker(true);
    } else {
      setSelectedSlot(slotId);
    }
  };

  // Find next locked slot and calculate unlock cost
  const nextLockedSlot = growSlots.find(s => !s.isUnlocked);
  const growSlotUpgrade = upgrades.find(u => u.id === 'grow-slot');
  const unlockCost = growSlotUpgrade 
    ? Math.floor(growSlotUpgrade.baseCost * Math.pow(growSlotUpgrade.costScaling, growSlotUpgrade.level))
    : 250;
  const canUnlock = budcoins >= unlockCost && nextLockedSlot && growSlotUpgrade && growSlotUpgrade.level < growSlotUpgrade.maxLevel;

  const handleUnlockSlot = () => {
    if (canUnlock) {
      buyUpgrade('grow-slot');
      toast.success('Neuer Slot freigeschaltet!');
    }
  };

  const handleOpenSupplies = (slotId: number, mode: 'fertilizer' | 'soil') => {
    setSelectedSlot(slotId);
    setSuppliesMode(mode);
    setShowSuppliesModal(true);
  };

  const selectedSlotData = selectedSlot !== null ? growSlots.find(s => s.id === selectedSlot) : null;

  // XP progress for current level
  const xpForNextLevel = 100 * Math.pow(1.5, level - 1);
  const xpProgress = (xp / xpForNextLevel) * 100;

  return (
    <div ref={containerRef} className="flex flex-col h-full relative overflow-hidden">
      {/* Tap Ripple Effect - smoother with multiple rings */}
      <AnimatePresence>
        {tapRipples.map(ripple => (
          <React.Fragment key={ripple.id}>
            {/* Outer ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute w-16 h-16 rounded-full border border-primary/60 pointer-events-none z-40"
              style={{ 
                left: `calc(${ripple.x}% - 32px)`, 
                top: `calc(${ripple.y}% - 32px)`,
              }}
            />
            {/* Inner ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute w-12 h-12 rounded-full bg-primary/20 pointer-events-none z-40"
              style={{ 
                left: `calc(${ripple.x}% - 24px)`, 
                top: `calc(${ripple.y}% - 24px)`,
                boxShadow: '0 0 30px hsl(var(--primary) / 0.4)'
              }}
            />
            {/* Center pulse */}
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute w-6 h-6 rounded-full bg-primary/40 pointer-events-none z-40"
              style={{ 
                left: `calc(${ripple.x}% - 12px)`, 
                top: `calc(${ripple.y}% - 12px)`,
              }}
            />
          </React.Fragment>
        ))}
      </AnimatePresence>

      {/* Floating Numbers */}
      <AnimatePresence>
        {floatingNumbers.map(num => (
          <motion.div
            key={num.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -80, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute text-primary font-bold text-xl pointer-events-none z-50"
            style={{ 
              left: `${num.x}%`, 
              top: `${num.y}%`,
              transform: 'translateX(-50%)',
              textShadow: '0 0 15px hsl(var(--primary)), 0 0 30px hsl(var(--primary) / 0.5)'
            }}
          >
            {num.value}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
        {/* Golden Hour Event Banner */}
        <div className="px-3 pt-2">
          <GoldenHourEvent />
        </div>

        {/* Mini Dashboard */}
        <div className="px-3 pt-2">
          <MiniDashboard />
        </div>

        {/* Quick Actions */}
        <div className="px-3 pt-2">
          <QuickActionsBar />
        </div>

        {/* Unlock Slot Button */}
        {nextLockedSlot && growSlotUpgrade && growSlotUpgrade.level < growSlotUpgrade.maxLevel && (
          <div className="px-3 mb-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleUnlockSlot}
              disabled={!canUnlock}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all
                ${canUnlock 
                  ? 'bg-primary text-primary-foreground glow-green' 
                  : 'bg-muted text-muted-foreground'
                }`}
            >
              <Unlock size={16} />
              <span>Slot {nextLockedSlot.id + 1} freischalten</span>
              <span className="bg-background/20 px-2 py-0.5 rounded-full text-xs">
                {unlockCost} 💰
              </span>
            </motion.button>
          </div>
        )}

        {/* Grow Slots Grid - only show unlocked + next locked */}
        <div className="px-3">
          <div className="grid grid-cols-2 gap-2">
            {(() => {
              const unlockedSlots = growSlots.filter(s => s.isUnlocked);
              const nextLocked = growSlots.find(s => !s.isUnlocked);
              const visibleSlots = nextLocked ? [...unlockedSlots, nextLocked] : unlockedSlots;
              return visibleSlots.map(slot => (
                <GrowSlot
                  key={slot.id}
                  slot={slot}
                  onTap={handleTap}
                  onHarvest={(e) => handleHarvest(slot.id, e)}
                  isSelected={selectedSlot === slot.id}
                  onSelect={() => handleSlotSelect(slot.id)}
                  onOpenSupplies={(mode) => handleOpenSupplies(slot.id, mode)}
                  onWater={() => {
                    if (waterPlant(slot.id)) {
                      toast.success(`💧 Pflanze ${slot.id + 1} gegossen!`);
                    }
                  }}
                />
              ));
            })()}
          </div>
        </div>

        {/* Selected plant detail card */}
        <AnimatePresence>
          {selectedSlotData?.seed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-3 mt-3 game-card p-3"
            >
              <div className="flex items-center gap-3">
                <PlantSVG 
                  stage={selectedSlotData.stage} 
                  rarity={selectedSlotData.seed.rarity}
                  traits={selectedSlotData.seed.traits}
                  size={50}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base truncate">{selectedSlotData.seed.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{selectedSlotData.seed.rarity} • {selectedSlotData.stage}</p>
                  {selectedSlotData.seed.traits.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {selectedSlotData.seed.traits.slice(0, 3).map(trait => (
                        <span key={trait} className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px]">
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.85, rotate: [0, -5, 5, 0] }}
                  onClick={(e) => handleTap(e)}
                  className="btn-neon w-14 h-14 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden"
                >
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                  <Zap size={24} className="relative z-10" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Stats Panel */}
        <div className="px-3 mt-3">
          <LiveStatsPanel />
        </div>

        {/* Worker Activity Panel */}
        <div className="px-3 mt-3">
          <WorkerActivityPanel />
        </div>
      </div>

      {/* Seed Picker Modal */}
      <AnimatePresence>
        {showSeedPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-display font-bold">Select a Seed</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowSeedPicker(false); setSelectedSlot(null); }}
                className="p-2 rounded-full bg-muted"
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {seeds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No seeds available!</p>
                  <p className="text-sm mt-1">Harvest plants to collect seeds.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {seeds.map(seed => (
                    <motion.button
                      key={seed.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePlantSeed(seed)}
                      className={`game-card p-3 text-left rarity-${seed.rarity}`}
                    >
                      <div className="flex items-center gap-2">
                        <PlantSVG stage="seed" rarity={seed.rarity} size={40} isAnimated={false} />
                        <div>
                          <h4 className="font-semibold text-sm">{seed.name}</h4>
                          <span className="text-xs text-muted-foreground capitalize">{seed.rarity}</span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Progress Popup */}
      <AnimatePresence>
        {showOfflinePopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="game-card p-6 text-center max-w-sm glow-gold"
            >
              <h2 className="text-2xl font-display font-bold text-neon-gold mb-2">Welcome Back!</h2>
              <p className="text-muted-foreground mb-4">While you were away...</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <ResourceBadge type="cash" value={offlineEarnings.coins} size="lg" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {offlineEarnings.harvests} plants auto-harvested
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowOfflinePopup(false)}
                className="btn-neon w-full"
              >
                Collect!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {!tutorialComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="game-card p-6 text-center max-w-sm"
            >
              <h2 className="text-2xl font-display font-bold text-neon-green mb-4">Welcome to Grow Lab!</h2>
              
              <div className="space-y-4 text-left mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🌱</span>
                  <p className="text-sm text-muted-foreground">Plants grow automatically! Tap to boost growth speed.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <p className="text-sm text-muted-foreground">Harvest ready plants to earn BudCoins and rare resources</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <p className="text-sm text-muted-foreground">Buy upgrades to automate and boost your production</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🧬</span>
                  <p className="text-sm text-muted-foreground">Breed seeds in the Genetics Lab for rare varieties</p>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={completeTutorial}
                className="btn-neon w-full"
              >
                Let's Grow!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grow Supplies Modal */}
      <GrowSuppliesModal
        isOpen={showSuppliesModal}
        onClose={() => setShowSuppliesModal(false)}
        slotId={selectedSlot}
        mode={suppliesMode}
      />
    </div>
  );
};
