import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Caller } from '@/server/core/pipeline.types';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * createManualVersion persists a free, client-edited resume as a NEW version
 * WITHOUT charging. These tests pin the money invariant (charged:false,
 * usage.charged:false, no meter/credit import reachable), the owner-check
 * (cross-user parent → NotFound), the refine-chain resolution (parent/root), and
 * that the Typst is re-rendered server-side (never taken from the client).
 */

let fakeDb: Record<string, (...args: unknown[]) => unknown>;
let captured: Record<string, unknown> | null;

vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...a: unknown[]) => fakeDb.select(...a),
    insert: (...a: unknown[]) => fakeDb.insert(...a),
  },
}));

const { createManualVersion } = await import('./persist');

const caller: Caller = { userId: 'u1', via: 'session' };

const resumeData: ResumeData = {
  basics: { name: 'Ada Lovelace', label: 'Engineer', profiles: [] },
  education: [],
  skills: [{ name: 'Languages', keywords: ['Ada', 'TypeScript'] }],
  work: [],
  projects: [],
  achievements: [],
  certifications: [],
};

/** db.select({...}).from().where().limit() -> rows */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(rows);
  return () => chain;
}

/** db.insert(table).values(v).returning() -> rows, capturing the inserted values. */
function insertCapturing(rows: unknown[]) {
  return () => ({
    values: (v: Record<string, unknown>) => {
      captured = v;
      return { returning: () => Promise.resolve(rows) };
    },
  });
}

beforeEach(() => {
  captured = null;
  fakeDb = {};
});

describe('createManualVersion', () => {
  it('persists an uncharged succeeded version and re-renders Typst server-side', async () => {
    const parent = {
      id: 'parent-1',
      userId: 'u1',
      status: 'succeeded',
      rootJobId: null,
      input: { jobDescription: 'jd', background: 'bg' },
      result: {
        templateId: 'two-column',
        atsScore: 88,
        matchAnalysis: { overallScore: 88, matchedSkills: ['Ada'], missingSkills: ['Rust'] },
        coverLetter: 'Dear team',
        coverLetterTypst: '= Cover',
        typstCode: 'CLIENT-SHOULD-NOT-BE-TRUSTED',
      },
      title: 'Senior Engineer',
    };
    fakeDb.select = selectReturning([parent]);
    fakeDb.insert = insertCapturing([{ id: 'new-1' }]);

    const out = await createManualVersion({ caller, parentJobId: 'parent-1', resumeData });
    expect(out).toEqual({ id: 'new-1' });

    // Money invariant: never charged.
    expect(captured!.charged).toBe(false);
    expect((captured!.result as { usage: { charged: boolean } }).usage.charged).toBe(false);
    // Succeeded row with a fresh idempotency key (never used to charge).
    expect(captured!.status).toBe('succeeded');
    expect(typeof captured!.idempotencyKey).toBe('string');
    // Chain: parent is a first-gen → it becomes the root.
    expect(captured!.parentJobId).toBe('parent-1');
    expect(captured!.rootJobId).toBe('parent-1');
    // Typst is re-rendered from resumeData, NOT the client's stored typstCode.
    const result = captured!.result as { typstCode: string; atsScore?: number };
    expect(result.typstCode).not.toBe('CLIENT-SHOULD-NOT-BE-TRUSTED');
    expect(result.typstCode.length).toBeGreaterThan(0);
    // Parent's AI analysis is carried over (a manual edit doesn't re-score).
    expect(result.atsScore).toBe(88);
    // Without an edited cover letter, the parent's letter + Typst carry forward
    // unchanged (zero behavior change).
    const withCover = captured!.result as { coverLetter: string; coverLetterTypst: string };
    expect(withCover.coverLetter).toBe('Dear team');
    expect(withCover.coverLetterTypst).toBe('= Cover');
  });

  it('regenerates the cover-letter Typst when an edited coverLetter is supplied', async () => {
    const parent = {
      id: 'parent-1',
      userId: 'u1',
      status: 'succeeded',
      rootJobId: null,
      input: { jobDescription: 'jd', background: 'bg' },
      result: {
        templateId: 'two-column',
        coverLetter: 'Dear team',
        coverLetterTypst: '= Parent cover letter Typst',
      },
      title: 'Senior Engineer',
    };
    fakeDb.select = selectReturning([parent]);
    fakeDb.insert = insertCapturing([{ id: 'new-1' }]);

    const edited = 'Dear Hiring Manager, my UNIQUE-EDITED-BODY makes me a great fit.';
    await createManualVersion({ caller, parentJobId: 'parent-1', resumeData, coverLetter: edited });

    const result = captured!.result as { coverLetter: string; coverLetterTypst: string };
    // The stored body is the edited text.
    expect(result.coverLetter).toBe(edited);
    // The Typst is regenerated server-side (not the parent's, and it embeds the
    // new body text).
    expect(result.coverLetterTypst).not.toBe('= Parent cover letter Typst');
    expect(result.coverLetterTypst).toContain('UNIQUE-EDITED-BODY');
  });

  it('inherits the parent root for a deeper chain and stores the version label', async () => {
    const parent = {
      id: 'parent-2',
      userId: 'u1',
      status: 'succeeded',
      rootJobId: 'root-0',
      input: { jobDescription: 'jd', background: 'bg' },
      result: { templateId: 'two-column' },
      title: 'T',
    };
    fakeDb.select = selectReturning([parent]);
    fakeDb.insert = insertCapturing([{ id: 'new-2' }]);

    await createManualVersion({
      caller,
      parentJobId: 'parent-2',
      resumeData,
      versionLabel: '  Bold rewrite  ',
    });
    expect(captured!.rootJobId).toBe('root-0');
    expect(captured!.parentJobId).toBe('parent-2');
    expect(captured!.versionLabel).toBe('Bold rewrite'); // trimmed
  });

  it('throws NotFound for a cross-user parent (never links/leaks)', async () => {
    fakeDb.select = selectReturning([{ id: 'p', userId: 'someone-else', rootJobId: null }]);
    fakeDb.insert = insertCapturing([{ id: 'should-not-happen' }]);

    await expect(
      createManualVersion({ caller, parentJobId: 'p', resumeData })
    ).rejects.toThrow(/not found/i);
    expect(captured).toBeNull(); // no insert attempted
  });

  it('throws NotFound for a missing parent', async () => {
    fakeDb.select = selectReturning([]);
    fakeDb.insert = insertCapturing([{ id: 'x' }]);
    await expect(
      createManualVersion({ caller, parentJobId: 'missing', resumeData })
    ).rejects.toThrow(/not found/i);
    expect(captured).toBeNull();
  });

  it('refuses to version a non-succeeded parent (no chain corruption)', async () => {
    fakeDb.select = selectReturning([
      { id: 'p', userId: 'u1', status: 'failed', rootJobId: null, input: {}, result: null, title: 'T' },
    ]);
    fakeDb.insert = insertCapturing([{ id: 'should-not-happen' }]);
    await expect(
      createManualVersion({ caller, parentJobId: 'p', resumeData })
    ).rejects.toThrow(/not ready/i);
    expect(captured).toBeNull();
  });
});
