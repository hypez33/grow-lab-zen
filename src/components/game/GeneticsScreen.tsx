import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, Seed as SeedType } from '@/store/gameStore';
import { PlantSVG } from './PlantSVG';
import { Dna, Plus, ArrowRight, Shuffle, Info, Sparkles, CheckCircle2, Package, AlertTriangle, Skull, Crown, Flame, Star } from 'lucide-react';
import { breedSeeds, getYieldDisplay, getGenerationDisplay, BreedingOutcome } from '@/lib/breedingSystem';
import { useCanvasParticles } from '@/components/effects/CanvasParticleSystem';

const rarityLabels = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const rarityColors = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

const rarityBgColors = {
  common: 'from-rarity-common/30 to-rarity-common/10',
  uncommon: 'from-rarity-uncommon/30 to-rarity-uncommon/10',
  rare: 'from-rarity-rare/30 to-rarity-rare/10',
  epic: 'from-rarity-epic/30 to-rarity-epic/10',
  legendary: 'from-rarity-legendary/30 to-rarity-legendary/10',
};

// Outcome colors and icons
const outcomeStyles: Record<BreedingOutcome, { color: string; bgColor: string; icon: React.ReactNode }> = {
  fail: { color: 'text-destructive', bgColor: 'from-destructive/30 to-destructive/10', icon: <Skull size={32} className="text-destructive" /> },
  poor: { color: 'text-muted-foreground', bgColor: 'from-muted/30 to-muted/10', icon: <AlertTriangle size={32} className="text-muted-foreground" /> },
  normal: { color: 'text-primary', bgColor: 'from-primary/30 to-primary/10', icon: <CheckCircle2 size={32} className="text-primary" /> },
  good: { color: 'text-neon-green', bgColor: 'from-neon-green/30 to-neon-green/10', icon: <Star size={32} className="text-neon-green" /> },
  excellent: { color: 'text-neon-orange', bgColor: 'from-neon-orange/30 to-neon-orange/10', icon: <Flame size={32} className="text-neon-orange" /> },
  godtier: { color: 'text-neon-gold', bgColor: 'from-neon-gold/40 to-neon-purple/20', icon: <Crown size={32} className="text-neon-gold" /> },
};

// Trait descriptions for tooltips
const traitDescriptions: Record<string, string> = {
  Steady: 'Reliable baseline, no special effects',
  Lucky: '+50% seed drop chance',
  Glitter: '+20% gem drop chance',
  Turbo: '+30% growth speed',
  Frost: '+25% resin yield',
  DoubleHarvest: '25% chance for 2x harvest',
  SpeedBoost: '+50% growth speed',
  LuckyDrop: '+100% seed drop chance',
  GoldRush: '+50% coin yield',
  EssenceFlow: '+100% essence yield',
  CritMaster: '+15% crit chance',
  Resilient: '20% auto-replant chance',
  Bountiful: '+30% all yields',
};

const traitColors: Record<string, string> = {
  Steady: 'bg-muted-foreground/20 text-muted-foreground',
  Lucky: 'bg-resource-seeds/20 text-resource-seeds',
  Glitter: 'bg-resource-gems/20 text-resource-gems',
  Turbo: 'bg-neon-orange/20 text-neon-orange',
  Frost: 'bg-neon-cyan/20 text-neon-cyan',
  DoubleHarvest: 'bg-resource-budcoin/20 text-resource-budcoin',
  SpeedBoost: 'bg-neon-green/20 text-neon-green',
  LuckyDrop: 'bg-resource-seeds/20 text-resource-seeds',
  GoldRush: 'bg-resource-budcoin/20 text-resource-budcoin',
  EssenceFlow: 'bg-resource-essence/20 text-resource-essence',
  CritMaster: 'bg-destructive/20 text-destructive',
  Resilient: 'bg-secondary/20 text-secondary',
  Bountiful: 'bg-neon-gold/20 text-neon-gold',
};

const breedingBurstConfig: Record<BreedingOutcome, { count: number; colors: string[]; glow: number }> = {
  fail: { count: 14, colors: ['#64748b', '#ef4444', '#1f2937'], glow: 0.2 },
  poor: { count: 18, colors: ['#94a3b8', '#64748b', '#cbd5f5'], glow: 0.3 },
  normal: { count: 26, colors: ['#22c55e', '#a7f3d0', '#06b6d4'], glow: 0.7 },
  good: { count: 36, colors: ['#22c55e', '#facc15', '#ec4899'], glow: 0.9 },
  excellent: { count: 46, colors: ['#f97316', '#facc15', '#22c55e', '#38bdf8'], glow: 1.1 },
  godtier: { count: 60, colors: ['#facc15', '#f97316', '#a855f7', '#ec4899', '#22c55e'], glow: 1.3 },
};

export const GeneticsScreen = () => {
  const seeds = useGameStore(state => state.seeds);
  const budcoins = useGameStore(state => state.budcoins);
  const incrementBreedings = useGameStore(state => state.incrementBreedings);
  const { emitBurst } = useCanvasParticles();
  const [selectedSeeds, setSelectedSeeds] = useState<SeedType[]>([]);
  const [breedingResult, setBreedingResult] = useState<SeedType | null>(null);
  const [breedingOutcome, setBreedingOutcome] = useState<BreedingOutcome | null>(null);
  const [outcomeMessage, setOutcomeMessage] = useState<string>('');
  const [showTraitGuide, setShowTraitGuide] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const resultSlotRef = useRef<HTMLDivElement | null>(null);

  const toggleSeed = (seed: SeedType) => {
    if (selectedSeeds.find(s => s.id === seed.id)) {
      setSelectedSeeds(selectedSeeds.filter(s => s.id !== seed.id));
    } else if (selectedSeeds.length < 2) {
      setSelectedSeeds([...selectedSeeds, seed]);
    }
  };

  const canBreed = selectedSeeds.length === 2 && budcoins >= 100;

  const handleBreed = () => {
    if (!canBreed) return;

    // Get the two selected seeds
    const [seed1, seed2] = selectedSeeds;
    
    // Use the new breeding system
    const result = breedSeeds(seed1, seed2);
    
    // Update store: deduct coins, remove parent seeds, add new seed
    useGameStore.setState(state => {
      const existingHybrids = Array.isArray(state.discoveredHybridSeeds) ? state.discoveredHybridSeeds : [];
      const hasHybrid = existingHybrids.some(seed => seed.name === result.seed.name);
      const discoveredHybridSeeds = hasHybrid ? existingHybrids : [...existingHybrids, result.seed];

      return {
        budcoins: state.budcoins - 100,
        seeds: [
          ...state.seeds.filter(s => s.id !== seed1.id && s.id !== seed2.id),
          result.seed
        ],
        discoveredHybridSeeds,
      };
    });

    // Increment breeding counter for achievements
    incrementBreedings();

    setBreedingResult(result.seed);
    setBreedingOutcome(result.outcome);
    setOutcomeMessage(result.outcomeMessage);
    setSelectedSeeds([]);
    
    // Trigger success modal with burst
    setShowSuccessModal(true);
    const rect = resultSlotRef.current?.getBoundingClientRect();
    if (rect) {
      const config = breedingBurstConfig[result.outcome];
      emitBurst({
        preset: 'breeding',
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        space: 'client',
        count: config.count,
        colors: config.colors,
        glow: config.glow,
      });
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setBreedingResult(null);
    setBreedingOutcome(null);
    setOutcomeMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Dna size={24} className="text-neon-purple" />
          <h1 className="text-2xl font-display font-bold text-neon-purple">Genetics Lab</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowTraitGuide(!showTraitGuide)}
            className={`p-2 rounded-lg transition-colors ${showTraitGuide ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            <Info size={18} />
          </motion.button>
          <span className="text-sm text-muted-foreground">{seeds.length} seeds</span>
        </div>
      </div>

      {/* Trait Guide */}
      {showTraitGuide && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-4 mb-4 game-card p-4 overflow-hidden"
        >
          <h3 className="font-display font-semibold text-sm text-primary mb-3">Trait Guide</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(traitDescriptions).map(([trait, desc]) => (
              <div key={trait} className="flex items-start gap-2">
                <span className={`px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${traitColors[trait] || 'bg-muted text-muted-foreground'}`}>
                  {trait}
                </span>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Breeding Area */}
      <div className="px-4 pb-4">
        <div className="game-card p-4">
          <h3 className="font-display font-semibold text-sm text-muted-foreground mb-3">Breeding Station</h3>
          
          <div className="flex items-center justify-center gap-2">
            {/* Slot 1 */}
            <div className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center
              ${selectedSeeds[0] ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}
            `}>
              {selectedSeeds[0] ? (
                <PlantSVG stage="harvest" rarity={selectedSeeds[0].rarity} traits={selectedSeeds[0].traits} size={60} isAnimated={false} />
              ) : (
                <Plus size={24} className="text-muted-foreground" />
              )}
            </div>

            <Plus size={20} className="text-muted-foreground" />

            {/* Slot 2 */}
            <div className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center
              ${selectedSeeds[1] ? 'border-primary bg-primary/10' : 'border-border bg-muted/30'}
            `}>
              {selectedSeeds[1] ? (
                <PlantSVG stage="harvest" rarity={selectedSeeds[1].rarity} traits={selectedSeeds[1].traits} size={60} isAnimated={false} />
              ) : (
                <Plus size={24} className="text-muted-foreground" />
              )}
            </div>

            <ArrowRight size={20} className="text-muted-foreground" />

            {/* Result */}
            <div
              ref={resultSlotRef}
              className={`w-20 h-20 rounded-xl border-2 flex items-center justify-center
              ${breedingResult ? 'border-neon-gold bg-neon-gold/10 glow-gold' : 'border-border bg-muted/30 border-dashed'}
            `}
            >
              {breedingResult ? (
                <PlantSVG stage="harvest" rarity={breedingResult.rarity} traits={breedingResult.traits} size={60} />
              ) : (
                <Shuffle size={24} className="text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Breed button */}
          <motion.button
            whileTap={{ scale: canBreed ? 0.95 : 1 }}
            onClick={handleBreed}
            disabled={!canBreed}
            className={`w-full mt-4 py-3 rounded-lg font-bold transition-all
              ${canBreed ? 'btn-neon-secondary' : 'bg-muted text-muted-foreground'}
            `}
          >
            {canBreed ? 'Breed (100 $)' : 'Select 2 Seeds'}
          </motion.button>

          {/* Breeding result info */}
          {breedingResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-muted/50 text-center"
            >
              <span className={`font-bold ${rarityColors[breedingResult.rarity]}`}>
                {rarityLabels[breedingResult.rarity]}
              </span>
              <span className="text-foreground"> {breedingResult.name}</span>
              {breedingResult.traits.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 justify-center">
                  {breedingResult.traits.map(trait => (
                    <span key={trait} className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                      {trait}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Seed Inventory */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">Seed Collection</h3>
        
        {seeds.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No seeds available. Harvest plants to get more!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {seeds.map(seed => {
              const isSelected = selectedSeeds.find(s => s.id === seed.id);
              return (
                <motion.button
                  key={seed.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSeed(seed)}
                  className={`game-card p-3 text-left transition-all
                    ${isSelected ? 'ring-2 ring-primary glow-green' : ''}
                    rarity-${seed.rarity}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <PlantSVG stage="seed" rarity={seed.rarity} size={40} isAnimated={false} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{seed.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${rarityColors[seed.rarity]}`}>
                          {rarityLabels[seed.rarity]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {getGenerationDisplay(seed.generation)}
                        </span>
                      </div>
                      <span className="text-[10px] text-neon-green font-medium">
                        📦 {getYieldDisplay(seed)}
                      </span>
                    </div>
                  </div>
                  {seed.traits.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {seed.traits.map(trait => (
                        <span 
                          key={trait} 
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${traitColors[trait] || 'bg-muted text-muted-foreground'}`}
                          title={traitDescriptions[trait] || trait}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Success Modal with Confetti */}
      <AnimatePresence>
        {showSuccessModal && breedingResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={closeSuccessModal}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full max-w-sm p-6 rounded-2xl bg-gradient-to-br ${rarityBgColors[breedingResult.rarity]} border-2 border-${breedingResult.rarity === 'legendary' ? 'neon-gold' : 'primary'}/50 shadow-2xl`}
            >
              {/* Sparkle decorations */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute -top-4 -right-4"
              >
                <Sparkles size={32} className="text-neon-gold" />
              </motion.div>
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-4 -left-4"
              >
                <Sparkles size={24} className="text-neon-green" />
              </motion.div>

              <div className="text-center space-y-4">
                {/* Success Icon - changes based on outcome */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", damping: 10 }}
                  className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${breedingOutcome ? outcomeStyles[breedingOutcome].bgColor : 'from-primary/30 to-primary/10'} flex items-center justify-center`}
                >
                  {breedingOutcome ? outcomeStyles[breedingOutcome].icon : <CheckCircle2 size={32} className="text-primary" />}
                </motion.div>

                {/* Title with outcome message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className={`text-sm font-medium ${breedingOutcome ? outcomeStyles[breedingOutcome].color : 'text-primary'}`}>
                    {outcomeMessage || 'Kreuzung abgeschlossen!'}
                  </p>
                </motion.div>

                {/* Seed Preview */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-xl bg-background/50 border border-border"
                >
                  <div className="flex items-center justify-center gap-3">
                    <PlantSVG stage="seed" rarity={breedingResult.rarity} size={60} />
                    <div className="text-left">
                      <h3 className="font-bold text-lg">{breedingResult.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${rarityColors[breedingResult.rarity]}`}>
                          {rarityLabels[breedingResult.rarity]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getGenerationDisplay(breedingResult.generation)}
                        </span>
                      </div>
                      <span className="text-xs text-neon-green font-medium">
                        📦 {getYieldDisplay(breedingResult)}
                      </span>
                    </div>
                  </div>
                  
                  {breedingResult.traits.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1 justify-center">
                      {breedingResult.traits.map(trait => (
                        <span 
                          key={trait} 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${traitColors[trait] || 'bg-muted text-muted-foreground'}`}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground">Ertrag</div>
                      <div className="font-bold text-neon-green">{getYieldDisplay(breedingResult)}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground">Speed</div>
                      <div className="font-bold text-primary">{breedingResult.growthSpeed.toFixed(1)}x</div>
                    </div>
                  </div>
                </motion.div>

                {/* Inventory Added Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 text-neon-green"
                >
                  <Package size={18} />
                  <span className="font-semibold">Zum Inventar hinzugefügt!</span>
                </motion.div>

                {/* Close Button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  type="button"
                  onClick={closeSuccessModal}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-neon-green text-background font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <CheckCircle2 size={20} />
                  Weiter züchten
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
