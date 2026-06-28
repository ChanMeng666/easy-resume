import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { checkFaithfulness } from '@/lib/agent/faithfulness-check';
import { computeKeywordCoverage, computeSkillOverlap } from '@/lib/agent/keyword-coverage';
import { generateTypstCode } from '@/lib/typst/generator';
import { compileTypstToPdf } from '@/server/core/compile';
import { PROMPT_FUNCTION_IDS, PROMPT_VERSIONS } from '@/lib/agent/prompt-registry';
import type { ResumeData } from '@/lib/validation/schema';

/**
 * Whether the `typst` binary is available, decided ONCE at collection time so we
 * can genuinely skip (not silently pass) the real-compile cases on a machine
 * without it. This only gates on the binary's PRESENCE — when it's present, the
 * compile cases run for real and a compile failure is a real test failure.
 */
const TYPST_AVAILABLE = (() => {
  try {
    execFileSync(process.env.TYPST_BIN || 'typst', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/**
 * Offline evaluation / golden set.
 *
 * A small, deterministic regression suite for the AI-adjacent logic that must
 * NOT drift as the codebase changes: the anti-fabrication faithfulness gate, the
 * deterministic ATS keyword coverage, and the Typst escaping → real compile path
 * (the P0-3 safety net). No LLM and no DB — these run in plain `npm test`. The
 * real-compile cases are skipped automatically where the `typst` binary is
 * unavailable (e.g. a minimal CI image), so the suite stays portable.
 */

/** A complete, schema-valid base resume to derive golden cases from. */
function baseResume(): ResumeData {
  return {
    basics: {
      name: 'Ada Lovelace',
      label: 'Machine Learning Engineer',
      summary: 'ML engineer with 6 years building data pipelines.',
      profiles: [],
    },
    education: [
      {
        institution: 'University of London',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: 'Sep 2014',
        endDate: 'Jun 2018',
        location: 'London, UK',
      },
    ],
    skills: [
      { name: 'Core', keywords: ['Machine Learning', 'Python', 'PostgreSQL', 'Kubernetes'] },
    ],
    work: [
      {
        company: 'Analytical Engines Ltd',
        position: 'ML Engineer',
        startDate: 'Jul 2018',
        endDate: 'PRESENT',
        location: 'Remote',
        type: 'Full-time',
        highlights: ['Built recommendation models', 'Shipped a feature store'],
      },
    ],
    projects: [],
    achievements: [],
    certifications: [],
  };
}

describe('golden set — faithfulness gate', () => {
  it('passes an identical tailored resume', () => {
    const r = checkFaithfulness(baseResume(), baseResume());
    expect(r.isFaithful).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('does NOT flag an abbreviation rephrase (Machine Learning -> ML)', () => {
    const tailored = baseResume();
    tailored.skills = [{ name: 'Core', keywords: ['ML', 'Python', 'Postgres', 'K8s'] }];
    const r = checkFaithfulness(baseResume(), tailored);
    // ML/Postgres/K8s canonicalize to the base's Machine Learning/PostgreSQL/Kubernetes.
    expect(r.isFaithful).toBe(true);
    expect(r.violations.filter((v) => v.field === 'skill')).toHaveLength(0);
  });

  it('flags a fabricated skill the candidate never listed', () => {
    const tailored = baseResume();
    tailored.skills = [{ name: 'Core', keywords: ['Machine Learning', 'Rust', 'Go'] }];
    const r = checkFaithfulness(baseResume(), tailored);
    expect(r.isFaithful).toBe(false);
    const fabricated = r.violations.filter((v) => v.field === 'skill').map((v) => v.tailoredValue);
    expect(fabricated).toEqual(expect.arrayContaining(['Rust', 'Go']));
  });

  it('still flags a fabrication that an ambiguous alias must NOT ground (no CV→Computer Vision)', () => {
    // "CV" is intentionally NOT a synonym (it also means curriculum vitae), so a
    // base "CV" cannot ground a fabricated "Computer Vision".
    const base = baseResume();
    base.skills = [{ name: 'Core', keywords: ['CV', 'Python'] }];
    const tailored = baseResume();
    tailored.skills = [{ name: 'Core', keywords: ['Computer Vision', 'Python'] }];
    const r = checkFaithfulness(base, tailored);
    expect(r.isFaithful).toBe(false);
    expect(r.violations.some((v) => v.field === 'skill' && v.tailoredValue === 'Computer Vision')).toBe(
      true
    );
  });

  it('flags a fabricated employer', () => {
    const tailored = baseResume();
    tailored.work = [{ ...tailored.work[0], company: 'OpenAI' }];
    const r = checkFaithfulness(baseResume(), tailored);
    expect(r.isFaithful).toBe(false);
    expect(r.violations.some((v) => v.field === 'company' && v.tailoredValue === 'OpenAI')).toBe(
      true
    );
  });
});

describe('golden set — deterministic ATS keyword coverage', () => {
  it('is stable and case-insensitive', () => {
    const a = computeKeywordCoverage(['Built ML pipelines in Python'], ['python', 'ML', 'rust']);
    const b = computeKeywordCoverage(['Built ML pipelines in Python'], ['python', 'ML', 'rust']);
    expect(a).toEqual(b); // deterministic
    expect(a.found).toEqual(expect.arrayContaining(['python', 'ML']));
    expect(a.missing).toEqual(['rust']);
    expect(a.score).toBe(67); // round(2/3 * 100)
  });

  it('scores 100 when there is nothing to match', () => {
    expect(computeKeywordCoverage(['anything'], []).score).toBe(100);
  });

  it('computes bidirectional skill overlap deterministically', () => {
    const { matched, missing } = computeSkillOverlap(['React.js', 'Node'], ['React', 'Vue']);
    expect(matched).toEqual(['React']); // "react.js" contains "react"
    expect(missing).toEqual(['Vue']);
  });
});

describe('golden set — prompt version registry', () => {
  it('registers a well-formed version for every agent step', () => {
    for (const id of PROMPT_FUNCTION_IDS) {
      expect(PROMPT_VERSIONS[id]).toMatch(/^v\d+$/);
    }
  });

  it('has no version entries outside the known function ids (no drift)', () => {
    expect(Object.keys(PROMPT_VERSIONS).sort()).toEqual([...PROMPT_FUNCTION_IDS].sort());
  });
});

// Skipped (not passed) when the binary is absent; when present, a compile
// failure here is a genuine regression and fails the test.
describe.skipIf(!TYPST_AVAILABLE)('golden set — Typst escaping compiles (P0-3 safety net)', () => {
  it('compiles a normal resume to a non-empty PDF', async () => {
    const { pdf } = await compileTypstToPdf(generateTypstCode(baseResume()));
    expect(pdf.byteLength).toBeGreaterThan(0);
  });

  it('compiles a resume full of Typst-hostile characters', async () => {
    const adversarial = baseResume();
    adversarial.basics.name = 'C# "Quotes" \\ #raw $math$ <tag>';
    adversarial.basics.label = 'Dev @ Acme [bracket] *star* _under_';
    adversarial.basics.summary = 'Hash #1, dollar $5, backtick `x`, emoji 🚀, CJK 简历.';
    adversarial.skills = [{ name: 'Symbols', keywords: ['C++', 'C#', 'F#', '.NET', 'A & B'] }];
    adversarial.work[0].highlights = ['Saved $1M', 'Cut #defects 50%', 'Used <Generics>'];
    const { pdf } = await compileTypstToPdf(generateTypstCode(adversarial));
    expect(pdf.byteLength).toBeGreaterThan(0);
  });
});
