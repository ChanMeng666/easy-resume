'use client';

import { Suspense, useMemo, useState, useEffect, useRef, createContext, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CopilotSidebar } from '@copilotkit/react-ui';
import { useResumeData } from '@/hooks/useResumeData';
import { Navbar } from '@/components/shared/Navbar';
import { Footer } from '@/components/shared/Footer';
import { GEOHead } from '@/components/shared/GEOHead';
import { MultipleStructuredData } from '@/components/shared/StructuredData';
import { getPageInstructions } from '@/lib/seo/instructions';
import { howToCreateResumeSchema, getBreadcrumbSchema } from '@/lib/seo/schemas';
import { AIEditorContent } from './AIEditorContent';
import { RESUME_AI_INSTRUCTIONS, CHAT_LABELS } from '@/lib/copilot/instructions';
import { useResumeReadableContext, useResumeTools } from '@/lib/copilot/tools';
import { useResumeSuggestions } from '@/lib/copilot/suggestions';
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';

/**
 * Context for sharing scroll direction within the editor page.
 * This is needed because the scroll happens in a flex container, not the window.
 */
const ScrollDirectionContext = createContext<'up' | 'down' | null>(null);

export function useEditorScrollDirection() {
  return useContext(ScrollDirectionContext);
}

/**
 * AI-powered editor page with CopilotKit integration.
 * Primary entry point for resume creation using AI assistance.
 */
export default function AIEditorPage() {
  const resumeData = useResumeData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTemplateId = searchParams.get('template');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    urlTemplateId || DEFAULT_TEMPLATE_ID
  );

  // Update template when URL changes
  useEffect(() => {
    if (urlTemplateId && urlTemplateId !== selectedTemplateId) {
      setSelectedTemplateId(urlTemplateId);
    }
  }, [urlTemplateId, selectedTemplateId]);

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
    { name: 'Home', url: 'https://easy-resume-theta.vercel.app/' },
    { name: 'AI Editor', url: 'https://easy-resume-theta.vercel.app/editor' },
  ];

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  return (
    <ScrollDirectionContext.Provider value={scrollDirection}>
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

        {/* Left Content Area - Scrollable container with Navbar, Content, Footer */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto bg-[#f0f0f0]"
        >
          {/* Navigation - Sticky with scroll-hide behavior */}
          <Navbar currentPath="/editor" position="sticky" externalScrollDirection={scrollDirection} />

          {/* Main Content */}
          <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
              <div className="flex items-center justify-center py-20">
                <div className="p-6 bg-white rounded-xl">
                  <p className="font-bold text-muted-foreground animate-pulse">Loading AI Editor...</p>
                </div>
              </div>
            </div>
          }>
            <AIEditorWrapper
              resumeData={resumeData}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={handleTemplateChange}
              latexCode={latexCode}
            />
          </Suspense>

          {/* Footer - Inside scrollable area */}
          <Footer />
        </div>

        {/* Right Sidebar - CopilotKit */}
        <CopilotSidebarWrapper />
      </div>
    </ScrollDirectionContext.Provider>
  );
}

/**
 * Wrapper component that sets up CopilotKit hooks for the content area.
 * Separated to ensure hooks are called at the right level.
 */
function AIEditorWrapper({
  resumeData,
  selectedTemplateId,
  onTemplateChange,
  latexCode,
}: {
  resumeData: ReturnType<typeof useResumeData>;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  latexCode: string;
}) {
  // Register readable context for AI
  useResumeReadableContext(resumeData.data, selectedTemplateId);

  // Register tools for AI
  useResumeTools(
    resumeData.data,
    resumeData.updateData,
    selectedTemplateId,
    onTemplateChange
  );

  // Register chat suggestions for AI
  useResumeSuggestions(resumeData.data, selectedTemplateId);

  return (
    <AIEditorContent
      data={resumeData.data}
      isLoaded={resumeData.isLoaded}
      isSaving={resumeData.isSaving}
      error={resumeData.error}
      isDbMode={resumeData.isDbMode}
      updateData={resumeData.updateData}
      selectedTemplateId={selectedTemplateId}
      onTemplateChange={onTemplateChange}
      latexCode={latexCode}
      onExportJSON={resumeData.exportData}
      onImportJSON={resumeData.importData}
    />
  );
}

/**
 * Wrapper component for CopilotSidebar.
 * The sidebar doesn't need hooks since they're already registered in AIEditorWrapper.
 */
function CopilotSidebarWrapper() {
  return (
    <CopilotSidebar
      defaultOpen={true}
      instructions={RESUME_AI_INSTRUCTIONS}
      labels={CHAT_LABELS}
      className="copilot-neobrutalism"
    >
      {/* Empty content - actual content is in the left flex container */}
      <div />
    </CopilotSidebar>
  );
}
