import { describe, it, expect, vi } from 'vitest';
import { withJdParseCache } from './jdParseCache';
import type { ParsedJD } from '@/lib/agent/jd-parser';

function fakeJD(title: string): ParsedJD {
  return {
    title,
    company: 'Acme',
    location: 'Remote',
    seniority: 'senior',
    industry: 'tech',
    requiredSkills: ['TypeScript'],
    niceToHaveSkills: [],
    requirements: ['Ship things'],
    responsibilities: [],
    keywords: ['typescript'],
  } as unknown as ParsedJD;
}

describe('withJdParseCache', () => {
  it('parses once per unique JD text and serves repeats from cache', async () => {
    const parse = vi.fn(async (jd: string) => fakeJD(jd));
    const cached = withJdParseCache(parse, { modelId: 'm1' });

    const a1 = await cached('backend role');
    const a2 = await cached('backend role');
    const b = await cached('frontend role');

    expect(parse).toHaveBeenCalledTimes(2);
    expect(a1).toEqual(a2);
    expect(b.title).toBe('frontend role');
  });

  it('expires entries after the TTL', async () => {
    let t = 0;
    const parse = vi.fn(async (jd: string) => fakeJD(jd));
    const cached = withJdParseCache(parse, { modelId: 'm1', now: () => t, ttlMs: 1000 });

    await cached('role');
    t = 999;
    await cached('role'); // still fresh
    expect(parse).toHaveBeenCalledTimes(1);
    t = 1000;
    await cached('role'); // expired → re-parse
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('keys on the model id (a model change never serves a stale parse)', async () => {
    const parse = vi.fn(async (jd: string) => fakeJD(jd));
    const m1 = withJdParseCache(parse, { modelId: 'gpt-4o-mini' });
    const m2 = withJdParseCache(parse, { modelId: 'gpt-4o' });

    await m1('role');
    await m2('role');
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('returns clones: mutating a hit cannot poison the cache', async () => {
    const parse = vi.fn(async (jd: string) => fakeJD(jd));
    const cached = withJdParseCache(parse, { modelId: 'm1' });

    const first = await cached('role');
    first.title = 'MUTATED';
    const second = await cached('role');

    expect(parse).toHaveBeenCalledTimes(1);
    expect(second.title).toBe('role');
  });

  it('evicts oldest entries when full instead of growing unbounded', async () => {
    let t = 0;
    const parse = vi.fn(async (jd: string) => fakeJD(jd));
    const cached = withJdParseCache(parse, { modelId: 'm1', now: () => (t += 1), maxEntries: 5 });

    for (let i = 0; i < 5; i++) await cached(`jd-${i}`);
    expect(parse).toHaveBeenCalledTimes(5);

    // Inserting past capacity evicts the oldest ~20% (jd-0). jd-0 re-parses; a
    // recent entry (jd-4) still hits.
    await cached('jd-5');
    await cached('jd-4');
    expect(parse).toHaveBeenCalledTimes(6);
    await cached('jd-0');
    expect(parse).toHaveBeenCalledTimes(7);
  });
});
