import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Milestones at which the player can claim a bonus reward.
// Streak counts the number of days where at least one daily quest was claimed.
export interface StreakMilestone {
  days: number;
  reward: { type: 'budcoins' | 'gems' | 'xp'; amount: number };
  label: string;
  icon: string;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,  reward: { type: 'budcoins', amount: 500 },  label: '3-Tage Bonus',  icon: '🔥' },
  { days: 7,  reward: { type: 'gems',     amount: 15 },   label: '1-Woche Bonus', icon: '⚡' },
  { days: 14, reward: { type: 'gems',     amount: 35 },   label: '2-Wochen Bonus', icon: '💎' },
  { days: 30, reward: { type: 'gems',     amount: 100 },  label: '1-Monat Krone', icon: '👑' },
];

// Grace period: missing one day still keeps the streak (forgiveness),
// missing 2+ days resets to 1.
const GRACE_DAYS = 1;

interface QuestStreakState {
  currentStreak: number;
  bestStreak: number;
  lastQuestDate: string | null; // ISO date (YYYY-MM-DD)
  claimedMilestones: number[]; // milestone.days already claimed
  totalClaims: number;

  /** Call whenever a daily quest is claimed. Returns the new streak. */
  registerQuestClaim: () => number;
  /** Claim a milestone reward. Returns reward if eligible. */
  claimMilestone: (days: number) => StreakMilestone | null;
  /** True if there is at least one unclaimed milestone the user reached. */
  hasUnclaimedMilestone: () => boolean;
  /** Reset streak (debug). */
  resetStreak: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

export const useQuestStreakStore = create<QuestStreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      bestStreak: 0,
      lastQuestDate: null,
      claimedMilestones: [],
      totalClaims: 0,

      registerQuestClaim: () => {
        const state = get();
        const now = today();
        if (state.lastQuestDate === now) {
          // Already counted today.
          return state.currentStreak;
        }
        let next = 1;
        if (state.lastQuestDate) {
          const diff = daysBetween(state.lastQuestDate, now);
          if (diff <= 1) {
            next = state.currentStreak + 1; // consecutive
          } else if (diff <= 1 + GRACE_DAYS) {
            next = state.currentStreak; // grace, keep streak
          } else {
            next = 1; // reset
          }
        }
        set({
          currentStreak: next,
          bestStreak: Math.max(state.bestStreak, next),
          lastQuestDate: now,
          totalClaims: state.totalClaims + 1,
        });
        return next;
      },

      claimMilestone: (days) => {
        const state = get();
        const milestone = STREAK_MILESTONES.find(m => m.days === days);
        if (!milestone) return null;
        if (state.currentStreak < days) return null;
        if (state.claimedMilestones.includes(days)) return null;
        set({ claimedMilestones: [...state.claimedMilestones, days] });
        return milestone;
      },

      hasUnclaimedMilestone: () => {
        const { currentStreak, claimedMilestones } = get();
        return STREAK_MILESTONES.some(m => currentStreak >= m.days && !claimedMilestones.includes(m.days));
      },

      resetStreak: () => set({
        currentStreak: 0,
        lastQuestDate: null,
        claimedMilestones: [],
      }),
    }),
    { name: 'quest-streak-store' }
  )
);
