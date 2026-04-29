/**
 * Sales channels — balanced progression:
 *   runner    → tutorial channel: kleine Mengen, schneller Cash, kein Qualitätsgate
 *   dealer    → erstes echtes Upgrade: bessere Preise & Mengen, leichtes Qualitätsgate
 *   pharmacy  → Qualitäts-Gate: lohnt sich erst mit Curing/Drying-Upgrades
 *   dispensary→ Premium-Gate: Top-Qualität nötig
 *   wholesale → Late-game Bulk: massive Mengen, niedrigerer €/g
 */
import type { SalesChannel } from '@/store/gameStore';

export const INITIAL_SALES_CHANNELS: SalesChannel[] = [
  { id: 'runner', name: 'Straßenläufer', description: 'Tutorial-Kanal. Kleine Mengen, schnelles Geld, keine Qualitätsanforderung.', icon: '🏃', pricePerGram: 6, minQuality: 0, minLevel: 1, maxGramsPerSale: 10, cooldownMinutes: 1, lastSaleTime: 0, unlocked: true },
  { id: 'dealer', name: 'Dealer-Netzwerk', description: 'Erstes echtes Upgrade. Bessere Preise & größere Mengen, ab Qualität 30.', icon: '🤝', pricePerGram: 10, minQuality: 30, minLevel: 4, maxGramsPerSale: 50, cooldownMinutes: 5, lastSaleTime: 0, unlocked: false },
  { id: 'pharmacy', name: 'Apotheke', description: 'Premium-Preise. Erfordert Curing/Drying-Upgrades für Qualität ≥60.', icon: '💊', pricePerGram: 17, minQuality: 60, minLevel: 9, maxGramsPerSale: 100, cooldownMinutes: 15, lastSaleTime: 0, unlocked: false },
  { id: 'dispensary', name: 'Dispensary', description: 'Legaler Verkauf, Top-Qualität ≥80. Beste Marge pro Gramm.', icon: '🏪', pricePerGram: 22, minQuality: 80, minLevel: 18, maxGramsPerSale: 200, cooldownMinutes: 30, lastSaleTime: 0, unlocked: false },
  { id: 'wholesale', name: 'Großabnehmer', description: 'Bulk-Deals. Massive Mengen bei kleinerer Marge.', icon: '🏭', pricePerGram: 13, minQuality: 50, minLevel: 24, maxGramsPerSale: 1000, cooldownMinutes: 60, lastSaleTime: 0, unlocked: false },
];
