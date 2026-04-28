
# Gameplay-Loop Überarbeitung — Progressive Unlocks & Übersichtlichkeit

## Problem-Analyse (Ist-Zustand)

Aktueller Loop wirft den Spieler von Sekunde 1 in **12 Nav-Tabs** (Grow, Dry, Kunden, Turf, Business, Koks, Meth, Shop, Genetics, Quests, Album, More). Alle Drogen, Märkte, Systeme sind sofort sichtbar:

- Kein Onboarding / keine erkennbare Reihenfolge
- Koks- und Meth-Tabs sind ab Lv. 1 anklickbar, obwohl der Spieler noch keinen einzigen Bud geerntet hat
- Sales-Channels haben zwar `minLevel`, aber Drogen-Tabs selbst nicht → Verwirrung
- Es gibt keinen sichtbaren "Was kommt als Nächstes?"-Hinweis (außer dem `useSmartCoach`-Hook, der nur Mikro-Hints gibt)
- Spieler weiß nicht, warum Tabs leer wirken oder was sie tun

## Ziel

**Stufenweises Freischalten** aller bestehenden Features (nichts entfernen!), damit der Loop verständlich wächst:

```text
Stage 1  Lv 1    Grow → Dry → Sales (nur Straßenläufer)
Stage 2  Lv 3    Shop, Quests
Stage 3  Lv 5    Kunden (Direktverkauf an Personen)
Stage 4  Lv 8    Genetics & Album (Breeding lohnt sich)
Stage 5  Lv 12   Business (Frontladen + Imports)
Stage 6  Lv 18   Turf (Territorien)
Stage 7  Lv 25   Koks (Hard-Drugs Tier 1)
Stage 8  Lv 35   Meth (Hard-Drugs Tier 2)
Stage 9  Lv 50   Skills-Tree Prestige Pfad
```

Alle Werte sind in einer einzigen Config-Datei verstellbar (Balancing-freundlich).

---

## Was gebaut wird

### 1. Neue Datei `src/lib/progression.ts`
Zentrale Source-of-Truth für Feature-Gates:

```text
FEATURE_UNLOCKS = {
  grow:       { level: 1,  title: 'Grow Lab',     desc: 'Pflanze deinen ersten Samen' },
  dryroom:    { level: 1,  ... },
  shop:       { level: 3,  ... },
  quests:     { level: 3,  ... },
  customers:  { level: 5,  ... },
  genetics:   { level: 8,  ... },
  collection: { level: 8,  ... },
  business:   { level: 12, ... },
  turf:       { level: 18, ... },
  koks:       { level: 25, requires: ['business'], ... },
  meth:       { level: 35, requires: ['koks'], ... },
  skills:     { level: 50, ... },
  settings:   { level: 1,  ... }, // immer offen
}
```

Helper-Funktionen: `isFeatureUnlocked(id, level)`, `getNextUnlock(level)`, `getLockedReason(id, level)`.

### 2. GameLayout — Bottom-Nav umbauen (`src/components/game/GameLayout.tsx`)
- Nav-Items werden mit `isFeatureUnlocked()` gefiltert → gesperrte Tabs zeigen ein **Schloss-Icon** mit Level-Badge (statt komplett zu verschwinden), greyed-out und nicht klickbar.
- Hover/Tap auf gesperrten Tab → Tooltip/Toast: "Schaltet auf Lv. X frei".
- Tab-Reihenfolge wird neu gruppiert (Produktion → Verkauf → Expansion → Drogen → Meta).
- Ein neuer **"Empire"-Hub-Tab** (sammelt Business/Turf/Koks/Meth, sobald mind. eines davon offen ist) optional als Verdichtung — als Drawer im More-Menü, falls >8 Tabs sichtbar (Mobile-Optik).

### 3. Neue Komponente `MilestoneHUD` (`src/components/game/MilestoneHUD.tsx`)
Schmaler Banner oben auf dem Grow-Screen (und anderen) zeigt:
- "Nächstes Feature: **Kunden** in 2 Lv."
- Progress-Bar zur nächsten Freischaltung
- Klickbar → öffnet einen **Roadmap-Modal** (siehe Punkt 4)
Nutzt `getNextUnlock()` aus progression.ts.

### 4. Neue Komponente `RoadmapModal`
Vollständige vertikale Timeline aller Stages mit Status (✅ freigeschaltet / 🔒 Lv. X / ⏳ aktuell). Erreichbar über:
- MilestoneHUD-Klick
- Neuer "Roadmap"-Button in SettingsScreen
- Nach jedem LevelUp im LevelUpPopup ("Was kommt als Nächstes?")

### 5. LevelUpPopup erweitern (`src/components/game/LevelUpPopup.tsx`)
Wenn das neue Level ein Feature freischaltet, zeigt das Popup ein extra **"NEU FREIGESCHALTET"**-Panel mit Icon, Name, Kurzbeschreibung und einem CTA-Button "Jetzt öffnen" → `navigateTo()`.

### 6. Onboarding-First-Steps (additiv)
Neue Komponente `FirstStepsChecklist` (klein, dismissable, nur sichtbar bis Lv. 3):
- ☐ Pflanze deinen ersten Samen
- ☐ Gieße eine Pflanze
- ☐ Ernte deinen ersten Bud
- ☐ Trockne im Dry Room
- ☐ Verkaufe an einen Straßenläufer
Persistiert in einem neuen `onboardingStore` (klein, localStorage) — ergänzt den bestehenden `useSmartCoach`, ersetzt ihn nicht.

### 7. Sinnvolle additive Mechaniken
**Stage-Bonus bei Freischaltung** (kleine Belohnungen, motiviert Progression):
- Lv 3 (Shop): +500 Budcoins Starthilfe
- Lv 5 (Kunden): 1 gratis Premium-Seed
- Lv 8 (Genetics): +1 Skill-Point
- Lv 12 (Business): +5.000 Budcoins Starter-Kapital
- Lv 18 (Turf): 1 gratis Territory-Scout
- Lv 25 (Koks): 1 gratis Coca-Seed
- Lv 35 (Meth): Meth-Lab Setup-Refund 50%

Implementiert in einer einzigen Funktion `grantUnlockReward(featureId)` in `progression.ts`, getriggert in `checkLevelUp()` von gameStore.

**Drogen-Gate-Hard-Locks (zusätzlich zur UI):**
In `cocaStore` / `methStore` Aktionen wie `plantCocaSeed`, `startMethCook` etc. prüfen `useGameStore.getState().level >= UNLOCK_LEVEL` und returnen `{success:false, message:'Schaltet auf Lv X frei'}` falls zu früh. Schützt vor Edge-Cases (Cheats, alter Save).

### 8. Übersichtlichkeit Bottom-Nav (Mobile 393px)
12 Tabs auf 393px sind sehr eng. Vorschlag:
- Sichtbare Tabs werden durch Stage gefiltert → typischer Spieler sieht 4–7 Tabs
- Tabs ab Lv 25+ wandern automatisch in einen **"Mehr"-Drawer** (slide-up sheet) wenn >7 Tabs aktiv sind — alle bisherigen Tabs bleiben erreichbar, nur die Anordnung ist platzsparend.
- Aktive Bottom-Bar bleibt: Grow / Dry / Sales / Kunden / [More] — Rest im Drawer.

### 9. Progress-Anzeigen pro Tab
Locked-Tabs zeigen statt Badge eine kleine **Level-Zahl** (z.B. "Lv 8"). Sobald freigeschaltet aber **nie geöffnet**, pulst ein "NEU"-Dot bis zum ersten Besuch (persistiert in onboardingStore).

---

## Technische Details

**Neue Dateien**
- `src/lib/progression.ts` — Config + Helper
- `src/store/onboardingStore.ts` — Zustand für Checklist + "visited"-Flags
- `src/components/game/MilestoneHUD.tsx`
- `src/components/game/RoadmapModal.tsx`
- `src/components/game/FirstStepsChecklist.tsx`

**Geänderte Dateien**
- `src/components/game/GameLayout.tsx` — Filterung navItems, Lock-Rendering, More-Drawer, MilestoneHUD-Mount
- `src/components/game/LevelUpPopup.tsx` — Unlock-Panel mit CTA
- `src/store/gameStore.ts` — `checkLevelUp()` ruft `grantUnlockReward()`
- `src/store/cocaStore.ts` & `src/store/methStore.ts` — Hard-Lock-Guards in Schlüssel-Aktionen
- `src/components/game/SettingsScreen.tsx` — Roadmap-Button
- `src/components/game/GrowScreen.tsx` — MilestoneHUD oben + FirstStepsChecklist mounten

**Was NICHT angefasst wird**
- Keine bestehenden Features entfernt
- Keine Balancing-Änderungen an Yields/Preisen/Drug-Formeln
- Keine Änderungen an Customer/Breeding/Trait-Systemen
- Save-Migration: alte Saves erhalten die Flags fresh (default leer) → Tabs erscheinen passend zum aktuellen Level automatisch

## Erwartetes Ergebnis

Neuer Spieler sieht initial nur **Grow / Dry / Sales / Settings**. Klares Ziel oben ("Lv 3 → Shop"). Bei jedem Levelup ein Belohnungs-Moment + CTA. Spätere Drogen wirken wie verdiente Endgame-Inhalte statt Verwirrungs-Tabs. Bottom-Nav bleibt mobil aufgeräumt (max 5 sichtbar + More-Drawer).

Sag Bescheid wenn ich loslegen soll, oder ob du Stage-Levels/Belohnungen anders gewichten willst.
