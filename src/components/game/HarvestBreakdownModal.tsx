import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Leaf, Droplets, Sparkles, TrendingUp, Zap, Crown, Star } from 'lucide-react';
import { Rarity } from '@/store/gameStore';

export interface HarvestBonus {
  name: string;
  icon: string;
  multiplier: number;
  description: string;
  category: 'base' | 'fertilizer' | 'soil' | 'trait' | 'collection' | 'upgrade' | 'special';
}

export interface HarvestBreakdownData {
  strainName: string;
  rarity: Rarity;
  baseYield: number;
  yieldMin: number;
  yieldMax: number;
  finalGrams: number;
  finalGramsMin: number;
  finalGramsMax: number;
  finalQuality: number;
  bonuses: HarvestBonus[];
  totalMultiplier: number;
  isCrit: boolean;
  isDoubleHarvest: boolean;
  coinGain: number;
  resinGain: number;
  essenceGain: number;
  xpGain: number;
}

interface HarvestBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: HarvestBreakdownData | null;
}

const rarityColors: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

const rarityBgColors: Record<Rarity, string> = {
  common: 'bg-gray-500/20 border-gray-500/30',
  uncommon: 'bg-green-500/20 border-green-500/30',
  rare: 'bg-blue-500/20 border-blue-500/30',
  epic: 'bg-purple-500/20 border-purple-500/30',
  legendary: 'bg-yellow-500/20 border-yellow-500/30',
};

const categoryIcons: Record<string, React.ReactNode> = {
  base: <Leaf size={14} />,
  fertilizer: <Droplets size={14} className="text-green-400" />,
  soil: <span className="text-amber-600">🟤</span>,
  trait: <Sparkles size={14} className="text-purple-400" />,
  collection: <Crown size={14} className="text-yellow-400" />,
  upgrade: <TrendingUp size={14} className="text-blue-400" />,
  special: <Zap size={14} className="text-orange-400" />,
};

const categoryLabels: Record<string, string> = {
  base: 'Basis',
  fertilizer: 'Dünger',
  soil: 'Erde',
  trait: 'Trait',
  collection: 'Sammlung',
  upgrade: 'Upgrade',
  special: 'Spezial',
};

export const HarvestBreakdownModal: React.FC<HarvestBreakdownModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const groupedBonuses = data.bonuses.reduce((acc, bonus) => {
    if (!acc[bonus.category]) acc[bonus.category] = [];
    acc[bonus.category].push(bonus);
    return acc;
  }, {} as Record<string, HarvestBonus[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`relative w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl border ${rarityBgColors[data.rarity]} bg-card shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`relative p-4 border-b border-border/50 ${rarityBgColors[data.rarity]}`}>
              <button
                onClick={onClose}
                className="absolute right-3 top-3 p-1.5 rounded-full bg-background/50 hover:bg-background/80 transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className={`text-4xl ${data.isCrit ? 'animate-pulse' : ''}`}>🌿</div>
                <div>
                  <h2 className={`text-xl font-bold ${rarityColors[data.rarity]}`}>
                    {data.strainName}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{data.rarity}</span>
                    {data.isCrit && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold animate-pulse">
                        ⚡ KRITISCH!
                      </span>
                    )}
                    {data.isDoubleHarvest && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold">
                        🎉 DOPPELT!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
              {/* Main Result */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
                  <div className="text-2xl font-bold text-primary">
                    {data.finalGramsMin === data.finalGramsMax 
                      ? `${data.finalGrams}g`
                      : `${data.finalGramsMin}-${data.finalGramsMax}g`
                    }
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    🎲 Ertrag (RNG)
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Basis: {data.yieldMin}-{data.yieldMax}g
                  </div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-3 text-center border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-400">{data.finalQuality}%</div>
                  <div className="text-xs text-muted-foreground">Qualität</div>
                </div>
              </div>

              {/* Total Multiplier */}
              <div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 rounded-xl p-3 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Gesamt-Multiplikator</span>
                  <span className="text-xl font-bold text-green-400">
                    ×{data.totalMultiplier.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Basis: {data.baseYield} → Final: {data.finalGrams}g
                </div>
              </div>

              {/* Bonus Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Star size={14} className="text-yellow-400" />
                  Bonus-Aufschlüsselung
                </h3>
                
                {Object.entries(groupedBonuses).map(([category, bonuses]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                      {categoryIcons[category]}
                      {categoryLabels[category]}
                    </div>
                    {bonuses.map((bonus, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{bonus.icon}</span>
                          <div>
                            <div className="font-medium">{bonus.name}</div>
                            <div className="text-xs text-muted-foreground">{bonus.description}</div>
                          </div>
                        </div>
                        <span className={`font-bold ${bonus.multiplier > 1 ? 'text-green-400' : 'text-muted-foreground'}`}>
                          {bonus.multiplier > 1 ? `+${Math.round((bonus.multiplier - 1) * 100)}%` : '—'}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ))}

                {data.bonuses.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Keine aktiven Boni - nutze Dünger & bessere Erde!
                  </div>
                )}
              </div>
            </div>

            {/* Footer with rewards */}
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="text-xs text-muted-foreground mb-2">Erhaltene Belohnungen:</div>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1.5 bg-yellow-500/20 rounded-full text-sm font-bold text-yellow-400">
                  💰 {data.coinGain}
                </div>
                {data.resinGain > 0 && (
                  <div className="px-3 py-1.5 bg-amber-500/20 rounded-full text-sm font-bold text-amber-400">
                    🍯 {data.resinGain}
                  </div>
                )}
                {data.essenceGain > 0 && (
                  <div className="px-3 py-1.5 bg-purple-500/20 rounded-full text-sm font-bold text-purple-400">
                    ✨ {data.essenceGain}
                  </div>
                )}
                <div className="px-3 py-1.5 bg-blue-500/20 rounded-full text-sm font-bold text-blue-400">
                  ⭐ {data.xpGain} XP
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
