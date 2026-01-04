import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GrowSlot as GrowSlotType } from '@/store/gameStore';
import { PlantSVG } from './PlantSVG';
import { Lock, Plus, Sprout, Droplets } from 'lucide-react';

interface GrowSlotProps {
  slot: GrowSlotType;
  onTap: (e?: MouseEvent<HTMLDivElement>) => void;
  onHarvest: (e?: MouseEvent<HTMLDivElement>) => void;
  isSelected: boolean;
  onSelect: () => void;
  onOpenSupplies?: (mode: 'fertilizer' | 'soil') => void;
  onWater?: () => void;
}

export const GrowSlot = ({ slot, onTap, onHarvest, isSelected, onSelect, onOpenSupplies, onWater }: GrowSlotProps) => {
  const isReady = slot.stage === 'harvest';
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

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 aspect-square
        ${isLocked ? 'bg-muted/30' : 'game-card'}
        ${isSelected ? 'ring-2 ring-primary glow-green' : ''}
        ${isReady ? 'animate-pulse-glow' : ''}
      `}
      whileTap={{ scale: isLocked ? 1 : 0.95 }}
      onClick={handleClick}
    >
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

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
        {isLocked ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Lock size={32} />
            <span className="text-xs font-medium">Locked</span>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Plus size={32} className="text-primary/50" />
            </motion.div>
            <span className="text-xs font-medium">Empty Slot</span>
            {/* Soil badge when empty */}
            {slot.soil && (
              <button 
                onClick={handleSoilClick}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-[10px] hover:bg-muted transition-colors"
              >
                <span>{slot.soil.icon}</span>
                <span className="truncate max-w-[60px]">{slot.soil.name}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Plant visualization with growing animation */}
            <motion.div
              animate={isGrowing ? { 
                scale: [1, 1.02, 1],
                rotate: [-0.5, 0.5, -0.5]
              } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <PlantSVG 
                stage={slot.stage} 
                rarity={slot.seed!.rarity} 
                traits={slot.seed!.traits}
                size={80}
              />
            </motion.div>
            
            {/* Stage label */}
            <span className="text-xs font-bold uppercase tracking-wider text-primary mt-1">
              {slot.stage}
            </span>

            {/* Bud growth preview during flower stage */}
            {(slot.stage === 'flower' || slot.stage === 'harvest') && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px]">🌸</span>
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-pink-400 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${slot.budGrowth ?? 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-[9px] font-bold text-pink-400">
                  {Math.round(slot.budGrowth ?? 0)}%
                </span>
              </div>
            )}

            {/* Yield preview */}
            {(slot.stage === 'flower' || slot.stage === 'harvest') && slot.seed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1 mt-0.5 px-2 py-0.5 bg-primary/10 rounded-full"
              >
                <span className="text-[9px] text-muted-foreground">~</span>
                <span className="text-[10px] font-bold text-primary">
                  {Math.round(slot.seed.baseYield * (0.2 + ((slot.budGrowth ?? 0) / 100) * 0.8))}g
                </span>
              </motion.div>
            )}
          </>
        )}
      </div>

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

      {/* Progress bar with active growing shimmer */}
      {!isLocked && !isEmpty && (
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/50 overflow-hidden">
          <motion.div
            className={`h-full bg-primary relative ${isGrowing ? 'progress-shimmer' : ''}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
          {/* Growing pulse indicator on bar */}
          {isGrowing && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: '50%' }}
            />
          )}
        </div>
      )}

      {/* Passive growth indicator */}
      <AnimatePresence>
        {isGrowing && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1"
          >
            <motion.div
              animate={{ 
                y: [0, -3, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center gap-1 bg-primary/20 backdrop-blur-sm px-2 py-0.5 rounded-full"
            >
              <Sprout size={10} className="text-primary" />
              <span className="text-[8px] font-bold text-primary uppercase tracking-wider">Growing</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Harvest ready indicator */}
      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute top-6 right-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase"
          >
            Harvest!
          </motion.div>
        )}
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
