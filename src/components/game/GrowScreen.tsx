import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Seed, SEED_CATALOG, GrowSlot as GrowSlotType } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';
import { GrowSlot } from './GrowSlot';
import { GrowSuppliesModal } from './GrowSuppliesModal';
import { HarvestBreakdownModal, HarvestBreakdownData, HarvestBonus } from './HarvestBreakdownModal';
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

// Helper function to calculate harvest breakdown data
const calculateHarvestBreakdown = (slot: GrowSlotType, state: ReturnType<typeof useGameStore.getState>): HarvestBreakdownData | null => {
  if (!slot.seed) return null;

  const seed = slot.seed;
  const traits = seed.traits;
  const hasTrait = (t: string) => traits.includes(t);

  // Check collection bonuses
  const checkCollectionBonus = (rarity: typeof seed.rarity): boolean => {
    const seedsOfRarity = SEED_CATALOG.filter(s => s.rarity === rarity);
    return seedsOfRarity.every(s => state.discoveredSeeds.includes(s.name));
  };

  const hasCommonBonus = checkCollectionBonus('common');
  const hasUncommonBonus = checkCollectionBonus('uncommon');
  const hasRareBonus = checkCollectionBonus('rare');
  const hasEpicBonus = checkCollectionBonus('epic');
  const hasLegendaryBonus = checkCollectionBonus('legendary');
  const hasMasterBonus = state.discoveredSeeds.length === SEED_CATALOG.length;

  // Base values
  const baseYield = seed.baseYield;
  const harvestBonus = state.upgrades.find(u => u.id === 'trimming')?.level ?? 0;

  // Fertilizer and Soil bonuses
  const fertilizerYieldBoost = slot.fertilizer?.yieldBoost ?? 0;
  const fertilizerQualityBoost = slot.fertilizer?.qualityBoost ?? 0;
  const soilYieldBoost = slot.soil?.yieldBoost ?? 0;
  const soilQualityBoost = slot.soil?.qualityBoost ?? 0;
  const soilTraitBoostChance = slot.soil?.traitBoostChance ?? 0;

  // RNG yield range: baseYield ±20% (proportional to plant tier)
  const yieldMin = Math.floor(baseYield * 0.8);
  const yieldMax = Math.ceil(baseYield * 1.2);

  // Collect bonuses
  const bonuses: HarvestBonus[] = [];

  // Base info with yield range
  bonuses.push({
    name: 'Basis-Ertrag',
    icon: '🌿',
    multiplier: 1,
    description: `${seed.name} (${seed.rarity}) — ${yieldMin}g - ${yieldMax}g`,
    category: 'base',
  });

  // Fertilizer bonus
  if (slot.fertilizer && fertilizerYieldBoost > 0) {
    bonuses.push({
      name: slot.fertilizer.name,
      icon: slot.fertilizer.icon,
      multiplier: 1 + fertilizerYieldBoost,
      description: `+${Math.round(fertilizerYieldBoost * 100)}% Ertrag, +${fertilizerQualityBoost} Qualität`,
      category: 'fertilizer',
    });
  }

  // Soil bonus
  if (slot.soil && soilYieldBoost > 0) {
    bonuses.push({
      name: slot.soil.name,
      icon: slot.soil.icon,
      multiplier: 1 + soilYieldBoost,
      description: `+${Math.round(soilYieldBoost * 100)}% Ertrag, +${soilQualityBoost} Qualität`,
      category: 'soil',
    });
  }

  // Trait bonuses
  if (hasTrait('Bountiful')) {
    bonuses.push({ name: 'Bountiful', icon: '✨', multiplier: 1.3, description: '+30% alle Erträge', category: 'trait' });
  }
  if (hasTrait('GoldRush')) {
    bonuses.push({ name: 'Gold Rush', icon: '💰', multiplier: 1.5, description: '+50% Coins', category: 'trait' });
  }
  if (hasTrait('Frost')) {
    bonuses.push({ name: 'Frost', icon: '❄️', multiplier: 1.25, description: '+25% Harz', category: 'trait' });
  }
  if (hasTrait('EssenceFlow')) {
    bonuses.push({ name: 'Essence Flow', icon: '💎', multiplier: 2, description: '+100% Essenz', category: 'trait' });
  }
  if (hasTrait('LuckyDrop')) {
    bonuses.push({ name: 'Lucky Drop', icon: '🍀', multiplier: 1, description: '+100% Seed-Drop Chance', category: 'trait' });
  }
  if (hasTrait('CritMaster')) {
    bonuses.push({ name: 'Crit Master', icon: '⚡', multiplier: 1, description: '+15% Krit-Chance', category: 'trait' });
  }
  if (hasTrait('DoubleHarvest')) {
    bonuses.push({ name: 'Double Harvest', icon: '🎉', multiplier: 1, description: '25% Chance auf doppelte Ernte', category: 'trait' });
  }

  // Collection bonuses
  if (hasUncommonBonus) {
    bonuses.push({ name: 'Uncommon Sammlung', icon: '🥈', multiplier: 1.15, description: '+15% Coins', category: 'collection' });
  }
  if (hasEpicBonus) {
    bonuses.push({ name: 'Epic Sammlung', icon: '🥇', multiplier: 1.25, description: '+25% alle Ressourcen', category: 'collection' });
  }
  if (hasLegendaryBonus) {
    bonuses.push({ name: 'Legendary Sammlung', icon: '👑', multiplier: 1.5, description: '+50% XP', category: 'collection' });
  }
  if (hasMasterBonus) {
    bonuses.push({ name: 'Master Sammler', icon: '🏆', multiplier: 2, description: '+100% alle Boni', category: 'collection' });
  }

  // Upgrade bonuses
  if (harvestBonus > 0) {
    bonuses.push({
      name: 'Trimming Upgrade',
      icon: '✂️',
      multiplier: 1 + harvestBonus * 0.1,
      description: `Level ${harvestBonus}: +${harvestBonus * 10}% Ertrag`,
      category: 'upgrade',
    });
  }

  // Calculate actual values using budGrowth for yield
  const supplyYieldMult = (1 + fertilizerYieldBoost) * (1 + soilYieldBoost);
  const bountifulMult = hasTrait('Bountiful') ? 1.3 : 1;
  const epicResourceMult = hasEpicBonus ? 1.25 : 1;
  const masterMult = hasMasterBonus ? 2 : 1;
  const uncommonCoinMult = hasUncommonBonus ? 1.15 : 1;
  const goldRushMult = hasTrait('GoldRush') ? 1.5 : 1;
  const frostMult = hasTrait('Frost') ? 1.25 : 1;
  const essenceFlowMult = hasTrait('EssenceFlow') ? 2 : 1;

  // Bud growth multiplier (exponential yield based on how much buds have grown)
  const budGrowthPercent = slot.budGrowth ?? (slot.stage === 'harvest' ? 100 : 0);
  const budGrowthMult = 0.2 + (budGrowthPercent / 100) * 0.8; // 20% base + up to 80% from growth
  
  // Add bud growth bonus to list
  if (budGrowthPercent > 0) {
    bonuses.push({
      name: 'Bud-Wachstum',
      icon: '🌸',
      multiplier: budGrowthMult,
      description: `${Math.round(budGrowthPercent)}% gewachsen → ${Math.round(budGrowthMult * 100)}% Ertrag`,
      category: 'special',
    });
  }

  // Simulate crit and double harvest for display (deterministic for preview, random for actual harvest)
  const critChance = (state.upgrades.find(u => u.id === 'ventilation')?.level ?? 0) * 0.02 + (hasTrait('CritMaster') ? 0.15 : 0);
  const isCrit = Math.random() < critChance;
  const isDoubleHarvest = hasTrait('DoubleHarvest') && Math.random() < 0.25;
  const harvestMult = isDoubleHarvest ? 2 : 1;

  // Calculate final values with bud growth and yield range
  const totalMultiplier = (1 + harvestBonus * 0.1) * (isCrit ? 2 : 1) * goldRushMult * bountifulMult * harvestMult * uncommonCoinMult * epicResourceMult * masterMult * supplyYieldMult * budGrowthMult;

  // Calculate yield range for preview (min and max possible)
  const minGramsPreview = Math.floor(yieldMin * bountifulMult * harvestMult * supplyYieldMult * budGrowthMult * (1 + harvestBonus * 0.05));
  const maxGramsPreview = Math.floor(yieldMax * bountifulMult * harvestMult * supplyYieldMult * budGrowthMult * (1 + harvestBonus * 0.05));
  const avgGramsPreview = Math.floor((minGramsPreview + maxGramsPreview) / 2);
  
  const quality = Math.min(100, Math.floor(50 + Math.random() * 30 + (isCrit ? 20 : 0) + (hasTrait('Bountiful') ? 10 : 0) + fertilizerQualityBoost + soilQualityBoost + (budGrowthPercent / 10)));

  const avgYield = (yieldMin + yieldMax) / 2;
  const coinGain = Math.floor(avgYield * totalMultiplier);
  const resinGain = Math.floor(baseYield * 0.1 * frostMult * bountifulMult * harvestMult * epicResourceMult * masterMult);
  const essenceGain = seed.rarity !== 'common' ? Math.floor(baseYield * 0.05 * essenceFlowMult * bountifulMult * harvestMult * epicResourceMult * masterMult) : 0;

  const legendaryXpMult = hasLegendaryBonus ? 1.5 : 1;
  const baseXp = 10 + (seed.rarity === 'legendary' ? 50 : seed.rarity === 'epic' ? 30 : seed.rarity === 'rare' ? 20 : seed.rarity === 'uncommon' ? 10 : 0);
  const xpGain = Math.floor(baseXp * harvestMult * legendaryXpMult * masterMult);

  // Add special bonuses if triggered
  if (isCrit) {
    bonuses.push({ name: 'Kritischer Treffer!', icon: '⚡', multiplier: 2, description: 'Verdoppelt Coins!', category: 'special' });
  }
  if (isDoubleHarvest) {
    bonuses.push({ name: 'Doppelte Ernte!', icon: '🎉', multiplier: 2, description: 'Alles verdoppelt!', category: 'special' });
  }

  return {
    strainName: seed.name,
    rarity: seed.rarity,
    baseYield,
    yieldMin,
    yieldMax,
    finalGrams: avgGramsPreview, // Average for preview
    finalGramsMin: minGramsPreview,
    finalGramsMax: maxGramsPreview,
    finalQuality: quality,
    bonuses,
    totalMultiplier,
    isCrit,
    isDoubleHarvest,
    coinGain,
    resinGain,
    essenceGain,
    xpGain,
  };
};

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
  const [showHarvestBreakdown, setShowHarvestBreakdown] = useState(false);
  const [harvestBreakdownData, setHarvestBreakdownData] = useState<HarvestBreakdownData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingTapCountRef = useRef(0);
  const tapRafRef = useRef<number | null>(null);
  const fxIdRef = useRef(0);
  const slotRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Deep-link focus: scroll to + highlight the requested slot
  const navFocus = useNavigationStore(s => s.focus);
  const navFocusNonce = useNavigationStore(s => s.focusNonce);
  const clearNavFocus = useNavigationStore(s => s.clearFocus);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  useEffect(() => {
    if (!navFocus || navFocus.type !== 'slot') return;
    const id = Number(navFocus.id);
    setSelectedSlot(id);
    setHighlightedSlot(id);
    requestAnimationFrame(() => {
      slotRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const ttl = navFocus.ttl ?? 4000;
    const t = setTimeout(() => {
      setHighlightedSlot(null);
      clearNavFocus();
    }, ttl);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navFocusNonce]);
  const fxTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const MAX_FX = 6; // cap concurrent floating numbers / ripples for perf
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
      fxTimeoutsRef.current.forEach(clearTimeout);
      fxTimeoutsRef.current.clear();
    };
  }, []);

  const scheduleCleanup = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      fxTimeoutsRef.current.delete(t);
      fn();
    }, ms);
    fxTimeoutsRef.current.add(t);
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
    
    // Smooth ripple effect at tap position (capped for perf)
    const rippleId = ++fxIdRef.current;
    setTapRipples(prev => {
      const next = [...prev, { id: rippleId, x: rippleX, y: rippleY }];
      return next.length > MAX_FX ? next.slice(next.length - MAX_FX) : next;
    });
    scheduleCleanup(() => {
      setTapRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600);

    // Calculate actual tap boost for display
    const tapPowerLevel = useGameStore.getState().upgrades.find(u => u.id === 'tap-power')?.level ?? 0;
    const playerLevel = useGameStore.getState().level;
    const baseTapBoost = 2;
    const actualBoost = Math.round(baseTapBoost * (1 + tapPowerLevel * 0.2) * (1 + Math.floor(playerLevel / 10) * 0.1));

    // Add floating number near tap position (capped)
    const id = ++fxIdRef.current;
    setFloatingNumbers(prev => {
      const next = [...prev, { id, value: `+${actualBoost}%`, x: rippleX, y: rippleY - 5 }];
      return next.length > MAX_FX ? next.slice(next.length - MAX_FX) : next;
    });

    if (clientX !== null && clientY !== null) {
      emitBurst({ preset: 'tap', x: clientX, y: clientY, space: 'client' });
    }

    scheduleCleanup(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== id));
    }, 800);
  }, [queueTap, playTap, emitBurst, scheduleCleanup]);

  const handleHarvest = useCallback((slotId: number, e?: React.MouseEvent) => {
    const slot = growSlots.find(s => s.id === slotId);
    if (!slot?.seed) return;
    
    // Check if slot is actually ready to harvest
    if (slot.stage !== 'harvest') {
      console.log('Harvest blocked: slot stage is', slot.stage, 'not harvest');
      return;
    }

    const seed = slot.seed;
    
    // Calculate breakdown data before harvest
    const state = useGameStore.getState();
    const breakdownData = calculateHarvestBreakdown(slot, state);
    
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

    // Call harvest and verify it worked
    const preHarvestSlot = useGameStore.getState().growSlots.find(s => s.id === slotId);
    harvest(slotId);
    const postHarvestSlot = useGameStore.getState().growSlots.find(s => s.id === slotId);
    
    // Only show success if the harvest actually worked (slot was cleared)
    if (postHarvestSlot?.seed === null || postHarvestSlot?.seed === undefined) {
      playHarvest();
      
      // Set breakdown data and show modal
      if (breakdownData) {
        setHarvestBreakdownData(breakdownData);
        setShowHarvestBreakdown(true);
      }
      
      // Quick toast notification
      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <div>
            <div className="font-bold">{seed.name} geerntet!</div>
            <div className="text-xs text-muted-foreground">
              {breakdownData?.finalGrams}g • Tippe für Details
            </div>
          </div>
        </div>,
        {
          duration: 3000,
          action: {
            label: (
              <span className="flex items-center gap-1">
                <Wind size={14} /> Trocknen
              </span>
            ),
            onClick: () => useNavigationStore.getState().setActiveScreen('dryroom'),
          },
        }
      );
    } else {
      console.error('Harvest failed! Slot still has seed. Pre:', preHarvestSlot, 'Post:', postHarvestSlot);
      toast.error('Ernte fehlgeschlagen! Versuche es erneut.');
    }
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

  const visibleSlots = useMemo(() => {
    const unlockedSlots = growSlots.filter(s => s.isUnlocked);
    const nextLocked = growSlots.find(s => !s.isUnlocked);
    return nextLocked ? [...unlockedSlots, nextLocked] : unlockedSlots;
  }, [growSlots]);

  // XP progress for current level
  const xpForNextLevel = 100 * Math.pow(1.5, level - 1);
  const xpProgress = (xp / xpForNextLevel) * 100;

  return (
    <div ref={containerRef} className="flex flex-col h-full relative overflow-hidden">
      {/* Tap Ripple Effect - 2 rings (perf) */}
      <AnimatePresence>
        {tapRipples.map(ripple => (
          <React.Fragment key={ripple.id}>
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 3.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute w-16 h-16 rounded-full border border-primary/60 pointer-events-none z-40 will-change-transform"
              style={{
                left: `calc(${ripple.x}% - 32px)`,
                top: `calc(${ripple.y}% - 32px)`,
              }}
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.7 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute w-12 h-12 rounded-full bg-primary/20 pointer-events-none z-40 will-change-transform"
              style={{
                left: `calc(${ripple.x}% - 24px)`,
                top: `calc(${ripple.y}% - 24px)`,
                boxShadow: '0 0 24px hsl(var(--primary) / 0.4)'
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
            animate={{ opacity: 0, y: -70, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute text-primary font-bold text-xl pointer-events-none z-50 will-change-transform"
            style={{
              left: `${num.x}%`,
              top: `${num.y}%`,
              transform: 'translateX(-50%)',
              textShadow: '0 0 12px hsl(var(--primary)), 0 0 24px hsl(var(--primary) / 0.5)'
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
            {visibleSlots.map(slot => (
              <div
                key={slot.id}
                ref={(el) => { slotRefs.current[slot.id] = el; }}
                className={`relative rounded-xl transition-all ${highlightedSlot === slot.id ? 'ring-4 ring-neon-purple/80 ring-offset-2 ring-offset-background animate-pulse' : ''}`}
              >
                <GrowSlot
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
              </div>
            ))}
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

      {/* Harvest Breakdown Modal */}
      <HarvestBreakdownModal
        isOpen={showHarvestBreakdown}
        onClose={() => setShowHarvestBreakdown(false)}
        data={harvestBreakdownData}
      />
    </div>
  );
};
