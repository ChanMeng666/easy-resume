/**
 * PdfCanvasPreview component
 * Renders a compiled PDF into stacked <canvas> elements so mobile users can
 * actually see their resume in-page. iOS Safari cannot reliably display a
 * blob-URL PDF inside an iframe, so we rasterize with pdfjs instead.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PdfCanvasPreviewProps {
  /** Blob URL of the compiled PDF */
  url: string;
  className?: string;
}

/**
 * In-page canvas PDF preview (mobile-friendly, no iframe).
 */
export function PdfCanvasPreview({ url, className }: PdfCanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loadingTask: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let doc: any = null;

    setStatus('loading');
    setPageCount(0);

    async function render() {
      try {
        // Load pdfjs only in the browser, and only for this mobile preview,
        // so the desktop iframe path never pulls in the bundle.
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({ url });
        doc = await loadingTask.promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        // Clear any canvases from a previous url.
        container.replaceChildren();
        setPageCount(doc.numPages);

        const containerWidth = container.clientWidth || 320;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          if (cancelled) return;

          const baseViewport = page.getViewport({ scale: 1 });
          const cssScale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: cssScale * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className =
            'block w-full overflow-hidden rounded-2xl border border-ash bg-white';
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
        }

        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    render();

    return () => {
      cancelled = true;
      // Best-effort teardown; ignore rejections from an in-flight load.
      try {
        loadingTask?.destroy?.();
      } catch {
        // no-op
      }
      try {
        doc?.destroy?.();
      } catch {
        // no-op
      }
    };
  }, [url]);

  return (
    <div className={className}>
      {status === 'loading' && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-periwinkle" />
        </div>
      )}
      {status === 'error' && (
        <p className="py-8 text-center text-caption text-rose-ink">
          Preview unavailable. Use Download or Open below.
        </p>
      )}
      <div ref={containerRef} className="space-y-2" />
      {status === 'ready' && pageCount > 1 && (
        <p className="mt-2 text-caption text-muted-foreground text-center">
          {pageCount} pages
        </p>
      )}
    </div>
  );
}
