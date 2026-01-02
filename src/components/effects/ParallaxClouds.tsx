import React, { useMemo } from 'react';
import { Screen } from '@/store/navigationStore';
import { useGameStore } from '@/store/gameStore';

interface ParallaxCloudsProps {
  screen: Screen;
}

interface CloudTheme {
  sky: string;
  haze: string;
  cloud: string;
}

const CLOUD_THEMES: Record<string, CloudTheme> = {
  grow: {
    sky: 'linear-gradient(180deg, rgba(12, 26, 18, 0.95) 0%, rgba(8, 10, 10, 1) 70%)',
    haze: 'radial-gradient(circle at 50% 20%, rgba(34, 197, 94, 0.14), transparent 60%)',
    cloud: 'rgba(187, 247, 208, 0.28)',
  },
  genetics: {
    sky: 'linear-gradient(180deg, rgba(20, 12, 34, 0.95) 0%, rgba(9, 7, 14, 1) 70%)',
    haze: 'radial-gradient(circle at 40% 10%, rgba(139, 92, 246, 0.18), transparent 60%)',
    cloud: 'rgba(216, 180, 254, 0.25)',
  },
  koks: {
    sky: 'linear-gradient(180deg, rgba(10, 18, 30, 0.95) 0%, rgba(6, 8, 12, 1) 70%)',
    haze: 'radial-gradient(circle at 45% 15%, rgba(56, 189, 248, 0.16), transparent 60%)',
    cloud: 'rgba(186, 230, 253, 0.22)',
  },
  meth: {
    sky: 'linear-gradient(180deg, rgba(12, 18, 22, 0.96) 0%, rgba(6, 8, 10, 1) 70%)',
    haze: 'radial-gradient(circle at 50% 12%, rgba(34, 197, 94, 0.18), transparent 60%)',
    cloud: 'rgba(187, 247, 208, 0.18)',
  },
  dryroom: {
    sky: 'linear-gradient(180deg, rgba(9, 18, 24, 0.95) 0%, rgba(6, 8, 10, 1) 70%)',
    haze: 'radial-gradient(circle at 60% 15%, rgba(45, 212, 191, 0.16), transparent 60%)',
    cloud: 'rgba(165, 243, 252, 0.22)',
  },
  sales: {
    sky: 'linear-gradient(180deg, rgba(28, 20, 8, 0.92) 0%, rgba(10, 8, 6, 1) 70%)',
    haze: 'radial-gradient(circle at 40% 10%, rgba(251, 191, 36, 0.15), transparent 60%)',
    cloud: 'rgba(254, 240, 138, 0.2)',
  },
  business: {
    sky: 'linear-gradient(180deg, rgba(18, 16, 10, 0.94) 0%, rgba(8, 7, 6, 1) 70%)',
    haze: 'radial-gradient(circle at 50% 12%, rgba(234, 179, 8, 0.16), transparent 60%)',
    cloud: 'rgba(253, 224, 71, 0.2)',
  },
  default: {
    sky: 'linear-gradient(180deg, rgba(10, 12, 18, 0.95) 0%, rgba(6, 6, 8, 1) 70%)',
    haze: 'radial-gradient(circle at 50% 15%, rgba(34, 197, 94, 0.1), transparent 60%)',
    cloud: 'rgba(148, 163, 184, 0.2)',
  },
};

const BASE_CLOUDS = [
  { x: 6, y: 18, size: 190, alpha: 0.55 },
  { x: 22, y: 34, size: 150, alpha: 0.5 },
  { x: 38, y: 14, size: 210, alpha: 0.45 },
  { x: 56, y: 28, size: 170, alpha: 0.5 },
  { x: 74, y: 16, size: 190, alpha: 0.42 },
  { x: 90, y: 30, size: 160, alpha: 0.5 },
];

const LAYERS = [
  { id: 'back', speed: 170, opacity: 0.35, blur: 18, offset: 0, scale: 1.25, height: 55 },
  { id: 'mid', speed: 130, opacity: 0.45, blur: 10, offset: 6, scale: 1, height: 60 },
  { id: 'front', speed: 95, opacity: 0.55, blur: 6, offset: 12, scale: 0.9, height: 65 },
];

export const ParallaxClouds: React.FC<ParallaxCloudsProps> = ({ screen }) => {
  const reducedMotion = useGameStore(state => state.reducedMotion);
  const theme = CLOUD_THEMES[screen] ?? CLOUD_THEMES.default;

  const clouds = useMemo(() => {
    return BASE_CLOUDS.flatMap(cloud => [
      cloud,
      { ...cloud, x: cloud.x + 100 },
    ]);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: theme.sky }} />
      <div className="absolute inset-0" style={{ background: theme.haze }} />

      {LAYERS.map(layer => (
        <div
          key={layer.id}
          className="cloud-layer"
          style={{
            top: `${layer.offset}%`,
            height: `${layer.height}%`,
            opacity: layer.opacity,
            filter: `blur(${layer.blur}px)`,
            animationDuration: `${layer.speed}s`,
            animationPlayState: reducedMotion ? 'paused' : 'running',
            ['--cloud-color' as string]: theme.cloud,
          }}
        >
          {clouds.map((cloud, index) => (
            <div
              key={`${layer.id}-${index}`}
              className="cloud-shape"
              style={{
                left: `${cloud.x}%`,
                top: `${cloud.y}%`,
                width: `${cloud.size * layer.scale}px`,
                height: `${cloud.size * layer.scale * 0.6}px`,
                opacity: cloud.alpha,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
