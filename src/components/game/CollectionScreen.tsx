import { motion } from 'framer-motion';
import { useGameStore, SEED_CATALOG, COLLECTION_BONUSES, Rarity, Seed } from '@/store/gameStore';
import { PlantSVG } from './PlantSVG';
import { Book, Check, Lock, Gift, Sparkles, Dna } from 'lucide-react';
import { getGenerationDisplay } from '@/lib/breedingSystem';

const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const rarityLabels: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

const rarityColors: Record<Rarity, string> = {
  common: 'text-rarity-common border-rarity-common/30 bg-rarity-common/10',
  uncommon: 'text-rarity-uncommon border-rarity-uncommon/30 bg-rarity-uncommon/10',
  rare: 'text-rarity-rare border-rarity-rare/30 bg-rarity-rare/10',
  epic: 'text-rarity-epic border-rarity-epic/30 bg-rarity-epic/10',
  legendary: 'text-rarity-legendary border-rarity-legendary/30 bg-rarity-legendary/10',
};

const rarityGlow: Record<Rarity, string> = {
  common: '',
  uncommon: 'shadow-[0_0_15px_hsl(var(--rarity-uncommon)/0.3)]',
  rare: 'shadow-[0_0_20px_hsl(var(--rarity-rare)/0.3)]',
  epic: 'shadow-[0_0_25px_hsl(var(--rarity-epic)/0.4)]',
  legendary: 'shadow-[0_0_30px_hsl(var(--rarity-legendary)/0.5)]',
};

export const CollectionScreen = () => {
  const { discoveredSeeds, getCollectionBonus, discoveredHybridSeeds } = useGameStore();

  const totalSeeds = SEED_CATALOG.length;
  const discoveredCount = discoveredSeeds.length;
  const completionPercent = Math.floor((discoveredCount / totalSeeds) * 100);

  const hybridSeeds = Array.from(
    new Map((discoveredHybridSeeds || []).map((seed: Seed) => [seed.name, seed])).values()
  ).sort((a, b) => {
    const rarityDelta = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    if (rarityDelta !== 0) return rarityDelta;
    return a.name.localeCompare(b.name);
  });

  // Group seeds by rarity
  const seedsByRarity = rarityOrder.reduce((acc, rarity) => {
    acc[rarity] = SEED_CATALOG.filter(s => s.rarity === rarity);
    return acc;
  }, {} as Record<Rarity, typeof SEED_CATALOG>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Book size={24} className="text-neon-gold" />
            <h1 className="text-2xl font-display font-bold text-neon-gold">Collection</h1>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{discoveredCount}/{totalSeeds}</span>
            <p className="text-xs text-muted-foreground">{completionPercent}% Complete</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-gold"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Collection by Rarity */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-6">
        {rarityOrder.map(rarity => {
          const seeds = seedsByRarity[rarity];
          const discovered = seeds.filter(s => discoveredSeeds.includes(s.name));
          const isComplete = getCollectionBonus(rarity);
          const bonus = COLLECTION_BONUSES[rarity];

          return (
            <section key={rarity} className="space-y-3">
              {/* Rarity Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className={`font-display font-bold ${rarityColors[rarity].split(' ')[0]}`}>
                    {rarityLabels[rarity]}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {discovered.length}/{seeds.length}
                  </span>
                </div>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold"
                  >
                    <Check size={12} />
                    Complete!
                  </motion.div>
                )}
              </div>

              {/* Bonus Card */}
              <motion.div
                className={`game-card p-3 border-2 transition-all ${
                  isComplete 
                    ? `${rarityColors[rarity]} ${rarityGlow[rarity]}` 
                    : 'border-border bg-muted/30 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isComplete ? 'bg-primary/20' : 'bg-muted'}`}>
                    {isComplete ? (
                      <Gift size={20} className="text-primary" />
                    ) : (
                      <Lock size={20} className="text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      {bonus.label}
                    </h3>
                    <p className={`text-xs ${isComplete ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isComplete ? '✓ Active: ' : 'Collect all to unlock: '}
                      {bonus.effect}
                    </p>
                  </div>
                  {isComplete && (
                    <Sparkles size={20} className="text-neon-gold animate-pulse" />
                  )}
                </div>
              </motion.div>

              {/* Seed Grid */}
              <div className="grid grid-cols-3 gap-2">
                {seeds.map((seed, index) => {
                  const isDiscovered = discoveredSeeds.includes(seed.name);
                  
                  return (
                    <motion.div
                      key={seed.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={`game-card p-2 flex flex-col items-center text-center transition-all ${
                        isDiscovered 
                          ? `rarity-${rarity}` 
                          : 'opacity-40 grayscale'
                      }`}
                    >
                      <div className="relative">
                        <PlantSVG 
                          stage="harvest" 
                          rarity={seed.rarity} 
                          traits={seed.traits}
                          size={50} 
                          isAnimated={isDiscovered}
                        />
                        {!isDiscovered && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lock size={20} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold mt-1 ${
                        isDiscovered ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {isDiscovered ? seed.name : '???'}
                      </span>
                      {isDiscovered && seed.traits.length > 0 && (
                        <span className="text-[8px] text-muted-foreground truncate max-w-full">
                          {seed.traits.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {hybridSeeds.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dna size={16} className="text-neon-purple" />
                <h2 className="font-display font-bold text-neon-purple">Hybrids</h2>
              </div>
              <span className="text-xs text-muted-foreground">{hybridSeeds.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {hybridSeeds.map((seed, index) => (
                <motion.div
                  key={seed.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className={`game-card p-2 flex flex-col items-center text-center transition-all rarity-${seed.rarity}`}
                >
                  <PlantSVG 
                    stage="harvest" 
                    rarity={seed.rarity} 
                    traits={seed.traits}
                    size={50} 
                    isAnimated
                  />
                  <span className="text-[10px] font-semibold mt-1 text-foreground">
                    {seed.name}
                  </span>
                  <span className="text-[8px] text-muted-foreground">
                    {getGenerationDisplay(seed.generation)}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Master Collection Bonus */}
        <section className="mt-6">
          <motion.div
            className={`game-card p-4 border-2 text-center ${
              discoveredCount === totalSeeds 
                ? 'border-neon-gold bg-neon-gold/10 glow-gold' 
                : 'border-border bg-muted/30'
            }`}
          >
            <h3 className="font-display font-bold text-lg mb-1">
              🏆 Master Collector
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              Discover all {totalSeeds} seeds
            </p>
            <p className={`text-sm font-semibold ${
              discoveredCount === totalSeeds ? 'text-neon-gold' : 'text-muted-foreground'
            }`}>
              {discoveredCount === totalSeeds 
                ? '✓ Active: +100% All Bonuses!' 
                : `${discoveredCount}/${totalSeeds} discovered`
              }
            </p>
          </motion.div>
        </section>
      </div>
    </div>
  );
};
