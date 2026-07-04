import { describe, it, expect } from 'vitest';
import { toWireResult, deriveJobTitle } from './persist';
import type { GenerateResult, GenerateInput } from '@/server/core/pipeline.types';

/**
 * Pins the pure helpers behind generation persistence:
 *  - toWireResult drops the PDF bytes but preserves every wire field + usage;
 *  - deriveJobTitle prefers the professional label, falls back to the JD's
 *    first line, then a generic label, and never overflows the column.
 */

/** Build a minimal-but-complete GenerateResult for the helpers. */
function makeResult(over: Partial<GenerateResult> = {}): GenerateResult {
  return {
    resumeData: { basics: { name: 'Jane Doe', label: 'Senior Backend Engineer' } } as GenerateResult['resumeData'],
    typstCode: '#set page()',
    coverLetter: 'Dear Hiring Manager, ...',
    coverLetterTypst: '#set page()',
    atsScore: 91,
    matchAnalysis: { overallScore: 82, matchedSkills: ['Rust'], missingSkills: [] },
    templateId: 'two-column',
    tokens: { palette: 'slate', density: 'comfortable' },
    pdf: new Uint8Array([37, 80, 68, 70]),
    usage: { charged: true, credits: 1, transactionId: 'tx_1' },
    promptVersions: { 'parse-jd': 'v1' },
    parsedJD: {
      title: 'Staff Engineer, Payments',
      company: 'Acme',
      location: 'Remote',
      type: 'full-time',
      experienceLevel: 'senior',
      summary: 'Build payment systems.',
      requiredSkills: ['Rust'],
      preferredSkills: [],
      keywords: ['payments'],
      responsibilities: [],
      requirements: [],
      benefits: [],
      industry: 'Fintech',
    } as GenerateResult['parsedJD'],
    ...over,
  };
}

const input: GenerateInput = {
  jobDescription: 'Staff Engineer, Payments\nWe are hiring a staff engineer...',
  background: '8 years building payment systems.',
};

describe('toWireResult', () => {
  it('omits the raw PDF bytes', () => {
    const wire = toWireResult(makeResult());
    expect('pdf' in wire).toBe(false);
  });

  it('preserves every wire field including usage', () => {
    const r = makeResult();
    const wire = toWireResult(r);
    expect(wire).toEqual({
      resumeData: r.resumeData,
      typstCode: r.typstCode,
      coverLetter: r.coverLetter,
      coverLetterTypst: r.coverLetterTypst,
      atsScore: r.atsScore,
      matchAnalysis: r.matchAnalysis,
      templateId: r.templateId,
      tokens: r.tokens,
      usage: r.usage,
      promptVersions: r.promptVersions,
      parsedJD: r.parsedJD,
    });
  });

  it('persists the design tokens', () => {
    const wire = toWireResult(makeResult({ tokens: { palette: 'crimson', density: 'compact' } }));
    expect(wire.tokens).toEqual({ palette: 'crimson', density: 'compact' });
  });
});

describe('deriveJobTitle', () => {
  it('prefers the professional label from the tailored resume', () => {
    expect(deriveJobTitle(input, makeResult())).toBe('Senior Backend Engineer');
  });

  it('falls back to the first non-empty line of the job description', () => {
    const result = makeResult({
      resumeData: { basics: { name: 'Jane Doe', label: '' } } as GenerateResult['resumeData'],
    });
    expect(deriveJobTitle({ ...input, jobDescription: '\n\n  Staff Engineer, Payments\nmore' }, result)).toBe(
      'Staff Engineer, Payments'
    );
  });

  it('falls back to a generic label when nothing is available', () => {
    const result = makeResult({
      resumeData: { basics: { name: 'Jane Doe', label: '' } } as GenerateResult['resumeData'],
    });
    expect(deriveJobTitle({ jobDescription: '   ', background: '' }, result)).toBe('Untitled resume');
  });

  it('works with no result (e.g. before the pipeline returns)', () => {
    expect(deriveJobTitle(input, undefined)).toBe('Staff Engineer, Payments');
  });

  it('truncates an overly long title with an ellipsis', () => {
    const longLabel = 'A'.repeat(200);
    const title = deriveJobTitle(input, makeResult({
      resumeData: { basics: { name: 'Jane Doe', label: longLabel } } as GenerateResult['resumeData'],
    }));
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith('…')).toBe(true);
  });
});
