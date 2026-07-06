/**
 * PdfViewer component
 * Displays PDF documents using native browser iframe
 * Simple and compatible with all browsers
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { downloadPdfFromUrl, openPdfInNewTab } from '@/lib/pdf/download';
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Loader2,
} from 'lucide-react';

interface PdfViewerProps {
  /** URL of the PDF to display (blob URL or regular URL) */
  url: string;
  /** Optional filename for download */
  filename?: string;
  /** Whether to show toolbar */
  showToolbar?: boolean;
}

/**
 * PDF viewer using native browser iframe
 * Works with blob URLs from compiled PDFs
 */
export function PdfViewer({
  url,
  filename = 'resume',
  showToolbar = true,
}: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(100);

  /**
   * Handle iframe load
   */
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  /**
   * Handle iframe error
   */
  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load PDF');
  }, []);

  /**
   * Download the PDF
   */
  const downloadPdf = useCallback(() => {
    downloadPdfFromUrl(url, filename);
  }, [url, filename]);

  /**
   * Open in new tab
   */
  const openInNewTab = useCallback(() => {
    openPdfInNewTab(url);
  }, [url]);

  /**
   * Zoom controls
   */
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 25, 200));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 25, 50));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(100);
  }, []);

  if (error) {
    return (
      <div className="flex h-[60vh] min-h-[420px] md:h-[600px] items-center justify-center rounded-3xl border border-ash bg-bone">
        <div className="text-center">
          <p className="text-rose-ink">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RotateCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-3xl border border-ash bg-white">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between border-b border-ash px-4 py-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 50}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="min-w-[60px] font-mono text-xs"
              title="Reset zoom"
            >
              {scale}%
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 200}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={openInNewTab}
              title="Open in new tab"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPdf}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      )}

      {/* PDF Container */}
      <div
        className={`relative overflow-hidden bg-bone h-[60vh] min-h-[420px] md:h-[600px] ${showToolbar ? 'rounded-b-3xl' : 'rounded-3xl'}`}
      >
        {isLoading && (
          <div className={`absolute inset-0 z-10 flex items-center justify-center bg-white/80 ${showToolbar ? 'rounded-b-3xl' : 'rounded-3xl'}`}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-periwinkle" />
              <span className="text-sm text-muted-foreground">
                Loading PDF...
              </span>
            </div>
          </div>
        )}
        <div className="h-full overflow-auto">
          <div
            className="flex min-h-full justify-center p-2 sm:p-4"
            style={{
              transform: `scale(${scale / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <iframe
              src={url}
              className="aspect-[3/4] w-full max-w-[600px] border border-ash bg-white"
              title="PDF Preview"
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
