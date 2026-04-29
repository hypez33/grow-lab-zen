/**
 * Pure game-loop helpers (no store access, no side effects).
 * Safe to import from anywhere.
 */
import type { PlantStage } from '@/store/gameStore';

/** Rolling sales-revenue window length (1h). */
export const SALES_WINDOW_MS = 60 * 60 * 1000;

/** Progress thresholds where each stage starts. */
export const STAGE_THRESHOLDS: Record<PlantStage, number> = {
  seed: 0,
  sprout: 25,
  veg: 50,
  flower: 75,
  harvest: 100,
};

export const getStageFromProgress = (progress: number): PlantStage => {
  if (progress >= 100) return 'harvest';
  if (progress >= 75) return 'flower';
  if (progress >= 50) return 'veg';
  if (progress >= 25) return 'sprout';
  return 'seed';
};

const XP_PER_LEVEL = 100;
const XP_SCALING = 1.5;

export const getXpForLevel = (level: number): number =>
  Math.floor(XP_PER_LEVEL * Math.pow(XP_SCALING, level - 1));
