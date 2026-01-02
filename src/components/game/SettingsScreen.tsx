import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, SEED_CATALOG } from '@/store/gameStore';
import { Settings, Volume2, VolumeX, Music, Music2, Eye, EyeOff, Download, Upload, RotateCcw, Bug } from 'lucide-react';
import { toast } from 'sonner';
import { PrestigeSystem } from './PrestigeSystem';
import { AchievementBadges } from './AchievementBadges';
import { LuckyWheel } from './LuckyWheel';
import { DailyStreakSystem } from './DailyStreakSystem';
import { CheatPanel } from './CheatPanel';

export const SettingsScreen = () => {
  const { 
    soundEnabled, musicEnabled, reducedMotion, 
    toggleSound, toggleMusic, toggleReducedMotion,
    exportSave, importSave, resetGame,
    totalHarvests, totalTaps, totalCoinsEarned, gameStarted
  } = useGameStore();

  const [showDevPanel, setShowDevPanel] = useState(false);
  const [importData, setImportData] = useState('');

  const handleExport = () => {
    const data = exportSave();
    navigator.clipboard.writeText(data);
    toast.success('Save data copied to clipboard!');
  };

  const handleImport = () => {
    if (importData.trim()) {
      const success = importSave(importData.trim());
      if (success) {
        toast.success('Save imported successfully!');
        setImportData('');
      } else {
        toast.error('Invalid save data');
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure? This will delete ALL progress!')) {
      resetGame();
      toast.success('Game reset!');
    }
  };

  const daysSinceStart = Math.floor((Date.now() - gameStarted) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Settings size={24} className="text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Daily Streak */}
        <DailyStreakSystem />

        {/* Lucky Wheel */}
        <LuckyWheel />

        {/* Achievement Badges */}
        <AchievementBadges />

        {/* Prestige System */}
        <PrestigeSystem />

        {/* Sound Settings */}
        <div className="game-card p-4 space-y-3">
          <h3 className="font-display font-semibold text-muted-foreground">Audio</h3>
          
          <ToggleRow
            icon={soundEnabled ? Volume2 : VolumeX}
            label="Sound Effects"
            description="Tap and harvest sounds"
            enabled={soundEnabled}
            onToggle={toggleSound}
          />
          
          <ToggleRow
            icon={musicEnabled ? Music : Music2}
            label="Background Music"
            description="Ambient music"
            enabled={musicEnabled}
            onToggle={toggleMusic}
          />
        </div>

        {/* Accessibility */}
        <div className="game-card p-4 space-y-3">
          <h3 className="font-display font-semibold text-muted-foreground">Accessibility</h3>
          
          <ToggleRow
            icon={reducedMotion ? EyeOff : Eye}
            label="Reduced Motion"
            description="Disable animations"
            enabled={reducedMotion}
            onToggle={toggleReducedMotion}
          />
        </div>

        {/* Save Management */}
        <div className="game-card p-4 space-y-3">
          <h3 className="font-display font-semibold text-muted-foreground">Save Data</h3>
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <Download size={20} className="text-primary" />
            <div className="text-left">
              <span className="font-semibold">Export Save</span>
              <p className="text-xs text-muted-foreground">Copy save data to clipboard</p>
            </div>
          </motion.button>

          <div className="space-y-2">
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste save data here..."
              className="w-full h-20 p-3 rounded-lg bg-muted/50 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleImport}
              disabled={!importData.trim()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-secondary font-semibold transition-colors disabled:opacity-50"
            >
              <Upload size={18} />
              Import Save
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
          >
            <RotateCcw size={20} />
            <div className="text-left">
              <span className="font-semibold">Reset Game</span>
              <p className="text-xs opacity-70">Delete all progress</p>
            </div>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="game-card p-4">
          <h3 className="font-display font-semibold text-muted-foreground mb-3">Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatItem label="Days Playing" value={daysSinceStart} />
            <StatItem label="Total Harvests" value={totalHarvests} />
            <StatItem label="Total Taps" value={totalTaps} />
            <StatItem label="Coins Earned" value={totalCoinsEarned} />
          </div>
        </div>

        {/* Cheat Panel - Always visible */}
        <CheatPanel />

        {/* Dev Panel Toggle */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowDevPanel(!showDevPanel)}
          className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-muted-foreground"
        >
          <Bug size={18} />
          <span className="text-sm">Dev Info (FPS, Save, Stats)</span>
        </motion.button>

        {showDevPanel && <DevInfo />}
      </div>
    </div>
  );
};

interface ToggleRowProps {
  icon: typeof Volume2;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

const ToggleRow = ({ icon: Icon, label, description, enabled, onToggle }: ToggleRowProps) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onToggle}
    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
  >
    <Icon size={20} className={enabled ? 'text-primary' : 'text-muted-foreground'} />
    <div className="flex-1 text-left">
      <span className="font-semibold">{label}</span>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className={`w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}>
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow mt-0.5"
        animate={{ x: enabled ? 26 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  </motion.button>
);

const StatItem = ({ label, value }: { label: string; value: number }) => (
  <div className="p-3 rounded-lg bg-muted/30 text-center">
    <div className="text-lg font-bold text-foreground">{value.toLocaleString()}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

// Simplified Dev Info - just stats, no cheats (moved to CheatPanel)
const DevInfo = () => {
  const [fps, setFps] = useState(60);
  const [earningsPerMinute, setEarningsPerMinute] = useState(0);
  const [revenueHistory, setRevenueHistory] = useState<number[]>([]);
  const lastTrackedCoinsRef = useRef(0);
  
  const {
    workers,
    totalSalesRevenue,
    totalGramsSold,
    totalCoinsEarned,
  } = useGameStore();
  
  // FPS counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const countFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animationId = requestAnimationFrame(countFps);
    };
    
    animationId = requestAnimationFrame(countFps);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Track earnings per minute
  useEffect(() => {
    lastTrackedCoinsRef.current = useGameStore.getState().totalCoinsEarned;
    
    const trackEarnings = setInterval(() => {
      const currentCoins = useGameStore.getState().totalCoinsEarned;
      const earned = currentCoins - lastTrackedCoinsRef.current;
      lastTrackedCoinsRef.current = currentCoins;
      
      setRevenueHistory(prev => {
        const updated = [...prev, earned].slice(-60);
        const total = updated.reduce((a, b) => a + b, 0);
        setEarningsPerMinute(total);
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(trackEarnings);
  }, []);

  const saveSize = new Blob([localStorage.getItem('grow-lab-save') || '']).size;
  const ownedWorkers = workers.filter(w => w.owned);

  return (
    <div className="game-card p-4 font-mono text-xs space-y-3">
      <h3 className="font-display font-semibold text-muted-foreground mb-2">Dev Info</h3>
      <div className="space-y-1 text-muted-foreground">
        <div>FPS: <span className="text-primary">{fps}</span></div>
        <div>Save Size: <span className="text-primary">{(saveSize / 1024).toFixed(2)} KB</span></div>
        <div>Build: <span className="text-primary">v1.0.0</span></div>
      </div>

      {/* Live Earnings Counter */}
      <div className="border-t border-border pt-3 space-y-2">
        <h4 className="font-display font-semibold text-secondary">💰 Live-Einnahmen</h4>
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pro Minute:</span>
            <motion.span 
              key={earningsPerMinute}
              initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
              animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
              className="text-xl font-bold"
            >
              {earningsPerMinute.toLocaleString()} 💰
            </motion.span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground text-[10px]">Gesamt verdient:</span>
            <span className="text-sm text-primary">{totalCoinsEarned.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Worker Stats */}
      {ownedWorkers.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <h4 className="font-display font-semibold text-primary">Worker-Statistiken</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-primary">{ownedWorkers.length}</div>
              <div className="text-[10px] text-muted-foreground">Aktive Worker</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-primary">{totalGramsSold.toLocaleString()}g</div>
              <div className="text-[10px] text-muted-foreground">Auto-Verkauft</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center col-span-2">
              <div className="text-lg font-bold text-primary">{totalSalesRevenue.toLocaleString()} 💰</div>
              <div className="text-[10px] text-muted-foreground">Verkaufs-Einnahmen</div>
            </div>
          </div>
          <div className="space-y-1">
            {ownedWorkers.map(worker => (
              <div key={worker.id} className="flex items-center justify-between p-1.5 rounded bg-muted/20">
                <span>{worker.icon} {worker.name}</span>
                <span className="text-primary">Lv.{worker.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
