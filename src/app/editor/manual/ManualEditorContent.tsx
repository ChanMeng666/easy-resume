'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ResumeEditor } from '@/components/editor/ResumeEditor';
import { TopToolbar } from '@/components/editor/TopToolbar';
import { PreviewTabs } from '@/components/preview/PreviewTabs';
import { WelcomeGuide } from '@/components/editor/WelcomeGuide';
import { getTemplateById, DEFAULT_TEMPLATE_ID } from '@/templates/registry';
import { ResumeData } from '@/lib/validation/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface ManualEditorContentProps {
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

/**
 * Manual editor content component - Traditional form-based editing.
 * Preserves the original editing experience for users who prefer manual control.
 */
export function ManualEditorContent({
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
}: ManualEditorContentProps) {
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
    router.replace(`/editor/manual?${params.toString()}`, { scroll: false });
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
        {/* AI Editor Promo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-100 to-cyan-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-bold text-sm">Try our new AI Editor!</p>
                <p className="text-xs text-muted-foreground">Create your resume faster with AI assistance</p>
              </div>
            </div>
            <Button asChild size="sm" className="neo-button">
              <Link href="/editor">
                <Sparkles className="w-4 h-4 mr-1" />
                Switch to AI
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
          >
            <p className="text-red-800 font-bold">{error}</p>
          </motion.div>
        )}

        {/* Welcome Guide for first-time users */}
        <WelcomeGuide />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column - Editor */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-black">Edit Resume</h2>
                {isDbMode && (
                  <Badge variant="accent" className="text-xs">
                    Auto-saving to cloud
                  </Badge>
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
                  <p className="text-muted-foreground font-medium animate-pulse">Loading...</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Column - Preview Tabs */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <PreviewTabs
              templateId={selectedTemplateId}
              latexCode={latexCode}
              filename={currentData.basics.name.replace(/\s+/g, '_')}
            />
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6"
        >
          <h2 className="mb-4 text-lg font-black">How to Use</h2>
          <ol className="space-y-3 text-sm">
            {[
              { title: 'Edit directly in the browser:', desc: 'Use the visual editor on the left to update your resume information' },
              { title: 'Real-time preview:', desc: 'See the generated LaTeX code update automatically on the right' },
              { title: 'Open in Overleaf:', desc: 'Click the button to compile to PDF in Overleaf (free account required)' },
              { title: 'Backup your data:', desc: 'Export your resume as JSON to save or share it. Import JSON to restore previous data.' },
            ].map((item, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
                  {idx + 1}
                </span>
                <span className="font-medium">
                  <strong>{item.title}</strong> {item.desc}
                </span>
              </li>
            ))}
          </ol>
        </motion.div>
      </main>
    </>
  );
}
