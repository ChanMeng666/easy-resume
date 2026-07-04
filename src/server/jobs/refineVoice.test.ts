import { describe, it, expect, vi } from 'vitest';

/**
 * resolveOriginatingProfileId is the pure decision at the heart of voice re-fetch:
 * which profile id (if any) seeded a refine's chain. The DB/profile fetch around
 * it is left to integration; this pins the branching logic with plain objects.
 *
 * The module imports the db client at load (for the async resolver we don't test
 * here), so stub it — the pure function never touches it.
 */
vi.mock('@/lib/db/client', () => ({ db: {} }));

const { resolveOriginatingProfileId } = await import('./refineVoice');

describe('resolveOriginatingProfileId', () => {
  it("returns the parent's own profileId when present (generation seeded from a profile)", () => {
    expect(resolveOriginatingProfileId({ profileId: 'prof_1' })).toBe('prof_1');
  });

  it("prefers the parent's profileId over the root's", () => {
    expect(
      resolveOriginatingProfileId({ profileId: 'prof_parent' }, { profileId: 'prof_root' })
    ).toBe('prof_parent');
  });

  it('falls back to the root profileId when the parent is a refine with no profileId', () => {
    expect(
      resolveOriginatingProfileId({ refineOfJobId: 'job_a' }, { profileId: 'prof_root' })
    ).toBe('prof_root');
  });

  it('returns undefined for a plain generation with no profileId (inline background)', () => {
    // Not refine-shaped → the root is never consulted, even if one were passed.
    expect(resolveOriginatingProfileId({}, { profileId: 'prof_root' })).toBeUndefined();
    expect(resolveOriginatingProfileId(undefined)).toBeUndefined();
  });

  it('returns undefined for a refine whose root also carried no profileId', () => {
    expect(resolveOriginatingProfileId({ refineOfJobId: 'job_a' }, {})).toBeUndefined();
    expect(resolveOriginatingProfileId({ refineOfJobId: 'job_a' })).toBeUndefined();
  });

  it('treats blank/whitespace ids as absent', () => {
    expect(resolveOriginatingProfileId({ profileId: '   ' })).toBeUndefined();
    expect(
      resolveOriginatingProfileId({ refineOfJobId: '  ' }, { profileId: 'prof_root' })
    ).toBeUndefined();
  });
});
