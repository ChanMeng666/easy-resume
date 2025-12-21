'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TopToolbar } from '@/components/editor/TopToolbar';
import { PreviewTabs } from '@/components/preview/PreviewTabs';
import { ResumeData } from '@/lib/validation/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit3, Zap } from 'lucide-react';
import { useEditorScrollDirection } from '@/lib/copilot/editor-context';
import { SectionSelector } from '@/components/copilot/SectionSelector';
import { EditSection } from '@/lib/copilot/sections';

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
  activeSection: EditSection;
  onSectionChange: (section: EditSection) => void;
}

/**
 * AI Editor content component with section-based editing.
 * Shows section selector for focused AI editing and live preview.
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
  activeSection,
  onSectionChange,
}: AIEditorContentProps) {
  // Track last saved time
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Get scroll direction from context (for flex layout scroll container)
  const scrollDirection = useEditorScrollDirection();

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
        navbarFixed={false}
        externalScrollDirection={scrollDirection}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-50"
          >
            <p className="text-red-800 font-bold">{error}</p>
          </motion.div>
        )}

        {/* Section Selector Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-sm">Select Section to Edit</span>
            <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
              Focused editing = faster AI responses
            </span>
          </div>
          <SectionSelector
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        </motion.div>

        {/* AI Mode Banner - Compact */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-3 rounded-xl bg-gradient-to-r from-purple-100 to-cyan-100"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <p className="font-bold text-sm">Chat with AI in sidebar →</p>
            </div>
            <div className="flex items-center gap-2">
              {isDbMode && (
                <Badge variant="accent" className="text-xs">
                  Auto-saving
                </Badge>
              )}
              <Button asChild variant="outline" size="sm" className="neo-button h-8">
                <Link href="/editor/manual">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Manual
                </Link>
              </Button>
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
              <div className="p-6 bg-white rounded-xl">
                <p className="font-bold text-muted-foreground animate-pulse">Loading preview...</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Instructions - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-xl bg-white p-5"
        >
          <h2 className="mb-3 text-base font-black">Quick Start</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {[
              { num: '1', text: 'Select a section above' },
              { num: '2', text: 'Chat with AI in sidebar' },
              { num: '3', text: 'Watch resume update live' },
              { num: '4', text: 'Export to Overleaf' },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-purple-600 text-xs font-black text-white">
                  {item.num}
                </span>
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
