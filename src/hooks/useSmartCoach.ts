import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useCustomerStore } from '@/store/customerStore';
import { useBusinessStore } from '@/store/businessStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { NavFocus } from '@/store/navigationStore';
import {
  detectBottlenecks,
  getBottleneckCtx,
  type BottleneckHint,
  type HintSeverity,
} from '@/lib/bottlenecks';

/**
 * Backwards-compatible CoachHint shape.
 * Existing consumers (MiniDashboard, QuickActionsBar) keep working;
 * new callers can use the richer fields.
 */
export interface CoachHint {
  id: string;
  icon: string;
  text: string;
  priority: number;
  action?: BottleneckHint['action'];
  focus?: NavFocus;
  // ---- richer fields ----
  severity: HintSeverity;
  ctaLabel?: string;
  reason?: string;
  secondaryText?: string;
  shopTab?: BottleneckHint['shopTab'];
  targetId?: string;
}

/**
 * Smart Coach: surfaces ONE contextual, throttled hint based on game state.
 * Delegates detection to the shared `bottlenecks` module so the Shop
 * Recommended tab can reuse the same logic.
 *
 * Throttling rules:
 *  - same id  → respected (no flicker)
 *  - new id, same priority bucket → throttled by `throttleMs`
 *  - urgent severity → bypass throttle
 */
export const useSmartCoach = (throttleMs: number = 8000): CoachHint | null => {
  // Subscribe to representative store fields so this hook re-runs when
  // anything meaningful changes. The actual snapshot is read fresh inside
  // the effect via getBottleneckCtx().
  useGameStore(s => s.growSlots);
  useGameStore(s => s.inventory);
  useGameStore(s => s.dryingRacks);
  useGameStore(s => s.seeds);
  useGameStore(s => s.workers);
  useGameStore(s => s.autoSellSettings);
  useGameStore(s => s.heat);
  useCustomerStore(s => s.customers);
  useBusinessStore(s => s.businesses);
  useBusinessStore(s => s.warehouseLots);
  useBusinessStore(s => s.shipments);
  useTerritoryStore(s => s.territories);
  const visited = useOnboardingStore(s => s.visitedFeatures);

  const [shown, setShown] = useState<CoachHint | null>(null);
  const lastShowRef = useRef<number>(0);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ctx = getBottleneckCtx(visited as string[]);
    const hints = detectBottlenecks(ctx);
    const top = hints[0];
    if (!top) {
      setShown(null);
      lastIdRef.current = null;
      return;
    }

    const candidate: CoachHint = {
      id: top.id,
      icon: top.icon,
      text: top.text,
      priority: top.priority,
      action: top.action,
      focus: top.focus,
      severity: top.severity,
      ctaLabel: top.ctaLabel,
      reason: top.reason,
      secondaryText: top.secondaryText,
      shopTab: top.shopTab,
      targetId: top.targetId,
    };

    const now = Date.now();
    const isUrgent = candidate.severity === 'urgent';
    if (
      candidate.id !== lastIdRef.current ||
      isUrgent ||
      now - lastShowRef.current > throttleMs
    ) {
      setShown(candidate);
      lastShowRef.current = now;
      lastIdRef.current = candidate.id;
    }
    // We deliberately depend on the subscribed store slices above; this
    // effect re-runs on any of them changing.
  });

  return shown;
};
