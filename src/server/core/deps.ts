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
import { scoreATS } from '@/lib/agent/ats-scorer';
import { generateCoverLetter } from '@/lib/agent/cover-letter';
import { selectTemplate } from '@/lib/agent/template-selector';
import { getTemplateById } from '@/templates/registry';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';
import { compileTypstToPdf } from './compile';
import { billingMeter } from '@/server/billing/meter';
import { createLogger } from '@/server/log/logger';
import type { PipelineDeps, ProgressEvent } from './pipeline.types';

/** Build the real pipeline dependencies, optionally wiring a progress sink. */
export function defaultDeps(opts?: {
  onProgress?: (e: ProgressEvent) => void;
  requestId?: string;
}): PipelineDeps {
  return {
    agent: {
      parseJobDescription,
      parseBackground,
      analyzeMatch,
      tailorResume,
      scoreATS,
      generateCoverLetter,
      selectTemplate,
    },
    render: { getTemplateById, generateTypstCode, generateCoverLetterTypst },
    compile: async (typstCode) => (await compileTypstToPdf(typstCode)).pdf,
    meter: billingMeter,
    logger: createLogger(opts?.requestId ? { requestId: opts.requestId } : {}),
    onProgress: opts?.onProgress,
  };
}
