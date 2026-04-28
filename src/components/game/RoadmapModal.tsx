import { motion } from 'framer-motion';
import { X, Check, Lock, ArrowRight } from 'lucide-react';
import { ALL_FEATURES, FEATURE_UNLOCKS } from '@/lib/progression';
import { useGameStore } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';

interface RoadmapModalProps {
  onClose: () => void;
}

export const RoadmapModal = ({ onClose }: RoadmapModalProps) => {
  const level = useGameStore(s => s.level);
  const navigateTo = useNavigationStore(s => s.navigateTo);

  // De-dupe features that share the same id-screen but different cards
  const items = ALL_FEATURES.filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i);

  const handleOpen = (id: string) => {
    onClose();
    // navigateTo accepts our screen id
    navigateTo(id as Parameters<typeof navigateTo>[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-full max-w-[440px] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0">
          <div>
            <h2 className="text-lg font-display font-bold text-primary">Empire Roadmap</h2>
            <p className="text-xs text-muted-foreground">Dein aktuelles Level: {level}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.map((f) => {
            const unlocked = level >= f.level;
            const isCurrent = !unlocked && f.level - level <= 1;
            return (
              <div
                key={f.id}
                className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  unlocked
                    ? 'bg-primary/5 border-primary/30'
                    : isCurrent
                      ? 'bg-secondary/10 border-secondary/40'
                      : 'bg-muted/20 border-border opacity-70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                    unlocked
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border border-border text-muted-foreground'
                  }`}
                >
                  {unlocked ? <Check size={16} /> : <Lock size={14} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold text-sm ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {f.title}
                    </h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        unlocked
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      Lv {f.level}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-secondary/30 text-secondary">
                        ALS NÄCHSTES
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  {f.reward && (
                    <p className="text-[10px] text-primary mt-1">🎁 Belohnung: {f.reward.label}</p>
                  )}
                </div>

                {unlocked && (
                  <button
                    type="button"
                    onClick={() => handleOpen(f.id)}
                    className="shrink-0 self-center w-8 h-8 rounded-md bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary"
                    aria-label={`Öffne ${f.title}`}
                  >
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};
