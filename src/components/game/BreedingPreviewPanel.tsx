import { motion, AnimatePresence } from 'framer-motion';
import { Seed } from '@/store/gameStore';
import { previewBreeding, getGenerationDisplay, BreedingOutcome, TraitPreviewEntry, MutationPreviewEntry } from '@/lib/breedingSystem';
import { AlertTriangle, Skull, CheckCircle2, Star, Flame, Crown, Sparkles, Dna, Zap } from 'lucide-react';

interface Props {
  parent1?: Seed;
  parent2?: Seed;
  onConfirm: () => void;
  canAfford: boolean;
  cost: number;
}

const rarityColors: Record<string, string> = {
  common: 'text-rarity-common',
  uncommon: 'text-rarity-uncommon',
  rare: 'text-rarity-rare',
  epic: 'text-rarity-epic',
  legendary: 'text-rarity-legendary',
};

const outcomeMeta: Record<BreedingOutcome, { label: string; color: string; bar: string; icon: JSX.Element }> = {
  fail:      { label: 'Fehlschlag', color: 'text-destructive',         bar: 'bg-destructive',         icon: <Skull size={12} /> },
  poor:      { label: 'Schwach',    color: 'text-muted-foreground',    bar: 'bg-muted-foreground',    icon: <AlertTriangle size={12} /> },
  normal:    { label: 'Normal',     color: 'text-primary',             bar: 'bg-primary',             icon: <CheckCircle2 size={12} /> },
  good:      { label: 'Gut',        color: 'text-neon-green',          bar: 'bg-neon-green',          icon: <Star size={12} /> },
  excellent: { label: 'Exzellent',  color: 'text-neon-orange',         bar: 'bg-neon-orange',         icon: <Flame size={12} /> },
  godtier:   { label: 'Göttlich',   color: 'text-neon-gold',           bar: 'bg-neon-gold',           icon: <Crown size={12} /> },
};

export const BreedingPreviewPanel = ({ parent1, parent2, onConfirm, canAfford, cost }: Props) => {
  const ready = !!parent1 && !!parent2;

  return (
    <AnimatePresence>
      {ready && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <PreviewContents
            parent1={parent1!}
            parent2={parent2!}
            onConfirm={onConfirm}
            canAfford={canAfford}
            cost={cost}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PreviewContents = ({
  parent1, parent2, onConfirm, canAfford, cost,
}: { parent1: Seed; parent2: Seed; onConfirm: () => void; canAfford: boolean; cost: number }) => {
  const preview = previewBreeding(parent1, parent2);
  const outcomes: BreedingOutcome[] = ['fail', 'poor', 'normal', 'good', 'excellent', 'godtier'];
  const risk = preview.failureRiskPct;
  const riskTone =
    risk >= 25 ? 'text-destructive border-destructive/40 bg-destructive/10' :
    risk >= 12 ? 'text-neon-orange border-neon-orange/40 bg-neon-orange/10' :
                 'text-neon-green border-neon-green/40 bg-neon-green/10';

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-neon-purple/30 bg-gradient-to-br from-neon-purple/10 to-neon-cyan/5 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-neon-purple" />
          <span className="text-xs font-bold uppercase tracking-wider text-neon-purple">
            Vorschau
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${riskTone}`}>
          Risiko {risk.toFixed(0)}%
        </div>
      </div>

      {/* Outcome probability bar (stacked) */}
      <div>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
          {outcomes.map(o => {
            const pct = preview.probabilities[o] * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={o}
                className={outcomeMeta[o].bar}
                style={{ width: `${pct}%` }}
                title={`${outcomeMeta[o].label}: ${pct.toFixed(1)}%`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1 text-[9px]">
          {outcomes.map(o => {
            const pct = preview.probabilities[o] * 100;
            if (pct < 0.5) return null;
            return (
              <div key={o} className={`flex items-center gap-1 ${outcomeMeta[o].color}`}>
                {outcomeMeta[o].icon}
                <span className="font-semibold">{outcomeMeta[o].label}</span>
                <span className="text-muted-foreground ml-auto">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rarity + generation + yield row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label="Rarität"
          value={
            <span>
              <span className={rarityColors[preview.rarityRange.min]}>{preview.rarityRange.min}</span>
              <span className="text-muted-foreground"> → </span>
              <span className={rarityColors[preview.rarityRange.max]}>{preview.rarityRange.max}</span>
            </span>
          }
        />
        <Stat label="Generation" value={<span className="text-neon-purple">{getGenerationDisplay(preview.newGeneration)}</span>} />
        <Stat label="Ertrag (norm.)" value={<span className="text-neon-green">{preview.expectedYieldRange.min}-{preview.expectedYieldRange.max}g</span>} />
      </div>

      {/* Trait mix — grouped by source so the player sees exactly what comes from where */}
      <TraitMixBreakdown
        parent1={parent1}
        parent2={parent2}
        traitMix={preview.traitMix}
        mutationPool={preview.mutationPool}
      />

      {/* Confirm */}
      <motion.button
        whileTap={canAfford ? { scale: 0.96 } : undefined}
        onClick={onConfirm}
        disabled={!canAfford}
        className={`w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all
          ${canAfford
            ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-background shadow-[0_0_18px_hsl(270_70%_55%/0.5)]'
            : 'bg-muted text-muted-foreground'}`}
      >
        <Sparkles size={14} />
        <span>Bestätigen & Kreuzen ({cost} $)</span>
      </motion.button>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg bg-background/40 border border-border/50 px-2 py-1.5">
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-xs font-bold mt-0.5">{value}</div>
  </div>
);
