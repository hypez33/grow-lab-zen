/** Fertilizer & soil catalogs (consumable supplies). */
import type { Fertilizer, Soil } from '@/store/gameStore';

export const FERTILIZER_CATALOG: Fertilizer[] = [
  { id: 'basic-fert', name: 'Basis-Dünger', description: 'Einfacher Dünger für leichten Wachstums-Boost', icon: '🌱', rarity: 'common', cost: 50, growthBoost: 0.1, yieldBoost: 0.05, qualityBoost: 2, duration: 3 },
  { id: 'growth-boost', name: 'Turbo-Grow', description: 'Beschleunigt das Wachstum deutlich', icon: '⚡', rarity: 'uncommon', cost: 150, growthBoost: 0.25, yieldBoost: 0.1, qualityBoost: 5, duration: 3 },
  { id: 'yield-master', name: 'Ernte-König', description: 'Maximiert den Ertrag jeder Ernte', icon: '🌾', rarity: 'rare', cost: 300, growthBoost: 0.1, yieldBoost: 0.35, qualityBoost: 8, duration: 2 },
  { id: 'crystal-feed', name: 'Kristall-Nahrung', description: 'Premium Nährstoffe für Top-Qualität', icon: '💎', rarity: 'epic', cost: 600, growthBoost: 0.2, yieldBoost: 0.25, qualityBoost: 15, duration: 2 },
  { id: 'cosmic-boost', name: 'Kosmischer Boost', description: 'Außerirdische Nährstoffe für legendäre Ernten', icon: '🌌', rarity: 'legendary', cost: 1500, growthBoost: 0.4, yieldBoost: 0.5, qualityBoost: 25, duration: 1 },
];

export const SOIL_CATALOG: Soil[] = [
  { id: 'basic-soil', name: 'Standard-Erde', description: 'Normale Blumenerde ohne Extras', icon: '🟤', rarity: 'common', cost: 0, growthBoost: 0, yieldBoost: 0, qualityBoost: 0, traitBoostChance: 0, waterRetention: 1 },
  { id: 'premium-soil', name: 'Premium-Erde', description: 'Nährstoffreiche Erde für besseres Wachstum', icon: '🌍', rarity: 'uncommon', cost: 100, growthBoost: 0.15, yieldBoost: 0.1, qualityBoost: 5, traitBoostChance: 0.05, waterRetention: 1.1 },
  { id: 'coco-mix', name: 'Kokos-Mix', description: 'Perfekte Drainage und Belüftung', icon: '🥥', rarity: 'uncommon', cost: 150, growthBoost: 0.2, yieldBoost: 0.05, qualityBoost: 3, traitBoostChance: 0.08, waterRetention: 1.25 },
  { id: 'living-soil', name: 'Living Soil', description: 'Lebendige Erde mit Mikroorganismen', icon: '🦠', rarity: 'rare', cost: 350, growthBoost: 0.15, yieldBoost: 0.25, qualityBoost: 10, traitBoostChance: 0.15, waterRetention: 1.3 },
  { id: 'super-soil', name: 'Super Soil', description: 'Vollständig aufgeladene organische Erde', icon: '⭐', rarity: 'epic', cost: 700, growthBoost: 0.25, yieldBoost: 0.35, qualityBoost: 15, traitBoostChance: 0.2, waterRetention: 1.5 },
  { id: 'alien-substrate', name: 'Alien-Substrat', description: 'Mysteriöse außerirdische Erde', icon: '👽', rarity: 'legendary', cost: 2000, growthBoost: 0.5, yieldBoost: 0.6, qualityBoost: 25, traitBoostChance: 0.35, waterRetention: 2 },
];
