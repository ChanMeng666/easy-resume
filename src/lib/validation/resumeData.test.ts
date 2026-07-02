import { describe, it, expect } from 'vitest';
import { resumeDataSchema } from './schema';
import { generateTypstCode } from '@/lib/typst/generator';

// Regression for a production generation failure: the background parser is
// (correctly) forbidden from inventing dates/locations/types, so it outputs ""
// when the user's background doesn't state them — but the schema required
// min(1) on those fields, so a TRUTHFUL model response failed validation and
// killed the whole run at parse_background. Fields the AI must never invent
// must tolerate being empty.

/** The exact shape gpt-4o returned for an incomplete background (prod repro). */
function incompleteResume() {
  return {
    basics: {
      name: 'Taylor Kim',
      label: 'Backend Developer',
      email: '',
      phone: '',
      location: '',
      summary: 'Experienced backend developer.',
      photo: '',
      profiles: [],
    },
    education: [
      {
        institution: 'University of Auckland',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '', // user never stated it — must be accepted
        endDate: '2018',
        location: 'Auckland, New Zealand',
        gpa: '',
        note: '',
      },
    ],
    skills: [{ name: 'Programming Languages', keywords: ['TypeScript'] }],
    work: [
      {
        company: 'Fonterra Digital',
        position: 'Senior Software Engineer',
        startDate: '2021',
        endDate: 'PRESENT',
        location: '', // user never stated it — must be accepted
        type: '', // ditto
        highlights: ['Built TypeScript microservices'],
      },
    ],
    projects: [{ name: 'Ingest CLI', description: '', highlights: ['Shipped it'], url: '' }],
    achievements: [],
    certifications: [],
    references: '',
  };
}

describe('resumeDataSchema — never-invent fields tolerate empty', () => {
  it('accepts a truthful parse with unknown dates/locations/type/description', () => {
    const r = resumeDataSchema.safeParse(incompleteResume());
    expect(r.success).toBe(true);
  });

  it('still requires the identity fields that make an entry meaningful', () => {
    const bad = incompleteResume();
    bad.work[0].company = '';
    expect(resumeDataSchema.safeParse(bad).success).toBe(false);
  });

  it('renders Typst from an incomplete resume without throwing', () => {
    const parsed = resumeDataSchema.parse(incompleteResume());
    const code = generateTypstCode(parsed);
    // Present sides of a half-known date range still render; nothing crashes.
    expect(code).toContain('2018');
    expect(code).toContain('Fonterra Digital');
  });
});
