import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Gift, Calendar, Star, Zap, Crown } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

const STREAK_KEY = 'daily-login-streak';
const LAST_LOGIN_KEY = 'last-login-date';

interface StreakReward {
  day: number;
  icon: string;
  reward: { type: 'coins' | 'gems' | 'xp'; amount: number };
  bonus: string;
}

const streakRewards: StreakReward[] = [
  { day: 1, icon: '💰', reward: { type: 'coins', amount: 100 }, bonus: '+1% Wachstum' },
  { day: 2, icon: '💰', reward: { type: 'coins', amount: 200 }, bonus: '+2% Wachstum' },
  { day: 3, icon: '💎', reward: { type: 'gems', amount: 5 }, bonus: '+3% Wachstum' },
  { day: 4, icon: '💰', reward: { type: 'coins', amount: 500 }, bonus: '+4% Wachstum' },
  { day: 5, icon: '⭐', reward: { type: 'xp', amount: 100 }, bonus: '+5% Wachstum' },
  { day: 6, icon: '💎', reward: { type: 'gems', amount: 10 }, bonus: '+6% Wachstum' },
  { day: 7, icon: '👑', reward: { type: 'gems', amount: 25 }, bonus: '+10% Alles!' },
];

export const DailyStreakSystem = () => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [todayReward, setTodayReward] = useState<StreakReward | null>(null);

  useEffect(() => {
    let lastLogin: string | null = null;
    let savedStreak = 0;
    try {
      lastLogin = localStorage.getItem(LAST_LOGIN_KEY);
      const storedStreak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
      savedStreak = Number.isFinite(storedStreak) ? storedStreak : 0;
    } catch {
      lastLogin = null;
      savedStreak = 0;
    }
    const today = new Date().toDateString();

    if (!lastLogin) {
      // First time login
      setCanClaim(true);
      setCurrentStreak(0);
    } else if (lastLogin === today) {
      // Already claimed today
      setCanClaim(false);
      setCurrentStreak(savedStreak);
    } else {
      const lastDate = new Date(lastLogin);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        setCanClaim(true);
        setCurrentStreak(savedStreak);
      } else {
        // Streak broken
        setCanClaim(true);
        setCurrentStreak(0);
        localStorage.setItem(STREAK_KEY, '0');
      }
    }
  }, []);

  const handleClaim = () => {
    if (!canClaim) return;

    const newStreak = (currentStreak % 7) + 1;
    const reward = streakRewards[newStreak - 1];

    // Apply reward
    const state = useGameStore.getState();
    switch (reward.reward.type) {
      case 'coins':
        useGameStore.setState({
          budcoins: state.budcoins + reward.reward.amount,
          totalCoinsEarned: state.totalCoinsEarned + reward.reward.amount,
        });
        break;
      case 'gems':
        useGameStore.setState({ gems: state.gems + reward.reward.amount });
        break;
      case 'xp':
        state.addXp(reward.reward.amount);
        break;
    }

    // Update storage
    try {
      localStorage.setItem(STREAK_KEY, newStreak.toString());
      localStorage.setItem(LAST_LOGIN_KEY, new Date().toDateString());
    } catch {
      // Storage might be blocked; still allow claim in-memory.
    }

    setCurrentStreak(newStreak);
    setCanClaim(false);
    setTodayReward(reward);
    setShowReward(true);

    toast.success(
      <div className="flex items-center gap-2">
        <Flame className="text-neon-orange" size={20} />
        <div>
          <div className="font-bold">Tag {newStreak} Streak!</div>
          <div className="text-xs text-muted-foreground">
            +{reward.reward.amount} {reward.reward.type}
          </div>
        </div>
      </div>,
      { duration: 4000 }
    );
  };

  const nextRewardIndex = currentStreak % 7;

  return (
    <div className="game-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: canClaim ? [0, 5, -5, 0] : 0
            }}
            transition={{ duration: 1, repeat: canClaim ? Infinity : 0 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-orange to-destructive flex items-center justify-center"
          >
            <Flame size={20} className="text-background" />
          </motion.div>
          <div>
            <h3 className="font-display font-bold">Daily Streak</h3>
            <p className="text-xs text-muted-foreground">Täglich spielen für Boni!</p>
          </div>
        </div>
        <div className="text-right">
          <motion.div
            key={currentStreak}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-2xl font-display font-bold text-neon-orange flex items-center gap-1"
          >
            <Flame size={20} />
            {currentStreak}
          </motion.div>
          <div className="text-[10px] text-muted-foreground">Tage</div>
        </div>
      </div>

      {/* Streak Progress */}
      <div className="flex gap-1">
        {streakRewards.map((reward, i) => {
          const isCompleted = i < currentStreak % 7 || (currentStreak >= 7 && i < 7);
          const isCurrent = i === nextRewardIndex && canClaim;
          const isNext = i === nextRewardIndex && !canClaim;

          return (
            <motion.div
              key={i}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center p-1 transition-all
                ${isCompleted ? 'bg-primary/20 border-2 border-primary' : 
                  isCurrent ? 'bg-neon-orange/20 border-2 border-neon-orange animate-pulse' :
                  'bg-muted/30 border border-border'}
              `}
            >
              <span className="text-sm">{reward.icon}</span>
              <span className="text-[8px] font-bold text-muted-foreground">Tag {i + 1}</span>
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute text-primary"
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Claim Button */}
      <motion.button
        type="button"
        whileTap={canClaim ? { scale: 0.95 } : undefined}
        onClick={() => {
          if (canClaim) handleClaim();
        }}
        disabled={!canClaim}
        className={`w-full py-3 px-4 rounded-xl font-display font-bold flex items-center justify-center gap-2 transition-all select-none
          ${canClaim 
            ? 'bg-gradient-to-r from-neon-orange to-destructive text-background cursor-pointer' 
            : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        style={canClaim ? { boxShadow: '0 0 20px hsl(30 100% 55% / 0.4)' } : undefined}
      >
        {canClaim ? (
          <>
            <Gift size={20} />
            <span>Tag {(currentStreak % 7) + 1} abholen!</span>
          </>
        ) : (
          <>
            <Calendar size={20} />
            <span>Morgen wieder!</span>
          </>
        )}
      </motion.button>

      {/* Next Reward Preview */}
      {!canClaim && currentStreak > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Nächster Bonus: {streakRewards[nextRewardIndex].icon} {streakRewards[nextRewardIndex].bonus}
        </div>
      )}

      {/* Reward Popup */}
      <AnimatePresence>
        {showReward && todayReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReward(false)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="game-card p-6 text-center max-w-xs w-full"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-5xl mb-4"
              >
                {todayReward.icon}
              </motion.div>
              
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="text-neon-orange" size={24} />
                <span className="font-display font-bold text-2xl text-neon-orange">
                  Tag {currentStreak}!
                </span>
              </div>
              
              <p className="text-lg mb-2">
                +{todayReward.reward.amount} {
                  todayReward.reward.type === 'coins' ? 'Münzen' :
                  todayReward.reward.type === 'gems' ? 'Edelsteine' : 'XP'
                }
              </p>
              <p className="text-sm text-primary mb-4">{todayReward.bonus}</p>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReward(false)}
                className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-bold"
              >
                Super! 🔥
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
