'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  /** Optional stagger delay in seconds. */
  delay?: number;
  className?: string;
}

/**
 * FadeIn is the single sanctioned motion pattern in the Phantom design system:
 * a gentle fade + upward drift, played once when the element scrolls into view.
 * Use it for entrances only — never for hover states.
 */
export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
