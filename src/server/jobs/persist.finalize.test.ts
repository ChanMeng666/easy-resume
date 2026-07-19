import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '@/server/log/logger';
import type { GenerateResult, GenerateInput } from '@/server/core/pipeline.types';

/**
 * finalizeSucceededJob is the single emit site that covers BOTH the web SSE path
 * and the v1 runner. These tests pin the funnel telemetry contract:
 *  - a generation emits `generation_succeeded`; a refine (parentJobId present)
 *    emits `refine_succeeded` — both carrying jobId + charged;
 *  - a telemetry failure (analytics insert throws) is swallowed and the job is
 *    still reported finalized (the money/persistence path is never affected).
 *
 * The DB client is mocked so `db.update` (the job write) and `db.insert` (the
 * analytics write, via the REAL trackEvent) are driven independently.
 */

let fakeDb: { update: (...a: unknown[]) => unknown; insert: (...a: unknown[]) => unknown };

vi.mock('@/lib/db/client', () => ({
  db: {
    update: (...a: unknown[]) => fakeDb.update(...a),
    insert: (...a: unknown[]) => fakeDb.insert(...a),
  },
}));

const { finalizeSucceededJob } = await import('./persist');

const log = createLogger();

/** db.update(t).set(v).where() -> resolves. */
function updateResolving() {
  return () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) });
}
/** db.insert(t).values(v) -> resolves; records the analytics payload. */
function insertCapturing(sink: { values?: Record<string, unknown> }, opts: { reject?: boolean } = {}) {
  return () => ({
    values: (v: Record<string, unknown>) => {
      sink.values = v;
      return opts.reject ? Promise.reject(new Error('analytics down')) : Promise.resolve(undefined);
    },
  });
}

const input: GenerateInput = { jobDescription: 'jd', background: 'bg' };

function makeResult(): GenerateResult {
  return {
    resumeData: { basics: { name: 'Jane', label: 'Engineer' } } as GenerateResult['resumeData'],
    typstCode: '#x',
    coverLetter: '',
    coverLetterTypst: '',
    atsScore: 90,
    matchAnalysis: { overallScore: 80, matchedSkills: [], missingSkills: [] },
    templateId: 'two-column',
    tokens: { palette: 'slate', density: 'comfortable' },
    pdf: new Uint8Array([37, 80]),
    usage: { charged: true, credits: 1, transactionId: 'tx_1' },
    promptVersions: {},
    parsedJD: {} as GenerateResult['parsedJD'],
  };
}

describe('finalizeSucceededJob analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('emits generation_succeeded for a first-class generation', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = { update: updateResolving(), insert: insertCapturing(sink) };

    const ok = await finalizeSucceededJob({ jobId: 'j1', input, result: makeResult(), logger: log, userId: 'u1' });

    expect(ok).toBe(true);
    expect(sink.values).toEqual({
      userId: 'u1',
      event: 'generation_succeeded',
      props: { jobId: 'j1', charged: true },
    });
  });

  it('emits refine_succeeded (with parentJobId) when this is a refine', async () => {
    const sink: { values?: Record<string, unknown> } = {};
    fakeDb = { update: updateResolving(), insert: insertCapturing(sink) };

    await finalizeSucceededJob({
      jobId: 'j2',
      input,
      result: makeResult(),
      logger: log,
      userId: 'u1',
      parentJobId: 'parent1',
    });

    expect(sink.values).toEqual({
      userId: 'u1',
      event: 'refine_succeeded',
      props: { jobId: 'j2', charged: true, parentJobId: 'parent1' },
    });
  });

  it('still reports the job finalized when the analytics write fails', async () => {
    fakeDb = { update: updateResolving(), insert: insertCapturing({}, { reject: true }) };

    const ok = await finalizeSucceededJob({ jobId: 'j3', input, result: makeResult(), logger: log, userId: 'u1' });

    // Telemetry failure is swallowed inside trackEvent → the job write succeeded.
    expect(ok).toBe(true);
  });
});
