'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import { CropFrame } from '@/components/shared/CropFrame';
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
  CreditCard,
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

type ErrorKind = 'timeout' | 'server' | 'network' | 'credits' | 'auth' | 'other';

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
      code === 'INSUFFICIENT_CREDITS'
        ? 'credits'
        : code === 'UNAUTHENTICATED'
          ? 'auth'
          : 'server';
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
            const code: string | undefined = event.error?.code;
            const message: string = event.error?.message || event.message || 'Generation failed.';
            const kind: ErrorKind =
              code === 'INSUFFICIENT_CREDITS'
                ? 'credits'
                : code === 'UNAUTHENTICATED'
                  ? 'auth'
                  : event.error?.retriable
                    ? 'server'
                    : 'other';
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

  /** ATS score text tone. */
  const scoreTone = (score: number) =>
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  /** ATS score meter-bar fill. */
  const scoreBar = (score: number) =>
    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-400' : 'bg-red-500';
  /** Two-digit zero padding for typeset line/step numbers. */
  const pad2 = (n: number) => String(n).padStart(2, '0');

  // --- Error State ---
  if (error && !isGenerating && !result) {
    const headline = {
      timeout: 'Connection timed out',
      server: 'Server error',
      network: 'Network error',
      credits: 'Out of credits',
      auth: 'Sign in to continue',
      other: 'Generation failed',
    }[error.kind];
    const errCode = {
      timeout: 'ERR·TIMEOUT',
      server: 'ERR·5XX',
      network: 'ERR·NET',
      credits: 'ERR·402',
      auth: 'ERR·401',
      other: 'ERR·GEN',
    }[error.kind];

    return (
      <main className="container mx-auto max-w-2xl px-4 pt-12 md:pt-16 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
        >
          {/* Proof error header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-red-50 px-4 py-3">
            <span className="proof-label !text-red-700">compile.error</span>
            <span className="proof-label !text-red-700">{errCode}</span>
          </div>
          <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
            <h2 className="text-lg sm:text-xl font-black text-foreground">{headline}</h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground font-medium mb-4">{error.message}</p>
          {error.kind === 'credits' && (
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Each generation costs 1 credit. Top up to keep going.
            </p>
          )}
          {wasHiddenDuringGeneration && (
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 italic">
              Tip: switching tabs or locking your phone during generation can drop the
              connection. Keep this page in the foreground until it finishes.
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {error.kind === 'credits' ? (
              <Button
                onClick={() => (window.location.href = '/pricing')}
                size="lg"
                className="border-2 border-black font-bold gap-2 w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4" />
                Buy Credits
              </Button>
            ) : error.kind === 'auth' ? (
              <Button
                onClick={() =>
                  (window.location.href =
                    '/handler/sign-in?after_auth_return_to=/editor')
                }
                size="lg"
                className="border-2 border-black font-bold gap-2 w-full sm:w-auto"
              >
                <UserCheck className="h-4 w-4" />
                Sign in
              </Button>
            ) : (
              <Button
                onClick={handleRetry}
                size="lg"
                className="border-2 border-black font-bold gap-2 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            )}
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              size="lg"
              className="border-2 border-black font-bold w-full sm:w-auto"
            >
              Go back
            </Button>
          </div>
          </div>
        </motion.div>
      </main>
    );
  }

  // --- Progress State (typeset "compile log" galley) ---
  if (isGenerating) {
    const shownStep = Math.min(Math.max(currentStep, 1), PROGRESS_STEPS.length);
    return (
      <main className="container mx-auto max-w-2xl px-4 pt-12 md:pt-16 pb-16">
        <CropFrame>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]"
        >
          {/* Log header */}
          <div className="flex items-center justify-between border-b-2 border-black bg-gray-50 px-4 py-3">
            <span className="proof-label">compile.log — composing resume</span>
            <span className="proof-label !text-primary">STEP {pad2(shownStep)} / {pad2(PROGRESS_STEPS.length)}</span>
          </div>

          {/* Line-numbered galley */}
          <div className="px-2 sm:px-4 py-3 font-mono">
            {PROGRESS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;

              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className={`flex items-center gap-3 rounded-md px-2 sm:px-3 py-2 transition-colors duration-300 ${
                    isActive ? 'bg-primary/10' : ''
                  }`}
                >
                  <span className="w-6 flex-shrink-0 text-right text-xs text-gray-400 select-none">
                    {pad2(stepNum)}
                  </span>
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <StepIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <span
                    className={`text-xs sm:text-sm leading-snug ${
                      isActive
                        ? 'font-semibold text-foreground'
                        : isCompleted
                          ? 'text-muted-foreground'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Footer advisory */}
          <div className="border-t-2 border-black bg-gray-50 px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium">
              Keep this page open until generation completes — closing or backgrounding
              the tab on mobile can interrupt the stream.
            </p>
          </div>
        </motion.div>
        </CropFrame>
      </main>
    );
  }

  if (!result) return null;

  // --- Result State ---
  return (
    <main className="container mx-auto max-w-6xl px-4 pt-10 md:pt-14 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <p className="proof-label mb-2">§ Composed · {result.templateId}</p>
        <h1 className="font-brand text-2xl sm:text-3xl">Your resume is ready.</h1>
      </motion.div>

      <div className="vitex-grid">
        {/* Left (60%): PDF proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CropFrame className="rounded-xl border-2 border-black bg-white p-3 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
            <LivePdfPreview typstCode={typstCode} filename={filename} />
          </CropFrame>
        </motion.div>

        {/* Right (40%): score, skills, actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4 md:sticky md:top-24 md:self-start"
        >
          {/* ATS proof stamp */}
          <div className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
            <p className="proof-label mb-2">ATS Match Score</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono text-5xl font-bold ${scoreTone(result.atsScore)}`}>
                {pad2(result.atsScore)}
              </span>
              <span className="font-mono text-lg text-muted-foreground">/100</span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded border-2 border-black bg-gray-100">
              <div
                className={`h-full ${scoreBar(result.atsScore)}`}
                style={{ width: `${Math.max(0, Math.min(100, result.atsScore))}%` }}
              />
            </div>
          </div>

          {/* Matched skills */}
          {result.matchAnalysis.matchedSkills.length > 0 && (
            <div className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
              <p className="proof-label mb-3">Matched Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchAnalysis.matchedSkills.slice(0, 8).map((skill) => (
                  <span
                    key={skill}
                    className="rounded border-2 border-black bg-cyan-100 px-2 py-0.5 font-mono text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
                {result.matchAnalysis.matchedSkills.length > 8 && (
                  <span className="rounded border-2 border-dashed border-gray-300 px-2 py-0.5 font-mono text-xs text-gray-500">
                    +{result.matchAnalysis.matchedSkills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              size="lg"
              className="w-full border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={handleDownloadPdf}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                onClick={handleDownloadTyp}
              >
                <FileCode className="mr-2 h-4 w-4" />
                .typ
              </Button>

              <Button
                variant="outline"
                className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                onClick={handleCopy}
              >
                {copySuccess ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                {copySuccess ? 'Copied!' : 'Copy'}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
              onClick={() => setShowCoverLetter(!showCoverLetter)}
            >
              <Mail className="mr-2 h-4 w-4" />
              {showCoverLetter ? 'Hide' : 'Show'} Cover Letter
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Cover Letter (expandable) */}
      {showCoverLetter && result.coverLetter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
        >
          <p className="proof-label mb-1">§ cover-letter.pdf</p>
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
        <p className="proof-label mb-1">§ recompile</p>
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
