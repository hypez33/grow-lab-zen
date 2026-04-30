import { motion } from 'framer-motion';

/**
 * Lightweight Neon/Glass loading fallback for lazy-loaded screens.
 * Mobile-friendly, matches the dark neon aesthetic.
 */
export const ScreenLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass-card rounded-2xl px-6 py-5 flex items-center gap-3 border border-primary/30 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]"
      >
        <motion.span
          aria-hidden
          className="inline-block w-3 h-3 rounded-full bg-primary"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 12px hsl(var(--primary))' }}
        />
        <span className="text-sm font-medium text-foreground/90 tracking-wide">
          Lade Bereich…
        </span>
      </motion.div>
    </div>
  );
};

export default ScreenLoader;
