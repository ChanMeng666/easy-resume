import { describe, it, expect } from 'vitest';
import type { ResumeData } from '@/lib/validation/schema';
import type { DesignTokens } from '@/lib/design/tokens';
import { generateTypstCode } from '@/lib/typst/generator';
import { generateModernCV } from './modern-cv/generator';
import { generateExecutiveResume } from './executive/generator';
import { generateCreativePortfolio } from './creative/generator';
import { generateCompactResume } from './compact/generator';
import { generateBankingResume } from './banking/generator';
import { generateAcademicCV } from './academic/generator';
import { getTemplateById, renderTemplate } from './registry';

/**
 * Density landing invariants across all 7 template generators:
 *  - comfortable output is byte-identical to today's default (old jobs unchanged);
 *  - compact changes ONLY inter-block vertical gap magnitudes (structure, and
 *    therefore ATS parsing, is untouched);
 *  - compact actually differs from comfortable (the scale is wired through).
 */

// A long fixture: 8 work entries, 6 projects, long highlights, full sidebar.
const data: ResumeData = {
  basics: {
    name: 'Alexandra Q. Rivera',
    label: 'Principal Platform Engineer',
    email: 'alex@example.com',
    phone: '+1 555 0100',
    location: 'Remote (UTC-5)',
    summary:
      'Principal engineer with 12 years building resilient, high-throughput distributed systems, ' +
      'developer platforms, and the teams that run them. Bias toward measurable outcomes.',
    profiles: [
      { network: 'GitHub', url: 'https://github.com/arivera', label: 'arivera' },
      { network: 'LinkedIn', url: 'https://linkedin.com/in/arivera', label: 'in/arivera' },
    ],
  },
  education: [
    {
      institution: 'Massachusetts Institute of Technology',
      area: 'Computer Science',
      studyType: 'BSc',
      startDate: 'Sep 2008',
      endDate: 'Jun 2012',
      location: 'Cambridge, MA',
      gpa: '3.9',
      note: 'Thesis on lock-free concurrent data structures.',
    },
    {
      institution: 'Stanford University',
      area: 'Distributed Systems',
      studyType: 'MSc',
      startDate: 'Sep 2012',
      endDate: 'Jun 2014',
      location: 'Stanford, CA',
      gpa: '4.0',
      note: '',
    },
  ],
  skills: [
    { name: 'Languages', keywords: ['Rust', 'TypeScript', 'Go', 'Python', 'Java'] },
    { name: 'Infrastructure', keywords: ['Kubernetes', 'Terraform', 'AWS', 'Postgres', 'Kafka'] },
    { name: 'Practices', keywords: ['SRE', 'Observability', 'CI/CD', 'Chaos testing'] },
  ],
  work: Array.from({ length: 8 }, (_, i) => ({
    company: `Company ${i + 1} Holdings`,
    position: `Senior Staff Engineer ${i + 1}`,
    type: 'Full-time',
    startDate: `Jan 20${10 + i}`,
    endDate: i === 0 ? 'PRESENT' : `Dec 20${10 + i}`,
    location: 'Remote',
    highlights: [
      `Led the ${i + 1}th platform initiative, coordinating across ${3 + i} teams and ${20 + i} engineers.`,
      `Cut p99 latency by ${30 + i}% and infrastructure spend by ${15 + i}% through targeted rearchitecture.`,
      `Introduced an internal developer platform adopted by ${40 + i * 5} services within two quarters.`,
      `Mentored ${2 + i} engineers to senior, and authored the team's operational-excellence playbook.`,
    ],
  })),
  projects: Array.from({ length: 6 }, (_, i) => ({
    name: `Open Project ${i + 1}`,
    description: `A widely used open-source library number ${i + 1} for high-performance workloads.`,
    url: i % 2 === 0 ? `https://github.com/arivera/project-${i + 1}` : '',
    highlights: [
      `Reached ${1 + i}k GitHub stars and ${100 + i * 10} contributors across the ecosystem.`,
      `Benchmarked ${2 + i}x faster than the previous state of the art on standard suites.`,
    ],
  })),
  achievements: [
    'Speaker at RustConf 2023 and KubeCon 2024.',
    'Recipient of the internal Distinguished Engineer award, 2022.',
    'Maintainer of two CNCF sandbox projects.',
  ],
  certifications: [
    'AWS Certified Solutions Architect — Professional',
    'Certified Kubernetes Administrator (CKA)',
    'HashiCorp Terraform Associate',
  ],
  references: 'Available on request.',
};

type Generator = (data: ResumeData, tokens?: DesignTokens) => string;

const generators: { name: string; gen: Generator }[] = [
  { name: 'two-column', gen: generateTypstCode },
  { name: 'modern-cv', gen: generateModernCV },
  { name: 'executive', gen: generateExecutiveResume },
  { name: 'creative', gen: generateCreativePortfolio },
  { name: 'compact', gen: generateCompactResume },
  { name: 'banking', gen: generateBankingResume },
  { name: 'academic', gen: generateAcademicCV },
];

const comfortable: DesignTokens = { palette: 'slate', density: 'comfortable' };
const compact: DesignTokens = { palette: 'slate', density: 'compact' };

/** Normalize the only things density is allowed to change: gap magnitudes. */
function stripGaps(s: string): string {
  return s
    .replace(/v\(\d*\.?\d+em\)/g, 'v(GAP)')
    .replace(/row-gutter: \d*\.?\d+em/g, 'row-gutter: GAP');
}

describe('density landing — per template', () => {
  for (const { name, gen } of generators) {
    describe(name, () => {
      it('comfortable is byte-identical to the no-tokens default', () => {
        expect(gen(data, comfortable)).toBe(gen(data));
      });

      it('compact changes only gap magnitudes (structure preserved → ATS-safe)', () => {
        expect(stripGaps(gen(data, compact))).toBe(stripGaps(gen(data, comfortable)));
      });

      it('compact differs from comfortable (density is wired through)', () => {
        expect(gen(data, compact)).not.toBe(gen(data, comfortable));
      });
    });
  }
});

describe('renderTemplate — lockPalette honors density (palette lock is color-only)', () => {
  for (const id of ['executive', 'creative']) {
    it(`${id} keeps its brand palette but still applies compact density`, () => {
      const template = getTemplateById(id)!;
      // A non-default palette must NOT leak (color identity is locked)...
      const comf = renderTemplate(template, data, { palette: 'indigo', density: 'comfortable' });
      const locked = renderTemplate(template, data, comfortable);
      expect(comf).toBe(locked);
      // ...yet density DOES change the output through the render seam.
      const comp = renderTemplate(template, data, { palette: 'indigo', density: 'compact' });
      expect(comp).not.toBe(comf);
      expect(stripGaps(comp)).toBe(stripGaps(comf));
    });
  }
});
