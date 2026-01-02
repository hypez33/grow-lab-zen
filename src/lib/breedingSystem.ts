import { Seed, Rarity } from '@/store/gameStore';

// ================== CREATIVE NAME GENERATION ==================

// Name prefixes based on generation (more bred = crazier prefixes)
const NAME_PREFIXES: Record<number, string[]> = {
  1: ['Hybrid', 'Cross', 'Mix', 'Blend', 'Fusion'],
  2: ['Ultra', 'Super', 'Mega', 'Power', 'Prime', 'Alpha'],
  3: ['Atomic', 'Nuclear', 'Plasma', 'Quantum', 'Cosmic', 'Astral', 'Nebula'],
  4: ['Godlike', 'Divine', 'Celestial', 'Immortal', 'Eternal', 'Omnipotent'],
  5: ['Transcendent', 'Legendary', 'Mythical', 'Apocalyptic', 'Dimension-Shattering', 'Reality-Bending'],
};

// Creative adjectives for strain names
const ADJECTIVES = [
  'Crystal', 'Purple', 'Golden', 'Silver', 'Neon', 'Glowing', 'Frozen', 'Burning',
  'Thunder', 'Lightning', 'Shadow', 'Mystic', 'Phantom', 'Ghost', 'Dream', 'Nightmare',
  'Cosmic', 'Stellar', 'Solar', 'Lunar', 'Arctic', 'Tropical', 'Desert', 'Ocean',
  'Electric', 'Magnetic', 'Radioactive', 'Toxic', 'Venomous', 'Healing', 'Sacred', 'Cursed',
  'Royal', 'Imperial', 'Savage', 'Wild', 'Ancient', 'Primal', 'Eternal', 'Infinite',
];

// Creative nouns for strain names
const NOUNS = [
  'Kush', 'Haze', 'Dream', 'Blaze', 'Fire', 'Ice', 'Storm', 'Thunder',
  'Widow', 'Ghost', 'Phantom', 'Spirit', 'Diesel', 'Express', 'Rocket', 'Bomb',
  'Glue', 'Cookies', 'Cake', 'Cream', 'Frost', 'Crush', 'Punch', 'Slap',
  'OG', 'Zkittlez', 'Gelato', 'Runtz', 'Sherbet', 'Sunset', 'Sunrise', 'Eclipse',
  'Venom', 'Poison', 'Elixir', 'Potion', 'Nectar', 'Honey', 'Syrup', 'Juice',
  'King', 'Queen', 'Prince', 'Emperor', 'Titan', 'Giant', 'Monster', 'Beast',
];

// Special suffixes for high generations
const EPIC_SUFFIXES = ['X', 'XL', 'XXL', 'MAX', 'ULTRA', 'OMEGA', 'PRIME', 'APEX', 'GOD', 'INFINITY'];

// Failed breeding names (when breeding goes wrong)
const FAIL_NAMES = [
  'Sad Weed', 'Depressing Plant', 'Garbage Grass', 'Trash Tier', 'Schwache Sorte',
  'Disappointment', 'Epic Fail', 'Mist-Ernte', 'Total Flopp', 'Schimmel-Spezial',
  'Lahmes Laub', 'Peinliche Pflanze', 'Katastrophen-Kraut', 'Versager-Variante',
  'Müll-Mutation', 'Ruinen-Rauch', 'Schrott-Strain', 'Wertlos-Weed', 'Null-Nug',
];

// Super success names (when breeding goes extremely well)
const GODTIER_NAMES = [
  'God Strain', 'Holy Grail', 'Perfection', 'Masterpiece', 'Meisterwerk',
  'Göttliche Genetik', 'Legende', 'Unsterblich', 'Ultimativ', 'Absolut',
  'Gottheit', 'Überpflanze', 'Wunder-Weed', 'Phänomen', 'Einzigartig',
];

/**
 * Generate a creative hybrid name based on parent names and generation
 */
export function generateHybridName(
  parent1Name: string,
  parent2Name: string,
  generation: number,
  outcomeType: 'normal' | 'fail' | 'godtier'
): string {
  // Failed breeding - use fail name
  if (outcomeType === 'fail') {
    return FAIL_NAMES[Math.floor(Math.random() * FAIL_NAMES.length)];
  }
  
  // God tier breeding
  if (outcomeType === 'godtier') {
    const godName = GODTIER_NAMES[Math.floor(Math.random() * GODTIER_NAMES.length)];
    if (generation >= 3) {
      const suffix = EPIC_SUFFIXES[Math.floor(Math.random() * EPIC_SUFFIXES.length)];
      return `${godName} ${suffix}`;
    }
    return godName;
  }
  
  // Normal breeding - creative name generation
  const roll = Math.random();
  
  // 40% chance: Combine parent names creatively
  if (roll < 0.4) {
    const p1Parts = parent1Name.split(' ');
    const p2Parts = parent2Name.split(' ');
    
    // Take first word from parent1, last word from parent2
    const part1 = p1Parts[0];
    const part2 = p2Parts[p2Parts.length - 1];
    
    let name = `${part1} ${part2}`;
    
    // Add generation prefix for higher generations
    if (generation >= 2) {
      const prefixes = NAME_PREFIXES[Math.min(generation, 5)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      name = `${prefix} ${name}`;
    }
    
    // Add suffix for very high generations
    if (generation >= 4) {
      const suffix = EPIC_SUFFIXES[Math.floor(Math.random() * EPIC_SUFFIXES.length)];
      name = `${name} ${suffix}`;
    }
    
    return name;
  }
  
  // 30% chance: Blend syllables from both names
  if (roll < 0.7) {
    const blend1 = parent1Name.substring(0, Math.ceil(parent1Name.length / 2));
    const blend2 = parent2Name.substring(Math.floor(parent2Name.length / 2));
    let name = `${blend1}${blend2}`.replace(/\s+/g, '');
    
    if (generation >= 2) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      name = `${adj} ${name}`;
    }
    
    if (generation >= 4) {
      const suffix = EPIC_SUFFIXES[Math.floor(Math.random() * EPIC_SUFFIXES.length)];
      name = `${name} ${suffix}`;
    }
    
    return name;
  }
  
  // 30% chance: Completely random creative name
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  let name = `${adj} ${noun}`;
  
  if (generation >= 2) {
    const prefixes = NAME_PREFIXES[Math.min(generation, 5)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    name = `${prefix} ${name}`;
  }
  
  if (generation >= 5) {
    const suffix = EPIC_SUFFIXES[Math.floor(Math.random() * EPIC_SUFFIXES.length)];
    name = `${name} ${suffix}`;
  }
  
  return name;
}

// ================== BREEDING OUTCOME CALCULATION ==================

export type BreedingOutcome = 'fail' | 'poor' | 'normal' | 'good' | 'excellent' | 'godtier';

/**
 * Determine the breeding outcome with weighted randomness
 * Higher generations have more variance (higher risk, higher reward)
 */
export function calculateBreedingOutcome(generation: number): BreedingOutcome {
  const roll = Math.random() * 100;
  
  // Base probabilities (generation 1)
  // fail: 10%, poor: 15%, normal: 45%, good: 20%, excellent: 8%, godtier: 2%
  
  // Higher generation = more variance
  const varianceBonus = Math.min(generation * 3, 15); // Max 15% shift
  
  if (roll < 10 - varianceBonus / 2) return 'fail';      // Decreases slightly with gen
  if (roll < 25 - varianceBonus) return 'poor';          // Decreases with gen
  if (roll < 70 - varianceBonus * 1.5) return 'normal';  // Decreases significantly
  if (roll < 90) return 'good';                          // Stays stable
  if (roll < 98 - varianceBonus / 2) return 'excellent'; // Increases with gen
  return 'godtier';                                      // Increases with gen
}

/**
 * Apply breeding outcome modifiers to stats
 */
export function applyOutcomeModifiers(
  outcome: BreedingOutcome,
  baseStats: { yield: number; yieldMin: number; yieldMax: number; growthSpeed: number }
): { yield: number; yieldMin: number; yieldMax: number; growthSpeed: number } {
  const modifiers: Record<BreedingOutcome, { yieldMult: number; speedMult: number; variance: number }> = {
    fail: { yieldMult: 0.3, speedMult: 0.5, variance: 0.1 },
    poor: { yieldMult: 0.6, speedMult: 0.7, variance: 0.15 },
    normal: { yieldMult: 1.0, speedMult: 1.0, variance: 0.2 },
    good: { yieldMult: 1.3, speedMult: 1.15, variance: 0.25 },
    excellent: { yieldMult: 1.6, speedMult: 1.3, variance: 0.3 },
    godtier: { yieldMult: 2.5, speedMult: 1.5, variance: 0.4 },
  };
  
  const mod = modifiers[outcome];
  const newYield = Math.floor(baseStats.yield * mod.yieldMult);
  const variance = mod.variance;
  
  return {
    yield: newYield,
    yieldMin: Math.floor(newYield * (1 - variance)),
    yieldMax: Math.floor(newYield * (1 + variance)),
    growthSpeed: Number((baseStats.growthSpeed * mod.speedMult).toFixed(2)),
  };
}

/**
 * Determine new rarity based on parent rarities and outcome
 */
export function calculateNewRarity(
  parent1Rarity: Rarity,
  parent2Rarity: Rarity,
  outcome: BreedingOutcome
): Rarity {
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const r1Index = rarities.indexOf(parent1Rarity);
  const r2Index = rarities.indexOf(parent2Rarity);
  const avgRarity = Math.floor((r1Index + r2Index) / 2);
  
  let newRarityIndex: number;
  
  switch (outcome) {
    case 'fail':
      newRarityIndex = Math.max(0, avgRarity - 2);
      break;
    case 'poor':
      newRarityIndex = Math.max(0, avgRarity - 1);
      break;
    case 'normal':
      newRarityIndex = avgRarity;
      break;
    case 'good':
      newRarityIndex = Math.min(4, avgRarity + 1);
      break;
    case 'excellent':
      newRarityIndex = Math.min(4, Math.max(r1Index, r2Index) + 1);
      break;
    case 'godtier':
      newRarityIndex = Math.min(4, Math.max(r1Index, r2Index) + 2);
      break;
    default:
      newRarityIndex = avgRarity;
  }
  
  return rarities[newRarityIndex];
}

/**
 * Combine traits from parents with mutation chance
 */
export function combineTraits(
  parent1Traits: string[],
  parent2Traits: string[],
  outcome: BreedingOutcome
): string[] {
  const allTraits = [...new Set([...parent1Traits, ...parent2Traits])];
  
  // Failed breeding loses most traits
  if (outcome === 'fail') {
    if (allTraits.length === 0) return ['Steady'];
    return [allTraits[Math.floor(Math.random() * allTraits.length)]];
  }
  
  // Poor breeding keeps fewer traits
  if (outcome === 'poor') {
    return allTraits.filter(() => Math.random() > 0.5).slice(0, 2);
  }
  
  // Normal: random selection
  let traits = allTraits.filter(() => Math.random() > 0.4);
  if (traits.length === 0 && allTraits.length > 0) {
    traits = [allTraits[0]];
  }
  
  // Good/Excellent: keep more traits
  if (outcome === 'good') {
    traits = allTraits.filter(() => Math.random() > 0.3);
  }
  if (outcome === 'excellent') {
    traits = allTraits.filter(() => Math.random() > 0.2);
  }
  
  // Godtier: keep all + possible mutation (new trait)
  if (outcome === 'godtier') {
    traits = [...allTraits];
    
    // 50% chance to gain a random powerful trait
    if (Math.random() > 0.5) {
      const powerTraits = ['Bountiful', 'GoldRush', 'DoubleHarvest', 'CritMaster', 'LuckyDrop'];
      const newTrait = powerTraits[Math.floor(Math.random() * powerTraits.length)];
      if (!traits.includes(newTrait)) {
        traits.push(newTrait);
      }
    }
  }
  
  return traits.slice(0, 5); // Max 5 traits
}

// ================== MAIN BREEDING FUNCTION ==================

export interface BreedingResult {
  seed: Seed;
  outcome: BreedingOutcome;
  outcomeMessage: string;
}

export function breedSeeds(parent1: Seed, parent2: Seed): BreedingResult {
  // Calculate new generation (highest parent + 1)
  const newGeneration = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;
  
  // Calculate breeding outcome
  const outcome = calculateBreedingOutcome(newGeneration);
  
  // Determine name type
  const nameType: 'normal' | 'fail' | 'godtier' = 
    outcome === 'fail' ? 'fail' : 
    outcome === 'godtier' ? 'godtier' : 'normal';
  
  // Generate creative name
  const name = generateHybridName(parent1.name, parent2.name, newGeneration, nameType);
  
  // Calculate base stats (average of parents)
  const avgYield = Math.floor((parent1.baseYield + parent2.baseYield) / 2);
  const avgSpeed = (parent1.growthSpeed + parent2.growthSpeed) / 2;
  const avgYieldMin = Math.floor(((parent1.yieldMin || parent1.baseYield * 0.8) + (parent2.yieldMin || parent2.baseYield * 0.8)) / 2);
  const avgYieldMax = Math.floor(((parent1.yieldMax || parent1.baseYield * 1.2) + (parent2.yieldMax || parent2.baseYield * 1.2)) / 2);
  
  // Apply outcome modifiers
  const modifiedStats = applyOutcomeModifiers(outcome, {
    yield: avgYield,
    yieldMin: avgYieldMin,
    yieldMax: avgYieldMax,
    growthSpeed: avgSpeed,
  });
  
  // Calculate rarity
  const rarity = calculateNewRarity(parent1.rarity, parent2.rarity, outcome);
  
  // Combine traits
  const traits = combineTraits(parent1.traits, parent2.traits, outcome);
  
  // Create the new seed
  const newSeed: Seed = {
    id: `bred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rarity,
    traits,
    baseYield: modifiedStats.yield,
    growthSpeed: modifiedStats.growthSpeed,
    generation: newGeneration,
    yieldMin: modifiedStats.yieldMin,
    yieldMax: modifiedStats.yieldMax,
    isHybrid: true,
    parentNames: [parent1.name, parent2.name],
  };
  
  // Generate outcome message
  const outcomeMessages: Record<BreedingOutcome, string> = {
    fail: '💀 Kreuzung fehlgeschlagen! Die Genetik war nicht kompatibel...',
    poor: '😕 Schwache Kreuzung. Das Ergebnis ist enttäuschend.',
    normal: '✓ Normale Kreuzung. Solides Ergebnis!',
    good: '✨ Gute Kreuzung! Die Genetik hat sich gut vermischt.',
    excellent: '🔥 Exzellente Kreuzung! Ein beeindruckender Hybrid!',
    godtier: '🌟 GÖTTLICHE KREUZUNG! Du hast einen legendären Strain erschaffen!',
  };
  
  return {
    seed: newSeed,
    outcome,
    outcomeMessage: outcomeMessages[outcome],
  };
}

/**
 * Get display text for yield range
 */
export function getYieldDisplay(seed: Seed): string {
  const min = seed.yieldMin ?? Math.floor(seed.baseYield * 0.8);
  const max = seed.yieldMax ?? Math.floor(seed.baseYield * 1.2);
  return `${min}-${max}g/Pflanze`;
}

/**
 * Get generation display text
 */
export function getGenerationDisplay(generation: number | undefined): string {
  if (!generation || generation === 0) return 'Original';
  if (generation === 1) return 'F1 Hybrid';
  if (generation === 2) return 'F2 Hybrid';
  if (generation === 3) return 'F3 Elite';
  if (generation === 4) return 'F4 Ultra';
  if (generation >= 5) return `F${generation} Legende`;
  return `Gen ${generation}`;
}
