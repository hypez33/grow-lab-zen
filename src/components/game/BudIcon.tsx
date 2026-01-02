import { motion } from 'framer-motion';
import { Rarity } from '@/store/gameStore';

interface BudIconProps {
  strainName: string;
  rarity: Rarity;
  size?: number;
  animate?: boolean;
}

// Generate a deterministic hash from string for consistent colors
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Get strain-specific colors based on name
const getStrainColors = (name: string) => {
  const hash = hashString(name);
  const hue1 = (hash % 60) + 80; // Green-ish range (80-140)
  const hue2 = ((hash >> 8) % 40) + 100; // Slightly different green
  const saturation = 50 + (hash % 30);
  
  return {
    primary: `hsl(${hue1}, ${saturation}%, 45%)`,
    secondary: `hsl(${hue2}, ${saturation + 10}%, 35%)`,
    highlight: `hsl(${hue1 - 20}, ${saturation}%, 60%)`,
    accent: `hsl(${(hash >> 4) % 360}, 70%, 55%)`,
  };
};

const getRarityGlow = (rarity: Rarity): string => {
  switch (rarity) {
    case 'legendary': return '0 0 12px hsl(45 100% 55% / 0.6)';
    case 'epic': return '0 0 10px hsl(270 70% 55% / 0.5)';
    case 'rare': return '0 0 8px hsl(210 100% 60% / 0.4)';
    case 'uncommon': return '0 0 6px hsl(180 100% 50% / 0.3)';
    default: return 'none';
  }
};

const getRarityBorder = (rarity: Rarity): string => {
  switch (rarity) {
    case 'legendary': return 'hsl(45 100% 55%)';
    case 'epic': return 'hsl(270 70% 55%)';
    case 'rare': return 'hsl(210 100% 60%)';
    case 'uncommon': return 'hsl(180 100% 50%)';
    default: return 'hsl(0 0% 50%)';
  }
};

export const BudIcon = ({ strainName, rarity, size = 32, animate = true }: BudIconProps) => {
  const colors = getStrainColors(strainName);
  const hash = hashString(strainName);
  
  // Determine bud shape variation based on hash
  const variant = hash % 4;
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={animate ? { 
        scale: [1, 1.02, 1],
      } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        style={{ 
          filter: `drop-shadow(${getRarityGlow(rarity)})`,
        }}
      >
        {/* Base bud shape - varies by strain */}
        {variant === 0 && (
          <>
            {/* Dense nugget style */}
            <ellipse cx="16" cy="17" rx="10" ry="11" fill={colors.secondary} />
            <ellipse cx="16" cy="15" rx="9" ry="10" fill={colors.primary} />
            <ellipse cx="14" cy="13" rx="5" ry="6" fill={colors.highlight} opacity="0.6" />
            {/* Orange hairs */}
            <path d="M12 10 Q10 8 11 6" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M20 11 Q22 9 21 7" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M17 9 Q18 6 16 5" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Trichome sparkles */}
            <circle cx="13" cy="14" r="0.8" fill="white" opacity="0.7" />
            <circle cx="18" cy="12" r="0.6" fill="white" opacity="0.6" />
            <circle cx="15" cy="17" r="0.5" fill="white" opacity="0.5" />
          </>
        )}
        
        {variant === 1 && (
          <>
            {/* Foxtail style */}
            <ellipse cx="16" cy="18" rx="8" ry="9" fill={colors.secondary} />
            <ellipse cx="16" cy="16" rx="7" ry="8" fill={colors.primary} />
            <ellipse cx="14" cy="11" rx="4" ry="5" fill={colors.primary} />
            <ellipse cx="18" cy="13" rx="3" ry="4" fill={colors.highlight} opacity="0.5" />
            {/* Orange hairs */}
            <path d="M13 7 Q11 5 12 3" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M10 12 Q7 11 6 13" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M22 14 Q25 13 24 11" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Trichomes */}
            <circle cx="12" cy="15" r="0.7" fill="white" opacity="0.6" />
            <circle cx="17" cy="11" r="0.5" fill="white" opacity="0.7" />
          </>
        )}
        
        {variant === 2 && (
          <>
            {/* Round compact style */}
            <circle cx="16" cy="16" r="11" fill={colors.secondary} />
            <circle cx="16" cy="15" r="10" fill={colors.primary} />
            <circle cx="14" cy="13" r="5" fill={colors.highlight} opacity="0.5" />
            {/* Orange hairs */}
            <path d="M10 10 Q8 7 10 5" stroke={colors.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M22 10 Q24 7 22 5" stroke={colors.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M16 6 Q16 3 18 2" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M8 16 Q5 15 4 17" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Trichomes */}
            <circle cx="12" cy="14" r="0.8" fill="white" opacity="0.7" />
            <circle cx="19" cy="12" r="0.6" fill="white" opacity="0.6" />
            <circle cx="16" cy="18" r="0.5" fill="white" opacity="0.5" />
            <circle cx="20" cy="17" r="0.4" fill="white" opacity="0.6" />
          </>
        )}
        
        {variant === 3 && (
          <>
            {/* Elongated style */}
            <ellipse cx="16" cy="16" rx="7" ry="12" fill={colors.secondary} />
            <ellipse cx="16" cy="15" rx="6" ry="11" fill={colors.primary} />
            <ellipse cx="15" cy="12" rx="3" ry="5" fill={colors.highlight} opacity="0.5" />
            {/* Orange hairs */}
            <path d="M14 4 Q12 2 14 0" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M18 5 Q20 3 19 1" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M11 10 Q8 9 7 11" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            <path d="M21 12 Q24 11 25 13" stroke={colors.accent} strokeWidth="1" fill="none" strokeLinecap="round" />
            {/* Trichomes */}
            <circle cx="14" cy="13" r="0.6" fill="white" opacity="0.7" />
            <circle cx="17" cy="10" r="0.5" fill="white" opacity="0.6" />
            <circle cx="15" cy="19" r="0.4" fill="white" opacity="0.5" />
          </>
        )}
        
        {/* Rarity ring */}
        <circle 
          cx="16" 
          cy="16" 
          r="14" 
          fill="none" 
          stroke={getRarityBorder(rarity)} 
          strokeWidth="1.5" 
          opacity="0.6"
          strokeDasharray={rarity === 'legendary' ? '4 2' : rarity === 'epic' ? '3 2' : 'none'}
        />
      </svg>
    </motion.div>
  );
};
