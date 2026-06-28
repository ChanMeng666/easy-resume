/**
 * Types for the transport-agnostic resume generation pipeline.
 *
 * The pipeline core knows nothing about HTTP, SSE, or jobs. Transports adapt to
 * it via `onProgress` (push progress to a stream, or ignore it) and consume the
 * returned `GenerateResult`.
 */

import type { ResumeData } from '@/lib/validation/schema';
import type { PipelineStep } from '@/server/errors/AppError';
import type { Logger } from '@/server/log/logger';
import type { BillingMeter } from '@/server/billing/meter';

/** Caller identity resolved from a cookie session or an API key. */
export interface Caller {
  userId: string;
  via: 'session' | 'api_key';
  apiKeyId?: string;
}

/** Raw input to the pipeline. */
export interface GenerateInput {
  jobDescription: string;
  background: string;
  /** Optional explicit template override; otherwise auto-selected from the JD. */
  templateId?: string;
  /**
   * Optional pre-parsed background, supplied when generating from a saved
   * candidate profile. When present the pipeline reuses it as the base resume
   * and SKIPS the parse_background LLM step ("enter once, reuse many"). Purely
   * additive — the money path (compile-then-charge, jobId-keyed) is unchanged.
   */
  baseResume?: ResumeData;
  /** The saved candidate_profile id that seeded this generation, if any. */
  profileId?: string;
}

/** Progress event emitted before each step runs. */
export interface ProgressEvent {
  step: PipelineStep;
  index: number;
  total: number;
  message: string;
}

/** Compact match summary surfaced to the client. */
export interface MatchSummary {
  overallScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/** Outcome of the billing step. */
export interface UsageResult {
  charged: boolean;
  credits: number;
  transactionId?: string;
}

/** Full successful pipeline result, including the billable PDF bytes. */
export interface GenerateResult {
  resumeData: ResumeData;
  typstCode: string;
  coverLetter: string;
  coverLetterTypst: string;
  atsScore: number;
  matchAnalysis: MatchSummary;
  templateId: string;
  pdf: Uint8Array;
  usage: UsageResult;
}

/**
 * Dependencies injected into the pipeline. Real implementations come from
 * `defaultDeps()`; tests inject fakes.
 */
export interface PipelineDeps {
  agent: {
    parseJobDescription: typeof import('@/lib/agent/jd-parser').parseJobDescription;
    parseBackground: typeof import('@/lib/agent/background-parser').parseBackground;
    analyzeMatch: typeof import('@/lib/agent/matching-engine').analyzeMatch;
    tailorResume: typeof import('@/lib/agent/resume-tailor').tailorResume;
    scoreATS: typeof import('@/lib/agent/ats-scorer').scoreATS;
    generateCoverLetter: typeof import('@/lib/agent/cover-letter').generateCoverLetter;
    selectTemplate: typeof import('@/lib/agent/template-selector').selectTemplate;
  };
  render: {
    getTemplateById: typeof import('@/templates/registry').getTemplateById;
    generateTypstCode: typeof import('@/lib/typst/generator').generateTypstCode;
    generateCoverLetterTypst: typeof import('@/lib/typst/cover-letter').generateCoverLetterTypst;
  };
  /** Compile Typst source into PDF bytes (server-side; the billable artifact). */
  compile: (typstCode: string) => Promise<Uint8Array>;
  meter: BillingMeter;
  logger: Logger;
  /** Optional transport hook; SSE streams it, REST ignores it. */
  onProgress?: (e: ProgressEvent) => void;
}

export interface RunOptions {
  /** Dedupes both retries and the credit charge. */
  idempotencyKey: string;
}
