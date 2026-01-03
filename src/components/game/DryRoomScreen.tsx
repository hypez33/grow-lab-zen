import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, BudItem } from '@/store/gameStore';
import { Wind, Lock, Check, X, Plus, ShoppingCart, Sparkles, TrendingUp, Zap, Star, Droplets } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { BudIcon } from './BudIcon';

export const DryRoomScreen = () => {
  const {
    inventory,
    dryingRacks,
    startDrying,
    collectDried,
    buyDryingRack,
    getDryingRackCost,
    budcoins,
    upgrades,
    salesChannels,
    autoSellSettings,
    setAutoSellSettings,
  } = useGameStore();
  const [selectedBud, setSelectedBud] = useState<BudItem | null>(null);
  const [showBudPicker, setShowBudPicker] = useState(false);
  const [targetRackId, setTargetRackId] = useState<number | null>(null);
  const [showShop, setShowShop] = useState(true); // Default to open so users can see how to buy racks

  // Get drying upgrade bonuses
  const dryingSpeedLevel = upgrades.find(u => u.id === 'drying-speed')?.level ?? 0;
  const qualityCureLevel = upgrades.find(u => u.id === 'quality-cure')?.level ?? 0;
  const humidityLevel = upgrades.find(u => u.id === 'humidity-control')?.level ?? 0;
  const uvLevel = upgrades.find(u => u.id === 'uv-treatment')?.level ?? 0;

  const speedBonus = Math.round((dryingSpeedLevel * 15) + (humidityLevel * 8));
  const qualityBonus = Math.round((qualityCureLevel * 5) + (humidityLevel * 3));
  const rarityChance = Math.round(uvLevel * 5);
  
  const hasAnyBonus = speedBonus > 0 || qualityBonus > 0 || rarityChance > 0;

  // Drying progress is now handled globally in GameLayout

  const wetBuds = inventory.filter(b => b.state === 'wet');
  const driedBuds = inventory.filter(b => b.state === 'dried');
  const preferredChannelLabel = autoSellSettings.preferredChannel === 'auto'
    ? 'Auto'
    : salesChannels.find(channel => channel.id === autoSellSettings.preferredChannel)?.name
      ?? autoSellSettings.preferredChannel;

  const handleRackClick = (rackId: number, rack: typeof dryingRacks[0]) => {
    if (!rack.isUnlocked) return;
    
    if (rack.bud) {
      if (rack.bud.dryingProgress >= 100) {
        collectDried(rackId);
        toast.success('Getrocknete Buds eingesammelt!', {
          description: `${rack.bud.grams}g ${rack.bud.strainName} sind jetzt verkaufsbereit`,
        });
      }
    } else {
      if (wetBuds.length === 0) {
        toast.error('Keine nassen Buds verfügbar', {
          description: 'Ernte zuerst Pflanzen im Grow-Bereich',
        });
        return;
      }
      setTargetRackId(rackId);
      setShowBudPicker(true);
    }
  };

  const handleSelectBud = (bud: BudItem) => {
    if (targetRackId !== null) {
      startDrying(bud.id, targetRackId);
      setShowBudPicker(false);
      setTargetRackId(null);
      toast.success('Trocknung gestartet!', {
        description: `${bud.grams}g ${bud.strainName} werden getrocknet`,
      });
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'hsl(45 100% 55%)';
      case 'epic': return 'hsl(270 70% 55%)';
      case 'rare': return 'hsl(210 100% 60%)';
      case 'uncommon': return 'hsl(180 100% 50%)';
      default: return 'hsl(0 0% 70%)';
    }
  };

  const unlockedRacks = dryingRacks.filter(r => r.isUnlocked).length;
  const totalRacks = dryingRacks.length;
  const nextRackCost = getDryingRackCost();
  const canBuyRack = budcoins >= nextRackCost && unlockedRacks < totalRacks;

  const handleBuyRack = () => {
    const result = buyDryingRack();
    if (result.success) {
      toast.success('Neues Gestell gekauft!', {
        description: result.message,
      });
    } else {
      toast.error('Kauf fehlgeschlagen', {
        description: result.message,
      });
    }
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-neon-green mb-1">Dry Room</h1>
          <p className="text-sm text-muted-foreground">Trockne deine Buds bevor du sie verkaufst</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowShop(!showShop)}
          className={`p-2.5 rounded-xl flex items-center gap-2 transition-all ${
            showShop ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
          }`}
        >
          <ShoppingCart size={18} />
        </motion.button>
      </div>

      {/* Shop Panel */}
      <AnimatePresence>
        {showShop && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="game-card p-4 space-y-3 border-2 border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-neon-gold" size={18} />
                <h3 className="font-display font-bold">Gestelle Erweitern</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Aktuelle Kapazität</div>
                  <div className="text-lg font-bold">{unlockedRacks} / {totalRacks} Gestelle</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Mehr Trocknung = Mehr Profit!</div>
                </div>
              </div>

              {/* Progress to max */}
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-neon-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${(unlockedRacks / totalRacks) * 100}%` }}
                />
              </div>

              {unlockedRacks < totalRacks ? (
                <button
                  type="button"
                  onClick={handleBuyRack}
                  disabled={!canBuyRack}
                  className={`w-full py-3 px-4 rounded-xl font-display font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    canBuyRack
                      ? 'bg-gradient-to-r from-primary to-neon-green text-background'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Plus size={18} />
                  <span>Gestell #{unlockedRacks + 1} kaufen</span>
                  <span className="ml-2 px-2 py-0.5 bg-background/20 rounded-full text-sm">
                    💰 {nextRackCost.toLocaleString()}
                  </span>
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-xl bg-neon-gold/20 text-neon-gold text-center font-bold">
                  ✨ Alle Gestelle freigeschaltet!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Bonuses Panel */}
      {hasAnyBonus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="game-card p-3 mb-4 border border-primary/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-primary" size={16} />
            <span className="text-sm font-bold">Aktive Trocknungs-Boni</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {speedBonus > 0 && (
              <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-2 py-1.5">
                <Zap className="text-neon-gold" size={14} />
                <span className="text-xs font-semibold text-neon-gold">+{speedBonus}% Speed</span>
              </div>
            )}
            {qualityBonus > 0 && (
              <div className="flex items-center gap-1.5 bg-neon-cyan/10 rounded-lg px-2 py-1.5">
                <Droplets className="text-neon-cyan" size={14} />
                <span className="text-xs font-semibold text-neon-cyan">+{qualityBonus}% Qual.</span>
              </div>
            )}
            {rarityChance > 0 && (
              <div className="flex items-center gap-1.5 bg-neon-purple/10 rounded-lg px-2 py-1.5">
                <Star className="text-neon-purple" size={14} />
                <span className="text-xs font-semibold text-neon-purple">{rarityChance}% Rarität↑</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="game-card p-3 mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Auto-Sell</div>
          <button
            type="button"
            onClick={() => setAutoSellSettings({ enabled: !autoSellSettings.enabled })}
            className="btn-neon px-3 py-1 text-[10px]"
          >
            {autoSellSettings.enabled ? 'Aktiv' : 'Aus'}
          </button>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {autoSellSettings.enabled
            ? `Min. Qualitaet ${autoSellSettings.minQuality}% · Kanal ${preferredChannelLabel}${autoSellSettings.onlyWhenFull ? ' · nur bei vollem Lager' : ''}`
            : 'Automatischer Verkauf ist deaktiviert.'}
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="flex gap-3 mb-4">
        <div className="game-card p-3 flex-1 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-blue-400/20 flex items-center justify-center">
            <span className="text-xs">💧</span>
          </div>
          <div>
            <span className="text-lg font-bold">{wetBuds.reduce((sum, b) => sum + b.grams, 0).toFixed(1)}g</span>
            <span className="text-xs text-muted-foreground ml-1">Nass</span>
          </div>
        </div>
        <div className="game-card p-3 flex-1 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
            <span className="text-xs">📦</span>
          </div>
          <div>
            <span className="text-lg font-bold">{driedBuds.reduce((sum, b) => sum + b.grams, 0).toFixed(1)}g</span>
            <span className="text-xs text-muted-foreground ml-1">Trocken</span>
          </div>
        </div>
      </div>

      {/* Drying Racks */}
      <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
        <span>🌬️</span> Trocknungsgestelle
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {dryingRacks.map(rack => (
          <motion.div
            key={rack.id}
            whileTap={{ scale: rack.isUnlocked ? 0.95 : 1 }}
            onClick={() => handleRackClick(rack.id, rack)}
            className={`game-card p-3 cursor-pointer transition-all relative overflow-hidden ${
              !rack.isUnlocked ? 'opacity-50' : ''
            } ${rack.bud?.dryingProgress === 100 ? 'glow-gold' : ''}`}
          >
            {/* Animated background for drying */}
            {rack.bud && rack.bud.dryingProgress < 100 && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.1) 100%)'
                }}
              >
                {/* Floating air particles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/40"
                    initial={{ 
                      x: 10 + i * 25, 
                      y: 80,
                      opacity: 0 
                    }}
                    animate={{ 
                      y: [80, 20, 80],
                      x: [10 + i * 25, 15 + i * 25, 10 + i * 25],
                      opacity: [0, 0.6, 0],
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2 + i * 0.5, 
                      repeat: Infinity, 
                      delay: i * 0.4,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>
            )}

            {/* Ready glow effect */}
            {rack.bud?.dryingProgress === 100 && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ 
                  boxShadow: [
                    'inset 0 0 20px hsl(45 100% 55% / 0.2)',
                    'inset 0 0 40px hsl(45 100% 55% / 0.4)',
                    'inset 0 0 20px hsl(45 100% 55% / 0.2)'
                  ]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}

            {!rack.isUnlocked ? (
              <motion.div 
                className="flex flex-col items-center justify-center h-24 text-muted-foreground relative z-10 cursor-pointer"
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShop(true);
                }}
              >
                <motion.div
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Lock size={24} />
                </motion.div>
                <span className="text-[10px] mt-1 font-medium">💰 {getDryingRackCost().toLocaleString()}</span>
                <span className="text-[10px] text-primary">Tippen zum Kaufen</span>
              </motion.div>
            ) : rack.bud ? (
              <div className="flex flex-col h-24 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <BudIcon strainName={rack.bud.strainName} rarity={rack.bud.rarity} size={28} animate={rack.bud.dryingProgress < 100} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold truncate block">{rack.bud.strainName}</span>
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded-full inline-block"
                      style={{ 
                        backgroundColor: `${getRarityColor(rack.bud.rarity)}20`,
                        color: getRarityColor(rack.bud.rarity)
                      }}
                    >
                      {rack.bud.grams}g
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  {rack.bud.dryingProgress < 100 ? (
                    <div className="relative">
                      {/* Wind lines */}
                      <motion.div
                        className="absolute -left-3 top-1/2 -translate-y-1/2"
                        animate={{ opacity: [0.3, 0.7, 0.3], x: [-2, 2, -2] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <svg width="12" height="20" viewBox="0 0 12 20">
                          <motion.path
                            d="M10 4 Q5 6 8 10 Q3 14 10 16"
                            stroke="hsl(var(--primary))"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            animate={{ pathLength: [0, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </svg>
                      </motion.div>
                      <motion.div
                        animate={{ 
                          rotate: [0, 15, -15, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Wind className="text-primary" size={28} />
                      </motion.div>
                      {/* Wind lines right */}
                      <motion.div
                        className="absolute -right-3 top-1/2 -translate-y-1/2"
                        animate={{ opacity: [0.3, 0.7, 0.3], x: [2, -2, 2] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                      >
                        <svg width="12" height="20" viewBox="0 0 12 20">
                          <motion.path
                            d="M2 4 Q7 6 4 10 Q9 14 2 16"
                            stroke="hsl(var(--primary))"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            animate={{ pathLength: [0, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                          />
                        </svg>
                      </motion.div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className="relative"
                    >
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ 
                          boxShadow: [
                            '0 0 0 0 hsl(115 100% 62% / 0.4)',
                            '0 0 0 12px hsl(115 100% 62% / 0)',
                          ]
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Check className="text-primary" size={20} />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-0.5">
                  <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 relative"
                      style={{ width: `${rack.bud.dryingProgress}%` }}
                    >
                      {rack.bud.dryingProgress < 100 && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        />
                      )}
                    </motion.div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    {rack.bud.dryingProgress < 100 ? (
                      <>
                        <motion.span
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          🌬️
                        </motion.span>
                        {Math.floor(rack.bud.dryingProgress)}%
                      </>
                    ) : (
                      <>✨ Bereit!</>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground relative z-10">
                <motion.div
                  className="relative"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Subtle wind effect */}
                  <motion.div
                    className="absolute -inset-3 rounded-full"
                    animate={{ 
                      rotate: 360,
                      opacity: [0.1, 0.3, 0.1]
                    }}
                    transition={{ 
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                      opacity: { duration: 2, repeat: Infinity }
                    }}
                    style={{
                      background: 'conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.2), transparent)'
                    }}
                  />
                  <Wind size={28} className="text-primary/40 relative z-10" />
                </motion.div>
                <span className="text-[10px] mt-2">Tippen zum Belegen</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Wet Buds Inventory */}
      <h2 className="text-lg font-display font-semibold mb-3">Nasse Buds ({wetBuds.length})</h2>
      {wetBuds.length === 0 ? (
        <div className="game-card p-6 text-center text-muted-foreground">
          <span className="text-3xl mb-2 block">💧</span>
          <p className="text-sm">Keine nassen Buds vorhanden</p>
          <p className="text-xs mt-1">Ernte Pflanzen um Buds zu erhalten</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 mb-6">
          {wetBuds.slice(0, 5).map(bud => (
            <div 
              key={bud.id} 
              className={`game-card p-3 flex items-center gap-3 rarity-${bud.rarity}`}
            >
              <BudIcon strainName={bud.strainName} rarity={bud.rarity} size={28} />
              <div className="flex-1">
                <span className="font-semibold text-sm">{bud.strainName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{bud.grams}g</span>
                  <span>•</span>
                  <span>Qualität: {bud.quality}%</span>
                </div>
              </div>
              <span 
                className="text-xs capitalize px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: `${getRarityColor(bud.rarity)}20`,
                  color: getRarityColor(bud.rarity)
                }}
              >
                {bud.rarity}
              </span>
            </div>
          ))}
          {wetBuds.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{wetBuds.length - 5} weitere...
            </p>
          )}
        </div>
      )}

      {/* Dried Buds Ready for Sale */}
      <h2 className="text-lg font-display font-semibold mb-3">Verkaufsbereit ({driedBuds.length})</h2>
      {driedBuds.length === 0 ? (
        <div className="game-card p-6 text-center text-muted-foreground">
          <span className="text-3xl mb-2 block">📦</span>
          <p className="text-sm">Keine getrockneten Buds</p>
          <p className="text-xs mt-1">Trockne Buds um sie verkaufen zu können</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {driedBuds.slice(0, 5).map(bud => (
            <div 
              key={bud.id} 
              className={`game-card p-3 flex items-center gap-3 rarity-${bud.rarity}`}
            >
              <BudIcon strainName={bud.strainName} rarity={bud.rarity} size={28} />
              <div className="flex-1">
                <span className="font-semibold text-sm">{bud.strainName}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{bud.grams}g</span>
                  <span>•</span>
                  <span>Qualität: {bud.quality}%</span>
                </div>
              </div>
              <span 
                className="text-xs capitalize px-2 py-0.5 rounded-full"
                style={{ 
                  backgroundColor: `${getRarityColor(bud.rarity)}20`,
                  color: getRarityColor(bud.rarity)
                }}
              >
                {bud.rarity}
              </span>
            </div>
          ))}
          {driedBuds.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{driedBuds.length - 5} weitere...
            </p>
          )}
        </div>
      )}

      {/* Bud Picker Modal */}
      <AnimatePresence>
        {showBudPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4">
              <h2 className="text-xl font-display font-bold">Buds auswählen</h2>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowBudPicker(false); setTargetRackId(null); }}
                className="p-2 rounded-full bg-muted"
              >
                <X size={20} />
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pt-0">
              {wetBuds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Keine nassen Buds verfügbar!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {wetBuds.map(bud => (
                    <motion.button
                      key={bud.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectBud(bud)}
                      className={`game-card p-4 text-left rarity-${bud.rarity}`}
                    >
                      <div className="flex items-center gap-3">
                        <BudIcon strainName={bud.strainName} rarity={bud.rarity} size={32} />
                        <div className="flex-1">
                          <h4 className="font-semibold">{bud.strainName}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{bud.grams}g</span>
                            <span>•</span>
                            <span>Q: {bud.quality}%</span>
                            <span>•</span>
                            <span className="capitalize">{bud.rarity}</span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
