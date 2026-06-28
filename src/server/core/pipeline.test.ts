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

  // No-op sleep so step retries don't add real backoff delay to tests.
  const sleep = vi.fn().mockResolvedValue(undefined);

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
    sleep,
  } as unknown as PipelineDeps;

  return { deps, meter, agent, compile, onProgress: deps.onProgress, sleep };
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

  it('re-tailors once when the tailored resume fabricates a skill, then charges once', async () => {
    // Base resume (parseBackground fake) has no skills; the first tailor draft
    // invents "Rust" -> faithfulness gate fires -> exactly one corrective pass.
    const tailorResume = vi
      .fn()
      .mockResolvedValueOnce({ basics: { name: 'Jane' }, skills: [{ name: 'X', keywords: ['Rust'] }] })
      .mockResolvedValueOnce({ basics: { name: 'Jane' }, skills: [] });
    const { deps, meter } = makeDeps({ tailorResume });

    await runGenerationPipeline(input, caller, deps, opts);

    expect(tailorResume).toHaveBeenCalledTimes(2);
    // The corrective pass receives the violation feedback as a 4th argument.
    expect(tailorResume.mock.calls[1][3]).toContain('Rust');
    expect(meter.chargeForResult).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-tailor when the tailored resume is faithful', async () => {
    const { deps, agent } = makeDeps();
    await runGenerationPipeline(input, caller, deps, opts);
    expect(agent.tailorResume).toHaveBeenCalledTimes(1);
  });

  it('retries a transient (retriable) LLM step, then succeeds and charges once', async () => {
    // First call fails with a 503 (retriable infra), second succeeds.
    const parseJobDescription = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('upstream 503'), { status: 503 }))
      .mockResolvedValueOnce({ title: 'Engineer', requiredSkills: [] });
    const { deps, meter, sleep } = makeDeps({ parseJobDescription });

    const result = await runGenerationPipeline(input, caller, deps, opts);

    expect(parseJobDescription).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1); // one backoff between the two attempts
    expect(meter.chargeForResult).toHaveBeenCalledTimes(1);
    expect(result.usage.charged).toBe(true);
  });

  it('does NOT retry a non-retriable (4xx) step and charges nothing', async () => {
    const parseJobDescription = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 }));
    const { deps, meter, sleep } = makeDeps({ parseJobDescription });

    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      PipelineStepError
    );
    expect(parseJobDescription).toHaveBeenCalledTimes(1); // no retry
    expect(sleep).not.toHaveBeenCalled();
    expect(meter.chargeForResult).not.toHaveBeenCalled();
  });

  it('gives up after the retry budget on a persistently retriable step (still free)', async () => {
    const tailorResume = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('gateway'), { status: 502 }));
    const { deps, meter, sleep } = makeDeps({ tailorResume });

    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      PipelineStepError
    );
    expect(tailorResume).toHaveBeenCalledTimes(3); // MAX_STEP_ATTEMPTS
    expect(sleep).toHaveBeenCalledTimes(2); // backoff between the 3 attempts
    expect(meter.chargeForResult).not.toHaveBeenCalled();
    expect(deps.compile).not.toHaveBeenCalled();
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

  it('does NOT deliver an unbilled result when the post-compile charge loses the race', async () => {
    // hasCredits passed pre-flight, but a concurrent generation drained the
    // balance, so the atomic charge returns charged:false. The pipeline must
    // refuse to return the (already compiled) result so one credit can never
    // buy two PDFs.
    const { deps, meter } = makeDeps();
    meter.chargeForResult.mockResolvedValue({ charged: false, credits: 0 });

    await expect(runGenerationPipeline(input, caller, deps, opts)).rejects.toBeInstanceOf(
      InsufficientCreditsError
    );
    // It compiled (we reached the charge) but did not hand back a result.
    expect(deps.compile).toHaveBeenCalledTimes(1);
    expect(meter.chargeForResult).toHaveBeenCalledTimes(1);
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

describe('runGenerationPipeline with a pre-parsed profile background', () => {
  beforeEach(() => vi.clearAllMocks());

  // A full, schema-valid ResumeData (as a saved profile would store), so the
  // pipeline's input validation accepts it as the optional baseResume.
  const baseResume = {
    basics: { name: 'Jane', label: 'Engineer', profiles: [] },
    education: [],
    skills: [],
    work: [],
    projects: [],
    achievements: [],
    certifications: [],
  };

  it('skips parse_background but still parses the JD and charges once', async () => {
    const { deps, meter, agent } = makeDeps();
    const result = await runGenerationPipeline(
      { ...input, baseResume, profileId: 'profile_1' },
      caller,
      deps,
      opts
    );

    // The saved background is reused — no LLM parse_background call.
    expect(agent.parseBackground).not.toHaveBeenCalled();
    // The JD is still parsed (it's per-generation, not stored on the profile).
    expect(agent.parseJobDescription).toHaveBeenCalledTimes(1);
    // Money path unchanged: still exactly one charge on a compiled PDF.
    expect(meter.chargeForResult).toHaveBeenCalledTimes(1);
    expect(result.usage.charged).toBe(true);
    expect(result.pdf.byteLength).toBeGreaterThan(0);
  });

  it('still emits progress for all 8 steps when reusing a profile', async () => {
    const { deps, onProgress } = makeDeps();
    await runGenerationPipeline({ ...input, baseResume }, caller, deps, opts);
    expect(onProgress).toHaveBeenCalledTimes(8);
  });
});
