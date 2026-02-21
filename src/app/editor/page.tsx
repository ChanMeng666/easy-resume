'use client';

import { Suspense, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useResumeData } from '@/hooks/useResumeData';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { howToCreateResumeSchema, getBreadcrumbSchema } from '@/lib/seo/schemas';
import { AIEditorContent } from './AIEditorContent';
import { AgentChatPanel } from '@/components/agent/AgentChatPanel';
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';

/**
 * AI-powered editor page with agent chat panel.
 * Uses Vercel AI SDK for chat-based resume editing.
 */
export default function AIEditorPage() {
  const resumeData = useResumeData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTemplateId = searchParams.get('template');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    urlTemplateId || DEFAULT_TEMPLATE_ID
  );

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('template', templateId);
    router.replace(`/editor?${params.toString()}`, { scroll: false });
  };

  // Generate LaTeX code
  const latexCode = useMemo(() => {
    const template = getTemplateById(selectedTemplateId);
    if (!template) {
      const defaultTemplate = getTemplateById(DEFAULT_TEMPLATE_ID);
      return defaultTemplate?.generator(resumeData.data) || '';
    }
    return template.generator(resumeData.data);
  }, [resumeData.data, selectedTemplateId]);

  // Breadcrumb navigation
  const breadcrumbs = [
    { name: 'Home', url: 'https://vitex.org.nz/' },
    { name: 'AI Editor', url: 'https://vitex.org.nz/editor' },
  ];

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  return (
    <div className="flex h-screen bg-[#f0f0f0]">
      {/* GEO: AI Agent Instructions */}
      <GEOHead instructions={getPageInstructions('editor')} />

      {/* SEO: Structured Data */}
      <MultipleStructuredData
        schemas={[
          howToCreateResumeSchema,
          getBreadcrumbSchema(breadcrumbs),
        ]}
      />

      {/* Left Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-[#f0f0f0]"
      >
        <Navbar currentPath="/editor" position="sticky" externalScrollDirection={scrollDirection} />

        <Suspense fallback={
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-20">
              <div className="p-6 bg-white rounded-xl">
                <p className="font-bold text-muted-foreground animate-pulse">Loading AI Editor...</p>
              </div>
            </div>
          </div>
        }>
          <AIEditorContent
            data={resumeData.data}
            isLoaded={resumeData.isLoaded}
            isSaving={resumeData.isSaving}
            error={resumeData.error}
            isDbMode={resumeData.isDbMode}
            updateData={resumeData.updateData}
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={handleTemplateChange}
            latexCode={latexCode}
            onExportJSON={resumeData.exportData}
            onImportJSON={resumeData.importData}
          />
        </Suspense>

        <Footer />
      </div>

      {/* Right Sidebar - Agent Chat Panel */}
      <AgentChatPanel
        resumeData={resumeData.data}
        templateId={selectedTemplateId}
        onResumeUpdate={resumeData.updateData}
      />
    </div>
  );
}
