import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@/server/errors/AppError';

/**
 * The candidate profile store is the owner-scoped source of truth for reusable
 * backgrounds. These tests pin: parse-on-create when no data is supplied,
 * owner-checked reads/deletes surfacing NotFound (never leaking another user's
 * row), and the pure label-derivation helper.
 */

let fakeDb: Record<string, (...args: unknown[]) => unknown>;

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: (...a: unknown[]) => fakeDb.insert(...a),
    select: (...a: unknown[]) => fakeDb.select(...a),
    update: (...a: unknown[]) => fakeDb.update(...a),
    delete: (...a: unknown[]) => fakeDb.delete(...a),
  },
}));

const parseBackground = vi.fn();
vi.mock('@/lib/agent/background-parser', () => ({
  parseBackground: (...a: unknown[]) => parseBackground(...a),
}));

const { createProfile, getProfile, updateProfile, deleteProfile, deriveProfileLabel } =
  await import('./store');

const fullResume = {
  basics: { name: 'Jane', label: 'Staff Engineer', profiles: [] },
  education: [],
  skills: [],
  work: [],
  projects: [],
  achievements: [],
  certifications: [],
};

/** db.insert(...).values(...).returning() -> rows */
function insertReturning(rows: unknown[]) {
  return () => ({ values: () => ({ returning: () => Promise.resolve(rows) }) });
}
/** db.select(...).from().where().limit() -> rows */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(rows);
  return () => chain;
}
/** db.delete(...).where().returning() -> rows */
function deleteReturning(rows: unknown[]) {
  return () => ({ where: () => ({ returning: () => Promise.resolve(rows) }) });
}
/** db.insert(...).values(v).returning() -> rows, capturing the inserted values. */
function insertCapturing(rows: unknown[], sink: { values?: unknown }) {
  return () => ({
    values: (v: unknown) => {
      sink.values = v;
      return { returning: () => Promise.resolve(rows) };
    },
  });
}
/** db.update(...).set(s).where().returning() -> rows, capturing the set patch. */
function updateCapturing(rows: unknown[], sink: { set?: unknown }) {
  return () => ({
    set: (s: unknown) => {
      sink.set = s;
      return { where: () => ({ returning: () => Promise.resolve(rows) }) };
    },
  });
}

describe('deriveProfileLabel', () => {
  it('prefers an explicit label, then the parsed title, then a default', () => {
    expect(deriveProfileLabel('My SWE profile', fullResume)).toBe('My SWE profile');
    expect(deriveProfileLabel(undefined, fullResume)).toBe('Staff Engineer');
    expect(
      deriveProfileLabel(undefined, { ...fullResume, basics: { ...fullResume.basics, label: '' } })
    ).toBe('My Background');
  });
});

describe('createProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseBackground.mockReset();
  });

  it('always parses the raw background server-side (never trusts client data)', async () => {
    parseBackground.mockResolvedValue(fullResume);
    fakeDb = { insert: insertReturning([{ id: 'p1', label: 'Staff Engineer' }]) };

    await createProfile('u1', { rawBackground: '10 years building APIs' });

    expect(parseBackground).toHaveBeenCalledTimes(1);
    expect(parseBackground).toHaveBeenCalledWith('10 years building APIs');
  });

  it('stores a trimmed voiceSample, normalizing an absent/blank one to null', async () => {
    parseBackground.mockResolvedValue(fullResume);

    const withVoice: { values?: unknown } = {};
    fakeDb = { insert: insertCapturing([{ id: 'p1' }], withVoice) };
    await createProfile('u1', { rawBackground: 'bg', voiceSample: '  my voice  ' });
    expect((withVoice.values as { voiceSample?: unknown }).voiceSample).toBe('my voice');

    const blankVoice: { values?: unknown } = {};
    fakeDb = { insert: insertCapturing([{ id: 'p2' }], blankVoice) };
    await createProfile('u1', { rawBackground: 'bg', voiceSample: '   ' });
    expect((blankVoice.values as { voiceSample?: unknown }).voiceSample).toBeNull();

    const noVoice: { values?: unknown } = {};
    fakeDb = { insert: insertCapturing([{ id: 'p3' }], noVoice) };
    await createProfile('u1', { rawBackground: 'bg' });
    expect((noVoice.values as { voiceSample?: unknown }).voiceSample).toBeNull();
  });
});

describe('updateProfile voiceSample', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets a trimmed voiceSample without re-parsing the background', async () => {
    const sink: { set?: unknown } = {};
    fakeDb = {
      select: selectReturning([{ id: 'p1', userId: 'u1', data: fullResume }]),
      update: updateCapturing([{ id: 'p1', voiceSample: 'brisk and direct' }], sink),
    };
    const row = await updateProfile('u1', 'p1', { voiceSample: '  brisk and direct  ' });
    expect((sink.set as { voiceSample?: unknown }).voiceSample).toBe('brisk and direct');
    expect(row.voiceSample).toBe('brisk and direct');
    expect(parseBackground).not.toHaveBeenCalled();
  });

  it('clears the voiceSample to null when sent an empty string', async () => {
    const sink: { set?: unknown } = {};
    fakeDb = {
      select: selectReturning([{ id: 'p1', userId: 'u1', data: fullResume }]),
      update: updateCapturing([{ id: 'p1', voiceSample: null }], sink),
    };
    const row = await updateProfile('u1', 'p1', { voiceSample: '' });
    expect((sink.set as { voiceSample?: unknown }).voiceSample).toBeNull();
    expect(row.voiceSample).toBeNull();
  });
});

describe('getProfile owner scoping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the row when it belongs to the caller', async () => {
    fakeDb = { select: selectReturning([{ id: 'p1', userId: 'u1', data: fullResume }]) };
    const row = await getProfile('u1', 'p1');
    expect(row.id).toBe('p1');
  });

  it('throws NotFound for another user’s profile (existence stays hidden)', async () => {
    fakeDb = { select: selectReturning([{ id: 'p1', userId: 'someone_else', data: fullResume }]) };
    await expect(getProfile('u1', 'p1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFound for a missing profile', async () => {
    fakeDb = { select: selectReturning([]) };
    await expect(getProfile('u1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('deleteProfile owner scoping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds when the owner-scoped delete removes a row', async () => {
    fakeDb = { delete: deleteReturning([{ id: 'p1' }]) };
    await expect(deleteProfile('u1', 'p1')).resolves.toBeUndefined();
  });

  it('throws NotFound when nothing was deleted (not the owner / missing)', async () => {
    fakeDb = { delete: deleteReturning([]) };
    await expect(deleteProfile('u1', 'p1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
