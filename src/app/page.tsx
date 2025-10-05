'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { generateLatexCode } from '@/lib/latex/generator';
import { LatexPreview } from '@/components/preview/LatexPreview';
import { ExportButtons } from '@/components/preview/ExportButtons';
import { ResumeEditor } from '@/components/editor/ResumeEditor';
import { PdfPreview } from '@/components/template/PdfPreview';
import { useResumeData } from '@/hooks/useResumeData';

export default function Home() {
  const {
    data: currentData,
    isLoaded,
    updateData,
    resetToDefault,
    exportData,
    importData,
    clearData,
  } = useResumeData();

  // Generate LaTeX code when data changes
  const latexCode = useMemo(() => {
    return generateLatexCode(currentData);
  }, [currentData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/easy-resume.svg" alt="Easy Resume" width={32} height={32} />
              <div>
                <h1 className="text-xl font-bold">Easy Resume LaTeX</h1>
                <p className="text-sm text-muted-foreground">
                  Create professional LaTeX resumes
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Powered by</span>
              <a
                href="https://www.overleaf.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Overleaf
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Info Banner */}
        <div className="mb-6 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
          <h2 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
            Welcome to Easy Resume LaTeX! 🚀
          </h2>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Edit your resume information on the left, and the LaTeX code will be generated automatically.
            Click <strong>&quot;Open in Overleaf&quot;</strong> to compile your resume to PDF, or download the .tex file.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column - Editor */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900">
              <h2 className="mb-4 text-lg font-semibold">Edit Resume</h2>
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

          {/* Right Column - PDF Preview, LaTeX Preview & Export */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* PDF Preview */}
              <PdfPreview />

              {/* Export Buttons */}
              <ExportButtons latexCode={latexCode} resumeName={currentData.basics.name.replace(/\s+/g, '_')} />

              {/* LaTeX Code Preview */}
              <LatexPreview code={latexCode} />
            </div>
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

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>
            Built with Next.js, Tailwind CSS, and ❤️ |{' '}
            <a
              href="https://github.com/ChanMeng666/easy-resume"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
