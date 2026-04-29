import type { Cosmetic } from '@/store/gameStore';

export const INITIAL_COSMETICS: Cosmetic[] = [
  { id: 'pot-default', name: 'Classic Pot', type: 'pot', rarity: 'common', cost: 0, owned: true, equipped: true },
  { id: 'pot-neon', name: 'Neon Glow Pot', type: 'pot', rarity: 'rare', cost: 100, owned: false, equipped: false },
  { id: 'pot-gold', name: 'Golden Pot', type: 'pot', rarity: 'legendary', cost: 500, owned: false, equipped: false },
  { id: 'bg-default', name: 'Lab Dark', type: 'background', rarity: 'common', cost: 0, owned: true, equipped: true },
  { id: 'bg-purple', name: 'Purple Haze', type: 'background', rarity: 'uncommon', cost: 50, owned: false, equipped: false },
];
