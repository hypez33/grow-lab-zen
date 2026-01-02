import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Lock, Check, Sparkles, Gift, Coins } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

interface AchievementReward {
  coins?: number;
  gems?: number;
  seeds?: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: () => boolean;
  progress: () => { current: number; target: number };
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  reward: AchievementReward;
}

const tierColors = {
  bronze: 'from-amber-700 to-amber-900',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-yellow-600',
  diamond: 'from-cyan-300 via-blue-400 to-purple-500',
};

const tierGlow = {
  bronze: 'shadow-amber-500/30',
  silver: 'shadow-slate-400/30',
  gold: 'shadow-yellow-500/50',
  diamond: 'shadow-cyan-400/50',
};

export const AchievementBadges = () => {
  const [showPopup, setShowPopup] = useState<Achievement | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  
  const { 
    totalHarvests, totalCoinsEarned, totalTaps, level, workers, 
    discoveredSeeds, seeds, claimedAchievements, totalBreedings,
    claimAchievement 
  } = useGameStore();

  // Count legendary seeds in inventory
  const legendarySeeds = seeds.filter(s => s.rarity === 'legendary').length;

  const achievements: Achievement[] = [
    {
      id: 'first-harvest',
      name: 'Erste Ernte',
      description: 'Ernte deine erste Pflanze',
      icon: '🌿',
      requirement: () => totalHarvests >= 1,
      progress: () => ({ current: Math.min(totalHarvests, 1), target: 1 }),
      tier: 'bronze',
      reward: { coins: 100 },
    },
    {
      id: 'harvest-master',
      name: 'Ernte-Meister',
      description: 'Ernte 100 Pflanzen',
      icon: '🏆',
      requirement: () => totalHarvests >= 100,
      progress: () => ({ current: Math.min(totalHarvests, 100), target: 100 }),
      tier: 'silver',
      reward: { coins: 1000, gems: 5 },
    },
    {
      id: 'harvest-legend',
      name: 'Ernte-Legende',
      description: 'Ernte 1000 Pflanzen',
      icon: '👑',
      requirement: () => totalHarvests >= 1000,
      progress: () => ({ current: Math.min(totalHarvests, 1000), target: 1000 }),
      tier: 'gold',
      reward: { coins: 10000, gems: 25 },
    },
    {
      id: 'tap-beginner',
      name: 'Klick-Anfänger',
      description: 'Tippe 100 mal',
      icon: '👆',
      requirement: () => totalTaps >= 100,
      progress: () => ({ current: Math.min(totalTaps, 100), target: 100 }),
      tier: 'bronze',
      reward: { coins: 50 },
    },
    {
      id: 'tap-master',
      name: 'Klick-Meister',
      description: 'Tippe 10.000 mal',
      icon: '⚡',
      requirement: () => totalTaps >= 10000,
      progress: () => ({ current: Math.min(totalTaps, 10000), target: 10000 }),
      tier: 'gold',
      reward: { coins: 5000, gems: 15 },
    },
    {
      id: 'millionaire',
      name: 'Millionär',
      description: 'Verdiene 1.000.000 Münzen insgesamt',
      icon: '💰',
      requirement: () => totalCoinsEarned >= 1000000,
      progress: () => ({ current: Math.min(totalCoinsEarned, 1000000), target: 1000000 }),
      tier: 'diamond',
      reward: { coins: 50000, gems: 100 },
    },
    {
      id: 'level-10',
      name: 'Aufsteiger',
      description: 'Erreiche Level 10',
      icon: '📈',
      requirement: () => level >= 10,
      progress: () => ({ current: Math.min(level, 10), target: 10 }),
      tier: 'silver',
      reward: { coins: 500, gems: 3 },
    },
    {
      id: 'level-50',
      name: 'Veteran',
      description: 'Erreiche Level 50',
      icon: '🎖️',
      requirement: () => level >= 50,
      progress: () => ({ current: Math.min(level, 50), target: 50 }),
      tier: 'gold',
      reward: { coins: 5000, gems: 20 },
    },
    {
      id: 'first-worker',
      name: 'Arbeitgeber',
      description: 'Kaufe deinen ersten Worker',
      icon: '👔',
      requirement: () => workers.some(w => w.owned),
      progress: () => ({ current: workers.filter(w => w.owned).length > 0 ? 1 : 0, target: 1 }),
      tier: 'silver',
      reward: { coins: 300, gems: 2 },
    },
    {
      id: 'all-workers',
      name: 'Unternehmer',
      description: 'Besitze alle Worker',
      icon: '🏢',
      requirement: () => workers.every(w => w.owned),
      progress: () => ({ current: workers.filter(w => w.owned).length, target: workers.length }),
      tier: 'diamond',
      reward: { coins: 25000, gems: 50 },
    },
    {
      id: 'collector-5',
      name: 'Sammler',
      description: 'Entdecke 5 verschiedene Seeds',
      icon: '🌱',
      requirement: () => discoveredSeeds.length >= 5,
      progress: () => ({ current: Math.min(discoveredSeeds.length, 5), target: 5 }),
      tier: 'bronze',
      reward: { coins: 200 },
    },
    {
      id: 'collector-all',
      name: 'Kompletionist',
      description: 'Entdecke alle Seeds',
      icon: '📚',
      requirement: () => discoveredSeeds.length >= 14,
      progress: () => ({ current: Math.min(discoveredSeeds.length, 14), target: 14 }),
      tier: 'diamond',
      reward: { coins: 50000, gems: 75 },
    },
    // NEW: Breeding achievements
    {
      id: 'first-breed',
      name: 'Genetiker',
      description: 'Züchte deinen ersten Hybrid',
      icon: '🧬',
      requirement: () => totalBreedings >= 1,
      progress: () => ({ current: Math.min(totalBreedings, 1), target: 1 }),
      tier: 'bronze',
      reward: { coins: 150 },
    },
    {
      id: 'breed-master',
      name: 'Zucht-Meister',
      description: 'Züchte 25 Hybriden',
      icon: '🔬',
      requirement: () => totalBreedings >= 25,
      progress: () => ({ current: Math.min(totalBreedings, 25), target: 25 }),
      tier: 'silver',
      reward: { coins: 2500, gems: 10 },
    },
    {
      id: 'breed-legend',
      name: 'Zucht-Legende',
      description: 'Züchte 100 Hybriden',
      icon: '🧪',
      requirement: () => totalBreedings >= 100,
      progress: () => ({ current: Math.min(totalBreedings, 100), target: 100 }),
      tier: 'gold',
      reward: { coins: 15000, gems: 40 },
    },
    // NEW: Legendary seed achievements
    {
      id: 'legendary-1',
      name: 'Glückspilz',
      description: 'Besitze 1 Legendary Seed',
      icon: '✨',
      requirement: () => legendarySeeds >= 1,
      progress: () => ({ current: Math.min(legendarySeeds, 1), target: 1 }),
      tier: 'gold',
      reward: { coins: 3000, gems: 15 },
    },
    {
      id: 'legendary-10',
      name: 'Legendärer Sammler',
      description: 'Besitze 10 Legendary Seeds',
      icon: '💎',
      requirement: () => legendarySeeds >= 10,
      progress: () => ({ current: Math.min(legendarySeeds, 10), target: 10 }),
      tier: 'diamond',
      reward: { coins: 100000, gems: 200 },
    },
  ];

  // Check for newly unlocked achievements and show popup
  useEffect(() => {
    const unlockedNotClaimed = achievements.find(
      a => a.requirement() && !claimedAchievements.includes(a.id) && !showPopup
    );
    
    if (unlockedNotClaimed && !selectedAchievement) {
      setShowPopup(unlockedNotClaimed);
      setTimeout(() => setShowPopup(null), 3000);
    }
  }, [totalHarvests, totalCoinsEarned, totalTaps, level, workers, discoveredSeeds, totalBreedings, legendarySeeds]);

  const handleClaimReward = (achievement: Achievement) => {
    const success = claimAchievement(achievement.id, achievement.reward);
    if (success) {
      const rewardText = [];
      if (achievement.reward.coins) rewardText.push(`${achievement.reward.coins.toLocaleString()} 💰`);
      if (achievement.reward.gems) rewardText.push(`${achievement.reward.gems} 💎`);
      
      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-bold">Belohnung erhalten!</span>
          <span className="text-sm">{rewardText.join(' + ')}</span>
        </div>,
        { duration: 3000 }
      );
      setSelectedAchievement(null);
    }
  };

  const unlockedCount = achievements.filter(a => a.requirement()).length;
  const claimedCount = claimedAchievements.length;
  const unclaimedRewards = achievements.filter(a => a.requirement() && !claimedAchievements.includes(a.id)).length;

  return (
    <div className="game-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-gold to-neon-orange flex items-center justify-center">
            <Trophy size={20} className="text-background" />
          </div>
          <div>
            <h3 className="font-display font-bold">Achievements</h3>
            <p className="text-xs text-muted-foreground">{unlockedCount}/{achievements.length} freigeschaltet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unclaimedRewards > 0 && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-1 bg-neon-gold/20 px-2 py-1 rounded-full border border-neon-gold/50"
            >
              <Gift size={14} className="text-neon-gold" />
              <span className="text-xs font-bold text-neon-gold">{unclaimedRewards}</span>
            </motion.div>
          )}
          <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-full">
            <Star size={14} className="text-neon-gold" />
            <span className="text-sm font-bold">{claimedCount}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-gold to-neon-orange"
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-4 gap-2">
        {achievements.map((achievement, index) => {
          const isUnlocked = achievement.requirement();
          const isClaimed = claimedAchievements.includes(achievement.id);
          const canClaim = isUnlocked && !isClaimed;
          const progress = achievement.progress();
          const progressPercent = (progress.current / progress.target) * 100;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => canClaim && setSelectedAchievement(achievement)}
              className={`relative aspect-square rounded-xl overflow-hidden transition-all
                ${isUnlocked 
                  ? `bg-gradient-to-br ${tierColors[achievement.tier]} shadow-lg ${tierGlow[achievement.tier]}` 
                  : 'bg-muted/30 border border-border'
                }
                ${canClaim ? 'cursor-pointer ring-2 ring-neon-gold animate-pulse' : 'cursor-default'}
              `}
              title={`${achievement.name}: ${achievement.description}`}
            >
              {/* Progress ring for locked */}
              {!isUnlocked && (
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="2"
                  />
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray={`${progressPercent * 2.51} 251`}
                    initial={{ strokeDasharray: '0 251' }}
                    animate={{ strokeDasharray: `${progressPercent * 2.51} 251` }}
                  />
                </svg>
              )}

              {/* Icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                {isUnlocked ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                    className="text-2xl"
                  >
                    {achievement.icon}
                  </motion.span>
                ) : (
                  <Lock size={16} className="text-muted-foreground" />
                )}
              </div>

              {/* Claimed indicator */}
              {isClaimed && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center"
                >
                  <Check size={10} className="text-primary" />
                </motion.div>
              )}

              {/* Unclaimed reward indicator */}
              {canClaim && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-neon-gold flex items-center justify-center"
                >
                  <Gift size={10} className="text-background" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Achievement Detail Modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br ${tierColors[selectedAchievement.tier]} shadow-2xl`}
            >
              <div className="text-center space-y-4">
                <motion.span
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="text-6xl block"
                >
                  {selectedAchievement.icon}
                </motion.span>
                
                <div>
                  <h3 className="font-display font-bold text-xl text-background">{selectedAchievement.name}</h3>
                  <p className="text-background/80 text-sm">{selectedAchievement.description}</p>
                </div>

                {/* Reward display */}
                <div className="bg-background/20 rounded-xl p-4 space-y-2">
                  <div className="text-background/60 text-xs font-semibold uppercase">Belohnung</div>
                  <div className="flex items-center justify-center gap-4">
                    {selectedAchievement.reward.coins && (
                      <div className="flex items-center gap-1">
                        <Coins size={20} className="text-neon-gold" />
                        <span className="font-bold text-background">{selectedAchievement.reward.coins.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedAchievement.reward.gems && (
                      <div className="flex items-center gap-1">
                        <span className="text-xl">💎</span>
                        <span className="font-bold text-background">{selectedAchievement.reward.gems}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClaimReward(selectedAchievement)}
                  className="w-full py-3 rounded-xl bg-background text-foreground font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <Gift size={20} />
                  Belohnung abholen!
                </button>
              </div>

              {/* Confetti particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1,
                    x: Math.cos((i / 12) * Math.PI * 2) * 100,
                    y: Math.sin((i / 12) * Math.PI * 2) * 100,
                  }}
                  transition={{ duration: 1.5, delay: 0.1, repeat: Infinity, repeatDelay: 1 }}
                  className="absolute top-1/2 left-1/2 pointer-events-none"
                >
                  <Sparkles className="text-white" size={16} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock Popup (brief notification) */}
      <AnimatePresence>
        {showPopup && !selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className={`p-6 rounded-2xl bg-gradient-to-br ${tierColors[showPopup.tier]} shadow-2xl`}
            >
              <div className="text-center">
                <motion.span
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-5xl block mb-2"
                >
                  {showPopup.icon}
                </motion.span>
                <div className="font-display font-bold text-background text-lg">{showPopup.name}</div>
                <div className="text-background/80 text-sm">{showPopup.description}</div>
                <div className="mt-2 text-background/60 text-xs">Tippe auf das Badge um Belohnung abzuholen!</div>
              </div>
              
              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0 }}
                  animate={{ 
                    opacity: 0, 
                    scale: 1,
                    x: Math.cos((i / 8) * Math.PI * 2) * 80,
                    y: Math.sin((i / 8) * Math.PI * 2) * 80,
                  }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="absolute top-1/2 left-1/2"
                >
                  <Sparkles className="text-white" size={16} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
