'use client';

import { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';
import { AIEditorContent } from './AIEditorContent';

/**
 * Editor page — result review page.
 * Users arrive here after clicking "Generate My Resume" on the homepage.
 * Reads JD and background info from sessionStorage written by the homepage.
 */
export default function AIEditorPage() {
  const [inputs, setInputs] = useState<{ jd: string; bg: string } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  useEffect(() => {
    const jd = sessionStorage.getItem('vitex_jd') ?? '';
    const bg = sessionStorage.getItem('vitex_bg') ?? '';
    setInputs({ jd, bg });
  }, []);

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
        ) : (
          <AIEditorContent jd={inputs.jd} bg={inputs.bg} />
        )}

        <Footer />
      </div>
    </div>
  );
}
