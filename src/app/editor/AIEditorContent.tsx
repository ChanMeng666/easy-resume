'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import { resumeData as sampleResumeData } from '@/data/resume';
import { generateTypstCode } from '@/lib/typst/generator';
import { compilePdf, downloadTypFile, copyToClipboard } from '@/lib/typst/compiler';
import {
  Download,
  FileCode,
  Copy,
  Save,
  Loader2,
  CheckCircle2,
  Search,
  UserCheck,
  FileText,
  Printer,
  Send,
  Check,
} from 'lucide-react';

/** Progress steps shown during generation. */
const PROGRESS_STEPS = [
  { label: 'Analyzing job description...', icon: Search },
  { label: 'Matching your experience...', icon: UserCheck },
  { label: 'Generating tailored resume...', icon: FileText },
  { label: 'Compiling PDF...', icon: Printer },
] as const;

interface AIEditorContentProps {
  /** Job description from URL params. */
  jd: string;
  /** User background info from URL params. */
  bg: string;
}

/**
 * Result review component for the editor page.
 * Shows a progress state during generation, then displays the
 * compiled PDF with export actions and a refinement input.
 */
export function AIEditorContent({ jd, bg }: AIEditorContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [atsScore] = useState(85);
  const [refinementText, setRefinementText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate Typst code from sample data (MVP — AI integration in Phase 4)
  // jd and bg will be used for AI-powered generation in Phase 4
  const typstCode = useMemo(() => {
    // TODO: Use jd and bg to generate tailored resume via AI agent
    void jd;
    void bg;
    return generateTypstCode(sampleResumeData);
  }, [jd, bg]);

  const filename = sampleResumeData.basics.name.replace(/\s+/g, '_');

  /**
   * Simulate progress steps during initial generation.
   */
  useEffect(() => {
    if (!isGenerating) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    PROGRESS_STEPS.forEach((_, index) => {
      if (index === 0) return; // Start at step 0
      timers.push(
        setTimeout(() => {
          setCurrentStep(index);
        }, (index) * 1200)
      );
    });

    // Complete generation after all steps
    timers.push(
      setTimeout(() => {
        setIsGenerating(false);
      }, PROGRESS_STEPS.length * 1200)
    );

    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  /** Handle PDF download via compilation. */
  const handleDownloadPdf = useCallback(async () => {
    const result = await compilePdf(typstCode);
    if (result.success && result.pdfBlob) {
      const url = URL.createObjectURL(result.pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }
  }, [typstCode, filename]);

  /** Handle .typ file download. */
  const handleDownloadTyp = useCallback(() => {
    downloadTypFile(typstCode, `${filename}.typ`);
  }, [typstCode, filename]);

  /** Handle copy to clipboard. */
  const handleCopy = useCallback(async () => {
    await copyToClipboard(typstCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [typstCode]);

  /** Handle refinement submission (placeholder for Phase 4). */
  const handleRefine = useCallback(() => {
    if (!refinementText.trim()) return;
    // TODO: Phase 4 — call agent chat API for refinement
    setRefinementText('');
  }, [refinementText]);

  /** Determine ATS score badge color. */
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-600';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-600';
    return 'bg-red-100 text-red-800 border-red-600';
  };

  // --- Progress State ---
  if (isGenerating) {
    return (
      <main className="container mx-auto max-w-[900px] px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <h2 className="mb-8 text-center text-2xl font-black">
            Generating Your Resume
          </h2>

          <div className="space-y-5">
            {PROGRESS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className={`flex items-center gap-4 rounded-lg border-2 px-5 py-4 transition-all duration-300 ${
                    isActive
                      ? 'border-purple-600 bg-purple-50'
                      : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    ) : (
                      <StepIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-base font-bold ${
                      isActive
                        ? 'text-purple-800'
                        : isCompleted
                          ? 'text-green-700'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>
    );
  }

  // --- Result State ---
  return (
    <main className="container mx-auto max-w-[900px] px-4 py-8">
      {/* PDF Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <LivePdfPreview typstCode={typstCode} filename={filename} />
      </motion.div>

      {/* ATS Score Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 flex justify-center"
      >
        <Badge
          className={`border-2 px-4 py-2 text-sm font-black ${getScoreBadgeStyle(atsScore)}`}
        >
          ATS Match Score: {atsScore}%
        </Badge>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-3"
      >
        <Button
          size="lg"
          className="border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleDownloadPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleDownloadTyp}
        >
          <FileCode className="mr-2 h-4 w-4" />
          Download .typ
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleCopy}
        >
          {copySuccess ? (
            <Check className="mr-2 h-4 w-4 text-green-600" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {copySuccess ? 'Copied!' : 'Copy Code'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={() => {
            // TODO: Phase 4 — call POST /api/resumes
          }}
        >
          <Save className="mr-2 h-4 w-4" />
          Save to My Resumes
        </Button>
      </motion.div>

      {/* Refinement Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <h3 className="mb-3 text-lg font-black">Refine Your Resume</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Want changes? Describe what to adjust..."
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRefine();
            }}
            className="flex-1 border-2 border-black font-medium shadow-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200"
          />
          <Button
            onClick={handleRefine}
            disabled={!refinementText.trim()}
            className="border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          >
            <Send className="mr-2 h-4 w-4" />
            Refine
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
