'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect scroll direction
 * Returns 'up' when scrolling up, 'down' when scrolling down, or null when at the top
 *
 * @param threshold - Minimum scroll distance to trigger direction change (default: 10px)
 * @returns Current scroll direction or null
 */
export function useScrollDirection(threshold: number = 10) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;

      if (Math.abs(scrollY - lastScrollY) < threshold) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDirection;
}
