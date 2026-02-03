'use client';

import { Suspense, useMemo, useState, useRef } from 'react';
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
import { getSectionInstructions, CHAT_LABELS } from '@/lib/copilot/instructions';
import { useSectionReadableContext, useSectionTools } from '@/lib/copilot/section-tools';
import { EditSection, SectionContext } from '@/lib/copilot/sections';
import { ScrollDirectionContext } from '@/lib/copilot/editor-context';
import { getSectionSuggestions } from '@/lib/copilot/suggestions';
import { RobustSuggestions } from '@/components/copilot/RobustSuggestions';
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import { useElementScrollDirection } from '@/lib/hooks/useScrollDirection';

/**
 * AI-powered editor page with section-based editing.
 * Loads only relevant AI tools for the active section to minimize token usage.
 */
export default function AIEditorPage() {
  const resumeData = useResumeData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTemplateId = searchParams.get('template');

  // Active editing section (for focused AI tools)
  const [activeSection, setActiveSection] = useState<EditSection>('basics');

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

  // Get section-specific suggestions
  const sectionSuggestions = useMemo(
    () => getSectionSuggestions(activeSection),
    [activeSection]
  );

  // Get section-specific instructions
  const sectionInstructions = useMemo(
    () => getSectionInstructions(activeSection),
    [activeSection]
  );

  // Breadcrumb navigation
  const breadcrumbs = [
    { name: 'Home', url: 'https://vitex.org.nz/' },
    { name: 'AI Editor', url: 'https://vitex.org.nz/editor' },
  ];

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirection = useElementScrollDirection(scrollContainerRef);

  return (
    <SectionContext.Provider value={{ activeSection, setActiveSection }}>
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
              <AIEditorWrapper
                resumeData={resumeData}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={handleTemplateChange}
                latexCode={latexCode}
                activeSection={activeSection}
                onSectionChange={setActiveSection}
              />
            </Suspense>

            <Footer />
          </div>

          {/* Right Sidebar - CopilotKit with section-specific config */}
          <CopilotSidebar
            defaultOpen={true}
            instructions={sectionInstructions}
            labels={CHAT_LABELS}
            className="copilot-neobrutalism"
            suggestions={sectionSuggestions}
            RenderSuggestionsList={RobustSuggestions}
          >
            <div />
          </CopilotSidebar>
        </div>
      </ScrollDirectionContext.Provider>
    </SectionContext.Provider>
  );
}

/**
 * Wrapper component that sets up section-specific CopilotKit hooks.
 */
function AIEditorWrapper({
  resumeData,
  selectedTemplateId,
  onTemplateChange,
  latexCode,
  activeSection,
  onSectionChange,
}: {
  resumeData: ReturnType<typeof useResumeData>;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  latexCode: string;
  activeSection: EditSection;
  onSectionChange: (section: EditSection) => void;
}) {
  // Register section-specific readable context (compact)
  useSectionReadableContext(resumeData.data, activeSection, selectedTemplateId);

  // Register section-specific tools only
  useSectionTools(
    resumeData.data,
    resumeData.updateData,
    activeSection,
    onTemplateChange
  );

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
      activeSection={activeSection}
      onSectionChange={onSectionChange}
    />
  );
}
