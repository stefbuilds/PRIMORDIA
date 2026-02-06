'use client';

import { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  shouldAnimate?: boolean;
  className?: string;
}

/**
 * Animates a number counting up from 0 to the target value.
 * Uses requestAnimationFrame for smooth interpolation.
 * Respects prefers-reduced-motion.
 */
export function CountUp({
  value,
  durationMs = 600,
  decimals = 0,
  prefix = '',
  suffix = '',
  shouldAnimate = false,
  className = '',
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? 0 : value);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    // Skip animation if reduced motion or shouldAnimate is false
    if (!shouldAnimate || prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * value;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, durationMs, shouldAnimate, prefersReducedMotion]);

  const formatted = displayValue.toFixed(decimals);
  
  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default CountUp;
