import { describe, it, expect } from 'vitest';
import {
  computeKeywordCoverage,
  computeSkillOverlap,
  resumeKeywordHaystack,
} from './keyword-coverage';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * Coverage is the deterministic backbone of the ATS score. These tests pin the
 * property that matters: same input -> same number, every time.
 */

describe('computeKeywordCoverage', () => {
  it('is deterministic across repeated calls', () => {
    const haystack = ['Built APIs with TypeScript and Postgres'];
    const keywords = ['TypeScript', 'Postgres', 'Kubernetes'];
    const a = computeKeywordCoverage(haystack, keywords);
    const b = computeKeywordCoverage(haystack, keywords);
    expect(a).toEqual(b);
  });

  it('scores found/total as a rounded percentage', () => {
    const r = computeKeywordCoverage(['typescript postgres'], ['TypeScript', 'Postgres', 'Rust', 'Go']);
    expect(r.found).toEqual(['TypeScript', 'Postgres']);
    expect(r.missing).toEqual(['Rust', 'Go']);
    expect(r.score).toBe(50);
  });

  it('matches case-insensitively and counts duplicate keywords once', () => {
    const r = computeKeywordCoverage(['React developer'], ['react', 'REACT', 'React']);
    expect(r.found).toEqual(['react']);
    expect(r.score).toBe(100);
  });

  it('returns 100 when there are no keywords to match', () => {
    expect(computeKeywordCoverage(['anything'], []).score).toBe(100);
  });
});

describe('computeSkillOverlap', () => {
  it('matches bidirectionally (substring either way)', () => {
    const { matched, missing } = computeSkillOverlap(['React.js', 'Node'], ['React', 'Python']);
    expect(matched).toEqual(['React']);
    expect(missing).toEqual(['Python']);
  });
});

describe('resumeKeywordHaystack', () => {
  it('pulls text from summary, skills, work, projects, achievements', () => {
    const resume = {
      basics: { name: 'Jane', label: 'Engineer', summary: 'Backend dev', profiles: [] },
      education: [],
      skills: [{ name: 'Lang', keywords: ['Rust'] }],
      work: [{ company: 'Acme', position: 'Eng', startDate: 'x', endDate: 'y', location: 'z', type: 'Full-time', highlights: ['Shipped X'] }],
      projects: [{ name: 'Proj', description: 'desc', highlights: ['Did Y'] }],
      achievements: ['Award'],
      certifications: ['AWS'],
    } as ResumeData;
    const frags = resumeKeywordHaystack(resume);
    const blob = frags.join(' ').toLowerCase();
    for (const term of ['backend', 'rust', 'shipped x', 'did y', 'award', 'aws']) {
      expect(blob).toContain(term);
    }
  });
});
