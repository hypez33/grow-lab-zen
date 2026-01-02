import { useState, useCallback } from 'react';

export type ShakeIntensity = 'light' | 'medium' | 'heavy';

interface ShakeConfig {
  intensity: ShakeIntensity;
  duration?: number;
}

const SHAKE_CONFIGS: Record<ShakeIntensity, { x: number[]; duration: number }> = {
  light: { x: [0, -5, 5, -5, 5, 0], duration: 0.3 },
  medium: { x: [0, -10, 10, -10, 10, -5, 5, 0], duration: 0.5 },
  heavy: { x: [0, -15, 15, -15, 15, -10, 10, -5, 5, 0], duration: 0.7 },
};

export const useScreenShake = () => {
  const [isShaking, setIsShaking] = useState(false);
  const [shakeConfig, setShakeConfig] = useState<{ x: number[]; duration: number }>(
    SHAKE_CONFIGS.medium
  );

  const shake = useCallback(({ intensity, duration }: ShakeConfig) => {
    const config = SHAKE_CONFIGS[intensity];
    setShakeConfig({
      x: config.x,
      duration: duration || config.duration,
    });
    setIsShaking(true);

    setTimeout(() => {
      setIsShaking(false);
    }, (duration || config.duration) * 1000);
  }, []);

  return {
    isShaking,
    shakeConfig,
    shake,
  };
};
