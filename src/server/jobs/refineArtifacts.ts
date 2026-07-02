/**
 * Build a refinement's input artifacts from a persisted parent job.
 *
 * A refine operates on a previous generation's stored wire result (see
 * `toWireResult`) plus its stored input. This is the single pure mapping from
 * "what the DB holds for the parent" to the `RefineArtifacts` the refinement
 * core consumes — extracted from the route so it is unit-testable against the
 * shapes older jobs actually carry:
 *  - jobs stored before parsedJD persistence (no `parsedJD` → core re-parses),
 *  - manual/edited versions with no cover letter (`coverLetter` absent → ''),
 *  - jobs stored before a templateId was recorded (falls back to the base
 *    two-column template).
 */

import 'server-only';
import { ValidationError } from '@/server/errors/AppError';
import type { RefineArtifacts } from '@/server/core/refine';
import type { ResumeData } from '@/lib/validation/schema';
import type { ParsedJD } from '@/lib/agent/jd-parser';
import type { MatchSummary } from '@/server/core/pipeline.types';

/** Default template when a parent row predates templateId persistence. */
const DEFAULT_TEMPLATE_ID = 'two-column';

/** The subset of a stored job's `input` a refinement reads. */
export interface ParentJobInput {
  jobDescription?: string;
}

/**
 * The subset of a stored job's wire `result` a refinement reads. Everything
 * except `resumeData` is optional so old/manual rows map cleanly.
 */
export interface ParentJobResult {
  resumeData?: ResumeData;
  parsedJD?: ParsedJD;
  coverLetter?: string;
  templateId?: string;
  matchAnalysis?: MatchSummary;
}

/**
 * Map a parent job's stored input + wire result into `RefineArtifacts`.
 *
 * @throws ValidationError when the parent result has no resume data (a job that
 *   never produced a real artifact must not be refined).
 */
export function buildRefineArtifacts(
  parentInput: ParentJobInput,
  parentResult: ParentJobResult
): RefineArtifacts {
  const resumeData = parentResult.resumeData;
  if (!resumeData) {
    throw new ValidationError('This resume is not ready to refine yet.');
  }

  return {
    resumeData,
    // Absent on jobs stored before parsedJD persistence — the core re-parses
    // `jobDescription` once in that case (folded into the revise step).
    parsedJD: parentResult.parsedJD,
    coverLetter: parentResult.coverLetter ?? '',
    templateId: parentResult.templateId ?? DEFAULT_TEMPLATE_ID,
    jobDescription: parentInput.jobDescription ?? '',
    // Carried through unchanged when present; the core synthesizes one from the
    // ATS re-score when absent.
    matchAnalysis: parentResult.matchAnalysis,
  };
}
