import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { useNavigationStore } from '@/store/navigationStore';
import { Wind, Sprout, Zap, Droplets, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { GrowSuppliesModal } from './GrowSuppliesModal';

export const QuickActionsBar = () => {
  const { inventory, growSlots, seeds, dryingRacks, tapBatch, waterAllPlants } = useGameStore();
  const { setActiveScreen } = useNavigationStore();
  const [showSuppliesShop, setShowSuppliesShop] = useState(false);

  const wetBuds = inventory.filter(b => b.state === 'wet').length;
  const driedBuds = inventory.filter(b => b.state === 'dried').length;
  const emptySlots = growSlots.filter(s => s.isUnlocked && !s.seed).length;
  const readyToHarvest = growSlots.filter(s => s.stage === 'harvest').length;
  const emptyRacks = dryingRacks.filter(r => r.isUnlocked && !r.bud).length;
  const readyBuds = dryingRacks.filter(r => r.bud && r.bud.dryingProgress >= 100).length;
  const plantsNeedingWater = growSlots.filter(s => s.isUnlocked && s.seed && s.waterLevel < 50).length;

  const actions = [
    {
      id: 'plant',
      icon: Sprout,
      label: 'Pflanzen',
      count: emptySlots,
      color: 'from-neon-green to-neon-cyan',
      disabled: emptySlots === 0 || seeds.length === 0,
      onClick: () => {
        if (emptySlots > 0 && seeds.length > 0) {
          setActiveScreen('grow');
          toast.info(`${emptySlots} leere Slots warten!`);
        }
      },
    },
    {
      id: 'water',
      icon: Droplets,
      label: 'Gießen',
      count: plantsNeedingWater,
      color: 'from-cyan-400 to-blue-500',
      disabled: plantsNeedingWater === 0,
      onClick: () => {
        const watered = waterAllPlants();
        if (watered > 0) {
          toast.success(`💧 ${watered} Pflanzen gegossen!`);
        }
      },
    },
    {
      id: 'boost',
      icon: Zap,
      label: 'Boost',
      count: null,
      color: 'from-neon-gold to-neon-orange',
      disabled: false,
      onClick: () => {
        // Quick tap boost
        tapBatch(5);
        toast.success('5x Boost! ⚡');
      },
    },
    {
      id: 'dry',
      icon: Wind,
      label: 'Trocknen',
      count: wetBuds,
      color: 'from-neon-cyan to-neon-purple',
      disabled: wetBuds === 0 || emptyRacks === 0,
      onClick: () => {
        if (wetBuds > 0) {
          setActiveScreen('dryroom');
          toast.info(`${wetBuds} Buds zum Trocknen bereit!`);
        }
      },
    },
    {
      id: 'supplies',
      icon: FlaskConical,
      label: 'Shop',
      count: null,
      color: 'from-amber-500 to-orange-600',
      disabled: false,
      onClick: () => {
        setShowSuppliesShop(true);
      },
    },
  ];

  // Don't show if nothing to do
  const hasAction = actions.some(a => !a.disabled);
  if (!hasAction) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="game-card p-2"
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground px-2 font-semibold uppercase tracking-wider">
          Quick
        </span>
        <div className="flex-1 flex gap-1">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.id}
                whileTap={!action.disabled ? { scale: 0.9 } : undefined}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-lg transition-all relative overflow-hidden
                  ${action.disabled 
                    ? 'bg-muted/30 text-muted-foreground opacity-50' 
                    : `bg-gradient-to-r ${action.color} text-background`
                  }`}
              >
                {!action.disabled && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                )}
                <Icon size={14} className="relative z-10" />
                {action.count !== null && action.count > 0 && (
                  <span className="text-xs font-bold relative z-10">{action.count}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {(readyToHarvest > 0 || readyBuds > 0) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-2 flex gap-2 text-xs"
        >
          {readyToHarvest > 0 && (
            <motion.button
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              onClick={() => setActiveScreen('grow')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-primary/20 text-primary font-semibold flex items-center justify-center gap-1"
            >
              <span>🌿</span>
              <span>{readyToHarvest} zum Ernten!</span>
            </motion.button>
          )}
          {readyBuds > 0 && (
            <motion.button
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
              onClick={() => setActiveScreen('dryroom')}
              className="flex-1 py-1.5 px-2 rounded-lg bg-neon-gold/20 text-neon-gold font-semibold flex items-center justify-center gap-1"
            >
              <span>✨</span>
              <span>{readyBuds} fertig!</span>
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Grow Supplies Shop Modal */}
      <GrowSuppliesModal
        isOpen={showSuppliesShop}
        onClose={() => setShowSuppliesShop(false)}
        slotId={null}
        mode="shop"
      />
    </motion.div>
  );
};
