'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Root error boundary — a calm, centered recovery state. Errors are stated
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-aubergine">
          Something went wrong.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lead text-muted-foreground">
          An unexpected error interrupted the page. Try again — if it keeps
          happening, head back home and start over.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => (window.location.href = '/')}
          >
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
