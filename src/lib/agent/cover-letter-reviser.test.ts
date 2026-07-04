import { describe, it, expect } from 'vitest';
import { buildReviseCoverLetterPrompt } from './cover-letter-reviser';
import type { ResumeData } from '@/lib/validation/schema';
import type { ParsedJD } from './jd-parser';

/**
 * buildReviseCoverLetterPrompt is a pure prompt builder (no LLM), so these tests
 * pin the voice-sample behavior directly: the VOICE block + rule 6 appear iff a
 * sample is passed, and the voice-free prompt is byte-identical to today's.
 */

const resume = {
  basics: { name: 'Jane Doe', label: 'Backend Engineer', summary: 'Payments and reliability.' },
  skills: [{ name: 'Backend', keywords: ['Go', 'Postgres'] }],
} as unknown as ResumeData;

const jd = {
  title: 'Staff Engineer',
  company: 'Globex',
  requiredSkills: ['Go', 'Kafka'],
} as unknown as ParsedJD;

const currentLetter = 'Dear Hiring Manager,\n\nI build payment systems.\n\nSincerely,\n\nJane Doe';
const feedback = 'Make the tone warmer.';

describe('buildReviseCoverLetterPrompt', () => {
  it('omits the voice block and rule 6 when no sample is passed', () => {
    const prompt = buildReviseCoverLetterPrompt(currentLetter, resume, jd, feedback);
    expect(prompt).not.toContain('WRITING VOICE SAMPLE');
    expect(prompt).not.toMatch(/^6\. /m);
    // Baseline still ends on HARD RULE 5.
    expect(prompt.trimEnd()).toMatch(/Keep the whole letter under 400 words and to 2-4 body paragraphs\.$/);
  });

  it('injects the voice block above HARD RULES and appends rule 6 when a sample is passed', () => {
    const sample = 'I write in short, punchy sentences. No fluff. Ship it.';
    const prompt = buildReviseCoverLetterPrompt(currentLetter, resume, jd, feedback, sample);

    expect(prompt).toContain('WRITING VOICE SAMPLE');
    expect(prompt).toContain(sample);
    // The voice block precedes the HARD RULES section.
    expect(prompt.indexOf('WRITING VOICE SAMPLE')).toBeLessThan(prompt.indexOf('HARD RULES:'));
    // Rule 6 (voice matching) is appended and stays subordinate to the diff/facts rules.
    expect(prompt).toMatch(/6\. Keep the revised letter in the writing voice of the sample above/);
    expect(prompt).toContain('must NOT override any HARD RULE');
    expect(prompt).toContain('must NOT enlarge the minimal diff');
  });

  it('produces the byte-identical voice-free prompt when sample is undefined vs omitted', () => {
    expect(buildReviseCoverLetterPrompt(currentLetter, resume, jd, feedback, undefined)).toBe(
      buildReviseCoverLetterPrompt(currentLetter, resume, jd, feedback)
    );
  });
});
