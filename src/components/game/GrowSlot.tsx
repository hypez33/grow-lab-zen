import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GrowSlot as GrowSlotType } from '@/store/gameStore';
import { PlantSVG } from './PlantSVG';
import { Lock, Plus, Sprout } from 'lucide-react';

interface GrowSlotProps {
  slot: GrowSlotType;
  onTap: (e?: MouseEvent<HTMLDivElement>) => void;
  onHarvest: (e?: MouseEvent<HTMLDivElement>) => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const GrowSlot = ({ slot, onTap, onHarvest, isSelected, onSelect }: GrowSlotProps) => {
  const isReady = slot.stage === 'harvest';
  const isEmpty = !slot.seed;
  const isLocked = !slot.isUnlocked;
  const isGrowing = !isEmpty && !isReady && !isLocked;

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

  const progressPercent = slot.progress;

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
          </>
        )}
      </div>

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
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase"
          >
            Harvest!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rarity indicator */}
      {slot.seed && (
        <div 
          className={`absolute top-2 left-2 w-2 h-2 rounded-full`}
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
