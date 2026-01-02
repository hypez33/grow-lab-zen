import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Clock, Sparkles, Star, Zap } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

interface WheelSegment {
  id: string;
  label: string;
  icon: string;
  color: string;
  reward: { type: 'coins' | 'gems' | 'seeds' | 'xp' | 'resin' | 'essence'; amount: number };
  weight: number; // Higher = more likely
}

const segments: WheelSegment[] = [
  { id: '1', label: '500', icon: '💰', color: 'hsl(45, 100%, 50%)', reward: { type: 'coins', amount: 500 }, weight: 25 },
  { id: '2', label: '3', icon: '💎', color: 'hsl(330, 100%, 65%)', reward: { type: 'gems', amount: 3 }, weight: 15 },
  { id: '3', label: '1000', icon: '💰', color: 'hsl(45, 100%, 55%)', reward: { type: 'coins', amount: 1000 }, weight: 20 },
  { id: '4', label: '50', icon: '⭐', color: 'hsl(270, 70%, 55%)', reward: { type: 'xp', amount: 50 }, weight: 20 },
  { id: '5', label: '5000', icon: '💰', color: 'hsl(45, 100%, 45%)', reward: { type: 'coins', amount: 5000 }, weight: 8 },
  { id: '6', label: '10', icon: '💎', color: 'hsl(330, 100%, 60%)', reward: { type: 'gems', amount: 10 }, weight: 5 },
  { id: '7', label: '25', icon: '🧪', color: 'hsl(180, 100%, 50%)', reward: { type: 'essence', amount: 25 }, weight: 15 },
  { id: '8', label: '50', icon: '💜', color: 'hsl(270, 70%, 50%)', reward: { type: 'resin', amount: 50 }, weight: 15 },
];

const STORAGE_KEY = 'lucky-wheel-last-spin';
const COOLDOWN_HOURS = 24;

export const LuckyWheel = () => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(false);
  const [timeUntilSpin, setTimeUntilSpin] = useState('');
  const [showReward, setShowReward] = useState<WheelSegment | null>(null);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  // Check if user can spin
  useEffect(() => {
    const checkSpinAvailability = () => {
      let lastSpinTime: number | null = null;
      try {
        const lastSpin = localStorage.getItem(STORAGE_KEY);
        if (lastSpin) {
          const parsed = parseInt(lastSpin, 10);
          if (Number.isFinite(parsed)) {
            lastSpinTime = parsed;
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        lastSpinTime = null;
      }

      if (lastSpinTime === null) {
        setCanSpin(true);
        setTimeUntilSpin('');
        return;
      }

      const now = Date.now();
      const timePassed = now - lastSpinTime;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

      if (timePassed >= cooldownMs) {
        setCanSpin(true);
        setTimeUntilSpin('');
      } else {
        setCanSpin(false);
        const remaining = cooldownMs - timePassed;
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        setTimeUntilSpin(`${hours}h ${minutes}m`);
      }
    };

    checkSpinAvailability();
    const interval = setInterval(checkSpinAvailability, 60000);
    return () => clearInterval(interval);
  }, []);

  // Weighted random selection
  const selectReward = (): WheelSegment => {
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const segment of segments) {
      random -= segment.weight;
      if (random <= 0) return segment;
    }
    return segments[0];
  };

  const handleSpin = () => {
    if (!canSpin || isSpinning) return;

    setIsSpinning(true);
    const selectedReward = selectReward();
    const segmentIndex = segments.findIndex(s => s.id === selectedReward.id);
    
    // Calculate rotation to land on the selected segment
    const segmentAngle = 360 / segments.length;
    const targetAngle = segmentIndex * segmentAngle;
    // Add multiple full rotations + target position (wheel spins clockwise, pointer at top)
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = rotation + (spins * 360) + (360 - targetAngle) - (segmentAngle / 2);

    setRotation(finalRotation);

    // After spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setShowReward(selectedReward);
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {
        // Ignore storage errors; keep in-memory cooldown.
      }
      setCanSpin(false);
      setTimeUntilSpin(`${COOLDOWN_HOURS}h 0m`);

      // Apply reward
      const state = useGameStore.getState();
      switch (selectedReward.reward.type) {
        case 'coins':
          useGameStore.setState({ 
            budcoins: state.budcoins + selectedReward.reward.amount,
            totalCoinsEarned: state.totalCoinsEarned + selectedReward.reward.amount
          });
          break;
        case 'gems':
          useGameStore.setState({ gems: state.gems + selectedReward.reward.amount });
          break;
        case 'xp':
          state.addXp(selectedReward.reward.amount);
          break;
        case 'resin':
          useGameStore.setState({ resin: state.resin + selectedReward.reward.amount });
          break;
        case 'essence':
          useGameStore.setState({ essence: state.essence + selectedReward.reward.amount });
          break;
      }

      // Generate celebration particles
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        x: 50 + (Math.random() - 0.5) * 60,
        y: 50 + (Math.random() - 0.5) * 60,
        delay: Math.random() * 0.3,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 2000);

      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-2xl">{selectedReward.icon}</span>
          <div>
            <div className="font-bold">Gewonnen!</div>
            <div className="text-sm text-muted-foreground">
              +{selectedReward.reward.amount} {selectedReward.reward.type}
            </div>
          </div>
        </div>,
        { duration: 4000 }
      );
    }, 4000);
  };

  const segmentAngle = 360 / segments.length;

  return (
    <div className="game-card p-4 space-y-4 relative overflow-hidden">
      {/* Celebration particles */}
      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 0, x: `${particle.x}%`, y: `${particle.y}%` }}
            animate={{ opacity: 0, scale: 1, y: `${particle.y - 30}%` }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, delay: particle.delay }}
            className="absolute text-xl pointer-events-none z-10"
          >
            ✨
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={canSpin ? { rotate: [0, 10, -10, 0] } : {}}
            transition={{ duration: 0.5, repeat: canSpin ? Infinity : 0, repeatDelay: 2 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-pink via-neon-purple to-neon-cyan flex items-center justify-center"
          >
            <Gift size={20} className="text-background" />
          </motion.div>
          <div>
            <h3 className="font-display font-bold">Tägliches Glücksrad</h3>
            <p className="text-xs text-muted-foreground">Drehe jeden Tag für Belohnungen!</p>
          </div>
        </div>
        {!canSpin && timeUntilSpin && (
          <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-full text-xs">
            <Clock size={12} className="text-muted-foreground" />
            <span>{timeUntilSpin}</span>
          </div>
        )}
      </div>

      {/* Wheel Container */}
      <div className="relative w-full aspect-square max-w-[280px] mx-auto">
        {/* Outer glow */}
        <motion.div
          animate={canSpin ? { 
            boxShadow: [
              '0 0 20px hsl(330 100% 65% / 0.3)',
              '0 0 40px hsl(270 70% 55% / 0.4)',
              '0 0 20px hsl(330 100% 65% / 0.3)',
            ]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full"
        />

        {/* Wheel */}
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
          className="relative w-full h-full rounded-full overflow-hidden border-4 border-border shadow-2xl"
          style={{
            background: `conic-gradient(${segments.map((seg, i) => 
              `${seg.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
            ).join(', ')})`
          }}
        >
          {/* Segment labels */}
          {segments.map((segment, i) => {
            const angle = i * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={segment.id}
                className="absolute top-1/2 left-1/2 origin-left"
                style={{
                  transform: `rotate(${angle}deg) translateX(25%)`,
                  width: '50%',
                }}
              >
                <div 
                  className="flex items-center gap-1 text-background font-bold text-sm"
                  style={{ transform: `rotate(-${angle}deg)` }}
                >
                  <span className="text-lg">{segment.icon}</span>
                  <span className="drop-shadow-lg">{segment.label}</span>
                </div>
              </div>
            );
          })}

          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-background border-4 border-primary shadow-lg flex items-center justify-center">
            <Sparkles className="text-primary" size={24} />
          </div>
        </motion.div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <motion.div
            animate={isSpinning ? { y: [0, 3, 0] } : {}}
            transition={{ duration: 0.1, repeat: isSpinning ? Infinity : 0 }}
            className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-primary drop-shadow-lg"
          />
        </div>
      </div>

      {/* Spin Button */}
      <button
        type="button"
        onClick={handleSpin}
        disabled={!canSpin || isSpinning}
        className={`w-full py-3 px-4 rounded-xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all select-none active:scale-95
          ${canSpin && !isSpinning
            ? 'bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan text-background cursor-pointer' 
            : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        style={canSpin && !isSpinning ? {
          boxShadow: '0 0 30px hsl(330 100% 65% / 0.4)'
        } : undefined}
      >
        {isSpinning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles size={20} />
            </motion.div>
            <span>Dreht...</span>
          </>
        ) : canSpin ? (
          <>
            <Zap size={20} />
            <span>Jetzt drehen!</span>
          </>
        ) : (
          <>
            <Clock size={20} />
            <span>Morgen wieder verfügbar</span>
          </>
        )}
      </button>

      {/* Reward info */}
      <div className="grid grid-cols-4 gap-1 text-center">
        {segments.slice(0, 4).map(seg => (
          <div key={seg.id} className="p-1.5 rounded-lg bg-muted/30 text-xs">
            <span className="text-sm">{seg.icon}</span>
            <div className="text-muted-foreground">{seg.label}</div>
          </div>
        ))}
      </div>

      {/* Reward Popup */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReward(null)}
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
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-6xl mb-4"
              >
                {showReward.icon}
              </motion.div>
              <h3 className="font-display font-bold text-2xl mb-2">Gewonnen!</h3>
              <p className="text-lg text-muted-foreground mb-4">
                +{showReward.reward.amount} {showReward.reward.type === 'coins' ? 'Münzen' : 
                  showReward.reward.type === 'gems' ? 'Edelsteine' :
                  showReward.reward.type === 'xp' ? 'XP' :
                  showReward.reward.type === 'resin' ? 'Harz' : 'Essenz'}
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowReward(null)}
                className="w-full py-2 px-4 rounded-lg bg-primary text-primary-foreground font-bold"
              >
                Super! 🎉
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
