/**
 * Central progression / feature-gating config.
 * Single source of truth for "when does feature X unlock?".
 */
import type { Screen } from '@/store/navigationStore';

export type FeatureId = Screen;

export interface FeatureUnlock {
  id: FeatureId;
  level: number;
  title: string;
  desc: string;
  /** Other features that should be unlocked first (soft dependency, used for the roadmap UX). */
  requires?: FeatureId[];
  /** Optional one-time bonus when this stage unlocks. */
  reward?: {
    budcoins?: number;
    gems?: number;
    skillPoints?: number;
    premiumSeed?: boolean;
    cocaSeed?: boolean;
    label: string;
  };
}

export const FEATURE_UNLOCKS: Record<FeatureId, FeatureUnlock> = {
  grow:       { id: 'grow',       level: 1,  title: 'Grow Lab',    desc: 'Pflanze deinen ersten Samen und züchte Buds.' },
  dryroom:    { id: 'dryroom',    level: 1,  title: 'Trockenraum', desc: 'Trockne geerntete Buds für besseren Verkauf.' },
  sales:      { id: 'sales',      level: 1,  title: 'Verkauf',     desc: 'Verkaufe an Straßenläufer und mehr.' },
  settings:   { id: 'settings',   level: 1,  title: 'Einstellungen', desc: 'Sound, Musik und mehr.' },

  shop:       { id: 'shop',       level: 3,  title: 'Shop',        desc: 'Kaufe Samen, Dünger, Erde und Upgrades.',
                reward: { budcoins: 500, label: '+500 Budcoins Starthilfe' } },
  quests:     { id: 'quests',     level: 3,  title: 'Quests',      desc: 'Tägliche Aufgaben für Bonus-Belohnungen.' },

  customers:  { id: 'customers',  level: 5,  title: 'Kunden',      desc: 'Direktverkauf an Stamm-Kunden mit Loyalitäts-Boni.',
                reward: { premiumSeed: true, label: '1 Gratis Premium-Seed' } },

  genetics:   { id: 'genetics',   level: 8,  title: 'Genetik',     desc: 'Kreuze Strains und züchte einzigartige Hybriden.',
                reward: { skillPoints: 1, label: '+1 Skill Point' } },
  collection: { id: 'collection', level: 8,  title: 'Album',       desc: 'Sammle alle Strains für Sammler-Boni.' },

  business:   { id: 'business',   level: 12, title: 'Business',    desc: 'Eröffne Frontläden und nutze legale Lieferketten.',
                requires: ['customers'],
                reward: { budcoins: 5000, label: '+5.000 Budcoins Starter-Kapital' } },

  turf:       { id: 'turf',       level: 18, title: 'Turf',        desc: 'Übernimm Territorien für passives Einkommen.',
                requires: ['business'],
                reward: { gems: 5, label: '+5 Gems' } },

  koks:       { id: 'koks',       level: 25, title: 'Koks Labor',  desc: 'Verarbeite Coca-Blätter zu Premium-Pulver.',
                requires: ['business'],
                reward: { cocaSeed: true, label: '1 Gratis Coca-Seed' } },

  meth:       { id: 'meth',       level: 35, title: 'Meth Labor',  desc: 'Hochwertigste, riskanteste Produktion.',
                requires: ['koks'],
                reward: { budcoins: 25000, label: '+25.000 Budcoins Setup-Refund' } },

  skills:     { id: 'skills',     level: 50, title: 'Meister-Skills', desc: 'Endgame-Skill-Tree mit drei Pfaden.',
                requires: ['meth'],
                reward: { skillPoints: 3, label: '+3 Skill Points' } },
};

export const ALL_FEATURES: FeatureUnlock[] = Object.values(FEATURE_UNLOCKS).sort(
  (a, b) => a.level - b.level
);

export const isFeatureUnlocked = (id: FeatureId, level: number): boolean => {
  const f = FEATURE_UNLOCKS[id];
  if (!f) return true;
  return level >= f.level;
};

export const getLockedReason = (id: FeatureId, level: number): string | null => {
  const f = FEATURE_UNLOCKS[id];
  if (!f) return null;
  if (level >= f.level) return null;
  return `Schaltet auf Level ${f.level} frei`;
};

/** Next feature that's still locked for this level. */
export const getNextUnlock = (level: number): FeatureUnlock | null => {
  return ALL_FEATURES.find(f => f.level > level) ?? null;
};

/**
 * All features whose level requirement is exactly the new level.
 * Used right after a level-up to grant rewards & show announcement.
 */
export const getFeaturesUnlockedAt = (level: number): FeatureUnlock[] => {
  return ALL_FEATURES.filter(f => f.level === level);
};
