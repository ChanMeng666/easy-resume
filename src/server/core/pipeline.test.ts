import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runGenerationPipeline } from './pipeline';
import type { Caller, PipelineDeps } from './pipeline.types';
import {
  InsufficientCreditsError,
  PipelineStepError,
  CompilationError,
} from '@/server/errors/AppError';

/**
 * These tests pin the money-path invariants of the pipeline:
 *  - a result is charged exactly once, and only on full success;
 *  - any failure (LLM step or compile) skips the charge — failures are free;
 *  - a caller with no credits fails fast, before any LLM spend.
 */

const caller: Caller = { userId: 'user_1', via: 'api_key', apiKeyId: 'key_1' };

const input = {
  jobDescription: 'Senior Backend Engineer at Acme. Rust, Postgres, distributed systems.',
  background: '8 years building payment systems in TypeScript and Rust.',
};

const noopLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child() {
    return this;
  },
};

/** Build fully-faked deps; pass overrides to simulate failures. */
function makeDeps(overrides: Partial<PipelineDeps['agent']> & { compile?: PipelineDeps['compile'] } = {}) {
  const meter = {
    hasCredits: vi.fn().mockResolvedValue(true),
    chargeForResult: vi
      .fn()
      .mockResolvedValue({ charged: true, credits: 1, transactionId: 'tx_1' }),
  };

  const agent = {
    parseJobDescription: vi.fn().mockResolvedValue({ title: 'Engineer', requiredSkills: [] }),
    parseBackground: vi.fn().mockResolvedValue({ basics: { name: 'Jane' } }),
    analyzeMatch: vi
      .fn()
      .mockResolvedValue({ overallScore: 80, skillMatch: { matched: ['Rust'], missing: [] } }),
    tailorResume: vi.fn().mockResolvedValue({ basics: { name: 'Jane' } }),
    scoreATS: vi.fn().mockResolvedValue({ overallScore: 90 }),
    generateCoverLetter: vi.fn().mockResolvedValue('Dear Hiring Manager, ...'),
    selectTemplate: vi.fn().mockReturnValue('two-column'),
    ...overrides,
  };

  const compile =
    overrides.compile ?? vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])); // %PDF

  const deps = {
    agent,
    render: {
      getTemplateById: vi.fn().mockReturnValue(undefined),
      generateTypstCode: vi.fn().mockReturnValue('#set page()'),
      generateCoverLetterTypst: vi.fn().mockReturnValue('#set page()'),
    },
    compile,
    meter,
    logger: noopLogger,
    onProgress: vi.fn(),
  } as unknown as PipelineDeps;

  return { deps, meter, agent, compile, onProgress: deps.onProgress };
}

const opts = { idempotencyKey: '11111111-1111-1111-1111-111111111111' };

describe('runGenerationPipeline billing gating', () => {
  beforeEach(() => vi.clearAllMocks());

  it('charges exactly once on full success and returns the PDF', async () => {
    const { deps, meter } = makeDeps();
    const result = await runGenerationPipeline(input, caller, deps, opts);

    expect(meter.chargeForResult).toHaveBeenCalledTimes(1);
    expect(meter.chargeForResult).toHaveBeenCalledWith(
      caller.userId,
      { kind: 'resume_generation', jobId: opts.idempotencyKey },
      opts.idempotencyKey
    );
    expect(result.usage.charged).toBe(true);
    expect(result.pdf.byteLength).toBeGreaterThan(0);
    expect(result.atsScore).toBe(90);
  });

  it('emits progress for all 8 steps', async () => {
    const { deps, onProgress } = makeDeps();
    await runGenerationPipeline(input, caller, deps, opts);
    expect(onProgress).toHaveBeenCalledTimes(8);
  });

  it('does NOT charge when an LLM step fails', async () => {
    const { deps, meter } = makeDeps({
      tailorResume: vi.fn().mockRejectedValue(new Error('model exploded')),
    });
    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      PipelineStepError
    );
    expect(meter.chargeForResult).not.toHaveBeenCalled();
    expect(deps.compile).not.toHaveBeenCalled();
  });

  it('does NOT charge when compilation fails (no result = no charge)', async () => {
    const { deps, meter } = makeDeps({
      compile: vi.fn().mockRejectedValue(new CompilationError('typst failed')),
    });
    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      CompilationError
    );
    expect(meter.chargeForResult).not.toHaveBeenCalled();
  });

  it('fails fast with no credits, before any LLM spend', async () => {
    const { deps, meter, agent } = makeDeps();
    meter.hasCredits.mockResolvedValue(false);

    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      InsufficientCreditsError
    );
    expect(agent.parseJobDescription).not.toHaveBeenCalled();
    expect(meter.chargeForResult).not.toHaveBeenCalled();
  });

  it('rejects invalid input before checking credits', async () => {
    const { deps, meter } = makeDeps();
    await expect(
      runGenerationPipeline({ jobDescription: '', background: '' }, caller, deps, opts)
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(meter.hasCredits).not.toHaveBeenCalled();
  });
});
