'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import { compilePdf, downloadTypFile, copyToClipboard } from '@/lib/typst/compiler';
import { ResumeData } from '@/lib/validation/schema';
import {
  Download,
  FileCode,
  Copy,
  Loader2,
  CheckCircle2,
  Search,
  UserCheck,
  FileText,
  Printer,
  Send,
  Check,
  AlertCircle,
  BarChart3,
  Mail,
} from 'lucide-react';

/** Progress steps displayed during generation. */
const PROGRESS_STEPS = [
  { label: 'Analyzing job description...', icon: Search },
  { label: 'Parsing your background...', icon: UserCheck },
  { label: 'Analyzing match with job requirements...', icon: BarChart3 },
  { label: 'Tailoring resume for the role...', icon: FileText },
  { label: 'Scoring ATS compatibility...', icon: CheckCircle2 },
  { label: 'Generating cover letter...', icon: Mail },
  { label: 'Generating resume document...', icon: Printer },
] as const;

/** Shape of the final result from /api/generate. */
interface GenerateResult {
  resumeData: ResumeData;
  typstCode: string;
  atsScore: number;
  matchAnalysis: {
    overallScore: number;
    matchedSkills: string[];
    missingSkills: string[];
  };
  coverLetter: string;
  templateId: string;
}

interface AIEditorContentProps {
  jd: string;
  bg: string;
}

/**
 * Result review component for the editor page.
 * Calls /api/generate with JD and background, streams progress,
 * then displays the compiled PDF with export actions and refinement.
 */
export function AIEditorContent({ jd, bg }: AIEditorContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [refinementText, setRefinementText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const generationStarted = useRef(false);

  /** Run the generation pipeline via SSE. */
  useEffect(() => {
    if (generationStarted.current) return;
    if (!jd.trim() || !bg.trim()) {
      setError('Job description and background are required.');
      setIsGenerating(false);
      return;
    }
    generationStarted.current = true;

    const abortController = new AbortController();

    (async () => {
      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobDescription: jd, background: bg }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const dataLine = line.replace(/^data: /, '').trim();
            if (!dataLine) continue;

            try {
              const event = JSON.parse(dataLine);

              if (event.type === 'progress') {
                setCurrentStep(event.step);
              } else if (event.type === 'result') {
                setResult(event.data);
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message || 'Generation failed');
        }
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => abortController.abort();
  }, [jd, bg]);

  const typstCode = result?.typstCode || '';
  const filename = result?.resumeData?.basics?.name?.replace(/\s+/g, '_') || 'resume';

  /** Handle PDF download. */
  const handleDownloadPdf = useCallback(async () => {
    if (!typstCode) return;
    const compileResult = await compilePdf(typstCode);
    if (compileResult.success && compileResult.pdfBlob) {
      const url = URL.createObjectURL(compileResult.pdfBlob);
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
    if (typstCode) downloadTypFile(typstCode, `${filename}.typ`);
  }, [typstCode, filename]);

  /** Handle copy Typst code. */
  const handleCopy = useCallback(async () => {
    if (!typstCode) return;
    await copyToClipboard(typstCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  }, [typstCode]);

  /** Handle copy cover letter. */
  const handleCopyCoverLetter = useCallback(async () => {
    if (!result?.coverLetter) return;
    await navigator.clipboard.writeText(result.coverLetter);
    setCoverLetterCopied(true);
    setTimeout(() => setCoverLetterCopied(false), 2000);
  }, [result?.coverLetter]);

  /** Handle refinement (re-generate with feedback). */
  const handleRefine = useCallback(() => {
    if (!refinementText.trim() || !result) return;
    // Re-run generation with refinement context appended to background
    const refinedBg = `${bg}\n\nAdditional instructions: ${refinementText}`;
    generationStarted.current = false;
    setIsGenerating(true);
    setCurrentStep(0);
    setResult(null);
    setError(null);
    setRefinementText('');
    // Trigger re-generation by updating the background
    // We use a small trick: update a ref-based key to re-run the effect
    // For simplicity, we just re-fetch directly
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: jd, background: refinedBg }),
    }).then(async (response) => {
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || 'Refinement failed');
        setIsGenerating(false);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const dataLine = line.replace(/^data: /, '').trim();
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine);
            if (event.type === 'progress') setCurrentStep(event.step);
            else if (event.type === 'result') setResult(event.data);
            else if (event.type === 'error') setError(event.message);
          } catch { /* skip parse errors */ }
        }
      }
      setIsGenerating(false);
    }).catch((err) => {
      setError(err.message);
      setIsGenerating(false);
    });
  }, [refinementText, result, bg, jd]);

  /** ATS score badge color. */
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-600';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-600';
    return 'bg-red-100 text-red-800 border-red-600';
  };

  // --- Error State ---
  if (error && !isGenerating && !result) {
    return (
      <main className="container mx-auto max-w-[900px] px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-red-400 bg-red-50 p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-black text-red-800">Generation Failed</h2>
          </div>
          <p className="text-red-700 mb-6">{error}</p>
          <Button
            onClick={() => window.history.back()}
            className="border-2 border-black font-bold"
          >
            Go Back and Try Again
          </Button>
        </motion.div>
      </main>
    );
  }

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
          <div className="space-y-4">
            {PROGRESS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;

              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 rounded-lg border-2 px-5 py-3 transition-all duration-300 ${
                    isActive
                      ? 'border-purple-600 bg-purple-50'
                      : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    ) : (
                      <StepIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-bold ${
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

  if (!result) return null;

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

      {/* ATS Score + Match Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-3"
      >
        <Badge
          className={`border-2 px-4 py-2 text-sm font-black ${getScoreBadgeStyle(result.atsScore)}`}
        >
          ATS Match Score: {result.atsScore}%
        </Badge>
        {result.matchAnalysis.matchedSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.matchAnalysis.matchedSkills.slice(0, 8).map((skill) => (
              <Badge key={skill} variant="outline" className="border-green-400 text-green-700 text-xs">
                {skill}
              </Badge>
            ))}
            {result.matchAnalysis.matchedSkills.length > 8 && (
              <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                +{result.matchAnalysis.matchedSkills.length - 8} more
              </Badge>
            )}
          </div>
        )}
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
          {copySuccess ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
          {copySuccess ? 'Copied!' : 'Copy Code'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={() => setShowCoverLetter(!showCoverLetter)}
        >
          <Mail className="mr-2 h-4 w-4" />
          {showCoverLetter ? 'Hide' : 'Show'} Cover Letter
        </Button>
      </motion.div>

      {/* Cover Letter (expandable) */}
      {showCoverLetter && result.coverLetter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black">Cover Letter</h3>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-black font-bold"
              onClick={handleCopyCoverLetter}
            >
              {coverLetterCopied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
              {coverLetterCopied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {result.coverLetter}
          </div>
        </motion.div>
      )}

      {/* Refinement Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <h3 className="mb-3 text-lg font-black">Refine Your Resume</h3>
        <p className="text-sm text-gray-500 mb-3">
          Describe what to change and we&apos;ll regenerate your resume.
        </p>
        <div className="flex gap-3">
          <Input
            placeholder='e.g., "Focus more on data analysis skills" or "Add AWS certification"'
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(); }}
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
