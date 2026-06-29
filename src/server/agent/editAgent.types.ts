/**
 * Types for the conversational resume-editing agent (P2-1).
 *
 * The agent runs a bounded tool-calling loop: the model edits a working
 * ResumeData via a fixed set of structured tools, and the resume is
 * deterministically re-rendered after each edit. No billing happens here — edits
 * are free (the only charge site stays the post-compile call in the pipeline).
 */

import type { LanguageModel } from 'ai';
import type { ResumeData } from '@/lib/validation/schema';
import type { Logger } from '@/server/log/logger';

/** A prior conversation turn replayed to the model (text only). */
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * A streamed event from a turn. Consumed by the SSE route (PR3) to update the
 * chat transcript + live PDF; `resume` carries the re-rendered working resume
 * after a successful edit.
 */
export type EditEvent =
  | { type: 'tool-call'; toolName: string; toolArgs: unknown }
  | { type: 'tool-result'; toolName: string; toolResult: unknown }
  | { type: 'resume'; resumeData: ResumeData; typstCode: string; templateId: string }
  | { type: 'text'; text: string };

export type EditEventSink = (event: EditEvent) => void;

/** Injected dependencies — fakeable in tests (no network, no DB, no billing). */
export interface EditAgentDeps {
  /** The language model driving the tool loop (default: reasonModel). */
  model: LanguageModel;
  /** Deterministic ResumeData → Typst renderer (default: template/base generator). */
  render: (data: ResumeData, templateId: string) => string;
  /** Optional per-event sink for streaming (SSE route). */
  onEvent?: EditEventSink;
  /** Optional structured logger. */
  logger?: Logger;
  /** Hard cap on model steps per turn (default: 8). Bounds the loop / token spend. */
  maxSteps?: number;
}

export interface RunEditTurnArgs {
  /** The current working resume to edit. */
  baseResume: ResumeData;
  /** The template the resume renders with. */
  templateId: string;
  /** Prior conversation (text turns) for context. */
  history: HistoryMessage[];
  /** The user's new instruction. */
  userMessage: string;
  /** Optional abort signal (client disconnect). */
  signal?: AbortSignal;
}

/** A single tool invocation recorded during a turn. */
export interface RecordedToolCall {
  toolName: string;
  args: unknown;
  result: unknown;
}

export interface RunEditTurnResult {
  /** The assistant's final natural-language reply. */
  assistantText: string;
  /** Every tool call made during the turn (for persistence + UI). */
  toolCalls: RecordedToolCall[];
  /** The resume after all edits (unchanged baseline if no edit was made). */
  resumeData: ResumeData;
  /** The re-rendered Typst for `resumeData`. */
  typstCode: string;
  /** Whether any tool actually changed the resume. */
  changed: boolean;
}
