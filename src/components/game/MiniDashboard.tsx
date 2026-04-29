import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';
import { useSmartCoach } from '@/hooks/useSmartCoach';
import { TrendingUp, Sprout, Package, DollarSign, Star, Sparkles, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { getCurrentRank, getNextRank, getRankProgress, getRankStats } from '@/data/ranks';

export const MiniDashboard = () => {
  const {
    budcoins,
    level,
    xp,
    totalGramsHarvested,
    inventory,
    growSlots,
    workers,
    dealerActivities,
    reputation,
    heat,
    maxHeat,
    getReputationTier,
    getHeatLevel,
  } = useGameStore();
  const tier = getReputationTier();
  const heatLevel = getHeatLevel();
  const setActiveScreen = useNavigationStore(s => s.setActiveScreen);
  const coach = useSmartCoach();

  // Track cash gains for animations
  const [cashGains, setCashGains] = useState<{ id: number; amount: number }[]>([]);
  const prevBudcoins = useRef(budcoins);
  const prevActivityCount = useRef(dealerActivities.length);

  // Detect dealer sales and show cash animation
  useEffect(() => {
    // Check if new sale activity happened
    if (dealerActivities.length > 0 && dealerActivities.length !== prevActivityCount.current) {
      const latestActivity = dealerActivities[0];
      
      // Check for revenue-generating activities
      if (latestActivity.revenue && latestActivity.revenue > 0) {
        const gainId = Date.now();
        setCashGains(prev => [...prev, { id: gainId, amount: latestActivity.revenue! }]);
        
        // Remove after animation
        setTimeout(() => {
          setCashGains(prev => prev.filter(g => g.id !== gainId));
        }, 1500);
      }
    }
    
    prevActivityCount.current = dealerActivities.length;
  }, [dealerActivities]);

  // Also detect any budcoins increase (from other sources)
  useEffect(() => {
    const diff = budcoins - prevBudcoins.current;
    
    // Only show for larger gains not already captured by dealer activities
    if (diff > 100 && cashGains.length === 0) {
      const gainId = Date.now() + Math.random();
      setCashGains(prev => [...prev, { id: gainId, amount: diff }]);
      
      setTimeout(() => {
        setCashGains(prev => prev.filter(g => g.id !== gainId));
      }, 1500);
    }
    
    prevBudcoins.current = budcoins;
  }, [budcoins]);

  const xpForNextLevel = 100 * Math.pow(1.5, level - 1);
  const xpProgress = Math.min((xp / xpForNextLevel) * 100, 100);
  
  const activePlants = growSlots.filter(s => s.seed && s.isUnlocked).length;
  const driedGrams = inventory.filter(b => b.state === 'dried').reduce((sum, b) => sum + b.grams, 0);
  const activeWorkers = workers.filter(w => w.owned && !w.paused).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="game-card p-3 space-y-2 relative"
    >
      {/* Cash Gain Animations */}
      <AnimatePresence>
        {cashGains.map((gain, index) => (
          <motion.div
            key={gain.id}
            initial={{ opacity: 0, y: 20, scale: 0.5, x: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: [20, -10, -30, -60], 
              scale: [0.5, 1.2, 1, 0.8],
              x: index % 2 === 0 ? [0, 10, 5] : [0, -10, -5]
            }}
            exit={{ opacity: 0, y: -80 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute right-4 top-4 z-50 pointer-events-none"
            style={{ 
              top: `${20 + index * 25}px`,
            }}
          >
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neon-gold/20 border border-neon-gold/40 shadow-lg">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.3, repeat: 2 }}
                className="text-lg"
              >
                💰
              </motion.span>
              <span className="font-display font-bold text-neon-gold text-lg">
                +{gain.amount}$
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Level Progress */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 10px hsl(270 70% 55% / 0.3)',
              '0 0 20px hsl(270 70% 55% / 0.5)',
              '0 0 10px hsl(270 70% 55% / 0.3)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-neon-purple flex items-center justify-center shrink-0"
        >
          <span className="font-display font-bold text-lg text-background">{level}</span>
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Level {level}</span>
            <span className="text-xs text-muted-foreground">{Math.floor(xp)}/{Math.floor(xpForNextLevel)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-secondary to-neon-purple relative"
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Career Rank */}
      <RankWidget />

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatMini icon={<DollarSign size={14} />} value={budcoins} label="$" color="text-neon-gold" highlight={cashGains.length > 0} />
        <StatMini icon={<Sprout size={14} />} value={activePlants} label="Aktiv" color="text-primary" />
        <StatMini icon={<Package size={14} />} value={driedGrams} label="g Bereit" color="text-neon-cyan" />
        <StatMini icon={<Star size={14} />} value={totalGramsHarvested} label="g geerntet" color="text-secondary" />
      </div>

      {/* Reputation & Heat */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg bg-muted/20 px-2 py-1.5 border border-border/30"
          title={`Reputation: ${reputation} (${tier.name}). Bessere Bestellungen, bessere Kunden.`}
        >
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Reputation</span>
            <span className={tier.color}>{tier.icon} {tier.name}</span>
          </div>
          <div className="mt-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              style={{
                width: tier.next
                  ? `${Math.min(100, ((reputation - tier.min) / (tier.next - tier.min)) * 100)}%`
                  : '100%',
              }}
            />
          </div>
        </div>
        <motion.div
          animate={heatLevel.id === 'critical' ? { boxShadow: ['0 0 0 0 hsl(0 80% 55% / 0)', '0 0 12px 2px hsl(0 80% 55% / 0.5)', '0 0 0 0 hsl(0 80% 55% / 0)'] } : {}}
          transition={{ duration: 1.2, repeat: heatLevel.id === 'critical' ? Infinity : 0 }}
          className={`rounded-lg px-2 py-1.5 border ${heatLevel.id === 'critical' ? 'border-red-500/50 bg-red-500/10' : heatLevel.id === 'high' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-muted/20 border-border/30'}`}
          title={`Heat: ${heat.toFixed(0)}/${maxHeat}. Hoch = weniger Anfragen, kritisch = Verkaufseffizienz sinkt. Decay durch Businesses & sichere Gebiete.`}
        >
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Heat</span>
            <span className={heatLevel.color}>🔥 {heatLevel.name}</span>
          </div>
          <div className="mt-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={`h-full ${heatLevel.id === 'critical' ? 'bg-red-500' : heatLevel.id === 'high' ? 'bg-amber-500' : heatLevel.id === 'warm' ? 'bg-yellow-500' : 'bg-emerald-500'}`}
              style={{ width: `${heatLevel.pct}%` }}
            />
          </div>
        </motion.div>
      </div>

      {/* Worker indicator */}
      {activeWorkers > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground bg-muted/30 rounded-lg"
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            👔
          </motion.span>
          <span>{activeWorkers} Worker aktiv</span>
        </motion.div>
      )}

      {/* Next Best Action banner (Smart Coach) */}
      <AnimatePresence mode="wait">
        {coach && (
          <motion.button
            key={coach.id}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => coach.action && useNavigationStore.getState().navigateTo(coach.action, coach.focus ?? null)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-neon-purple/15 to-neon-cyan/15 border border-neon-purple/30 text-xs hover:from-neon-purple/25 hover:to-neon-cyan/25 transition-colors"
          >
            <Sparkles size={12} className="text-neon-purple flex-shrink-0" />
            <span className="font-semibold flex-1 text-left truncate">
              <span className="mr-1">{coach.icon}</span>
              {coach.text}
            </span>
            {coach.action && <ChevronRight size={12} className="text-muted-foreground" />}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface StatMiniProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  highlight?: boolean;
}

const StatMini = ({ icon, value, label, color, highlight }: StatMiniProps) => (
  <motion.div 
    animate={highlight ? { 
      scale: [1, 1.05, 1],
      boxShadow: [
        '0 0 0 0 hsl(45 100% 55% / 0)',
        '0 0 15px 3px hsl(45 100% 55% / 0.4)',
        '0 0 0 0 hsl(45 100% 55% / 0)',
      ]
    } : {}}
    transition={{ duration: 0.5 }}
    className={`flex flex-col items-center p-1.5 rounded-lg bg-muted/20 ${highlight ? 'ring-1 ring-neon-gold/50' : ''}`}
  >
    <div className={`${color} mb-0.5`}>{icon}</div>
    <motion.span
      key={value}
      initial={{ scale: 1.2, color: highlight ? 'hsl(45 100% 55%)' : undefined }}
      animate={{ scale: 1 }}
      className="text-sm font-bold"
    >
      {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
    </motion.span>
    <span className="text-[8px] text-muted-foreground">{label}</span>
  </motion.div>
);