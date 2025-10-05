'use client';

import { Suspense } from 'react';
import { useResumeData } from '@/hooks/useResumeData';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { EditorContent } from './EditorContent';

export default function EditorPage() {
  const resumeData = useResumeData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <Navbar currentPath="/editor" />

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
