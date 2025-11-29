/**
 * LivePdfPreview component
 * Orchestrates real-time LaTeX compilation and PDF preview
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PdfViewer } from './PdfViewer';
import { usePdfCompilation } from '@/hooks/usePdfCompilation';
import { openInOverleaf } from '@/lib/overleaf/api';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FileWarning,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface LivePdfPreviewProps {
  /** LaTeX code to compile */
  latexCode: string;
  /** Filename for download */
  filename?: string;
  /** Called when compilation error occurs */
  onError?: (error: string) => void;
}

/**
 * Live PDF preview with automatic compilation
 */
export function LivePdfPreview({
  latexCode,
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

  /**
   * Trigger compilation when LaTeX code changes
   */
  useEffect(() => {
    if (latexCode.trim()) {
      compile(latexCode);
      setHasCompiled(true);
    }
  }, [latexCode, compile]);

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
    if (latexCode.trim()) {
      compile(latexCode);
    }
  }, [latexCode, compile, reset]);

  /**
   * Open in Overleaf as fallback
   */
  const handleOpenInOverleaf = useCallback(() => {
    openInOverleaf(latexCode);
  }, [latexCode]);

  // Initial state - no compilation yet
  if (!hasCompiled && !isCompiling) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-gray-50 dark:bg-gray-900">
        <Zap className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
          Live PDF Preview
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-gray-500 dark:text-gray-400">
          Your resume will be compiled and displayed here in real-time as you edit.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={handleRetry}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate Preview
        </Button>
      </div>
    );
  }

  // Compiling state
  if (isCompiling && !pdfUrl) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
          Compiling LaTeX...
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          This may take 5-15 seconds
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600"></span>
          Sending to compilation server
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pdfUrl) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-red-50 dark:bg-red-950/20">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-red-700 dark:text-red-400">
          Compilation Failed
        </h3>
        <p className="mt-2 max-w-md text-center text-sm text-red-600 dark:text-red-300">
          {error.message}
        </p>

        {/* Show log excerpt if available */}
        {error.log && (
          <details className="mt-4 w-full max-w-lg">
            <summary className="cursor-pointer text-sm text-red-600 hover:underline dark:text-red-400">
              View error log
            </summary>
            <pre className="mt-2 max-h-[150px] overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
              {error.log}
            </pre>
          </details>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
          <Button variant="default" onClick={handleOpenInOverleaf}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Overleaf
          </Button>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Tip: Overleaf provides more detailed error messages
        </p>
      </div>
    );
  }

  // Success state - show PDF
  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-lg border bg-green-50 px-4 py-2 dark:bg-green-950/20">
        <div className="flex items-center gap-2">
          {isCompiling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-400">
                Updating preview...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Preview ready
                {isCached && (
                  <span className="ml-2 text-xs text-gray-500">(cached)</span>
                )}
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
          <RefreshCw className={`mr-2 h-3 w-3 ${isCompiling ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* PDF Viewer */}
      {pdfUrl && (
        <PdfViewer
          url={pdfUrl}
          filename={filename}
          showToolbar={true}
        />
      )}

      {/* Privacy notice */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
        <FileWarning className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Privacy note:</strong> Your resume data is sent to{' '}
          <a
            href="https://github.com/YtoTech/latex-on-http"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            LaTeX-on-HTTP
          </a>{' '}
          for compilation. Data is not stored permanently.
          For complete privacy, use{' '}
          <button
            onClick={handleOpenInOverleaf}
            className="font-medium underline hover:no-underline"
          >
            Open in Overleaf
          </button>{' '}
          with your own account.
        </p>
      </div>
    </div>
  );
}
