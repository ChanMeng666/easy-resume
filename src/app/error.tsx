'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CropFrame } from '@/components/shared/CropFrame';
import { RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * Root error boundary — on-brand "compile error" treatment. Errors are stated
 * plainly with a recovery action, never an apology.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console for debugging; structured logging lives server-side.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center baseline-grid bg-[#f0f0f0] px-4">
      <CropFrame className="w-full max-w-lg overflow-hidden rounded-xl border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b-2 border-black bg-red-50 px-4 py-3">
          <span className="proof-label !text-red-700">compile.error</span>
          <span className="proof-label !text-red-700">ERR·CLIENT</span>
        </div>
        <div className="p-8">
          <h1 className="text-2xl font-black mb-3">Something didn&apos;t compile.</h1>
          <p className="text-muted-foreground font-medium mb-6">
            An unexpected error interrupted the page. Try again — if it keeps
            happening, head back home and start over.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button size="lg" className="gap-2" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => (window.location.href = '/')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Button>
          </div>
        </div>
      </CropFrame>
    </div>
  );
}
