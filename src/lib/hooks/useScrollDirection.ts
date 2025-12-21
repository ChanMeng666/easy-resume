'use client';

import { useState, useEffect, RefObject } from 'react';

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

/**
 * Custom hook to detect scroll direction within a specific element
 * Returns 'up' when scrolling up, 'down' when scrolling down, or null when at the top
 *
 * @param containerRef - Ref to the scrollable container element
 * @param threshold - Minimum scroll distance to trigger direction change (default: 10px)
 * @returns Current scroll direction or null
 */
export function useElementScrollDirection(
  containerRef: RefObject<HTMLElement | null>,
  threshold: number = 10
) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastScrollY = container.scrollTop;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = container.scrollTop;

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

    container.addEventListener('scroll', onScroll);

    return () => container.removeEventListener('scroll', onScroll);
  }, [containerRef, threshold]);

  return scrollDirection;
}
