import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';

type ParticleShape = 'circle' | 'leaf' | 'spark';
type ParticlePresetKey = 'tap' | 'harvest' | 'breeding';

interface EmitOptions {
  x: number;
  y: number;
  space?: 'client' | 'canvas';
  preset?: ParticlePresetKey;
  count?: number;
  colors?: string[];
  spread?: number;
  angle?: number;
  speed?: [number, number];
  size?: [number, number];
  life?: [number, number];
  gravity?: number;
  drag?: number;
  shapes?: ParticleShape[];
  glow?: number;
}

interface ParticlePreset {
  count: number;
  colors: string[];
  spread: number;
  angle: number;
  speed: [number, number];
  size: [number, number];
  life: [number, number];
  gravity: number;
  drag: number;
  shapes: ParticleShape[];
  glow: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  ttl: number;
  color: string;
  rotation: number;
  spin: number;
  shape: ParticleShape;
  alpha: number;
  glow: number;
  gravity: number;
  drag: number;
}

interface ParticleSystemContextValue {
  emitBurst: (options: EmitOptions) => void;
}

const PARTICLE_PRESETS: Record<ParticlePresetKey, ParticlePreset> = {
  tap: {
    count: 18,
    colors: ['#22c55e', '#34d399', '#06b6d4', '#a7f3d0', '#e2e8f0'],
    spread: Math.PI * 2,
    angle: 0,
    speed: [90, 220],
    size: [1.5, 3.5],
    life: [420, 900],
    gravity: 140,
    drag: 0.92,
    shapes: ['spark', 'circle'],
    glow: 0.6,
  },
  harvest: {
    count: 28,
    colors: ['#22c55e', '#86efac', '#facc15', '#f59e0b', '#d1fae5'],
    spread: Math.PI * 1.2,
    angle: -Math.PI / 2,
    speed: [120, 280],
    size: [2, 4.5],
    life: [600, 1200],
    gravity: 220,
    drag: 0.9,
    shapes: ['leaf', 'spark', 'circle'],
    glow: 0.9,
  },
  breeding: {
    count: 44,
    colors: ['#8b5cf6', '#ec4899', '#22c55e', '#06b6d4', '#facc15', '#f472b6'],
    spread: Math.PI * 2,
    angle: 0,
    speed: [140, 320],
    size: [2, 5],
    life: [700, 1500],
    gravity: 180,
    drag: 0.9,
    shapes: ['spark', 'circle'],
    glow: 1.1,
  },
};

const MAX_PARTICLES = 320;
const noop = () => undefined;

const ParticleSystemContext = createContext<ParticleSystemContextValue | null>(null);

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)];

export const CanvasParticleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reducedMotion = useGameStore(state => state.reducedMotion);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = null;
    runningRef.current = false;
    lastTimeRef.current = null;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;
    sizeRef.current = { width: rect.width, height: rect.height };
  }, []);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle, alpha: number) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = alpha * particle.alpha;
    ctx.fillStyle = particle.color;

    if (particle.glow > 0) {
      ctx.globalAlpha = alpha * particle.alpha * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * (1.6 + particle.glow), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * particle.alpha;
    }

    switch (particle.shape) {
      case 'leaf':
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size * 1.2, particle.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'spark':
        ctx.fillRect(-particle.size * 2, -particle.size * 0.4, particle.size * 4, particle.size * 0.8);
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }, []);

  const tick = useCallback((now: number) => {
    const ctx = contextRef.current;
    if (!ctx) {
      stopLoop();
      return;
    }

    const lastTime = lastTimeRef.current ?? now;
    const dt = Math.min(0.032, (now - lastTime) / 1000);
    lastTimeRef.current = now;

    const { width, height } = sizeRef.current;
    const particles = particlesRef.current;

    if (particles.length === 0) {
      ctx.clearRect(0, 0, width, height);
      stopLoop();
      return;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.life -= dt * 1000;
      if (particle.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const drag = Math.pow(particle.drag, dt * 60);
      particle.vx *= drag;
      particle.vy = particle.vy * drag + particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.rotation += particle.spin * dt;

      const lifeRatio = Math.max(0, particle.life / particle.ttl);
      drawParticle(ctx, particle, lifeRatio);
    }

    ctx.globalCompositeOperation = 'source-over';
    rafRef.current = requestAnimationFrame(tick);
  }, [drawParticle, stopLoop]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const emitBurst = useCallback((options: EmitOptions) => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (sizeRef.current.width === 0 || sizeRef.current.height === 0) {
      resizeCanvas();
    }

    const preset = PARTICLE_PRESETS[options.preset ?? 'tap'];
    const count = options.count ?? preset.count;
    const colors = options.colors ?? preset.colors;
    const spread = options.spread ?? preset.spread;
    const angle = options.angle ?? preset.angle;
    const [speedMin, speedMax] = options.speed ?? preset.speed;
    const [sizeMin, sizeMax] = options.size ?? preset.size;
    const [lifeMin, lifeMax] = options.life ?? preset.life;
    const gravity = options.gravity ?? preset.gravity;
    const drag = options.drag ?? preset.drag;
    const shapes = options.shapes ?? preset.shapes;
    const glow = options.glow ?? preset.glow;

    let x = options.x;
    let y = options.y;

    if (options.space !== 'canvas') {
      const rect = canvas.getBoundingClientRect();
      x -= rect.left;
      y -= rect.top;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const particles = particlesRef.current;
    for (let i = 0; i < count; i += 1) {
      const theta = angle + (Math.random() - 0.5) * spread;
      const speed = randomBetween(speedMin, speedMax);
      const shape = pick(shapes);
      const vx = Math.cos(theta) * speed;
      const vy = Math.sin(theta) * speed;
      const ttl = randomBetween(lifeMin, lifeMax);
      const rotation = shape === 'spark' ? Math.atan2(vy, vx) : Math.random() * Math.PI * 2;

      particles.push({
        x: x + randomBetween(-6, 6),
        y: y + randomBetween(-6, 6),
        vx,
        vy,
        size: randomBetween(sizeMin, sizeMax),
        life: ttl,
        ttl,
        color: pick(colors),
        rotation,
        spin: randomBetween(-3, 3),
        shape,
        alpha: randomBetween(0.7, 1),
        glow: glow * randomBetween(0.6, 1.2),
        gravity,
        drag,
      });
    }

    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES);
    }

    startLoop();
  }, [reducedMotion, resizeCanvas, startLoop]);

  const value = useMemo<ParticleSystemContextValue>(() => ({ emitBurst }), [emitBurst]);

  useEffect(() => {
    resizeCanvas();

    const canvas = canvasRef.current;
    const target = canvas?.parentElement || canvas;
    if (!target) return undefined;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resizeCanvas());
      observer.observe(target);
    } else {
      (window as Window).addEventListener('resize', resizeCanvas);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      stopLoop();
    };
  }, [resizeCanvas, stopLoop]);

  useEffect(() => {
    if (!reducedMotion) return;
    particlesRef.current = [];
    stopLoop();
  }, [reducedMotion, stopLoop]);

  return (
    <ParticleSystemContext.Provider value={value}>
      {children}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-30"
        aria-hidden="true"
      />
    </ParticleSystemContext.Provider>
  );
};

export const useCanvasParticles = () => {
  const context = useContext(ParticleSystemContext);
  if (!context) {
    return { emitBurst: noop };
  }
  return context;
};
