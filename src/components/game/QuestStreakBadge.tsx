import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, X, Check, Lock, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useQuestStreakStore, STREAK_MILESTONES } from '@/store/questStreakStore';
import { useGameStore } from '@/store/gameStore';

export const QuestStreakBadge = () => {
  const [open, setOpen] = useState(false);
  const { currentStreak, bestStreak, claimedMilestones, claimMilestone, hasUnclaimedMilestone } = useQuestStreakStore();
  const hasReward = hasUnclaimedMilestone();

  const handleClaim = (days: number) => {
    const reward = claimMilestone(days);
    if (!reward) return;
    const state = useGameStore.getState();
    switch (reward.reward.type) {
      case 'budcoins':
        useGameStore.setState({
          budcoins: state.budcoins + reward.reward.amount,
          totalCoinsEarned: state.totalCoinsEarned + reward.reward.amount,
        });
        toast.success(`💰 +${reward.reward.amount} Budcoins! (${reward.label})`);
        break;
      case 'gems':
        useGameStore.setState({ gems: state.gems + reward.reward.amount });
        toast.success(`💎 +${reward.reward.amount} Gems! (${reward.label})`);
        break;
      case 'xp':
        state.addXp(reward.reward.amount);
        toast.success(`⭐ +${reward.reward.amount} XP! (${reward.label})`);
        break;
    }
  };

  // Next milestone to display in progress text
  const nextMilestone = STREAK_MILESTONES.find(m => currentStreak < m.days);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-neon-orange/20 to-destructive/20 border border-neon-orange/40"
        aria-label={`Quest-Streak: ${currentStreak} Tage`}
      >
        <motion.span
          animate={hasReward ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ duration: 1, repeat: hasReward ? Infinity : 0 }}
          className="text-neon-orange"
        >
          <Flame size={14} />
        </motion.span>
        <span className="text-xs font-bold text-neon-orange">{currentStreak}</span>
        {hasReward && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border border-background"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="game-card w-full max-w-md p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-orange to-destructive flex items-center justify-center"
                    style={{ boxShadow: '0 0 20px hsl(30 100% 55% / 0.5)' }}
                  >
                    <Flame size={24} className="text-background" />
                  </motion.div>
                  <div>
                    <h2 className="font-display font-bold text-lg">Quest-Streak</h2>
                    <p className="text-xs text-muted-foreground">
                      {currentStreak} {currentStreak === 1 ? 'Tag' : 'Tage'} in Folge · Best: {bestStreak}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-md hover:bg-muted/40"
                  aria-label="Schließen"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Grace info */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <Shield size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-semibold">Streak-Schutz:</span> Wenn du einen Tag verpasst, bleibt dein Streak erhalten. Verpasst du zwei oder mehr, beginnt er bei 1.
                </p>
              </div>

              {/* Next milestone progress */}
              {nextMilestone && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Nächster Meilenstein</span>
                    <span className="text-foreground font-semibold">
                      {currentStreak} / {nextMilestone.days} Tage
                    </span>
                  </div>
                  <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-neon-orange to-destructive"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (currentStreak / nextMilestone.days) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Milestones list */}
              <div className="space-y-2">
                {STREAK_MILESTONES.map((m) => {
                  const claimed = claimedMilestones.includes(m.days);
                  const reached = currentStreak >= m.days;
                  const claimable = reached && !claimed;
                  return (
                    <div
                      key={m.days}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        claimable
                          ? 'bg-primary/10 border-primary/50 shadow-md shadow-primary/10'
                          : claimed
                            ? 'bg-muted/20 border-border/30 opacity-60'
                            : 'bg-muted/20 border-border/40'
                      }`}
                    >
                      <div className="text-2xl">{m.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm">{m.label}</span>
                          {claimed && <Check size={12} className="text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.days} Tage · +{m.reward.amount} {
                            m.reward.type === 'budcoins' ? 'Budcoins' :
                            m.reward.type === 'gems' ? 'Gems' : 'XP'
                          }
                        </p>
                      </div>
                      {claimable ? (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={() => handleClaim(m.days)}
                          className="btn-neon py-1.5 px-3 text-xs flex items-center gap-1"
                        >
                          <Gift size={12} />
                          Claim
                        </motion.button>
                      ) : claimed ? (
                        <span className="text-xs text-muted-foreground px-2">Erhalten</span>
                      ) : (
                        <Lock size={14} className="text-muted-foreground mr-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                Beanspruche täglich mindestens eine Quest, um deinen Streak zu erhöhen.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
