'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, Download, Copy, Upload } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useState } from 'react';
import { openInOverleaf, copyToClipboard, downloadTexFile } from '@/lib/overleaf/api';

interface TopToolbarProps {
  currentTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  latexCode: string;
  resumeName: string;
  lastSaved?: Date;
  isSaving?: boolean;
  onExportJSON: () => void;
  onImportJSON: (file: File) => Promise<void>;
}

/**
 * TopToolbar component
 * Main toolbar with template selector, save status, and export actions
 */
export function TopToolbar({
  currentTemplateId,
  onTemplateChange,
  latexCode,
  resumeName,
  lastSaved,
  isSaving,
  onExportJSON,
  onImportJSON,
}: TopToolbarProps) {
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleOpenInOverleaf = () => {
    try {
      openInOverleaf(latexCode, { engine: 'pdflatex' });
    } catch {
      alert('Failed to open in Overleaf. The content might be too large.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await copyToClipboard(latexCode);
      alert('LaTeX code copied to clipboard!');
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadTex = () => {
    try {
      downloadTexFile(latexCode, resumeName);
    } catch {
      alert('Failed to download file');
    }
  };

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await onImportJSON(file);
        } catch {
          alert('Failed to import file. Please check the file format.');
        }
      }
    };
    input.click();
  };

  return (
    <div className="sticky top-20 z-30 border-b bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Template Selector */}
          <div className="flex items-center gap-3">
            <div className="hidden w-48 md:block">
              <TemplateSelector
                currentTemplateId={currentTemplateId}
                onTemplateChange={onTemplateChange}
              />
            </div>
            <SaveStatusIndicator isSaving={isSaving} lastSaved={lastSaved} />
          </div>

          {/* Right: Primary CTA and Export Menu */}
          <div className="flex items-center gap-2">
            {/* Primary CTA - Open in Overleaf */}
            <Button
              onClick={handleOpenInOverleaf}
              size="lg"
              className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Open in Overleaf</span>
              <span className="sm:hidden">Overleaf</span>
            </Button>

            {/* Export Options Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {isExportMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsExportMenuOpen(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border bg-white shadow-lg dark:bg-gray-900">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          handleDownloadTex();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download .tex file</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopyCode();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy LaTeX code</span>
                      </button>

                      <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />

                      <button
                        onClick={() => {
                          onExportJSON();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export JSON backup</span>
                      </button>

                      <button
                        onClick={() => {
                          handleImportClick();
                          setIsExportMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Import JSON</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
