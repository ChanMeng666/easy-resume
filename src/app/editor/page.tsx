'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
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
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';

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

      {/* Main Content with CopilotSidebar */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
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

      {/* Footer */}
      <Footer />
    </div>
  );
}

/**
 * Wrapper component that sets up CopilotKit hooks.
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

  return (
    <CopilotSidebar
      defaultOpen={true}
      instructions={RESUME_AI_INSTRUCTIONS}
      labels={CHAT_LABELS}
      className="copilot-neobrutalism"
    >
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
    </CopilotSidebar>
  );
}
