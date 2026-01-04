import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplet, Leaf, ShoppingCart, Check, Sparkles } from 'lucide-react';
import { useGameStore, FERTILIZER_CATALOG, SOIL_CATALOG, Fertilizer, Soil, Rarity } from '@/store/gameStore';
import { toast } from 'sonner';

interface GrowSuppliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: number | null;
  mode: 'fertilizer' | 'soil' | 'shop';
}

const getRarityColor = (rarity: Rarity) => {
  switch (rarity) {
    case 'legendary': return 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10';
    case 'epic': return 'text-purple-400 border-purple-400/50 bg-purple-400/10';
    case 'rare': return 'text-blue-400 border-blue-400/50 bg-blue-400/10';
    case 'uncommon': return 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10';
    default: return 'text-muted-foreground border-muted/50 bg-muted/10';
  }
};

export const GrowSuppliesModal = ({ isOpen, onClose, slotId, mode }: GrowSuppliesModalProps) => {
  const { 
    fertilizerInventory, soilInventory, budcoins,
    buyFertilizer, buySoil, applyFertilizer, applySoil, growSlots
  } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<'fertilizer' | 'soil'>(mode === 'soil' ? 'soil' : 'fertilizer');
  const isShopMode = mode === 'shop';
  
  const slot = slotId !== null ? growSlots.find(s => s.id === slotId) : null;

  const handleBuyFertilizer = (fertilizer: Fertilizer) => {
    if (buyFertilizer(fertilizer.id)) {
      toast.success(`${fertilizer.icon} ${fertilizer.name} gekauft!`);
    } else {
      toast.error('Nicht genug BudCoins!');
    }
  };

  const handleBuySoil = (soil: Soil) => {
    if (buySoil(soil.id)) {
      toast.success(`${soil.icon} ${soil.name} gekauft!`);
    } else {
      toast.error('Nicht genug BudCoins!');
    }
  };

  const handleApplyFertilizer = (fertilizerId: string) => {
    if (slotId === null) return;
    if (applyFertilizer(slotId, fertilizerId)) {
      toast.success('Dünger angewendet!');
      onClose();
    }
  };

  const handleApplySoil = (soilId: string) => {
    if (slotId === null) return;
    if (slot?.seed) {
      toast.error('Erde kann nur bei leerem Slot geändert werden!');
      return;
    }
    if (applySoil(slotId, soilId)) {
      toast.success('Erde gewechselt!');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            {isShopMode ? (
              <>
                <ShoppingCart size={20} className="text-primary" />
                Grow-Zubehör Shop
              </>
            ) : (
              <>
                <Sparkles size={20} className="text-primary" />
                {mode === 'fertilizer' ? 'Dünger auswählen' : 'Erde auswählen'}
              </>
            )}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('fertilizer')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors
              ${activeTab === 'fertilizer' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            <Droplet size={16} />
            Dünger
          </button>
          <button
            onClick={() => setActiveTab('soil')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors
              ${activeTab === 'soil' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            <Leaf size={16} />
            Erde
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'fertilizer' ? (
            <>
              {/* Inventory Section */}
              {!isShopMode && fertilizerInventory.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">Dein Inventar</h3>
                  {fertilizerInventory.map(({ fertilizer, quantity }) => (
                    <motion.div
                      key={fertilizer.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleApplyFertilizer(fertilizer.id)}
                      className={`game-card p-3 mb-2 cursor-pointer hover:ring-2 hover:ring-primary/50 ${getRarityColor(fertilizer.rarity)}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{fertilizer.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{fertilizer.name}</div>
                          <div className="text-xs text-muted-foreground">{fertilizer.description}</div>
                          <div className="flex gap-2 mt-1 text-xs">
                            <span className="text-primary">+{Math.round(fertilizer.growthBoost * 100)}% Speed</span>
                            <span className="text-emerald-400">+{Math.round(fertilizer.yieldBoost * 100)}% Ertrag</span>
                            <span className="text-yellow-400">+{fertilizer.qualityBoost} Qualität</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">x{quantity}</div>
                          <div className="text-xs text-muted-foreground">{fertilizer.duration} Ernten</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Shop Section */}
              <h3 className="text-sm font-bold text-muted-foreground mb-2">
                {isShopMode ? 'Verfügbare Dünger' : 'Kaufen'}
              </h3>
              {FERTILIZER_CATALOG.map(fertilizer => {
                const owned = fertilizerInventory.find(f => f.fertilizer.id === fertilizer.id)?.quantity ?? 0;
                const canAfford = budcoins >= fertilizer.cost;
                
                return (
                  <motion.div
                    key={fertilizer.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => canAfford && handleBuyFertilizer(fertilizer)}
                    className={`game-card p-3 cursor-pointer transition-opacity ${!canAfford ? 'opacity-50' : 'hover:ring-2 hover:ring-primary/50'} ${getRarityColor(fertilizer.rarity)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{fertilizer.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {fertilizer.name}
                          {owned > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">x{owned}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{fertilizer.description}</div>
                        <div className="flex gap-2 mt-1 text-xs flex-wrap">
                          <span className="text-primary">+{Math.round(fertilizer.growthBoost * 100)}% Speed</span>
                          <span className="text-emerald-400">+{Math.round(fertilizer.yieldBoost * 100)}% Ertrag</span>
                          <span className="text-yellow-400">+{fertilizer.qualityBoost} Qualität</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${canAfford ? 'text-primary' : 'text-destructive'}`}>
                          {fertilizer.cost} 💰
                        </div>
                        <div className="text-xs text-muted-foreground">{fertilizer.duration} Ernten</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          ) : (
            <>
              {/* Soil Inventory Section */}
              {!isShopMode && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">Dein Inventar</h3>
                  {soilInventory.map(({ soil, quantity }) => {
                    const isCurrentSoil = slot?.soil?.id === soil.id;
                    
                    return (
                      <motion.div
                        key={soil.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !isCurrentSoil && handleApplySoil(soil.id)}
                        className={`game-card p-3 mb-2 cursor-pointer transition-all 
                          ${isCurrentSoil ? 'ring-2 ring-primary' : 'hover:ring-2 hover:ring-primary/50'}
                          ${getRarityColor(soil.rarity)}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{soil.icon}</span>
                          <div className="flex-1">
                            <div className="font-bold text-sm flex items-center gap-2">
                              {soil.name}
                              {isCurrentSoil && <Check size={14} className="text-primary" />}
                            </div>
                            <div className="text-xs text-muted-foreground">{soil.description}</div>
                            <div className="flex gap-2 mt-1 text-xs flex-wrap">
                              {soil.growthBoost > 0 && <span className="text-primary">+{Math.round(soil.growthBoost * 100)}% Speed</span>}
                              {soil.yieldBoost > 0 && <span className="text-emerald-400">+{Math.round(soil.yieldBoost * 100)}% Ertrag</span>}
                              {soil.qualityBoost > 0 && <span className="text-yellow-400">+{soil.qualityBoost} Qualität</span>}
                              {soil.traitBoostChance > 0 && <span className="text-purple-400">+{Math.round(soil.traitBoostChance * 100)}% Trait</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {soil.id === 'basic-soil' ? '∞' : `x${quantity}`}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Soil Shop */}
              <h3 className="text-sm font-bold text-muted-foreground mb-2">
                {isShopMode ? 'Verfügbare Erde' : 'Kaufen'}
              </h3>
              {SOIL_CATALOG.filter(s => s.cost > 0).map(soil => {
                const owned = soilInventory.find(s => s.soil.id === soil.id)?.quantity ?? 0;
                const canAfford = budcoins >= soil.cost;
                
                return (
                  <motion.div
                    key={soil.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => canAfford && handleBuySoil(soil)}
                    className={`game-card p-3 cursor-pointer transition-opacity ${!canAfford ? 'opacity-50' : 'hover:ring-2 hover:ring-primary/50'} ${getRarityColor(soil.rarity)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{soil.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {soil.name}
                          {owned > 0 && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">x{owned}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{soil.description}</div>
                        <div className="flex gap-2 mt-1 text-xs flex-wrap">
                          {soil.growthBoost > 0 && <span className="text-primary">+{Math.round(soil.growthBoost * 100)}% Speed</span>}
                          {soil.yieldBoost > 0 && <span className="text-emerald-400">+{Math.round(soil.yieldBoost * 100)}% Ertrag</span>}
                          {soil.qualityBoost > 0 && <span className="text-yellow-400">+{soil.qualityBoost} Qualität</span>}
                          {soil.traitBoostChance > 0 && <span className="text-purple-400">+{Math.round(soil.traitBoostChance * 100)}% Trait</span>}
                          {soil.waterRetention > 1 && <span className="text-cyan-400">x{soil.waterRetention.toFixed(1)} Passiv</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${canAfford ? 'text-primary' : 'text-destructive'}`}>
                          {soil.cost} 💰
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer with balance */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dein Guthaben:</span>
            <span className="font-bold text-lg">{budcoins.toLocaleString()} 💰</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
