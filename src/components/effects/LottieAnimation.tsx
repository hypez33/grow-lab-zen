import React from 'react';
import Lottie from 'lottie-react';

interface LottieAnimationProps {
  animationData?: any; // Lottie JSON data
  fallback?: React.ReactNode; // Fallback if no animation provided
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Wrapper for Lottie animations with fallback support
 * Usage: Import Lottie JSON files and pass as animationData
 *
 * Free Lottie animations: https://lottiefiles.com/
 * Recommended animations:
 * - Godtier: "Success Confetti" or "Explosion"
 * - Level-Up: "Celebration" or "Achievement"
 * - Worker-Hire: "Character Intro" or "Welcome"
 */
export const LottieAnimation: React.FC<LottieAnimationProps> = ({
  animationData,
  fallback,
  loop = false,
  autoplay = true,
  className = '',
  style = {},
}) => {
  if (!animationData && fallback) {
    return <>{fallback}</>;
  }

  if (!animationData) {
    return null;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  );
};
