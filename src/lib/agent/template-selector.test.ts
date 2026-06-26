import { describe, it, expect } from 'vitest';
import { selectTemplate } from './template-selector';
import type { ParsedJD } from './jd-parser';

/** Minimal ParsedJD with the two fields the selector reads. */
function jd(industry: string, experienceLevel: string): ParsedJD {
  return {
    title: 't',
    company: 'c',
    location: 'l',
    type: 'full-time',
    experienceLevel,
    summary: 's',
    requiredSkills: [],
    preferredSkills: [],
    keywords: [],
    responsibilities: [],
    requirements: [],
    benefits: [],
    industry,
  };
}

describe('selectTemplate', () => {
  it('routes a tech-leaning "tech consultant" to the tech template, not business', () => {
    // "tech consulting" hits both buckets; tech (weight 2 x 1) ties with
    // consulting, and rule order puts two-column first among ties at equal score.
    expect(selectTemplate(jd('software consulting', 'mid'))).toBe('two-column');
  });

  it('picks executive on a C-suite role', () => {
    expect(selectTemplate(jd('Executive Leadership', 'executive'))).toBe('executive');
  });

  it('picks academic for research roles', () => {
    expect(selectTemplate(jd('University Research', 'mid'))).toBe('academic');
  });

  it('picks banking for finance roles', () => {
    expect(selectTemplate(jd('Investment Banking', 'senior'))).toBe('banking');
  });

  it('picks compact for entry-level when industry is unknown', () => {
    expect(selectTemplate(jd('Unspecified', 'entry'))).toBe('compact');
  });

  it('falls back to two-column when nothing matches', () => {
    expect(selectTemplate(jd('Unspecified', 'mid'))).toBe('two-column');
  });

  it('is deterministic', () => {
    const j = jd('software', 'mid');
    expect(selectTemplate(j)).toBe(selectTemplate(j));
  });
});
