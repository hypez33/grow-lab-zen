import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useCocaStore, CocaQuest } from '@/store/cocaStore';
import { ResourceIcon } from './ResourceIcon';
import { CheckCircle, Gift, Clock, Trophy, Snowflake, Leaf } from 'lucide-react';
import { toast } from 'sonner';

export const QuestsScreen = () => {
  const { quests, claimQuest, budcoins, gems } = useGameStore();
  const { cocaQuests, claimCocaQuest, cocaSeeds } = useCocaStore();
  const updateBudcoins = (amount: number) => {
    useGameStore.setState(state => ({ budcoins: state.budcoins + amount }));
  };
  const updateGems = (amount: number) => {
    useGameStore.setState(state => ({ gems: state.gems + amount }));
  };
  const addCocaSeed = () => {
    useCocaStore.setState(state => ({
      cocaSeeds: [...state.cocaSeeds, {
        id: `coca-reward-${Date.now()}`,
        name: 'Colombian Red',
        rarity: 'common' as const,
        traits: ['FastGrow'],
        baseYield: 12,
        growthSpeed: 1.2,
      }]
    }));
  };

  const dailyQuests = quests.filter(q => q.type === 'daily');
  const achievements = quests.filter(q => q.type === 'achievement');
  
  const cocaDailyQuests = cocaQuests.filter(q => q.type === 'daily');
  const cocaAchievements = cocaQuests.filter(q => q.type === 'achievement');

  const handleClaimCocaQuest = (quest: CocaQuest) => {
    const result = claimCocaQuest(quest.id);
    if (result.success && result.reward) {
      if (result.reward.type === 'budcoins') {
        updateBudcoins(result.reward.amount);
        toast.success(`💰 +${result.reward.amount}$ erhalten!`);
      } else if (result.reward.type === 'gems') {
        updateGems(result.reward.amount);
        toast.success(`💎 +${result.reward.amount} Gems erhalten!`);
      } else if (result.reward.type === 'cocaSeeds') {
        for (let i = 0; i < result.reward.amount; i++) {
          addCocaSeed();
        }
        toast.success(`🌿 +${result.reward.amount} Coca-Seeds erhalten!`);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-display font-bold text-neon-cyan">Quests</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={16} />
          <span>Resets daily</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
        {/* Weed Daily Quests */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Leaf size={20} className="text-neon-green" />
            <h2 className="font-display font-bold text-lg">Weed Daily</h2>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {dailyQuests.map((quest, index) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={() => claimQuest(quest.id)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Coca Daily Quests */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Snowflake size={20} className="text-amber-400" />
            <h2 className="font-display font-bold text-lg">Coca Labor Daily</h2>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {cocaDailyQuests.map((quest, index) => (
                <CocaQuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={() => handleClaimCocaQuest(quest)}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Weed Achievements */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={20} className="text-neon-gold" />
            <h2 className="font-display font-bold text-lg">Weed Achievements</h2>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {achievements.map((quest, index) => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={() => claimQuest(quest.id)}
                  index={index}
                  isAchievement
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Coca Achievements */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="font-display font-bold text-lg">Kartell Achievements</h2>
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {cocaAchievements.map((quest, index) => (
                <CocaQuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={() => handleClaimCocaQuest(quest)}
                  index={index}
                  isAchievement
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
};

interface QuestCardProps {
  quest: {
    id: string;
    name: string;
    description: string;
    target: number;
    progress: number;
    completed: boolean;
    claimed: boolean;
    reward: { type: 'budcoins' | 'gems' | 'seeds' | 'xp'; amount: number };
  };
  onClaim: () => void;
  index: number;
  isAchievement?: boolean;
}

const QuestCard = ({ quest, onClaim, index, isAchievement }: QuestCardProps) => {
  const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  const rewardType = quest.reward.type === 'budcoins' ? 'cash' : quest.reward.type === 'xp' ? 'essence' : quest.reward.type;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`game-card p-4 ${quest.claimed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${quest.claimed 
            ? 'bg-muted text-muted-foreground'
            : quest.completed
              ? 'bg-primary text-primary-foreground animate-pulse-glow'
              : 'bg-muted/50 text-muted-foreground'
          }
        `}>
          {quest.claimed ? (
            <CheckCircle size={20} />
          ) : (
            <span className="text-sm font-bold">{Math.floor(progressPercent)}%</span>
          )}
        </div>

        {/* Quest info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{quest.name}</h3>
          <p className="text-sm text-muted-foreground">{quest.description}</p>
          
          {/* Progress bar */}
          {!quest.claimed && (
            <div className="mt-2 h-2 bg-muted/50 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${quest.completed ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Progress text */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {quest.progress.toLocaleString()} / {quest.target.toLocaleString()}
            </span>
            {/* Reward preview */}
            <div className="flex items-center gap-1">
              <ResourceIcon type={rewardType as any} size={14} />
              <span className="text-xs font-medium text-foreground">+{quest.reward.amount}</span>
            </div>
          </div>
        </div>

        {/* Claim button */}
        {quest.completed && !quest.claimed && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClaim}
            className="btn-neon py-2 px-3 text-xs"
          >
            Claim
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

interface CocaQuestCardProps {
  quest: CocaQuest;
  onClaim: () => void;
  index: number;
  isAchievement?: boolean;
}

const CocaQuestCard = ({ quest, onClaim, index, isAchievement }: CocaQuestCardProps) => {
  const progressPercent = Math.min(100, (quest.progress / quest.target) * 100);
  
  const getRewardIcon = () => {
    switch (quest.reward.type) {
      case 'budcoins': return '💵';
      case 'gems': return '💎';
      case 'cocaSeeds': return '🌿';
      default: return '🎁';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
        quest.claimed 
          ? 'opacity-50 bg-muted/30 border-border/30' 
          : quest.completed
            ? 'bg-gradient-to-br from-amber-900/30 to-amber-800/20 border-amber-500/50 shadow-lg shadow-amber-500/20'
            : 'bg-gradient-to-br from-amber-900/10 to-amber-800/5 border-amber-500/20'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2
          ${quest.claimed 
            ? 'bg-muted border-muted-foreground/30 text-muted-foreground'
            : quest.completed
              ? 'bg-amber-500 border-amber-400 text-black animate-pulse'
              : 'bg-amber-900/30 border-amber-500/30 text-amber-400'
          }
        `}>
          {quest.claimed ? (
            <CheckCircle size={20} />
          ) : (
            <span className="text-sm font-bold">{Math.floor(progressPercent)}%</span>
          )}
        </div>

        {/* Quest info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-100">{quest.name}</h3>
          <p className="text-sm text-amber-200/60">{quest.description}</p>
          
          {/* Progress bar */}
          {!quest.claimed && (
            <div className="mt-2 h-2 bg-black/40 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${quest.completed ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-amber-700/50'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Progress text */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-amber-200/50">
              {quest.progress.toLocaleString()} / {quest.target.toLocaleString()}
            </span>
            {/* Reward preview */}
            <div className="flex items-center gap-1">
              <span>{getRewardIcon()}</span>
              <span className="text-xs font-medium text-amber-200">+{quest.reward.amount}</span>
            </div>
          </div>
        </div>

        {/* Claim button */}
        {quest.completed && !quest.claimed && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClaim}
            className="py-2 px-3 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30"
          >
            Claim
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
