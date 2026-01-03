import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, BudItem, SalesChannel } from '@/store/gameStore';
import { Package, Lock, Clock, TrendingUp, X, Minus, Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export const SalesScreen = () => {
  const {
    inventory,
    salesChannels,
    level,
    sellBuds,
    unlockSalesChannel,
    totalGramsSold,
    totalSalesRevenue,
    autoSellSettings,
    setAutoSellSettings,
  } = useGameStore();
  const [selectedChannel, setSelectedChannel] = useState<SalesChannel | null>(null);
  const [selectedBud, setSelectedBud] = useState<BudItem | null>(null);
  const [sellAmount, setSellAmount] = useState(1);

  const driedBuds = inventory.filter(b => b.state === 'dried');

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'hsl(45 100% 55%)';
      case 'epic': return 'hsl(270 70% 55%)';
      case 'rare': return 'hsl(210 100% 60%)';
      case 'uncommon': return 'hsl(180 100% 50%)';
      default: return 'hsl(0 0% 70%)';
    }
  };

  const handleChannelClick = (channel: SalesChannel) => {
    if (!channel.unlocked) {
      if (level >= channel.minLevel) {
        unlockSalesChannel(channel.id);
        toast.success(`${channel.name} freigeschaltet!`);
      } else {
        toast.error(`Level ${channel.minLevel} benötigt`, {
          description: `Du bist Level ${level}`,
        });
      }
      return;
    }
    
    setSelectedChannel(channel);
    setSelectedBud(null);
    setSellAmount(1);
  };

  const handleSell = () => {
    if (!selectedBud || !selectedChannel) return;
    
    const result = sellBuds(selectedBud.id, selectedChannel.id, sellAmount);
    
    if (result.success) {
      toast.success(result.message, {
        description: `Verkauft an ${selectedChannel.name}`,
      });
      
      // Check if bud was completely sold
      const remainingBud = inventory.find(b => b.id === selectedBud.id);
      if (!remainingBud || remainingBud.grams === 0) {
        setSelectedBud(null);
        setSellAmount(1);
      } else {
        setSelectedBud(remainingBud);
        setSellAmount(Math.min(sellAmount, remainingBud.grams));
      }
    } else {
      toast.error('Verkauf fehlgeschlagen', {
        description: result.message,
      });
    }
  };

  const getCooldownRemaining = (channel: SalesChannel) => {
    const now = Date.now();
    const cooldownMs = channel.cooldownMinutes * 60 * 1000;
    const remaining = cooldownMs - (now - channel.lastSaleTime);
    
    if (remaining <= 0) return null;
    
    const minutes = Math.ceil(remaining / 60000);
    return minutes;
  };

  const calculateEstimatedRevenue = () => {
    if (!selectedBud || !selectedChannel) return 0;
    const qualityBonus = 1 + (selectedBud.quality / 100) * 0.5;
    const rarityBonus = selectedBud.rarity === 'legendary' ? 2 : selectedBud.rarity === 'epic' ? 1.5 : selectedBud.rarity === 'rare' ? 1.25 : selectedBud.rarity === 'uncommon' ? 1.1 : 1;
    return Math.floor(sellAmount * selectedChannel.pricePerGram * qualityBonus * rarityBonus);
  };

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold text-neon-green mb-1">Sales</h1>
        <p className="text-sm text-muted-foreground">Verkaufe getrocknete Buds an verschiedene Abnehmer</p>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="game-card p-3 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <TrendingUp size={14} />
            <span>Verkauft</span>
          </div>
          <span className="text-lg font-bold">{totalGramsSold}g</span>
        </div>
        <div className="game-card p-3 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign size={14} />
            <span>Umsatz</span>
          </div>
          <span className="text-lg font-bold text-primary">{totalSalesRevenue}</span>
        </div>
      </div>

      <div className="game-card p-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Auto-Sell</div>
          <button
            type="button"
            onClick={() => setAutoSellSettings({ enabled: !autoSellSettings.enabled })}
            className="btn-neon px-3 py-1 text-xs"
          >
            {autoSellSettings.enabled ? 'Aktiv' : 'Aus'}
          </button>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Min. Qualität: {autoSellSettings.minQuality}%
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={autoSellSettings.minQuality}
            onChange={(event) => setAutoSellSettings({ minQuality: Number(event.target.value) })}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Kanal</div>
          <select
            value={autoSellSettings.preferredChannel}
            onChange={(event) => setAutoSellSettings({ preferredChannel: event.target.value })}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
          >
            <option value="auto">Auto (beste Preise)</option>
            {salesChannels
              .filter(channel => channel.unlocked)
              .map(channel => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={autoSellSettings.onlyWhenFull}
            onChange={(event) => setAutoSellSettings({ onlyWhenFull: event.target.checked })}
          />
          Nur bei vollem Lager
        </label>
      </div>

      {/* Sales Channels */}
      <h2 className="text-lg font-display font-semibold mb-3">Verkaufskanäle</h2>
      <div className="grid grid-cols-1 gap-3 mb-6">
        {salesChannels.map(channel => {
          const cooldown = getCooldownRemaining(channel);
          const canUnlock = !channel.unlocked && level >= channel.minLevel;
          
          return (
            <motion.div
              key={channel.id}
              whileTap={{ scale: channel.unlocked || canUnlock ? 0.98 : 1 }}
              onClick={() => handleChannelClick(channel)}
              className={`game-card p-4 cursor-pointer transition-all ${
                !channel.unlocked ? 'opacity-60' : ''
              } ${selectedChannel?.id === channel.id ? 'ring-2 ring-primary glow-green' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{channel.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{channel.name}</h3>
                    {!channel.unlocked && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock size={10} />
                        Lvl {channel.minLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{channel.description}</p>
                  
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {channel.pricePerGram}💰/g
                    </span>
                    <span className="bg-muted px-2 py-0.5 rounded-full">
                      Max {channel.maxGramsPerSale}g
                    </span>
                    {channel.minQuality > 0 && (
                      <span className="bg-muted px-2 py-0.5 rounded-full">
                        Min {channel.minQuality}% Q
                      </span>
                    )}
                  </div>
                </div>
                
                {channel.unlocked && cooldown && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} />
                    <span>{cooldown}m</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Available Buds */}
      <h2 className="text-lg font-display font-semibold mb-3">Verkaufsbereit ({driedBuds.length})</h2>
      {driedBuds.length === 0 ? (
        <div className="game-card p-6 text-center text-muted-foreground">
          <Package size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Keine getrockneten Buds zum Verkaufen</p>
          <p className="text-xs mt-1">Trockne Buds im Dry Room</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {driedBuds.map(bud => (
            <motion.div
              key={bud.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedBud(bud);
                setSellAmount(Math.min(bud.grams, selectedChannel?.maxGramsPerSale || bud.grams));
              }}
              className={`game-card p-3 cursor-pointer rarity-${bud.rarity} ${
                selectedBud?.id === bud.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="text-amber-400" size={20} />
                <div className="flex-1">
                  <span className="font-semibold text-sm">{bud.strainName}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{bud.grams}g</span>
                    <span>•</span>
                    <span>Q: {bud.quality}%</span>
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
            </motion.div>
          ))}
        </div>
      )}

      {/* Sell Panel */}
      <AnimatePresence>
        {selectedChannel && selectedBud && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-4 right-4 game-card p-4 glow-green z-40"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold">{selectedBud.strainName}</span>
                <span className="text-sm text-muted-foreground ml-2">→ {selectedChannel.name}</span>
              </div>
              <button 
                onClick={() => { setSelectedChannel(null); setSelectedBud(null); }}
                className="p-1 rounded-full bg-muted"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Amount Selector */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSellAmount(Math.max(1, sellAmount - 1))}
                className="p-2 rounded-full bg-muted"
              >
                <Minus size={20} />
              </motion.button>
              
              <div className="text-center">
                <span className="text-3xl font-display font-bold">{sellAmount}g</span>
                <p className="text-xs text-muted-foreground">von {selectedBud.grams}g</p>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setSellAmount(Math.min(selectedBud.grams, selectedChannel.maxGramsPerSale, sellAmount + 1))}
                className="p-2 rounded-full bg-muted"
              >
                <Plus size={20} />
              </motion.button>
            </div>

            {/* Quick Select */}
            <div className="flex gap-2 mb-4 justify-center">
              {[1, 5, 10, selectedBud.grams].filter((v, i, a) => a.indexOf(v) === i && v <= Math.min(selectedBud.grams, selectedChannel.maxGramsPerSale)).map(amount => (
                <button
                  key={amount}
                  onClick={() => setSellAmount(amount)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    sellAmount === amount ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {amount === selectedBud.grams ? 'Alle' : `${amount}g`}
                </button>
              ))}
            </div>

            {/* Sell Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSell}
              disabled={getCooldownRemaining(selectedChannel) !== null}
              className="btn-neon w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getCooldownRemaining(selectedChannel) 
                ? `Cooldown: ${getCooldownRemaining(selectedChannel)}m`
                : `Verkaufen für ${calculateEstimatedRevenue()} 💰`
              }
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
