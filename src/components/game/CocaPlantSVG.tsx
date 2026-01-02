import { motion } from 'framer-motion';

export type CocaPlantStage = 'seed' | 'sprout' | 'bush' | 'flowering' | 'harvest';
export type CocaRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface CocaPlantSVGProps {
  stage: CocaPlantStage;
  rarity: CocaRarity;
  traits?: string[];
  isAnimated?: boolean;
  size?: number;
}

const rarityColors: Record<CocaRarity, { primary: string; glow: string; leaf: string }> = {
  common: { primary: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', leaf: '#16a34a' },
  uncommon: { primary: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', leaf: '#0891b2' },
  rare: { primary: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', leaf: '#4f46e5' },
  epic: { primary: '#d946ef', glow: 'rgba(217, 70, 239, 0.4)', leaf: '#c026d3' },
  legendary: { primary: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', leaf: '#d97706' },
};

const stageVariants = {
  seed: { scale: [1, 1.05, 1], transition: { duration: 2, repeat: Infinity } },
  sprout: { rotate: [-1, 1, -1], transition: { duration: 3, repeat: Infinity } },
  bush: { rotate: [-2, 2, -2], transition: { duration: 2.5, repeat: Infinity } },
  flowering: { scale: [1, 1.02, 1], rotate: [-1, 1, -1], transition: { duration: 2, repeat: Infinity } },
  harvest: { scale: [1, 1.04, 1], filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'], transition: { duration: 1.5, repeat: Infinity } },
};

export const CocaPlantSVG = ({ stage, rarity, traits = [], isAnimated = true, size = 120 }: CocaPlantSVGProps) => {
  const colors = rarityColors[rarity];

  const renderPlant = () => {
    switch (stage) {
      case 'seed':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#8B4513" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#A0522D" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#654321" />
            {/* Coca seed */}
            <ellipse cx="60" cy="84" rx="6" ry="4" fill={colors.primary} opacity="0.9" />
            <ellipse cx="58" cy="83" rx="2" ry="1" fill="#fff" opacity="0.3" />
          </g>
        );
      case 'sprout':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#8B4513" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#A0522D" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#654321" />
            {/* Stem */}
            <path d="M60 85 Q58 72 60 60" stroke={colors.primary} strokeWidth="2.5" fill="none" />
            {/* Small oval coca leaves */}
            <ellipse cx="52" cy="65" rx="8" ry="5" fill={colors.leaf} transform="rotate(-20 52 65)" />
            <ellipse cx="68" cy="65" rx="8" ry="5" fill={colors.leaf} transform="rotate(20 68 65)" />
            {/* Leaf veins */}
            <path d="M48 65 L56 65" stroke={colors.primary} strokeWidth="0.5" opacity="0.5" />
            <path d="M64 65 L72 65" stroke={colors.primary} strokeWidth="0.5" opacity="0.5" />
          </g>
        );
      case 'bush':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#8B4513" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#A0522D" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#654321" />
            {/* Main stem */}
            <path d="M60 85 Q58 60 60 40" stroke={colors.primary} strokeWidth="3" fill="none" />
            {/* Side branches */}
            <path d="M60 70 Q50 65 40 70" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 70 Q70 65 80 70" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 55 Q48 50 38 55" stroke={colors.leaf} strokeWidth="1.5" fill="none" />
            <path d="M60 55 Q72 50 82 55" stroke={colors.leaf} strokeWidth="1.5" fill="none" />
            {/* Coca leaves - oval shaped */}
            <g fill={colors.leaf}>
              <ellipse cx="40" cy="70" rx="10" ry="6" transform="rotate(-15 40 70)" />
              <ellipse cx="80" cy="70" rx="10" ry="6" transform="rotate(15 80 70)" />
              <ellipse cx="38" cy="55" rx="9" ry="5" transform="rotate(-20 38 55)" />
              <ellipse cx="82" cy="55" rx="9" ry="5" transform="rotate(20 82 55)" />
              <ellipse cx="50" cy="45" rx="8" ry="5" transform="rotate(-10 50 45)" />
              <ellipse cx="70" cy="45" rx="8" ry="5" transform="rotate(10 70 45)" />
              <ellipse cx="60" cy="38" rx="7" ry="4" />
            </g>
            {/* Leaf veins */}
            <g stroke={colors.primary} strokeWidth="0.5" opacity="0.4">
              <line x1="32" y1="70" x2="48" y2="70" />
              <line x1="72" y1="70" x2="88" y2="70" />
            </g>
          </g>
        );
      case 'flowering':
        return (
          <g>
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#8B4513" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#A0522D" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#654321" />
            {/* Main stem */}
            <path d="M60 85 Q58 55 60 30" stroke={colors.primary} strokeWidth="3.5" fill="none" />
            {/* Branches */}
            <path d="M60 75 Q45 70 35 75" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 75 Q75 70 85 75" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 60 Q42 55 32 60" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 60 Q78 55 88 60" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 45 Q48 40 38 45" stroke={colors.leaf} strokeWidth="1.5" fill="none" />
            <path d="M60 45 Q72 40 82 45" stroke={colors.leaf} strokeWidth="1.5" fill="none" />
            {/* Dense coca leaves */}
            <g fill={colors.leaf} opacity="0.95">
              <ellipse cx="35" cy="75" rx="11" ry="6" transform="rotate(-20 35 75)" />
              <ellipse cx="85" cy="75" rx="11" ry="6" transform="rotate(20 85 75)" />
              <ellipse cx="32" cy="60" rx="10" ry="5.5" transform="rotate(-25 32 60)" />
              <ellipse cx="88" cy="60" rx="10" ry="5.5" transform="rotate(25 88 60)" />
              <ellipse cx="38" cy="45" rx="9" ry="5" transform="rotate(-15 38 45)" />
              <ellipse cx="82" cy="45" rx="9" ry="5" transform="rotate(15 82 45)" />
              <ellipse cx="50" cy="35" rx="8" ry="4.5" transform="rotate(-10 50 35)" />
              <ellipse cx="70" cy="35" rx="8" ry="4.5" transform="rotate(10 70 35)" />
              <ellipse cx="60" cy="28" rx="7" ry="4" />
            </g>
            {/* Small white/yellowish flowers */}
            <g fill="#fef3c7">
              <circle cx="38" cy="68" r="3" />
              <circle cx="82" cy="68" r="3" />
              <circle cx="35" cy="53" r="2.5" />
              <circle cx="85" cy="53" r="2.5" />
              <circle cx="45" cy="40" r="2" />
              <circle cx="75" cy="40" r="2" />
              <circle cx="60" cy="22" r="2.5" />
            </g>
            {/* Flower centers */}
            <g fill="#fbbf24" opacity="0.8">
              <circle cx="38" cy="68" r="1" />
              <circle cx="82" cy="68" r="1" />
              <circle cx="60" cy="22" r="1" />
            </g>
          </g>
        );
      case 'harvest':
        return (
          <g>
            {/* Glow under pot */}
            <ellipse cx="60" cy="100" rx="40" ry="12" fill={colors.glow} opacity="0.6" />
            {/* Pot */}
            <path d="M30 90 L40 110 L80 110 L90 90 Z" fill="#8B4513" />
            <ellipse cx="60" cy="90" rx="32" ry="8" fill="#A0522D" />
            <ellipse cx="60" cy="88" rx="28" ry="6" fill="#654321" />
            {/* Thick main stem */}
            <path d="M60 85 Q57 50 60 25" stroke={colors.primary} strokeWidth="4" fill="none" />
            {/* Dense branches */}
            <path d="M60 78 Q42 72 30 78" stroke={colors.leaf} strokeWidth="2.5" fill="none" />
            <path d="M60 78 Q78 72 90 78" stroke={colors.leaf} strokeWidth="2.5" fill="none" />
            <path d="M60 62 Q38 55 25 62" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 62 Q82 55 95 62" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 46 Q45 40 35 46" stroke={colors.leaf} strokeWidth="2" fill="none" />
            <path d="M60 46 Q75 40 85 46" stroke={colors.leaf} strokeWidth="2" fill="none" />
            {/* Lush coca leaves with glow */}
            <g fill={colors.leaf} filter={`drop-shadow(0 0 4px ${colors.glow})`}>
              <ellipse cx="30" cy="78" rx="12" ry="7" transform="rotate(-25 30 78)" />
              <ellipse cx="90" cy="78" rx="12" ry="7" transform="rotate(25 90 78)" />
              <ellipse cx="25" cy="62" rx="11" ry="6" transform="rotate(-30 25 62)" />
              <ellipse cx="95" cy="62" rx="11" ry="6" transform="rotate(30 95 62)" />
              <ellipse cx="35" cy="46" rx="10" ry="5.5" transform="rotate(-20 35 46)" />
              <ellipse cx="85" cy="46" rx="10" ry="5.5" transform="rotate(20 85 46)" />
              <ellipse cx="48" cy="32" rx="9" ry="5" transform="rotate(-15 48 32)" />
              <ellipse cx="72" cy="32" rx="9" ry="5" transform="rotate(15 72 32)" />
              <ellipse cx="60" cy="22" rx="8" ry="5" />
            </g>
            {/* Red coca berries/drupes */}
            <g fill="#ef4444">
              <ellipse cx="33" cy="70" rx="4" ry="5" />
              <ellipse cx="87" cy="70" r="4" ry="5" />
              <ellipse cx="28" cy="55" rx="3.5" ry="4.5" />
              <ellipse cx="92" cy="55" rx="3.5" ry="4.5" />
              <ellipse cx="40" cy="40" rx="3" ry="4" />
              <ellipse cx="80" cy="40" rx="3" ry="4" />
              <ellipse cx="55" cy="28" rx="3" ry="4" />
              <ellipse cx="65" cy="28" rx="3" ry="4" />
            </g>
            {/* Berry highlights */}
            <g fill="#fff" opacity="0.4">
              <circle cx="32" cy="68" r="1.5" />
              <circle cx="86" cy="68" r="1.5" />
              <circle cx="54" cy="26" r="1" />
              <circle cx="64" cy="26" r="1" />
            </g>
            {/* Sparkle effects */}
            <g fill="#fbbf24" opacity="0.9">
              <circle cx="20" cy="50" r="2" />
              <circle cx="100" cy="55" r="2.5" />
              <circle cx="45" cy="20" r="1.5" />
              <circle cx="75" cy="18" r="2" />
            </g>
          </g>
        );
    }
  };

  const baseFilter = stage === 'harvest' ? `drop-shadow(0 0 10px ${colors.glow})` : '';

  return (
    <motion.div className="relative" style={{ width: size, height: size }}>
      {/* Aura for harvest stage */}
      {stage === 'harvest' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            opacity: 0.4,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        animate={isAnimated ? stageVariants[stage] : undefined}
        style={{ filter: baseFilter || undefined }}
      >
        {renderPlant()}
      </motion.svg>
    </motion.div>
  );
};
