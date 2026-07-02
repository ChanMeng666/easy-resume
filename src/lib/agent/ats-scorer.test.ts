import { describe, it, expect } from 'vitest';
import { scoreATSDeterministic } from './ats-scorer';
import type { ResumeData } from '@/lib/validation/schema';
import type { ParsedJD } from './jd-parser';

/**
 * scoreATSDeterministic is a thin composition over computeKeywordCoverage
 * (whose math is pinned in keyword-coverage.test.ts). These tests only cover the
 * wrapper's composition: it feeds the resume haystack + (JD keywords ∪ required
 * skills) into coverage and mirrors the coverage score into overallScore.
 */

const resume = {
  basics: { name: 'Jane', label: 'Backend Engineer', summary: 'Built APIs with TypeScript and Postgres', profiles: [] },
  education: [],
  skills: [{ name: 'Languages', keywords: ['TypeScript', 'Rust'] }],
  work: [{ position: 'Engineer', company: 'Acme', startDate: '', endDate: '', highlights: ['Scaled Postgres'] }],
  projects: [],
  achievements: [],
  certifications: [],
} as unknown as ResumeData;

const jd = {
  title: 'Backend Engineer',
  company: 'Acme',
  keywords: ['TypeScript', 'Kubernetes'],
  requiredSkills: ['Postgres', 'Go'],
} as unknown as ParsedJD;

describe('scoreATSDeterministic', () => {
  it('scores coverage over JD keywords ∪ required skills and mirrors it into overallScore', () => {
    const result = scoreATSDeterministic(resume, jd);
    // TypeScript + Postgres are present; Kubernetes + Go are not -> 2/4 = 50.
    expect(result.keywords.found).toEqual(['TypeScript', 'Postgres']);
    expect(result.keywords.missing).toEqual(['Kubernetes', 'Go']);
    expect(result.keywords.score).toBe(50);
    expect(result.overallScore).toBe(50);
  });

  it('is deterministic across repeated calls', () => {
    expect(scoreATSDeterministic(resume, jd)).toEqual(scoreATSDeterministic(resume, jd));
  });
});
