import { z } from "zod";

/**
 * Zod schemas for CopilotKit tool parameters.
 * Provides type-safe validation for AI-generated data.
 */

// ===== Basic Info Schemas =====

export const BasicInfoSchema = z.object({
  name: z.string().min(1).describe("Full name of the person"),
  label: z.string().min(1).describe("Professional title (e.g., 'Senior Software Engineer')"),
  email: z.string().email().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  location: z.string().optional().describe("City, Country"),
  summary: z.string().optional().describe("Professional summary (2-4 sentences)"),
});

export const UpdateBasicInfoSchema = z.object({
  name: z.string().min(1).optional().describe("Full name"),
  label: z.string().min(1).optional().describe("Professional title"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  location: z.string().optional().describe("City, Country"),
  summary: z.string().optional().describe("Professional summary"),
});

// ===== Work Experience Schemas =====

export const WorkExperienceSchema = z.object({
  company: z.string().min(1).describe("Company name"),
  position: z.string().min(1).describe("Job title"),
  startDate: z.string().min(1).describe("Start date (e.g., 'Jan 2020')"),
  endDate: z.string().min(1).describe("End date or 'PRESENT'"),
  location: z.string().min(1).describe("Job location"),
  type: z.string().min(1).describe("Employment type (Full-time, Part-time, Contract, Internship)"),
  highlights: z.array(z.string()).describe("Achievement bullet points using action verbs"),
});

export const UpdateWorkExperienceSchema = z.object({
  index: z.number().int().min(0).describe("Index of the work experience to update (0-based)"),
  company: z.string().min(1).optional().describe("Company name"),
  position: z.string().min(1).optional().describe("Job title"),
  startDate: z.string().optional().describe("Start date"),
  endDate: z.string().optional().describe("End date"),
  location: z.string().optional().describe("Job location"),
  type: z.string().optional().describe("Employment type"),
  highlights: z.array(z.string()).optional().describe("Achievement bullet points"),
});

// ===== Education Schemas =====

export const EducationSchema = z.object({
  institution: z.string().min(1).describe("School/University name"),
  area: z.string().min(1).describe("Field of study (e.g., 'Computer Science')"),
  studyType: z.string().min(1).describe("Degree type (e.g., 'Bachelor of Science')"),
  startDate: z.string().min(1).describe("Start date"),
  endDate: z.string().min(1).describe("End date or expected graduation"),
  location: z.string().min(1).describe("Location"),
  gpa: z.string().optional().describe("GPA (optional)"),
  note: z.string().optional().describe("Additional notes (honors, relevant coursework)"),
});

export const UpdateEducationSchema = z.object({
  index: z.number().int().min(0).describe("Index of the education to update (0-based)"),
  institution: z.string().optional().describe("School/University name"),
  area: z.string().optional().describe("Field of study"),
  studyType: z.string().optional().describe("Degree type"),
  startDate: z.string().optional().describe("Start date"),
  endDate: z.string().optional().describe("End date"),
  location: z.string().optional().describe("Location"),
  gpa: z.string().optional().describe("GPA"),
  note: z.string().optional().describe("Additional notes"),
});

// ===== Skills Schemas =====

export const SkillCategorySchema = z.object({
  name: z.string().min(1).describe("Category name (e.g., 'Programming Languages', 'Frameworks')"),
  keywords: z.array(z.string()).min(1).describe("List of skills in this category"),
});

export const UpdateSkillCategorySchema = z.object({
  index: z.number().int().min(0).describe("Index of the skill category to update (0-based)"),
  name: z.string().optional().describe("Category name"),
  keywords: z.array(z.string()).optional().describe("List of skills"),
});

// ===== Project Schemas =====

export const ProjectSchema = z.object({
  name: z.string().min(1).describe("Project name"),
  description: z.string().min(1).describe("Brief project description"),
  highlights: z.array(z.string()).describe("Key achievements or features"),
  url: z.string().url().optional().describe("Project URL (optional)"),
});

export const UpdateProjectSchema = z.object({
  index: z.number().int().min(0).describe("Index of the project to update (0-based)"),
  name: z.string().optional().describe("Project name"),
  description: z.string().optional().describe("Project description"),
  highlights: z.array(z.string()).optional().describe("Key achievements"),
  url: z.string().optional().describe("Project URL"),
});

// ===== Template Selection Schema =====

export const TemplateSelectionSchema = z.object({
  templateId: z.string().min(1).describe("Template ID to switch to"),
  reason: z.string().optional().describe("Why this template is recommended"),
});

// ===== Social Profile Schema =====

export const SocialProfileSchema = z.object({
  network: z.string().min(1).describe("Network name (LinkedIn, GitHub, Portfolio, etc.)"),
  url: z.string().url().describe("Profile URL"),
  label: z.string().optional().describe("Display label (optional)"),
});

// ===== Content Generation Schema =====

export const ContentGenerationSchema = z.object({
  targetRole: z.string().describe("Target job role"),
  industry: z.string().describe("Target industry"),
  yearsExperience: z.number().describe("Years of experience"),
  keySkills: z.array(z.string()).describe("Key skills to highlight"),
});

// ===== Index-only Schemas =====

export const IndexSchema = z.object({
  index: z.number().int().min(0).describe("Index of the item to remove (0-based)"),
});

export const AchievementSchema = z.object({
  achievement: z.string().min(1).describe("Achievement description"),
});

export const CertificationSchema = z.object({
  certification: z.string().min(1).describe("Certification name and details"),
});

// ===== Export all schemas =====

export const CopilotSchemas = {
  // Basic Info
  basicInfo: BasicInfoSchema,
  updateBasicInfo: UpdateBasicInfoSchema,
  
  // Work
  workExperience: WorkExperienceSchema,
  updateWorkExperience: UpdateWorkExperienceSchema,
  
  // Education
  education: EducationSchema,
  updateEducation: UpdateEducationSchema,
  
  // Skills
  skillCategory: SkillCategorySchema,
  updateSkillCategory: UpdateSkillCategorySchema,
  
  // Projects
  project: ProjectSchema,
  updateProject: UpdateProjectSchema,
  
  // Others
  templateSelection: TemplateSelectionSchema,
  socialProfile: SocialProfileSchema,
  contentGeneration: ContentGenerationSchema,
  index: IndexSchema,
  achievement: AchievementSchema,
  certification: CertificationSchema,
};

// ===== Type exports =====

export type BasicInfo = z.infer<typeof BasicInfoSchema>;
export type UpdateBasicInfo = z.infer<typeof UpdateBasicInfoSchema>;
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export type UpdateWorkExperience = z.infer<typeof UpdateWorkExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type UpdateEducation = z.infer<typeof UpdateEducationSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type UpdateSkillCategory = z.infer<typeof UpdateSkillCategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
export type TemplateSelection = z.infer<typeof TemplateSelectionSchema>;
export type SocialProfile = z.infer<typeof SocialProfileSchema>;
export type ContentGeneration = z.infer<typeof ContentGenerationSchema>;
