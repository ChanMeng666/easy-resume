import { describe, it, expect } from 'vitest';
import { buildRefineArtifacts } from './refineArtifacts';
import type { ParentJobInput, ParentJobResult } from './refineArtifacts';
import type { ResumeData } from '@/lib/validation/schema';
import type { ParsedJD } from '@/lib/agent/jd-parser';

/**
 * Pins the pure mapping from a persisted parent job to RefineArtifacts against
 * the shapes older/manual rows actually carry: missing parsedJD (re-parse path),
 * missing cover letter, and rows stored before a templateId was recorded.
 */

const resumeData = {
  basics: { name: 'Jane Doe', label: 'Staff Engineer' },
} as ResumeData;

const parsedJD = {
  title: 'Staff Engineer',
  company: 'Acme',
  location: 'Remote',
  type: 'full-time',
  experienceLevel: 'senior',
  summary: 'Build systems.',
  requiredSkills: ['Rust'],
  preferredSkills: [],
  keywords: ['payments'],
  responsibilities: [],
  requirements: [],
  benefits: [],
  industry: 'Fintech',
} as ParsedJD;

const input: ParentJobInput = { jobDescription: 'Staff Engineer\nWe are hiring...' };

describe('buildRefineArtifacts', () => {
  it('maps a complete parent result through unchanged', () => {
    const result: ParentJobResult = {
      resumeData,
      parsedJD,
      coverLetter: 'Dear Hiring Manager,',
      templateId: 'engineering',
      tokens: { palette: 'indigo', density: 'comfortable' },
      matchAnalysis: { overallScore: 80, matchedSkills: ['Rust'], missingSkills: ['Go'] },
    };
    expect(buildRefineArtifacts(input, result)).toEqual({
      resumeData,
      parsedJD,
      coverLetter: 'Dear Hiring Manager,',
      templateId: 'engineering',
      tokens: { palette: 'indigo', density: 'comfortable' },
      jobDescription: input.jobDescription,
      matchAnalysis: { overallScore: 80, matchedSkills: ['Rust'], missingSkills: ['Go'] },
    });
  });

  it('defaults tokens to DEFAULT_TOKENS for a parent stored before tokens shipped', () => {
    const artifacts = buildRefineArtifacts(input, { resumeData, templateId: 'two-column' });
    expect(artifacts.tokens).toEqual({ palette: 'slate', density: 'comfortable' });
  });

  it('leaves parsedJD undefined for jobs stored before parsedJD persistence', () => {
    const artifacts = buildRefineArtifacts(input, { resumeData, templateId: 'two-column' });
    expect(artifacts.parsedJD).toBeUndefined();
    // jobDescription is still carried so the core can re-parse it once.
    expect(artifacts.jobDescription).toBe(input.jobDescription);
  });

  it('defaults a missing cover letter to an empty string', () => {
    const artifacts = buildRefineArtifacts(input, { resumeData, templateId: 'two-column' });
    expect(artifacts.coverLetter).toBe('');
  });

  it('falls back to the two-column template when templateId is absent', () => {
    const artifacts = buildRefineArtifacts(input, { resumeData });
    expect(artifacts.templateId).toBe('two-column');
  });

  it('leaves matchAnalysis undefined when the parent has none', () => {
    const artifacts = buildRefineArtifacts(input, { resumeData });
    expect(artifacts.matchAnalysis).toBeUndefined();
  });

  it('defaults jobDescription to an empty string when the parent input has none', () => {
    const artifacts = buildRefineArtifacts({}, { resumeData });
    expect(artifacts.jobDescription).toBe('');
  });

  it('throws when the parent result has no resume data', () => {
    expect(() => buildRefineArtifacts(input, {})).toThrow(/not ready to refine/i);
  });
});
