import { describe, it, expect, vi } from 'vitest';
import type { GenerationJob } from '@/lib/db/schema';
import type { Caller, GenerateInput } from '@/server/core/pipeline.types';

/**
 * The in-process MCP tools call the backend core directly. These tests drive the
 * PURE handlers (`createToolHandlers`) with fake deps — no DB, LLM, or network —
 * to pin the load-bearing behavior:
 *  - generate builds the right Caller + GenerateInput and calls createJob;
 *  - a settled job is compacted (hosted pdfUrl); a budget-exceeded job is a
 *    poll handle ({ id, status: 'running' });
 *  - refine resolves the parent + creates a refine-shaped job;
 *  - download_pdf returns a HOSTED URL string, never a temp path.
 *
 * `@/lib/db/client` is mocked because tools.ts imports it at module load (the
 * real Neon client throws without DATABASE_URL); the handlers under test only use
 * injected deps, so the fake db is never exercised here.
 */
vi.mock('@/lib/db/client', () => ({ db: {}, getDb: () => ({}) }));

const { createToolHandlers } = await import('./tools');

const BASE = 'https://vitex.test';

function job(overrides: Partial<GenerationJob> = {}): GenerationJob {
  return {
    id: 'job_1',
    userId: 'user_1',
    status: 'succeeded',
    input: {},
    result: { atsScore: 87, templateId: 'two-column', usage: { charged: true, credits: 1 } },
    error: null,
    pdfUrl: null,
    ...overrides,
  } as GenerationJob;
}

/** Fake deps with spy-able seams; individual tests override what they assert. */
function makeDeps(over: Partial<Parameters<typeof createToolHandlers>[0]> = {}) {
  // Typed params so `.mock.calls[0]` destructures with types; `void`-referenced
  // to satisfy no-unused-vars (this repo sets no argsIgnorePattern).
  const createJob = vi.fn(async (c: Caller, i: GenerateInput, k: string) => {
    void c;
    void i;
    void k;
    return job();
  });
  const waitForJob = vi.fn(async (id: string, u: string) => {
    void id;
    void u;
    return job();
  });
  const deps = {
    createJob,
    waitForJob,
    loadRefineParent: vi.fn(async () => ({
      jobDescription: 'jd',
      background: 'bg',
      templateId: 'two-column',
    })),
    getProfile: vi.fn(async () => ({
      id: 'p1',
      rawBackground: 'raw bg',
      data: { basics: { name: 'A' } } as GenerateInput['baseResume'],
      voiceSample: 'voice',
    })),
    listProfiles: vi.fn(async () => [{ id: 'p1' } as never]),
    createProfile: vi.fn(async () => ({ id: 'p_new', label: 'L', createdAt: null })),
    publishProfile: vi.fn(async () => ({ slug: 'abc123', publishedAt: new Date(0) })),
    unpublishProfile: vi.fn(async () => {}),
    getAccount: vi.fn(async () => ({ credits: 3, tier: 'free' })),
    baseUrl: BASE,
    ...over,
  };
  return deps;
}

describe('generate_resume tool', () => {
  it('builds the caller + input from inline background and calls createJob', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);

    const out = await handlers.generateResume('user_1', {
      jobDescription: 'Senior TS role',
      background: 'I ship product',
      template_id: 'compact',
    });

    expect(deps.createJob).toHaveBeenCalledTimes(1);
    const [caller, input, key] = vi.mocked(deps.createJob).mock.calls[0];
    expect(caller).toEqual({ userId: 'user_1', via: 'api_key' });
    expect(input).toMatchObject({
      jobDescription: 'Senior TS role',
      background: 'I ship product',
      templateId: 'compact',
    });
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
    // A settled job is compacted with the HOSTED pdf URL.
    expect(out).toMatchObject({
      id: 'job_1',
      status: 'succeeded',
      pdfUrl: `${BASE}/api/v1/resumes/job_1/pdf`,
      atsScore: 87,
    });
  });

  it('resolves a profile_id into background + baseResume + voiceSample', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);

    await handlers.generateResume('user_1', {
      jobDescription: 'jd',
      profile_id: 'p1',
    });

    expect(deps.getProfile).toHaveBeenCalledWith('user_1', 'p1');
    const [, input] = vi.mocked(deps.createJob).mock.calls[0];
    expect(input).toMatchObject({
      background: 'raw bg',
      profileId: 'p1',
      voiceSample: 'voice',
    });
    expect((input as GenerateInput).baseResume).toBeDefined();
  });

  it('rejects when neither background nor profile_id is supplied', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    await expect(handlers.generateResume('user_1', { jobDescription: 'jd' })).rejects.toThrow(
      /background is required/i
    );
    expect(deps.createJob).not.toHaveBeenCalled();
  });

  it('returns a poll handle when the job is still running at budget exceed', async () => {
    const deps = makeDeps({
      waitForJob: vi.fn(async () => job({ status: 'running', result: null })),
    });
    const handlers = createToolHandlers(deps);

    const out = await handlers.generateResume('user_1', {
      jobDescription: 'jd',
      background: 'bg',
    });

    expect(out).toEqual({ id: 'job_1', status: 'running' });
  });
});

describe('refine_resume tool', () => {
  it('resolves the parent and creates a refine-shaped job', async () => {
    const deps = makeDeps({
      createJob: vi.fn(async () => job({ id: 'job_2' })),
      waitForJob: vi.fn(async () => job({ id: 'job_2' })),
    });
    const handlers = createToolHandlers(deps);

    const out = await handlers.refineResume('user_1', {
      id: 'parent_1',
      feedback: 'Tighten the summary',
      scope: 'both',
    });

    expect(deps.loadRefineParent).toHaveBeenCalledWith('user_1', 'parent_1');
    const [caller, input] = vi.mocked(deps.createJob).mock.calls[0];
    expect(caller).toEqual({ userId: 'user_1', via: 'api_key' });
    expect(input).toMatchObject({
      jobDescription: 'jd',
      background: 'bg',
      templateId: 'two-column',
      refineOfJobId: 'parent_1',
      feedback: 'Tighten the summary',
      scope: 'both',
    });
    expect(out).toMatchObject({ id: 'job_2', status: 'succeeded' });
  });

  it("defaults the scope to 'resume'", async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    await handlers.refineResume('user_1', { id: 'parent_1', feedback: 'fix it' });
    const [, input] = vi.mocked(deps.createJob).mock.calls[0];
    expect((input as unknown as { scope: string }).scope).toBe('resume');
  });
});

describe('download_pdf tool', () => {
  it('returns the HOSTED URL string, never a temp path', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);

    const out = (await handlers.downloadPdf('user_1', { id: 'job_9' })) as { url: string };

    expect(out.url).toBe(`${BASE}/api/v1/resumes/job_9/pdf`);
    expect(out.url).not.toMatch(/tmp|\.pdf$/i);
  });
});

describe('profile + account tools', () => {
  it('get_account returns balance and tier for the caller', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = await handlers.getAccount('user_1');
    expect(out).toEqual({ userId: 'user_1', via: 'api_key', credits: 3, tier: 'free' });
  });

  it('publish_profile returns the public /p/<slug> URL', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    const out = (await handlers.publishProfile('user_1', { id: 'p1' })) as { url: string; slug: string };
    expect(out.slug).toBe('abc123');
    expect(out.url).toBe(`${BASE}/p/abc123`);
  });

  it('create_profile passes raw_background/label/voice_sample through', async () => {
    const deps = makeDeps();
    const handlers = createToolHandlers(deps);
    await handlers.createProfile('user_1', {
      raw_background: 'my background',
      label: 'Eng',
      voice_sample: 'sample',
    });
    expect(deps.createProfile).toHaveBeenCalledWith('user_1', {
      rawBackground: 'my background',
      label: 'Eng',
      voiceSample: 'sample',
    });
  });
});
