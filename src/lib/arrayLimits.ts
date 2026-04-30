/**
 * Central limits for log/history arrays across the project.
 *
 * Keep these conservative — persisted growing arrays directly impact
 * localStorage size and serialization cost on every save.
 *
 * If you bump a limit, double-check the corresponding store's migrate()
 * still applies it on hydration so old saves get capped on first load.
 */

export const LOG_LIMITS = {
  /** gameStore.dealerActivities */
  dealerActivities: 50,
  /** businessStore.businessLogs */
  businessLogs: 50,
  /** businessStore.businessEvents */
  businessEvents: 50,
  /** territoryStore contest events (per call, not persisted) */
  territoryEvents: 50,
  /** customerStore: messages per single customer */
  customerMessages: 30,
  /** customerStore: completed/expired requests per single customer */
  requestHistory: 20,
  /** cocaStore.cocaActivityLogs */
  cocaActivityLogs: 50,
  /** methStore.methActivityLogs */
  methActivityLogs: 50,
  /** Global sales-window entries (already time-pruned, hard ceiling) */
  salesWindow: 100,
} as const;

export type LogLimitKey = keyof typeof LOG_LIMITS;

/**
 * Generic array cap. Returns the original reference if already within limit
 * (cheap no-op on hot paths), otherwise a sliced copy.
 *
 * @param keepFrom 'end' (default) keeps the most recent (last N).
 *                 'start' keeps the first N (useful when the newest item is
 *                 unshifted to index 0 — pass 'start' there).
 */
export function capArray<T>(arr: T[] | undefined | null, max: number, keepFrom: 'end' | 'start' = 'end'): T[] {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= max) return arr;
  return keepFrom === 'start' ? arr.slice(0, max) : arr.slice(arr.length - max);
}

/**
 * Append an entry to a log and cap. Newest at end.
 * Returns a new array (immutable-friendly for Zustand).
 */
export function appendCappedLog<T>(logs: T[] | undefined | null, entry: T, max: number): T[] {
  const base = Array.isArray(logs) ? logs : [];
  const next = [...base, entry];
  return next.length > max ? next.slice(next.length - max) : next;
}

/**
 * Prepend an entry to a log and cap. Newest at index 0.
 * Use this for stores that show newest-first (e.g. dealerActivities).
 */
export function prependCappedLog<T>(logs: T[] | undefined | null, entry: T, max: number): T[] {
  const base = Array.isArray(logs) ? logs : [];
  const next = [entry, ...base];
  return next.length > max ? next.slice(0, max) : next;
}
