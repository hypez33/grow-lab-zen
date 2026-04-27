import { create } from 'zustand';

export type Screen = 'grow' | 'shop' | 'genetics' | 'skills' | 'quests' | 'collection' | 'settings' | 'dryroom' | 'sales' | 'business' | 'koks' | 'meth' | 'customers' | 'turf';

/** Optional deep-link payload: tells a screen to scroll to and highlight a specific entity. */
export interface NavFocus {
  type: 'slot' | 'rack' | 'bud' | 'customer';
  id: string | number;
  /** auto-clears after this many ms (default 4000) */
  ttl?: number;
}

interface NavigationState {
  activeScreen: Screen;
  focus: NavFocus | null;
  /** epoch counter so identical focus values still trigger re-scroll */
  focusNonce: number;
  setActiveScreen: (screen: Screen) => void;
  /** Deep-link navigation: switch screen AND request focus on a specific element. */
  navigateTo: (screen: Screen, focus?: NavFocus | null) => void;
  clearFocus: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeScreen: 'grow',
  focus: null,
  focusNonce: 0,
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  navigateTo: (screen, focus = null) =>
    set((s) => ({ activeScreen: screen, focus, focusNonce: s.focusNonce + 1 })),
  clearFocus: () => set({ focus: null }),
}));
