import { ResumeData } from "@/lib/validation/schema";
import { ParsedJD } from "./jd-parser";
import { computeKeywordCoverage, resumeKeywordHaystack } from "./keyword-coverage";

/**
 * Deterministic ATS score result surfaced downstream.
 *
 * Only the headline `overallScore` and the keyword breakdown are consumed by the
 * pipeline / wire result, so that is all this carries. Previously an LLM produced
 * a richer qualitative report, but every field of it was discarded downstream
 * once a JD was present (always, in the pipeline) — the headline score was always
 * overridden by the deterministic keyword coverage below. The LLM call was pure
 * waste (latency + cost + a discarded schema), so it was removed.
 */
export interface ATSScoreResult {
  /** 0-100, identical to `keywords.score`; the number the user sees. */
  overallScore: number;
  keywords: {
    found: string[];
    missing: string[];
    score: number;
  };
}

/**
 * Score a resume against a target JD using deterministic keyword coverage.
 *
 * The score is the fraction of JD keywords + required skills that appear in the
 * resume text (see keyword-coverage.ts) — fully reproducible: the same input
 * always yields the same number. This is exactly the value the old LLM-based
 * scorer's output was overridden with, so behavior downstream is unchanged.
 *
 * @param resume The (tailored) resume to score.
 * @param jd The parsed target job description.
 * @returns The deterministic overall score and keyword breakdown.
 */
export function scoreATSDeterministic(resume: ResumeData, jd: ParsedJD): ATSScoreResult {
  const coverage = computeKeywordCoverage(resumeKeywordHaystack(resume), [
    ...jd.keywords,
    ...jd.requiredSkills,
  ]);

  return {
    overallScore: coverage.score,
    keywords: {
      found: coverage.found,
      missing: coverage.missing,
      score: coverage.score,
    },
  };
}
