'use client';

import { Suspense } from 'react';
import { useResumeData } from '@/hooks/useResumeData';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { howToCreateResumeSchema, getBreadcrumbSchema } from '@/lib/seo/schemas';
import { ManualEditorContent } from './ManualEditorContent';

/**
 * Manual editor page - Traditional form-based resume editing.
 * Users who prefer manual control over AI assistance can use this page.
 */
export default function ManualEditorPage() {
  const resumeData = useResumeData();

  // Breadcrumb navigation
  const breadcrumbs = [
    { name: 'Home', url: 'https://easy-resume-theta.vercel.app/' },
    { name: 'Editor', url: 'https://easy-resume-theta.vercel.app/editor' },
    { name: 'Manual Editor', url: 'https://easy-resume-theta.vercel.app/editor/manual' },
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
      <Navbar currentPath="/editor/manual" />

      {/* Main Content - Wrapped in Suspense */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="p-6 bg-white rounded-xl">
              <p className="font-bold text-muted-foreground animate-pulse">Loading...</p>
            </div>
          </div>
        </div>
      }>
        <ManualEditorContent
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
