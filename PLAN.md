# 🚀 Weed Clicker - Entwicklungsplan & Roadmap

> Umfassender Plan für zukünftige Features, Verbesserungen und Erweiterungen

**Letzte Aktualisierung:** 2026-01-02

---

## 📊 Übersicht

Dieser Plan enthält über **50 Feature-Vorschläge** organisiert nach Priorität und Implementierungs-Komplexität.

**Wichtiger Grundsatz:** Alle Vorschläge sind **additiv** - kein bestehendes Feature wird ersetzt oder entfernt!

---

## 🎯 Prioritäten-Matrix

### Legende
- ⭐⭐⭐ = Sehr hohe Priorität (Quick Wins, großer Impact)
- ⭐⭐ = Mittlere Priorität (Guter ROI)
- ⭐ = Niedrige Priorität (Nice-to-have)
- 🔥 = Hot Feature (Community-Wunsch)
- 💎 = Premium Feature (Monetization)
- 🎮 = Gameplay-Verbesserung
- 🎨 = Visuell/UX
- ⚡ = Performance
- 🌐 = Multiplayer/Social

---

## 📅 Phasen-Plan

### **PHASE 1: Quick Wins** (1-2 Wochen)
*Schnell umsetzbare Features mit hohem Impact*

#### 1.1 Coca Breeding System ⭐⭐⭐ 🔥 🎮
**Problem:** Coca hat kein Breeding, nur Weed
**Lösung:** Analog zum Weed-System implementieren

**Tasks:**
- [ ] Coca Trait-System definieren (HighPurity, FastProcess, BulkYield, DoubleRefine, etc.)
- [ ] Breeding-Logik für Coca in cocaStore.ts
- [ ] UI in KoksScreen für "Breed" Button
- [ ] Hybrid-Namensgenerator für Coca (z.B. "Boliviana Premium", "Pablo's Gold")
- [ ] Breeding-Ergebnisse (Fail → Godtier) mit Purity-Boni
- [ ] Generation-Tracking analog zu Weed

**Geschätzter Aufwand:** 6-8 Stunden
**Impact:** Verdoppelt Coca-Langzeit-Content

---

#### 1.2 Auto-Sell Rules & Smart Automation ⭐⭐⭐ 🎮
**Problem:** Spieler müssen manuell alles verkaufen/verarbeiten
**Lösung:** Konfigurierbare Automatisierungs-Regeln

**Tasks:**
- [ ] Auto-Sell Config UI (Toggle + Quality-Threshold Slider)
- [ ] "Verkaufe alles unter Quality X" Logic
- [ ] Smart Planting: "Pflanze beste Seeds automatisch"
- [ ] Worker Priority System (Was soll zuerst gemacht werden?)
- [ ] Settings-Persistence für Automation Rules

**Geschätzter Aufwand:** 4-6 Stunden
**Impact:** Massive QoL-Verbesserung für Endgame

---

#### 1.3 Statistics Dashboard ⭐⭐⭐ 🎨
**Problem:** Keine detaillierten Statistiken/Charts
**Lösung:** Recharts Integration mit Analytics

**Tasks:**
- [ ] Neue "Stats" Section in Settings
- [ ] Recharts Library integrieren
- [ ] Line Chart: Coins/h über Zeit
- [ ] Bar Chart: Harvests pro Strain
- [ ] Pie Chart: Revenue-Breakdown (Weed vs Coca)
- [ ] $/h Calculator (Aktuell vs Durchschnitt)
- [ ] ROI-Metriken für Upgrades ("Lohnt sich in X Stunden")
- [ ] Efficiency Score (Wie gut spielt der User?)

**Geschätzter Aufwand:** 8-10 Stunden
**Impact:** Spieler sehen Fortschritt besser, motiviert Optimierung

---

#### 1.4 Random Worker Events ⭐⭐ 🎮 🔥
**Problem:** Worker sind statisch, kein Risiko/Reward
**Lösung:** Random Events mit Konsequenzen

**Tasks:**
- [ ] Event-System in gameStore/cocaStore
- [ ] Event-Types definieren:
  - Polizeirazzia (Verliere 20% Inventory, Worker pausiert 60s)
  - Mega-Deal (3x Verkaufspreis für 30s)
  - Konkurrenz-Angriff (Verliere $ oder Fight-Mini-Game)
  - Quality Boost (Nächste 10 Harvests +20 Quality)
  - Worker-Krankheit (Pausiert 5min, muss "heilen")
- [ ] Event-Notifications mit Toast
- [ ] Event-Log in Activity Feed
- [ ] Probability-System (selten aber impactful)

**Geschätzter Aufwand:** 6-8 Stunden
**Impact:** Macht Idle-Game dynamischer, mehr Engagement

---

### **PHASE 2: Core Additions** (2-4 Wochen)
*Substantielle Features, die Gameplay vertiefen*

#### 2.1 Market Dynamics ⭐⭐⭐ 🎮
**Problem:** Statische Preise, kein Market-Gameplay
**Lösung:** Dynamisches Preis-System

**Tasks:**
- [ ] Supply/Demand Mechanik
  - Preis sinkt wenn viel verkauft wird
  - Preis steigt wenn lange nicht verkauft
- [ ] Black Market Events (2x-5x Preise für 10min)
- [ ] Risk/Reward Channels
  - "Dark Web" - 3x Preis aber 10% Bust-Chance
  - "Celebrity Client" - 5x Preis aber nur 1x/Tag
- [ ] Price History Chart
- [ ] Market Prediction (Hints wann Preise steigen)

**Geschätzter Aufwand:** 12-16 Stunden
**Impact:** Strategische Tiefe, mehr Entscheidungen

---

#### 2.2 Enhanced Worker System ⭐⭐⭐ 🎮
**Problem:** Worker sind simpel, nur Level-Upgrades
**Lösung:** Komplexes Worker-Progression-System

**Tasks:**
- [ ] Worker Skills (3 Skills pro Worker)
  - Speed Demon (+30% Geschwindigkeit)
  - Quality Expert (+15 Quality auf Output)
  - Bulk Master (+20% Yield)
  - Lucky Hand (2x Crit Chance)
- [ ] Worker Equipment Shop
  - Bessere Tools (Gold Trimmer, UV Scanner)
  - Schutzausrüstung (reduziert Event-Schaden)
  - Cosmetics (rein visuell)
- [ ] Worker Mood System
  - Happiness 0-100%
  - Sinkt über Zeit, steigt durch "Boni geben"
  - Niedrige Mood = -50% Effizienz
  - Hohe Mood = +25% Effizienz
- [ ] Worker Synergien
  - "Dream Team" Bonus (bestimmte Kombinationen)
  - "Rivalry" Penalty (bestimmte Worker mögen sich nicht)

**Geschätzter Aufwand:** 16-20 Stunden
**Impact:** Worker werden Charaktere statt Tools

---

#### 2.3 Prestige Tiers ⭐⭐ 🎮
**Problem:** Nur 1 Prestige-Stufe, Endgame leer
**Lösung:** Multiple Prestige-Tiers mit Unique-Boni

**Tasks:**
- [ ] Prestige Tier 1-5 System
- [ ] Tier 1: Aktuelles System
- [ ] Tier 2: Unlock bei 10 Prestige Points
  - Neue Boni: "Time Warp" (2x Speed für 1h/Tag)
- [ ] Tier 3: Unlock bei 50 PP
  - "Golden Seeds" (garantiert Legendary bei Breeding)
- [ ] Tier 4: Unlock bei 150 PP
  - "Master Grower" (alle Pflanzen instant harvest)
- [ ] Tier 5: Unlock bei 500 PP
  - "Tycoon Mode" (Passive Income ohne Workers)
- [ ] Prestige-exklusive Upgrades

**Geschätzter Aufwand:** 10-12 Stunden
**Impact:** Langzeit-Progression, mehr Replay-Value

---

#### 2.4 Dealer Mini-Game ⭐⭐ 🎮
**Problem:** Verkaufen ist passiv, kein aktives Gameplay
**Lösung:** Optional aktives Dealer-Mini-Game

**Tasks:**
- [ ] "Street Dealing" Mode Button in Sales Screen
- [ ] Timer-basiertes Matching-Game
  - Zeige Kunden mit Requests
  - Match Request mit deinem Inventory
  - Schneller = höhere Preise
- [ ] Combo-System (Streak = Bonus)
- [ ] Risk-Events (Cop erscheint, escape drücken)
- [ ] Rewards: 1.5x Coins, Bonus-XP
- [ ] Leaderboard: Beste Streak

**Geschätzter Aufwand:** 12-14 Stunden
**Impact:** Aktives Gameplay für aktive Spieler

---

### **PHASE 3: Major Features** (1-3 Monate)
*Große Content-Drops und System-Overhauls*

#### 3.1 Territory/Location System ⭐⭐⭐ 🎮
**Tasks:**
- [ ] Multiple Locations (Amsterdam, California, Colombia, Jamaica)
- [ ] Location-spezifische Boni
  - Amsterdam: +20% Quality
  - California: +30% Growth Speed
  - Colombia: Coca +50% Purity
  - Jamaica: Sativa-Strains +2 Rarity
- [ ] Location-Upgrades (Sicherheit, Klima, Ausstattung)
- [ ] Travel-System (Wechsel kostet $)
- [ ] Territory Control (erobere Gebiete für permanente Boni)

**Geschätzter Aufwand:** 20-25 Stunden
**Impact:** Strategische Tiefe, Map-Gameplay

---

#### 3.2 Coca-Weed Crossover ⭐⭐ 🎮 🔥
**Tasks:**
- [ ] Mixed Products erstellen
  - "Cocain-laced Weed" (Weed + Powder)
  - "Speedball Joints" (Premium Crossover)
- [ ] Dual-Processing Station
- [ ] Combined Workers (arbeiten an beiden Modi)
- [ ] Synergy Bonuses
  - 10% Bonus wenn beide Modi aktiv gespielt
  - "Diversification" Achievement
- [ ] Cartel Wars Event (Weed vs Coca Faction)

**Geschätzter Aufwand:** 16-20 Stunden
**Impact:** Verbindet beide Spielmodi stärker

---

#### 3.3 Social Features (Leaderboards) ⭐⭐⭐ 🌐
**Tasks:**
- [ ] Backend: Supabase/Firebase Integration
- [ ] Global Leaderboards:
  - Total $ Earned
  - Total Harvests
  - Prestige Points
  - Fastest Level 50
  - Biggest Single Sale
- [ ] Weekly Competitions
- [ ] Friends System (Add friends, compare stats)
- [ ] "Show-Off" Feature (teile deine besten Züchtungen)
- [ ] Trade System (tausche Seeds mit anderen)

**Geschätzter Aufwand:** 30-40 Stunden (Backend + Frontend)
**Impact:** Community, Retention, Competitiveness

---

#### 3.4 Neue Drug-Typen ⭐⭐ 🎮
**Option A: Mushrooms Mode**
- Psychedelic Mushrooms
- Trip-Mechanik (visuelle Effekte während Ernte)
- Spore-Breeding
- Multiple Strains (Psilocybe, Amanita, etc.)

**Option B: Meth Lab**
- Breaking Bad inspired
- Chemistry Mini-Game
- Danger-Mechanik (Explosions-Risk)
- RV-Upgrade-System

**Option C: Pharma Branch**
- Legale Medikamente
- FDA-Approval Mechanik
- Clinical Trials
- Patent-System

**Geschätzter Aufwand:** 40-50 Stunden pro Drug-Typ
**Impact:** Massiver Content-Zuwachs

---

### **PHASE 4: Long-Term Vision** (6+ Monate)
*Ambitionierte Features für langfristige Entwicklung*

#### 4.1 Story Mode ⭐⭐ 🎮
**Konzept:** Narrative Campaign vom Street Dealer zum Kingpin

**Tasks:**
- [ ] Story-Struktur (10+ Kapitel)
- [ ] Charaktere & Dialoge
- [ ] Choice-System (Entscheidungen beeinflussen Verlauf)
- [ ] Multiple Endings (Good, Bad, Legendary)
- [ ] Cutscenes (Illustrationen oder Animationen)
- [ ] Voice-Acting (optional)
- [ ] Story-exklusive Items/Workers
- [ ] Achievement: "Story Complete"

**Geschätzter Aufwand:** 80-100 Stunden
**Impact:** Single-Player Depth, Immersion

---

#### 4.2 Full Multiplayer ⭐⭐⭐ 🌐
**Konzept:** Realtime Multiplayer mit Trading & PvP

**Tasks:**
- [ ] Realtime Database (Firebase/Supabase)
- [ ] Player Profiles & Authentication
- [ ] Trade System
  - Item-Trading
  - Auction House
  - Trade History
- [ ] Cooperative Grows
  - Shared Farms
  - Resource Pooling
  - Team Achievements
- [ ] PvP Raids
  - Überfälle auf andere Spieler
  - Defense-System
  - Revenge-Mechanik
- [ ] Alliance Wars
  - Clan vs Clan
  - Territory Control
  - War Rewards

**Geschätzter Aufwand:** 200+ Stunden
**Impact:** Komplett neues Game-Paradigma

---

#### 4.3 3D Graphics Overhaul ⭐ 🎨
**Konzept:** Three.js 3D Plant Models & Environments

**Tasks:**
- [ ] Three.js Integration
- [ ] 3D Plant Models (Blender → glTF)
- [ ] Animated Growth Stages
- [ ] Camera Controls (Rotate, Zoom)
- [ ] WebGL Particle Systems
- [ ] Day/Night Cycle
- [ ] Weather Effects (Regen, Sonne)
- [ ] Performance Optimization (LOD)

**Geschätzter Aufwand:** 100+ Stunden
**Impact:** Visuelles AAA-Upgrade

---

#### 4.4 Seasonal Content Pipeline ⭐⭐ 🎮 💎
**Konzept:** Battle Pass & Events System

**Tasks:**
- [ ] Season System (3 Monate pro Season)
- [ ] Battle Pass (Free + Premium)
  - 50 Tiers mit Rewards
  - Exclusive Cosmetics
  - Limited Seeds
- [ ] Holiday Events
  - 420 Event (April)
  - Halloween (Oktober)
  - Christmas (Dezember)
- [ ] Event-Quests mit Mega-Rewards
- [ ] Limited-Time Workers
- [ ] Event-Shop mit exklusiven Items

**Geschätzter Aufwand:** 60+ Stunden (Setup + Content pro Season)
**Impact:** Wiederkehrende Motivation, FOMO, Monetization

---

## 🛠️ Technische Verbesserungen

### Performance Optimizations ⚡

#### P1: Virtualized Lists ⭐⭐
**Problem:** Bei 1000+ Items laggt UI
**Lösung:** react-window/react-virtualized

**Tasks:**
- [ ] Installiere react-window
- [ ] Virtualisiere Inventory-Listen
- [ ] Virtualisiere Worker-Liste
- [ ] Virtualisiere Collection-Grid

**Aufwand:** 4-6 Stunden

---

#### P2: Web Workers ⭐⭐ ⚡
**Problem:** Heavy Berechnungen blockieren UI
**Lösung:** Background-Thread Processing

**Tasks:**
- [ ] Web Worker Setup
- [ ] Breeding-Calculations in Worker
- [ ] Market-Price-Calculations in Worker
- [ ] Statistics-Aggregation in Worker

**Aufwand:** 8-10 Stunden

---

#### P3: IndexedDB Storage ⭐ ⚡
**Problem:** LocalStorage zu klein für große Saves
**Lösung:** IndexedDB für unbegrenzte Storage

**Tasks:**
- [ ] idb Library Integration
- [ ] Migration von LocalStorage → IndexedDB
- [ ] Compression für Saves
- [ ] Auto-Backup System

**Aufwand:** 6-8 Stunden

---

#### P4: Lazy Loading ⭐ ⚡
**Problem:** Initiales Bundle zu groß
**Lösung:** Code-Splitting & Lazy Loading

**Tasks:**
- [ ] React.lazy() für Screens
- [ ] Dynamic Imports
- [ ] Route-based Code-Splitting
- [ ] Preload-Strategie

**Aufwand:** 4-6 Stunden

---

### Analytics & Balance ⭐⭐

#### A1: Balance Calculator
**Tasks:**
- [ ] $/h Calculator (Realtime)
- [ ] Efficiency-Metriken
- [ ] ROI-Calculator für Upgrades
- [ ] "Optimal Path" Suggestions
  - "Du solltest X upgraden für beste ROI"
  - "Verkaufe durch Kanal Y für +30% Gewinn"
- [ ] Progress Heatmap (Wo verbringt User Zeit?)

**Aufwand:** 10-12 Stunden

---

### Monetization (Optional) 💎

#### M1: Gems Shop
**Tasks:**
- [ ] In-App-Purchase Integration (Stripe/PayPal)
- [ ] Gem-Packages (100, 500, 1000, 5000)
- [ ] "Remove Ads" Option
- [ ] Legal: Terms of Service, Privacy Policy

**Aufwand:** 12-16 Stunden

---

#### M2: Premium Pass
**Tasks:**
- [ ] Monthly Subscription System
- [ ] Premium Perks:
  - 2x Offline Earnings
  - Exclusive Workers
  - Ad-Free
  - Priority Support
- [ ] Subscription Management

**Aufwand:** 16-20 Stunden

---

#### M3: Cosmetic Shop
**Tasks:**
- [ ] Skin-System für Pflanzen
- [ ] Custom Themes (Dark, Neon, Retro)
- [ ] Particle Effects kaufbar
- [ ] Icon Packs
- [ ] Custom Backgrounds

**Aufwand:** 20-30 Stunden

---

## 🎨 Quality of Life Improvements

### QoL-1: UI/UX Enhancements ⭐⭐⭐

**Tasks:**
- [ ] Quick Actions Bar (häufige Aktionen)
- [ ] Batch Operations ("Verkaufe alle Common Seeds")
- [ ] Filter System (nach Rarity, Quality, Type)
- [ ] Search Function
- [ ] Tooltips mit ausführlichen Infos
- [ ] Customizable HUD (UI-Elemente verschieben)
- [ ] Keyboard Shortcuts (H = Harvest All, S = Sell All)

**Aufwand:** 12-16 Stunden

---

### QoL-2: Notification System ⭐⭐

**Tasks:**
- [ ] Push Notifications (Browser API)
- [ ] Notifications für:
  - "Ernte fertig!"
  - "Verarbeitung abgeschlossen!"
  - "Worker Event!"
  - "Black Market offen!"
- [ ] Notification Settings (granular control)
- [ ] Sound Alerts

**Aufwand:** 6-8 Stunden

---

### QoL-3: Accessibility ⭐

**Tasks:**
- [ ] Colorblind Modes (Deuteranopia, Protanopia, Tritanopia)
- [ ] Font Size Options (Small, Medium, Large)
- [ ] High Contrast Mode
- [ ] Keyboard Navigation (Tab-Index)
- [ ] Screen Reader Support (ARIA-Labels)
- [ ] Dyslexia-Friendly Font Option

**Aufwand:** 10-12 Stunden

---

### QoL-4: Data Management ⭐⭐

**Tasks:**
- [ ] Cloud Saves (Firebase/Supabase)
- [ ] Multiple Save Slots (3 Slots)
- [ ] Import/Export verbessern (QR-Code)
- [ ] Auto-Backup (täglich)
- [ ] Partial Reset Options
  - "Reset nur Weed"
  - "Reset nur Coca"
  - "Reset nur Prestige"
- [ ] Progress Milestones (Snapshots bei Level 10, 25, 50)

**Aufwand:** 12-14 Stunden

---

## 🎨 Visual Upgrades

### V1: Advanced Animations ⭐

**Tasks:**
- [ ] Lottie Integration (JSON-Animationen)
- [ ] Sprite Sheets für Worker-Animationen
- [ ] Matter.js Physics Engine (realistische Bewegungen)
- [ ] Skeleton Animations (Spine/DragonBones)
- [ ] Cinematic Transitions zwischen Screens

**Aufwand:** 16-20 Stunden

---

### V2: Themes & Customization ⭐⭐

**Tasks:**
- [ ] Dark/Light Mode Toggle
- [ ] Color Themes:
  - Cyberpunk (Neon Pink/Blue)
  - Retro (8-bit Green)
  - Minimal (Grau/Weiß)
  - Cannabis (Grün-Töne)
- [ ] Custom Backgrounds (Upload eigene Bilder)
- [ ] Icon Packs (Flat, Outlined, 3D)
- [ ] Font Options (Roboto, Comic Sans, Mono)

**Aufwand:** 10-12 Stunden

---

### V3: Enhanced Graphics ⭐

**Tasks:**
- [ ] Canvas/WebGL Particle Systems
- [ ] Animated Backgrounds (Parallax Clouds)
- [ ] Weather Effects (Regen-Animation bei Wachstum)
- [ ] Day/Night Cycle (Auto oder manuell)
- [ ] Glow-Effekte für Legendary Items
- [ ] Screen-Shake bei Events

**Aufwand:** 14-18 Stunden

---

## 📈 Success Metrics

### KPIs zu tracken:
- DAU/MAU (Daily/Monthly Active Users)
- Retention Rate (Day 1, 7, 30)
- Session Length
- Prestige Rate (% der User die prestigen)
- Monetization (wenn implementiert)
- Feature Usage (welche Features werden genutzt?)

---

## 🚦 Risiko-Management

### Potenzielle Probleme:

**1. Feature Creep**
- **Risiko:** Zu viele Features, keine fertig
- **Mitigation:** Strikte Phasen-Planung, ein Feature nach dem anderen

**2. Performance-Degradation**
- **Risiko:** Zu viele Features = Lag
- **Mitigation:** Kontinuierliche Performance-Tests, Profiling

**3. Balancing-Issues**
- **Risiko:** Neue Features brechen Wirtschaft
- **Mitigation:** Ausführliches Testing, Community-Feedback

**4. Code-Debt**
- **Risiko:** Quick-Fixes führen zu Technical Debt
- **Mitigation:** Code-Reviews, Refactoring-Sprints

**5. User-Confusion**
- **Risiko:** Zu komplex für neue Spieler
- **Mitigation:** Tutorial-Updates, Tooltips, Progressive Unlocks

---

## 📝 Notizen & Ideen-Parking

### Weitere Ideen (noch nicht priorisiert):

- [ ] Breeding-Lab (dedizierter Breeding-Space mit Upgrades)
- [ ] Worker-Relationships (Romance, Rivalry)
- [ ] Pet System (Cat/Dog hilft im Grow)
- [ ] Radio-Station (Custom Music Playlists)
- [ ] Photo Mode (Screenshot-Tool für Pflanzen)
- [ ] Genetics-Analyzer (DNA-Tree Visualisierung)
- [ ] Achievement Showcase (Zeige Trophäen)
- [ ] Daily Login Streak mit Mega-Rewards
- [ ] Referral System (Freunde einladen)
- [ ] Twitch Integration (Stream-Boni)
- [ ] Discord Bot (Server-Stats)

---

## 🎯 Next Steps

**Sofort umsetzbar:**
1. ✅ Coca Breeding System
2. ✅ Auto-Sell Rules
3. ✅ Statistics Dashboard
4. ✅ Worker Events

**Diskussion mit User:**
- Welche Features sind Top-Priorität?
- Monetization gewünscht?
- Multiplayer interessant?
- Grafik-Upgrade vs Gameplay-Features?

---

**Erstellt am:** 2026-01-02
**Version:** 1.0
**Status:** Living Document (wird kontinuierlich aktualisiert)
