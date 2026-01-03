# 🚀 Weed Clicker - Umfassender Verbesserungsplan

**Erstellt:** 2026-01-02
**Status:** Aktiv - Priorisierte Roadmap

---

## 📊 Aktueller Stand (Was gerade fertig wurde)

### ✅ Business Tab - Neue Features (2026-01-02)
- **Business-Upgrade-System:** Businesses können jetzt gelevelt werden (Lv.1-20+)
  - Jedes Level: +15% Profit
  - Upgrade-Kosten: exponentiell steigend (1.5x pro Level)
  - UI: Level-Badge, Profit-Preview, UPGRADE-Button
- **Bulk-Sale-System:** Direktverkauf von Lagerbestand
  - Verkaufsoptionen: 25%, 50%, 75%, 100%
  - Dynamische Preisberechnung basierend auf Qualität
  - Separate Buttons für Weed & Koks

---

## 🎯 PRIORITÄT 1: Kritische Fixes & Stabilität (SOFORT)

### 1.1 Button-System Standardisierung ⚠️ KRITISCH
**Problem:** Framer Motion `motion.button` und `whileTap` verursachen Klick-Events-Blocking
**Lösung:**
- [ ] **Alle Screens durchgehen und Buttons auf Standard-Pattern umstellen:**
  ```tsx
  <button
    type="button"
    onClick={handler}
    disabled={!canUse}
    tabIndex={0}
    className={`... ${enabled ? 'btn-neon' : 'bg-muted ...'}`}
  >
    <span>LABEL</span>
    <span>{cost.toLocaleString()}</span>
  </button>
  ```
- [ ] **Betroffene Screens prüfen:**
  - ✅ BusinessShopModal.tsx (bereits gefixt)
  - [ ] ShopScreen.tsx
  - [ ] GrowScreen.tsx
  - [ ] DryRoomScreen.tsx
  - [ ] SalesScreen.tsx
  - [ ] KoksScreen.tsx
  - [ ] MethScreen.tsx
  - [ ] GeneticsScreen.tsx
  - [ ] SkillsScreen.tsx
  - [ ] LuckyWheel.tsx (Drehen-Button prüfen)

### 1.2 NaN-Display-Bugs beheben ⚠️ KRITISCH
**Problem:** "+NaN $/h" im Business Tab nach Store-Updates
**Lösung:**
- [x] Migration Version erhöhen (v2 → v3)
- [ ] Fallbacks in allen Berechnungen hinzufügen:
  ```tsx
  const level = business.level ?? 1;
  const profit = business.profitPerGameHour ?? 0;
  ```
- [ ] Alle Stores auf fehlende Migrations-Fallbacks prüfen

### 1.3 Console Warnings entfernen
- [ ] Duplicate Keys in Listen beheben
- [ ] Radix UI DialogTitle/Description Warnungen (Business Modal ist OK)
- [ ] AudioContext Unlock erst nach User-Gesture
- [ ] React Key Warnings in Map-Functions

### 1.4 Save Migration Konsolidierung
- [ ] Alle Stores auf Version-Konsistenz prüfen
- [ ] Migration-Tests für alte Saves (v1, v2, v3)
- [ ] Fallback-Values für alle neuen Properties dokumentieren

---

## 🎯 PRIORITÄT 2: UX & Quality of Life (1-2 Wochen)

### 2.1 Warehouse-Management-UI Verbesserungen
**Aktuell:** Nur Gesamtansicht von Weed/Koks
**Verbesserungen:**
- [ ] **Detail-Ansicht der Warehouse Lots:**
  - Expandable Liste aller Lots mit:
    - Herkunft (Contract Name)
    - Ankunftsdatum
    - Einzelqualität
    - Gramm-Menge
  - Filter: Nach Drug-Type, Qualität, Alter
  - Sort: Qualität, Menge, Datum

- [ ] **Lot-Management:**
  - Einzelne Lots markieren zum Verkauf
  - "Beste Qualität zuerst verkaufen" Toggle
  - "Älteste zuerst verkaufen" Toggle
  - Qualitäts-Threshold für Auto-Verkauf

- [ ] **Visual Warehouse Inventory:**
  - Card-Grid statt nur Zahlen
  - Farbcodierung nach Qualität (rot/gelb/grün)
  - Hover-Tooltips mit Details

### 2.2 Stats-Dashboard
**Neu:** Zentrale Übersicht über alle Einnahmen
**Features:**
- [ ] **Live Revenue Breakdown:**
  - Business Profit: X$/h
  - Weed Sales: X$/h
  - Coca Sales: X$/h
  - Meth Sales: X$/h
  - Warehouse Sales: X$/h (NEU)
  - **Gesamt: X$/h**

- [ ] **ROI Calculator:**
  - Investment vs. Return
  - Break-even Time für Businesses/Workers
  - Effizienz-Rating

- [ ] **Historical Charts (optional):**
  - 24h Revenue Graph
  - Weekly Trends
  - Peak Hours

### 2.3 Auto-Sell System
**Problem:** Spieler müssen manuell verkaufen
**Lösung:**
- [ ] **Auto-Sell Regeln pro Drug:**
  - Toggle: Auto-Sell aktivieren
  - Quality Threshold: "Nur verkaufen wenn Q > X%"
  - Warehouse-Limit: "Verkaufen bei >80% voll"
  - Preferred Channel: Automatisch besten Kanal wählen

- [ ] **Worker-Prioritäten:**
  - Worker bevorzugen beste Qualität
  - Worker-Rotation (fair distribution)
  - Worker-Pause bei Low-Stock

### 2.4 Activity Logs Vereinheitlichung
**Problem:** Unterschiedliche Log-Styles in Weed/Coca/Meth/Business
**Lösung:**
- [ ] **Unified Log Component:**
  - Konsistente Icons pro Event-Type
  - Zeitstempel-Format standardisieren
  - Farbcodierung: Success (grün), Info (blau), Risk (rot)
  - Filter-Optionen

- [ ] **Log-Types:**
  - 💰 Sales
  - 📦 Production/Harvest
  - 🚚 Shipments
  - ⚠️ Risks/Events
  - 📊 Milestones

---

## 🎯 PRIORITÄT 3: Gameplay-Erweiterungen (2-4 Wochen)

### 3.1 Risk-Event-System (Business Tab)
**Neu:** Zufallsereignisse für mehr Dynamik
**Events:**
- [ ] **Positive Events (10% Chance/h):**
  - 🎉 "Bonuslieferung" - Shipment kommt mit +20% Grams
  - 💎 "Premium Quality" - Shipment hat +15% Quality
  - 🚀 "Express Route" - Shipment kommt 30min früher
  - 💰 "Buyer's Market" - Verkaufspreise +25% für 2h

- [ ] **Negative Events (5% Chance/h):**
  - 🚔 "Polizei-Razzia" - Business deaktiviert für 4h
  - 📦 "Beschlagnahmt" - Shipment verloren (Versicherung: 50% Refund)
  - 🔥 "Lagerschaden" - 10% eines Lots verdorben
  - 💸 "Bestechung nötig" - Sofort-Kosten 5000$

- [ ] **UI:**
  - Event-Notification-Toast mit Details
  - Event-Log im Activity Feed
  - Event-Statistik (Gesamt-Events, Profit/Loss)

### 3.2 Business-Synergien
**Konzept:** Businesses verstärken sich gegenseitig
**Implementierung:**
- [ ] **Synergy Bonuses:**
  - Bodega + Car Wash = +10% Profit beide
  - Car Wash + Night Club = -20% Police Heat
  - Night Club + Logistik = +15% Shipment Speed
  - Alle 4 = "Empire Bonus" +25% Gesamt

- [ ] **Visual Indicators:**
  - Verkettungs-Icon bei aktiven Synergien
  - Tooltip erklärt Bonus
  - Synergy-Tab im Business Modal

### 3.3 Warehouse-Upgrades
**Neu:** Qualitätsverbesserungen für gelagerte Ware
**Upgrades:**
- [ ] **Klima-Kontrolle:**
  - Kosten: 50k$
  - Effekt: +5% Qualität für alle eingehenden Lots
  - Max 3 Levels (+15% gesamt)

- [ ] **Schnell-Entladung:**
  - Kosten: 30k$
  - Effekt: Shipments werden instant entladen (kein Warten)
  - Unlock bei Lv.10

- [ ] **Qualitäts-Erhaltung:**
  - Kosten: 80k$
  - Effekt: Lots verlieren keine Qualität über Zeit
  - Normalerweise: -1% Qualität pro 24h

### 3.4 Contract-Upgrades
**Neu:** Verträge verbessern
**Features:**
- [ ] **Contract Levels:**
  - Jeder Contract kann auf Lv.2-5 upgraded werden
  - Kosten: 2x Original-Kosten pro Level
  - Effekte:
    - -10% Cooldown pro Level
    - +15% Gramm-Menge pro Level
    - +5% Qualitäts-Minimum pro Level

- [ ] **Exclusive Contracts (Endgame):**
  - "Swiss Connection" - Premium Weed (Q: 85-98%)
  - "Cartel VIP" - Mega Koks (1000-3000g, Q: 80-95%)
  - Unlock bei Business-Level 25+

---

## 🎯 PRIORITÄT 4: UI/UX Polish (parallel)

### 4.1 Animationen & Feedback
- [ ] **Erfolgs-Animationen:**
  - Münzen-Animation bei Sales
  - Level-Up-Confetti bei Business-Upgrade
  - Glow-Effekt bei Shipment-Ankunft

- [ ] **Loading States:**
  - Skeleton Screens während Daten laden
  - Progress Bars für lang laufende Aktionen

- [ ] **Micro-Interactions:**
  - Button-Hover-States verbessern
  - Card-Flip bei Statistik-Wechsel
  - Smooth Transitions zwischen Tabs

### 4.2 Mobile Optimierung
- [ ] **Touch-Targets:**
  - Mindestens 44x44px für alle Buttons
  - Spacing zwischen klickbaren Elementen

- [ ] **Responsive Layouts:**
  - Grid-Breakpoints optimieren
  - Font-Sizes für kleine Screens
  - Collapsible Sections auf Mobile

- [ ] **Performance:**
  - Lazy Loading für Screens
  - Image Optimization
  - Virtualized Lists für lange Inventare

### 4.3 Tooltips & Hilfe
- [ ] **Contextual Tooltips:**
  - Hover-Erklärungen für alle Icons
  - "?" Buttons bei komplexen Systemen
  - First-Time-User-Hints

- [ ] **Tutorial-System:**
  - Schritt-für-Schritt für neue Spieler
  - Highlight wichtiger Features
  - Skip-Option für Profis

---

## 🎯 PRIORITÄT 5: Content-Expansion (4+ Wochen)

### 5.1 Neue Business-Typen
- [ ] **Crypto Mining Farm:**
  - Kosten: 500k$
  - Profit: 8000$/h
  - Synergy: Reduziert Traceability (weniger Police Heat)

- [ ] **Art Gallery:**
  - Kosten: 350k$
  - Profit: 5500$/h
  - Synergy: +20% Warehouse-Sale-Preise (Kunst-Netzwerk)

- [ ] **Real Estate Portfolio:**
  - Kosten: 1M$
  - Profit: 15000$/h
  - Endgame-Business

### 5.2 Neue Import-Routes
- [ ] **Nordische Route (Weed):**
  - Via Skandinavien
  - Schneller aber teurer
  - Q: 70-90%

- [ ] **Südost-Asien Route (Koks):**
  - Via Thailand/Vietnam
  - Langsamste, aber billigste
  - Q: 60-85%, High Volume

### 5.3 Police Heat System
**Neu:** Je mehr du verkaufst, desto höher das Risiko
**Mechanik:**
- [ ] **Heat Meter (0-100%):**
  - Steigt mit Sales/Shipments
  - Sinkt langsam über Zeit (-5%/h)
  - Bei 80%+ = höhere Event-Chance

- [ ] **Heat-Reduktion:**
  - Business "Night Club" = -10% Heat passiv
  - Item "Bestechungs-Paket" = sofort -30% Heat
  - Pause Sales/Shipments = schnellerer Abbau

---

## 🛠️ Technische Verbesserungen (parallel)

### Performance
- [ ] Virtualized Lists für Warehouse Lots (>50 Items)
- [ ] React.memo für teure Components
- [ ] useMemo/useCallback optimieren

### Testing
- [ ] Unit Tests für Economy-Formeln
- [ ] Integration Tests für Business-Flows
- [ ] E2E Tests für kritische Pfade

### Accessibility
- [ ] Keyboard Navigation überall
- [ ] ARIA Labels für Screen Readers
- [ ] Kontrast-Ratios prüfen (WCAG AA)

### DevTools
- [ ] Debug-Panel mit:
  - State Inspector
  - Event Logger
  - Performance Metrics
  - Save/Load Test-States

---

## 📋 Empfohlene Reihenfolge (Next Steps)

### Diese Woche:
1. ✅ Button-System in allen Screens standardisieren
2. ✅ NaN-Bugs beheben (Migrations + Fallbacks)
3. ✅ Warehouse-Detail-UI bauen

### Nächste Woche:
4. Stats-Dashboard implementieren
5. Auto-Sell System erste Version
6. Risk-Events Grundgerüst

### In 2 Wochen:
7. Business-Synergien
8. Contract-Upgrades
9. UI Polish (Animationen, Tooltips)

### Langfristig:
10. Police Heat System
11. Neue Businesses/Routes
12. Mobile Optimierung

---

## 💡 Ideen-Backlog (Future)

- [ ] **Dealer-Minigame:** Verhandeln mit Kunden
- [ ] **Lab-Explosions-Risk:** Bei Meth-Produktion
- [ ] **Seasonal Events:** Halloween-Special, 4/20-Event
- [ ] **Customization:** Skins für Businesses/Workers
- [ ] **Photo Mode:** Screenshots mit Filtern
- [ ] **Achievements:** 100+ Erfolge mit Belohnungen
- [ ] **Leaderboards:** Global/Friends (benötigt Backend)
- [ ] **Cross-Platform-Saves:** Cloud-Sync
- [ ] **Modding Support:** Custom Strains/Businesses

---

## ✅ Definition of Done für v1.0

- [ ] Keine Console Errors/Warnings in Production
- [ ] Alle Buttons klickbar und responsive
- [ ] Saves funktionieren über alle Versionen
- [ ] Economy-Balance getestet und fair
- [ ] Tutorial für neue Spieler
- [ ] Mobile-friendly (80%+ Screens)
- [ ] Performance: 60fps auf Mid-Range Phones
- [ ] Accessibility: WCAG AA Kontrast

---

**Nächster Schritt:** Welche Priorität soll ich als nächstes umsetzen?
