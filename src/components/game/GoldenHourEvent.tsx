import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Clock, Zap, Gift, Star, Sparkles } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';

interface GoldenHourState {
  isActive: boolean;
  timeRemaining: number;
  multiplier: number;
  type: 'coins' | 'growth' | 'drops' | 'xp';
}

const eventTypes = [
  { type: 'coins' as const, name: 'Goldener Regen', icon: '💰', color: 'from-neon-gold to-neon-orange', multiplier: 2 },
  { type: 'growth' as const, name: 'Turbo-Wachstum', icon: '🌱', color: 'from-neon-green to-neon-cyan', multiplier: 3 },
  { type: 'drops' as const, name: 'Glücksregen', icon: '🍀', color: 'from-neon-purple to-neon-pink', multiplier: 2.5 },
  { type: 'xp' as const, name: 'Weisheits-Boost', icon: '⭐', color: 'from-neon-cyan to-neon-purple', multiplier: 2 },
];

export const GoldenHourEvent = () => {
  const [event, setEvent] = useState<GoldenHourState>({
    isActive: false,
    timeRemaining: 0,
    multiplier: 1,
    type: 'coins'
  });
  const [nextEventIn, setNextEventIn] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number }[]>([]);

  const level = useGameStore(state => state.level);

  // Generate particles during event
  useEffect(() => {
    if (!event.isActive) {
      setParticles([]);
      return;
    }

    const interval = setInterval(() => {
      const newParticle = {
        id: Date.now(),
        x: Math.random() * 100,
        delay: Math.random() * 0.5
      };
      setParticles(prev => [...prev.slice(-20), newParticle]);
    }, 300);

    return () => clearInterval(interval);
  }, [event.isActive]);

  // Event timer
  useEffect(() => {
    const interval = setInterval(() => {
      setEvent(prev => {
        if (prev.isActive && prev.timeRemaining > 0) {
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        } else if (prev.isActive && prev.timeRemaining <= 0) {
          toast.info('🌙 Golden Hour beendet!', { duration: 3000 });
          return { ...prev, isActive: false };
        }
        return prev;
      });

      setNextEventIn(prev => {
        if (prev > 0) return prev - 1;
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Random event trigger (every 5-15 minutes in real time, scaled for demo)
  useEffect(() => {
    const triggerEvent = () => {
      if (event.isActive || level < 3) return;

      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const duration = 60 + Math.floor(Math.random() * 60); // 60-120 seconds

      setEvent({
        isActive: true,
        timeRemaining: duration,
        multiplier: randomType.multiplier,
        type: randomType.type
      });

      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);

      toast.success(
        <div className="flex items-center gap-2">
          <span className="text-2xl">{randomType.icon}</span>
          <div>
            <div className="font-bold">{randomType.name} aktiv!</div>
            <div className="text-xs text-muted-foreground">{randomType.multiplier}x Bonus für {duration}s</div>
          </div>
        </div>,
        { duration: 5000 }
      );

      // Set next event timer (3-8 minutes)
      setNextEventIn(180 + Math.floor(Math.random() * 300));
    };

    // Initial check after 30 seconds, then every 60 seconds
    const initialTimeout = setTimeout(triggerEvent, 30000);
    const interval = setInterval(() => {
      if (!event.isActive && nextEventIn <= 0) {
        triggerEvent();
      }
    }, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [event.isActive, level, nextEventIn]);

  const currentEventType = eventTypes.find(e => e.type === event.type) || eventTypes[0];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!event.isActive && level < 3) {
    return null;
  }

  return (
    <>
      {/* Event Banner */}
      <AnimatePresence>
        {event.isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden"
          >
            <motion.div
              className={`relative p-3 bg-gradient-to-r ${currentEventType.color} rounded-xl overflow-hidden`}
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(255,215,0,0.3)',
                  '0 0 40px rgba(255,215,0,0.5)',
                  '0 0 20px rgba(255,215,0,0.3)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {/* Animated background particles */}
              {particles.map(particle => (
                <motion.div
                  key={particle.id}
                  initial={{ y: -20, x: `${particle.x}%`, opacity: 1, scale: 0.5 }}
                  animate={{ y: 100, opacity: 0, scale: 1 }}
                  transition={{ duration: 2, delay: particle.delay }}
                  className="absolute text-lg pointer-events-none"
                >
                  {currentEventType.icon}
                </motion.div>
              ))}

              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {currentEventType.icon}
                  </motion.div>
                  <div>
                    <div className="font-display font-bold text-background flex items-center gap-2">
                      <Sun size={16} />
                      {currentEventType.name}
                    </div>
                    <div className="text-xs text-background/80">
                      {currentEventType.multiplier}x Bonus aktiv!
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-background/20 rounded-full px-3 py-1">
                  <Clock size={14} className="text-background" />
                  <motion.span
                    key={event.timeRemaining}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="font-display font-bold text-background text-lg"
                  >
                    {formatTime(event.timeRemaining)}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini indicator when no event */}
      {!event.isActive && nextEventIn > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground"
        >
          <Sparkles size={12} />
          <span>Nächstes Event in {formatTime(nextEventIn)}</span>
        </motion.div>
      )}

      {/* Full screen notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15 }}
              className={`p-8 rounded-full bg-gradient-to-r ${currentEventType.color}`}
              style={{ boxShadow: '0 0 100px rgba(255,215,0,0.5)' }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-6xl"
              >
                {currentEventType.icon}
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Export event state hook for use in other components
export const useGoldenHour = () => {
  const [isActive, setIsActive] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [type, setType] = useState<'coins' | 'growth' | 'drops' | 'xp'>('coins');

  return { isActive, multiplier, type };
};
