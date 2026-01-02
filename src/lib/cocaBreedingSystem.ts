import type { CocaSeed, CocaRarity } from '@/store/cocaStore';

// ================== CREATIVE NAME GENERATION FOR COCA ==================

// Name prefixes based on generation (more bred = more intense/dangerous)
const COCA_NAME_PREFIXES: Record<number, string[]> = {
  1: ['Hybrid', 'Cross', 'Mix', 'Blend', 'Fusion'],
  2: ['Super', 'Mega', 'Power', 'Prime', 'Elite', 'Premium'],
  3: ['Cartel', 'Kingpin', 'Boss', 'Supremo', 'Imperio', 'Jefe'],
  4: ['Legendary', 'Mythical', 'Divine', 'Immortal', 'Eternal'],
  5: ['Godlike', 'Apocalyptic', 'Ultimate', 'Absolute', 'Omnipotent', 'Unstoppable'],
};

// Creative adjectives for Coca strain names (Colombia/South America themed)
const COCA_ADJECTIVES = [
  'Colombian', 'Bolivian', 'Peruvian', 'Andean', 'Amazon', 'Chapare',
  'Medellín', 'Cali', 'Cartagena', 'Bogotá', 'La Paz', 'Lima',
  'White', 'Pure', 'Crystal', 'Diamond', 'Platinum', 'Golden',
  'Royal', 'Imperial', 'Supreme', 'Premium', 'Elite', 'Legendary',
  'Mountain', 'Valley', 'Jungle', 'River', 'Snow', 'Ice',
  'Thunder', 'Lightning', 'Storm', 'Fire', 'Frost', 'Blaze',
  'Shadow', 'Ghost', 'Phantom', 'Mystic', 'Sacred', 'Ancient',
];

// Creative nouns for Coca strain names
const COCA_NOUNS = [
  'Blanca', 'Negra', 'Roja', 'Verde', 'Azul', 'Dorada',
  'Legacy', 'Heritage', 'Empire', 'Dynasty', 'Kingdom', 'Reign',
  'Thunder', 'Lightning', 'Storm', 'Blizzard', 'Avalanche',
  'Diamond', 'Crystal', 'Pearl', 'Jewel', 'Treasure', 'Gold',
  'Devil', 'Angel', 'Spirit', 'Ghost', 'Phantom', 'Shadow',
  'King', 'Queen', 'Prince', 'Emperor', 'Boss', 'Jefe',
  'Powder', 'Snow', 'Ice', 'Frost', 'White', 'Pure',
  'Supremo', 'Especial', 'Premium', 'Classic', 'Royal', 'Imperial',
];

// Special suffixes for high generations
const COCA_EPIC_SUFFIXES = [
  'X', 'XL', 'XXL', 'MAX', 'ULTRA', 'OMEGA', 'PRIME', 'APEX',
  'GOD', 'INFINITY', 'SUPREMO', 'CARTEL', 'KINGPIN', 'BOSS'
];

// Failed breeding names (when breeding goes wrong)
const COCA_FAIL_NAMES = [
  'Schwache Blätter', 'Trash Coca', 'Müll-Mix', 'Versager-Variante',
  'Schimmel-Spezial', 'Ruinen-Rauch', 'Wertlos-Weed', 'Katastrophe',
  'Epic Fail', 'Total Flopp', 'Garbage Grade', 'Schrott-Strain',
  'Null-Nug', 'Depressing Plant', 'Disappointment', 'Sad Leaves',
];

// Super success names (when breeding goes extremely well)
const COCA_GODTIER_NAMES = [
  'Pablo\'s Perfection', 'El Patrón\'s Pride', 'Escobar\'s Legacy',
  'Cartel Supreme', 'Kingpin\'s Crown', 'God Strain', 'Divine Powder',
  'Holy Grail', 'Meisterwerk', 'Göttliche Genetik', 'Unsterblich',
  'Ultimate Blanca', 'Absolute Purity', 'Legendary White', 'Perfection',
];

/**
 * Generate a creative hybrid name based on parent names and generation
 */
export function generateCocaHybridName(
  parent1Name: string,
  parent2Name: string,
  generation: number,
  outcomeType: 'normal' | 'fail' | 'godtier'
): string {
  // Failed breeding - use fail name
  if (outcomeType === 'fail') {
    return COCA_FAIL_NAMES[Math.floor(Math.random() * COCA_FAIL_NAMES.length)];
  }

  // God tier breeding
  if (outcomeType === 'godtier') {
    const godName = COCA_GODTIER_NAMES[Math.floor(Math.random() * COCA_GODTIER_NAMES.length)];
    if (generation >= 3) {
      const suffix = COCA_EPIC_SUFFIXES[Math.floor(Math.random() * COCA_EPIC_SUFFIXES.length)];
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
      const prefixes = COCA_NAME_PREFIXES[Math.min(generation, 5)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      name = `${prefix} ${name}`;
    }

    // Add suffix for very high generations
    if (generation >= 4) {
      const suffix = COCA_EPIC_SUFFIXES[Math.floor(Math.random() * COCA_EPIC_SUFFIXES.length)];
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
      const adj = COCA_ADJECTIVES[Math.floor(Math.random() * COCA_ADJECTIVES.length)];
      name = `${adj} ${name}`;
    }

    if (generation >= 4) {
      const suffix = COCA_EPIC_SUFFIXES[Math.floor(Math.random() * COCA_EPIC_SUFFIXES.length)];
      name = `${name} ${suffix}`;
    }

    return name;
  }

  // 30% chance: Completely random creative name
  const adj = COCA_ADJECTIVES[Math.floor(Math.random() * COCA_ADJECTIVES.length)];
  const noun = COCA_NOUNS[Math.floor(Math.random() * COCA_NOUNS.length)];
  let name = `${adj} ${noun}`;

  if (generation >= 2) {
    const prefixes = COCA_NAME_PREFIXES[Math.min(generation, 5)];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    name = `${prefix} ${name}`;
  }

  if (generation >= 5) {
    const suffix = COCA_EPIC_SUFFIXES[Math.floor(Math.random() * COCA_EPIC_SUFFIXES.length)];
    name = `${name} ${suffix}`;
  }

  return name;
}

// ================== BREEDING OUTCOME CALCULATION ==================

export type CocaBreedingOutcome = 'fail' | 'poor' | 'normal' | 'good' | 'excellent' | 'godtier';

/**
 * Determine the breeding outcome with weighted randomness
 * Higher generations have more variance (higher risk, higher reward)
 */
export function calculateCocaBreedingOutcome(generation: number): CocaBreedingOutcome {
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
 * Coca breeding focuses on yield and growth speed, plus purity bonuses
 */
export function applyCocaOutcomeModifiers(
  outcome: CocaBreedingOutcome,
  baseStats: { yield: number; growthSpeed: number }
): { yield: number; growthSpeed: number; purityBonus: number } {
  const modifiers: Record<CocaBreedingOutcome, { yieldMult: number; speedMult: number; purityBonus: number }> = {
    fail: { yieldMult: 0.3, speedMult: 0.5, purityBonus: -10 },
    poor: { yieldMult: 0.6, speedMult: 0.7, purityBonus: -5 },
    normal: { yieldMult: 1.0, speedMult: 1.0, purityBonus: 0 },
    good: { yieldMult: 1.3, speedMult: 1.15, purityBonus: 5 },
    excellent: { yieldMult: 1.6, speedMult: 1.3, purityBonus: 10 },
    godtier: { yieldMult: 2.5, speedMult: 1.5, purityBonus: 20 },
  };

  const mod = modifiers[outcome];

  return {
    yield: Math.floor(baseStats.yield * mod.yieldMult),
    growthSpeed: Number((baseStats.growthSpeed * mod.speedMult).toFixed(2)),
    purityBonus: mod.purityBonus,
  };
}

/**
 * Determine new rarity based on parent rarities and outcome
 */
export function calculateCocaNewRarity(
  parent1Rarity: CocaRarity,
  parent2Rarity: CocaRarity,
  outcome: CocaBreedingOutcome
): CocaRarity {
  const rarities: CocaRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
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
export function combineCocaTraits(
  parent1Traits: string[],
  parent2Traits: string[],
  outcome: CocaBreedingOutcome
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
      const powerTraits = ['HighPurity', 'FastProcess', 'BulkYield', 'DoubleRefine', 'LowLoss'];
      const newTrait = powerTraits[Math.floor(Math.random() * powerTraits.length)];
      if (!traits.includes(newTrait)) {
        traits.push(newTrait);
      }
    }
  }

  return traits.slice(0, 5); // Max 5 traits
}

// ================== MAIN BREEDING FUNCTION ==================

export interface CocaBreedingResult {
  seed: CocaSeed;
  outcome: CocaBreedingOutcome;
  outcomeMessage: string;
  purityBonus: number;
}

export function breedCocaSeeds(parent1: CocaSeed, parent2: CocaSeed): CocaBreedingResult {
  // Calculate new generation (highest parent + 1)
  const newGeneration = Math.max(parent1.generation || 0, parent2.generation || 0) + 1;

  // Calculate breeding outcome
  const outcome = calculateCocaBreedingOutcome(newGeneration);

  // Determine name type
  const nameType: 'normal' | 'fail' | 'godtier' =
    outcome === 'fail' ? 'fail' :
    outcome === 'godtier' ? 'godtier' : 'normal';

  // Generate creative name
  const name = generateCocaHybridName(parent1.name, parent2.name, newGeneration, nameType);

  // Calculate base stats (average of parents)
  const avgYield = Math.floor((parent1.baseYield + parent2.baseYield) / 2);
  const avgSpeed = (parent1.growthSpeed + parent2.growthSpeed) / 2;

  // Apply outcome modifiers
  const modifiedStats = applyCocaOutcomeModifiers(outcome, {
    yield: avgYield,
    growthSpeed: avgSpeed,
  });

  // Calculate rarity
  const rarity = calculateCocaNewRarity(parent1.rarity, parent2.rarity, outcome);

  // Combine traits
  const traits = combineCocaTraits(parent1.traits, parent2.traits, outcome);

  // Create the new seed
  const newSeed: CocaSeed = {
    id: `coca-bred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rarity,
    traits,
    baseYield: modifiedStats.yield,
    growthSpeed: modifiedStats.growthSpeed,
    generation: newGeneration,
    isHybrid: true,
    parentNames: [parent1.name, parent2.name],
  };

  // Generate outcome message
  const outcomeMessages: Record<CocaBreedingOutcome, string> = {
    fail: '💀 Kreuzung fehlgeschlagen! Die Genetik war nicht kompatibel...',
    poor: '😕 Schwache Kreuzung. Das Ergebnis ist enttäuschend.',
    normal: '✓ Normale Kreuzung. Solides Ergebnis!',
    good: '✨ Gute Kreuzung! Die Genetik hat sich gut vermischt.',
    excellent: '🔥 Exzellente Kreuzung! Ein beeindruckender Hybrid!',
    godtier: '🌟 GÖTTLICHE KREUZUNG! El Patrón wäre stolz!',
  };

  return {
    seed: newSeed,
    outcome,
    outcomeMessage: outcomeMessages[outcome],
    purityBonus: modifiedStats.purityBonus,
  };
}

/**
 * Get generation display text
 */
export function getCocaGenerationDisplay(generation: number | undefined): string {
  if (!generation || generation === 0) return 'Original';
  if (generation === 1) return 'F1 Hybrid';
  if (generation === 2) return 'F2 Hybrid';
  if (generation === 3) return 'F3 Elite';
  if (generation === 4) return 'F4 Cartel';
  if (generation >= 5) return `F${generation} Kingpin`;
  return `Gen ${generation}`;
}
