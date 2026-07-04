import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CandidateProfile } from '@/lib/db/schema';

/**
 * Public career endpoint safety + behavior.
 *
 * The load-bearing test is the ALLOWLIST sentinel: the public projection must
 * never carry contact PII (email/phone/photo) or raw free text
 * (rawBackground/voiceSample), so we stuff distinctive sentinels into those
 * fields and assert none survive JSON.stringify(toPublicProfile(row)). The rest
 * pin slug shape/uniqueness, publish/unpublish semantics (slug kept on
 * unpublish), and the Markdown renderer's sections.
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

vi.mock('@/lib/agent/background-parser', () => ({
  parseBackground: vi.fn(),
}));

const {
  toPublicProfile,
  generatePublicSlug,
  publishProfile,
  unpublishProfile,
  getPublicProfileBySlug,
} = await import('./store');
const { renderPublicProfileMarkdown } = await import('./publicMarkdown');

// Distinctive sentinels that must NEVER appear in a public payload.
const SENTINELS = {
  email: 'SENTINEL_EMAIL_x9q@secret.example',
  phone: 'SENTINEL_PHONE_5550199',
  photo: 'SENTINEL_PHOTO_avatar.png',
  rawBackground: 'SENTINEL_RAWBG_do_not_leak',
  voiceSample: 'SENTINEL_VOICE_do_not_leak',
  userId: 'SENTINEL_USERID_u1',
  rowId: 'SENTINEL_ROWID_p1',
};

/** A fully-populated row whose stripped fields carry sentinels. */
function sentinelRow(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  return {
    id: SENTINELS.rowId,
    userId: SENTINELS.userId,
    label: 'Staff Engineer',
    rawBackground: SENTINELS.rawBackground,
    voiceSample: SENTINELS.voiceSample,
    publicSlug: 'abc123DEF456ghij',
    publishedAt: new Date('2026-07-01T00:00:00Z'),
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-07-02T00:00:00Z'),
    data: {
      basics: {
        name: 'Jane Doe',
        label: 'Staff Software Engineer',
        email: SENTINELS.email,
        phone: SENTINELS.phone,
        photo: SENTINELS.photo,
        location: 'Wellington, NZ',
        summary: 'Builds reliable distributed systems.',
        profiles: [
          { network: 'GitHub', url: 'https://github.com/janedoe', label: 'janedoe' },
          { network: 'LinkedIn', url: 'https://linkedin.com/in/janedoe' },
        ],
      },
      work: [
        {
          company: 'Acme',
          position: 'Staff Engineer',
          startDate: 'Jan 2022',
          endDate: 'PRESENT',
          location: 'Remote',
          type: 'Full-time',
          highlights: ['Led the payments rewrite', 'Cut latency 40%'],
        },
      ],
      education: [
        {
          institution: 'State University',
          area: 'Computer Science',
          studyType: 'BSc',
          startDate: '2014',
          endDate: '2018',
          location: 'Auckland',
          gpa: '3.9',
          note: 'Honours',
        },
      ],
      projects: [
        {
          name: 'OpenGrid',
          description: 'A grid layout engine',
          highlights: ['1k stars'],
          url: 'https://opengrid.example',
        },
      ],
      skills: [{ name: 'Languages', keywords: ['TypeScript', 'Rust'] }],
      achievements: ['Speaker at ConfX'],
      certifications: ['AWS Solutions Architect'],
    },
    ...overrides,
  } as CandidateProfile;
}

describe('toPublicProfile allowlist', () => {
  it('strips ALL PII/raw sentinels and keeps only allowlisted fields', () => {
    const projection = toPublicProfile(sentinelRow());
    const serialized = JSON.stringify(projection);

    for (const [field, value] of Object.entries(SENTINELS)) {
      expect(serialized, `sentinel for ${field} must not leak`).not.toContain(value);
    }
  });

  it('projects the expected public fields', () => {
    const p = toPublicProfile(sentinelRow());
    expect(p.slug).toBe('abc123DEF456ghij');
    expect(p.name).toBe('Jane Doe');
    expect(p.headline).toBe('Staff Software Engineer');
    expect(p.location).toBe('Wellington, NZ'); // location stays (owner decision)
    expect(p.summary).toBe('Builds reliable distributed systems.');
    expect(p.work).toHaveLength(1);
    expect(p.work[0].highlights).toEqual(['Led the payments rewrite', 'Cut latency 40%']);
    expect(p.education[0].gpa).toBe('3.9');
    expect(p.projects[0].url).toBe('https://opengrid.example');
    expect(p.skills[0].keywords).toEqual(['TypeScript', 'Rust']);
    expect(p.achievements).toEqual(['Speaker at ConfX']);
    expect(p.certifications).toEqual(['AWS Solutions Architect']);
    expect(p.profiles).toHaveLength(2);
    // Contact PII + identifiers are absent as keys, not just values.
    const keys = Object.keys(p);
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('phone');
    expect(keys).not.toContain('photo');
    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('id');
  });

  it('omits optional fields when absent instead of emitting sentinels', () => {
    const row = sentinelRow();
    row.data.basics.location = undefined;
    row.data.basics.summary = undefined;
    const p = toPublicProfile(row);
    expect(p.location).toBeUndefined();
    expect(p.summary).toBeUndefined();
  });
});

describe('generatePublicSlug', () => {
  it('produces a 16-char base64url token', () => {
    const slug = generatePublicSlug();
    expect(slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(slug.length).toBe(16);
    expect(slug.length).toBeGreaterThanOrEqual(16);
  });

  it('is unique across many calls (uses crypto entropy, not a counter)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(generatePublicSlug());
    expect(seen.size).toBe(2000);
  });
});

// --- store fakes for publish/unpublish/getBySlug -------------------------------

/** select(...).from().where().limit() -> rows */
function selectReturning(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.limit = () => Promise.resolve(rows);
  return () => chain;
}
/** update(...).set().where().returning() -> rows (and awaitable without returning) */
function updateReturning(rows: unknown[]) {
  const tail = { returning: () => Promise.resolve(rows) };
  return () => ({ set: () => ({ where: () => tail }) });
}

describe('publishProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reuses an existing slug (stable URL on republish)', async () => {
    fakeDb = {
      select: selectReturning([{ id: 'p1', userId: 'u1', publicSlug: 'keepme000000abcd' }]),
      update: updateReturning([{ slug: 'keepme000000abcd', publishedAt: new Date() }]),
    };
    const res = await publishProfile('u1', 'p1');
    expect(res.slug).toBe('keepme000000abcd');
    expect(res.publishedAt).toBeInstanceOf(Date);
  });

  it('mints a slug on first publish', async () => {
    fakeDb = {
      select: selectReturning([{ id: 'p1', userId: 'u1', publicSlug: null }]),
      update: updateReturning([{ slug: 'minted0000000abc', publishedAt: new Date() }]),
    };
    const res = await publishProfile('u1', 'p1');
    expect(res.slug).toBe('minted0000000abc');
  });

  it('throws NotFound for another user’s profile', async () => {
    const { NotFoundError } = await import('@/server/errors/AppError');
    fakeDb = { select: selectReturning([{ id: 'p1', userId: 'someone_else' }]) };
    await expect(publishProfile('u1', 'p1')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('unpublishProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('succeeds (keeps slug) for an owned profile', async () => {
    fakeDb = {
      select: selectReturning([{ id: 'p1', userId: 'u1', publicSlug: 'keepme000000abcd' }]),
      update: updateReturning([]),
    };
    await expect(unpublishProfile('u1', 'p1')).resolves.toBeUndefined();
  });

  it('throws NotFound for a missing profile', async () => {
    const { NotFoundError } = await import('@/server/errors/AppError');
    fakeDb = { select: selectReturning([]) };
    await expect(unpublishProfile('u1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('getPublicProfileBySlug', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for an empty slug without touching the db', async () => {
    fakeDb = {};
    expect(await getPublicProfileBySlug('')).toBeNull();
  });

  it('returns the projection for a published row', async () => {
    fakeDb = { select: selectReturning([sentinelRow()]) };
    const p = await getPublicProfileBySlug('abc123DEF456ghij');
    expect(p?.name).toBe('Jane Doe');
    // Still allowlisted through this path.
    expect(JSON.stringify(p)).not.toContain(SENTINELS.email);
  });

  it('returns null when no published row matches', async () => {
    fakeDb = { select: selectReturning([]) };
    expect(await getPublicProfileBySlug('nope')).toBeNull();
  });
});

describe('renderPublicProfileMarkdown', () => {
  it('renders all populated sections', () => {
    const md = renderPublicProfileMarkdown(toPublicProfile(sentinelRow()));
    expect(md).toContain('# Jane Doe');
    expect(md).toContain('**Staff Software Engineer**');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Experience');
    expect(md).toContain('Staff Engineer — Acme');
    expect(md).toContain('Jan 2022 – Present');
    expect(md).toContain('- Led the payments rewrite');
    expect(md).toContain('## Projects');
    expect(md).toContain('[OpenGrid](https://opengrid.example)');
    expect(md).toContain('## Education');
    expect(md).toContain('## Skills');
    expect(md).toContain('**Languages:** TypeScript, Rust');
    expect(md).toContain('## Achievements');
    expect(md).toContain('## Certifications');
    expect(md).toContain('## Links');
    expect(md).toContain('[janedoe](https://github.com/janedoe)');
  });

  it('never leaks stripped sentinels', () => {
    const md = renderPublicProfileMarkdown(toPublicProfile(sentinelRow()));
    for (const value of Object.values(SENTINELS)) {
      expect(md).not.toContain(value);
    }
  });

  it('omits empty sections', () => {
    const row = sentinelRow();
    row.data.achievements = [];
    row.data.certifications = [];
    const md = renderPublicProfileMarkdown(toPublicProfile(row));
    expect(md).not.toContain('## Achievements');
    expect(md).not.toContain('## Certifications');
  });
});
