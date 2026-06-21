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
  RefreshCw,
} from 'lucide-react';

/** Progress steps displayed during generation. */
const PROGRESS_STEPS = [
  { label: 'Analyzing job description...', icon: Search },
  { label: 'Parsing your background...', icon: UserCheck },
  { label: 'Analyzing match with job requirements...', icon: BarChart3 },
  { label: 'Tailoring resume for the role...', icon: FileText },
  { label: 'Scoring ATS compatibility...', icon: CheckCircle2 },
  { label: 'Generating cover letter...', icon: Mail },
  { label: 'Generating resume document...', icon: FileText },
  { label: 'Compiling your PDF...', icon: Printer },
] as const;

/** Read timeout for SSE — heartbeat is 15s server-side, so 45s is 3x slack. */
const SSE_READ_TIMEOUT_MS = 45_000;

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
  coverLetterTypst: string;
  templateId: string;
}

interface AIEditorContentProps {
  jd: string;
  bg: string;
}

type ErrorKind = 'timeout' | 'server' | 'network' | 'other';

interface GenerationError {
  kind: ErrorKind;
  message: string;
}

interface StreamCallbacks {
  onProgress: (step: number) => void;
  onResult: (data: GenerateResult) => void;
}

/**
 * Run the generation pipeline via SSE, parsing progress / result / error events.
 * Throws a typed error on timeout, network failure, or server-reported error.
 * Heartbeat events are silently consumed; they exist only to keep the stream alive.
 */
async function runGenerationStream(
  jd: string,
  bg: string,
  signal: AbortSignal,
  { onProgress, onResult }: StreamCallbacks
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: jd, background: bg }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    const e: GenerationError = {
      kind: 'network',
      message: 'Network error — please check your connection and try again.',
    };
    throw Object.assign(new Error(e.message), e);
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    // Server returns a machine-readable envelope { error: { code, message } }.
    const envelope = errData.error ?? {};
    const code: string | undefined = envelope.code;
    const message: string =
      envelope.message ||
      (typeof errData.error === 'string' ? errData.error : '') ||
      `Server error (${response.status})`;
    const kind: ErrorKind =
      code === 'INSUFFICIENT_CREDITS' || code === 'UNAUTHENTICATED' ? 'other' : 'server';
    throw Object.assign(new Error(message), { kind, message });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const e: GenerationError = { kind: 'other', message: 'No response body received.' };
    throw Object.assign(new Error(e.message), e);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  /** Race reader.read() against a timeout so a dropped TCP connection surfaces fast. */
  function readWithTimeout(): Promise<ReadableStreamReadResult<Uint8Array>> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        const e: GenerationError = {
          kind: 'timeout',
          message: 'Connection timed out — generation may have been interrupted. Please retry.',
        };
        reject(Object.assign(new Error(e.message), e));
      }, SSE_READ_TIMEOUT_MS);
      reader!
        .read()
        .then((res) => {
          clearTimeout(t);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(t);
          reject(err);
        });
    });
  }

  try {
    while (true) {
      const { done, value } = await readWithTimeout();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const dataLine = line.replace(/^data: /, '').trim();
        if (!dataLine) continue;
        try {
          const event = JSON.parse(dataLine);
          if (event.type === 'progress') onProgress(event.step);
          else if (event.type === 'result') onResult(event.data);
          else if (event.type === 'error') {
            // Prefer the structured envelope; fall back to the flat message.
            const message: string = event.error?.message || event.message || 'Generation failed.';
            const kind: ErrorKind = event.error?.retriable ? 'server' : 'other';
            throw Object.assign(new Error(message), { kind, message });
          }
          // 'heartbeat' and 'done' events fall through silently.
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue;
          throw parseErr;
        }
      }
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // Ignore — reader may already be released.
    }
  }
}

/** Pull the (kind, message) tuple out of an unknown thrown value. */
function classifyError(err: unknown): GenerationError {
  if (err && typeof err === 'object' && 'kind' in err && 'message' in err) {
    const e = err as Partial<GenerationError>;
    if (e.kind && e.message) return { kind: e.kind, message: e.message };
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return { kind: 'other', message: 'Request was aborted.' };
  }
  return { kind: 'other', message: (err as Error)?.message || 'Generation failed.' };
}

/**
 * Result review component for the editor page.
 * Calls /api/generate with JD and background, streams progress,
 * then displays the compiled PDF with export actions and refinement.
 */
export function AIEditorContent({ jd, bg }: AIEditorContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<GenerationError | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [refinementText, setRefinementText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);
  const [coverLetterCodeCopied, setCoverLetterCodeCopied] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [wasHiddenDuringGeneration, setWasHiddenDuringGeneration] = useState(false);
  const generationStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(true);

  // Keep a ref in sync so the visibilitychange handler can read the current
  // generation state without re-binding on every state change.
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  /**
   * Track whether the tab was hidden mid-generation so we can warn the user
   * that mobile browsers may have killed the SSE stream while away.
   */
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden' && isGeneratingRef.current) {
        setWasHiddenDuringGeneration(true);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /** Kick off a fresh generation (used both for initial run and Retry). */
  const startGeneration = useCallback(
    (currentJd: string, currentBg: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsGenerating(true);
      setCurrentStep(0);
      setResult(null);
      setError(null);
      setWasHiddenDuringGeneration(false);

      runGenerationStream(currentJd, currentBg, controller.signal, {
        onProgress: setCurrentStep,
        onResult: (data) => setResult(data),
      })
        .catch((err) => {
          if ((err as Error)?.name === 'AbortError') return;
          setError(classifyError(err));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsGenerating(false);
          }
        });
    },
    []
  );

  /** Run the generation pipeline once on mount. */
  useEffect(() => {
    if (generationStarted.current) return;
    if (!jd.trim() || !bg.trim()) {
      setError({
        kind: 'other',
        message: 'Job description and background are required.',
      });
      setIsGenerating(false);
      return;
    }
    generationStarted.current = true;
    startGeneration(jd, bg);
    return () => abortRef.current?.abort();
  }, [jd, bg, startGeneration]);

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

  /** Handle cover letter PDF download. */
  const handleDownloadCoverLetterPdf = useCallback(async () => {
    if (!result?.coverLetterTypst) return;
    const compileResult = await compilePdf(result.coverLetterTypst);
    if (compileResult.success && compileResult.pdfBlob) {
      const url = URL.createObjectURL(compileResult.pdfBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename}_cover_letter.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }
  }, [result?.coverLetterTypst, filename]);

  /** Handle cover letter .typ download. */
  const handleDownloadCoverLetterTyp = useCallback(() => {
    if (result?.coverLetterTypst) {
      downloadTypFile(result.coverLetterTypst, `${filename}_cover_letter.typ`);
    }
  }, [result?.coverLetterTypst, filename]);

  /** Handle copy cover letter Typst code. */
  const handleCopyCoverLetterCode = useCallback(async () => {
    if (!result?.coverLetterTypst) return;
    await copyToClipboard(result.coverLetterTypst);
    setCoverLetterCodeCopied(true);
    setTimeout(() => setCoverLetterCodeCopied(false), 2000);
  }, [result?.coverLetterTypst]);

  /** Re-run generation with refinement text appended to the background. */
  const handleRefine = useCallback(() => {
    if (!refinementText.trim() || !result) return;
    const refinedBg = `${bg}\n\nAdditional instructions: ${refinementText}`;
    setRefinementText('');
    startGeneration(jd, refinedBg);
  }, [refinementText, result, bg, jd, startGeneration]);

  /** Retry from the current error state with the original inputs. */
  const handleRetry = useCallback(() => {
    startGeneration(jd, bg);
  }, [jd, bg, startGeneration]);

  /** ATS score badge color. */
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-600';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-600';
    return 'bg-red-100 text-red-800 border-red-600';
  };

  // --- Error State ---
  if (error && !isGenerating && !result) {
    const headline = {
      timeout: 'Connection timed out',
      server: 'Server error',
      network: 'Network error',
      other: 'Generation failed',
    }[error.kind];

    return (
      <main className="container mx-auto max-w-[900px] px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-red-400 bg-red-50 p-6 sm:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
            <h2 className="text-lg sm:text-xl font-black text-red-800">{headline}</h2>
          </div>
          <p className="text-sm sm:text-base text-red-700 mb-4">{error.message}</p>
          {wasHiddenDuringGeneration && (
            <p className="text-xs sm:text-sm text-red-700 mb-4 italic">
              Tip: switching tabs or locking your phone during generation can drop the
              connection. Keep this page in the foreground until it finishes.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={handleRetry}
              size="lg"
              className="border-2 border-black font-bold gap-2 w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              size="lg"
              className="border-2 border-black font-bold w-full sm:w-auto"
            >
              Go back
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  // --- Progress State ---
  if (isGenerating) {
    return (
      <main className="container mx-auto max-w-[900px] px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-black bg-white p-4 sm:p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <h2 className="mb-6 sm:mb-8 text-center text-xl sm:text-2xl font-black">
            Generating Your Resume
          </h2>
          <div className="space-y-3 sm:space-y-4">
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
                  className={`flex items-center gap-3 sm:gap-4 rounded-lg border-2 px-3 sm:px-5 py-2 sm:py-3 transition-all duration-300 ${
                    isActive
                      ? 'border-purple-600 bg-purple-50'
                      : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg border-2 border-black bg-white">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-600" />
                    ) : (
                      <StepIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    )}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-bold leading-snug ${
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
          <p className="mt-6 text-center text-xs text-muted-foreground font-medium px-2">
            Keep this page open until generation completes — closing or backgrounding
            the tab on mobile can interrupt the stream.
          </p>
        </motion.div>
      </main>
    );
  }

  if (!result) return null;

  // --- Result State ---
  return (
    <main className="container mx-auto max-w-[900px] px-4 py-6 sm:py-8">
      {/* PDF Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-black bg-white p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <LivePdfPreview typstCode={typstCode} filename={filename} />
      </motion.div>

      {/* ATS Score + Match Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      >
        <Badge
          className={`border-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black ${getScoreBadgeStyle(result.atsScore)}`}
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
        className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3"
      >
        <Button
          size="lg"
          className="w-full sm:w-auto border-2 border-black bg-purple-600 font-bold text-white text-sm sm:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleDownloadPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto border-2 border-black font-bold text-sm sm:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleDownloadTyp}
        >
          <FileCode className="mr-2 h-4 w-4" />
          Download .typ
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto border-2 border-black font-bold text-sm sm:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          onClick={handleCopy}
        >
          {copySuccess ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
          {copySuccess ? 'Copied!' : 'Copy Code'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full sm:w-auto border-2 border-black font-bold text-sm sm:text-base shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
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
          className="mt-4 rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <h3 className="mb-3 sm:mb-4 text-base sm:text-lg font-black">Cover Letter</h3>

          {/* PDF preview */}
          {result.coverLetterTypst && (
            <div className="mb-4">
              <LivePdfPreview
                typstCode={result.coverLetterTypst}
                filename={`${filename}_cover_letter`}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <Button
              size="sm"
              className="w-full sm:w-auto border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={handleDownloadCoverLetterPdf}
              disabled={!result.coverLetterTypst}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Download PDF
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={handleDownloadCoverLetterTyp}
              disabled={!result.coverLetterTypst}
            >
              <FileCode className="mr-2 h-3.5 w-3.5" />
              Download .typ
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={handleCopyCoverLetterCode}
              disabled={!result.coverLetterTypst}
            >
              {coverLetterCodeCopied ? <Check className="mr-2 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {coverLetterCodeCopied ? 'Copied!' : 'Copy Code'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={handleCopyCoverLetter}
            >
              {coverLetterCopied ? <Check className="mr-2 h-3.5 w-3.5 text-green-600" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
              {coverLetterCopied ? 'Copied!' : 'Copy Text'}
            </Button>
          </div>

          {/* Plain text preview */}
          <div className="whitespace-pre-wrap rounded-lg border-2 border-gray-200 bg-gray-50 p-3 sm:p-4 text-sm leading-relaxed text-gray-700">
            {result.coverLetter}
          </div>
        </motion.div>
      )}

      {/* Refinement Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <h3 className="mb-2 sm:mb-3 text-base sm:text-lg font-black">Refine Your Resume</h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-3">
          Describe what to change and we&apos;ll regenerate your resume.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            placeholder='e.g., "Focus more on data analysis skills"'
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(); }}
            className="flex-1 border-2 border-black font-medium shadow-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200"
          />
          <Button
            onClick={handleRefine}
            disabled={!refinementText.trim()}
            className="w-full sm:w-auto border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          >
            <Send className="mr-2 h-4 w-4" />
            Refine
          </Button>
        </div>
      </motion.div>
    </main>
  );
}
