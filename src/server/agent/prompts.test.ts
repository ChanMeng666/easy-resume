import { describe, it, expect } from 'vitest';
import { buildResumeProjection, buildEditSystemPrompt } from './prompts';
import type { ResumeData } from '@/lib/validation/schema';

// The system prompt embeds a COMPACT projection of the tool-editable surface, not
// the full ResumeData JSON — education/certs/contact/profile URLs are not editable
// in the chat, so shipping them every turn was pure token cost. These tests pin
// the projection shape (indices matching the edit tools) and the exclusions.

function makeResume(): ResumeData {
  return {
    basics: {
      name: 'Ada Lovelace',
      label: 'Engineer',
      email: 'ada@example.com',
      phone: '+64 21 000 000',
      location: 'Auckland',
      summary: 'Original summary.',
      profiles: [{ network: 'GitHub', url: 'https://github.com/ada' }],
    },
    education: [
      { institution: 'Cambridge', area: 'Math', studyType: 'BSc', startDate: '1830', endDate: '1835' },
    ],
    skills: [{ name: 'Languages', keywords: ['TypeScript'] }],
    work: [
      {
        company: 'Acme',
        position: 'Engineer',
        startDate: 'Jan 2020',
        endDate: 'PRESENT',
        location: 'Remote',
        type: 'Full-time',
        highlights: ['Did a thing'],
      },
    ],
    projects: [{ name: 'Engine', url: 'https://example.com', highlights: ['Built it'] }],
    achievements: ['Award'],
    certifications: ['Cert'],
  } as ResumeData;
}

describe('buildResumeProjection', () => {
  it('carries exactly the tool-editable fields with 0-based indices', () => {
    const p = buildResumeProjection(makeResume());
    expect(p.basics).toEqual({ name: 'Ada Lovelace', label: 'Engineer', location: 'Auckland', summary: 'Original summary.' });
    expect(p.work).toEqual([{ index: 0, company: 'Acme', position: 'Engineer', highlights: ['Did a thing'] }]);
    expect(p.projects).toEqual([{ index: 0, name: 'Engine', highlights: ['Built it'] }]);
    expect(p.skills).toEqual([{ index: 0, name: 'Languages', keywords: ['TypeScript'] }]);
  });

  it('excludes non-editable sections and contact/URL fields', () => {
    const json = JSON.stringify(buildResumeProjection(makeResume()));
    expect(json).not.toContain('ada@example.com');
    expect(json).not.toContain('+64 21 000 000');
    expect(json).not.toContain('Cambridge');
    expect(json).not.toContain('github.com');
    expect(json).not.toContain('Award');
    expect(json).not.toContain('Cert');
    expect(json).not.toContain('https://example.com');
  });
});

describe('buildEditSystemPrompt', () => {
  it('embeds the projection (not the full resume JSON)', () => {
    const prompt = buildEditSystemPrompt(makeResume());
    expect(prompt).toContain('Ada Lovelace');
    expect(prompt).toContain('Did a thing');
    // Full-JSON-only content must not leak into the prompt.
    expect(prompt).not.toContain('ada@example.com');
    expect(prompt).not.toContain('Cambridge');
    // The model is told the other sections exist but are not editable here.
    expect(prompt).toMatch(/NOT editable in this chat/);
  });

  it('embeds the cover letter section only when a letter exists', () => {
    const withLetter = buildEditSystemPrompt(makeResume(), 'Dear Hiring Manager,\n\nHello.');
    expect(withLetter).toContain('CURRENT COVER LETTER');
    const without = buildEditSystemPrompt(makeResume(), '');
    expect(without).toContain('no cover letter yet');
  });
});
