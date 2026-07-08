/**
 * LivePdfPreview component
 * Orchestrates real-time Typst compilation and PDF preview.
 * On md+ viewports it renders the full PdfViewer with iframe preview.
 * On smaller screens it collapses to a download card, since iOS Safari
 * has long-standing issues rendering blob-URL PDFs inside iframes.
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PdfCanvasPreview } from './PdfCanvasPreview';
import { usePdfCompilation } from '@/hooks/usePdfCompilation';
import { downloadPdfFromUrl, openPdfInNewTab } from '@/lib/pdf/download';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LivePdfPreviewProps {
  /** Typst code to compile */
  typstCode: string;
  /** Filename for download */
  filename?: string;
  /** Called when compilation error occurs */
  onError?: (error: string) => void;
}

/**
 * Live PDF preview with automatic compilation
 */
export function LivePdfPreview({
  typstCode,
  filename = 'resume',
  onError,
}: LivePdfPreviewProps) {
  const {
    pdfUrl,
    isCompiling,
    error,
    isCached,
    compile,
    reset,
  } = usePdfCompilation({ debounceMs: 1000 });

  const [hasCompiled, setHasCompiled] = useState(false);

  // Track whether we're on a mobile viewport so the canvas preview (and its
  // pdfjs bundle) only mounts there — desktop keeps the lightweight iframe path.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  /**
   * Trigger compilation when Typst code changes
   */
  useEffect(() => {
    if (typstCode.trim()) {
      compile(typstCode);
      setHasCompiled(true);
    }
  }, [typstCode, compile]);

  /**
   * Report errors to parent
   */
  useEffect(() => {
    if (error && onError) {
      onError(error.message);
    }
  }, [error, onError]);

  /**
   * Handle manual retry
   */
  const handleRetry = useCallback(() => {
    reset();
    if (typstCode.trim()) {
      compile(typstCode);
    }
  }, [typstCode, compile, reset]);

  // Initial state - no compilation yet
  if (!hasCompiled && !isCompiling) {
    return (
      <div className="flex h-[40vh] min-h-[280px] md:h-[500px] flex-col items-center justify-center rounded-3xl border border-ash bg-bone px-4">
        <h3 className="text-base sm:text-lg font-medium text-aubergine">
          Live PDF Preview
        </h3>
        <p className="mt-2 max-w-sm text-center text-xs sm:text-sm text-muted-foreground">
          Your resume will be compiled and displayed here in real-time as you edit.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleRetry}
        >
          Generate Preview
        </Button>
      </div>
    );
  }

  // Compiling state
  if (isCompiling && !pdfUrl) {
    return (
      <div className="flex h-[40vh] min-h-[280px] md:h-[500px] flex-col items-center justify-center rounded-3xl border border-ash bg-bone px-4">
        <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-periwinkle" />
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-aubergine">
          Compiling...
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          This may take a few seconds
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-periwinkle"></span>
          Compiling Typst document
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pdfUrl) {
    return (
      <div className="flex h-[40vh] min-h-[280px] md:h-[500px] flex-col items-center justify-center rounded-3xl border border-ash bg-blush/30 px-4">
        <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-rose-ink" />
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-medium text-rose-ink">
          Compilation Failed
        </h3>
        <p className="mt-2 max-w-md text-center text-xs sm:text-sm text-rose-ink">
          {error.message}
        </p>

        {/* Show log excerpt if available */}
        {error.log && (
          <details className="mt-4 w-full max-w-lg">
            <summary className="cursor-pointer text-xs sm:text-sm text-rose-ink hover:underline">
              View error log
            </summary>
            <pre className="mt-2 max-h-[150px] overflow-auto rounded-2xl bg-aubergine p-3 text-xs text-paper">
              {error.log}
            </pre>
          </details>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Success state - show PDF
  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-full border border-ash bg-white px-3 sm:px-4 py-1.5">
        <div className="flex items-center gap-2">
          {isCompiling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-periwinkle" />
              <span className="text-caption font-medium text-aubergine">Updating preview…</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-mint" />
              <span className="text-caption font-medium text-mint-ink">
                resume.pdf · ready
                {isCached && <span className="ml-2 text-muted-foreground">cached</span>}
              </span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          disabled={isCompiling}
          className="h-8"
        >
          Refresh
        </Button>
      </div>

      {pdfUrl && (
        <>
          {/* Desktop: plain embedded preview. The browser's built-in PDF
              viewer already provides zoom/download/print — no custom toolbar. */}
          <iframe
            src={pdfUrl}
            title="PDF preview"
            className="hidden h-[70vh] min-h-[420px] w-full rounded-3xl border border-ash bg-white md:block"
          />

          {/* Mobile: real in-page canvas preview. iOS Safari blob-URL iframes
              are unreliable, so we rasterize the PDF with pdfjs. Mounted only
              on mobile viewports so desktop never loads the pdfjs bundle. */}
          <div className="md:hidden rounded-3xl border border-ash bg-white p-4">
            {isMobile && <PdfCanvasPreview url={pdfUrl} />}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                size="lg"
                className="w-full text-sm"
                onClick={() => downloadPdfFromUrl(pdfUrl, filename)}
              >
                Download
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full text-sm"
                onClick={() => openPdfInNewTab(pdfUrl)}
              >
                Open
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
