'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';
import { ArrowLeft } from 'lucide-react';
import { AIEditorContent } from './AIEditorContent';

/**
 * Editor content — resolves how to populate the result review:
 * - `?job=<id>` present → re-open a persisted generation (free, no re-charge);
 * - otherwise → read JD/background from a window global first (survives
 *   client-side navigation and the iOS Safari private-mode sessionStorage
 *   quota), then fall back to sessionStorage for full-reload scenarios.
 */
function AIEditorPageContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('job');
  const [inputs, setInputs] = useState<{ jd: string; bg: string } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  useEffect(() => {
    // Job mode skips the JD/background lookup entirely.
    if (jobId) return;
    const fromWindow = window.__vitexInputs;
    if (fromWindow && fromWindow.jd && fromWindow.bg) {
      setInputs({ jd: fromWindow.jd, bg: fromWindow.bg });
      return;
    }
    let jd = '';
    let bg = '';
    try {
      jd = sessionStorage.getItem('vitex_jd') ?? '';
      bg = sessionStorage.getItem('vitex_bg') ?? '';
    } catch {
      // sessionStorage may throw in private mode — treat as empty.
    }
    setInputs({ jd, bg });
  }, [jobId]);

  const hasInputs = inputs !== null && inputs.jd.trim() && inputs.bg.trim();

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f0f0]">
      <div ref={scrollContainerRef} className="flex-1 overflow-auto baseline-grid">
        <Navbar
          currentPath="/editor"
          position="sticky"
          externalScrollDirection={scrollDirection}
        />

        {jobId ? (
          <AIEditorContent jobId={jobId} />
        ) : inputs === null ? (
          <div className="container mx-auto px-4 pt-16 pb-20">
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <span className="proof-label">compile.log</span>
                <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">
                  loading editor…
                </p>
              </div>
            </div>
          </div>
        ) : hasInputs ? (
          <AIEditorContent jd={inputs.jd} bg={inputs.bg} />
        ) : (
          <main className="container mx-auto max-w-xl px-4 pt-12 md:pt-16 pb-20">
            <div className="rounded-xl border-2 border-black bg-white p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
              <p className="proof-label mb-3">ERR·NO_INPUT</p>
              <h2 className="mb-3 text-xl sm:text-2xl font-black">
                No inputs found
              </h2>
              <p className="mb-6 text-sm sm:text-base text-muted-foreground font-medium">
                We couldn&apos;t find the job description and background you submitted.
                This can happen if you opened this page directly, refreshed in
                private browsing mode, or the inputs were too large to store.
              </p>
              <Link href="/">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to home
                </Button>
              </Link>
            </div>
          </main>
        )}

        <Footer />
      </div>
    </div>
  );
}

/**
 * Editor page — result review page. Wraps the content in <Suspense> because it
 * reads `?job=` via useSearchParams (required by Next.js for static rendering).
 */
export default function AIEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-[#f0f0f0]">
          <div className="flex-1 overflow-auto baseline-grid">
            <Navbar currentPath="/editor" position="sticky" />
            <div className="container mx-auto px-4 pt-16 pb-20">
              <div className="flex items-center justify-center py-20">
                <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                  <span className="proof-label">compile.log</span>
                  <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">
                    loading editor…
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <AIEditorPageContent />
    </Suspense>
  );
}
