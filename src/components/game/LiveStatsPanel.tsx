import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Zap, BarChart3, Clock, Flame, Target, Award } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';

interface StatData {
  value: number;
  history: number[];
  trend: 'up' | 'down' | 'stable';
}

export const LiveStatsPanel = () => {
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState<Record<string, StatData>>({
    coinsPerMinute: { value: 0, history: [], trend: 'stable' },
    harvestsPerHour: { value: 0, history: [], trend: 'stable' },
    activeTime: { value: 0, history: [], trend: 'stable' },
    efficiency: { value: 0, history: [], trend: 'stable' },
  });

  const lastCoinsRef = useRef(0);
  const lastHarvestsRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  const { totalCoinsEarned, totalHarvests, workers, growSlots, level } = useGameStore();

  // Track stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      const coinsEarned = totalCoinsEarned - lastCoinsRef.current;
      const harvestsDone = totalHarvests - lastHarvestsRef.current;
      
      setStats(prev => {
        const coinsHistory = [...prev.coinsPerMinute.history, coinsEarned].slice(-60);
        const coinsPerMin = coinsHistory.reduce((a, b) => a + b, 0);
        const coinsTrend = coinsPerMin > prev.coinsPerMinute.value ? 'up' : 
                          coinsPerMin < prev.coinsPerMinute.value ? 'down' : 'stable';

        const harvestHistory = [...prev.harvestsPerHour.history, harvestsDone].slice(-60);
        const harvestsPerHour = harvestHistory.reduce((a, b) => a + b, 0) * 60;

        const activeMinutes = Math.floor((Date.now() - sessionStartRef.current) / 60000);
        
        const activeSlots = growSlots.filter(s => s.isUnlocked && s.seed).length;
        const totalSlots = growSlots.filter(s => s.isUnlocked).length;
        const efficiency = totalSlots > 0 ? Math.round((activeSlots / totalSlots) * 100) : 0;

        return {
          coinsPerMinute: { value: coinsPerMin, history: coinsHistory, trend: coinsTrend },
          harvestsPerHour: { value: harvestsPerHour, history: harvestHistory, trend: 'stable' },
          activeTime: { value: activeMinutes, history: [], trend: 'stable' },
          efficiency: { value: efficiency, history: [], trend: efficiency > prev.efficiency.value ? 'up' : 'stable' },
        };
      });

      lastCoinsRef.current = totalCoinsEarned;
      lastHarvestsRef.current = totalHarvests;
    }, 1000);

    return () => clearInterval(interval);
  }, [totalCoinsEarned, totalHarvests, growSlots]);

  const activeWorkers = workers.filter(w => w.owned).length;
  const activePlants = growSlots.filter(s => s.seed && s.isUnlocked).length;

  const trendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp size={12} className="text-primary" />;
    if (trend === 'down') return <TrendingUp size={12} className="text-destructive rotate-180" />;
    return <Activity size={12} className="text-muted-foreground" />;
  };

  return (
    <motion.div
      layout
      className="game-card overflow-hidden"
    >
      {/* Header - always visible */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between cursor-pointer touch-manipulation"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <BarChart3 size={16} className="text-primary" />
          </motion.div>
          <div className="text-left">
            <div className="font-display font-bold text-sm">Live-Statistiken</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
              <span className="flex items-center gap-1">
                {trendIcon(stats.coinsPerMinute.trend)}
                {stats.coinsPerMinute.value.toLocaleString()}/min
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {activePlants > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">
                🌱
              </span>
            )}
            {activeWorkers > 0 && (
              <span className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center text-[10px]">
                👔
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-muted-foreground"
          >
            ▼
          </motion.div>
        </div>
      </motion.button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Mini Chart */}
              <div className="h-16 flex items-end gap-0.5 bg-muted/30 rounded-lg p-2">
                {stats.coinsPerMinute.history.slice(-30).map((value, i) => {
                  const maxVal = Math.max(...stats.coinsPerMinute.history, 1);
                  const height = (value / maxVal) * 100;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 2)}%` }}
                      className="flex-1 bg-primary/60 rounded-t-sm min-h-[2px]"
                      style={{
                        opacity: 0.3 + (i / 30) * 0.7
                      }}
                    />
                  );
                })}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard
                  icon={<Flame className="text-neon-orange" size={16} />}
                  label="Münzen/Min"
                  value={stats.coinsPerMinute.value.toLocaleString()}
                  suffix="💰"
                  trend={stats.coinsPerMinute.trend}
                />
                <StatCard
                  icon={<Target className="text-primary" size={16} />}
                  label="Ernten/Std"
                  value={stats.harvestsPerHour.value.toString()}
                  suffix="🌿"
                />
                <StatCard
                  icon={<Clock className="text-secondary" size={16} />}
                  label="Session"
                  value={stats.activeTime.value.toString()}
                  suffix="min"
                />
                <StatCard
                  icon={<Zap className="text-neon-gold" size={16} />}
                  label="Effizienz"
                  value={stats.efficiency.value.toString()}
                  suffix="%"
                  highlight={stats.efficiency.value >= 80}
                />
              </div>

              {/* Activity Summary */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-primary">🌱</span>
                    <span>{activePlants} aktiv</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-secondary">👔</span>
                    <span>{activeWorkers} Worker</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Award size={12} />
                  <span>Lv.{level}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  highlight?: boolean;
}

const StatCard = ({ icon, label, value, suffix, trend, highlight }: StatCardProps) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className={`p-2 rounded-lg border transition-colors ${
      highlight ? 'border-primary/50 bg-primary/10' : 'border-border bg-muted/20'
    }`}
  >
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {trend && trend !== 'stable' && (
        <TrendingUp 
          size={10} 
          className={`ml-auto ${trend === 'up' ? 'text-primary' : 'text-destructive rotate-180'}`} 
        />
      )}
    </div>
    <div className="flex items-baseline gap-1">
      <motion.span
        key={value}
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        className={`text-lg font-bold ${highlight ? 'text-primary' : 'text-foreground'}`}
      >
        {value}
      </motion.span>
      {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
    </div>
  </motion.div>
);
