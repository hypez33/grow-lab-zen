import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

interface ParticleEffectProps {
  show: boolean;
  type?: 'stars' | 'sparkles' | 'confetti' | 'explosion';
  color?: string;
  count?: number;
  duration?: number;
}

const PARTICLE_CONFIGS = {
  stars: {
    emoji: '⭐',
    colors: ['#FFD700', '#FFA500', '#FFFF00'],
    spread: 200,
  },
  sparkles: {
    emoji: '✨',
    colors: ['#E0FFFF', '#FFD700', '#FF69B4', '#00CED1'],
    spread: 150,
  },
  confetti: {
    emoji: '🎊',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
    spread: 180,
  },
  explosion: {
    emoji: '💥',
    colors: ['#FF4500', '#FF6347', '#FFD700', '#FFA500'],
    spread: 250,
  },
};

export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  show,
  type = 'stars',
  color,
  count = 20,
  duration = 2000,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const config = PARTICLE_CONFIGS[type];

  useEffect(() => {
    if (show) {
      const newParticles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const distance = config.spread * (0.5 + Math.random() * 0.5);
        const particleColor = color || config.colors[Math.floor(Math.random() * config.colors.length)];

        newParticles.push({
          id: Date.now() + i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          rotation: Math.random() * 360,
          scale: 0.5 + Math.random() * 0.5,
          color: particleColor,
          delay: i * 0.02,
        });
      }
      setParticles(newParticles);

      setTimeout(() => setParticles([]), duration);
    }
  }, [show, type, count, config, color, duration]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: 0,
              y: 0,
              opacity: 0,
              scale: 0,
              rotate: 0,
            }}
            animate={{
              x: particle.x,
              y: particle.y,
              opacity: [0, 1, 1, 0],
              scale: [0, particle.scale * 1.5, particle.scale, 0],
              rotate: particle.rotation,
            }}
            transition={{
              duration: duration / 1000,
              delay: particle.delay,
              ease: 'easeOut',
            }}
            className="absolute text-2xl"
            style={{ color: particle.color }}
          >
            {config.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
