import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FeatureId } from '@/lib/progression';

export type OnboardingStep =
  | 'plant-seed'
  | 'water-plant'
  | 'first-harvest'
  | 'first-dry'
  | 'first-sale';

interface OnboardingState {
  completedSteps: OnboardingStep[];
  /** Features the player has actually opened at least once after unlock. */
  visitedFeatures: FeatureId[];
  /** Whether the first-steps checklist is dismissed. */
  checklistDismissed: boolean;
  markStep: (step: OnboardingStep) => void;
  markVisited: (feature: FeatureId) => void;
  dismissChecklist: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completedSteps: [],
      visitedFeatures: ['grow', 'dryroom', 'sales', 'settings'],
      checklistDismissed: false,
      markStep: (step) =>
        set((s) =>
          s.completedSteps.includes(step)
            ? s
            : { completedSteps: [...s.completedSteps, step] }
        ),
      markVisited: (feature) =>
        set((s) =>
          s.visitedFeatures.includes(feature)
            ? s
            : { visitedFeatures: [...s.visitedFeatures, feature] }
        ),
      dismissChecklist: () => set({ checklistDismissed: true }),
      reset: () =>
        set({
          completedSteps: [],
          visitedFeatures: ['grow', 'dryroom', 'sales', 'settings'],
          checklistDismissed: false,
        }),
    }),
    { name: 'grow-lab-onboarding' }
  )
);
