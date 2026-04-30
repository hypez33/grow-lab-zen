import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { useOnboardingStore, OnboardingStep } from '@/store/onboardingStore';

interface StepDef {
  id: OnboardingStep;
  label: string;
  /** Auto-detected from store slice — true if completed even without manual mark */
  isDone: (s: ChecklistState) => boolean;
}

// Only the slice of state we actually need to detect step completion.
interface ChecklistState {
  growSlots: ReturnType<typeof useGameStore.getState>['growSlots'];
  totalHarvests: number;
  inventory: ReturnType<typeof useGameStore.getState>['inventory'];
  dryingRacks: ReturnType<typeof useGameStore.getState>['dryingRacks'];
  totalCoinsEarned: number;
}

const STEPS: StepDef[] = [
  { id: 'plant-seed',    label: 'Pflanze deinen ersten Samen',     isDone: (s) => s.growSlots.some(x => x.seed) },
  { id: 'water-plant',   label: 'Gieße eine Pflanze',              isDone: (s) => s.growSlots.some(x => x.seed && x.waterLevel > 80) },
  { id: 'first-harvest', label: 'Ernte deinen ersten Bud',         isDone: (s) => s.totalHarvests > 0 },
  { id: 'first-dry',     label: 'Trockne im Trockenraum',          isDone: (s) => s.inventory.some(b => b.state === 'dried') || s.dryingRacks.some(r => r.bud) },
  { id: 'first-sale',    label: 'Verkaufe an einen Straßenläufer', isDone: (s) => s.totalCoinsEarned > 200 },
];

export const FirstStepsChecklist = () => {
  const level = useGameStore(s => s.level);
  // Targeted slice instead of subscribing to the whole game store.
  const sliceState = useGameStore(
    useShallow((s): ChecklistState => ({
      growSlots: s.growSlots,
      totalHarvests: s.totalHarvests,
      inventory: s.inventory,
      dryingRacks: s.dryingRacks,
      totalCoinsEarned: s.totalCoinsEarned,
    }))
  );
  const completedSteps = useOnboardingStore(s => s.completedSteps);
  const dismissed = useOnboardingStore(s => s.checklistDismissed);
  const dismissChecklist = useOnboardingStore(s => s.dismissChecklist);

  const stepsWithStatus = useMemo(
    () => STEPS.map(step => ({
      ...step,
      done: completedSteps.includes(step.id) || step.isDone(sliceState),
    })),
    [completedSteps, sliceState]
  );

  const allDone = stepsWithStatus.every(s => s.done);

  // Hide once dismissed, all complete, or past level 3
  if (dismissed || allDone || level >= 3) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        className="bg-card/80 backdrop-blur border border-secondary/30 rounded-lg p-3 shadow-sm"
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-secondary font-bold">Erste Schritte</div>
            <div className="text-xs text-muted-foreground">Lerne den Loop kennen</div>
          </div>
          <button
            type="button"
            onClick={dismissChecklist}
            className="w-6 h-6 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground"
            aria-label="Checkliste ausblenden"
          >
            <X size={12} />
          </button>
        </div>
        <ul className="space-y-1">
          {stepsWithStatus.map(step => (
            <li key={step.id} className="flex items-center gap-2 text-xs">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'
                }`}
              >
                {step.done && <Check size={10} />}
              </span>
              <span className={step.done ? 'line-through text-muted-foreground' : 'text-foreground'}>
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
};
