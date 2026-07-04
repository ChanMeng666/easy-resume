import { describe, it, expect } from 'vitest';
import { generateTypstCode } from './generator';
import { DEFAULT_TOKENS, ACCENT_PAIRS, type DesignTokens } from '@/lib/design/tokens';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * Pins the design-tokens reproducibility invariant for the default (two-column)
 * generator: the same data + tokens always produce an identical string (a PDF is
 * a build artifact), and the slate palette reproduces the pre-tokens output's
 * exact hex literals so old jobs render with today's look byte-for-byte.
 */

const data: ResumeData = {
  basics: {
    name: 'Jane Doe',
    label: 'Senior Backend Engineer',
    email: 'jane@example.com',
    phone: '',
    location: 'Remote',
    summary: 'Builds resilient distributed systems.',
    profiles: [{ network: 'GitHub', url: 'https://github.com/jane', label: 'jane' }],
  },
  education: [
    {
      institution: 'MIT',
      area: 'Computer Science',
      studyType: 'BSc',
      startDate: 'Sep 2014',
      endDate: 'Jun 2018',
      location: 'Cambridge, MA',
      gpa: '3.9',
      note: '',
    },
  ],
  skills: [{ name: 'Languages', keywords: ['Rust', 'TypeScript'] }],
  work: [
    {
      company: 'Acme',
      position: 'Staff Engineer',
      type: 'Full-time',
      startDate: 'Jan 2019',
      endDate: 'PRESENT',
      location: 'Remote',
      highlights: ['Led the payments platform rewrite.', 'Cut latency 40%.'],
    },
  ],
  projects: [
    { name: 'Widget', description: 'An open-source widget.', url: '', highlights: ['1k stars.'] },
  ],
  achievements: ['Speaker at RustConf 2023.'],
  certifications: ['AWS Certified'],
};

describe('generateTypstCode — design tokens reproducibility', () => {
  it('is deterministic: same data + tokens → identical string', () => {
    const tokens: DesignTokens = { palette: 'indigo', density: 'comfortable' };
    expect(generateTypstCode(data, tokens)).toBe(generateTypstCode(data, tokens));
  });

  it('defaults to DEFAULT_TOKENS (slate) when no tokens are passed', () => {
    expect(generateTypstCode(data)).toBe(generateTypstCode(data, DEFAULT_TOKENS));
  });

  it('slate reproduces the historical two-column hexes byte-for-byte', () => {
    const out = generateTypstCode(data, DEFAULT_TOKENS);
    // These exact literals shipped before design tokens; slate must reproduce them.
    expect(out).toContain('#let primary   = rgb("#0E5484")');
    expect(out).toContain('#let accent    = rgb("#2E86AB")');
  });

  it('applies the selected palette hexes for a non-default palette', () => {
    const out = generateTypstCode(data, { palette: 'crimson', density: 'comfortable' });
    expect(out).toContain(`#let primary   = rgb("${ACCENT_PAIRS.crimson.primary}")`);
    expect(out).toContain(`#let accent    = rgb("${ACCENT_PAIRS.crimson.accent}")`);
    // ...and none of the slate hexes leak through.
    expect(out).not.toContain(ACCENT_PAIRS.slate.primary);
  });

  it('only the palette lines differ between two palettes (layout untouched → ATS-safe)', () => {
    const slate = generateTypstCode(data, { palette: 'slate', density: 'comfortable' });
    const amber = generateTypstCode(data, { palette: 'amber', density: 'comfortable' });
    // Normalizing the two palette color literals makes the documents identical:
    // the token change is colors-only, never structure.
    const strip = (s: string) => s.replace(/rgb\("#[0-9A-Fa-f]{6}"\)/g, 'rgb(COLOR)');
    expect(strip(slate)).toBe(strip(amber));
  });
});
