import { memo, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GrowSlot as GrowSlotType } from '@/store/gameStore';
import { PlantSVG } from './PlantSVG';
import { Lock, Plus, Sprout, Droplets, Scissors, Sparkles, Zap } from 'lucide-react';

// Rough ETA estimate (seconds) — passive ~0.5%/s baseline; bonuses speed it up.
const estimateSecondsLeft = (slot: GrowSlotType): number => {
  const remaining = Math.max(0, 100 - slot.progress);
  const fertSpeed = slot.fertilizer?.growthBoost ?? 0;
  const soilSpeed = slot.soil?.growthBoost ?? 0;
  const ratePerSec = 0.5 * (1 + fertSpeed + soilSpeed);
  return Math.ceil(remaining / Math.max(0.05, ratePerSec));
};

const formatETA = (sec: number): string => {
  if (sec <= 0) return 'jetzt';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `~${m}m`;
  const h = Math.floor(m / 60);
  return `~${h}h ${m % 60}m`;
};

interface GrowSlotProps {
  slot: GrowSlotType;
  onTap: (e?: MouseEvent<HTMLDivElement>) => void;
  onHarvest: (e?: MouseEvent<HTMLDivElement>) => void;
  isSelected: boolean;
  onSelect: () => void;
  onOpenSupplies?: (mode: 'fertilizer' | 'soil') => void;
  onWater?: () => void;
  /** Cosmetic upgrade levels (passed once from GrowScreen, not subscribed per slot). */
  solarGlowLevel?: number;
  bioLuminLevel?: number;
  particleLevel?: number;
  auraLevel?: number;
  /** True when reduced-motion / performance-mode is active. */
  disableDecorative?: boolean;
}

const GrowSlotComponent = ({
  slot,
  onTap,
  onHarvest,
  isSelected,
  onSelect,
  onOpenSupplies,
  onWater,
  solarGlowLevel = 0,
  bioLuminLevel = 0,
  particleLevel = 0,
  auraLevel = 0,
  disableDecorative = false,
}: GrowSlotProps) => {
  const isReady = slot.stage === 'harvest' && slot.progress >= 100;
  const isEmpty = !slot.seed;
  const isLocked = !slot.isUnlocked;
  const isGrowing = !isEmpty && !isReady && !isLocked;
  const needsWater = slot.waterLevel < 30 && !isEmpty && !isLocked;

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isLocked) return;
    if (isReady) {
      onHarvest(event);
    } else if (!isEmpty) {
      onTap(event);
      onSelect();
    } else {
      onSelect();
    }
  };

  const handleFertilizerClick = (e: MouseEvent) => {
    e.stopPropagation();
    onOpenSupplies?.('fertilizer');
  };

  const handleSoilClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (!slot.seed) { // Only allow soil change when empty
      onOpenSupplies?.('soil');
    }
  };

  const handleWaterClick = (e: MouseEvent) => {
    e.stopPropagation();
    onWater?.();
  };

  const progressPercent = slot.progress;
  const hasFertilizer = !!slot.fertilizer;
  const hasPremiumSoil = slot.soil && slot.soil.id !== 'basic-soil';
  const waterLevel = slot.waterLevel ?? 100;
  const etaText = isGrowing ? formatETA(estimateSecondsLeft(slot)) : null;

  // ---- Primary Action HUD: one CTA per state ----
  type PrimaryAction = {
    label: string;
    icon: JSX.Element;
    classes: string;
    pulse?: boolean;
    onPress: (e: MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
  };

  const stopAnd = (fn?: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn?.();
  };

  let primary: PrimaryAction;
  if (isLocked) {
    primary = {
      label: 'Gesperrt',
      icon: <Lock size={12} />,
      classes: 'bg-muted/40 text-muted-foreground',
      onPress: () => {},
      disabled: true,
    };
  } else if (isReady) {
    primary = {
      label: 'Ernten',
      icon: <Scissors size={12} />,
      classes: 'bg-gradient-to-r from-neon-gold to-amber-500 text-background shadow-[0_0_14px_hsl(45_100%_55%/0.7)]',
      pulse: true,
      onPress: (e) => { e.stopPropagation(); onHarvest(e as unknown as MouseEvent<HTMLDivElement>); },
    };
  } else if (isEmpty) {
    primary = {
      label: 'Pflanzen',
      icon: <Plus size={12} />,
      classes: 'bg-gradient-to-r from-neon-green to-emerald-500 text-background',
      onPress: stopAnd(onSelect),
    };
  } else if (needsWater) {
    primary = {
      label: `Gießen ${Math.round(waterLevel)}%`,
      icon: <Droplets size={12} />,
      classes: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      pulse: true,
      onPress: stopAnd(onWater),
    };
  } else {
    primary = {
      label: 'Boost',
      icon: <Zap size={12} />,
      classes: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-background',
      onPress: (e) => { e.stopPropagation(); onTap(e as unknown as MouseEvent<HTMLDivElement>); onSelect(); },
    };
  }

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-colors duration-200 aspect-square will-change-transform
        ${isLocked ? 'bg-muted/30' : 'game-card'}
        ${isSelected ? 'ring-2 ring-primary glow-green' : ''}
        ${isReady ? 'ring-2 ring-primary shadow-[0_0_24px_hsl(var(--primary)/0.7)]' : ''}
      `}
      whileTap={isLocked ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      onClick={handleClick}
    >
      {/* Ready-to-harvest pulsating outer glow */}
      {isReady && (
        <motion.div
          aria-hidden
          className="absolute -inset-1 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.45) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Background gradient based on stage */}
      {!isLocked && slot.seed && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at bottom, 
              ${slot.seed.rarity === 'legendary' ? 'hsl(45 100% 55%)' : 
                slot.seed.rarity === 'epic' ? 'hsl(270 70% 55%)' :
                slot.seed.rarity === 'rare' ? 'hsl(210 100% 60%)' :
                slot.seed.rarity === 'uncommon' ? 'hsl(180 100% 50%)' : 
                'hsl(115 100% 62%)'
              } 0%, transparent 60%)`
          }}
        />
      )}

      {/* Soil indicator at bottom */}
      {!isLocked && slot.soil && slot.soil.id !== 'basic-soil' && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 opacity-60"
          style={{
            background: slot.soil.rarity === 'legendary' ? 'linear-gradient(to right, hsl(45 70% 30%), hsl(45 70% 45%))' : 
              slot.soil.rarity === 'epic' ? 'linear-gradient(to right, hsl(270 50% 25%), hsl(270 50% 40%))' :
              slot.soil.rarity === 'rare' ? 'linear-gradient(to right, hsl(30 60% 25%), hsl(30 60% 40%))' :
              'linear-gradient(to right, hsl(25 50% 30%), hsl(25 50% 45%))'
          }}
        />
      )}

      {/* Status pill (top-center, above plant) */}
      {!isLocked && !isEmpty && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
            ${isReady
              ? 'bg-neon-gold/90 text-background shadow-[0_0_8px_hsl(45_100%_55%/0.7)]'
              : needsWater
                ? 'bg-red-500/90 text-white'
                : 'bg-background/70 text-primary border border-primary/40'}`}>
            {isReady ? '✓ Reif' : needsWater ? 'Durstig' : `${slot.stage} ${Math.round(progressPercent)}%`}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pt-5 pb-9 px-2">
        {isLocked ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Lock size={26} />
            <span className="text-[10px] font-medium">Locked</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Plus size={28} className="text-primary/50" />
            </motion.div>
            {/* Soil badge when empty */}
            {slot.soil && slot.soil.id !== 'basic-soil' && (
              <button
                onClick={handleSoilClick}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/50 text-[9px] hover:bg-muted transition-colors"
              >
                <span>{slot.soil.icon}</span>
                <span className="truncate max-w-[60px]">{slot.soil.name}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Plant visualization — idle wiggle only when not in reduced motion */}
            <motion.div
              animate={isGrowing && !disableDecorative ? {
                scale: [1, 1.02, 1],
                rotate: [-0.5, 0.5, -0.5]
              } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlantSVG
                stage={slot.stage}
                rarity={slot.seed!.rarity}
                traits={slot.seed!.traits}
                size={68}
                budGrowth={slot.budGrowth ?? 0}
                isAnimated={isSelected || isReady || !disableDecorative}
                solarGlowLevel={solarGlowLevel}
                bioLuminLevel={bioLuminLevel}
                particleLevel={particleLevel}
                auraLevel={auraLevel}
                disableDecorative={disableDecorative}
              />
            </motion.div>

            {/* ETA chip during growing */}
            {etaText && (
              <span className="text-[9px] font-semibold text-muted-foreground mt-0.5">
                ⏱ {etaText}
              </span>
            )}

            {/* Bud growth + yield preview during flower stage */}
            {(slot.stage === 'flower' || slot.stage === 'harvest') && slot.seed && (
              <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-primary/10 rounded-full">
                <span className="text-[9px]">🌸</span>
                <span className="text-[9px] font-bold text-primary">
                  {(() => {
                    const budMult = 0.2 + ((slot.budGrowth ?? 0) / 100) * 0.8;
                    const baseYield = slot.seed.baseYield;
                    const yMin = Math.floor(baseYield * 0.8);
                    const yMax = Math.ceil(baseYield * 1.2);
                    return `${Math.round(yMin * budMult)}-${Math.round(yMax * budMult)}g`;
                  })()}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* PRIMARY ACTION BUTTON — always one clear CTA per slot */}
      {!isLocked && (
        <motion.button
          type="button"
          onClick={primary.onPress}
          disabled={primary.disabled}
          whileTap={primary.disabled ? undefined : { scale: 0.94 }}
          animate={primary.pulse ? { scale: [1, 1.04, 1] } : {}}
          transition={primary.pulse ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : undefined}
          className={`absolute bottom-2 left-2 right-2 z-20 flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-bold uppercase tracking-wider ${primary.classes}`}
        >
          {primary.icon}
          <span className="truncate">{primary.label}</span>
        </motion.button>
      )}

      {/* Supply indicators (top-left corner) */}
      {!isLocked && (
        <div className="absolute top-1 left-1 flex gap-1">
          {/* Fertilizer indicator/button */}
          <button
            onClick={handleFertilizerClick}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all
              ${hasFertilizer 
                ? 'bg-emerald-500/80 text-white shadow-sm shadow-emerald-500/50' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            title={hasFertilizer ? `${slot.fertilizer?.name} (${slot.fertilizerUsesLeft} übrig)` : 'Dünger hinzufügen'}
          >
            <span className="text-[10px]">🌱</span>
          </button>
          
          {/* Soil indicator */}
          {hasPremiumSoil && (
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
              style={{
                backgroundColor: slot.soil?.rarity === 'legendary' ? 'hsl(45 70% 45%)' :
                  slot.soil?.rarity === 'epic' ? 'hsl(270 50% 40%)' :
                  slot.soil?.rarity === 'rare' ? 'hsl(30 60% 40%)' :
                  'hsl(25 50% 45%)',
              }}
              title={slot.soil?.name}
            >
              {slot.soil?.icon}
            </div>
          )}
        </div>
      )}

      {/* Water indicator (top-right corner) */}
      {!isLocked && !isEmpty && (
        <button
          onClick={handleWaterClick}
          className={`absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all
            ${waterLevel < 30 
              ? 'bg-red-500/90 text-white animate-pulse' 
              : waterLevel < 60 
                ? 'bg-yellow-500/80 text-white' 
                : 'bg-cyan-500/70 text-white hover:bg-cyan-500/90'}`}
          title={`Wasserstand: ${Math.round(waterLevel)}%`}
        >
          <Droplets size={10} />
          <span>{Math.round(waterLevel)}%</span>
        </button>
      )}

      {/* Fertilizer uses remaining */}
      {hasFertilizer && slot.fertilizerUsesLeft > 0 && (
        <div className="absolute top-7 right-1 bg-emerald-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
          {slot.fertilizerUsesLeft}x
        </div>
      )}

      {/* Progress bar above the action button */}
      {!isLocked && !isEmpty && (
        <div className="absolute bottom-10 left-2 right-2 h-1 bg-muted/50 rounded-full overflow-hidden z-10">
          <motion.div
            className={`h-full bg-primary relative ${isGrowing ? 'progress-shimmer' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Sparkle accents on ready */}
      <AnimatePresence>
        {isReady && [0, 1, 2].map(i => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1.1, 0.5],
              rotate: [0, 180],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
            className="absolute pointer-events-none z-10"
            style={{ top: `${20 + i * 18}%`, left: i % 2 === 0 ? '8%' : '82%' }}
          >
            <Sparkles size={10} className="text-neon-gold" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Rarity indicator */}
      {slot.seed && (
        <div 
          className={`absolute top-6 left-1 w-2 h-2 rounded-full`}
          style={{
            backgroundColor: slot.seed.rarity === 'legendary' ? 'hsl(45 100% 55%)' : 
              slot.seed.rarity === 'epic' ? 'hsl(270 70% 55%)' :
              slot.seed.rarity === 'rare' ? 'hsl(210 100% 60%)' :
              slot.seed.rarity === 'uncommon' ? 'hsl(180 100% 50%)' : 
              'hsl(0 0% 70%)',
            boxShadow: `0 0 8px ${
              slot.seed.rarity === 'legendary' ? 'hsl(45 100% 55% / 0.6)' : 
              slot.seed.rarity === 'epic' ? 'hsl(270 70% 55% / 0.6)' :
              slot.seed.rarity === 'rare' ? 'hsl(210 100% 60% / 0.6)' :
              slot.seed.rarity === 'uncommon' ? 'hsl(180 100% 50% / 0.6)' : 
              'transparent'
            }`
          }}
        />
      )}
    </motion.div>
  );
};

export const GrowSlot = memo(GrowSlotComponent, (prev, next) => {
  // Re-render only when something visible actually changes
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.onTap !== next.onTap) return false;
  if (prev.onHarvest !== next.onHarvest) return false;
  if (prev.onSelect !== next.onSelect) return false;
  if (prev.onWater !== next.onWater) return false;
  if (prev.onOpenSupplies !== next.onOpenSupplies) return false;
  if (prev.solarGlowLevel !== next.solarGlowLevel) return false;
  if (prev.bioLuminLevel !== next.bioLuminLevel) return false;
  if (prev.particleLevel !== next.particleLevel) return false;
  if (prev.auraLevel !== next.auraLevel) return false;
  if (prev.disableDecorative !== next.disableDecorative) return false;
  const a = prev.slot;
  const b = next.slot;
  return (
    a.id === b.id &&
    a.isUnlocked === b.isUnlocked &&
    a.stage === b.stage &&
    Math.round(a.progress) === Math.round(b.progress) &&
    Math.round(a.budGrowth ?? 0) === Math.round(b.budGrowth ?? 0) &&
    Math.round(a.waterLevel ?? 0) === Math.round(b.waterLevel ?? 0) &&
    a.fertilizer?.id === b.fertilizer?.id &&
    a.fertilizerUsesLeft === b.fertilizerUsesLeft &&
    a.soil?.id === b.soil?.id &&
    a.seed?.id === b.seed?.id
  );
});
