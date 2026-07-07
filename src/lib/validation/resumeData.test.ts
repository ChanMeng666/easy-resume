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

// Regression for a second production parse_background failure: the parser
// returned project/profile URLs WITHOUT a scheme (e.g. "www.vitex.org.nz/",
// "glama.ai/mcp/...") — exactly how people write URLs in free text — but
// z.string().url() requires a scheme, so a truthful model response failed
// validation and killed the whole generation. Scheme-less URLs must be
// normalized (https:// prepended), not rejected.
describe('resumeDataSchema — scheme-less URLs are normalized, not rejected', () => {
  // A fresh literal (not a mutation of incompleteResume's narrowly-typed result)
  // so the profile/project arrays type cleanly.
  function resumeWithBareUrls() {
    const base = incompleteResume();
    return {
      ...base,
      basics: {
        ...base.basics,
        profiles: [{ network: 'LinkedIn', url: 'linkedin.com/in/x', label: 'LinkedIn' }],
      },
      projects: [
        { name: 'Tam-AI-Ti', description: '', highlights: ['x'], url: 'tamaiti.whiri-ai.com/' },
        { name: 'Vitex', description: '', highlights: ['x'], url: 'www.vitex.org.nz/' },
        { name: 'GN MCP', description: '', highlights: ['x'], url: 'glama.ai/mcp/servers/x' },
        { name: 'Echook', description: '', highlights: ['x'], url: 'https://github.com/x/echook' },
        { name: 'NoUrl', description: '', highlights: ['x'], url: '' },
      ],
    };
  }

  it('accepts the exact prod payload with scheme-less project + profile URLs', () => {
    const parsed = resumeDataSchema.parse(resumeWithBareUrls());
    expect(parsed.projects[0].url).toBe('https://tamaiti.whiri-ai.com/');
    expect(parsed.projects[1].url).toBe('https://www.vitex.org.nz/');
    expect(parsed.projects[2].url).toBe('https://glama.ai/mcp/servers/x');
    // Already-qualified URLs and empties are untouched.
    expect(parsed.projects[3].url).toBe('https://github.com/x/echook');
    expect(parsed.projects[4].url).toBe('');
    expect(parsed.basics.profiles[0].url).toBe('https://linkedin.com/in/x');
  });

  it('renders Typst from the normalized URLs without throwing', () => {
    const parsed = resumeDataSchema.parse(resumeWithBareUrls());
    const code = generateTypstCode(parsed);
    // The default template renders the profile URL as a #link; cleanURL strips
    // the scheme for the visible label, so the bare host shows through.
    expect(code).toContain('linkedin.com/in/x');
  });
});
