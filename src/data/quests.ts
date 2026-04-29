import type { Quest } from '@/store/gameStore';

export const INITIAL_QUESTS: Quest[] = [
  { id: 'daily-1', name: 'First Harvest', description: 'Harvest 3 plants', type: 'daily', target: 3, progress: 0, completed: false, claimed: false, reward: { type: 'budcoins', amount: 100 } },
  { id: 'daily-2', name: 'Tap Master', description: 'Tap 50 times', type: 'daily', target: 50, progress: 0, completed: false, claimed: false, reward: { type: 'xp', amount: 50 } },
  { id: 'daily-3', name: 'Collector', description: 'Earn 500 BudCoins', type: 'daily', target: 500, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 5 } },
  { id: 'achieve-1', name: 'Getting Started', description: 'Complete first harvest', type: 'achievement', target: 1, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 10 } },
  { id: 'achieve-2', name: 'Green Thumb', description: 'Harvest 100 plants', type: 'achievement', target: 100, progress: 0, completed: false, claimed: false, reward: { type: 'gems', amount: 50 } },
];
