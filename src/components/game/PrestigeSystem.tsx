import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, TrendingUp, Zap, Crown, ArrowRight } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

interface PrestigeBonuses {
  coinMultiplier: number;
  growthSpeed: number;
  critChance: number;
  seedDropRate: number;
  workerEfficiency: number;
}

export const PrestigeSystem = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { 
    totalCoinsEarned, 
    totalHarvests, 
    level,
    prestige = 0,
    prestigePoints = 0,
    resetGame 
  } = useGameStore();

  // Calculate potential prestige points based on total progress
  const calculatePrestigePoints = () => {
    const coinsContribution = Math.floor(Math.sqrt(totalCoinsEarned) / 100);
    const harvestContribution = Math.floor(totalHarvests / 50);
    const levelContribution = Math.floor(level / 5);
    return Math.max(1, coinsContribution + harvestContribution + levelContribution);
  };

  const potentialPoints = calculatePrestigePoints();
  const canPrestige = level >= 20 && totalCoinsEarned >= 50000;

  // Current bonuses from prestige
  const currentBonuses: PrestigeBonuses = {
    coinMultiplier: 1 + (prestigePoints * 0.05),
    growthSpeed: 1 + (prestigePoints * 0.03),
    critChance: prestigePoints * 0.01,
    seedDropRate: 1 + (prestigePoints * 0.02),
    workerEfficiency: 1 + (prestigePoints * 0.04),
  };

  const handlePrestige = () => {
    // Add prestige points and reset game state
    useGameStore.setState((state) => ({
      prestige: (state.prestige || 0) + 1,
      prestigePoints: (state.prestigePoints || 0) + potentialPoints,
    }));
    
    // Reset game progress but keep prestige bonuses
    resetGame();
    setShowConfirm(false);
    
    toast.success(
      <div className="flex flex-col gap-1">
        <div className="font-bold text-lg flex items-center gap-2">
          <Crown className="text-neon-gold" size={20} />
          Prestige {prestige + 1} erreicht!
        </div>
        <div className="text-sm text-muted-foreground">
          +{potentialPoints} Prestige-Punkte erhalten
        </div>
      </div>,
      { duration: 5000 }
    );
  };

  const bonusItems = [
    { label: 'Münz-Multiplikator', value: currentBonuses.coinMultiplier, icon: '💰', suffix: 'x' },
    { label: 'Wachstum', value: currentBonuses.growthSpeed, icon: '🌱', suffix: 'x' },
    { label: 'Krit-Chance', value: currentBonuses.critChance * 100, icon: '⚡', suffix: '%' },
    { label: 'Seed-Drop', value: currentBonuses.seedDropRate, icon: '🎁', suffix: 'x' },
    { label: 'Worker-Effizienz', value: currentBonuses.workerEfficiency, icon: '👔', suffix: 'x' },
  ];

  return (
    <div className="game-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-gold via-neon-orange to-neon-pink flex items-center justify-center"
          >
            <Crown size={20} className="text-background" />
          </motion.div>
          <div>
            <h3 className="font-display font-bold text-lg">Prestige System</h3>
            <p className="text-xs text-muted-foreground">Starte neu mit permanenten Boni</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-display font-bold text-neon-gold">{prestige}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Prestige</div>
        </div>
      </div>

      {/* Prestige Points Display */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-neon-gold/10 via-neon-orange/10 to-neon-pink/10 p-3 border border-neon-gold/30">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Prestige-Punkte</div>
            <div className="text-3xl font-display font-bold text-neon-gold flex items-center gap-2">
              <Sparkles size={24} className="text-neon-orange" />
              {prestigePoints}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Nächster Prestige</div>
            <div className="text-xl font-bold text-primary">+{potentialPoints} Punkte</div>
          </div>
        </div>
      </div>

      {/* Current Bonuses */}
      {prestigePoints > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Aktive Boni</h4>
          <div className="grid grid-cols-2 gap-2">
            {bonusItems.map((bonus, i) => (
              <motion.div
                key={bonus.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-2 rounded-lg bg-muted/30 flex items-center gap-2"
              >
                <span className="text-lg">{bonus.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground truncate">{bonus.label}</div>
                  <div className="text-sm font-bold text-primary">
                    {bonus.suffix === '%' ? bonus.value.toFixed(1) : bonus.value.toFixed(2)}{bonus.suffix}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Anforderungen</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded-lg border ${level >= 20 ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className={level >= 20 ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs">Level 20+</span>
            </div>
            <div className={`text-lg font-bold ${level >= 20 ? 'text-primary' : 'text-foreground'}`}>
              {level}/20 {level >= 20 && '✓'}
            </div>
          </div>
          <div className={`p-2 rounded-lg border ${totalCoinsEarned >= 50000 ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/30'}`}>
            <div className="flex items-center gap-2">
              <Star size={14} className={totalCoinsEarned >= 50000 ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-xs">50k Coins</span>
            </div>
            <div className={`text-lg font-bold ${totalCoinsEarned >= 50000 ? 'text-primary' : 'text-foreground'}`}>
              {(totalCoinsEarned / 1000).toFixed(1)}k {totalCoinsEarned >= 50000 && '✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Prestige Button */}
      <motion.button
        whileTap={canPrestige ? { scale: 0.95 } : undefined}
        onClick={() => canPrestige && setShowConfirm(true)}
        disabled={!canPrestige}
        className={`w-full py-3 px-4 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all
          ${canPrestige 
            ? 'bg-gradient-to-r from-neon-gold via-neon-orange to-neon-pink text-background glow-gold cursor-pointer' 
            : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
      >
        <Crown size={20} />
        <span>Prestige aufsteigen</span>
        <ArrowRight size={20} />
      </motion.button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="game-card p-6 max-w-sm w-full space-y-4"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-neon-gold via-neon-orange to-neon-pink flex items-center justify-center mb-4"
                >
                  <Crown size={32} className="text-background" />
                </motion.div>
                <h3 className="font-display font-bold text-xl mb-2">Prestige bestätigen?</h3>
                <p className="text-sm text-muted-foreground">
                  Dein Fortschritt wird zurückgesetzt, aber du erhältst <span className="text-neon-gold font-bold">+{potentialPoints} Prestige-Punkte</span> mit permanenten Boni!
                </p>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-center">
                ⚠️ Diese Aktion kann nicht rückgängig gemacht werden!
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 px-4 rounded-lg bg-muted text-muted-foreground font-semibold"
                >
                  Abbrechen
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrestige}
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-neon-gold to-neon-orange text-background font-bold"
                >
                  Prestige! ✨
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
