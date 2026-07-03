'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import { CropFrame } from '@/components/shared/CropFrame';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { compilePdf, downloadTypFile, copyToClipboard } from '@/lib/typst/compiler';
import { generateTypstCode } from '@/lib/typst/generator';
import { getTemplateById } from '@/templates/registry';
import { ResumeData } from '@/lib/validation/schema';
import { StructuredEditor } from './StructuredEditor';
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
  BookmarkPlus,
  Pencil,
  History,
  X,
  Columns2,
  Wand2,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';

/**
 * Re-render the Typst source from edited resume data, using the same template
 * the generation chose. Mirrors the pipeline's render step so a free
 * structured edit produces the same layout — just without the LLM/billing.
 */
function renderTypstFromResume(data: ResumeData, templateId: string): string {
  const template = getTemplateById(templateId);
  return template ? template.generator(data) : generateTypstCode(data);
}

/** One version in a refine chain, from GET /api/resumes/[id]/versions. */
interface VersionItem {
  id: string;
  title: string;
  versionLabel?: string;
  version: number;
  atsScore?: number;
  isCurrent: boolean;
}

/** A version's comparable detail, from GET .../versions/compare. */
interface CompareDetail {
  id: string;
  title: string;
  versionLabel?: string;
  atsScore?: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
}

/** Progress steps displayed during a full generation (8-step pipeline). */
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

/**
 * Progress steps displayed during a targeted refinement (4-step refine core).
 * Labels track src/server/core/refine.ts's onProgress messages so the galley
 * matches what the backend actually reports.
 */
const REFINE_PROGRESS_STEPS = [
  { label: 'Applying your feedback...', icon: Wand2 },
  { label: 'Re-scoring ATS compatibility...', icon: CheckCircle2 },
  { label: 'Regenerating your document...', icon: FileText },
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
  jd?: string;
  bg?: string;
  /** When set, load this persisted generation instead of running a new one. */
  jobId?: string;
  /**
   * When set, the background came from a saved profile: the first generation
   * sends this id so the server reuses the parsed background and skips the
   * parse_background LLM step. Refine/Retry intentionally omit it (re-parse).
   */
  profileId?: string;
}

type ErrorKind = 'timeout' | 'server' | 'network' | 'credits' | 'auth' | 'other';

interface GenerationError {
  kind: ErrorKind;
  message: string;
}

interface StreamCallbacks {
  onProgress: (step: number) => void;
  onResult: (data: GenerateResult) => void;
  /** Fired once the generation is persisted, carrying its history job id. */
  onSaved?: (jobId: string) => void;
}

/**
 * Run the generation pipeline via SSE, parsing progress / result / error events.
 * Throws a typed error on timeout, network failure, or server-reported error.
 * Heartbeat events are silently consumed; they exist only to keep the stream alive.
 */
async function runGenerationStream(
  jd: string,
  bg: string,
  idempotencyKey: string,
  signal: AbortSignal,
  { onProgress, onResult, onSaved }: StreamCallbacks,
  profileId?: string,
  parentJobId?: string
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Stable per-intent key: a retry/reconnect of the same generation reuses
        // it so the server returns the original result instead of re-charging;
        // a refine uses a new key (a deliberate new charge).
        'Idempotency-Key': idempotencyKey,
      },
      // profileId (when present) lets the server reuse the saved parsed
      // background and skip the parse_background step. parentJobId links a refine
      // to the job it refines so the editor can show a version chain.
      body: JSON.stringify({
        jobDescription: jd,
        background: bg,
        ...(profileId ? { profileId } : {}),
        ...(parentJobId ? { parentJobId } : {}),
      }),
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
          else if (event.type === 'saved') onSaved?.(event.jobId);
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
          // 'heartbeat', 'saved', and 'done' events fall through silently.
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

/**
 * Run the targeted-refinement pipeline via SSE against /api/refine. A near-clone
 * of runGenerationStream with the same event taxonomy, timeout, and error
 * classification — it only posts a different body (the parent job id + feedback)
 * to a different endpoint. The refine scope is intentionally omitted: the server
 * infers it deterministically from the feedback text (inferRefineScope), so the
 * editor is a single natural-language box with no manual selector. Duplication of
 * the reader is intentional here; a later PR consolidates the two into one SSE hook.
 */
async function runRefineStream(
  refineOfJobId: string,
  feedback: string,
  idempotencyKey: string,
  signal: AbortSignal,
  { onProgress, onResult, onSaved }: StreamCallbacks
): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/refine', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Fresh per-refine key: a retry/reconnect of the same refine reuses it so
        // the server returns the stored result instead of producing a duplicate.
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ refineOfJobId, feedback }),
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
          message: 'Connection timed out — refinement may have been interrupted. Please retry.',
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
          else if (event.type === 'saved') onSaved?.(event.jobId);
          else if (event.type === 'error') {
            const code: string | undefined = event.error?.code;
            const message: string = event.error?.message || event.message || 'Refinement failed.';
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
          // 'heartbeat', 'saved', and 'done' events fall through silently.
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
export function AIEditorContent({ jd = '', bg = '', jobId, profileId }: AIEditorContentProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<GenerationError | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  // In job mode (re-opening a past generation), the original JD/background come
  // from the persisted job so Refine/Retry can re-run with the same inputs.
  const [jobInput, setJobInput] = useState<{ jd: string; bg: string } | null>(null);
  const effJd = jobInput?.jd ?? jd;
  const effBg = jobInput?.bg ?? bg;
  const [refinementText, setRefinementText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [coverLetterCopied, setCoverLetterCopied] = useState(false);
  const [coverLetterCodeCopied, setCoverLetterCodeCopied] = useState(false);
  // The persisted job id of the CURRENT result — set from the `jobId` prop (job
  // mode) or the SSE `saved` event. Used as a refine's parent and to load the
  // version strip.
  const [currentJobId, setCurrentJobId] = useState<string | null>(jobId ?? null);
  // Which step labels the progress galley shows: the 8-step full generation or
  // the 4-step targeted refine. Set before each run.
  const [progressMode, setProgressMode] = useState<'generate' | 'refine'>('generate');
  // Free, client-side structured field editing (no LLM, no charge).
  const [editMode, setEditMode] = useState(false);
  // Secondary "Advanced edit" disclosure — folds the two power-user edit
  // surfaces (structured field editor + conversational AI editor) so the
  // conversational Refine box stays the calm, primary edit surface.
  const [advancedEditOpen, setAdvancedEditOpen] = useState(false);
  // Collapsed "History (n)" disclosure for the version chain (Compare/rename live
  // inside it) — the chain is context, not a primary control.
  const [historyOpen, setHistoryOpen] = useState(false);
  // Which artifact the preview tab shows: the resume or the cover letter. Both
  // render through LivePdfPreview.
  const [previewTab, setPreviewTab] = useState<'resume' | 'cover_letter'>('resume');
  // Versions in the current refine chain (for the version strip).
  const [versions, setVersions] = useState<VersionItem[]>([]);
  // Inline rename of the current version's label.
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  // Persisting a free structured edit as a new version (no charge).
  const [savingVersion, setSavingVersion] = useState(false);
  // Read-only side-by-side compare of two versions.
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareAgainst, setCompareAgainst] = useState<string>('');
  const [compareData, setCompareData] = useState<{ a: CompareDetail; b: CompareDetail } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  // "Save as profile" — persist the background as a reusable candidate_profile.
  const [saveProfileOpen, setSaveProfileOpen] = useState(false);
  const [saveProfileLabel, setSaveProfileLabel] = useState('');
  const [saveProfileState, setSaveProfileState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  );
  const [wasHiddenDuringGeneration, setWasHiddenDuringGeneration] = useState(false);
  const generationStarted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef(true);
  // Stable idempotency key for the current generation intent. A retry of the
  // same intent reuses it (so a completed-but-lost run isn't re-charged); a new
  // run or a refine mints a fresh key.
  const idempotencyKeyRef = useRef<string | null>(null);

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

  /** Load the version chain for a job (best-effort; powers the version strip). */
  const fetchVersions = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/resumes/${id}/versions`);
      if (!res.ok) return;
      const data = await res.json();
      setVersions(Array.isArray(data.items) ? data.items : []);
    } catch {
      // Non-critical — the strip just stays hidden.
    }
  }, []);

  /**
   * Kick off a generation. By default mints a fresh idempotency key (a new
   * intent / a deliberate refine charge); pass `reuseKey` on Retry so a run that
   * actually completed server-side returns its stored result instead of charging
   * again.
   */
  const startGeneration = useCallback(
    (
      currentJd: string,
      currentBg: string,
      reuseKey = false,
      currentProfileId?: string,
      parentJobId?: string
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!reuseKey || !idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      const idempotencyKey = idempotencyKeyRef.current;

      setProgressMode('generate');
      setIsGenerating(true);
      setCurrentStep(0);
      setResult(null);
      setError(null);
      setWasHiddenDuringGeneration(false);

      runGenerationStream(
        currentJd,
        currentBg,
        idempotencyKey,
        controller.signal,
        {
          onProgress: setCurrentStep,
          onResult: (data) => setResult(data),
          onSaved: (savedJobId) => {
            // Deep-link the URL to the persisted job so a refresh restores the
            // result for free instead of failing with ERR·NO_INPUT.
            try {
              window.history.replaceState(null, '', `/editor?job=${savedJobId}`);
            } catch {
              // Ignore — non-critical URL sync.
            }
            // Track the new job id (the parent for a subsequent refine) and
            // refresh the version strip.
            setCurrentJobId(savedJobId);
            fetchVersions(savedJobId);
          },
        },
        currentProfileId,
        parentJobId
      )
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
    [fetchVersions]
  );

  /** Load a persisted generation (job mode) — free, no pipeline re-run. */
  const loadJob = useCallback(async (id: string) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${id}`);
      if (!res.ok) {
        const kind: ErrorKind = res.status === 401 ? 'auth' : res.status === 404 ? 'other' : 'server';
        const message =
          res.status === 404
            ? 'This resume could not be found. It may have been deleted.'
            : 'Could not load this resume. Please try again.';
        setError({ kind, message });
        return;
      }
      const job = await res.json();
      if (job.status !== 'succeeded' || !job.result) {
        setError({ kind: 'other', message: 'This resume is not available to view yet.' });
        return;
      }
      setResult(job.result as GenerateResult);
      if (job.input?.jobDescription || job.input?.background) {
        setJobInput({ jd: job.input.jobDescription ?? '', bg: job.input.background ?? '' });
      }
      // This IS the current job — track it as a refine parent and load its chain.
      setCurrentJobId(id);
      fetchVersions(id);
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setIsGenerating(false);
    }
  }, [fetchVersions]);

  /** On mount: load a past job (job mode) or run a fresh generation. */
  useEffect(() => {
    if (generationStarted.current) return;
    generationStarted.current = true;

    if (jobId) {
      loadJob(jobId);
      return;
    }
    if (!jd.trim() || !bg.trim()) {
      setError({
        kind: 'other',
        message: 'Job description and background are required.',
      });
      setIsGenerating(false);
      return;
    }
    // Only the first generation reuses the saved profile (skips parse_background).
    // Refine/Retry deliberately omit it so edits re-parse honestly.
    startGeneration(jd, bg, false, profileId);
    return () => abortRef.current?.abort();
  }, [jd, bg, jobId, profileId, loadJob, startGeneration]);

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

  /**
   * Run a targeted refinement against the current persisted job (FREE — no
   * credit). Unlike the old billable refine, this does NOT re-run the full
   * pipeline or append to the background: the refine core operates on the parent
   * job's stored artifacts server-side, revising only the in-scope artifact(s).
   * A fresh idempotency key is minted so the result is a NEW version in the
   * chain that does not overwrite the current one.
   */
  const startRefine = useCallback(
    (feedback: string) => {
      if (!currentJobId) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      idempotencyKeyRef.current = crypto.randomUUID();
      const idempotencyKey = idempotencyKeyRef.current;

      setProgressMode('refine');
      setIsGenerating(true);
      setCurrentStep(0);
      setResult(null);
      setError(null);
      setWasHiddenDuringGeneration(false);

      runRefineStream(currentJobId, feedback, idempotencyKey, controller.signal, {
        onProgress: setCurrentStep,
        onResult: (data) => setResult(data),
        onSaved: (savedJobId) => {
          try {
            window.history.replaceState(null, '', `/editor?job=${savedJobId}`);
          } catch {
            // Ignore — non-critical URL sync.
          }
          setCurrentJobId(savedJobId);
          fetchVersions(savedJobId);
        },
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
    [currentJobId, fetchVersions]
  );

  /** Kick off a free refine from the input box (guarded on a saved parent job). */
  const handleRefine = useCallback(() => {
    if (!refinementText.trim() || !result || !currentJobId) return;
    const feedback = refinementText;
    setRefinementText('');
    startRefine(feedback);
  }, [refinementText, result, currentJobId, startRefine]);

  /**
   * Apply free, client-side structured edits: re-render the Typst from the
   * edited resume data using the same template and refresh the result in place.
   * This NEVER calls the pipeline and NEVER charges — only the live PDF preview
   * and downloads update. ATS score / matched skills stay as last generated
   * (recomputing those needs the LLM, which is the billable Refine path).
   */
  const handleApplyEdit = useCallback(
    (next: ResumeData) => {
      if (!result) return;
      const newTypst = renderTypstFromResume(next, result.templateId);
      setResult({ ...result, resumeData: next, typstCode: newTypst });
      setEditMode(false);
    },
    [result]
  );

  /**
   * Persist a free structured edit as a NEW version (no charge). The server
   * re-renders the Typst and writes an uncharged generation_jobs row in the same
   * chain; we then deep-link to it so a refresh restores the saved version. This
   * is pure storage — NO LLM, NO credit (unlike the billable Refine).
   */
  const handleSaveAsVersion = useCallback(
    async (next: ResumeData) => {
      if (!result || !currentJobId) return;
      setSavingVersion(true);
      try {
        const res = await fetch(`/api/resumes/${currentJobId}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeData: next, templateId: result.templateId }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const { id: newId } = await res.json();
        setEditMode(false);
        try {
          window.history.replaceState(null, '', `/editor?job=${newId}`);
        } catch {
          // Ignore — non-critical URL sync.
        }
        await loadJob(newId);
      } catch (err) {
        console.error('Failed to save version:', err);
      } finally {
        setSavingVersion(false);
      }
    },
    [result, currentJobId, loadJob]
  );

  /** Persist a rename of the current version's label (owner-scoped PATCH). */
  const handleRenameVersion = useCallback(async () => {
    if (!currentJobId) return;
    const label = renameValue.trim();
    try {
      const res = await fetch(`/api/resumes/${currentJobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionLabel: label }),
      });
      if (!res.ok) throw new Error(`Rename failed (${res.status})`);
      setVersions((cur) =>
        cur.map((v) => (v.id === currentJobId ? { ...v, versionLabel: label || undefined } : v))
      );
      setRenaming(false);
    } catch (err) {
      console.error('Failed to rename version:', err);
    }
  }, [currentJobId, renameValue]);

  /** Open the compare dialog against another version (read-only, free). */
  const openCompare = useCallback(
    async (againstId: string) => {
      if (!currentJobId || !againstId) return;
      setCompareAgainst(againstId);
      setCompareOpen(true);
      setCompareLoading(true);
      setCompareData(null);
      try {
        const res = await fetch(
          `/api/resumes/${currentJobId}/versions/compare?against=${againstId}`
        );
        if (!res.ok) throw new Error(`Compare failed (${res.status})`);
        setCompareData(await res.json());
      } catch (err) {
        console.error('Failed to compare versions:', err);
      } finally {
        setCompareLoading(false);
      }
    },
    [currentJobId]
  );

  /**
   * Save the current background as a reusable profile. We POST the RAW
   * background (not the JD-tailored result) and let the server parse it once, so
   * the profile stays a clean, JD-agnostic source of truth. This is free — no
   * compiled PDF means no charge.
   */
  const handleSaveProfile = useCallback(async () => {
    if (!effBg.trim()) return;
    setSaveProfileState('saving');
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: saveProfileLabel.trim() || undefined,
          rawBackground: effBg,
        }),
      });
      if (!res.ok) {
        setSaveProfileState('error');
        return;
      }
      setSaveProfileState('saved');
      setTimeout(() => setSaveProfileOpen(false), 1200);
    } catch {
      setSaveProfileState('error');
    }
  }, [effBg, saveProfileLabel]);

  /** Open the save-as-profile dialog, defaulting the label to the parsed title. */
  const openSaveProfile = useCallback(() => {
    setSaveProfileLabel(result?.resumeData?.basics?.label ?? '');
    setSaveProfileState('idle');
    setSaveProfileOpen(true);
  }, [result]);

  /** Retry from the current error state with the original inputs. */
  const handleRetry = useCallback(() => {
    if (jobId) {
      loadJob(jobId);
      return;
    }
    // Reuse the same idempotency key: if the prior attempt actually completed
    // server-side (we just lost the stream), the retry returns that stored
    // result for free instead of charging a second time.
    startGeneration(effJd, effBg, true);
  }, [jobId, loadJob, effJd, effBg, startGeneration]);

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
    // The backend streams a 1-based step index/total per event; the active mode's
    // array determines the labels/icons and the total shown.
    const activeSteps = progressMode === 'refine' ? REFINE_PROGRESS_STEPS : PROGRESS_STEPS;
    const logTitle = progressMode === 'refine' ? 'refining resume' : 'composing resume';
    const shownStep = Math.min(Math.max(currentStep, 1), activeSteps.length);
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
            <span className="proof-label">compile.log — {logTitle}</span>
            <span className="proof-label !text-primary">STEP {pad2(shownStep)} / {pad2(activeSteps.length)}</span>
          </div>

          {/* Line-numbered galley */}
          <div className="px-2 sm:px-4 py-3 font-mono">
            {activeSteps.map((step, index) => {
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

      {/* History — the refine chain, collapsed into a small disclosure (free).
          Compare/rename live inside; the chain is context, not a primary control. */}
      {versions.length > 1 && (
        <div className="mb-6 rounded-xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              History ({versions.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-black p-3">
          {versions.map((v) => {
            const labelText = v.versionLabel || `v${v.version}`;
            const ats = typeof v.atsScore === 'number' ? ` · ATS ${v.atsScore}` : '';
            if (v.isCurrent) {
              // Current version: editable label (rename) — free, no re-render.
              if (renaming) {
                return (
                  <span key={v.id} className="inline-flex items-center gap-1">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameVersion();
                        if (e.key === 'Escape') setRenaming(false);
                      }}
                      maxLength={120}
                      placeholder={`v${v.version}`}
                      aria-label="Version name"
                      className="h-8 w-44 font-mono text-xs"
                      autoFocus
                    />
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={handleRenameVersion} aria-label="Save name">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setRenaming(false)} aria-label="Cancel rename">
                      <X className="h-4 w-4" />
                    </Button>
                  </span>
                );
              }
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setRenameValue(v.versionLabel ?? '');
                    setRenaming(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-primary px-2.5 py-1 font-mono text-xs font-bold text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]"
                  title="Rename this version"
                >
                  {labelText}
                  {ats} · current
                  <Pencil className="ml-1 h-3 w-3" />
                </button>
              );
            }
            return (
              <a
                key={v.id}
                href={`/editor?job=${v.id}`}
                className="rounded-lg border-2 border-black bg-white px-2.5 py-1 font-mono text-xs font-bold transition-all duration-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                title={v.title}
              >
                {labelText}
                {ats}
              </a>
            );
          })}
          {/* Compare the current version against the previous one (read-only). */}
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-8 gap-2"
            onClick={() => {
              const others = versions.filter((v) => !v.isCurrent);
              if (others.length > 0) openCompare(others[others.length - 1].id);
            }}
          >
            <Columns2 className="h-4 w-4" />
            Compare
          </Button>
          </div>
          )}
        </div>
      )}

      {/* Free structured-edit panel (no LLM, no charge). */}
      {editMode && (
        <div className="mb-6">
          <StructuredEditor
            resume={result.resumeData}
            onApply={handleApplyEdit}
            onCancel={() => setEditMode(false)}
            onSaveAsVersion={currentJobId ? handleSaveAsVersion : undefined}
            saving={savingVersion}
          />
        </div>
      )}

      {/* Version compare dialog (read-only, free). */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-brand inline-flex items-center gap-2">
              <Columns2 className="h-5 w-5" />
              Compare versions
            </DialogTitle>
            <DialogDescription>
              Side-by-side ATS score and skill coverage. Read-only — no credit used.
            </DialogDescription>
          </DialogHeader>

          {/* Pick which other version to compare the current one against. */}
          {versions.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="proof-label !text-muted-foreground">Against</label>
              <select
                value={compareAgainst}
                onChange={(e) => openCompare(e.target.value)}
                className="rounded-lg border-2 border-black bg-white px-2 py-1 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)] focus:outline-none"
              >
                {versions
                  .filter((v) => !v.isCurrent)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionLabel || `v${v.version}`}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {compareLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : compareData ? (
            <div className="grid grid-cols-2 gap-4">
              {[compareData.b, compareData.a].map((d, idx) => (
                <div
                  key={d.id}
                  className="rounded-xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
                >
                  <p className="proof-label !text-muted-foreground mb-1">
                    {idx === 1 ? 'Current' : 'Compared'}
                  </p>
                  <p className="font-mono text-xs font-bold truncate" title={d.title}>
                    {d.versionLabel || d.title}
                  </p>
                  <p className="mt-3 font-brand text-3xl">
                    {typeof d.atsScore === 'number' ? d.atsScore : '—'}
                    <span className="ml-1 text-xs text-muted-foreground">ATS</span>
                  </p>
                  <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-green-700">
                    Matched ({d.matchedSkills.length})
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    {d.matchedSkills.join(', ') || '—'}
                  </p>
                  <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-red-700">
                    Missing ({d.missingSkills.length})
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    {d.missingSkills.join(', ') || '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground font-medium">
              Could not load the comparison.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <div className="vitex-grid">
        {/* Left (60%): PDF proof — Resume | Cover letter tabs, both rendering
            through the same LivePdfPreview (replaces the old show/hide toggle). */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Tabs
            value={previewTab}
            onValueChange={(v) => setPreviewTab(v as 'resume' | 'cover_letter')}
          >
            <TabsList className="mb-1">
              <TabsTrigger value="resume">
                <FileText className="mr-2 h-4 w-4" />
                Resume
              </TabsTrigger>
              {result.coverLetter && (
                <TabsTrigger value="cover_letter">
                  <Mail className="mr-2 h-4 w-4" />
                  Cover letter
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="resume">
              <CropFrame className="rounded-xl border-2 border-black bg-white p-3 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
                <LivePdfPreview typstCode={typstCode} filename={filename} />
              </CropFrame>
            </TabsContent>

            {result.coverLetter && (
              <TabsContent value="cover_letter">
                <CropFrame className="rounded-xl border-2 border-black bg-white p-3 sm:p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)]">
                  {result.coverLetterTypst ? (
                    <LivePdfPreview
                      typstCode={result.coverLetterTypst}
                      filename={`${filename}_cover_letter`}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap rounded-lg border-2 border-gray-200 bg-gray-50 p-3 sm:p-4 text-sm leading-relaxed text-gray-700">
                      {result.coverLetter}
                    </div>
                  )}
                </CropFrame>
              </TabsContent>
            )}
          </Tabs>
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

          {/* Parsed-data confirmation — a quick at-a-glance check that the AI
              read the background correctly, nudging the free Edit fields path. */}
          {(() => {
            const r = result.resumeData;
            const skillCount = (r.skills ?? []).reduce(
              (n, s) => n + (s.keywords?.length ?? 0),
              0
            );
            const stats = [
              { label: 'Experience', value: (r.work ?? []).length },
              { label: 'Education', value: (r.education ?? []).length },
              { label: 'Projects', value: (r.projects ?? []).length },
              { label: 'Skills', value: skillCount },
            ];
            return (
              <div className="rounded-xl border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
                <p className="proof-label mb-3">Parsed from your background</p>
                <div className="grid grid-cols-2 gap-2">
                  {stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg border-2 border-black bg-gray-50 px-3 py-2"
                    >
                      <p className="font-mono text-2xl font-bold leading-none">{s.value}</p>
                      <p className="proof-label !text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground font-medium">
                  Something missing or off? Use{' '}
                  <span className="font-semibold text-foreground">Edit fields</span> below to fix
                  it — free, no credit.
                </p>
              </div>
            );
          })()}

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

            {/* Secondary exports — the resume .typ/code and every cover-letter
                export are consolidated into one Export menu so Download PDF stays
                the single primary action. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Resume</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleDownloadTyp}>
                  <FileCode className="mr-2 h-4 w-4" />
                  Download .typ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  {copySuccess ? (
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copySuccess ? 'Copied!' : 'Copy code'}
                </DropdownMenuItem>

                {result.coverLetter && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Cover letter</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={handleDownloadCoverLetterPdf}
                      disabled={!result.coverLetterTypst}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadCoverLetterTyp}
                      disabled={!result.coverLetterTypst}
                    >
                      <FileCode className="mr-2 h-4 w-4" />
                      Download .typ
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyCoverLetterCode}
                      disabled={!result.coverLetterTypst}
                    >
                      {coverLetterCodeCopied ? (
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {coverLetterCodeCopied ? 'Copied!' : 'Copy code'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyCoverLetter}>
                      {coverLetterCopied ? (
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {coverLetterCopied ? 'Copied!' : 'Copy text'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Advanced edit — a demoted, unobtrusive disclosure. The primary edit
                surface is the conversational Refine box below; these two power-user
                surfaces (manual field editor + conversational AI editor) live here
                so they stay available without competing for attention. Both are
                free — no LLM billing. */}
            <div className="rounded-lg border-2 border-black bg-white">
              <button
                type="button"
                onClick={() => setAdvancedEditOpen((v) => !v)}
                aria-expanded={advancedEditOpen}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Advanced edit
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${advancedEditOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {advancedEditOpen && (
                <div className="grid grid-cols-1 gap-2 border-t-2 border-black p-2">
                  {/* Free, client-side structured field editing — no LLM, no credit. */}
                  <Button
                    variant="outline"
                    className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                    onClick={() => setEditMode((v) => !v)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {editMode ? 'Hide field editor' : 'Edit fields'}
                    <span className="ml-2 rounded border border-black bg-green-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
                      Free
                    </span>
                  </Button>

                  {/* Conversational AI editing of THIS saved resume — free (no credit).
                      Available whenever the result is persisted (currentJobId set); the
                      assistant opens the SAVED resume, so it's guarded on an id only. */}
                  {currentJobId && (
                    <Button
                      variant="outline"
                      className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                      onClick={() => (window.location.href = `/resumes/${currentJobId}/assistant`)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Edit with AI
                      <span className="ml-2 rounded border border-black bg-green-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
                        Free
                      </span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Save the background for reuse across future job descriptions. */}
            {effBg.trim() && (
              <Button
                variant="outline"
                className="w-full border-2 border-black font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
                onClick={openSaveProfile}
              >
                <BookmarkPlus className="mr-2 h-4 w-4" />
                Save as profile
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Save-as-profile dialog — persists the raw background for reuse. */}
      <Dialog open={saveProfileOpen} onOpenChange={setSaveProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as profile</DialogTitle>
            <DialogDescription>
              Store this background so you can reuse it for future job
              descriptions without pasting it again. This is free.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="profile-label" className="proof-label !text-foreground">
              Profile name
            </label>
            <Input
              id="profile-label"
              placeholder="e.g., Senior Backend Engineer"
              value={saveProfileLabel}
              onChange={(e) => setSaveProfileLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProfile();
              }}
              className="border-2 border-black font-medium shadow-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200"
            />
            {saveProfileState === 'error' && (
              <p className="proof-label !text-red-700">Could not save — please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={saveProfileState === 'saving' || saveProfileState === 'saved' || !effBg.trim()}
              className="border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
            >
              {saveProfileState === 'saving' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : saveProfileState === 'saved' ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <BookmarkPlus className="mr-2 h-4 w-4" />
              )}
              {saveProfileState === 'saved' ? 'Saved!' : 'Save profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refinement Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 rounded-xl border-2 border-black bg-white p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]"
      >
        <p className="proof-label mb-1">§ recompile</p>
        <div className="mb-2 flex items-center gap-2 sm:mb-3">
          <h3 className="text-base sm:text-lg font-black">Refine Your Resume</h3>
          <span className="rounded border border-black bg-green-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
            Free
          </span>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 mb-3">
          Describe what to change and the AI revises just what you ask — the
          resume, the cover letter, or both — no credit, and your current version
          is kept (switch back from the version strip).
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Input
            placeholder='e.g., "Focus on data skills" or "make the cover letter warmer"'
            value={refinementText}
            onChange={(e) => setRefinementText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRefine(); }}
            disabled={!currentJobId}
            className="flex-1 border-2 border-black font-medium shadow-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] transition-all duration-200"
          />
          <Button
            onClick={handleRefine}
            disabled={!refinementText.trim() || !currentJobId}
            className="w-full sm:w-auto border-2 border-black bg-purple-600 font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)] hover:bg-purple-700 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200"
          >
            <Send className="mr-2 h-4 w-4" />
            Refine
          </Button>
        </div>
        {!currentJobId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Refinement will be available once this resume finishes saving.
          </p>
        )}
      </motion.div>
    </main>
  );
}
