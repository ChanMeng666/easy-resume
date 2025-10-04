import { z } from 'zod';

// Profile schema (e.g., LinkedIn, GitHub, Portfolio)
export const profileSchema = z.object({
  network: z.string().min(1, 'Network is required'),
  url: z.string().url('Must be a valid URL'),
  label: z.string().optional(),
});

// Basic information schema
export const basicsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  label: z.string().min(1, 'Professional title is required'),
  email: z.string().email('Must be a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  location: z.string().min(1, 'Location is required'),
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
});

// Type inference from Zod schema
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Basics = z.infer<typeof basicsSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Work = z.infer<typeof workSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Profile = z.infer<typeof profileSchema>;
