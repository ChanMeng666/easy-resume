/**
 * In-process MCP tools — the hosted twin of the stdio `vitex mcp` CLI.
 *
 * These are the SAME 9 tools `cli/src/mcp.ts` exposes, but instead of making HTTP
 * calls to the public v1 API they call the backend core DIRECTLY (the same
 * functions the v1 routes call). So billing, idempotency, concurrency, and owner
 * scoping are identical whether an agent drives Vitex over the stdio CLI, the
 * public REST API, or this hosted MCP endpoint — "the API is the UI".
 *
 * Design for testability: every side-effecting seam (job creation, job polling,
 * profile store, credit balance, base URL) is injected via `McpToolDeps`. The
 * pure handlers in `createToolHandlers` never touch HTTP/transport, so unit tests
 * drive them with fakes and never hit a real DB / LLM / network. `registerVitexTools`
 * wires the handlers onto an `McpServer` and adds per-call rate limiting.
 */

import 'server-only';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { db } from '@/lib/db/client';
import { generationJobs, type GenerationJob } from '@/lib/db/schema';
import { createJob, type RefineJobInput } from '@/server/jobs/runner';
import { buildRefineArtifacts } from '@/server/jobs/refineArtifacts';
import {
  getProfile,
  listProfiles,
  createProfile,
  publishProfile,
  unpublishProfile,
  type ProfileSummary,
} from '@/server/profiles/store';
import { creditService } from '@/lib/services/creditService';
import { enforceRateLimit } from '@/server/ratelimit';
import { NotFoundError, ValidationError } from '@/server/errors/AppError';
import { toErrorEnvelope } from '@/server/errors/envelope';
import { getBaseUrl } from '@/server/oauth/config';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';
import type { McpAuthExtra } from './verifyToken';

// ---------------------------------------------------------------------------
// Result shaping (mirrors cli/src/mcp.ts ok/fail + finalJob)
// ---------------------------------------------------------------------------

export type ToolResult = {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
};

/** Wrap a JSON-serializable value as a text tool result. */
export function ok(value: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

/** Render a thrown value as an error tool result via the canonical envelope. */
export function fail(err: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(toErrorEnvelope(err), null, 2) }],
    isError: true,
  };
}

const BILLING_NOTE =
  'Billing: 1 credit only on a successfully compiled PDF; failures and refinements are free.';

/**
 * Compact a job row to the fields an assistant needs. A non-terminal job (the
 * poll budget elapsed before it finished) returns just `{ id, status }` — the
 * assistant is told to call `get_resume` to keep polling.
 */
export function finalJob(job: GenerationJob, baseUrl: string): Record<string, unknown> {
  if (job.status !== 'succeeded') {
    if (job.status === 'failed') return { id: job.id, status: job.status, error: job.error };
    // queued | running: hand back a poll handle, not a partial result.
    return { id: job.id, status: job.status };
  }
  const r = (job.result ?? {}) as Record<string, unknown>;
  return {
    id: job.id,
    status: job.status,
    pdfUrl: `${baseUrl}/api/v1/resumes/${job.id}/pdf`,
    atsScore: r.atsScore,
    matchAnalysis: r.matchAnalysis,
    coverLetter: r.coverLetter,
    templateId: r.templateId,
    usage: r.usage,
  };
}

// ---------------------------------------------------------------------------
// Injectable dependencies
// ---------------------------------------------------------------------------

/** Parent context a refine builds on (resolved + validated up front). */
export interface RefineParentContext {
  jobDescription: string;
  background: string;
  templateId: string;
}

export interface McpToolDeps {
  createJob: (
    caller: Caller,
    input: GenerateInput,
    idempotencyKey: string
  ) => Promise<GenerationJob>;
  /** Block-poll a job row to a terminal state or until the budget elapses. */
  waitForJob: (jobId: string, userId: string) => Promise<GenerationJob>;
  /** Resolve + validate the parent a refine builds on (owner/succeeded/result). */
  loadRefineParent: (userId: string, parentId: string) => Promise<RefineParentContext>;
  getProfile: (userId: string, id: string) => Promise<{
    id: string;
    rawBackground: string;
    data: GenerateInput['baseResume'];
    voiceSample: string | null;
  }>;
  listProfiles: (userId: string) => Promise<ProfileSummary[]>;
  createProfile: (
    userId: string,
    input: { rawBackground: string; label?: string; voiceSample?: string }
  ) => Promise<{ id: string; label: string; createdAt: Date | null }>;
  publishProfile: (
    userId: string,
    id: string
  ) => Promise<{ slug: string; publishedAt: Date | null }>;
  unpublishProfile: (userId: string, id: string) => Promise<void>;
  getAccount: (userId: string) => Promise<{ credits: number; tier: string }>;
  /** Absolute origin used to build hosted PDF / public-profile URLs. */
  baseUrl: string;
}

/** Poll budget for the in-process wait: 90s at a 1s cadence (mirrors cli pollJob). */
const POLL_BUDGET_MS = 90_000;
const POLL_INTERVAL_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Block-poll the job ROW (not an HTTP endpoint) until it settles or the budget
 * elapses. Owner-scoped: a row that isn't the caller's (or vanished) is NotFound.
 * On budget-exceed it returns the latest (still queued/running) row so the tool
 * can hand back a poll handle.
 */
async function waitForJobRow(jobId: string, userId: string): Promise<GenerationJob> {
  const deadline = Date.now() + POLL_BUDGET_MS;
  for (;;) {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, jobId))
      .limit(1);
    if (!job || job.userId !== userId) throw new NotFoundError('Job not found');
    if (job.status === 'succeeded' || job.status === 'failed') return job;
    if (Date.now() >= deadline) return job;
    await sleep(POLL_INTERVAL_MS);
  }
}

/**
 * Resolve + validate the parent generation a refine builds on. Mirrors the v1
 * refine route's up-front check so a bad request never creates a job row: the
 * parent must exist, be the caller's, be succeeded, and carry a result.
 */
async function defaultLoadRefineParent(
  userId: string,
  parentId: string
): Promise<RefineParentContext> {
  const [parent] = await db
    .select({
      userId: generationJobs.userId,
      status: generationJobs.status,
      input: generationJobs.input,
      result: generationJobs.result,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, parentId))
    .limit(1);

  if (!parent || parent.userId !== userId || parent.status !== 'succeeded' || !parent.result) {
    throw new NotFoundError('Resume not found');
  }

  const parentInputObj = (parent.input ?? {}) as { jobDescription?: string; background?: string };
  const parentResult = parent.result as Parameters<typeof buildRefineArtifacts>[1];
  // Throws ValidationError when the parent has no resume data to refine.
  const artifacts = buildRefineArtifacts(parentInputObj, parentResult);
  return {
    jobDescription: parentInputObj.jobDescription ?? '',
    background: parentInputObj.background ?? '',
    templateId: artifacts.templateId,
  };
}

/** Real dependency wiring — the same core functions the v1 routes use. */
export function defaultMcpToolDeps(): McpToolDeps {
  return {
    createJob: (caller, input, idempotencyKey) => createJob(caller, input, idempotencyKey),
    waitForJob: waitForJobRow,
    loadRefineParent: defaultLoadRefineParent,
    getProfile: async (userId, id) => {
      const p = await getProfile(userId, id);
      return { id: p.id, rawBackground: p.rawBackground, data: p.data, voiceSample: p.voiceSample };
    },
    listProfiles,
    createProfile: async (userId, input) => {
      const p = await createProfile(userId, input);
      return { id: p.id, label: p.label, createdAt: p.createdAt };
    },
    publishProfile,
    unpublishProfile,
    getAccount: async (userId) => {
      const record = await creditService.getOrCreate(userId);
      return { credits: record.balance, tier: record.subscriptionTier ?? 'free' };
    },
    baseUrl: getBaseUrl(),
  };
}

// ---------------------------------------------------------------------------
// Pure tool handlers (userId in, structured payload out; throw on error)
// ---------------------------------------------------------------------------

/** A UUID Idempotency-Key per create/refine call so a client retry is safe. */
function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function createToolHandlers(deps: McpToolDeps) {
  return {
    async getAccount(userId: string): Promise<Record<string, unknown>> {
      const acct = await deps.getAccount(userId);
      return { userId, via: 'api_key', credits: acct.credits, tier: acct.tier };
    },

    async generateResume(
      userId: string,
      args: { jobDescription: string; background?: string; profile_id?: string; template_id?: string }
    ): Promise<Record<string, unknown>> {
      const caller: Caller = { userId, via: 'api_key' };
      const input: GenerateInput = {
        jobDescription: args.jobDescription,
        background: args.background?.trim() ? args.background : '',
        templateId: args.template_id,
      };
      if (args.profile_id?.trim()) {
        // Resolve the saved profile → seed background + pre-parsed base resume
        // (the pipeline then skips parse_background). Owner-checked → NotFound.
        const profile = await deps.getProfile(userId, args.profile_id.trim());
        input.background = profile.rawBackground;
        input.baseResume = profile.data;
        input.profileId = profile.id;
        input.voiceSample = profile.voiceSample ?? undefined;
      } else if (!input.background) {
        throw new ValidationError('background is required (or supply profile_id)');
      }

      const job = await deps.createJob(caller, input, newIdempotencyKey());
      const settled = await deps.waitForJob(job.id, userId);
      return finalJob(settled, deps.baseUrl);
    },

    async refineResume(
      userId: string,
      args: { id: string; feedback: string; scope?: 'resume' | 'cover_letter' | 'both' }
    ): Promise<Record<string, unknown>> {
      const caller: Caller = { userId, via: 'api_key' };
      const parent = await deps.loadRefineParent(userId, args.id);
      const scope = args.scope ?? 'resume';
      const storedInput: RefineJobInput = {
        jobDescription: parent.jobDescription,
        background: parent.background,
        templateId: parent.templateId,
        refineOfJobId: args.id,
        feedback: args.feedback,
        scope,
      };
      const job = await deps.createJob(caller, storedInput, newIdempotencyKey());
      const settled = await deps.waitForJob(job.id, userId);
      return finalJob(settled, deps.baseUrl);
    },

    async getResume(userId: string, args: { id: string }): Promise<Record<string, unknown>> {
      const [job] = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.id, args.id))
        .limit(1);
      // Hide existence from non-owners — NotFound, never Forbidden.
      if (!job || job.userId !== userId) throw new NotFoundError('Job not found');
      return finalJob(job, deps.baseUrl);
    },

    async downloadPdf(userId: string, args: { id: string }): Promise<Record<string, unknown>> {
      // This is a server: hand back a HOSTED URL, never a temp file path. The
      // owner check + PDF materialization happen at the PDF route itself.
      void userId;
      return { id: args.id, url: `${deps.baseUrl}/api/v1/resumes/${args.id}/pdf` };
    },

    async listProfiles(userId: string): Promise<{ items: ProfileSummary[] }> {
      return { items: await deps.listProfiles(userId) };
    },

    async createProfile(
      userId: string,
      args: { raw_background: string; label?: string; voice_sample?: string }
    ): Promise<Record<string, unknown>> {
      const profile = await deps.createProfile(userId, {
        rawBackground: args.raw_background,
        label: args.label,
        voiceSample: args.voice_sample,
      });
      return { id: profile.id, label: profile.label, createdAt: profile.createdAt };
    },

    async publishProfile(userId: string, args: { id: string }): Promise<Record<string, unknown>> {
      const { slug, publishedAt } = await deps.publishProfile(userId, args.id);
      return { slug, url: `${deps.baseUrl}/p/${slug}`, publishedAt };
    },

    async unpublishProfile(
      userId: string,
      args: { id: string }
    ): Promise<Record<string, unknown>> {
      await deps.unpublishProfile(userId, args.id);
      return { unpublished: true };
    },
  };
}

// ---------------------------------------------------------------------------
// MCP registration
// ---------------------------------------------------------------------------

/** Per-user MCP call budget. A tool call is either read-only or dispatches to
 * the already-rate-limited generation/refine core, so a modest window suffices. */
const MCP_RATE_LIMIT = 60;
const MCP_RATE_WINDOW_SECONDS = 60;

/**
 * Pull the authenticated userId off the MCP tool call context. `verifyMcpToken`
 * stashed it on `AuthInfo.extra`; the SDK propagates that to every tool call as
 * `extra.authInfo`. A missing userId means the auth wrapper was bypassed — refuse.
 */
function requireUserId(extra: { authInfo?: { extra?: Record<string, unknown> } }): string {
  const userId = (extra.authInfo?.extra as McpAuthExtra | undefined)?.userId;
  if (typeof userId !== 'string' || !userId) {
    throw new NotFoundError('Authentication required');
  }
  return userId;
}

/**
 * Register all 9 Vitex tools onto an MCP server. Each tool: resolves the caller
 * from the auth context, enforces a per-user rate limit (fail-open), runs the
 * pure handler, and formats the result/error into the MCP text shape.
 */
export function registerVitexTools(server: McpServer, deps: McpToolDeps = defaultMcpToolDeps()): void {
  const handlers = createToolHandlers(deps);

  /** Shared per-call wrapper: userId + rate limit + ok/fail formatting. */
  const run = async (
    extra: { authInfo?: { extra?: Record<string, unknown> } },
    fn: (userId: string) => Promise<unknown>
  ): Promise<ToolResult> => {
    try {
      const userId = requireUserId(extra);
      // Fail-open on infra error inside enforceRateLimit; throws only when the
      // window is genuinely exceeded (rendered as an error result below).
      await enforceRateLimit(`mcp:${userId}`, MCP_RATE_LIMIT, MCP_RATE_WINDOW_SECONDS);
      return ok(await fn(userId));
    } catch (err) {
      return fail(err);
    }
  };

  server.registerTool(
    'get_account',
    {
      title: 'Get account identity & credit balance',
      description: `Return the authenticated account: userId, credit balance, and tier. Read-only — never spends credits. Check credits before generating: a successfully compiled PDF costs 1 credit (refinements and failures are free).`,
      inputSchema: {},
    },
    (_args, extra) => run(extra, (userId) => handlers.getAccount(userId))
  );

  server.registerTool(
    'generate_resume',
    {
      title: 'Generate a tailored resume',
      description: `Compile a tailored, ATS-optimized resume PDF and cover letter from a job description plus a background (inline or a saved profile_id). Blocks until the job finishes and returns the final job incl. atsScore; if it is still running after ~90s it returns { id, status: 'running' } — call get_resume to keep polling. ${BILLING_NOTE}`,
      inputSchema: {
        jobDescription: z.string().min(1).describe('The target job description text'),
        background: z.string().optional().describe('Candidate background as free text (or use profile_id)'),
        profile_id: z.string().optional().describe('A saved candidate profile id to reuse instead of background'),
        template_id: z.string().optional().describe('Optional template id; auto-selected from the JD if omitted'),
      },
    },
    (args, extra) => run(extra, (userId) => handlers.generateResume(userId, args))
  );

  server.registerTool(
    'refine_resume',
    {
      title: 'Refine a resume',
      description: `Refine a succeeded resume with natural-language feedback. Creates a new version in the parent's chain and blocks until it finishes (call get_resume if it is still running after ~90s). Refinement is free. ${BILLING_NOTE}`,
      inputSchema: {
        id: z.string().min(1).describe('The parent (succeeded) job id'),
        feedback: z.string().min(1).max(8000).describe('Natural-language revision instructions'),
        scope: z.enum(['resume', 'cover_letter', 'both']).optional().describe("What to revise; defaults to 'resume'"),
      },
    },
    (args, extra) => run(extra, (userId) => handlers.refineResume(userId, args))
  );

  server.registerTool(
    'get_resume',
    {
      title: 'Get a resume job',
      description: `Fetch a generation/refine job by id (status, result, atsScore, error). Read-only. ${BILLING_NOTE}`,
      inputSchema: { id: z.string().min(1).describe('The job id') },
    },
    (args, extra) => run(extra, (userId) => handlers.getResume(userId, args))
  );

  server.registerTool(
    'download_pdf',
    {
      title: 'Get a resume PDF link',
      description: `Return the hosted URL of a succeeded job's compiled PDF. Read-only. ${BILLING_NOTE}`,
      inputSchema: { id: z.string().min(1).describe('The succeeded job id') },
    },
    (args, extra) => run(extra, (userId) => handlers.downloadPdf(userId, args))
  );

  server.registerTool(
    'list_profiles',
    {
      title: 'List candidate profiles',
      description: `List your saved candidate backgrounds (reusable across job descriptions). Free.`,
      inputSchema: {},
    },
    (_args, extra) => run(extra, (userId) => handlers.listProfiles(userId))
  );

  server.registerTool(
    'create_profile',
    {
      title: 'Create a candidate profile',
      description: `Save a reusable candidate background (parsed server-side). Reuse it via profile_id in generate_resume. Free.`,
      inputSchema: {
        raw_background: z.string().min(1).describe('Candidate background as free text'),
        label: z.string().optional().describe('Optional human label'),
        voice_sample: z.string().max(4000).optional().describe('Optional writing sample so cover letters match the voice'),
      },
    },
    (args, extra) => run(extra, (userId) => handlers.createProfile(userId, args))
  );

  server.registerTool(
    'publish_profile',
    {
      title: 'Publish a candidate profile',
      description: `Publish a profile to a stable public career endpoint (/p/<slug>); returns the URL. Never exposes email/phone/photo. Free.`,
      inputSchema: { id: z.string().min(1).describe('The profile id to publish') },
    },
    (args, extra) => run(extra, (userId) => handlers.publishProfile(userId, args))
  );

  server.registerTool(
    'unpublish_profile',
    {
      title: 'Unpublish a candidate profile',
      description: `Close a published profile's public endpoint (the slug is kept so republishing restores the same URL). Free.`,
      inputSchema: { id: z.string().min(1).describe('The profile id to unpublish') },
    },
    (args, extra) => run(extra, (userId) => handlers.unpublishProfile(userId, args))
  );
}
