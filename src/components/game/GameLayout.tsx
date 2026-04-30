import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ShoppingBag, Dna, ListTodo, Settings as SettingsIcon, Download, Book, Wind, Snowflake, FlaskConical, Briefcase, Users, Map, Lock, MoreHorizontal, X as CloseIcon } from 'lucide-react';
import { isFeatureUnlocked, FEATURE_UNLOCKS } from '@/lib/progression';
import { useOnboardingStore } from '@/store/onboardingStore';
// Eager: core early-game loop
import { GrowScreen } from './GrowScreen';
import { DryRoomScreen } from './DryRoomScreen';

// Lazy-loaded heavy/optional screens — wrap named exports as default
const ShopScreen = lazy(() => import('./ShopScreen').then(m => ({ default: m.ShopScreen })));
const SkillsScreen = lazy(() => import('./SkillsScreen').then(m => ({ default: m.SkillsScreen })));
const GeneticsScreen = lazy(() => import('./GeneticsScreen').then(m => ({ default: m.GeneticsScreen })));
const QuestsScreen = lazy(() => import('./QuestsScreen').then(m => ({ default: m.QuestsScreen })));
const SettingsScreen = lazy(() => import('./SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const CollectionScreen = lazy(() => import('./CollectionScreen').then(m => ({ default: m.CollectionScreen })));
const BusinessScreen = lazy(() => import('./BusinessScreen').then(m => ({ default: m.BusinessScreen })));
const KoksScreen = lazy(() => import('./KoksScreen').then(m => ({ default: m.KoksScreen })));
const MethScreen = lazy(() => import('./MethScreen').then(m => ({ default: m.MethScreen })));
const CustomersScreen = lazy(() => import('./CustomersScreen').then(m => ({ default: m.CustomersScreen })));
const TerritoryScreen = lazy(() => import('./TerritoryScreen').then(m => ({ default: m.TerritoryScreen })));
import { LevelUpPopup } from './LevelUpPopup';
import { useGameStore } from '@/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigationStore, Screen } from '@/store/navigationStore';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useScreenShake } from '@/hooks/useScreenShake';
import { CanvasParticleProvider } from '@/components/effects/CanvasParticleSystem';
import { ParallaxClouds } from '@/components/effects/ParallaxClouds';
import { useBusinessStore } from '@/store/businessStore';
import { useCocaStore } from '@/store/cocaStore';
import { useMethStore } from '@/store/methStore';
import { useCustomerStore } from '@/store/customerStore';
import { useTerritoryStore } from '@/store/territoryStore';
import { toast } from 'sonner';
import { getCurrentRank, getRankStats } from '@/data/ranks';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const GameLayout = () => {
  const { activeScreen, setActiveScreen } = useNavigationStore();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const markVisited = useOnboardingStore(s => s.markVisited);
  const visitedFeatures = useOnboardingStore(s => s.visitedFeatures);

  const updateDryingProgress = useGameStore(state => state.updateDryingProgress);
  const runWorkerTick = useGameStore(state => state.runWorkerTick);
  const runAutoSellTick = useGameStore(state => state.runAutoSellTick);
  const runCustomerTick = useCustomerStore(state => state.runCustomerTick);
  const runTerritoryTick = useTerritoryStore(state => state.runTerritoryTick);
  const checkLevelUp = useGameStore(state => state.checkLevelUp);
  const tickBusiness = useBusinessStore(state => state.tickBusiness);
  const currentLevel = useGameStore(state => state.level);
  const musicEnabled = useGameStore(state => state.musicEnabled);
  const lastLevelRef = useRef(currentLevel);
  const hasInitializedMusicRef = useRef(false);

  const { changeScreen } = useBackgroundMusic();
  const { isShaking, shakeConfig, shake } = useScreenShake();

  // Change music when screen changes (but only after initial user interaction)
  useEffect(() => {
    if (musicEnabled && hasInitializedMusicRef.current) {
      changeScreen(activeScreen);
    }
  }, [activeScreen, musicEnabled, changeScreen]);

  // Global game loops - run even when not on specific tabs.
  // Optimisation strategy:
  //   - Batch all cash/earn changes into ONE setState per tick.
  //   - When the tab is hidden: tick less often, with bigger delta steps,
  //     and skip UI-only work (toasts, screen shake).
  //   - Run heavy/rare checks (rank, etc.) only every N ticks.
  useEffect(() => {
    let tickCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runTick = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
      // When hidden: 1 tick every 5s, simulating 5 real seconds of progress.
      const realSeconds = hidden ? 5 : 1;
      tickCount++;

      // --- Pure progress / per-system ticks ---
      updateDryingProgress(realSeconds);
      runWorkerTick();
      runAutoSellTick();

      const advanceGameTime = useGameStore.getState().advanceGameTime;
      const deltaMinutes = typeof advanceGameTime === 'function' ? advanceGameTime(realSeconds) : 0;
      const gameState = useGameStore.getState();
      const luckFactor = Math.min(
        0.25,
        Math.floor(gameState.level / 5) * 0.015 + Math.min(0.1, gameState.gems * 0.002)
      );

      const businessResult = tickBusiness(deltaMinutes, gameState.gameTimeMinutes, luckFactor);
      runCustomerTick(gameState.gameTimeMinutes);
      gameState.runRepHeatTick?.(deltaMinutes);

      const cocaState = useCocaStore.getState();
      const turfDealers = [
        ...gameState.workers
          .filter(w => w.owned && !w.paused && w.abilities.includes('sell'))
          .map(w => ({ id: w.id, level: w.level, type: 'street' as const })),
        ...cocaState.cocaWorkers
          .filter(w => w.owned && !w.paused && w.type === 'dealer' && w.abilities.includes('sell'))
          .map(w => ({ id: w.id, level: w.level, type: 'street' as const })),
      ];
      const turfResult = runTerritoryTick(deltaMinutes, gameState.gameTimeMinutes, turfDealers);

      cocaState.updateCocaProgress(realSeconds);
      cocaState.updateProcessingProgress(realSeconds);
      cocaState.runCocaAutoWorkerTick();
      const cocaResult = cocaState.runCocaWorkerTick();

      const methState = useMethStore.getState();
      methState.updateMethProgress(realSeconds);
      methState.runMethAutoWorkerTick();

      let methRevenue = 0;
      let methDealerSales: Array<{ dealerId: string; dealerName: string; dealerIcon: string; message: string; grams: number; revenue: number }> = [];
      const cocaDealers = cocaState.cocaWorkers.filter(
        w => w.type === 'dealer' && w.owned && !w.paused && w.abilities.includes('sell')
      );
      if (cocaDealers.length > 0) {
        const methResult = useMethStore.getState().runMethDealerTick(
          cocaDealers.map(d => ({
            id: d.id,
            name: d.name,
            icon: d.icon,
            level: d.level,
            salesPerTick: d.salesPerTick,
          }))
        );
        methRevenue = methResult.revenue;
        methDealerSales = methResult.dealerSales;
      }

      // --- Aggregate cash deltas into ONE setState ---
      let cashDelta = 0;
      let earnedDelta = 0;
      if (turfResult.passiveIncome > 0) {
        cashDelta += turfResult.passiveIncome;
        earnedDelta += turfResult.passiveIncome;
      }
      if (turfResult.upkeepCost > 0) {
        cashDelta -= turfResult.upkeepCost;
      }
      if (businessResult.profit > 0) {
        cashDelta += businessResult.profit;
        earnedDelta += businessResult.profit;
      }
      for (const event of businessResult.events) {
        if (event.profit > 0) {
          cashDelta += event.profit;
          earnedDelta += event.profit;
        }
      }
      if (cocaResult.revenue > 0) {
        cashDelta += cocaResult.revenue;
        earnedDelta += cocaResult.revenue;
      }
      if (methRevenue > 0) {
        cashDelta += methRevenue;
        earnedDelta += methRevenue;
      }

      if (cashDelta !== 0 || earnedDelta !== 0) {
        useGameStore.setState((state) => ({
          budcoins: state.budcoins + cashDelta,
          totalCoinsEarned: state.totalCoinsEarned + earnedDelta,
        }));
      }

      // --- UI-only side effects (skip when hidden) ---
      if (!hidden) {
        if (turfResult.events.length > 0) {
          for (const event of turfResult.events) {
            if (event.result === 'win') {
              toast.success(`${event.territoryName} verteidigt! +${event.controlChange}% Control`);
            } else {
              toast.error(`${event.territoryName} angegriffen! ${event.controlChange}% Control`);
            }
          }
        }
        if (businessResult.events.length > 0) {
          for (const event of businessResult.events) {
            const isNegative = event.type === 'raid' || event.type === 'seizure';
            (isNegative ? toast.error : toast.success)(event.message);
          }
        }
        if (methDealerSales.length > 0) {
          for (const sale of methDealerSales) {
            cocaState.addCocaActivityLog({
              workerId: sale.dealerId,
              workerName: sale.dealerName,
              workerIcon: sale.dealerIcon,
              action: sale.message,
              amount: sale.grams,
              revenue: sale.revenue,
            });
          }
        }
      } else if (methDealerSales.length > 0) {
        // Still log activity in background, just no toasts.
        for (const sale of methDealerSales) {
          cocaState.addCocaActivityLog({
            workerId: sale.dealerId,
            workerName: sale.dealerName,
            workerIcon: sale.dealerIcon,
            action: sale.message,
            amount: sale.grams,
            revenue: sale.revenue,
          });
        }
      }

      // --- Level ups (cheap, every tick) ---
      const levelsGained = checkLevelUp();
      if (levelsGained > 0 && !hidden) {
        const newLevel = useGameStore.getState().level;
        setLevelUpLevel(newLevel);
        setShowLevelUp(true);
      }

      // --- Heavy / rare checks: rank, every 5s ---
      if (tickCount % 5 === 0) {
        try {
          const stats = getRankStats();
          const rank = getCurrentRank(stats);
          const claimed: string[] = useGameStore.getState().claimedRanks ?? [];
          if (rank && !claimed.includes(rank.id) && rank.id !== 'homegrower') {
            useGameStore.setState((s: any) => {
              const reward = rank.reward;
              return {
                claimedRanks: [...(s.claimedRanks ?? []), rank.id],
                budcoins: s.budcoins + (reward?.budcoins ?? 0),
                totalCoinsEarned: s.totalCoinsEarned + (reward?.budcoins ?? 0),
                gems: s.gems + (reward?.gems ?? 0),
                skillPoints: s.skillPoints + (reward?.skillPoints ?? 0),
              };
            });
            if (!hidden) {
              toast.success(
                `${rank.icon} Neuer Rang: ${rank.name}!`,
                { description: rank.reward?.label ?? rank.description, duration: 6000 }
              );
              shake({ intensity: 'light', duration: 0.4 });
            }
          } else if (rank && !claimed.includes(rank.id) && rank.id === 'homegrower') {
            useGameStore.setState((s: any) => ({
              claimedRanks: [...(s.claimedRanks ?? []), rank.id],
            }));
          }
        } catch {
          /* ranks optional */
        }
      }

      // Adaptive interval: 1s when visible, 5s when hidden.
      timeoutId = setTimeout(runTick, hidden ? 5000 : 1000);
    };

    timeoutId = setTimeout(runTick, 1000);

    const onVisibilityChange = () => {
      // When tab becomes visible again, re-arm the loop quickly.
      if (document.visibilityState === 'visible' && timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(runTick, 250);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also check level changes from other sources (like cheats)
  useEffect(() => {
    if (currentLevel > lastLevelRef.current) {
      setLevelUpLevel(currentLevel);
      setShowLevelUp(true);
      // Screen shake on level up
      shake({ intensity: 'medium', duration: 0.6 });
    }
    lastLevelRef.current = currentLevel;
  }, [currentLevel, shake]);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  // Per-tab urgency badges — derive only the small primitives we need so this
  // component does not re-render on every store mutation.
  const harvestReady = useGameStore(s =>
    s.growSlots.reduce((n, slot) => (slot.stage === 'harvest' && slot.progress >= 100 ? n + 1 : n), 0)
  );
  const dryReady = useGameStore(s =>
    s.dryingRacks.reduce((n, r) => (r.bud && r.bud.dryingProgress >= 100 ? n + 1 : n), 0)
  );
  const waitingCustomers = useCustomerStore(s => s.customers?.length ?? 0);

  const allNavItems = [
    { id: 'grow' as Screen, icon: Home, label: 'Grow', badge: harvestReady },
    { id: 'dryroom' as Screen, icon: Wind, label: 'Dry', badge: dryReady },
    { id: 'customers' as Screen, icon: Users, label: 'Kunden', badge: waitingCustomers },
    { id: 'shop' as Screen, icon: ShoppingBag, label: 'Shop', badge: 0 },
    { id: 'business' as Screen, icon: Briefcase, label: 'Business', badge: 0 },
    { id: 'turf' as Screen, icon: Map, label: 'Turf', badge: 0 },
    { id: 'koks' as Screen, icon: Snowflake, label: 'Koks', badge: 0 },
    { id: 'meth' as Screen, icon: FlaskConical, label: 'Meth', badge: 0 },
    { id: 'genetics' as Screen, icon: Dna, label: 'Genetics', badge: 0 },
    { id: 'collection' as Screen, icon: Book, label: 'Album', badge: 0 },
    { id: 'quests' as Screen, icon: ListTodo, label: 'Quests', badge: 0 },
    { id: 'settings' as Screen, icon: SettingsIcon, label: 'Setup', badge: 0 },
  ];

  // Split into primary (always visible if unlocked) + secondary (in More drawer)
  const PRIMARY_IDS: Screen[] = ['grow', 'dryroom', 'customers', 'shop'];
  const currentLevelForGate = currentLevel;

  const primaryItems = allNavItems.filter(i => PRIMARY_IDS.includes(i.id));
  const secondaryItems = allNavItems.filter(i => !PRIMARY_IDS.includes(i.id));

  // Show "NEW" dot on tabs that just unlocked but were never opened
  const isNew = (id: Screen) =>
    isFeatureUnlocked(id, currentLevelForGate) && !visitedFeatures.includes(id);
  const newCountInDrawer = secondaryItems.filter(i => isNew(i.id)).length;

  const handleNav = (id: Screen) => {
    if (!isFeatureUnlocked(id, currentLevelForGate)) {
      const f = FEATURE_UNLOCKS[id];
      toast.info(`🔒 ${f?.title ?? id} schaltet auf Level ${f?.level ?? '?'} frei`);
      return;
    }
    if (!hasInitializedMusicRef.current && musicEnabled) {
      hasInitializedMusicRef.current = true;
      changeScreen(id);
    }
    setActiveScreen(id);
    markVisited(id);
    setShowMoreDrawer(false);
  };

  const renderScreen = () => {
    let node: JSX.Element;
    switch (activeScreen) {
      case 'grow': node = <GrowScreen />; break;
      case 'dryroom': node = <DryRoomScreen />; break;
      case 'customers': node = <CustomersScreen />; break;
      case 'turf': node = <TerritoryScreen />; break;
      case 'business': node = <BusinessScreen />; break;
      case 'koks': node = <KoksScreen />; break;
      case 'meth': node = <MethScreen />; break;
      case 'shop': node = <ShopScreen />; break;
      case 'genetics': node = <GeneticsScreen />; break;
      case 'skills': node = <SkillsScreen />; break;
      case 'collection': node = <CollectionScreen />; break;
      case 'quests': node = <QuestsScreen />; break;
      case 'settings': node = <SettingsScreen />; break;
      default: node = <GrowScreen />;
    }
    return <Suspense fallback={<ScreenLoader />}>{node}</Suspense>;
  };

  return (
    <div className="h-screen w-screen bg-black flex justify-center overflow-hidden">
      {/* Desktop: Centered mobile-width container | Mobile: Full width */}
      <motion.div
        className="h-screen w-full max-w-[480px] flex flex-col bg-background overflow-hidden relative"
        animate={isShaking ? { x: shakeConfig.x } : { x: 0 }}
        transition={{ duration: shakeConfig.duration }}
      >
        <CanvasParticleProvider>
          <ParallaxClouds screen={activeScreen} />

          <div className="relative z-10 flex flex-col h-full">
            {/* Install Banner */}
            <AnimatePresence>
              {showInstallBanner && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-primary/10 border-b border-primary/30 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <Download size={18} className="text-primary" />
                      <span className="text-sm font-medium">Install Grow Lab for the best experience!</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowInstallBanner(false)}
                        className="text-xs text-muted-foreground px-2 py-1"
                      >
                        Later
                      </button>
                      <button
                        onClick={handleInstall}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold"
                      >
                        Install
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeScreen}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  {renderScreen()}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            <nav className="bg-card border-t border-border safe-bottom shrink-0">
              <div className="flex items-center justify-between px-1 py-1.5">
                {primaryItems.map(item => {
                  const isActive = activeScreen === item.id;
                  const Icon = item.icon;
                  const unlocked = isFeatureUnlocked(item.id, currentLevelForGate);
                  const newDot = unlocked && isNew(item.id) && !isActive;

                  return (
                    <motion.button
                      key={item.id}
                      whileTap={{ scale: unlocked ? 0.9 : 1 }}
                      onClick={() => handleNav(item.id)}
                      className={`flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors min-w-0 flex-1
                        ${!unlocked ? 'text-muted-foreground/50' : isActive ? 'text-primary' : 'text-muted-foreground'}
                      `}
                      aria-label={item.label}
                    >
                      <motion.div
                        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 0.3 }}
                        className="relative"
                      >
                        {unlocked ? (
                          <Icon size={20} style={isActive ? { filter: 'drop-shadow(0 0 6px hsl(115 100% 62% / 0.6))' } : undefined} />
                        ) : (
                          <Lock size={16} />
                        )}
                        {unlocked && item.badge > 0 && (
                          <motion.span
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.4, repeat: Infinity }}
                            className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center ring-2 ring-card"
                          >
                            {item.badge > 9 ? '9+' : item.badge}
                          </motion.span>
                        )}
                        {newDot && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary ring-2 ring-card" />
                        )}
                        {!unlocked && (
                          <span className="absolute -bottom-1 -right-2 text-[8px] font-bold text-muted-foreground/70">
                            L{FEATURE_UNLOCKS[item.id]?.level}
                          </span>
                        )}
                      </motion.div>
                      <span className="text-[9px] font-medium truncate">{item.label}</span>
                    </motion.button>
                  );
                })}

                {/* More button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMoreDrawer(true)}
                  className="flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-muted-foreground min-w-0 flex-1"
                  aria-label="Mehr"
                >
                  <div className="relative">
                    <MoreHorizontal size={20} />
                    {newCountInDrawer > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary ring-2 ring-card" />
                    )}
                  </div>
                  <span className="text-[9px] font-medium">Mehr</span>
                </motion.button>
              </div>
            </nav>

            {/* More Drawer */}
            <AnimatePresence>
              {showMoreDrawer && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
                  onClick={() => setShowMoreDrawer(false)}
                >
                  <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    className="w-full max-w-[480px] bg-card border-t border-border rounded-t-2xl p-4 pb-6 max-h-[75vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-display font-bold">Mehr</h3>
                      <button
                        type="button"
                        onClick={() => setShowMoreDrawer(false)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                        aria-label="Schließen"
                      >
                        <CloseIcon size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {secondaryItems.map(item => {
                        const Icon = item.icon;
                        const unlocked = isFeatureUnlocked(item.id, currentLevelForGate);
                        const isActive = activeScreen === item.id;
                        const newDot = unlocked && isNew(item.id);
                        const lvl = FEATURE_UNLOCKS[item.id]?.level;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNav(item.id)}
                            className={`relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-colors ${
                              !unlocked
                                ? 'bg-muted/20 border-border text-muted-foreground/60'
                                : isActive
                                  ? 'bg-primary/15 border-primary/40 text-primary'
                                  : 'bg-muted/40 border-border text-foreground hover:bg-muted/60'
                            }`}
                          >
                            {unlocked ? <Icon size={22} /> : <Lock size={18} />}
                            <span className="text-[10px] font-semibold">{item.label}</span>
                            {!unlocked && (
                              <span className="text-[9px] text-muted-foreground/80">Lv {lvl}</span>
                            )}
                            {newDot && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Level Up Popup */}
            <LevelUpPopup
              show={showLevelUp}
              level={levelUpLevel}
              onClose={() => setShowLevelUp(false)}
            />
          </div>
        </CanvasParticleProvider>
      </motion.div>
    </div>
  );
};
