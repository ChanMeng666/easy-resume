import { describe, it, expect } from 'vitest';
import { manualVersionCreateSchema, type ResumeData } from './schema';

// Pins the bounds that protect the free manual-version write from cheap
// unbounded storage / pathological Typst render cost (codex P2-3 finding).

function baseResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    basics: { name: 'Ada', label: 'Engineer', profiles: [] },
    education: [],
    skills: [],
    work: [],
    projects: [],
    achievements: [],
    certifications: [],
    ...overrides,
  };
}

describe('manualVersionCreateSchema bounds', () => {
  it('accepts a normal resume', () => {
    const r = manualVersionCreateSchema.safeParse({
      resumeData: baseResume({ skills: [{ name: 'Lang', keywords: ['TS', 'Go'] }] }),
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unbounded nested keywords array (the nested-array render DoS vector)', () => {
    const r = manualVersionCreateSchema.safeParse({
      resumeData: baseResume({
        skills: [{ name: 'Lang', keywords: Array.from({ length: 30_000 }, () => 'x') }],
      }),
    });
    expect(r.success).toBe(false);
  });

  it('rejects too many top-level entries', () => {
    const work = Array.from({ length: 60 }, () => ({
      company: 'C',
      position: 'P',
      startDate: '2020',
      endDate: '2021',
      location: 'NZ',
      type: 'Full-time',
      highlights: [],
    }));
    const r = manualVersionCreateSchema.safeParse({ resumeData: baseResume({ work }) });
    expect(r.success).toBe(false);
  });

  it('rejects unbounded work highlights', () => {
    const r = manualVersionCreateSchema.safeParse({
      resumeData: baseResume({
        work: [
          {
            company: 'C',
            position: 'P',
            startDate: '2020',
            endDate: '2021',
            location: 'NZ',
            type: 'Full-time',
            highlights: Array.from({ length: 200 }, () => 'did a thing'),
          },
        ],
      }),
    });
    expect(r.success).toBe(false);
  });
});
