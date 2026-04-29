import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Lock, Sparkles, Trophy } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getNextUnlock } from '@/lib/progression';
import { RoadmapModal } from './RoadmapModal';
import { getRankProgress, getRankStats } from '@/data/ranks';

export const MilestoneHUD = () => {
  const level = useGameStore(s => s.level);
  // Subscribe to a few stats so this re-renders when rank progress changes.
  useGameStore(s => s.totalGramsSold);
  useGameStore(s => s.totalSalesRevenue);
  useGameStore(s => s.totalHarvests);

  const [open, setOpen] = useState(false);

  const nextFeature = getNextUnlock(level);
  const rank = getRankProgress(getRankStats());

  // Decide whether to show rank or next feature.
  // Prefer rank if: no more feature unlocks, OR rank is >50% done and feature is >5 levels away.
  const featureLevelsLeft = nextFeature ? nextFeature.level - level : Infinity;
  const showRank =
    rank.next &&
    (!nextFeature || (rank.overall > 0.5 && featureLevelsLeft > 5));

  if (!showRank && !nextFeature) return null;

  return (
    <>
      <motion.button
        type="button"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-card/70 backdrop-blur border border-primary/20 rounded-lg shadow-sm hover:border-primary/40 transition-colors"
        aria-label={
          showRank && rank.next
            ? `Nächster Rang: ${rank.next.name}`
            : `Nächstes Feature: ${nextFeature!.title} auf Level ${nextFeature!.level}`
        }
      >
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
          {showRank
            ? <Trophy size={14} className="text-neon-gold" />
            : <Lock size={14} className="text-primary" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Sparkles size={10} className="text-primary" />
            <span>{showRank ? 'Nächster Rang' : 'Nächstes Feature'}</span>
          </div>
          <div className="text-xs font-semibold truncate">
            {showRank && rank.next ? (
              <>
                <span className={rank.next.color}>{rank.next.icon} {rank.next.name}</span>
                <span className="text-muted-foreground"> · {Math.round(rank.overall * 100)}%</span>
              </>
            ) : (
              <>
                <span className="text-primary">{nextFeature!.title}</span>
                <span className="text-muted-foreground"> · in {featureLevelsLeft} Lv.</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      </motion.button>

      <AnimatePresence>
        {open && <RoadmapModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
};
