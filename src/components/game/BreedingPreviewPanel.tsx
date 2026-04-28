import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

// ===== Trait mix breakdown ====================================================
// Groups every trait by source (Parent 1 / Parent 2 / Shared) and shows the
// per-outcome inheritance chance. A separate "Mutation" row reveals new traits
// that can spawn on a godtier roll.

const TraitMixBreakdown = ({
  parent1, parent2, traitMix, mutationPool,
}: {
  parent1: Seed;
  parent2: Seed;
  traitMix: TraitPreviewEntry[];
  mutationPool: MutationPreviewEntry[];
}) => {
  const reduceMotion = useReducedMotion();

  // Stable, deterministic partition + sort — keyed on parent identity so chip
  // identity (and therefore animation keys) stays consistent between renders.
  const { sharedTraits, p1Only, p2Only, possibleMutations } = useMemo(() => {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    return {
      sharedTraits: traitMix.filter(t => t.source === 'both').sort(byName),
      p1Only:       traitMix.filter(t => t.source === 'p1').sort(byName),
      p2Only:       traitMix.filter(t => t.source === 'p2').sort(byName),
      possibleMutations: mutationPool
        .filter(m => !m.alreadyPresent && m.chancePct > 0)
        .sort((a, b) => b.chancePct - a.chancePct || a.name.localeCompare(b.name)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent1.id, parent2.id, traitMix, mutationPool]);

  if (traitMix.length === 0 && possibleMutations.length === 0) {
    return (
      <div className="rounded-lg bg-background/40 border border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
        Beide Eltern haben keine Traits — Nachkomme startet ohne Boni (außer mögliche Mutationen).
      </div>
    );
  }

  // Stagger config — disabled when reduced motion is requested.
  const stagger = reduceMotion ? 0 : 0.06;
  const groupDuration = reduceMotion ? 0 : 0.22;
  const containerVariants = {
    hidden: { opacity: 1 },
    show:   { opacity: 1, transition: { staggerChildren: stagger, delayChildren: reduceMotion ? 0 : 0.04 } },
  };
  const groupVariants = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 6 },
    show:   { opacity: 1, y: 0, transition: { duration: groupDuration, ease: 'easeOut' as const } },
  };

  // Total stagger duration for shimmer sweep — sync the neon highlight to the
  // same timeline as the staggered group fade-ins.
  const groupCount = 1 /* header */
    + (sharedTraits.length > 0 ? 1 : 0)
    + (p1Only.length > 0 ? 1 : 0)
    + (p2Only.length > 0 ? 1 : 0)
    + (possibleMutations.length > 0 ? 1 : 0)
    + 1 /* legend footer */;
  const shimmerDuration = Math.max(0.6, stagger * groupCount + groupDuration);

  return (
    <motion.div
      key={`${parent1.id}-${parent2.id}`}
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="rounded-lg bg-background/40 border border-border/50 p-3 space-y-2.5"
    >
      <motion.div variants={groupVariants} className="relative overflow-hidden flex items-center gap-1.5 -mx-1 px-1 py-1 rounded-md">
        <Dna size={12} className="text-neon-purple shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Trait-Vererbung
        </span>
        <span className="ml-auto text-[9px] text-muted-foreground">
          {traitMix.length} Eltern · {possibleMutations.length} Mutationen
        </span>

        {/* Neon shimmer sweep — synced to the staggered group timeline. */}
        {!reduceMotion && (
          <motion.div
            key={`shimmer-${parent1.id}-${parent2.id}`}
            aria-hidden
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: '120%', opacity: [0, 0.85, 0] }}
            transition={{ duration: shimmerDuration, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, hsl(var(--neon-purple) / 0.0) 25%, hsl(var(--neon-purple) / 0.45) 50%, hsl(var(--neon-cyan) / 0.0) 75%, transparent 100%)',
              filter: 'blur(4px)',
              mixBlendMode: 'screen',
            }}
          />
        )}
      </motion.div>

      {sharedTraits.length > 0 && (
        <motion.div variants={groupVariants}>
          <TraitGroup
            title="Beide Eltern (verstärkt)"
            subtitle="Höhere Übertragungs-Chance"
            tone="gold"
            traits={sharedTraits}
            reduceMotion={!!reduceMotion}
          />
        </motion.div>
      )}
      {p1Only.length > 0 && (
        <motion.div variants={groupVariants}>
          <TraitGroup
            title={`Nur ${parent1.name}`}
            subtitle="Wird zufällig vererbt"
            tone="cyan"
            traits={p1Only}
            reduceMotion={!!reduceMotion}
          />
        </motion.div>
      )}
      {p2Only.length > 0 && (
        <motion.div variants={groupVariants}>
          <TraitGroup
            title={`Nur ${parent2.name}`}
            subtitle="Wird zufällig vererbt"
            tone="green"
            traits={p2Only}
            reduceMotion={!!reduceMotion}
          />
        </motion.div>
      )}

      {possibleMutations.length > 0 && (
        <motion.div variants={groupVariants}>
          <div className="flex items-center gap-1.5 mt-1 mb-1.5">
            <Zap size={11} className="text-neon-orange" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-neon-orange">
              Mögliche Mutationen
            </span>
            <span className="ml-auto text-[9px] text-muted-foreground">nur bei göttlicher Kreuzung</span>
          </div>
          <motion.div
            className="flex flex-wrap gap-1.5"
            variants={{ show: { transition: { staggerChildren: reduceMotion ? 0 : 0.03 } } }}
          >
            {possibleMutations.map(m => (
              <motion.div
                key={`mut-${m.name}`}
                layout="position"
                variants={{
                  hidden: { opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.9 },
                  show:   { opacity: 1, scale: 1, transition: { duration: reduceMotion ? 0 : 0.18 } },
                }}
                className="flex items-center gap-1 pl-1 pr-1.5 py-1 rounded-full text-[10px] font-medium border border-neon-orange/40 bg-neon-orange/10 text-neon-orange leading-none"
                title={`${m.chancePct.toFixed(2)}% Chance auf diese neue Eigenschaft`}
              >
                <span className="text-[8px] font-bold leading-none px-1 py-0.5 rounded bg-neon-orange/25 text-neon-orange border border-neon-orange/40">MUT</span>
                <Sparkles size={9} />
                <span className="whitespace-nowrap">{m.name}</span>
                <span className="text-muted-foreground tabular-nums">{m.chancePct < 0.1 ? '<0.1' : m.chancePct.toFixed(1)}%</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      <motion.div
        variants={groupVariants}
        className="pt-2 mt-1 border-t border-border/40 text-[9px] text-muted-foreground leading-snug space-y-1"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-foreground/80">Herkunft:</span>
          <span className="px-1 py-0.5 rounded bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 font-bold text-[8px] leading-none">P1</span>
          <span className="px-1 py-0.5 rounded bg-neon-green/25 text-neon-green border border-neon-green/40 font-bold text-[8px] leading-none">P2</span>
          <span className="px-1 py-0.5 rounded bg-neon-gold/25 text-neon-gold border border-neon-gold/40 font-bold text-[8px] leading-none">BOTH</span>
          <span className="px-1 py-0.5 rounded bg-neon-orange/25 text-neon-orange border border-neon-orange/40 font-bold text-[8px] leading-none">MUT</span>
        </div>
        <div>
          <span className="font-semibold text-foreground/80">Übertragung:</span>{' '}
          Fehl ≈ 1/N · Schwach ≤ 50% · <span className="text-primary">Normal 60%</span> ·{' '}
          <span className="text-neon-green">Gut 70%</span> ·{' '}
          <span className="text-neon-orange">Exz. 80%</span> ·{' '}
          <span className="text-neon-gold">Göttl. 100%</span>{' '}
          (geteilte Traits +15%)
        </div>
      </motion.div>
    </motion.div>
  );
};

const toneClasses: Record<'gold' | 'cyan' | 'green', { chip: string; dot: string; title: string; tag: string }> = {
  gold:  { chip: 'border-neon-gold/50 bg-neon-gold/10 text-neon-gold',     dot: 'bg-neon-gold',   title: 'text-neon-gold',  tag: 'bg-neon-gold/25 text-neon-gold border border-neon-gold/40' },
  cyan:  { chip: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan',     dot: 'bg-neon-cyan',   title: 'text-neon-cyan',  tag: 'bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40' },
  green: { chip: 'border-neon-green/40 bg-neon-green/10 text-neon-green',  dot: 'bg-neon-green',  title: 'text-neon-green', tag: 'bg-neon-green/25 text-neon-green border border-neon-green/40' },
};

// Short origin label shown directly on each trait chip so source is readable at a glance.
const toneLabel: Record<'gold' | 'cyan' | 'green', string> = {
  gold:  'BOTH',
  cyan:  'P1',
  green: 'P2',
};

const TraitGroup = ({
  title, subtitle, tone, traits, reduceMotion,
}: {
  title: string;
  subtitle: string;
  tone: 'gold' | 'cyan' | 'green';
  traits: TraitPreviewEntry[];
  reduceMotion: boolean;
}) => {
  const c = toneClasses[tone];
  const originLabel = toneLabel[tone];
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${c.title} truncate`}>{title}</span>
        <span className="text-[9px] text-muted-foreground truncate">· {subtitle}</span>
      </div>
      <motion.div
        className="flex flex-wrap gap-1.5"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduceMotion ? 0 : 0.035 } } }}
      >
        {traits.map(t => (
          <motion.div
            key={`${tone}-${t.name}`}
            layout="position"
            variants={{
              hidden: { opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : 0.9, y: reduceMotion ? 0 : 4 },
              show:   { opacity: 1, scale: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' } },
            }}
            className={`flex items-center gap-1 pl-1 pr-1.5 py-1 rounded-full text-[10px] font-medium border leading-none ${c.chip}`}
            title={
              `Vererbungs-Chance pro Ergebnis:\n` +
              `• Normal: ${t.survivalByOutcome.normal}%\n` +
              `• Gut: ${t.survivalByOutcome.good}%\n` +
              `• Exzellent: ${t.survivalByOutcome.excellent}%\n` +
              `• Göttlich: ${t.survivalByOutcome.godtier}%\n` +
              `• Schwach: ${t.survivalByOutcome.poor}%  • Fehl: ${t.survivalByOutcome.fail}%`
            }
          >
            <span className={`text-[8px] font-bold leading-none px-1 py-0.5 rounded ${c.tag}`}>{originLabel}</span>
            <span className="whitespace-nowrap">{t.name}</span>
            <span className="text-muted-foreground tabular-nums">{t.survivalPct}%</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
