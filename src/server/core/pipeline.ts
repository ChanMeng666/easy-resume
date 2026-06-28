/**
 * Resume generation pipeline core (transport-agnostic).
 *
 * Orchestrates the end-to-end flow that was previously inlined in the SSE route:
 *   parse JD -> parse background -> analyze match -> tailor -> score ATS ->
 *   cover letter -> render Typst -> COMPILE PDF -> CHARGE.
 *
 * Two design commitments:
 *  1. "API is the UI": no HTTP/SSE here. Progress is pushed via `deps.onProgress`
 *     so the SSE route streams it and the REST/job transport ignores it.
 *  2. "Sell results": the PDF is compiled server-side inside this function, and
 *     billing happens exactly once, only after the PDF exists. Any earlier throw
 *     skips billing entirely, so failed generations are never charged.
 */

import 'server-only';
import { z } from 'zod';
import { resumeDataSchema } from '@/lib/validation/schema';
import { checkFaithfulness } from '@/lib/agent/faithfulness-check';
import { sanitizeForPrompt, sanitizeDeep } from './sanitize';
import {
  InsufficientCreditsError,
  PipelineStepError,
  ValidationError,
  type PipelineStep,
} from '@/server/errors/AppError';
import type {
  Caller,
  GenerateInput,
  GenerateResult,
  PipelineDeps,
  ProgressEvent,
  RunOptions,
} from './pipeline.types';

const TOTAL_STEPS = 8;

const inputSchema = z.object({
  jobDescription: z.string().trim().min(1, 'jobDescription is required').max(50_000),
  background: z.string().trim().min(1, 'background is required').max(50_000),
  templateId: z.string().trim().max(50).optional(),
  // Pre-parsed background from a saved profile (lets the pipeline skip
  // parse_background). Validated against the same ResumeData shape the parser
  // produces. zod strips unknown keys, so this must be declared to survive.
  baseResume: resumeDataSchema.optional(),
  profileId: z.string().trim().max(64).optional(),
});

/** Run a single agent step, wrapping any failure as a typed PipelineStepError. */
async function runStep<T>(step: PipelineStep, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof PipelineStepError) throw err;
    throw new PipelineStepError(step, `Pipeline step "${step}" failed`, err);
  }
}

/**
 * Execute the full pipeline. Returns the compiled, billable result.
 *
 * @throws ValidationError          — bad input (no charge)
 * @throws InsufficientCreditsError — caller has no credits (no LLM spend)
 * @throws PipelineStepError        — an LLM step failed (no charge)
 * @throws CompilationError         — Typst failed to compile (no charge)
 */
export async function runGenerationPipeline(
  rawInput: GenerateInput,
  caller: Caller,
  deps: PipelineDeps,
  opts: RunOptions
): Promise<GenerateResult> {
  const log = deps.logger.child({ userId: caller.userId, via: caller.via });
  const startedAt = Date.now();

  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ValidationError('Invalid generation input', {
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const input = parsed.data;

  // Fast-fail before spending LLM calls if the caller clearly can't pay.
  if (!(await deps.meter.hasCredits(caller.userId))) {
    throw new InsufficientCreditsError();
  }

  const jobDescription = sanitizeForPrompt(input.jobDescription);
  const background = sanitizeForPrompt(input.background);

  const progress = (step: PipelineStep, index: number, message: string) => {
    const e: ProgressEvent = { step, index, total: TOTAL_STEPS, message };
    deps.onProgress?.(e);
  };

  // Steps 1 & 2 are independent (JD vs background) — run them concurrently.
  // When a saved profile supplied a pre-parsed base resume, reuse it and skip
  // the parse_background LLM call ("enter once, reuse many"). The progress event
  // is still emitted so the 8-step client progress stays in lockstep.
  const hasPreparsedBackground = !!input.baseResume;
  progress('parse_jd', 1, 'Analyzing job description...');
  progress(
    'parse_background',
    2,
    hasPreparsedBackground ? 'Using saved background...' : 'Parsing your background...'
  );
  const [rawParsedJD, rawBaseResume] = await Promise.all([
    runStep('parse_jd', () => deps.agent.parseJobDescription(jobDescription)),
    input.baseResume
      ? Promise.resolve(input.baseResume)
      : runStep('parse_background', () => deps.agent.parseBackground(background)),
  ]);
  // Sanitize the LLM-reconstructed intermediates before they re-enter any prompt
  // (or get rendered): a payload that slipped through the raw-input scrub as a
  // plausible field value is defanged here. Shape/type preserved.
  const parsedJD = sanitizeDeep(rawParsedJD);
  const baseResume = sanitizeDeep(rawBaseResume);

  progress('analyze_match', 3, 'Analyzing match with job requirements...');
  const matchAnalysis = await runStep('analyze_match', () =>
    deps.agent.analyzeMatch(baseResume, parsedJD)
  );

  progress('tailor', 4, 'Tailoring resume for the role...');
  let tailoredResume = sanitizeDeep(
    await runStep('tailor', () => deps.agent.tailorResume(baseResume, parsedJD, matchAnalysis))
  );

  // Grounding gate: tailoring can drift into inventing skills/employers. Verify
  // the tailored resume stays faithful to the base; if it fabricated facts, run
  // exactly one corrective re-tailor pass with the violations as feedback. This
  // is deterministic + free (no LLM) and bounded to a single retry.
  const faithfulness = checkFaithfulness(baseResume, tailoredResume);
  if (!faithfulness.isFaithful) {
    log.warn('pipeline.faithfulness.violations', {
      count: faithfulness.violations.length,
      fields: faithfulness.violations.map((v) => v.field),
    });
    tailoredResume = sanitizeDeep(
      await runStep('tailor', () =>
        deps.agent.tailorResume(baseResume, parsedJD, matchAnalysis, faithfulness.feedback)
      )
    );
  }

  // Steps 5 & 6 both depend only on the tailored resume + JD, not on each
  // other — run them concurrently.
  progress('score_ats', 5, 'Scoring ATS compatibility...');
  progress('cover_letter', 6, 'Generating cover letter...');
  const [atsReport, coverLetter] = await Promise.all([
    runStep('score_ats', () => deps.agent.scoreATS(tailoredResume, parsedJD)),
    runStep('cover_letter', () => deps.agent.generateCoverLetter(tailoredResume, parsedJD)),
  ]);

  progress('render', 7, 'Generating resume document...');
  const templateId = input.templateId ?? deps.agent.selectTemplate(parsedJD);
  const { typstCode, coverLetterTypst } = await runStep('render', async () => {
    const template = deps.render.getTemplateById(templateId);
    const code = template
      ? template.generator(tailoredResume)
      : deps.render.generateTypstCode(tailoredResume);
    const letterCode = deps.render.generateCoverLetterTypst(coverLetter, tailoredResume);
    return { typstCode: code, coverLetterTypst: letterCode };
  });

  // The billable artifact: compile server-side so the charge is anchored to a real PDF.
  progress('compile', 8, 'Compiling your PDF...');
  const pdf = await deps.compile(typstCode);

  // Sole billing call site — reached only on full success.
  const usage = await deps.meter.chargeForResult(
    caller.userId,
    { kind: 'resume_generation', jobId: opts.idempotencyKey },
    opts.idempotencyKey
  );

  // Never deliver an unbilled result. The pre-flight hasCredits() check above is
  // best-effort: between it and this atomic post-compile charge, a concurrent
  // generation by the same user can drain the balance. When that happens the
  // charge returns charged:false; refusing to return the result here is what
  // makes "one credit buys at most one PDF" hold even under that race. (The
  // wasted compile is the bounded cost of losing the race; the user is not
  // charged.) Same-key SSE reconnects and unlimited-tier users return
  // charged:true, so they are never affected.
  if (!usage.charged) {
    throw new InsufficientCreditsError();
  }

  log.info('pipeline.succeeded', {
    durationMs: Date.now() - startedAt,
    templateId,
    atsScore: atsReport.overallScore,
    charged: usage.charged,
    pdfBytes: pdf.byteLength,
  });

  return {
    resumeData: tailoredResume,
    typstCode,
    coverLetter,
    coverLetterTypst,
    atsScore: atsReport.overallScore,
    matchAnalysis: {
      overallScore: matchAnalysis.overallScore,
      matchedSkills: matchAnalysis.skillMatch.matched,
      missingSkills: matchAnalysis.skillMatch.missing,
    },
    templateId,
    pdf,
    usage,
  };
}
