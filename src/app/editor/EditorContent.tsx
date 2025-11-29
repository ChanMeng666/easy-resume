'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResumeEditor } from '@/components/editor/ResumeEditor';
import { TopToolbar } from '@/components/editor/TopToolbar';
import { PreviewTabs } from '@/components/preview/PreviewTabs';
import { WelcomeGuide } from '@/components/editor/WelcomeGuide';
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import { ResumeData } from '@/lib/validation/schema';

interface EditorContentProps {
  data: ResumeData;
  isLoaded: boolean;
  isSaving: boolean;
  error: string | null;
  isDbMode: boolean;
  updateData: (data: ResumeData) => void;
  resetToDefault: () => void;
  exportData: () => void;
  importData: (file: File) => Promise<void>;
  clearData: () => void;
}

export function EditorContent({
  data: currentData,
  isLoaded,
  isSaving,
  error,
  isDbMode,
  updateData,
  resetToDefault,
  exportData,
  importData,
  clearData,
}: EditorContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTemplateId = searchParams.get('template');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    urlTemplateId || DEFAULT_TEMPLATE_ID
  );

  // Update template when URL changes (browser back/forward navigation)
  useEffect(() => {
    if (urlTemplateId && urlTemplateId !== selectedTemplateId) {
      setSelectedTemplateId(urlTemplateId);
    }
  }, [urlTemplateId, selectedTemplateId]);

  // Handle template change: update both state and URL
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    // Update URL parameter to keep it in sync with the selected template
    const params = new URLSearchParams(searchParams.toString());
    params.set('template', templateId);
    router.replace(`/editor?${params.toString()}`, { scroll: false });
  };

  // Generate LaTeX code when data or template changes
  const latexCode = useMemo(() => {
    const template = getTemplateById(selectedTemplateId);
    if (!template) {
      console.warn(`Template ${selectedTemplateId} not found, using default`);
      const defaultTemplate = getTemplateById(DEFAULT_TEMPLATE_ID);
      return defaultTemplate?.generator(currentData) || '';
    }
    return template.generator(currentData);
  }, [currentData, selectedTemplateId]);

  // Track last saved time
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  useEffect(() => {
    setLastSaved(new Date());
  }, [currentData]);

  return (
    <>
      {/* Top Toolbar */}
      <TopToolbar
        currentTemplateId={selectedTemplateId}
        onTemplateChange={handleTemplateChange}
        latexCode={latexCode}
        resumeName={currentData.basics.name.replace(/\s+/g, '_')}
        lastSaved={lastSaved}
        isSaving={isSaving}
        onExportJSON={exportData}
        onImportJSON={importData}
      />

      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Welcome Guide for first-time users */}
        <WelcomeGuide />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Resume</h2>
                {isDbMode && (
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    Auto-saving to cloud
                  </span>
                )}
              </div>
              {isLoaded ? (
                <ResumeEditor
                  data={currentData}
                  onDataChange={updateData}
                  onReset={resetToDefault}
                  onExport={exportData}
                  onImport={importData}
                  onClear={clearData}
                />
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Preview Tabs */}
          <div className="lg:col-span-3">
            <PreviewTabs
              templateId={selectedTemplateId}
              latexCode={latexCode}
              filename={currentData.basics.name.replace(/\s+/g, '_')}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">How to Use</h2>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </span>
              <span>
                <strong>Edit directly in the browser:</strong> Use the visual editor on the left to update your resume information
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </span>
              <span>
                <strong>Real-time preview:</strong> See the generated LaTeX code update automatically on the right
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                3
              </span>
              <span>
                <strong>Open in Overleaf:</strong> Click the button to compile to PDF in Overleaf (free account required)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                4
              </span>
              <span>
                <strong>Backup your data:</strong> Export your resume as JSON to save or share it. Import JSON to restore previous data.
              </span>
            </li>
          </ol>
        </div>
      </main>
    </>
  );
}
