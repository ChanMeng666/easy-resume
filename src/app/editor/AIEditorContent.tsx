'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/shared/FadeIn';
import { LivePdfPreview } from '@/components/preview/LivePdfPreview';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
import { getTemplateById, renderTemplate } from '@/templates/registry';
import { DEFAULT_TOKENS, type DesignTokens } from '@/lib/design/tokens';
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
function renderTypstFromResume(
  data: ResumeData,
  templateId: string,
  tokens: DesignTokens = DEFAULT_TOKENS
): string {
  const template = getTemplateById(templateId);
  return template ? renderTemplate(template, data, tokens) : generateTypstCode(data, tokens);
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
  /** The design tokens the resume was rendered with (palette + density). Optional
   * for backward compatibility with pre-tokens results (falls back to DEFAULT_TOKENS). */
  tokens?: DesignTokens;
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
  /**
   * The full machine-readable error envelope from the server (code, step,
   * retriable, requestId, and the unwound `details.cause` chain — i.e. the real
   * underlying failure). Surfaced verbatim in the error UI so it can be copied
   * one-click for debugging. Absent for purely client-side errors (timeout,
   * network) that never reached the server.
   */
  debug?: unknown;
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
    throw Object.assign(new Error(message), { kind, message, debug: envelope });
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
            throw Object.assign(new Error(message), { kind, message, debug: event.error });
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

/** Pull the (kind, message, debug) tuple out of an unknown thrown value. */
function classifyError(err: unknown): GenerationError {
  if (err && typeof err === 'object' && 'kind' in err && 'message' in err) {
    const e = err as Partial<GenerationError>;
    if (e.kind && e.message) return { kind: e.kind, message: e.message, debug: e.debug };
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
  // One-click copy of the full error/debug envelope from the error state.
  const [debugCopied, setDebugCopied] = useState(false);
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
  // True when the visible result has local field edits (Edit fields → Apply)
  // that are NOT yet persisted to the `currentJobId` row. The conversational
  // "Edit with AI" assistant opens the PERSISTED resume, so it must persist these
  // edits first (persist-before-navigate) or they'd be silently dropped.
  const [editsDirty, setEditsDirty] = useState(false);
  // Non-blocking error surfaced in the Advanced-edit disclosure (e.g. a
  // persist-before-navigate save failed) so we can stay on the page.
  const [advancedEditError, setAdvancedEditError] = useState<string | null>(null);
  // The version chain and the two power-user edit surfaces (structured field
  // editor + conversational AI editor) live inside a bottom Accordion; the
  // Accordion manages its own open/close state.
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
  // Optional writing sample so future cover letters match the user's voice.
  const [saveProfileVoice, setSaveProfileVoice] = useState('');
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
      setEditsDirty(false);

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
      setEditsDirty(false); // a freshly loaded persisted job has no local edits
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
      setEditsDirty(false);

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
      const newTypst = renderTypstFromResume(next, result.templateId, result.tokens ?? DEFAULT_TOKENS);
      setResult({ ...result, resumeData: next, typstCode: newTypst });
      setEditMode(false);
      // Local edit applied in-memory only — it now diverges from the persisted
      // currentJobId row until Save as version / Edit with AI persists it.
      setEditsDirty(true);
    },
    [result]
  );

  /**
   * Persist the given resume data as a NEW version (no charge) and return the new
   * job id. The server re-renders the Typst and writes an uncharged
   * generation_jobs row in the same chain. Pure storage — NO LLM, NO credit.
   * Throws on failure so callers can decide whether to navigate or stay.
   */
  const persistVersion = useCallback(
    async (next: ResumeData): Promise<string> => {
      if (!result || !currentJobId) throw new Error('No result to persist');
      const res = await fetch(`/api/resumes/${currentJobId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: next, templateId: result.templateId }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const { id: newId } = await res.json();
      return newId as string;
    },
    [result, currentJobId]
  );

  /**
   * Save a free structured edit as a NEW version and re-open it in place (deep-
   * linked so a refresh restores it). This is the explicit "Save as version"
   * action from the field editor.
   */
  const handleSaveAsVersion = useCallback(
    async (next: ResumeData) => {
      if (!result || !currentJobId) return;
      setSavingVersion(true);
      try {
        const newId = await persistVersion(next);
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
    [result, currentJobId, loadJob, persistVersion]
  );

  /**
   * Open the conversational "Edit with AI" assistant on THIS resume. The
   * assistant loads the PERSISTED resume, so any unsaved local field edits must
   * be persisted first (persist-before-navigate) — otherwise they'd be silently
   * dropped. On a persist failure we stay on the page and surface the error; we
   * only navigate once a durable job id exists.
   */
  const handleEditWithAI = useCallback(async () => {
    if (!currentJobId || !result) return;
    setAdvancedEditError(null);

    // No unsaved edits — the persisted resume already matches; navigate directly.
    if (!editsDirty) {
      window.location.href = `/resumes/${currentJobId}/assistant`;
      return;
    }

    setSavingVersion(true);
    try {
      const newId = await persistVersion(result.resumeData);
      window.location.href = `/resumes/${newId}/assistant`;
    } catch (err) {
      console.error('Failed to persist edits before Edit with AI:', err);
      setAdvancedEditError('Could not save your edits. Please try again before editing with AI.');
      setSavingVersion(false);
    }
  }, [currentJobId, result, editsDirty, persistVersion]);

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
          voiceSample: saveProfileVoice.trim() || undefined,
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
  }, [effBg, saveProfileLabel, saveProfileVoice]);

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

  /** ATS score → Phantom Badge variant (tonal tier label). */
  const scoreBadge = (score: number): 'success' | 'warning' | 'destructive' =>
    score >= 80 ? 'success' : score >= 60 ? 'warning' : 'destructive';
  /** ATS score → short tier label shown in the badge. */
  const scoreLabel = (score: number) =>
    score >= 80 ? 'Strong match' : score >= 60 ? 'Good match' : 'Needs work';

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

    // Full, copyable diagnostic payload. Built here (client-only render path) so
    // navigator/timestamp never run during SSR. The `error.debug` envelope
    // carries the server's real failure reason (code, step, requestId, and the
    // unwound cause chain) — the useful part for debugging.
    const debugPayload = {
      message: error.message,
      kind: error.kind,
      error: error.debug ?? null,
      page: typeof window !== 'undefined' ? window.location.href : undefined,
    };
    const debugText = JSON.stringify(debugPayload, null, 2);
    const copyDebug = async () => {
      const enriched =
        `${debugText}\n\n` +
        `when: ${new Date().toISOString()}\n` +
        `userAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`;
      try {
        await navigator.clipboard.writeText(enriched);
      } catch {
        // Clipboard blocked — the <pre> below is selectable as a fallback.
      }
      setDebugCopied(true);
      setTimeout(() => setDebugCopied(false), 2000);
    };

    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-12 md:pt-16 pb-16">
        <div className="rounded-3xl border border-ash bg-white p-8 sm:p-10">
          <div className="mb-4 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 flex-shrink-0 text-rose-ink" />
            <h2 className="text-lg sm:text-xl tracking-tight text-aubergine">{headline}</h2>
          </div>
          <p className="mb-4 text-sm sm:text-base text-muted-foreground">{error.message}</p>
          {error.kind === 'credits' && (
            <p className="mb-4 text-xs sm:text-sm text-muted-foreground">
              Each generation costs 1 credit. Top up to keep going.
            </p>
          )}
          {wasHiddenDuringGeneration && (
            <p className="mb-4 text-xs sm:text-sm italic text-muted-foreground">
              Tip: switching tabs or locking your phone during generation can drop the
              connection. Keep this page in the foreground until it finishes.
            </p>
          )}

          {/* Copyable debug log — the full server error envelope (code, step,
              requestId, and the unwound cause chain). One-click copy so it can be
              pasted straight into a bug report. */}
          <div className="mb-6 rounded-2xl border border-ash bg-bone p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-caption uppercase tracking-wider text-fog-deep">
                Debug log
              </span>
              <Button size="sm" variant="outline" onClick={copyDebug}>
                {debugCopied ? (
                  <Check className="mr-2 h-4 w-4 text-mint" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {debugCopied ? 'Copied!' : 'Copy log'}
              </Button>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-xs leading-relaxed text-foreground">
              {debugText}
            </pre>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {error.kind === 'credits' ? (
              <Button onClick={() => (window.location.href = '/pricing')} size="lg" className="w-full sm:w-auto">
                <CreditCard className="h-4 w-4" />
                Buy Credits
              </Button>
            ) : error.kind === 'auth' ? (
              <Button
                onClick={() =>
                  (window.location.href = '/handler/sign-in?after_auth_return_to=/editor')
                }
                size="lg"
                className="w-full sm:w-auto"
              >
                <UserCheck className="h-4 w-4" />
                Sign in
              </Button>
            ) : (
              <Button onClick={handleRetry} size="lg" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            )}
            <Button onClick={() => window.history.back()} variant="outline" size="lg" className="w-full sm:w-auto">
              Go back
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // --- Progress State (typeset "compile log" galley) ---
  if (isGenerating) {
    // The backend streams a 1-based step index/total per event; the active mode's
    // array determines the labels/icons and the total shown.
    const activeSteps = progressMode === 'refine' ? REFINE_PROGRESS_STEPS : PROGRESS_STEPS;
    const logTitle = progressMode === 'refine' ? 'Refining your resume' : 'Composing your resume';
    const shownStep = Math.min(Math.max(currentStep, 1), activeSteps.length);
    return (
      <main className="mx-auto max-w-2xl px-4 sm:px-6 pt-12 md:pt-16 pb-16">
        <FadeIn>
          <div className="rounded-3xl bg-bone p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium tracking-tight text-aubergine">{logTitle}</h2>
              <span className="text-caption text-muted-foreground">
                Step {shownStep} / {activeSteps.length}
              </span>
            </div>

            {/* Step gallery */}
            <div className="space-y-1">
              {activeSteps.map((step, index) => {
                const StepIcon = step.icon;
                const stepNum = index + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-300 ${
                      isActive ? 'bg-white' : ''
                    }`}
                  >
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-mint" />
                      ) : isActive ? (
                        <Loader2 className="h-4 w-4 animate-spin text-periwinkle" />
                      ) : (
                        <StepIcon className="h-4 w-4 text-fog" />
                      )}
                    </div>
                    <span
                      className={`text-sm leading-snug ${
                        isActive
                          ? 'font-medium text-aubergine'
                          : isCompleted
                            ? 'text-muted-foreground'
                            : 'text-fog-deep'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer advisory */}
            <p className="mt-6 text-xs text-muted-foreground">
              Keep this page open until generation completes — closing or backgrounding
              the tab on mobile can interrupt the stream.
            </p>
          </div>
        </FadeIn>
      </main>
    );
  }

  if (!result) return null;

  // --- Result State ---
  return (
    <main className="mx-auto max-w-content px-4 sm:px-6 pt-10 md:pt-14 pb-16">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-2 text-caption uppercase tracking-wider text-fog-deep">
          Composed · {result.templateId}
        </p>
        <h1 className="text-2xl sm:text-3xl tracking-tight text-aubergine">
          Your resume is ready.
        </h1>
      </div>

      {/* Version compare dialog (read-only, free). */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
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
              <Label className="text-muted-foreground">Against</Label>
              <select
                value={compareAgainst}
                onChange={(e) => openCompare(e.target.value)}
                className="rounded-2xl border border-ash bg-white px-3 py-2 text-sm transition-colors duration-200 focus:border-periwinkle focus:outline-none focus:ring-2 focus:ring-periwinkle/40"
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
              <Loader2 className="h-5 w-5 animate-spin text-periwinkle" />
            </div>
          ) : compareData ? (
            <div className="grid grid-cols-2 gap-4">
              {[compareData.b, compareData.a].map((d, idx) => (
                <div key={d.id} className="rounded-2xl bg-bone p-4">
                  <p className="mb-1 text-caption text-muted-foreground">
                    {idx === 1 ? 'Current' : 'Compared'}
                  </p>
                  <p className="truncate text-sm font-medium text-aubergine" title={d.title}>
                    {d.versionLabel || d.title}
                  </p>
                  <p className="mt-3 text-3xl font-light tracking-tight text-aubergine">
                    {typeof d.atsScore === 'number' ? d.atsScore : '—'}
                    <span className="ml-1 text-xs text-muted-foreground">ATS</span>
                  </p>
                  <p className="mt-3 text-xs font-medium text-mint-ink">
                    Matched ({d.matchedSkills.length})
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {d.matchedSkills.join(', ') || '—'}
                  </p>
                  <p className="mt-2 text-xs font-medium text-rose-ink">
                    Missing ({d.missingSkills.length})
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {d.missingSkills.join(', ') || '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Could not load the comparison.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-8 lg:grid-cols-[7fr_5fr]">
        {/* Left: the PDF preview as the hero artifact — sticky on lg, minimal
            chrome (LivePdfPreview already carries its own frame). */}
        <FadeIn className="self-start lg:sticky lg:top-24">
          <Tabs
            value={previewTab}
            onValueChange={(v) => setPreviewTab(v as 'resume' | 'cover_letter')}
          >
            <TabsList className="mb-4">
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
              <LivePdfPreview typstCode={typstCode} filename={filename} />
            </TabsContent>

            {result.coverLetter && (
              <TabsContent value="cover_letter">
                {result.coverLetterTypst ? (
                  <LivePdfPreview
                    typstCode={result.coverLetterTypst}
                    filename={`${filename}_cover_letter`}
                  />
                ) : (
                  <div className="whitespace-pre-wrap rounded-3xl border border-ash bg-bone p-6 text-sm leading-relaxed text-foreground">
                    {result.coverLetter}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </FadeIn>

        {/* Right: one card, its sections separated by quiet Ash dividers, ordered
            by importance (status/score → actions → refine → collapsed history/edit). */}
        <FadeIn delay={0.06}>
          <div className="rounded-3xl border border-ash bg-white">
            {/* ATS score */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted-foreground">ATS match score</p>
                <Badge variant={scoreBadge(result.atsScore)}>{scoreLabel(result.atsScore)}</Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-5xl font-light tracking-tight text-aubergine">
                  {result.atsScore}
                </span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bone">
                <div
                  className="h-full rounded-full bg-periwinkle"
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
                <div className="border-t border-ash p-6 sm:p-8">
                  <p className="mb-4 text-sm font-medium text-muted-foreground">
                    Parsed from your background
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.map((s) => (
                      <div key={s.label} className="rounded-2xl bg-bone px-4 py-3">
                        <p className="text-2xl font-light leading-none text-aubergine">{s.value}</p>
                        <p className="mt-1 text-caption text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Something missing or off? Use{' '}
                    <span className="font-medium text-aubergine">Edit fields</span> below to fix it —
                    free, no credit.
                  </p>
                </div>
              );
            })()}

            {/* Matched skills */}
            {result.matchAnalysis.matchedSkills.length > 0 && (
              <div className="border-t border-ash p-6 sm:p-8">
                <p className="mb-4 text-sm font-medium text-muted-foreground">Matched skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matchAnalysis.matchedSkills.slice(0, 8).map((skill) => (
                    <Badge key={skill} variant="success">
                      {skill}
                    </Badge>
                  ))}
                  {result.matchAnalysis.matchedSkills.length > 8 && (
                    <Badge variant="default">
                      +{result.matchAnalysis.matchedSkills.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 border-t border-ash p-6 sm:p-8">
              <Button size="lg" className="w-full" onClick={handleDownloadPdf}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>

              {/* Secondary exports — the resume .typ/code and every cover-letter
                  export are consolidated into one Export menu so Download PDF stays
                  the single primary action. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full">
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
                      <Check className="mr-2 h-4 w-4 text-mint" />
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
                          <Check className="mr-2 h-4 w-4 text-mint" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {coverLetterCodeCopied ? 'Copied!' : 'Copy code'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyCoverLetter}>
                        {coverLetterCopied ? (
                          <Check className="mr-2 h-4 w-4 text-mint" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        {coverLetterCopied ? 'Copied!' : 'Copy text'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Save the background for reuse across future job descriptions. */}
              {effBg.trim() && (
                <Button variant="outline" className="w-full" onClick={openSaveProfile}>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save as profile
                </Button>
              )}
            </div>

            {/* Refinement — the calm, primary edit surface. A single natural-language
                box; the server infers scope from the feedback text. Free. */}
            <div className="border-t border-ash p-6 sm:p-8">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-base font-medium text-aubergine">Refine your resume</h3>
                <Badge variant="success">Free</Badge>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                Describe what to change and the AI revises just what you ask — the resume, the
                cover letter, or both — no credit, and your current version is kept (switch back
                from History below).
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder='e.g., "Focus on data skills" or "make the cover letter warmer"'
                  value={refinementText}
                  onChange={(e) => setRefinementText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRefine();
                  }}
                  disabled={!currentJobId}
                  className="flex-1"
                />
                <Button
                  onClick={handleRefine}
                  disabled={!refinementText.trim() || !currentJobId}
                  className="w-full sm:w-auto"
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
            </div>

            {/* Collapsed context: version history + the two power-user edit surfaces
                (manual field editor + conversational AI editor). Kept out of the way
                so the Refine box stays the primary control. All free — no billing. */}
            <div className="border-t border-ash px-6 sm:px-8">
              <Accordion type="multiple">
                {versions.length > 1 && (
                  <AccordionItem value="history">
                    <AccordionTrigger>
                      <span className="inline-flex items-center gap-2">
                        <History className="h-4 w-4" />
                        History ({versions.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap items-center gap-2">
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
                                    className="h-9 w-44 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9"
                                    onClick={handleRenameVersion}
                                    aria-label="Save name"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9"
                                    onClick={() => setRenaming(false)}
                                    aria-label="Cancel rename"
                                  >
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
                                className="inline-flex items-center gap-1 rounded-full bg-periwinkle/30 px-3 py-1 text-xs font-medium text-aubergine transition-colors hover:bg-periwinkle/40"
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
                              className="rounded-full border border-ash px-3 py-1 text-xs font-medium text-aubergine transition-colors hover:bg-bone"
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
                          className="ml-auto"
                          onClick={() => {
                            const others = versions.filter((v) => !v.isCurrent);
                            if (others.length > 0) openCompare(others[others.length - 1].id);
                          }}
                        >
                          <Columns2 className="h-4 w-4" />
                          Compare
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                <AccordionItem value="advanced" className="border-b-0">
                  <AccordionTrigger>
                    <span className="inline-flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Advanced edit
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {/* Free, client-side structured field editing — no LLM, no credit. */}
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setEditMode((v) => !v)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {editMode ? 'Hide field editor' : 'Edit fields'}
                        <Badge variant="success" className="ml-auto">
                          Free
                        </Badge>
                      </Button>

                      {/* Conversational AI editing of THIS saved resume — free (no credit).
                          Available whenever the result is persisted (currentJobId set). The
                          assistant opens the PERSISTED resume, so any unsaved local field
                          edits are persisted first (persist-before-navigate) rather than
                          being silently dropped. */}
                      {currentJobId && (
                        <Button
                          variant="outline"
                          disabled={savingVersion}
                          className="w-full justify-start"
                          onClick={handleEditWithAI}
                        >
                          {savingVersion ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                          )}
                          {savingVersion ? 'Saving edits…' : 'Edit with AI'}
                          <Badge variant="success" className="ml-auto">
                            Free
                          </Badge>
                        </Button>
                      )}

                      {advancedEditError && (
                        <p className="text-sm text-rose-ink">{advancedEditError}</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </FadeIn>
      </div>

      {/* Free structured-edit panel (no LLM, no charge) — rendered full-width below
          the grid so it has room and never nests inside the right-rail card. Toggled
          from Advanced edit → Edit fields. */}
      {editMode && (
        <div className="mt-8">
          <StructuredEditor
            resume={result.resumeData}
            onApply={handleApplyEdit}
            onCancel={() => setEditMode(false)}
            onSaveAsVersion={currentJobId ? handleSaveAsVersion : undefined}
            saving={savingVersion}
          />
        </div>
      )}

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
            <Label htmlFor="profile-label">Profile name</Label>
            <Input
              id="profile-label"
              placeholder="e.g., Senior Backend Engineer"
              value={saveProfileLabel}
              onChange={(e) => setSaveProfileLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveProfile();
              }}
            />
            <Label htmlFor="profile-voice">Your writing sample — we&apos;ll match your voice</Label>
            <Textarea
              id="profile-voice"
              placeholder="Paste a paragraph you wrote (a past cover letter, a bio). Optional."
              value={saveProfileVoice}
              onChange={(e) => setSaveProfileVoice(e.target.value)}
              className="min-h-[96px]"
            />
            {saveProfileState === 'error' && (
              <p className="text-sm text-rose-ink">Could not save — please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={saveProfileState === 'saving' || saveProfileState === 'saved' || !effBg.trim()}
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
    </main>
  );
}
