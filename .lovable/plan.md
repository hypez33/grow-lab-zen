# 🎮 Intuitive HUD + Whole-Game UI/UX Overhaul

Goal: every screen tells the player **what to do next** at a glance. No features removed — only clarified, polished, and expanded.

---

## 1. 🌿 Per-Slot Action HUD (the core ask)

Rework `GrowSlot.tsx` so each slot has **one obvious primary CTA button** that changes with state:

| Slot state | Primary button (bottom of card) | Color | Secondary visible info |
|---|---|---|---|
| Locked | `🔒 Unlock — 500¢` | muted | level required |
| Empty | `+ Plant Seed` | neon-green | best seed suggestion (smart-coach pick) |
| Seedling/Veg/Flower | `⚡ Boost +X%` (with tap counter) | cyan | stage label, time-to-next-stage ETA |
| Needs water (<30%) | `💧 Water Now` (overrides boost) | red, pulsing | water % |
| Ready to harvest | `✂ HARVEST +Yg` (animated) | gold-glow | predicted yield range |
| Harvesting (anim) | `✨ Harvesting…` (disabled, spinner) | primary | — |

Implementation details:
- New `slotPrimaryAction(slot)` helper returns `{ label, icon, variant, onClick, urgency }`.
- Button sits in a **persistent bottom bar inside the card** (replacing the loose "Tap zum Ernten" hint), always tappable, large hit area (min 36px height) so it works on 393px viewports.
- Whole-tile tap still works (kept as a shortcut) — button just makes the action explicit.
- Add a tiny **state pill at the top** (`SEEDLING · 42%` / `READY` / `THIRSTY`) so status is readable without parsing icons.
- Add **ETA chip** ("~2m") computed from current tick growth rate during growing stages.

## 2. 🏠 Global HUD additions (`GameLayout.tsx` + `MiniDashboard.tsx`)

- **Action Pulse**: top resource bar gets a subtle red dot on the screen icon when that screen has urgent work (harvest ready, customer waiting, dried buds piling up).
- **One-line "Next Best Action"** banner under the dashboard (powered by existing `useSmartCoach`) — single tap routes there.
- Tighten resource bar spacing for 393px width; ensure no overflow on small screens.

## 3. 🧭 Bottom navigation (`NavLink.tsx`)
- Add **badge counters** per tab:
  - Grow: # ready to harvest
  - Dry: # racks ready
  - Sales: # dried buds in stock
  - Customers: # waiting customers
- Active tab gets a soft neon underline + scale; inactive tabs slightly dimmed for clearer hierarchy.

## 4. 🎨 Cross-screen UI consistency pass

Apply the same "primary action button per row/card" pattern to:

- **DryRoomScreen**: each rack card → one button: `Add Bud` / `Drying X%` / `Collect ✨`.
- **SalesScreen**: per-bud row → `Sell Yg → $Z` button (already close, just enlarge & color-code by tier).
- **CustomersScreen / CustomerCard**: each customer card → `Serve →` button + patience timer ring around avatar.
- **ShopScreen**: every buy button shows **affordability state** (green=affordable, red=needs $X more) instead of just disabled grey.
- **GrowSuppliesModal**: same affordability coloring + "Recommended" badge for soil/fertilizer matching the slot's seed rarity.

## 5. ⚙️ Gameplay logic improvements (additive only)

- **ETA calculation**: surface time-to-next-stage and time-to-harvest in the slot HUD using current tick rate (incl. fertilizer & worker bonuses).
- **Smart "Plant Seed" picker**: when tapping `+ Plant Seed` on an empty slot, default-select the worker-AI's best pick (highest rarity ≤ player level, matching active customer demand) so single-tap planting works.
- **Auto-collect dried buds** option toggle in Settings (default off) — when on, dried buds move to inventory automatically; surfaces as a quality-of-life upgrade unlocked at level 10.
- **Harvest confirmation safety**: long-press to instantly harvest all ready slots from the GrowScreen header (batch harvest), with the existing single-slot tap kept intact.
- **Water-all hotkey** already exists in QuickActionsBar — also add it as a header button on GrowScreen for discoverability.

## 6. ♿ Polish & performance

- Respect `prefers-reduced-motion`: gate the harvest pulsing/scale loops behind a media query (keeps the green ring static for accessibility / battery).
- All new buttons use `whileTap={{ scale: 0.94 }}` spring (matches GrowSlot) for consistent tactile feel.
- No new heavy framer-motion loops on lists — animate only the urgent/ready state.
- Memoize the new `slotPrimaryAction` and badge counts in `useMemo` so the 1s tick stays smooth.

---

## 📁 Files touched (all additive — nothing removed)

- `src/components/game/GrowSlot.tsx` — primary action button, state pill, ETA chip
- `src/components/game/GrowScreen.tsx` — header batch-harvest + water-all, wire ETA
- `src/components/game/DryRoomScreen.tsx` — rack primary-action buttons
- `src/components/game/SalesScreen.tsx` — bud row primary-action polish
- `src/components/game/CustomersScreen.tsx` + `CustomerCard.tsx` — Serve button + patience ring
- `src/components/game/ShopScreen.tsx` — affordability coloring on buy buttons
- `src/components/game/GrowSuppliesModal.tsx` — affordability + "Recommended" badge
- `src/components/game/MiniDashboard.tsx` — Next Best Action banner
- `src/components/game/GameLayout.tsx` — urgency pulses on header icons
- `src/components/NavLink.tsx` — badge counters per tab
- `src/components/game/SettingsScreen.tsx` — Auto-collect dried buds toggle
- `src/store/gameStore.ts` — small helper: `getSlotETA`, auto-collect option, batch helpers
- `src/lib/utils.ts` — small `formatETA` helper

No existing function or feature is removed. Every change is additive and improves clarity, intuitiveness, or polish.
