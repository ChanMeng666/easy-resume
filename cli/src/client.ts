/**
 * VitexClient — a thin, transport-only HTTP client for the hosted Vitex v1 API.
 *
 * This file contains ZERO UI concerns (no console output, no process.exit, no
 * argument parsing). Both entrypoints — the CLI (cli.ts) and the MCP server
 * (mcp.ts) — call these methods. It never reimplements the pipeline: every method
 * is a direct wrapper over a real hosted endpoint documented in docs/api/v1.md.
 */

/** The canonical machine-readable error envelope every Vitex endpoint returns. */
export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    retriable: boolean;
    step?: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * A typed error carrying the parsed envelope. Thrown for every non-2xx response
 * whose body is (or can be coerced into) the standard envelope shape.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly retriable: boolean;
  readonly step?: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
  readonly httpStatus: number;

  constructor(
    httpStatus: number,
    envelope: ErrorEnvelope['error'],
  ) {
    super(envelope.message || envelope.code || `HTTP ${httpStatus}`);
    this.name = 'ApiError';
    this.httpStatus = httpStatus;
    this.code = envelope.code || 'INTERNAL';
    this.retriable = Boolean(envelope.retriable);
    this.step = envelope.step;
    this.requestId = envelope.requestId;
    this.details = envelope.details;
  }
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

/** A job handle returned by create / refine (202 Accepted). */
export interface JobHandle {
  id: string;
  status: JobStatus;
  _links?: { self?: string; pdf?: string };
}

/** The full job record returned by GET /api/v1/resumes/{id}. */
export interface JobRecord {
  id: string;
  status: JobStatus;
  result?: Record<string, unknown>;
  error?: ErrorEnvelope['error'];
  pdfUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RefineScope = 'resume' | 'cover_letter' | 'both';

export interface CreateResumeInput {
  jobDescription: string;
  background?: string;
  templateId?: string;
  profileId?: string;
}

export interface CreateProfileInput {
  rawBackground: string;
  label?: string;
  voiceSample?: string;
}

export interface UpdateProfileInput {
  rawBackground?: string;
  label?: string;
  voiceSample?: string;
}

export interface VitexClientOptions {
  baseUrl: string;
  apiKey: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
}

interface RequestOptions {
  method?: string;
  path: string;
  body?: unknown;
  /** When true, attach a fresh UUID Idempotency-Key (create/refine only). */
  idempotent?: boolean;
  /** 'json' (default) parses the body as JSON; 'bytes' returns raw bytes. */
  expect?: 'json' | 'bytes';
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class VitexClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: VitexClientOptions) {
    // Normalize: drop a trailing slash so `${baseUrl}${path}` never doubles up.
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('global fetch is unavailable; Node 20+ is required');
    }
  }

  /**
   * Central request path: attaches the Bearer key, an optional UUID
   * Idempotency-Key (generate/refine only), parses the error envelope into a
   * typed ApiError, and returns either parsed JSON or raw PDF bytes.
   */
  private async request<T>(opts: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: opts.expect === 'bytes' ? 'application/pdf' : 'application/json',
    };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    // Idempotency-Key is meaningful ONLY on the job-creating POSTs (generate,
    // refine); GETs and profile CRUD never send it.
    if (opts.idempotent) headers['Idempotency-Key'] = randomUUID();

    const res = await this.fetchImpl(`${this.baseUrl}${opts.path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    if (!res.ok) {
      throw await toApiError(res);
    }

    if (opts.expect === 'bytes') {
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf) as unknown as T;
    }
    // Some endpoints (e.g. DELETE) may return an empty body; tolerate it.
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  // ---- Generation ---------------------------------------------------------

  /** POST /api/v1/resumes — create a generation job (202). Idempotent. */
  createResume(input: CreateResumeInput): Promise<JobHandle> {
    const body: Record<string, unknown> = { jobDescription: input.jobDescription };
    if (input.background) body.background = input.background;
    if (input.templateId) body.templateId = input.templateId;
    if (input.profileId) body.profile_id = input.profileId;
    return this.request<JobHandle>({
      method: 'POST',
      path: '/api/v1/resumes',
      body,
      idempotent: true,
    });
  }

  /** GET /api/v1/resumes/{id} — poll a single job. */
  getJob(id: string): Promise<JobRecord> {
    return this.request<JobRecord>({ path: `/api/v1/resumes/${encodeURIComponent(id)}` });
  }

  /** GET /api/v1/resumes/{id}/pdf — the compiled PDF bytes. */
  getPdf(id: string): Promise<Uint8Array> {
    return this.request<Uint8Array>({
      path: `/api/v1/resumes/${encodeURIComponent(id)}/pdf`,
      expect: 'bytes',
    });
  }

  /** POST /api/v1/resumes/{id}/refine — refine a succeeded job (202). Idempotent. */
  refine(parentId: string, feedback: string, scope?: RefineScope): Promise<JobHandle> {
    const body: Record<string, unknown> = { feedback };
    if (scope) body.scope = scope;
    return this.request<JobHandle>({
      method: 'POST',
      path: `/api/v1/resumes/${encodeURIComponent(parentId)}/refine`,
      body,
      idempotent: true,
    });
  }

  /**
   * Poll a job to a terminal state (succeeded | failed). Resolves with the final
   * JobRecord regardless of terminal status (the caller inspects `.status`);
   * throws PollTimeoutError if it never settles within maxAttempts.
   */
  async pollJob(
    id: string,
    { intervalMs = 2000, maxAttempts = 120 }: { intervalMs?: number; maxAttempts?: number } = {},
  ): Promise<JobRecord> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const job = await this.getJob(id);
      if (job.status === 'succeeded' || job.status === 'failed') return job;
      await sleep(intervalMs);
    }
    throw new PollTimeoutError(id, maxAttempts);
  }

  // ---- Profiles -----------------------------------------------------------

  /** GET /api/profiles — list your saved backgrounds. */
  listProfiles(): Promise<{ items: unknown[] }> {
    return this.request<{ items: unknown[] }>({ path: '/api/profiles' });
  }

  /** GET /api/profiles/{id} — fetch one with its parsed data. */
  getProfile(id: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>({
      path: `/api/profiles/${encodeURIComponent(id)}`,
    });
  }

  /** POST /api/profiles — create from raw text (parsed server-side; free). */
  createProfile(input: CreateProfileInput): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = { rawBackground: input.rawBackground };
    if (input.label) body.label = input.label;
    if (input.voiceSample) body.voiceSample = input.voiceSample;
    return this.request<Record<string, unknown>>({
      method: 'POST',
      path: '/api/profiles',
      body,
    });
  }

  /** PUT /api/profiles/{id} — update label / background / voice sample. */
  updateProfile(id: string, input: UpdateProfileInput): Promise<Record<string, unknown>> {
    const body: Record<string, unknown> = {};
    if (input.label !== undefined) body.label = input.label;
    if (input.rawBackground !== undefined) body.rawBackground = input.rawBackground;
    if (input.voiceSample !== undefined) body.voiceSample = input.voiceSample;
    return this.request<Record<string, unknown>>({
      method: 'PUT',
      path: `/api/profiles/${encodeURIComponent(id)}`,
      body,
    });
  }

  /** DELETE /api/profiles/{id}. */
  deleteProfile(id: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>({
      method: 'DELETE',
      path: `/api/profiles/${encodeURIComponent(id)}`,
    });
  }

  /** POST /api/profiles/{id}/publish → { slug, url, publishedAt }. */
  publishProfile(id: string): Promise<{ slug: string; url: string; publishedAt: string }> {
    return this.request({
      method: 'POST',
      path: `/api/profiles/${encodeURIComponent(id)}/publish`,
    });
  }

  /** DELETE /api/profiles/{id}/publish → { unpublished: true }. */
  unpublishProfile(id: string): Promise<{ unpublished: boolean }> {
    return this.request({
      method: 'DELETE',
      path: `/api/profiles/${encodeURIComponent(id)}/publish`,
    });
  }
}

/** Thrown when pollJob exhausts its attempt budget without a terminal status. */
export class PollTimeoutError extends Error {
  readonly jobId: string;
  readonly attempts: number;
  constructor(jobId: string, attempts: number) {
    super(`Job ${jobId} did not finish after ${attempts} poll attempts`);
    this.name = 'PollTimeoutError';
    this.jobId = jobId;
    this.attempts = attempts;
  }
}

/** Parse a non-2xx Response into a typed ApiError, tolerating non-envelope bodies. */
async function toApiError(res: Response): Promise<ApiError> {
  let envelope: ErrorEnvelope['error'] | undefined;
  try {
    const parsed = (await res.json()) as Partial<ErrorEnvelope>;
    if (parsed && typeof parsed === 'object' && parsed.error) envelope = parsed.error;
  } catch {
    // Non-JSON body (proxy error page, empty, etc.) — fall through to a synthetic
    // envelope so callers always get a typed ApiError.
  }
  return new ApiError(
    res.status,
    envelope ?? {
      code: res.status === 429 ? 'RATE_LIMITED' : 'INTERNAL',
      message: `HTTP ${res.status} ${res.statusText}`.trim(),
      retriable: res.status >= 500 || res.status === 429,
      requestId: res.headers.get('x-request-id') ?? undefined,
    },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** UUID v4 via the platform crypto (Node 20+ exposes it on globalThis). */
function randomUUID(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid && UUID_RE.test(uuid)) return uuid;
  // Extremely defensive fallback; globalThis.crypto is standard on Node 20+.
  throw new Error('crypto.randomUUID is unavailable; Node 20+ is required');
}
