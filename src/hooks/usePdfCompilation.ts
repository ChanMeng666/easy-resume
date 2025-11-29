/**
 * React hook for PDF compilation with debouncing and state management
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { compilePdf, revokePdfUrl, CompileError, CompileOptions } from '@/lib/latex/compiler';

export interface UsePdfCompilationOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Auto-compile when code changes */
  autoCompile?: boolean;
  /** LaTeX engine to use */
  engine?: CompileOptions['engine'];
}

export interface UsePdfCompilationReturn {
  /** URL of the compiled PDF (null if not compiled) */
  pdfUrl: string | null;
  /** Whether compilation is in progress */
  isCompiling: boolean;
  /** Error from last compilation attempt */
  error: CompileError | null;
  /** Whether the result came from cache */
  isCached: boolean;
  /** Trigger manual compilation */
  compile: (latexCode: string) => void;
  /** Clear the current PDF and error state */
  reset: () => void;
}

/**
 * Hook for managing PDF compilation from LaTeX code
 * @param options - Configuration options
 */
export function usePdfCompilation(
  options: UsePdfCompilationOptions = {}
): UsePdfCompilationReturn {
  const {
    debounceMs = 800,
    engine = 'pdflatex',
  } = options;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<CompileError | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Track the latest PDF URL for cleanup
  const currentUrlRef = useRef<string | null>(null);
  // Track if component is mounted
  const isMountedRef = useRef(true);

  /**
   * Cleanup function to revoke old PDF URLs
   */
  const cleanupUrl = useCallback(() => {
    if (currentUrlRef.current) {
      revokePdfUrl(currentUrlRef.current);
      currentUrlRef.current = null;
    }
  }, []);

  /**
   * Core compilation function
   */
  const doCompile = useCallback(async (latexCode: string) => {
    if (!latexCode.trim()) {
      return;
    }

    setIsCompiling(true);
    setError(null);

    try {
      const result = await compilePdf(latexCode, { engine });

      // Check if component is still mounted
      if (!isMountedRef.current) return;

      if (result.success && result.pdfUrl) {
        // Cleanup old URL before setting new one
        cleanupUrl();

        currentUrlRef.current = result.pdfUrl;
        setPdfUrl(result.pdfUrl);
        setIsCached(result.cached || false);
        setError(null);
      } else if (result.error) {
        setError(result.error);
        setPdfUrl(null);
        setIsCached(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      setError({
        type: 'network',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      });
      setPdfUrl(null);
      setIsCached(false);
    } finally {
      if (isMountedRef.current) {
        setIsCompiling(false);
      }
    }
  }, [engine, cleanupUrl]);

  /**
   * Debounced compile function
   */
  const debouncedCompile = useDebouncedCallback(doCompile, debounceMs);

  /**
   * Public compile function that uses debouncing
   */
  const compile = useCallback((latexCode: string) => {
    debouncedCompile(latexCode);
  }, [debouncedCompile]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    cleanupUrl();
    setPdfUrl(null);
    setError(null);
    setIsCached(false);
    setIsCompiling(false);
    debouncedCompile.cancel();
  }, [cleanupUrl, debouncedCompile]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanupUrl();
      debouncedCompile.cancel();
    };
  }, [cleanupUrl, debouncedCompile]);

  return {
    pdfUrl,
    isCompiling,
    error,
    isCached,
    compile,
    reset,
  };
}
