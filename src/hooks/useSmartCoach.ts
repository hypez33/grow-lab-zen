import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';

export interface CoachHint {
  id: string;
  icon: string;
  text: string;
  priority: number; // higher = more urgent
  action?: 'grow' | 'dryroom' | 'sales' | 'shop';
}

/**
 * Smart Coach: surfaces ONE contextual, throttled hint based on game state.
 * Pure additive UI helper — no game state mutation.
 */
export const useSmartCoach = (throttleMs: number = 8000): CoachHint | null => {
  const growSlots = useGameStore(s => s.growSlots);
  const inventory = useGameStore(s => s.inventory);
  const dryingRacks = useGameStore(s => s.dryingRacks);
  const seeds = useGameStore(s => s.seeds);

  const candidate = useMemo<CoachHint | null>(() => {
    const readyToHarvest = growSlots.filter(s => s.seed && s.stage === 'harvest' && s.progress >= 100).length;
    const thirsty = growSlots.filter(s => s.seed && s.isUnlocked && s.waterLevel < 25).length;
    const wetBuds = inventory.filter(b => b.state === 'wet').length;
    const driedBuds = inventory.filter(b => b.state === 'dried').length;
    const emptyRacks = dryingRacks.filter(r => r.isUnlocked && !r.bud).length;
    const fullRacks = dryingRacks.filter(r => r.bud && r.bud.dryingProgress >= 100).length;
    const emptySlots = growSlots.filter(s => s.isUnlocked && !s.seed).length;

    // Priority order — highest urgency first
    if (readyToHarvest > 0) {
      return { id: 'harvest', icon: '🌿', text: `${readyToHarvest} Pflanze${readyToHarvest > 1 ? 'n' : ''} erntereif!`, priority: 100, action: 'grow' };
    }
    if (fullRacks > 0) {
      return { id: 'dried', icon: '✨', text: `${fullRacks} Bud${fullRacks > 1 ? 's' : ''} fertig getrocknet!`, priority: 90, action: 'dryroom' };
    }
    if (thirsty > 0) {
      return { id: 'thirsty', icon: '💧', text: `${thirsty} Pflanze${thirsty > 1 ? 'n' : ''} dringend gießen!`, priority: 80, action: 'grow' };
    }
    if (wetBuds > 0 && emptyRacks > 0) {
      return { id: 'dry-now', icon: '🌬️', text: `${wetBuds} nasse Buds → ${emptyRacks} freie Racks`, priority: 60, action: 'dryroom' };
    }
    if (wetBuds > 0 && emptyRacks === 0) {
      return { id: 'racks-full', icon: '📦', text: 'Trocknungsracks voll — kaufe mehr im Shop', priority: 55, action: 'shop' };
    }
    if (driedBuds >= 10) {
      return { id: 'sell', icon: '💰', text: `${driedBuds} fertige Buds — Zeit zu verkaufen!`, priority: 50, action: 'sales' };
    }
    if (emptySlots > 0 && seeds.length > 0) {
      return { id: 'plant', icon: '🌱', text: `${emptySlots} leere Slots — pflanze etwas an!`, priority: 30, action: 'grow' };
    }
    if (emptySlots > 0 && seeds.length === 0) {
      return { id: 'buy-seeds', icon: '🛒', text: 'Keine Samen mehr — besuche den Shop', priority: 25, action: 'shop' };
    }
    return null;
  }, [growSlots, inventory, dryingRacks, seeds]);

  const [shown, setShown] = useState<CoachHint | null>(null);
  const lastShowRef = useRef<number>(0);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!candidate) {
      setShown(null);
      lastIdRef.current = null;
      return;
    }
    const now = Date.now();
    // Always update immediately if it's a new id, otherwise throttle
    if (candidate.id !== lastIdRef.current || now - lastShowRef.current > throttleMs) {
      setShown(candidate);
      lastShowRef.current = now;
      lastIdRef.current = candidate.id;
    }
  }, [candidate, throttleMs]);

  return shown;
};
