import { describe, it, expect } from 'vitest';
import { escapeTypst, escapeTypstString } from './utils';
import { generateTypstCode } from './generator';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * Guards the two Typst escaping contexts. `escapeTypstString` protects values
 * placed inside string literals ("..."), where the content-mode escapes emitted
 * by `escapeTypst` (\#, \$, …) are INVALID and abort compilation, and a raw "
 * terminates the literal early (breakage + injection). A common real-world
 * trigger is a "C#"/"F#" job title or a skill keyword containing a quote.
 */
describe('escapeTypstString — string-literal context', () => {
  it('does NOT escape content-mode specials that are legal inside a literal', () => {
    // # $ * _ are fine between double quotes; escaping them breaks compilation.
    expect(escapeTypstString('C# / F# $tack *star*')).toBe('C# / F# $tack *star*');
  });

  it('escapes backslash and double-quote (the only literal-special chars)', () => {
    expect(escapeTypstString('a"b')).toBe('a\\"b');
    expect(escapeTypstString('back\\slash')).toBe('back\\\\slash');
    // Order matters: an existing backslash must not double-escape the quote.
    expect(escapeTypstString('x\\"y')).toBe('x\\\\\\"y');
  });

  it('returns empty string for empty/undefined input', () => {
    expect(escapeTypstString('')).toBe('');
  });
});

describe('escapeTypst — content context (unchanged)', () => {
  it('still escapes content-mode specials', () => {
    expect(escapeTypst('a#b$c*d')).toBe('a\\#b\\$c\\*d');
  });
});

/**
 * End-to-end: adversarial field values must land in the generated Typst as
 * VALID string literals — `#` left intact, `"` escaped — so the document
 * compiles instead of erroring on `\#` or an unterminated string.
 */
describe('generateTypstCode — adversarial string-literal fields', () => {
  const adversarial: ResumeData = {
    basics: {
      name: 'Ada "Hacker" Lovelace',
      label: 'C# / F# Engineer',
      profiles: [],
    },
    education: [],
    work: [
      {
        company: 'Acme "Corp"',
        position: 'Senior C# Engineer',
        startDate: 'Jan 2020',
        endDate: 'PRESENT',
        location: 'Remote',
        type: 'Full-time',
        highlights: ['Did things'],
      },
    ],
    projects: [],
    skills: [
      { name: 'Languages', keywords: ['C#', 'a"b', 'back\\slash'] },
    ],
    achievements: [],
    certifications: [],
  };

  const code = generateTypstCode(adversarial);

  it('keeps # unescaped inside cv-tag/cv-event string literals', () => {
    expect(code).toContain('#cv-tag("C#")');
    expect(code).toContain('"Senior C# Engineer"');
  });

  it('escapes embedded double-quotes inside string literals', () => {
    expect(code).toContain('#cv-tag("a\\"b")');
    expect(code).toContain('Acme \\"Corp\\"');
  });

  it('escapes embedded backslashes inside string literals', () => {
    expect(code).toContain('#cv-tag("back\\\\slash")');
  });

  it('never emits an invalid \\# escape inside a cv-* string literal', () => {
    for (const line of code.split('\n')) {
      if (/#cv-(tag|event|subsection)\(/.test(line)) {
        expect(line).not.toMatch(/\\[#$*_<>@]/);
      }
    }
  });
});
