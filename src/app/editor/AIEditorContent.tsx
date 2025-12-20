'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TopToolbar } from '@/components/editor/TopToolbar';
import { PreviewTabs } from '@/components/preview/PreviewTabs';
import { ResumeData } from '@/lib/validation/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit3, MessageSquare } from 'lucide-react';

interface AIEditorContentProps {
  data: ResumeData;
  isLoaded: boolean;
  isSaving: boolean;
  error: string | null;
  isDbMode: boolean;
  updateData: (data: ResumeData) => void;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  latexCode: string;
  onExportJSON: () => void;
  onImportJSON: (file: File) => Promise<void>;
}

/**
 * AI Editor content component with CopilotKit integration.
 * Shows live preview and relies on AI chat sidebar for editing.
 */
export function AIEditorContent({
  data: currentData,
  isLoaded,
  isSaving,
  error,
  isDbMode,
  selectedTemplateId,
  onTemplateChange,
  latexCode,
  onExportJSON,
  onImportJSON,
}: AIEditorContentProps) {
  // Track last saved time
  const [lastSaved, setLastSaved] = useState<Date>(new Date());

  useEffect(() => {
    setLastSaved(new Date());
  }, [currentData]);

  return (
    <div className="min-h-full">
      {/* Top Toolbar */}
      <TopToolbar
        currentTemplateId={selectedTemplateId}
        onTemplateChange={onTemplateChange}
        latexCode={latexCode}
        resumeName={currentData.basics.name.replace(/\s+/g, '_')}
        lastSaved={lastSaved}
        isSaving={isSaving}
        onExportJSON={onExportJSON}
        onImportJSON={onImportJSON}
      />

      <main className="container mx-auto px-4 py-8">
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

        {/* AI Mode Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-100 to-cyan-100 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-bold text-sm">AI-Powered Editor</p>
                <p className="text-xs text-muted-foreground">
                  Chat with AI in the sidebar to build your resume
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isDbMode && (
                <Badge variant="accent" className="text-xs">
                  Auto-saving to cloud
                </Badge>
              )}
              <Button asChild variant="outline" size="sm" className="neo-button">
                <Link href="/editor/manual">
                  <Edit3 className="w-4 h-4 mr-1" />
                  Manual Editor
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* AI Tips Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm mb-2">Try saying:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "I'm a software engineer looking for senior roles",
                  "Add my work experience at Google",
                  "Improve my professional summary",
                  "Switch to the Executive template",
                ].map((tip, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-xs bg-gray-100 rounded-lg border border-gray-200"
                  >
                    &ldquo;{tip}&rdquo;
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Preview Area - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoaded ? (
            <PreviewTabs
              templateId={selectedTemplateId}
              latexCode={latexCode}
              filename={currentData.basics.name.replace(/\s+/g, '_')}
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="p-6 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <p className="font-bold text-muted-foreground animate-pulse">Loading preview...</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] p-6"
        >
          <h2 className="mb-4 text-lg font-black">How to Use AI Editor</h2>
          <ol className="space-y-3 text-sm">
            {[
              { title: 'Chat with AI:', desc: 'Use the sidebar to tell AI about yourself and your target job' },
              { title: 'Watch it build:', desc: 'See your resume update in real-time as AI adds content' },
              { title: 'Refine with AI:', desc: 'Ask AI to improve specific sections or change templates' },
              { title: 'Export to Overleaf:', desc: 'Click the button to compile to PDF in Overleaf' },
            ].map((item, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-600 text-xs font-black text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]">
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
    </div>
  );
}
