/**
 * Default dependency wiring for the pipeline core.
 *
 * Adapters (SSE route, job runner) call `defaultDeps({ onProgress })` and pass
 * the result to `runGenerationPipeline`. Tests inject fakes instead.
 */

import 'server-only';
import { parseJobDescription } from '@/lib/agent/jd-parser';
import { parseBackground } from '@/lib/agent/background-parser';
import { analyzeMatch } from '@/lib/agent/matching-engine';
import { tailorResume } from '@/lib/agent/resume-tailor';
import { reviseResume } from '@/lib/agent/resume-reviser';
import { reviseCoverLetter } from '@/lib/agent/cover-letter-reviser';
import { scoreATSDeterministic } from '@/lib/agent/ats-scorer';
import { generateCoverLetter } from '@/lib/agent/cover-letter';
import { selectTemplate, selectDesignTokens } from '@/lib/agent/template-selector';
import { getTemplateById } from '@/templates/registry';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';
import { compileTypstToPdf } from './compile';
import { withJdParseCache } from './jdParseCache';
import { billingMeter } from '@/server/billing/meter';
import { createLogger } from '@/server/log/logger';
import type { PipelineDeps, ProgressEvent } from './pipeline.types';
import type { RefineDeps } from './refine';

// Process-wide cached JD parser shared by BOTH pipelines: identical postings
// (agents re-generating against one JD; refines of old jobs without a persisted
// parsedJD) parse once per model/prompt-version instead of per request.
const cachedParseJobDescription = withJdParseCache(parseJobDescription);

/** Build the real pipeline dependencies, optionally wiring a progress sink. */
export function defaultDeps(opts?: {
  onProgress?: (e: ProgressEvent) => void;
  requestId?: string;
}): PipelineDeps {
  return {
    agent: {
      parseJobDescription: cachedParseJobDescription,
      parseBackground,
      analyzeMatch,
      tailorResume,
      scoreATS: scoreATSDeterministic,
      generateCoverLetter,
      selectTemplate,
      selectDesignTokens,
    },
    render: { getTemplateById, generateTypstCode, generateCoverLetterTypst },
    compile: async (typstCode) => (await compileTypstToPdf(typstCode)).pdf,
    meter: billingMeter,
    logger: createLogger(opts?.requestId ? { requestId: opts.requestId } : {}),
    onProgress: opts?.onProgress,
  };
}

/**
 * Build the real refinement-pipeline dependencies. Reuses the generation wiring
 * (compile/meter/logger/render) and adds the two revise agents; the base resume,
 * analysis, and template all come from the artifacts, so no parse/tailor/select
 * steps are wired here.
 */
export function defaultRefineDeps(opts?: {
  onProgress?: (e: ProgressEvent) => void;
  requestId?: string;
}): RefineDeps {
  return {
    agent: {
      parseJobDescription: cachedParseJobDescription,
      reviseResume,
      reviseCoverLetter,
      scoreATS: scoreATSDeterministic,
    },
    render: { getTemplateById, generateTypstCode, generateCoverLetterTypst },
    compile: async (typstCode) => (await compileTypstToPdf(typstCode)).pdf,
    meter: billingMeter,
    logger: createLogger(opts?.requestId ? { requestId: opts.requestId } : {}),
    onProgress: opts?.onProgress,
  };
}
