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
});

// Lines that try to override the system/instructions are neutralized. Pure ASCII.
const INSTRUCTION_OVERRIDE = /(^|\n)\s*(ignore|disregard|forget)\b[^\n]*\binstructions?\b/gi;

/**
 * Defang the most common prompt-injection vectors before user text reaches an
 * LLM prompt. Drops C0 control chars (keeping TAB/LF), DEL, and zero-width
 * chars by code point — no control characters appear in this source file — then
 * neutralizes instruction-override lines. Defense-in-depth, not a guarantee.
 */
function sanitizeForPrompt(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a) continue; // C0 controls except TAB/LF
    if (code === 0x7f) continue; // DEL
    if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue; // zero-width
    out += ch;
  }
  return out.replace(INSTRUCTION_OVERRIDE, '$1[redacted]');
}

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
  progress('parse_jd', 1, 'Analyzing job description...');
  progress('parse_background', 2, 'Parsing your background...');
  const [parsedJD, baseResume] = await Promise.all([
    runStep('parse_jd', () => deps.agent.parseJobDescription(jobDescription)),
    runStep('parse_background', () => deps.agent.parseBackground(background)),
  ]);

  progress('analyze_match', 3, 'Analyzing match with job requirements...');
  const matchAnalysis = await runStep('analyze_match', () =>
    deps.agent.analyzeMatch(baseResume, parsedJD)
  );

  progress('tailor', 4, 'Tailoring resume for the role...');
  const tailoredResume = await runStep('tailor', () =>
    deps.agent.tailorResume(baseResume, parsedJD, matchAnalysis)
  );

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
