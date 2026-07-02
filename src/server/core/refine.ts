/**
 * Targeted copy-refinement pipeline core (transport-agnostic).
 *
 * The generation pipeline runs 8 steps and four sequential reason-tier waves.
 * A refinement doesn't need any of that: the resume is already tailored to the
 * job and the artifacts already exist. Given the previous generation's artifacts
 * + first-class user feedback + an explicit scope, this runs ONE parallel
 * reason-tier wave (revise the resume and/or the cover letter) → deterministic
 * ATS re-score → render → compile.
 *
 * Same two commitments as `runGenerationPipeline`:
 *  1. "API is the UI": no HTTP/SSE here. Progress is pushed via `deps.onProgress`.
 *  2. "Sell results": the PDF is compiled server-side and billing (when enabled)
 *     happens exactly once, only after the PDF exists. Refinement is FREE by
 *     default (`REFINE_COST_CREDITS = 0`); the charge path is implemented and
 *     tested behind that constant so flipping it to 1 starts charging.
 */

import 'server-only';
import { z } from 'zod';
import { checkFaithfulness } from '@/lib/agent/faithfulness-check';
import { PROMPT_VERSIONS } from '@/lib/agent/prompt-registry';
import type { ParsedJD } from '@/lib/agent/jd-parser';
import type { ResumeData } from '@/lib/validation/schema';
import { sanitizeForPrompt, sanitizeDeep } from './sanitize';
import { makeStepRunner } from './step';
import { InsufficientCreditsError, ValidationError } from '@/server/errors/AppError';
import type { BillingMeter } from '@/server/billing/meter';
import type { Logger } from '@/server/log/logger';
import type {
  Caller,
  GenerateResult,
  MatchSummary,
  ProgressEvent,
  UsageResult,
} from './pipeline.types';

/**
 * Cost in credits for a single successful refinement result.
 *
 * Product decision (P1): refinement is FREE for now — a paid generation already
 * bought the first PDF, and letting the user nudge the wording without a fresh
 * charge is what makes "refine" feel unlike a re-generate. Flip to 1 to charge
 * (the whole charge path below is already wired and tested behind this constant).
 */
export const REFINE_COST_CREDITS = 0;

/** Total client-facing progress steps: revise → score → render → compile. */
const TOTAL_STEPS = 4;

/** Max feedback length accepted (after trim). Guards prompt size + abuse. */
const MAX_FEEDBACK_LEN = 8000;

/**
 * The previous generation's artifacts a refinement operates on. Everything here
 * is read from a persisted `generation_job` result (see toWireResult).
 */
export interface RefineArtifacts {
  resumeData: ResumeData;
  /**
   * The parsed JD that drove the original generation. Absent on jobs stored
   * before parsedJD persistence — the pipeline re-parses `jobDescription` once in
   * that case (folded into the revise step, still 4 progress events total).
   */
  parsedJD?: ParsedJD;
  coverLetter: string;
  templateId: string;
  /** Raw JD text, used only for the parse fallback when `parsedJD` is absent. */
  jobDescription: string;
  /**
   * The original match summary. Carried through unchanged when present; when
   * absent it is synthesized deterministically from the ATS re-score so the
   * returned `GenerateResult.matchAnalysis` (a required field) is always valid.
   */
  matchAnalysis?: MatchSummary;
}

/** Which artifact(s) the refinement touches. */
export type RefineScope = 'resume' | 'cover_letter' | 'both';

/** User-supplied refinement request. */
export interface RefineInput {
  feedback: string;
  scope?: RefineScope;
}

/**
 * Dependencies injected into the refinement pipeline. Mirrors `PipelineDeps` but
 * carries only the steps a refinement needs (no parseBackground / analyzeMatch /
 * tailorResume / selectTemplate — the base resume, analysis, and template all
 * come from the artifacts). Real implementations come from `defaultRefineDeps()`;
 * tests inject fakes.
 */
export interface RefineDeps {
  agent: {
    parseJobDescription: typeof import('@/lib/agent/jd-parser').parseJobDescription;
    reviseResume: typeof import('@/lib/agent/resume-reviser').reviseResume;
    reviseCoverLetter: typeof import('@/lib/agent/cover-letter-reviser').reviseCoverLetter;
    scoreATS: typeof import('@/lib/agent/ats-scorer').scoreATSDeterministic;
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
  /** Backoff sleep for step retries; defaults to a real timer (tests inject a no-op). */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Override the refine charge amount (defaults to `REFINE_COST_CREDITS`). Lets
   * tests exercise the charge path without editing the product constant.
   */
  costCredits?: number;
}

export interface RefineOptions {
  /** Dedupes both retries and the credit charge (when charging is enabled). */
  idempotencyKey: string;
}

const inputSchema = z.object({
  feedback: z.string().trim().min(1, 'feedback is required').max(MAX_FEEDBACK_LEN, 'feedback is too long'),
  scope: z.enum(['resume', 'cover_letter', 'both']).default('resume'),
});

/**
 * Execute a targeted refinement. Returns the compiled, (optionally) billable
 * result in the same `GenerateResult` shape a full generation produces, so
 * transports and persistence handle both identically.
 *
 * @throws ValidationError          — empty/oversized feedback (no charge)
 * @throws InsufficientCreditsError — charging enabled and the caller can't pay
 * @throws PipelineStepError        — a revise/parse step failed (no charge)
 * @throws CompilationError         — Typst failed to compile (no charge)
 */
export async function runRefinementPipeline(
  artifacts: RefineArtifacts,
  rawInput: RefineInput,
  caller: Caller,
  deps: RefineDeps,
  opts: RefineOptions
): Promise<GenerateResult> {
  const log = deps.logger.child({ userId: caller.userId, via: caller.via });
  const startedAt = Date.now();
  const runStep = makeStepRunner(log, deps.sleep);
  const cost = deps.costCredits ?? REFINE_COST_CREDITS;

  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Invalid refinement input', {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const scope = parsed.data.scope;
  const includesResume = scope === 'resume' || scope === 'both';
  const includesLetter = scope === 'cover_letter' || scope === 'both';
  const feedback = sanitizeForPrompt(parsed.data.feedback);

  // Fast-fail before spending LLM calls if charging is on and the caller can't pay.
  if (cost > 0 && !(await deps.meter.hasCredits(caller.userId))) {
    throw new InsufficientCreditsError();
  }

  const progress = (step: ProgressEvent['step'], index: number, message: string) => {
    const e: ProgressEvent = { step, index, total: TOTAL_STEPS, message };
    deps.onProgress?.(e);
  };

  // ── Step 1: revise ────────────────────────────────────────────────────────
  // A refine-of-refine never re-parses (parsedJD is carried on the result). Only
  // an artifact stored before parsedJD persistence needs the one-time parse; it's
  // folded into this step so the client still sees exactly 4 progress events.
  progress('revise', 1, 'Applying your feedback...');
  let parsedJD = artifacts.parsedJD;
  const didParseJD = !parsedJD;
  if (!parsedJD) {
    parsedJD = sanitizeDeep(
      await runStep('parse_jd', () =>
        deps.agent.parseJobDescription(sanitizeForPrompt(artifacts.jobDescription))
      )
    );
  }
  const jd = parsedJD;

  // ONE parallel reason-tier wave: revise resume ∥ revise cover letter. Each side
  // is skipped (passed through unchanged) when out of scope. The letter revision
  // grounds on the ORIGINAL resume — both run concurrently, so the revised resume
  // isn't available yet, and grounding on the base is the correct, stable choice.
  const [maybeResume, maybeLetter] = await Promise.all([
    includesResume
      ? runStep('revise_resume', () => deps.agent.reviseResume(artifacts.resumeData, jd, feedback))
      : Promise.resolve<ResumeData>(artifacts.resumeData),
    includesLetter
      ? runStep('revise_cover_letter', () =>
          deps.agent.reviseCoverLetter(artifacts.coverLetter, artifacts.resumeData, jd, feedback)
        )
      : Promise.resolve<string>(artifacts.coverLetter),
  ]);

  // Only sanitize LLM-produced output; passthrough values keep their identity so
  // an out-of-scope artifact is returned byte-for-byte unchanged.
  let finalResume = includesResume ? sanitizeDeep(maybeResume) : artifacts.resumeData;
  const finalLetter = maybeLetter;

  // Grounding gate (resume scope only): a revision can drift into inventing
  // skills/employers. Verify the revised resume stays faithful to the ORIGINAL;
  // if it fabricated facts, run exactly one corrective revise pass with the
  // violations as correction notes — mirrors the generation pipeline's loop.
  if (includesResume) {
    const faithfulness = checkFaithfulness(artifacts.resumeData, finalResume);
    if (!faithfulness.isFaithful) {
      log.warn('refine.faithfulness.violations', {
        count: faithfulness.violations.length,
        fields: faithfulness.violations.map((v) => v.field),
      });
      finalResume = sanitizeDeep(
        await runStep('revise_resume', () =>
          deps.agent.reviseResume(artifacts.resumeData, jd, feedback, faithfulness.feedback)
        )
      );
    }
  }

  // ── Step 2: score ATS ──────────────────────────────────────────────────────
  // Deterministic (pure keyword coverage, no LLM) — no runStep retry wrapper.
  progress('score_ats', 2, 'Re-scoring ATS compatibility...');
  const atsReport = deps.agent.scoreATS(finalResume, jd);

  // Carry the original match summary through when present; otherwise synthesize a
  // valid one from the deterministic re-score so the required field is always set.
  const matchAnalysis: MatchSummary = artifacts.matchAnalysis ?? {
    overallScore: atsReport.overallScore,
    matchedSkills: atsReport.keywords.found,
    missingSkills: atsReport.keywords.missing,
  };

  // ── Step 3: render ─────────────────────────────────────────────────────────
  progress('render', 3, 'Regenerating your document...');
  const { typstCode, coverLetterTypst } = await runStep('render', async () => {
    const template = deps.render.getTemplateById(artifacts.templateId);
    const code = template
      ? template.generator(finalResume)
      : deps.render.generateTypstCode(finalResume);
    const letterCode = deps.render.generateCoverLetterTypst(finalLetter, finalResume);
    return { typstCode: code, coverLetterTypst: letterCode };
  });

  // ── Step 4: compile ────────────────────────────────────────────────────────
  progress('compile', 4, 'Compiling your PDF...');
  const pdf = await deps.compile(typstCode);

  // Billing: only when the product constant (or a test override) enables it.
  // Reached only on full success, so a failed refine is always free.
  let usage: UsageResult;
  if (cost > 0) {
    usage = await deps.meter.chargeForResult(
      caller.userId,
      { kind: 'resume_refinement', jobId: opts.idempotencyKey },
      opts.idempotencyKey
    );
    // Never deliver an unbilled result: if the atomic charge lost a race (balance
    // drained between the pre-flight check and here) refuse delivery, exactly like
    // the generation pipeline. The wasted compile is the bounded cost.
    if (!usage.charged) {
      throw new InsufficientCreditsError();
    }
  } else {
    usage = { charged: false, credits: 0 };
  }

  log.info('refine.succeeded', {
    durationMs: Date.now() - startedAt,
    scope,
    reParsedJD: didParseJD,
    templateId: artifacts.templateId,
    atsScore: atsReport.overallScore,
    charged: usage.charged,
    pdfBytes: pdf.byteLength,
  });

  return {
    resumeData: finalResume,
    typstCode,
    coverLetter: finalLetter,
    coverLetterTypst,
    atsScore: atsReport.overallScore,
    matchAnalysis,
    templateId: artifacts.templateId,
    pdf,
    usage,
    // A refine-of-refine reuses this without re-parsing the JD again.
    parsedJD: jd,
    // Record ONLY the prompt versions of the steps that actually executed, so
    // attribution never credits a step that was skipped (out of scope) or a JD
    // parse that didn't run.
    promptVersions: executedPromptVersions({ didParseJD, includesResume, includesLetter }),
  };
}

/** The prompt versions for the refinement steps that actually ran. */
function executedPromptVersions(ran: {
  didParseJD: boolean;
  includesResume: boolean;
  includesLetter: boolean;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (ran.didParseJD) out['parse-jd'] = PROMPT_VERSIONS['parse-jd'];
  if (ran.includesResume) out['revise-resume'] = PROMPT_VERSIONS['revise-resume'];
  if (ran.includesLetter) out['revise-cover-letter'] = PROMPT_VERSIONS['revise-cover-letter'];
  return out;
}
