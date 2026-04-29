import type { Upgrade } from '@/store/gameStore';

export const INITIAL_UPGRADES: Upgrade[] = [
  // Equipment - Core growth
  { id: 'led-panel', name: 'LED Panel', description: 'Increases growth speed', category: 'equipment', baseCost: 50, costScaling: 1.5, level: 0, maxLevel: 50, effect: 'growthSpeed', effectValue: 0.1 },
  { id: 'ventilation', name: 'Ventilation', description: 'Critical harvest chance', category: 'equipment', baseCost: 100, costScaling: 1.6, level: 0, maxLevel: 30, effect: 'critChance', effectValue: 0.02 },
  { id: 'nutrient', name: 'Nutrient Injector', description: 'Essence multiplier', category: 'equipment', baseCost: 200, costScaling: 1.7, level: 0, maxLevel: 25, effect: 'essenceMult', effectValue: 0.15 },
  { id: 'trimming', name: 'Trimming Station', description: 'Harvest bonus', category: 'equipment', baseCost: 150, costScaling: 1.5, level: 0, maxLevel: 40, effect: 'harvestBonus', effectValue: 0.1 },
  { id: 'grow-slot', name: 'New Grow Slot', description: 'Unlock another pot', category: 'equipment', baseCost: 250, costScaling: 2.5, level: 0, maxLevel: 15, effect: 'slots', effectValue: 1 },

  // Automation
  { id: 'tap-power', name: 'Tap Power', description: 'Boost tap effectiveness', category: 'automation', baseCost: 75, costScaling: 1.4, level: 0, maxLevel: 50, effect: 'tapPower', effectValue: 0.2 },
  { id: 'auto-harvest', name: 'Auto-Harvest', description: 'Auto-collect ready plants', category: 'automation', baseCost: 500, costScaling: 2, level: 0, maxLevel: 5, effect: 'autoHarvest', effectValue: 1 },

  // Visual effect upgrades
  { id: 'solar-glow', name: 'Solar Intensifier', description: 'Plants emit soft glow', category: 'cosmetics', baseCost: 300, costScaling: 2, level: 0, maxLevel: 3, effect: 'plantGlow', effectValue: 1 },
  { id: 'bioluminescence', name: 'Bio Luminescence', description: 'Pulsing light effect', category: 'cosmetics', baseCost: 500, costScaling: 2.2, level: 0, maxLevel: 3, effect: 'pulseGlow', effectValue: 1 },
  { id: 'particle-trail', name: 'Particle Infuser', description: 'Floating particles', category: 'cosmetics', baseCost: 750, costScaling: 2.5, level: 0, maxLevel: 3, effect: 'particles', effectValue: 1 },
  { id: 'aura-field', name: 'Aura Field', description: 'Radiant energy aura', category: 'cosmetics', baseCost: 1000, costScaling: 2.5, level: 0, maxLevel: 3, effect: 'aura', effectValue: 1 },

  // Genetics
  { id: 'gene-splicer', name: 'Gene Splicer', description: 'Better breeding odds', category: 'genetics', baseCost: 1000, costScaling: 2, level: 0, maxLevel: 10, effect: 'breedingOdds', effectValue: 0.05 },
  { id: 'mutation-chamber', name: 'Mutation Chamber', description: 'Rare trait chance', category: 'genetics', baseCost: 800, costScaling: 2, level: 0, maxLevel: 10, effect: 'mutationChance', effectValue: 0.03 },

  // Drying upgrades
  { id: 'drying-speed', name: 'Turbo-Lüfter', description: '+15% Trocknungsgeschwindigkeit', category: 'drying', baseCost: 200, costScaling: 1.6, level: 0, maxLevel: 20, effect: 'dryingSpeed', effectValue: 0.15 },
  { id: 'quality-cure', name: 'Qualitäts-Curing', description: '+5% Qualität beim Trocknen', category: 'drying', baseCost: 350, costScaling: 1.7, level: 0, maxLevel: 15, effect: 'dryingQuality', effectValue: 5 },
  { id: 'humidity-control', name: 'Feuchtigkeitskontrolle', description: '+3% Qualität & +8% Speed', category: 'drying', baseCost: 500, costScaling: 1.8, level: 0, maxLevel: 10, effect: 'humidityControl', effectValue: 1 },
  { id: 'uv-treatment', name: 'UV-Behandlung', description: 'Chance auf Rarität-Upgrade', category: 'drying', baseCost: 1000, costScaling: 2.0, level: 0, maxLevel: 5, effect: 'rarityUpgrade', effectValue: 0.05 },
];
