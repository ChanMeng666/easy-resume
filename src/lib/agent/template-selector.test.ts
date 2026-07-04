import { describe, it, expect } from 'vitest';
import { selectTemplate, selectDesignTokens } from './template-selector';
import { ACCENT_PAIRS } from '@/lib/design/tokens';
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

describe('selectDesignTokens', () => {
  const PALETTE_NAMES = Object.keys(ACCENT_PAIRS);

  it('is deterministic: same inputs → same tokens', () => {
    const j = jd('software engineering', 'senior');
    expect(selectDesignTokens(j, 'ada@lovelace.dev')).toEqual(
      selectDesignTokens(j, 'ada@lovelace.dev')
    );
  });

  it('maps the tech industry to its indigo/emerald shortlist', () => {
    const j = jd('Software Engineering', 'mid');
    // Whichever seed, a tech JD stays within its two-palette shortlist.
    for (const seed of ['a@x.com', 'b@y.com', 'someone', '']) {
      expect(['indigo', 'emerald']).toContain(selectDesignTokens(j, seed).palette);
    }
  });

  it('maps finance to graphite/slate', () => {
    const j = jd('Investment Banking', 'senior');
    expect(['graphite', 'slate']).toContain(selectDesignTokens(j, 'x@y.com').palette);
  });

  it('maps creative to crimson/amber', () => {
    const j = jd('Brand Design', 'mid');
    expect(['crimson', 'amber']).toContain(selectDesignTokens(j, 'x@y.com').palette);
  });

  it('falls back to the slate/indigo default shortlist for unknown industries', () => {
    const j = jd('Underwater Basket Weaving', 'mid');
    expect(['slate', 'indigo']).toContain(selectDesignTokens(j, 'x@y.com').palette);
  });

  it('spreads different seeds across a shortlist (variety)', () => {
    const j = jd('Software', 'mid');
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(selectDesignTokens(j, `candidate-${i}@x.com`).palette);
    // Both palettes in the two-entry shortlist should appear across many seeds.
    expect(seen.size).toBe(2);
  });

  it('empty seed resolves to the first shortlist entry (stable default)', () => {
    // tech shortlist is [indigo, emerald] → index 0 = indigo.
    expect(selectDesignTokens(jd('software', 'mid'), '').palette).toBe('indigo');
    // default shortlist is [slate, indigo] → index 0 = slate.
    expect(selectDesignTokens(jd('unknown', 'mid'), '').palette).toBe('slate');
  });

  it('maps junior/entry/intern seniority to compact density', () => {
    for (const level of ['entry', 'intern', 'internship', 'junior']) {
      expect(selectDesignTokens(jd('software', level), 'x@y.com').density).toBe('compact');
    }
  });

  it('maps other seniority to comfortable density', () => {
    for (const level of ['mid', 'senior', 'lead', 'executive']) {
      expect(selectDesignTokens(jd('software', level), 'x@y.com').density).toBe('comfortable');
    }
  });

  it('always returns a palette from the known set', () => {
    expect(PALETTE_NAMES).toContain(selectDesignTokens(jd('software', 'mid'), 'x@y.com').palette);
  });
});
