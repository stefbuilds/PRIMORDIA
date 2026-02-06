'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence, Variants, useReducedMotion } from 'framer-motion';

const SESSION_KEY = 'gp_booted';

// Context to share animation state with child components
interface EntryMotionContextValue {
  isFirstLoad: boolean;
  isAnimating: boolean;
}

const EntryMotionContext = createContext<EntryMotionContextValue>({
  isFirstLoad: false,
  isAnimating: false,
});

export const useEntryMotion = () => useContext(EntryMotionContext);

// Animation durations
const TOTAL_DURATION = 1.4; // seconds
const STAGGER_DELAY = 0.12;

// Variants for different sections
export const containerVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
      staggerChildren: STAGGER_DELAY,
    },
  },
};

export const headerVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const mapVariants: Variants = {
  hidden: { 
    opacity: 0,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const panelVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: 24,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const tickerVariants: Variants = {
  hidden: { 
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Reduced motion variants (simple fade)
const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
};

interface EntryMotionProps {
  children: ReactNode;
}

export function EntryMotion({ children }: EntryMotionProps) {
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
    
    // Check sessionStorage only on client
    const hasBooted = sessionStorage.getItem(SESSION_KEY);
    
    if (!hasBooted) {
      setIsFirstLoad(true);
      setIsAnimating(true);
      sessionStorage.setItem(SESSION_KEY, 'true');
      
      // Mark animation as complete after duration
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, TOTAL_DURATION * 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // SSR-safe: render children immediately without motion wrapper
  if (!mounted) {
    return <>{children}</>;
  }

  const contextValue: EntryMotionContextValue = {
    isFirstLoad,
    isAnimating,
  };

  // If not first load or user prefers reduced motion (instant show)
  if (!isFirstLoad) {
    return (
      <EntryMotionContext.Provider value={contextValue}>
        {children}
      </EntryMotionContext.Provider>
    );
  }

  // Use reduced variants if user prefers reduced motion
  const variants = prefersReducedMotion ? reducedVariants : containerVariants;

  return (
    <EntryMotionContext.Provider value={contextValue}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants}
        className="contents"
      >
        {children}
      </motion.div>
    </EntryMotionContext.Provider>
  );
}

// Wrapper components for specific sections
interface MotionSectionProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MotionHeader({ children, className = '', style }: MotionSectionProps) {
  const { isFirstLoad } = useEntryMotion();
  const prefersReducedMotion = useReducedMotion();
  
  if (!isFirstLoad) {
    return <div className={className} style={style}>{children}</div>;
  }
  
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedVariants : headerVariants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function MotionTicker({ children, className = '', style }: MotionSectionProps) {
  const { isFirstLoad } = useEntryMotion();
  const prefersReducedMotion = useReducedMotion();
  
  if (!isFirstLoad) {
    return <div className={className} style={style}>{children}</div>;
  }
  
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedVariants : tickerVariants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function MotionMap({ children, className = '', style }: MotionSectionProps) {
  const { isFirstLoad } = useEntryMotion();
  const prefersReducedMotion = useReducedMotion();
  
  if (!isFirstLoad) {
    return <div className={className} style={style}>{children}</div>;
  }
  
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedVariants : mapVariants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function MotionPanel({ children, className = '', style }: MotionSectionProps) {
  const { isFirstLoad } = useEntryMotion();
  const prefersReducedMotion = useReducedMotion();
  
  if (!isFirstLoad) {
    return <div className={className} style={style}>{children}</div>;
  }
  
  return (
    <motion.div
      variants={prefersReducedMotion ? reducedVariants : panelVariants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default EntryMotion;
