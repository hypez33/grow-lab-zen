import { motion } from 'framer-motion';
import { PlantStage, Rarity, useGameStore } from '@/store/gameStore';

interface PlantSVGProps {
  stage: PlantStage;
  rarity: Rarity;
  traits?: string[];
  isAnimated?: boolean;
  size?: number;
  budGrowth?: number; // 0-100, used for flower stage bud animation
}

const rarityColors: Record<Rarity, { primary: string; glow: string }> = {
  common: { primary: '#4ade80', glow: 'rgba(74, 222, 128, 0.4)' },
  uncommon: { primary: '#22d3ee', glow: 'rgba(34, 211, 238, 0.4)' },
  rare: { primary: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
  epic: { primary: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' },
  legendary: { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
};

const stageVariants = {
  seed: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity } },
  sprout: { rotate: [-2, 2, -2], transition: { duration: 3, repeat: Infinity } },
  veg: { rotate: [-3, 3, -3], transition: { duration: 2.5, repeat: Infinity } },
  flower: { scale: [1, 1.02, 1], rotate: [-2, 2, -2], transition: { duration: 2, repeat: Infinity } },
  harvest: { scale: [1, 1.05, 1], filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'], transition: { duration: 1.5, repeat: Infinity } },
};

export const PlantSVG = ({ stage, rarity, traits = [], isAnimated = true, size = 120, budGrowth = 0 }: PlantSVGProps) => {
  const colors = rarityColors[rarity];
  const hasGlitter = traits.includes('Glitter');
  const hasFrost = traits.includes('Frost');
  const hasTurbo = traits.includes('Turbo');
  
  // Get upgrade levels for visual effects
  const upgrades = useGameStore((state) => state.upgrades);
  const solarGlowLevel = upgrades.find(u => u.id === 'solar-glow')?.level ?? 0;
  const bioLuminLevel = upgrades.find(u => u.id === 'bioluminescence')?.level ?? 0;
  const particleLevel = upgrades.find(u => u.id === 'particle-trail')?.level ?? 0;
  const auraLevel = upgrades.find(u => u.id === 'aura-field')?.level ?? 0;

  // Calculate bud sizes based on budGrowth (0-100)
  const budScale = 0.3 + (budGrowth / 100) * 0.7; // 30% to 100% size
  const pistilOpacity = Math.min(1, budGrowth / 50); // Pistils fade in first half
  const trichomeOpacity = Math.max(0, (budGrowth - 50) / 50); // Trichomes appear in second half

  const renderPlant = () => {
    switch (stage) {
      case 'seed':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#5c4033" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#8b6914" />
            {/* Soil */}
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#3d2817" />
            {/* Seed */}
            <ellipse cx="60" cy="85" rx="8" ry="5" fill={colors.primary} opacity="0.8" />
          </g>
        );
      case 'sprout':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#5c4033" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#8b6914" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#3d2817" />
            {/* Stem */}
            <path d="M60 85 Q58 70 60 55" stroke={colors.primary} strokeWidth="3" fill="none" />
            {/* First leaves */}
            <ellipse cx="52" cy="60" rx="8" ry="4" fill={colors.primary} transform="rotate(-30 52 60)" />
            <ellipse cx="68" cy="60" rx="8" ry="4" fill={colors.primary} transform="rotate(30 68 60)" />
          </g>
        );
      case 'veg':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#5c4033" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#8b6914" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#3d2817" />
            {/* Main stem */}
            <path d="M60 85 Q58 65 60 40" stroke={colors.primary} strokeWidth="4" fill="none" />
            {/* Fan leaves */}
            <g fill={colors.primary}>
              <path d="M60 70 Q40 60 35 55 Q42 52 50 55 Q55 50 60 55 Q65 50 70 55 Q78 52 85 55 Q80 60 60 70" />
              <path d="M60 55 Q45 45 42 38 Q50 36 55 40 Q58 35 60 40 Q62 35 65 40 Q70 36 78 38 Q75 45 60 55" />
              <ellipse cx="40" cy="75" rx="12" ry="5" transform="rotate(-40 40 75)" />
              <ellipse cx="80" cy="75" rx="12" ry="5" transform="rotate(40 80 75)" />
            </g>
          </g>
        );
      case 'flower':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#5c4033" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#8b6914" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#3d2817" />
            {/* Main stem */}
            <path d="M60 85 Q58 60 60 30" stroke={colors.primary} strokeWidth="4" fill="none" />
            {/* Fan leaves */}
            <g fill={colors.primary} opacity="0.9">
              <path d="M60 70 Q40 60 35 55 Q42 52 50 55 Q55 50 60 55 Q65 50 70 55 Q78 52 85 55 Q80 60 60 70" />
              <ellipse cx="38" cy="78" rx="14" ry="5" transform="rotate(-45 38 78)" />
              <ellipse cx="82" cy="78" rx="14" ry="5" transform="rotate(45 82 78)" />
            </g>
            
            {/* Growing Buds with animation */}
            <g transform={`translate(60, 30) scale(${budScale})`}>
              {/* Main bud body */}
              <motion.ellipse 
                cx="0" cy="0" 
                rx={12} ry={15} 
                fill={colors.primary}
                animate={{ 
                  rx: [12, 13, 12],
                  ry: [15, 16, 15],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <ellipse cx="0" cy="0" rx="8" ry="10" fill={hasFrost ? '#e0f2fe' : colors.primary} opacity="0.7" />
              
              {/* Growing pistils (orange hairs) - fade in based on growth */}
              <g stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" opacity={pistilOpacity}>
                <motion.line 
                  x1="-5" y1="-8" x2="-10" y2="-15"
                  animate={{ x2: [-10, -12, -10], y2: [-15, -18, -15] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.line 
                  x1="0" y1="-12" x2="0" y2="-20"
                  animate={{ y2: [-20, -23, -20] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.line 
                  x1="5" y1="-8" x2="10" y2="-15"
                  animate={{ x2: [10, 12, 10], y2: [-15, -18, -15] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
                <motion.line 
                  x1="-8" y1="0" x2="-14" y2="-3"
                  animate={{ x2: [-14, -16, -14] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <motion.line 
                  x1="8" y1="0" x2="14" y2="-3"
                  animate={{ x2: [14, 16, 14] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                />
              </g>
              
              {/* Trichomes (white crystals) - appear later in growth */}
              <g fill="#fff" opacity={trichomeOpacity * 0.8}>
                <motion.circle 
                  cx="-6" cy="-5" r="1.5"
                  animate={{ r: [1.5, 2, 1.5], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.circle 
                  cx="4" cy="-8" r="1"
                  animate={{ r: [1, 1.5, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
                <motion.circle 
                  cx="7" cy="-2" r="1.5"
                  animate={{ r: [1.5, 2, 1.5] }}
                  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
                <circle cx="-4" cy="5" r="1" />
                <circle cx="5" cy="3" r="1.2" />
              </g>
            </g>

            {/* Side buds that grow as budGrowth increases */}
            {budGrowth > 30 && (
              <g transform={`translate(42, 55) scale(${budScale * 0.6})`}>
                <motion.ellipse 
                  cx="0" cy="0" rx="8" ry="10" 
                  fill={colors.primary}
                  animate={{ rx: [8, 9, 8], ry: [10, 11, 10] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <g stroke="#f97316" strokeWidth="1" strokeLinecap="round" opacity={pistilOpacity}>
                  <line x1="-3" y1="-6" x2="-6" y2="-10" />
                  <line x1="0" y1="-8" x2="0" y2="-13" />
                  <line x1="3" y1="-6" x2="6" y2="-10" />
                </g>
              </g>
            )}
            {budGrowth > 30 && (
              <g transform={`translate(78, 55) scale(${budScale * 0.6})`}>
                <motion.ellipse 
                  cx="0" cy="0" rx="8" ry="10" 
                  fill={colors.primary}
                  animate={{ rx: [8, 9, 8], ry: [10, 11, 10] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
                <g stroke="#f97316" strokeWidth="1" strokeLinecap="round" opacity={pistilOpacity}>
                  <line x1="-3" y1="-6" x2="-6" y2="-10" />
                  <line x1="0" y1="-8" x2="0" y2="-13" />
                  <line x1="3" y1="-6" x2="6" y2="-10" />
                </g>
              </g>
            )}

            {/* Extra buds appear at higher growth */}
            {budGrowth > 60 && (
              <>
                <g transform={`translate(50, 45) scale(${budScale * 0.4})`}>
                  <ellipse cx="0" cy="0" rx="6" ry="8" fill={colors.primary} />
                  <line x1="0" y1="-6" x2="0" y2="-10" stroke="#f97316" strokeWidth="1" />
                </g>
                <g transform={`translate(70, 45) scale(${budScale * 0.4})`}>
                  <ellipse cx="0" cy="0" rx="6" ry="8" fill={colors.primary} />
                  <line x1="0" y1="-6" x2="0" y2="-10" stroke="#f97316" strokeWidth="1" />
                </g>
              </>
            )}
          </g>
        );
      case 'harvest':
        return (
          <g>
            {/* Pot with glow */}
            <ellipse cx="60" cy="100" rx="40" ry="12" fill={colors.glow} opacity="0.5" />
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#5c4033" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#8b6914" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#3d2817" />
            {/* Thick stem */}
            <path d="M60 85 Q57 55 60 25" stroke={colors.primary} strokeWidth="5" fill="none" />
            {/* Dense fan leaves */}
            <g fill={colors.primary} opacity="0.85">
              <ellipse cx="35" cy="80" rx="16" ry="6" transform="rotate(-50 35 80)" />
              <ellipse cx="85" cy="80" rx="16" ry="6" transform="rotate(50 85 80)" />
              <path d="M60 72 Q38 60 32 52 Q42 48 52 52 Q56 46 60 52 Q64 46 68 52 Q78 48 88 52 Q82 60 60 72" />
            </g>
            {/* Big dense buds */}
            <g filter={`drop-shadow(0 0 8px ${colors.glow})`}>
              <ellipse cx="60" cy="32" rx="18" ry="22" fill={colors.primary} />
              <ellipse cx="60" cy="32" rx="14" ry="16" fill={hasFrost ? '#e0f2fe' : colors.primary} opacity="0.6" />
              {/* Trichomes / frost */}
              <g fill="#fff" opacity="0.7">
                <circle cx="52" cy="25" r="2" />
                <circle cx="58" cy="20" r="1.5" />
                <circle cx="65" cy="23" r="2" />
                <circle cx="68" cy="30" r="1.5" />
                <circle cx="55" cy="35" r="2" />
                <circle cx="62" cy="38" r="1.5" />
              </g>
              {/* Orange pistils */}
              <g stroke="#f97316" strokeWidth="1.5" strokeLinecap="round">
                <line x1="50" y1="28" x2="45" y2="22" />
                <line x1="55" y1="22" x2="52" y2="16" />
                <line x1="60" y1="20" x2="60" y2="12" />
                <line x1="65" y1="22" x2="68" y2="16" />
                <line x1="70" y1="28" x2="75" y2="22" />
              </g>
            </g>
            {/* Sparkles for harvest ready */}
            {hasGlitter && (
              <g fill="#fbbf24">
                <circle cx="40" cy="30" r="2" opacity="0.8" />
                <circle cx="80" cy="35" r="2.5" opacity="0.9" />
                <circle cx="55" cy="45" r="1.5" opacity="0.7" />
                <circle cx="75" cy="50" r="2" opacity="0.8" />
              </g>
            )}
          </g>
        );
    }
  };

  // Calculate glow intensity based on upgrades
  const glowIntensity = solarGlowLevel * 5;
  const baseFilter = stage === 'harvest' ? `drop-shadow(0 0 12px ${colors.glow})` : '';
  const upgradeGlow = solarGlowLevel > 0 ? `drop-shadow(0 0 ${glowIntensity + 8}px ${colors.glow})` : '';
  const combinedFilter = [baseFilter, upgradeGlow].filter(Boolean).join(' ');

  return (
    <motion.div className="relative" style={{ width: size, height: size }}>
      {/* Aura Field Effect */}
      {auraLevel > 0 && stage !== 'seed' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            opacity: 0.3 + auraLevel * 0.15,
          }}
          animate={{
            scale: [1, 1.15 + auraLevel * 0.05, 1],
            opacity: [0.3 + auraLevel * 0.15, 0.15, 0.3 + auraLevel * 0.15],
          }}
          transition={{ duration: 2 - auraLevel * 0.3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      {/* Floating Particles Effect */}
      {particleLevel > 0 && stage !== 'seed' && (
        <>
          {[...Array(particleLevel * 2 + 2)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 3,
                height: 3 + Math.random() * 3,
                backgroundColor: colors.primary,
                left: `${20 + Math.random() * 60}%`,
                bottom: `${20 + Math.random() * 40}%`,
                boxShadow: `0 0 6px ${colors.primary}`,
              }}
              animate={{
                y: [-10, -40 - Math.random() * 30],
                x: [0, (Math.random() - 0.5) * 20],
                opacity: [0.8, 0],
                scale: [1, 0.5],
              }}
              transition={{
                duration: 2 + Math.random(),
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
      
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        animate={isAnimated ? stageVariants[stage] : undefined}
        style={{ filter: combinedFilter || undefined }}
      >
        {/* Bioluminescence pulse rings */}
        {bioLuminLevel > 0 && stage !== 'seed' && (
          <>
            {[...Array(bioLuminLevel)].map((_, i) => (
              <motion.circle
                key={i}
                cx="60"
                cy="55"
                r="25"
                fill="none"
                stroke={colors.primary}
                strokeWidth="1"
                animate={{
                  r: [25, 45 + i * 5],
                  opacity: [0.5, 0],
                  strokeWidth: [2, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
        
        {renderPlant()}
        
        {/* Turbo effect */}
        {hasTurbo && stage !== 'seed' && (
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            opacity="0.3"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.svg>
    </motion.div>
  );
};