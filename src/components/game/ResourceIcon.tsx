import { motion } from 'framer-motion';
import { Coins, Droplets, Sparkles, Leaf, Gem } from 'lucide-react';

type ResourceType = 'cash' | 'resin' | 'essence' | 'seeds' | 'gems';

interface ResourceIconProps {
  type: ResourceType;
  size?: number;
  className?: string;
  animated?: boolean;
}

const iconConfig: Record<ResourceType, { icon: typeof Coins; color: string; glowColor: string }> = {
  cash: { icon: Coins, color: 'text-resource-budcoin', glowColor: 'rgba(251, 191, 36, 0.5)' },
  resin: { icon: Droplets, color: 'text-resource-resin', glowColor: 'rgba(168, 85, 247, 0.5)' },
  essence: { icon: Sparkles, color: 'text-resource-essence', glowColor: 'rgba(34, 211, 238, 0.5)' },
  seeds: { icon: Leaf, color: 'text-resource-seeds', glowColor: 'rgba(74, 222, 128, 0.5)' },
  gems: { icon: Gem, color: 'text-resource-gems', glowColor: 'rgba(244, 114, 182, 0.5)' },
};

export const ResourceIcon = ({ type, size = 20, className = '', animated = false }: ResourceIconProps) => {
  const config = iconConfig[type];
  const Icon = config.icon;

  if (animated) {
    return (
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={className}
        style={{ filter: `drop-shadow(0 0 4px ${config.glowColor})` }}
      >
        <Icon size={size} className={config.color} />
      </motion.div>
    );
  }

  return <Icon size={size} className={`${config.color} ${className}`} />;
};

interface ResourceBadgeProps {
  type: ResourceType;
  value: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ResourceBadge = ({ type, value, showIcon = true, size = 'md' }: ResourceBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = { sm: 14, md: 18, lg: 22 };

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  return (
    <div className={`resource-badge ${sizeClasses[size]}`}>
      {showIcon && <ResourceIcon type={type} size={iconSizes[size]} />}
      <span className="font-bold">{formatValue(value)}</span>
    </div>
  );
};
