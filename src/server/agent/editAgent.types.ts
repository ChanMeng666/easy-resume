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
import type { DesignTokens } from '@/lib/design/tokens';
import type { Logger } from '@/server/log/logger';

/** A prior conversation turn replayed to the model (text only). */
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * A streamed event from a turn. Consumed by the SSE route (PR3) to update the
 * chat transcript + live PDF; `resume` carries the re-rendered working resume
 * after a successful edit and `cover-letter` the re-rendered working cover letter
 * (the two artifacts are tracked independently — a letter edit never emits a
 * `resume` event and vice versa).
 */
export type EditEvent =
  | { type: 'tool-call'; toolName: string; toolArgs: unknown }
  | { type: 'tool-result'; toolName: string; toolResult: unknown }
  | { type: 'resume'; resumeData: ResumeData; typstCode: string; templateId: string }
  | { type: 'cover-letter'; coverLetter: string; coverLetterTypst: string }
  | { type: 'text'; text: string };

export type EditEventSink = (event: EditEvent) => void;

/** Injected dependencies — fakeable in tests (no network, no DB, no billing). */
export interface EditAgentDeps {
  /** The language model driving the tool loop (default: reasonModel). */
  model: LanguageModel;
  /**
   * Deterministic ResumeData → Typst renderer (default: template/base generator).
   * `tokens` carries the resume's palette so an edit re-renders in the same colors
   * it was generated with; optional so resume-only callers/tests can omit it
   * (falls back to DEFAULT_TOKENS = today's look).
   */
  render: (data: ResumeData, templateId: string, tokens?: DesignTokens) => string;
  /**
   * Deterministic cover-letter → Typst renderer (default: generateCoverLetterTypst).
   * Optional so existing resume-only callers/tests need not supply it; the letter
   * tools fall back to the default when it is absent.
   */
  renderCoverLetter?: (letterText: string, data: ResumeData) => string;
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
  /**
   * The design tokens the resume was rendered with (palette + density). Threaded
   * so every re-render in the turn reproduces the original palette; optional for
   * backward compatibility (falls back to DEFAULT_TOKENS).
   */
  tokens?: DesignTokens;
  /**
   * The current working cover letter body ('' when the anchored resume has no
   * cover letter). Seeds the letter tools so an edit turn can build on prior
   * letter edits; optional for backward compatibility with resume-only callers.
   */
  baseCoverLetter?: string;
  /** The rendered Typst for `baseCoverLetter` ('' when there is no letter). */
  baseCoverLetterTypst?: string;
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
  /**
   * The cover letter after all edits — always the current working letter (the
   * unchanged baseline when no letter edit was made, '' when there is no letter).
   * Callers persist this so the letter survives across turns even when a turn only
   * touched the resume.
   */
  coverLetter: string;
  /** The re-rendered Typst for `coverLetter` ('' when there is no letter). */
  coverLetterTypst: string;
  /** Whether any tool actually changed the cover letter this turn. */
  coverLetterChanged: boolean;
}
