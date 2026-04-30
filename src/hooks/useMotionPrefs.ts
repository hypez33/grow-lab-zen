import { useReducedMotion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';

/**
 * Single source of truth for "should we tone down motion?".
 *
 * Combines:
 *  - The OS / browser `prefers-reduced-motion` media query.
 *  - The in-game `reducedMotion` setting (manual override).
 *  - The new `performanceMode` setting (weaker devices: cut particles &
 *    decorative loops, but keep core feedback animations).
 *
 * Components should prefer these flags over reading the store directly so
 * the rules stay consistent across screens.
 */
export interface MotionPrefs {
  /** True if any of OS / setting / performance mode requests reduced motion. */
  reduceMotion: boolean;
  /** True if the player explicitly enabled performance mode. */
  performanceMode: boolean;
  /** True if all decorative loops should be skipped (idle pulses, parallax). */
  disableDecorative: boolean;
  /** Particle / streak count multiplier (0..1). 0 = no particles. */
  particleScale: number;
}

export const useMotionPrefs = (): MotionPrefs => {
  const osReduce = useReducedMotion();
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const performanceMode = useGameStore((s) => s.performanceMode);

  const reduceMotion = !!osReduce || reducedMotion || performanceMode;
  // OS-level reduce → no decorative loops at all.
  // Performance mode → no decorative loops either.
  const disableDecorative = !!osReduce || reducedMotion || performanceMode;

  let particleScale = 1;
  if (osReduce || reducedMotion) particleScale = 0;
  else if (performanceMode) particleScale = 0.35;

  return { reduceMotion, performanceMode, disableDecorative, particleScale };
};
