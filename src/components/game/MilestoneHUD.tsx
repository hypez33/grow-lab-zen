import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getNextUnlock } from '@/lib/progression';
import { RoadmapModal } from './RoadmapModal';

export const MilestoneHUD = () => {
  const level = useGameStore(s => s.level);
  const xp = useGameStore(s => s.xp);
  const [open, setOpen] = useState(false);

  const next = getNextUnlock(level);
  if (!next) return null;

  // Rough progress: levels remaining (1 - linear). xp shown as bonus signal.
  const levelsLeft = next.level - level;

  return (
    <>
      <motion.button
        type="button"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-card/70 backdrop-blur border border-primary/20 rounded-lg shadow-sm hover:border-primary/40 transition-colors"
        aria-label={`Nächstes Feature: ${next.title} auf Level ${next.level}`}
      >
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
          <Lock size={14} className="text-primary" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            <Sparkles size={10} className="text-primary" />
            <span>Nächstes Feature</span>
          </div>
          <div className="text-xs font-semibold truncate">
            <span className="text-primary">{next.title}</span>
            <span className="text-muted-foreground"> · in {levelsLeft} Lv.</span>
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
