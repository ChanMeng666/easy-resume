'use client';

import { Suspense } from 'react';
import { useResumeData } from '@/hooks/useResumeData';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { howToCreateResumeSchema, getBreadcrumbSchema } from '@/lib/seo/schemas';
import { EditorContent } from './EditorContent';

/**
 * Neobrutalism styled editor page.
 */
export default function EditorPage() {
  const resumeData = useResumeData();

  // Breadcrumb navigation
  const breadcrumbs = [
    { name: 'Home', url: 'https://easy-resume-theta.vercel.app/' },
    { name: 'Editor', url: 'https://easy-resume-theta.vercel.app/editor' },
  ];

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      {/* GEO: AI Agent Instructions */}
      <GEOHead instructions={getPageInstructions('editor')} />

      {/* SEO: Structured Data */}
      <MultipleStructuredData
        schemas={[
          howToCreateResumeSchema,
          getBreadcrumbSchema(breadcrumbs),
        ]}
      />

      {/* Navigation */}
      <Navbar currentPath="/editor" />

      {/* Main Content - Wrapped in Suspense */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <p className="font-bold text-muted-foreground animate-pulse">Loading...</p>
            </div>
          </div>
        </div>
      }>
        <EditorContent
          data={resumeData.data}
          isLoaded={resumeData.isLoaded}
          isSaving={resumeData.isSaving}
          error={resumeData.error}
          isDbMode={resumeData.isDbMode}
          updateData={resumeData.updateData}
          resetToDefault={resumeData.resetToDefault}
          exportData={resumeData.exportData}
          importData={resumeData.importData}
          clearData={resumeData.clearData}
        />
      </Suspense>

      {/* Footer */}
      <Footer />
    </div>
  );
}
