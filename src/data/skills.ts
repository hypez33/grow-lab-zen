import type { SkillNode } from '@/store/gameStore';

export const INITIAL_SKILLS: SkillNode[] = [
  // Producer path
  { id: 'prod-1', path: 'producer', name: 'Coin Boost I', description: '+10% coin yield', cost: 1, unlocked: false, requires: [], effect: 'coinMult', effectValue: 0.1 },
  { id: 'prod-2', path: 'producer', name: 'Coin Boost II', description: '+20% coin yield', cost: 2, unlocked: false, requires: ['prod-1'], effect: 'coinMult', effectValue: 0.2 },
  { id: 'prod-3', path: 'producer', name: 'Golden Touch', description: 'Rare golden harvests', cost: 3, unlocked: false, requires: ['prod-2'], effect: 'goldenChance', effectValue: 0.05 },
  // Alchemist path
  { id: 'alch-1', path: 'alchemist', name: 'Essence Flow', description: '+15% essence', cost: 1, unlocked: false, requires: [], effect: 'essenceMult', effectValue: 0.15 },
  { id: 'alch-2', path: 'alchemist', name: 'Resin Mastery', description: '+20% resin', cost: 2, unlocked: false, requires: ['alch-1'], effect: 'resinMult', effectValue: 0.2 },
  { id: 'alch-3', path: 'alchemist', name: 'Transmutation', description: 'Convert resources', cost: 3, unlocked: false, requires: ['alch-2'], effect: 'transmute', effectValue: 1 },
  // Engineer path
  { id: 'eng-1', path: 'engineer', name: 'Efficiency I', description: 'Faster auto-tap', cost: 1, unlocked: false, requires: [], effect: 'autoSpeed', effectValue: 0.1 },
  { id: 'eng-2', path: 'engineer', name: 'Multi-Harvest', description: 'Auto-harvest ready plants', cost: 2, unlocked: false, requires: ['eng-1'], effect: 'autoHarvest', effectValue: 1 },
  { id: 'eng-3', path: 'engineer', name: 'Overdrive', description: '2x speed for 30s', cost: 3, unlocked: false, requires: ['eng-2'], effect: 'overdrive', effectValue: 2 },
];
