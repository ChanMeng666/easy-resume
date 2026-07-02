/**
 * Conversational resume-editing agent core (P2-1).
 *
 * runEditTurn drives a BOUNDED tool-calling loop (AI SDK v6): the model edits a
 * working ResumeData through the controlled tool set, and the resume is
 * deterministically re-rendered after each edit. Transport-agnostic and
 * dependency-injected — the SSE route is a thin caller and tests inject a fake
 * model (no network, no DB). NO billing happens here: editing is free; the sole
 * charge site stays the post-compile call in runGenerationPipeline.
 *
 * Bounds: `stopWhen: stepCountIs(maxSteps)` caps the loop; `maxRetries: 0` leaves
 * retry policy to the caller (no SDK×caller compounding). Tool inputs are
 * zod-validated + sanitized + render-bounded inside editTools.
 */

import 'server-only';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { reasonModel, WRITING_TEMPERATURE } from '@/lib/agent/models';
import { aiTelemetry } from '@/lib/agent/telemetry';
import { PROMPT_VERSIONS } from '@/lib/agent/prompt-registry';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';
import { getTemplateById } from '@/templates/registry';
import { sanitizeForPrompt } from '@/server/core/sanitize';
import type { ResumeData } from '@/lib/validation/schema';
import { buildEditTools, type EditContext } from './editTools';
import { buildEditSystemPrompt } from './prompts';
import type {
  EditAgentDeps,
  RecordedToolCall,
  RunEditTurnArgs,
  RunEditTurnResult,
} from './editAgent.types';

const DEFAULT_MAX_STEPS = 8;
// Absolute ceiling on steps per turn regardless of caller input — a hard backstop
// on token/cost even if a caller passes a large maxSteps.
const MAX_STEPS_CEILING = 16;

/** Clamp the per-turn step cap to a sane positive integer (stepCountIs is exact
 * equality, so 0/negative/NaN would silently disable the cap → unbounded loop). */
function resolveMaxSteps(requested: number | undefined): number {
  if (requested === undefined || !Number.isInteger(requested) || requested < 1) return DEFAULT_MAX_STEPS;
  return Math.min(requested, MAX_STEPS_CEILING);
}

/** Deterministic ResumeData → Typst renderer (template generator, or base). */
export function defaultEditRender(data: ResumeData, templateId: string): string {
  const template = getTemplateById(templateId);
  return template ? template.generator(data) : generateTypstCode(data);
}

/** Default DI for production: real model + deterministic renderers. */
export function defaultEditAgentDeps(overrides?: Partial<EditAgentDeps>): EditAgentDeps {
  return { model: reasonModel, render: defaultEditRender, renderCoverLetter: generateCoverLetterTypst, ...overrides };
}

/**
 * Run one edit turn: feed the user's instruction (+ prior turns) to the model,
 * let it call edit tools, and return the resulting resume + re-rendered Typst +
 * the assistant reply. Streams events via deps.onEvent as the loop runs.
 */
export async function runEditTurn(args: RunEditTurnArgs, deps: EditAgentDeps): Promise<RunEditTurnResult> {
  const { baseResume, templateId, history, userMessage, signal } = args;
  const baseCoverLetter = args.baseCoverLetter ?? '';

  const ctx: EditContext = {
    resume: baseResume,
    templateId,
    typstCode: deps.render(baseResume, templateId),
    changed: false,
    version: 0,
    coverLetter: baseCoverLetter,
    // Trust the caller's rendered letter Typst when supplied; otherwise re-render
    // from the body so the working state is always consistent (empty stays '').
    coverLetterTypst: baseCoverLetter
      ? args.baseCoverLetterTypst ?? (deps.renderCoverLetter ?? generateCoverLetterTypst)(baseCoverLetter, baseResume)
      : '',
    coverLetterChanged: false,
    coverLetterVersion: 0,
  };
  const tools = buildEditTools(ctx, deps);
  const maxSteps = resolveMaxSteps(deps.maxSteps);
  const onEvent = deps.onEvent;
  const toolCalls: RecordedToolCall[] = [];
  let lastEmittedVersion = 0;
  let lastEmittedCoverLetterVersion = 0;

  // Replay prior turns as text-only messages (the live resume state is injected
  // into the system prompt, so tool history need not be replayed). Sanitize all
  // user-authored text before it reaches the model.
  const messages: ModelMessage[] = [];
  for (const h of history) {
    messages.push({ role: h.role, content: sanitizeForPrompt(h.content) });
  }
  messages.push({ role: 'user', content: sanitizeForPrompt(userMessage) });

  // streamText surfaces stream-level failures via onError (they are not thrown
  // into the tool loop); capture the first one so runEditTurn still REJECTS on a
  // mid-stream LLM failure exactly like the old generateText call did.
  let streamError: unknown;

  const result = streamText({
    model: deps.model,
    system: buildEditSystemPrompt(baseResume, baseCoverLetter),
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    // The caller owns retry policy; never let the SDK add its own (compounding) retries.
    maxRetries: 0,
    temperature: WRITING_TEMPERATURE,
    abortSignal: signal,
    experimental_telemetry: aiTelemetry('edit-agent', { promptVersion: PROMPT_VERSIONS['edit-agent'] }),
    onError: ({ error }) => {
      streamError = streamError ?? error;
    },
    // Token-level streaming: forward each text delta as it arrives. The client
    // APPENDS `text` events into the current assistant bubble, so finer-grained
    // events need zero client changes — the user sees the reply typed out live
    // instead of one block per step. (Within a step this means text now renders
    // in true generation order — before that step's tool chips — which matches
    // how the model actually produced it.)
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta' && chunk.text) {
        onEvent?.({ type: 'text', text: chunk.text });
      }
    },
    onStepFinish: (step) => {
      // Iterate the step's content parts so BOTH successful tool results AND tool
      // errors (invalid inputs / thrown tools surface as 'tool-error' in v6, NOT
      // in step.toolResults) are streamed and recorded — a malformed call is never
      // silently dropped.
      for (const part of step.content) {
        if (part.type === 'tool-call') {
          onEvent?.({ type: 'tool-call', toolName: part.toolName, toolArgs: part.input });
        } else if (part.type === 'tool-result') {
          onEvent?.({ type: 'tool-result', toolName: part.toolName, toolResult: part.output });
          toolCalls.push({ toolName: part.toolName, args: part.input, result: part.output });
        } else if (part.type === 'tool-error') {
          const message = part.error instanceof Error ? part.error.message : String(part.error);
          onEvent?.({ type: 'tool-result', toolName: part.toolName, toolResult: { error: message } });
          toolCalls.push({ toolName: part.toolName, args: part.input, result: { error: message } });
        }
      }
      // One resume snapshot per step that actually changed the resume — emitted
      // AFTER the tool events so the transcript order is call → result → resume.
      if (ctx.version > lastEmittedVersion) {
        lastEmittedVersion = ctx.version;
        onEvent?.({ type: 'resume', resumeData: ctx.resume, typstCode: ctx.typstCode, templateId: ctx.templateId });
      }
      // Same, independently, for the cover letter: one snapshot per step that
      // changed the letter (a letter edit never emits a `resume` event).
      if (ctx.coverLetterVersion > lastEmittedCoverLetterVersion) {
        lastEmittedCoverLetterVersion = ctx.coverLetterVersion;
        onEvent?.({ type: 'cover-letter', coverLetter: ctx.coverLetter, coverLetterTypst: ctx.coverLetterTypst });
      }
      // NOTE: step text is NOT emitted here — deltas already streamed via onChunk.
    },
  });

  // Awaiting the final text drains the stream (running the tool loop to
  // completion). It rejects on abort; a swallowed-into-the-stream LLM error is
  // re-thrown via the onError capture so failures behave exactly as before.
  const assistantText = await result.text;
  if (streamError) throw streamError;

  return {
    assistantText,
    toolCalls,
    resumeData: ctx.resume,
    typstCode: ctx.typstCode,
    changed: ctx.changed,
    coverLetter: ctx.coverLetter,
    coverLetterTypst: ctx.coverLetterTypst,
    coverLetterChanged: ctx.coverLetterChanged,
  };
}
