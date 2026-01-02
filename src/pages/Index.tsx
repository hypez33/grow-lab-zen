import { useEffect } from 'react';
import { GameLayout } from '@/components/game/GameLayout';
import { useGameStore } from '@/store/gameStore';

const Index = () => {
  // One-time coin bonus (remove after first load)
  useEffect(() => {
    const hasReceivedBonus = localStorage.getItem('coin-bonus-v1');
    if (!hasReceivedBonus) {
      // Use getState() to avoid hook issues
      useGameStore.getState().cheatAddCoins(99999);
      localStorage.setItem('coin-bonus-v1', 'true');
    }
  }, []);

  return <GameLayout />;
};

export default Index;
