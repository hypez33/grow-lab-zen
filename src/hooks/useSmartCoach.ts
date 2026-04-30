import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
 *
 * Performance design:
 *  - Subscribe ONLY to small derived primitive counters (numbers/booleans),
 *    NOT to the full arrays (`growSlots`, `inventory`, `customers`, …).
 *    Counters change far less often than the underlying arrays, so the
 *    hook re-renders at most when the player's situation actually shifted.
 *  - Detection runs in a `useMemo` keyed off those counters, so the
 *    expensive bottleneck pass executes only on real changes — never
 *    once per render and never once per tick when nothing relevant moved.
 *  - A short throttle (default 8s) keeps the surfaced hint stable so the
 *    UI can't flicker between two equal-priority candidates each second.
 *  - Urgent severity (`'urgent'`) bypasses the throttle so harvest /
 *    drying / heat-critical alerts surface immediately.
 *
 * Detection logic itself lives in `src/lib/bottlenecks.ts` and is shared
 * with the Shop "Recommended" tab — no duplicate logic.
 */
export const useSmartCoach = (throttleMs: number = 8000): CoachHint | null => {
  // --- Tiny primitive subscriptions: change far less often than the
  //     underlying arrays they're derived from.
  const grow = useGameStore(
    useShallow((s) => {
      let empty = 0;
      let thirsty = 0;
      let readyHarvest = 0;
      for (const slot of s.growSlots) {
        if (!slot.isUnlocked) continue;
        if (!slot.seed) {
          empty++;
        } else {
          if (slot.waterLevel < 25) thirsty++;
          if (slot.stage === 'harvest' && slot.progress >= 100) readyHarvest++;
        }
      }
      return { empty, thirsty, readyHarvest };
    })
  );

  const drying = useGameStore(
    useShallow((s) => {
      let wet = 0;
      let dried = 0;
      for (const b of s.inventory) {
        if (b.state === 'wet') wet++;
        else if (b.state === 'dried') dried++;
      }
      let freeRacks = 0;
      let fullRacks = 0;
      let totalRacks = 0;
      for (const r of s.dryingRacks) {
        if (!r.isUnlocked) continue;
        totalRacks++;
        if (!r.bud) freeRacks++;
        else if (r.bud.dryingProgress >= 100) fullRacks++;
      }
      return { wet, dried, freeRacks, fullRacks, totalRacks };
    })
  );

  const meta = useGameStore(
    useShallow((s) => ({
      level: s.level,
      seedsCount: s.seeds.length,
      workersOwned: s.workers.reduce((n, w) => (w.owned ? n + 1 : n), 0),
      autoSellEnabled: s.autoSellSettings?.enabled ?? false,
      // Heat bucket — quantize to 4 levels so the hook doesn't re-run on every tiny heat tick.
      heatBucket: Math.min(3, Math.floor(((s.heat ?? 0) / Math.max(1, s.maxHeat ?? 100)) * 4)),
    }))
  );

  // Customers — only count requests + fingerprint expiring/fulfillable presence.
  const customer = useCustomerStore(
    useShallow((s) => {
      let pending = 0;
      let hasExpiring = false;
      const now = Date.now();
      for (const c of s.customers ?? []) {
        const req = c.pendingRequest;
        if (!req) continue;
        pending++;
        const msLeft = req.expiresAt - now;
        if (msLeft > 0 && msLeft < 90_000) hasExpiring = true;
      }
      return { pending, hasExpiring };
    })
  );

  const biz = useBusinessStore(
    useShallow((s) => {
      const owned = (s.businesses ?? []).filter((b) => b.owned);
      const hasWarehouse = owned.some((b) => typeof b.id === 'string' && b.id.startsWith('warehouse-'));
      const cap = s.warehouseCapacity ?? 0;
      const used = (s.warehouseLots ?? []).reduce((sum, lot) => sum + (lot.grams ?? 0), 0);
      const warehouseFreePct = cap > 0 ? Math.max(0, Math.min(100, ((cap - used) / cap) * 100)) : 100;
      const waitingShipments = (s.shipments ?? []).filter((sh) => sh.status === 'waiting').length;
      return {
        ownedCount: owned.length,
        hasWarehouse,
        warehouseFreeBucket: Math.floor(warehouseFreePct / 10), // 0..10
        waitingShipments,
      };
    })
  );

  const turf = useTerritoryStore(
    useShallow((s) => {
      let owned = 0;
      let dealers = 0;
      for (const t of s.territories ?? []) {
        if ((t.control ?? 0) >= 25) owned++;
        dealers += (t.assignedDealerIds ?? []).length;
      }
      return { owned, dealers };
    })
  );

  const visited = useOnboardingStore((s) => s.visitedFeatures);

  // Build a stable cache key. When this string doesn't change, we don't
  // recompute hints, even if other unrelated store fields ticked.
  const cacheKey = useMemo(
    () =>
      [
        grow.empty, grow.thirsty, grow.readyHarvest,
        drying.wet, drying.dried, drying.freeRacks, drying.fullRacks, drying.totalRacks,
        meta.level, meta.seedsCount, meta.workersOwned, meta.autoSellEnabled ? 1 : 0, meta.heatBucket,
        customer.pending, customer.hasExpiring ? 1 : 0,
        biz.ownedCount, biz.hasWarehouse ? 1 : 0, biz.warehouseFreeBucket, biz.waitingShipments,
        turf.owned, turf.dealers,
        // visited is referenced only for the "visit-sales" hint; length is enough.
        visited.length,
      ].join('|'),
    [grow, drying, meta, customer, biz, turf, visited]
  );

  const topHint = useMemo<CoachHint | null>(() => {
    // We still pull a full snapshot inside getBottleneckCtx so the detector
    // has access to all the fine-grained fields it needs (slot ids for
    // deep-links, request ids, secondary text, etc.). The cacheKey ensures
    // this only runs when something semantically changed.
    const ctx = getBottleneckCtx(visited as string[]);
    const hints = detectBottlenecks(ctx);
    const top = hints[0];
    if (!top) return null;
    return {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Throttle: avoid flicker between near-equal hints; urgent overrides.
  const [shown, setShown] = useState<CoachHint | null>(topHint);
  const lastShowRef = useRef<number>(0);
  const lastIdRef = useRef<string | null>(topHint?.id ?? null);

  useEffect(() => {
    if (!topHint) {
      setShown(null);
      lastIdRef.current = null;
      return;
    }
    const now = Date.now();
    const isUrgent = topHint.severity === 'urgent';
    const sameId = topHint.id === lastIdRef.current;
    if (sameId) {
      // Refresh content (text/secondary may change) without resetting timer.
      setShown(topHint);
      return;
    }
    if (isUrgent || now - lastShowRef.current > throttleMs) {
      setShown(topHint);
      lastShowRef.current = now;
      lastIdRef.current = topHint.id;
    }
  }, [topHint, throttleMs]);

  return shown;
};
