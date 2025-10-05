'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useResumeData } from '@/hooks/useResumeData';
import { Footer } from '@/components/layout/Footer';
import { EditorContent } from './EditorContent';

export default function EditorPage() {
  const resumeData = useResumeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/easy-resume.svg" alt="Easy Resume" width={32} height={32} />
              <div>
                <h1 className="text-xl font-bold">Easy Resume</h1>
                <p className="text-sm text-muted-foreground">
                  Resume Editor
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Powered by</span>
              <a
                href="https://www.overleaf.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Overleaf
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Wrapped in Suspense */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }>
        <EditorContent {...resumeData} />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
