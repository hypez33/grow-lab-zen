import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Zap, Trophy } from 'lucide-react';
import { useGameSounds } from '@/hooks/useGameSounds';

interface LevelUpPopupProps {
  show: boolean;
  level: number;
  onClose: () => void;
}

export const LevelUpPopup = ({ show, level, onClose }: LevelUpPopupProps) => {
  const { playLevelUp } = useGameSounds();

  // Play sound when popup shows
  useEffect(() => {
    if (show) {
      playLevelUp();
    }
  }, [show, playLevelUp]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    angle: (360 / 20) * i,
    delay: i * 0.05,
    emoji: ['⭐', '✨', '🎉', '💫', '🌟', '🔥'][Math.floor(Math.random() * 6)]
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md"
          onClick={onClose}
        >
          {/* Background burst rays */}
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            animate={{ rotate: 360, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute w-[500px] h-[500px]"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: [0, 0.6, 0.3], scaleY: [0, 1, 1] }}
                transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }}
                className="absolute left-1/2 top-1/2 w-2 h-40 -translate-x-1/2 origin-top bg-gradient-to-b from-primary/60 to-transparent"
                style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
              />
            ))}
          </motion.div>

          {/* Particle explosion */}
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const distance = 120 + Math.random() * 80;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.5],
                  x: Math.cos(rad) * distance,
                  y: Math.sin(rad) * distance - 50,
                }}
                transition={{ delay: p.delay, duration: 1.5, ease: "easeOut" }}
                className="absolute text-2xl pointer-events-none"
              >
                {p.emoji}
              </motion.div>
            );
          })}

          {/* Main content */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="relative z-10 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute w-48 h-48 rounded-full bg-primary/30 blur-xl"
            />

            {/* Trophy icon */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative mb-4"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
              >
                <Trophy size={64} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute -inset-4 rounded-full border-2 border-yellow-400/50"
              />
            </motion.div>

            {/* Level up text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-sm font-bold text-primary uppercase tracking-widest mb-1"
              >
                Level Up!
              </motion.div>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                className="relative"
              >
                <span className="text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-orange-500 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] no-underline decoration-none border-none">
                  {level}
                </span>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute -inset-4 flex items-center justify-center"
                >
                  <Sparkles size={20} className="absolute -top-2 -right-2 text-yellow-300" />
                  <Star size={16} className="absolute -bottom-1 -left-2 text-orange-400" />
                  <Zap size={18} className="absolute top-1/2 -right-4 text-yellow-200" />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Reward badge */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 border border-primary/30"
            >
              <span className="text-sm font-semibold text-primary">
                +1 Skill Point erhalten! ⚡
              </span>
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30"
            >
              Weiter 🚀
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
