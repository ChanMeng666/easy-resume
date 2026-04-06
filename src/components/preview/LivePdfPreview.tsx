/**
 * LivePdfPreview component
 * Orchestrates real-time Typst compilation and PDF preview
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PdfViewer } from './PdfViewer';
import { usePdfCompilation } from '@/hooks/usePdfCompilation';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Zap,
  CheckCircle2,
} from 'lucide-react';

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
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-gray-50">
        <Zap className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-700">
          Live PDF Preview
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
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
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <h3 className="mt-4 text-lg font-medium text-gray-700">
          Compiling...
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          This may take a few seconds
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-600"></span>
          Compiling Typst document
        </div>
      </div>
    );
  }

  // Error state
  if (error && !pdfUrl) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border bg-red-50">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-red-700">
          Compilation Failed
        </h3>
        <p className="mt-2 max-w-md text-center text-sm text-red-600">
          {error.message}
        </p>

        {/* Show log excerpt if available */}
        {error.log && (
          <details className="mt-4 w-full max-w-lg">
            <summary className="cursor-pointer text-sm text-red-600 hover:underline">
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
        </div>
      </div>
    );
  }

  // Success state - show PDF
  return (
    <div className="space-y-2">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-lg border bg-green-50 px-4 py-2">
        <div className="flex items-center gap-2">
          {isCompiling ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">
                Updating preview...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
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
    </div>
  );
}
