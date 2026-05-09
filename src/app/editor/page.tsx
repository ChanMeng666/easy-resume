'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { Button } from '@/components/ui/button';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';
import { ArrowLeft } from 'lucide-react';
import { AIEditorContent } from './AIEditorContent';

/**
 * Editor page — result review page.
 * Users arrive here after clicking "Generate My Resume" on the homepage.
 * Reads JD and background from a window global first (survives client-side
 * navigation and the iOS Safari private-mode sessionStorage quota), then
 * falls back to sessionStorage for full-reload scenarios.
 */
export default function AIEditorPage() {
  const [inputs, setInputs] = useState<{ jd: string; bg: string } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  useEffect(() => {
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
  }, []);

  const hasInputs = inputs !== null && inputs.jd.trim() && inputs.bg.trim();

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f0f0]">
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        <Navbar
          currentPath="/editor"
          position="sticky"
          externalScrollDirection={scrollDirection}
        />

        {inputs === null ? (
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-20">
              <div className="rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <p className="font-bold text-muted-foreground animate-pulse">
                  Loading editor...
                </p>
              </div>
            </div>
          </div>
        ) : hasInputs ? (
          <AIEditorContent jd={inputs.jd} bg={inputs.bg} />
        ) : (
          <main className="container mx-auto max-w-[600px] px-4 py-12">
            <div className="rounded-xl border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
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
