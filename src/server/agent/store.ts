/**
 * Conversational edit-agent persistence (transport-agnostic).
 *
 * Owns CRUD over the `agent_threads` / `agent_messages` tables for the P2-1
 * conversational resume editor. A thread is anchored to the live
 * `generation_jobs` model it edits (the dormant `resume_id` FK to the dead
 * `resumes` table stays unwritten, per ADR 0001). All reads/writes are
 * owner-scoped: a thread that isn't the caller's surfaces as NotFound (never
 * Forbidden), mirroring the application / candidate-profile stores.
 *
 * No billing happens in this module — conversational editing is free (the only
 * charge site stays the post-compile call in runGenerationPipeline). This layer
 * is pure storage.
 */

import 'server-only';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { agentThreads, agentMessages, generationJobs } from '@/lib/db/schema';
import { NotFoundError, ValidationError } from '@/server/errors/AppError';
import { manualVersionCreateSchema, resumeDataSchema, type ResumeData } from '@/lib/validation/schema';

/** A working snapshot of the resume being edited in a thread. */
export interface ResumeSnapshot {
  resumeData: ResumeData;
  typstCode: string;
  templateId: string;
}

/** Lightweight row for the thread list view. */
export interface ThreadSummary {
  id: string;
  title: string | null;
  status: string | null;
  generationJobId: string | null;
  messageCount: number | null;
  lastMessageAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** A persisted conversation message, in wire shape. */
export interface StoredMessage {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  toolArgs: unknown;
  toolResult: unknown;
  sequenceNum: number;
  createdAt: Date | null;
}

/**
 * One message to persist as part of a completed turn.
 *  - `user`: the user's instruction (content = text).
 *  - `assistant`: the assistant's final reply (content = text). The resulting
 *    resume snapshot is stored on `toolResult` so a re-opened thread restores the
 *    edited resume without replaying tool calls.
 *  - `tool`: a single tool invocation (toolName + toolArgs + toolResult).
 */
export interface TurnMessageInput {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string | null;
  toolArgs?: unknown;
  toolResult?: unknown;
}

// Partial wire shape of a generation job's persisted result (see persist.ts
// toWireResult). Only the fields the editor baseline needs.
type JobResult = {
  resumeData?: ResumeData;
  typstCode?: string;
  templateId?: string;
};

const MAX_TITLE_LEN = 80;
// Hard cap on a single thread/message list response. A conversation is naturally
// small (a handful of turns); a generous fixed cap avoids unbounded reads without
// needing pagination UI for the MVP.
const LIST_MAX = 200;
const MESSAGE_LIST_MAX = 1000;
// How many of the most-recent assistant messages to scan for the latest resume
// snapshot. Every edit turn writes a snapshot on its assistant message, so the
// newest valid snapshot is always within the last few — this bounds the read
// independently of total thread length (which loadHistory caps separately).
const SNAPSHOT_SCAN_LIMIT = 20;
// Bounded retries when a concurrent turn on the same thread races for the same
// sequence number (the unique index rejects the loser). Per-thread writes are
// effectively serialized by the UI, so this only guards adversarial concurrency.
const MAX_SEQ_RETRIES = 5;

// Write-boundary caps for a persisted turn. This store is an exported storage API,
// so it enforces its own bounds rather than trusting callers: a single turn holds
// a handful of messages; chat text is short; tool payloads are tiny confirmations;
// the resume snapshot on an assistant message is bounded exactly like a manual
// version (the render-DoS guard) so it can't be used to persist an unbounded
// resume or pathological Typst.
const MAX_TURN_MESSAGES = 64;
const MAX_MESSAGE_CONTENT = 100_000;
const MAX_TOOL_JSON_BYTES = 20_000;
const MAX_TYPST_SNAPSHOT = 200_000;
// Whole-snapshot JSON cap: resumeData (≤60KB by the manual-version bound) +
// typstCode (≤MAX_TYPST_SNAPSHOT) + a small templateId, with headroom. Caps the
// entire toolResult so the snapshot branch can't be a hole for unbounded JSON.
const MAX_SNAPSHOT_JSON_BYTES = 280_000;
const SNAPSHOT_KEYS = new Set(['resumeData', 'typstCode', 'templateId']);

/** UTF-8 byte length of a value's JSON (not its UTF-16 char count, which would
 * let multi-byte text — e.g. CJK — slip past a byte cap). Non-serializable values
 * (circular refs) are treated as over-limit. */
function jsonByteLen(value: unknown): number {
  if (value == null) return 0;
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Validate the bounds of a turn before it is persisted. Pure + testable. Throws
 * ValidationError when a turn is too large, a message is too long, a tool payload
 * is oversized, or an assistant resume snapshot violates the manual-version
 * bounds. Defense-in-depth at the storage boundary (the tool loop also bounds its
 * outputs upstream).
 */
export function assertTurnBounds(messages: TurnMessageInput[]): void {
  if (messages.length > MAX_TURN_MESSAGES) {
    throw new ValidationError('Conversation turn has too many messages');
  }
  for (const m of messages) {
    if (typeof m.content === 'string' && m.content.length > MAX_MESSAGE_CONTENT) {
      throw new ValidationError('Message content is too large');
    }
    const snap = m.toolResult as Record<string, unknown> | null | undefined;
    const isSnapshot = m.role === 'assistant' && snap != null && snap.resumeData !== undefined;
    if (isSnapshot) {
      // A snapshot must be EXACTLY { resumeData, typstCode, templateId? } — no
      // extra keys (which would smuggle in unbounded JSON), a string typstCode
      // within the length cap, resumeData within the manual-version render bounds,
      // and the whole blob under the snapshot byte cap.
      if (Object.keys(snap).some((k) => !SNAPSHOT_KEYS.has(k))) {
        throw new ValidationError('Resume snapshot has unexpected fields');
      }
      if (typeof snap.typstCode !== 'string' || snap.typstCode.length > MAX_TYPST_SNAPSHOT) {
        throw new ValidationError('Resume snapshot is invalid or too large');
      }
      const parsed = manualVersionCreateSchema.safeParse({
        resumeData: snap.resumeData,
        templateId: snap.templateId,
      });
      if (!parsed.success) {
        throw new ValidationError('Resume snapshot is invalid or too large');
      }
      if (jsonByteLen(snap) > MAX_SNAPSHOT_JSON_BYTES) {
        throw new ValidationError('Resume snapshot is too large');
      }
    } else if (jsonByteLen(m.toolArgs) + jsonByteLen(m.toolResult) > MAX_TOOL_JSON_BYTES) {
      throw new ValidationError('Tool payload is too large');
    }
  }
}

/**
 * Derive a thread title from its anchor job. Prefers the job's stored title, then
 * the candidate's professional label, then a generic fallback. Pure + testable.
 */
export function deriveThreadTitle(job: { title?: string | null; result?: JobResult | null }): string {
  const title = job.title?.trim();
  if (title) return truncate(title);
  const label = job.result?.resumeData?.basics?.label?.trim();
  if (label) return truncate(label);
  return 'Resume chat';
}

function truncate(s: string): string {
  return s.length > MAX_TITLE_LEN ? `${s.slice(0, MAX_TITLE_LEN - 1).trimEnd()}…` : s;
}

/**
 * Pick the most recent resume snapshot from a thread's messages, falling back to
 * the anchor job's baseline when no turn has edited the resume yet. Pure +
 * testable: the working resume is stored on each assistant message's tool_result.
 *
 * @param messages Thread messages (any order — scanned for the latest snapshot).
 * @param fallback The anchor job's baseline snapshot.
 */
export function pickLatestSnapshot(
  messages: Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[],
  fallback: ResumeSnapshot
): ResumeSnapshot {
  let best: { seq: number; snap: ResumeSnapshot } | null = null;
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const snap = m.toolResult as Record<string, unknown> | null | undefined;
    if (!snap || typeof snap.typstCode !== 'string') continue;
    // Don't trust stored JSON: re-validate resumeData and coerce templateId. A
    // structurally-invalid stored snapshot is skipped (falls through to an older
    // valid one, ultimately the baseline) rather than returned as-is.
    const parsed = resumeDataSchema.safeParse(snap.resumeData);
    if (!parsed.success) continue;
    if (!best || m.sequenceNum > best.seq) {
      best = {
        seq: m.sequenceNum,
        snap: {
          resumeData: parsed.data,
          typstCode: snap.typstCode,
          templateId: typeof snap.templateId === 'string' ? snap.templateId : fallback.templateId,
        },
      };
    }
  }
  return best?.snap ?? fallback;
}

/** True when an error is a Postgres unique-violation (sequence_num collision). */
function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  if (code === '23505') return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /uk_agent_messages_thread_seq|duplicate key/i.test(msg);
}

/**
 * Resolve an owner-checked, succeeded generation job to use as a thread anchor.
 * Throws NotFound for a missing/cross-user job (existence stays hidden) and
 * ValidationError if the resume hasn't finished generating.
 */
async function resolveAnchorJob(userId: string, generationJobId: string) {
  const [job] = await db
    .select({
      id: generationJobs.id,
      userId: generationJobs.userId,
      status: generationJobs.status,
      title: generationJobs.title,
      result: generationJobs.result,
    })
    .from(generationJobs)
    .where(eq(generationJobs.id, generationJobId))
    .limit(1);
  if (!job || job.userId !== userId) throw new NotFoundError('Resume not found');
  // Require a succeeded job whose result actually carries an editable baseline
  // (parsed resumeData + a rendered typstCode). This rejects a malformed-but-
  // truthy result (e.g. `{}`) at anchor time rather than failing later in
  // latestResumeSnapshot — so a thread can never be opened/anchored to a resume
  // it can't actually edit.
  const result = (job.result ?? null) as JobResult | null;
  // Don't trust the stored JSONB blindly: require a succeeded job whose result
  // carries a STRUCTURALLY VALID baseline (resumeData parses, typstCode is a
  // string). Rejects a malformed-but-truthy result (e.g. { resumeData: {} }) at
  // anchor time rather than returning an invalid snapshot later. No size cap here
  // — the baseline is our own pipeline output, not client input.
  if (
    job.status !== 'succeeded' ||
    !result ||
    typeof result.typstCode !== 'string' ||
    !resumeDataSchema.safeParse(result.resumeData).success
  ) {
    throw new ValidationError('This resume is not ready to edit yet.');
  }
  return job;
}

/**
 * Open the conversational editor for a resume: return the caller's existing active
 * thread for that generation job, or create one. Idempotent on the (user, job,
 * active) tuple so repeatedly clicking "Edit with AI" reuses one conversation
 * instead of spawning duplicates.
 */
export async function getOrCreateThreadForJob(
  userId: string,
  generationJobId: string
): Promise<{ thread: ThreadSummary; created: boolean }> {
  const job = await resolveAnchorJob(userId, generationJobId);

  const findActive = async () =>
    (
      await db
        .select(THREAD_COLUMNS)
        .from(agentThreads)
        .where(
          and(
            eq(agentThreads.userId, userId),
            eq(agentThreads.generationJobId, generationJobId),
            eq(agentThreads.status, 'active')
          )
        )
        .orderBy(desc(agentThreads.updatedAt))
        .limit(1)
    )[0];

  const existing = await findActive();
  if (existing) return { thread: existing, created: false };

  // Insert race-safely: the partial unique index on active (user_id,
  // generation_job_id) makes a concurrent second open a no-op (onConflictDoNothing
  // returns no row); we then reload the winner instead of spawning a duplicate.
  const [created] = await db
    .insert(agentThreads)
    .values({
      userId,
      generationJobId,
      title: deriveThreadTitle(job as { title: string | null; result: JobResult | null }),
      status: 'active',
      messageCount: 0,
    })
    .onConflictDoNothing()
    .returning(THREAD_COLUMNS);
  if (created) return { thread: created, created: true };

  const winner = await findActive();
  if (winner) return { thread: winner, created: false };
  // Extremely unlikely: conflict on a non-active row. Surface a clean error
  // rather than a silent null.
  throw new ValidationError('Could not open a conversation for this resume.');
}

const THREAD_COLUMNS = {
  id: agentThreads.id,
  title: agentThreads.title,
  status: agentThreads.status,
  generationJobId: agentThreads.generationJobId,
  messageCount: agentThreads.messageCount,
  lastMessageAt: agentThreads.lastMessageAt,
  createdAt: agentThreads.createdAt,
  updatedAt: agentThreads.updatedAt,
} as const;

/** List the caller's threads, most-recently-active first. */
export async function listThreads(userId: string): Promise<ThreadSummary[]> {
  return db
    .select(THREAD_COLUMNS)
    .from(agentThreads)
    .where(eq(agentThreads.userId, userId))
    .orderBy(desc(agentThreads.updatedAt))
    .limit(LIST_MAX);
}

/**
 * Fetch a single owner-scoped thread. Throws NotFound for a missing row OR one
 * owned by another user (existence stays hidden).
 */
export async function getThread(userId: string, id: string): Promise<ThreadSummary> {
  const [row] = await db
    .select(THREAD_COLUMNS)
    .from(agentThreads)
    .where(and(eq(agentThreads.id, id), eq(agentThreads.userId, userId)))
    .limit(1);
  // Scoping by (id, userId) means a missing row covers both "no such thread" and
  // "owned by another user" — existence stays hidden either way (NotFound).
  if (!row) throw new NotFoundError('Conversation not found');
  return row;
}

/** Load a thread's messages in sequence order (owner-scoped via getThread). */
export async function loadHistory(userId: string, threadId: string): Promise<StoredMessage[]> {
  await getThread(userId, threadId);
  return db
    .select({
      id: agentMessages.id,
      role: agentMessages.role,
      content: agentMessages.content,
      toolName: agentMessages.toolName,
      toolArgs: agentMessages.toolArgs,
      toolResult: agentMessages.toolResult,
      sequenceNum: agentMessages.sequenceNum,
      createdAt: agentMessages.createdAt,
    })
    .from(agentMessages)
    .where(eq(agentMessages.threadId, threadId))
    .orderBy(asc(agentMessages.sequenceNum))
    .limit(MESSAGE_LIST_MAX);
}

/**
 * Resolve the current working resume for a thread: the latest snapshot stored on
 * an assistant message, or the anchor job's baseline. Owner-scoped (throws
 * NotFound for a non-owner). Throws ValidationError if the thread's anchor job is
 * gone (the resume was deleted) so the caller can surface a clean error.
 */
export async function latestResumeSnapshot(userId: string, threadId: string): Promise<ResumeSnapshot> {
  const thread = await getThread(userId, threadId);
  if (!thread.generationJobId) {
    throw new ValidationError('The resume this conversation edited is no longer available.');
  }
  const [job] = await db
    .select({ userId: generationJobs.userId, result: generationJobs.result })
    .from(generationJobs)
    .where(eq(generationJobs.id, thread.generationJobId))
    .limit(1);
  if (!job || job.userId !== userId) {
    throw new ValidationError('The resume this conversation edited is no longer available.');
  }
  const result = (job.result ?? {}) as JobResult;
  // Validate the baseline (don't trust the stored JSONB blindly) and build the
  // fallback from the parsed data, matching pickLatestSnapshot's read-side rigor.
  const parsedBaseline = resumeDataSchema.safeParse(result.resumeData);
  if (!parsedBaseline.success || typeof result.typstCode !== 'string') {
    throw new ValidationError('This resume is not ready to edit yet.');
  }
  const fallback: ResumeSnapshot = {
    resumeData: parsedBaseline.data,
    typstCode: result.typstCode,
    templateId: typeof result.templateId === 'string' ? result.templateId : 'two-column',
  };
  // Query the most recent SNAPSHOT-BEARING assistant messages directly
  // (descending). The `toolResult IS NOT NULL` filter excludes text-only assistant
  // turns, so a long no-edit chat can't push the real latest snapshot out of the
  // window; and querying descending (not oldest-N via loadHistory) means a thread
  // past MESSAGE_LIST_MAX still reopens from the newest snapshot.
  const recentSnapshots = await db
    .select({ role: agentMessages.role, toolResult: agentMessages.toolResult, sequenceNum: agentMessages.sequenceNum })
    .from(agentMessages)
    .where(
      and(
        eq(agentMessages.threadId, threadId),
        eq(agentMessages.role, 'assistant'),
        isNotNull(agentMessages.toolResult)
      )
    )
    .orderBy(desc(agentMessages.sequenceNum))
    .limit(SNAPSHOT_SCAN_LIMIT);
  return pickLatestSnapshot(recentSnapshots, fallback);
}

/**
 * Persist all messages of a completed turn as one atomic, sequentially-numbered
 * batch, then refresh the thread's message_count / last_message_at. Owner-scoped
 * (throws NotFound for a non-owner). Sequence numbers are assigned MAX+1.. and the
 * multi-row insert is a single statement, so a turn is all-or-nothing; a
 * concurrent same-thread turn that collides on the unique (thread, seq) index is
 * retried at the next sequence. No billing — this is pure storage.
 */
export async function appendTurn(
  userId: string,
  threadId: string,
  messages: TurnMessageInput[]
): Promise<StoredMessage[]> {
  if (messages.length === 0) return [];
  await getThread(userId, threadId);
  assertTurnBounds(messages);

  // The multi-row insert is a SINGLE statement, so a turn is atomic: it persists
  // entirely or not at all (no partial turn). On a sequence-number collision with
  // a concurrent same-thread turn the whole insert is retried at the next free
  // sequence — never a half-written turn.
  let inserted: StoredMessage[] | null = null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_SEQ_RETRIES; attempt++) {
    try {
      inserted = await insertMessagesAtNextSequence(threadId, messages);
      break;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      lastErr = err;
    }
  }
  if (!inserted) throw lastErr;

  // Refresh thread metadata best-effort: message_count is recomputed from the
  // rows (self-healing — a missed update is corrected by the next turn), so a
  // failure here must NOT make a fully-persisted turn look failed (which could
  // trigger a spurious retry / duplicate turn).
  try {
    await db
      .update(agentThreads)
      .set({
        messageCount: sql`(SELECT COUNT(*) FROM ${agentMessages} WHERE ${agentMessages.threadId} = ${threadId})`,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(agentThreads.id, threadId), eq(agentThreads.userId, userId)));
  } catch {
    // Swallow: the messages are durably persisted; metadata self-heals next turn.
  }
  return inserted;
}

/** Read the current MAX(sequence_num) and insert the batch at MAX+1.. (one statement). */
async function insertMessagesAtNextSequence(
  threadId: string,
  messages: TurnMessageInput[]
): Promise<StoredMessage[]> {
  const [{ max }] = await db
    .select({ max: sql<number>`COALESCE(MAX(${agentMessages.sequenceNum}), 0)` })
    .from(agentMessages)
    .where(eq(agentMessages.threadId, threadId));
  const base = Number(max);
  const rows = messages.map((m, i) => ({
    threadId,
    role: m.role,
    content: m.content,
    toolName: m.toolName ?? null,
    toolArgs: m.toolArgs ?? null,
    toolResult: m.toolResult ?? null,
    sequenceNum: base + i + 1,
  }));
  return db.insert(agentMessages).values(rows).returning({
    id: agentMessages.id,
    role: agentMessages.role,
    content: agentMessages.content,
    toolName: agentMessages.toolName,
    toolArgs: agentMessages.toolArgs,
    toolResult: agentMessages.toolResult,
    sequenceNum: agentMessages.sequenceNum,
    createdAt: agentMessages.createdAt,
  });
}

/**
 * Re-anchor a thread to a newer generation job (after "Save as version" creates a
 * new resume version) so the conversation's baseline tracks the latest saved
 * version and the chain stays linear. Owner-scoped on both the thread and the new
 * job; a non-owner job is silently ignored (no cross-user link, no leak).
 */
export async function setThreadAnchor(userId: string, threadId: string, generationJobId: string): Promise<void> {
  await getThread(userId, threadId);
  // Owner + succeeded + has-result check: never anchor to a cross-user, queued,
  // failed, or malformed job (which would break latestResumeSnapshot later).
  await resolveAnchorJob(userId, generationJobId);
  await db
    .update(agentThreads)
    .set({ generationJobId, updatedAt: new Date() })
    .where(and(eq(agentThreads.id, threadId), eq(agentThreads.userId, userId)));
}
