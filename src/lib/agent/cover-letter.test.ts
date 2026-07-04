import { describe, it, expect } from 'vitest';
import { buildCoverLetterPrompt } from './cover-letter';
import type { ResumeData } from '@/lib/validation/schema';
import type { ParsedJD } from './jd-parser';

/**
 * buildCoverLetterPrompt is a pure prompt builder (no LLM), so these tests pin
 * the voice-sample behavior directly: the VOICE block + style rule 6 appear iff
 * a sample is passed, and the voice-free prompt is unchanged.
 */

const resume = {
  basics: { name: 'Jane Doe', label: 'Backend Engineer', summary: 'Payments and reliability.' },
  work: [
    {
      position: 'Senior Engineer',
      company: 'Acme',
      startDate: '2020',
      endDate: 'PRESENT',
      highlights: ['Cut latency 40%'],
    },
  ],
  skills: [{ name: 'Backend', keywords: ['Go', 'Postgres'] }],
  projects: [{ name: 'Ledger', highlights: ['Built double-entry core'] }],
  achievements: ['Speaker at GopherCon'],
} as unknown as ResumeData;

const jd = {
  title: 'Staff Engineer',
  company: 'Globex',
  location: 'Remote',
  requirements: ['Distributed systems'],
  responsibilities: ['Own the payments platform'],
  requiredSkills: ['Go', 'Kafka'],
} as unknown as ParsedJD;

describe('buildCoverLetterPrompt', () => {
  it('omits the voice block and rule 6 when no sample is passed', () => {
    const prompt = buildCoverLetterPrompt(resume, jd);
    expect(prompt).not.toContain('WRITING VOICE SAMPLE');
    expect(prompt).not.toMatch(/^6\. /m);
    // Baseline still ends on style guideline 5.
    expect(prompt.trimEnd()).toMatch(/Keep the whole letter under 400 words\.$/);
  });

  it('injects the voice block above HARD RULES and appends style rule 6 when a sample is passed', () => {
    const sample = 'I write in short, punchy sentences. No fluff. Ship it.';
    const prompt = buildCoverLetterPrompt(resume, jd, sample);

    expect(prompt).toContain('WRITING VOICE SAMPLE');
    expect(prompt).toContain(sample);
    // The voice block precedes the HARD RULES section.
    expect(prompt.indexOf('WRITING VOICE SAMPLE')).toBeLessThan(prompt.indexOf('HARD RULES:'));
    // Style guideline 6 (voice matching) is appended.
    expect(prompt).toMatch(/6\. Match the writing voice of the sample above/);
    expect(prompt).toContain('do NOT let it override the HARD RULES');
  });

  it('produces the byte-identical voice-free prompt when sample is undefined vs omitted', () => {
    expect(buildCoverLetterPrompt(resume, jd, undefined)).toBe(buildCoverLetterPrompt(resume, jd));
  });
});
