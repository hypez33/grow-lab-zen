import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Leaf, Droplets, Sparkles, TrendingUp, Zap, Crown, ChevronDown, Wind, ArrowRight } from 'lucide-react';
import { Rarity, useGameStore } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';

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
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
};

const rarityBgColors: Record<Rarity, string> = {
  common: 'bg-gray-500/15 border-gray-500/30',
  uncommon: 'bg-green-500/15 border-green-500/30',
  rare: 'bg-blue-500/15 border-blue-500/30',
  epic: 'bg-purple-500/15 border-purple-500/30',
  legendary: 'bg-yellow-500/15 border-yellow-500/30',
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

function qualityGradeLabel(q: number): string {
  if (q >= 95) return 'Top Shelf';
  if (q >= 80) return 'Premium';
  if (q >= 60) return 'Standard';
  if (q >= 40) return 'Mid';
  return 'Low';
}

export const HarvestBreakdownModal: React.FC<HarvestBreakdownModalProps> = ({ isOpen, onClose, data }) => {
  const [showDetails, setShowDetails] = useState(false);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const performanceMode = useGameStore((s) => s.performanceMode);
  const lowMotion = reducedMotion || performanceMode;

  // Top bonuses (largest positive multipliers first)
  const topBonuses = useMemo(() => {
    if (!data) return [];
    return [...data.bonuses]
      .filter((b) => b.multiplier > 1)
      .sort((a, b) => b.multiplier - a.multiplier)
      .slice(0, 3);
  }, [data]);

  const groupedBonuses = useMemo(() => {
    if (!data) return {} as Record<string, HarvestBonus[]>;
    return data.bonuses.reduce((acc, bonus) => {
      if (!acc[bonus.category]) acc[bonus.category] = [];
      acc[bonus.category].push(bonus);
      return acc;
    }, {} as Record<string, HarvestBonus[]>);
  }, [data]);

  if (!data) return null;

  const goToDryRoom = () => {
    useNavigationStore.getState().setActiveScreen('dryroom');
    onClose();
  };

  const grade = qualityGradeLabel(data.finalQuality);
  const showScrap = data.coinGain > 0 && data.coinGain >= 1;

  const overlayAnim = lowMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const cardAnim = lowMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { scale: 0.9, opacity: 0, y: 16 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.9, opacity: 0, y: 16 },
        transition: { type: 'spring' as const, damping: 22, stiffness: 320 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...overlayAnim}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            {...cardAnim}
            className={`relative w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border ${rarityBgColors[data.rarity]} bg-card shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact Header */}
            <div className={`relative px-4 py-3 border-b border-border/50 ${rarityBgColors[data.rarity]}`}>
              <button
                onClick={onClose}
                aria-label="Schließen"
                className="absolute right-2 top-2 p-1.5 rounded-full bg-background/60 hover:bg-background/90 transition-colors"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-2 pr-8">
                <span className="text-2xl leading-none">🌿</span>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-base font-bold truncate ${rarityColors[data.rarity]}`}>
                    {data.strainName}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${rarityBgColors[data.rarity]} ${rarityColors[data.rarity]} border`}>
                      {data.rarity}
                    </span>
                    {data.isCrit && (
                      <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-[10px] font-bold">
                        ⚡ Krit
                      </span>
                    )}
                    {data.isDoubleHarvest && (
                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-[10px] font-bold">
                        🎉 Doppelt
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* 3 Stat Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-primary/10 rounded-xl p-2.5 text-center border border-primary/25">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Nass</div>
                  <div className="text-lg font-bold text-primary leading-tight mt-0.5">
                    {data.finalGrams}g
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">muss trocknen</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-2.5 text-center border border-yellow-500/25">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Qualität</div>
                  <div className="text-lg font-bold text-yellow-400 leading-tight mt-0.5">
                    {data.finalQuality}%
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">{grade}</div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-2.5 text-center border border-green-500/25">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Bonus</div>
                  <div className="text-lg font-bold text-green-400 leading-tight mt-0.5">
                    ×{data.totalMultiplier.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5">Erde · Dünger · Traits</div>
                </div>
              </div>

              {/* Top bonuses summary */}
              {topBonuses.length > 0 && (
                <div className="space-y-1">
                  {topBonuses.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">{b.icon}</span>
                        <span className="font-medium truncate">{b.name}</span>
                      </div>
                      <span className="font-bold text-green-400 shrink-0 ml-2">
                        +{Math.round((b.multiplier - 1) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pipeline hint */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/40 rounded-lg px-3 py-2 border border-border/40">
                <Wind size={14} className="text-primary shrink-0" />
                <span className="truncate">
                  Next: <span className="text-foreground/90 font-medium">DryRoom</span> → trocknen → verkaufen
                </span>
              </div>

              {/* Rewards (only non-zero) */}
              <div className="flex flex-wrap gap-1.5">
                {data.xpGain > 0 && (
                  <span className="px-2.5 py-1 bg-blue-500/15 border border-blue-500/25 rounded-full text-xs font-semibold text-blue-400">
                    ⭐ {data.xpGain} XP
                  </span>
                )}
                {data.resinGain > 0 && (
                  <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/25 rounded-full text-xs font-semibold text-amber-400">
                    🍯 {data.resinGain}
                  </span>
                )}
                {data.essenceGain > 0 && (
                  <span className="px-2.5 py-1 bg-purple-500/15 border border-purple-500/25 rounded-full text-xs font-semibold text-purple-400">
                    ✨ {data.essenceGain}
                  </span>
                )}
                {showScrap && (
                  <span className="px-2.5 py-1 bg-muted/40 border border-border/50 rounded-full text-[11px] font-medium text-muted-foreground">
                    Nebenfund: 💰 {data.coinGain}
                  </span>
                )}
              </div>

              {/* Details toggle */}
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 border-t border-border/40"
              >
                {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
                />
              </button>

              {showDetails && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-background/50 rounded-lg px-3 py-2">
                      <div className="text-muted-foreground">Basis</div>
                      <div className="font-semibold">
                        {data.yieldMin}–{data.yieldMax}g
                      </div>
                    </div>
                    <div className="bg-background/50 rounded-lg px-3 py-2">
                      <div className="text-muted-foreground">Final Range</div>
                      <div className="font-semibold">
                        {data.finalGramsMin === data.finalGramsMax
                          ? `${data.finalGrams}g`
                          : `${data.finalGramsMin}–${data.finalGramsMax}g`}
                      </div>
                    </div>
                    <div className="bg-background/50 rounded-lg px-3 py-2 col-span-2">
                      <div className="text-muted-foreground">Gesamt-Multiplikator</div>
                      <div className="font-semibold text-green-400">
                        ×{data.totalMultiplier.toFixed(2)} · Basis {data.baseYield} → {data.finalGrams}g
                      </div>
                    </div>
                  </div>

                  {Object.entries(groupedBonuses).map(([category, bonuses]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wide">
                        {categoryIcons[category]}
                        {categoryLabels[category]}
                      </div>
                      {bonuses.map((bonus, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="shrink-0">{bonus.icon}</span>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{bonus.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {bonus.description}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`font-bold shrink-0 ml-2 ${
                              bonus.multiplier > 1 ? 'text-green-400' : 'text-muted-foreground'
                            }`}
                          >
                            {bonus.multiplier > 1
                              ? `+${Math.round((bonus.multiplier - 1) * 100)}%`
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {data.bonuses.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-2">
                      Keine aktiven Boni – nutze Dünger & bessere Erde!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky CTA Footer */}
            <div className="px-4 py-3 border-t border-border/50 bg-background/70 backdrop-blur-sm flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-sm font-medium transition-colors border border-border/50"
              >
                Schließen
              </button>
              <button
                onClick={goToDryRoom}
                className="flex-[1.4] px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-[0_0_20px_-6px_hsl(var(--primary))]"
              >
                Zum DryRoom
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
