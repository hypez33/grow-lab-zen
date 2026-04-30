import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Debounced localStorage wrapper for Zustand `persist`.
 *
 * Why: large stores (gameStore, customerStore, etc.) call `setState`
 * many times per second from the global tick. Writing the full JSON
 * blob to localStorage on every change causes jank, especially on mobile.
 *
 * This wrapper:
 *  - returns synchronously on `getItem` (so hydration works the same).
 *  - buffers `setItem` calls per key and flushes after `delayMs`.
 *  - on the trailing edge writes only the latest value (older writes
 *    for the same key are coalesced).
 *  - flushes pending writes on `pagehide` / `visibilitychange:hidden` /
 *    `beforeunload` so we never lose progress on tab close or
 *    background → kill.
 *
 * Existing version/migrate logic is untouched — this is purely a
 * write-throughput optimisation.
 */

type Pending = { value: string; timer: ReturnType<typeof setTimeout> | null };

const pending = new Map<string, Pending>();

const flushKey = (key: string) => {
  const entry = pending.get(key);
  if (!entry) return;
  if (entry.timer) {
    clearTimeout(entry.timer);
  }
  try {
    localStorage.setItem(key, entry.value);
  } catch (err) {
    // Quota exceeded or storage disabled — best effort.
    if (import.meta.env.DEV) {
      console.warn('[persistStorage] write failed for', key, err);
    }
  }
  pending.delete(key);
};

export const flushPersistedWrites = () => {
  for (const key of Array.from(pending.keys())) {
    flushKey(key);
  }
};

// Install global flush listeners exactly once.
let listenersInstalled = false;
const installListeners = () => {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  const onHide = () => flushPersistedWrites();
  window.addEventListener('pagehide', onHide);
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPersistedWrites();
    }
  });
};

const createDebouncedStorage = (delayMs: number): StateStorage => {
  installListeners();
  return {
    getItem: (key: string): string | null => {
      // Prefer a pending (newer) write over the stale localStorage value.
      const queued = pending.get(key);
      if (queued) return queued.value;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      const existing = pending.get(key);
      if (existing?.timer) {
        clearTimeout(existing.timer);
      }
      const timer = setTimeout(() => flushKey(key), delayMs);
      pending.set(key, { value, timer });
    },
    removeItem: (key: string): void => {
      const existing = pending.get(key);
      if (existing?.timer) {
        clearTimeout(existing.timer);
      }
      pending.delete(key);
      try {
        localStorage.removeItem(key);
      } catch {
        /* noop */
      }
    },
  };
};

/**
 * Default debounced JSON storage for Zustand persist.
 * Coalesces writes within ~750 ms.
 */
export const debouncedJSONStorage = createJSONStorage(() => createDebouncedStorage(750));

/**
 * Slightly slower variant for very chatty stores (cash/score updates
 * every tick). 1000 ms still feels safe for mobile crash recovery
 * because we always flush on `pagehide` / `visibilitychange:hidden`.
 */
export const debouncedJSONStorageSlow = createJSONStorage(() => createDebouncedStorage(1000));
