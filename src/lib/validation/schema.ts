import { z } from 'zod';

// Profile schema (e.g., LinkedIn, GitHub, Portfolio)
export const profileSchema = z.object({
  network: z.string().min(1, 'Network is required'),
  url: z.string().url('Must be a valid URL'),
  label: z.string().optional(),
});

// Basic information schema
// Contact fields (email/phone/location) are intentionally optional: the AI must
// NEVER invent them. When the user omits a contact detail, the field stays empty
// and the Typst generator simply skips that row — far better than a fake
// "+1 (555) 000-0000" on a real, submittable resume.
export const basicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().min(1, 'Professional title is required'),
  email: z
    .string()
    .email('Must be a valid email')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  photo: z.string().optional(), // Optional photo filename or URL
  profiles: z.array(profileSchema),
});

// Education schema
export const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required'),
  area: z.string().min(1, 'Field of study is required'),
  studyType: z.string().min(1, 'Degree type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().min(1, 'Location is required'),
  gpa: z.string().optional(),
  note: z.string().optional(),
});

// Work experience schema
export const workSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().min(1, 'Location is required'),
  type: z.string().min(1, 'Employment type is required'),
  highlights: z.array(z.string()),
});

// Project schema
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().min(1, 'Description is required'),
  highlights: z.array(z.string()),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

// Skills schema
export const skillSchema = z.object({
  name: z.string().min(1, 'Skill category is required'),
  keywords: z.array(z.string()).min(1, 'At least one skill is required'),
});

// Complete resume data schema
export const resumeDataSchema = z.object({
  basics: basicsSchema,
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
  work: z.array(workSchema),
  projects: z.array(projectSchema),
  achievements: z.array(z.string()),
  certifications: z.array(z.string()),
  references: z.string().optional(),
});

// Candidate profile input (create payload for /api/profiles).
//
// We deliberately do NOT accept a client-supplied parsed `data`: the server
// always parses `rawBackground` itself. Trusting client `data` would let a
// caller inject an arbitrary, unbounded "base resume" that the pipeline embeds
// verbatim into LLM prompts (bypassing the parse step's normalization) for the
// cost of a single credit — an asymmetric token-cost abuse. Parsing server-side
// keeps the stored data bounded and faithful to the raw text.
export const candidateProfileInputSchema = z.object({
  label: z.string().trim().min(1).max(255).optional(),
  rawBackground: z.string().trim().min(1, 'Background is required').max(50_000),
});
export type CandidateProfileInput = z.infer<typeof candidateProfileInputSchema>;

// Partial update payload — every field optional, but at least one is enforced
// in the route. A `rawBackground` change re-parses server-side (same rationale
// as above: no client-supplied `data`).
export const candidateProfileUpdateSchema = z.object({
  label: z.string().trim().min(1).max(255).optional(),
  rawBackground: z.string().trim().min(1).max(50_000).optional(),
});
export type CandidateProfileUpdate = z.infer<typeof candidateProfileUpdateSchema>;

// Rename a version in a refine chain (PATCH /api/resumes/[id]). An empty string
// clears the label (falls back to the derived title). Capped to keep the strip
// chip readable.
export const versionLabelUpdateSchema = z.object({
  versionLabel: z.string().trim().max(120),
});
export type VersionLabelUpdate = z.infer<typeof versionLabelUpdateSchema>;

// Persist a free, client-edited resume as a NEW uncharged version
// (POST /api/resumes/[id]/versions). The server re-renders Typst itself, so the
// client only sends the structured data + optional label/template. This never
// runs the LLM pipeline and never charges — it is pure user-owned storage.
// Bounds for a client-supplied manual version. The base resumeDataSchema is
// intentionally lenient (it validates LLM output we trust), but here the client
// sends the structured data directly, so we cap total size + array counts to
// stop cheap unbounded storage / pathological render cost (rate limiting only
// bounds frequency). A real resume is a few KB and a handful of entries.
const MANUAL_VERSION_MAX_BYTES = 60_000;
const MANUAL_VERSION_MAX_ENTRIES = 50; // top-level sections (work/projects/…)
const MANUAL_VERSION_MAX_LIST = 100; // flat string lists (achievements/certifications)
const MANUAL_VERSION_MAX_NESTED = 50; // nested arrays (highlights/keywords/profiles)

export const manualVersionCreateSchema = z
  .object({
    resumeData: resumeDataSchema,
    templateId: z.string().trim().min(1).max(50).optional(),
    versionLabel: z.string().trim().max(120).optional(),
  })
  .superRefine((val, ctx) => {
    const r = val.resumeData;
    const tooBig = () =>
      ctx.addIssue({ code: 'custom', message: 'Resume data is too large', path: ['resumeData'] });

    if (JSON.stringify(r).length > MANUAL_VERSION_MAX_BYTES) return tooBig();
    if (
      r.work.length > MANUAL_VERSION_MAX_ENTRIES ||
      r.projects.length > MANUAL_VERSION_MAX_ENTRIES ||
      r.education.length > MANUAL_VERSION_MAX_ENTRIES ||
      r.skills.length > MANUAL_VERSION_MAX_ENTRIES ||
      r.achievements.length > MANUAL_VERSION_MAX_LIST ||
      r.certifications.length > MANUAL_VERSION_MAX_LIST
    ) {
      return tooBig();
    }
    // Cap NESTED arrays too: each feeds Typst element generation directly
    // (skill tags, bullet lists, profile rows), so an unbounded nested array is
    // a render-cost vector even under the byte/top-level caps.
    if (
      r.basics.profiles.length > MANUAL_VERSION_MAX_NESTED ||
      r.work.some((w) => w.highlights.length > MANUAL_VERSION_MAX_NESTED) ||
      r.projects.some((p) => p.highlights.length > MANUAL_VERSION_MAX_NESTED) ||
      r.skills.some((s) => s.keywords.length > MANUAL_VERSION_MAX_NESTED)
    ) {
      return tooBig();
    }
  });
export type ManualVersionCreate = z.infer<typeof manualVersionCreateSchema>;
// Application tracker status state machine. Any status is reachable from any
// other (the tracker is a simple manual log, not an enforced workflow): a user
// may jump straight to "offer" or move back from "interview" to "applied".
export const APPLICATION_STATUSES = [
  'draft',
  'applied',
  'interview',
  'offer',
  'rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Create payload for POST /api/applications. company + position are required;
// everything else is optional. `generationJobId` optionally links the
// application to the live generation that produced the resume (ownership of the
// linked job is verified server-side).
export const applicationCreateSchema = z.object({
  company: z.string().trim().min(1, 'Company is required').max(255),
  position: z.string().trim().min(1, 'Position is required').max(255),
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().trim().max(10_000).optional(),
  generationJobId: z.string().uuid().optional(),
});
export type ApplicationCreate = z.infer<typeof applicationCreateSchema>;

// Partial update payload for PATCH /api/applications/{id}. Every field optional;
// the route enforces that at least one is present. `notes` accepts an empty
// string so a user can clear it.
export const applicationUpdateSchema = z.object({
  company: z.string().trim().min(1).max(255).optional(),
  position: z.string().trim().min(1).max(255).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  notes: z.string().trim().max(10_000).optional(),
});
export type ApplicationUpdate = z.infer<typeof applicationUpdateSchema>;

// Open (or resume) a conversational edit thread anchored to a generated resume
// (POST /api/threads). `generationJobId` must be a job the caller owns and that
// has succeeded — the conversation edits that resume's parsed ResumeData. No
// client-supplied resume data: the baseline always comes from the anchor job
// server-side (same rationale as candidate profiles).
export const threadCreateSchema = z.object({
  generationJobId: z.string().uuid('A valid resume id is required'),
});
export type ThreadCreate = z.infer<typeof threadCreateSchema>;

// Type inference from Zod schema
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Work = z.infer<typeof workSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Profile = z.infer<typeof profileSchema>;
