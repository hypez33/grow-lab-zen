# 🌱 Whole-Game Improvement Plan

A coordinated upgrade to **build health, UI/GUI polish, AI intelligence, game logic, and gameplay depth** — strictly additive (no features removed; existing functions only get smarter).

---

## 1. 🛠 Fix Outstanding Build Errors (FIRST)

| Error | File | Fix |
|---|---|---|
| `'./GrowSlot' has no exported member 'GrowSlot'` | `src/components/game/GrowSlot.tsx` | Add `export const GrowSlot = memo(GrowSlotComponent, …)` (currently the memoized component isn't named-exported). |
| `Cannot find namespace 'NodeJS'` | `src/hooks/useBlowDetection.ts:42` | Replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>`. Audit `gameStore.ts` for the same pattern. |

---

## 2. 🤖 Smarter AI Across All Systems

### 2a. Worker AI (`gameStore.ts → runWorkerTick`)
Refactor into a **priority task queue** evaluated each tick per worker:

1. **Harvest** any slot with `stage === 'harvest' && progress >= 100` (highest priority — money on the floor).
2. **Move dried buds** out of full racks into inventory.
3. **Water** plants with `waterLevel < 30` (critical) before `< 50` (preventive).
4. **Move wet buds → empty racks** (don't let inventory choke).
5. **Plant** in empty slots — using **Smart Seed Selection**:
   - Pick highest-rarity seed the player owns whose `minLevel ≤ playerLevel`.
   - Prefer strains matching active customer demand (cross-read `customerStore`).
6. **Tap-grow** the slot closest to the next stage transition (max ROI per tap).

Add per-worker **specialty bias** (Gardener favors plant/water, Trimmer favors harvest, Dealer untouched) so multiple workers don't fight over the same task.

### 2b. Dealer AI (`customerStore.ts` + dealer worker logic)
- **Quality matching**: premium customers automatically receive higher-quality buds from inventory; low-tier customers get B-grade — improves margin without player micromanagement.
- **Inventory pressure**: when dried inventory > 80% capacity, dealer accelerates sales (shorter cooldowns); when low, slows down to preserve stock for premium buyers.
- **Smart pause**: dealer pauses if no buds match *any* waiting customer's minimum quality, instead of failing silently.

### 2c. Customer AI
Extend `Customer` type with:
- `tastePreference?: Rarity | string[]` — strain trait affinity.
- `loyalty: number` (0–100) — grows with successful matched sales, decays on rejection.
- **Dynamic patience**: scales with `interest * (1 + loyalty/200)` so loyal customers wait longer.
- **Repeat customers**: high-loyalty customers re-spawn faster and tip extra coins.

### 2d. Smart Coach (new, non-intrusive layer)
A small `useSmartCoach` hook surfacing **one contextual hint at a time** (debounced sonner toast or a thin banner above QuickActionsBar):
- "🌿 3 plants ready to harvest"
- "💧 Plant #2 is thirsty"
- "📦 Drying racks full — sell some buds"
- "🌱 Best seed to plant now: *Purple Haze* (matches Dr. Mike's taste)"

Hints are throttled (max 1 every 20s) and dismissable. Pure additive — does not remove existing toasts.

---

## 3. 🎨 UI / GUI Polish

- **GrowSlot**: refine the new "Erntereif!" indicator — add subtle gold particle ring + soft haptic on first appearance per plant (mobile only).
- **QuickActionsBar**: add a 6th action **"Sell"** (jump to SalesScreen) when dried inventory > 0; show a small red dot when any action has urgent count.
- **MiniDashboard**: add a tiny "Coach" line showing the current smart hint.
- **Bottom nav (NavLink)**: add badge counters for screens with pending actions (harvest-ready, dry-ready, customers waiting).
- **Consistent tap feedback**: extract the FX scheduler from `GrowScreen` into `useTapFX` hook so KoksScreen, MethScreen, BusinessScreen reuse the same capped, performant ripple/floating-number system.
- **Reduced-motion respect**: gate heavy framer-motion loops behind `prefers-reduced-motion` for accessibility & low-end devices.

---

## 4. ⚙️ Game Logic Improvements

- **Offline progress**: refine cap logic to also tick worker AI (currently mostly plant growth) so returning players see meaningful automation results, still capped at 8h.
- **Watering balance**: introduce a gentle quality penalty for plants left below 20% water for too long (currently silent) — surfaced via Smart Coach.
- **Harvest safety net**: keep the recently-added `stage !== 'harvest'` guard, plus log a single sonner error if `harvestPlant` ever returns without clearing the slot (defensive).
- **Loyalty-driven pricing**: loyal customers pay +5–15% — small but rewards retention.

---

## 5. 🎮 New Gameplay Additions (small, fitting)

- **Daily "Plant of the Day"**: one strain gets +20% yield for 24h, shown in Smart Coach + GrowSuppliesModal.
- **Worker mood**: idle workers slowly lose mood; giving them tasks (or a new cheap "coffee" item in the shop) restores it. Mood multiplies their speed by 0.8×–1.2×.
- **Customer streak bonus**: 5 consecutive matched sales → temporary "Hot Streak" badge granting +10% coin gain for 60s.

---

## 📁 Files Touched (planned)

- `src/components/game/GrowSlot.tsx` *(export fix + indicator polish)*
- `src/hooks/useBlowDetection.ts` *(NodeJS type fix)*
- `src/store/gameStore.ts` *(worker AI, offline, mood, helpers)*
- `src/store/customerStore.ts` *(loyalty, taste, dynamic patience)*
- `src/components/game/QuickActionsBar.tsx` *(Sell action, urgency dots)*
- `src/components/game/MiniDashboard.tsx` *(coach line)*
- `src/components/NavLink.tsx` *(badge counters)*
- `src/hooks/useSmartCoach.ts` *(new)*
- `src/hooks/useTapFX.ts` *(new — extracted from GrowScreen)*
- `src/components/game/GrowScreen.tsx` *(use useTapFX, mount coach)*

No existing function or feature is removed — everything is extended or added alongside.