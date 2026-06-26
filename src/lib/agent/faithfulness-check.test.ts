import { describe, it, expect } from 'vitest';
import { checkFaithfulness } from './faithfulness-check';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * The faithfulness gate is the anti-fabrication backstop: it must flag invented
 * skills/employers/institutions in the tailored resume and stay quiet (and never
 * throw) when the tailored resume is grounded — even on partially-shaped data.
 */

const base: ResumeData = {
  basics: { name: 'Jane Doe', label: 'Engineer', profiles: [] },
  education: [
    {
      institution: 'MIT',
      area: 'CS',
      studyType: 'BSc',
      startDate: 'Sep 2014',
      endDate: 'Jun 2018',
      location: 'Cambridge, MA',
    },
  ],
  skills: [{ name: 'Languages', keywords: ['TypeScript', 'Rust'] }],
  work: [
    {
      company: 'Acme',
      position: 'Engineer',
      startDate: 'Jan 2019',
      endDate: 'PRESENT',
      location: 'Remote',
      type: 'Full-time',
      highlights: ['Built payment systems'],
    },
  ],
  projects: [],
  achievements: [],
  certifications: [],
};

/** Deep clone so per-test mutations don't leak. */
function clone(r: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(r));
}

describe('checkFaithfulness', () => {
  it('passes when the tailored resume only rephrases (no new facts)', () => {
    const tailored = clone(base);
    tailored.work[0].highlights = ['Architected high-throughput payment systems'];
    const result = checkFaithfulness(base, tailored);
    expect(result.isFaithful).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.feedback).toBe('');
  });

  it('flags a fabricated skill as high severity with feedback', () => {
    const tailored = clone(base);
    tailored.skills[0].keywords.push('Kubernetes');
    const result = checkFaithfulness(base, tailored);
    expect(result.isFaithful).toBe(false);
    expect(result.violations.some((v) => v.field === 'skill' && v.tailoredValue === 'Kubernetes')).toBe(true);
    expect(result.feedback).toContain('Kubernetes');
  });

  it('allows rephrased skills that the base contains (React vs React.js)', () => {
    const b = clone(base);
    b.skills[0].keywords = ['React.js'];
    const tailored = clone(b);
    tailored.skills[0].keywords = ['React'];
    expect(checkFaithfulness(b, tailored).isFaithful).toBe(true);
  });

  it('flags a fabricated employer', () => {
    const tailored = clone(base);
    tailored.work.push({ ...tailored.work[0], company: 'Globex' });
    const result = checkFaithfulness(base, tailored);
    expect(result.violations.some((v) => v.field === 'company' && v.tailoredValue === 'Globex')).toBe(true);
    expect(result.isFaithful).toBe(false);
  });

  it('treats a changed date as low severity (still faithful overall)', () => {
    const tailored = clone(base);
    tailored.work[0].startDate = 'Feb 2019';
    const result = checkFaithfulness(base, tailored);
    expect(result.violations.some((v) => v.field === 'date')).toBe(true);
    // Low-severity only -> not enough to trigger a corrective pass.
    expect(result.isFaithful).toBe(true);
  });

  it('does not throw on partially-shaped resumes (missing arrays)', () => {
    const partial = { basics: { name: 'Jane', label: 'Eng', profiles: [] } } as unknown as ResumeData;
    expect(() => checkFaithfulness(partial, partial)).not.toThrow();
    expect(checkFaithfulness(partial, partial).isFaithful).toBe(true);
  });
});
