import { create } from 'zustand';

export type Screen = 'grow' | 'shop' | 'genetics' | 'skills' | 'quests' | 'collection' | 'settings' | 'dryroom' | 'sales' | 'business' | 'koks' | 'meth' | 'customers' | 'turf';

interface NavigationState {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeScreen: 'grow',
  setActiveScreen: (screen) => set({ activeScreen: screen }),
}));
