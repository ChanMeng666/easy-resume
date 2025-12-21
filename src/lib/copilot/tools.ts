"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { ResumeData, Work, Education, Project, Skill } from "@/lib/validation/schema";
import { getAllTemplates } from "@/templates/registry";

/**
 * Create a compact summary of resume data to reduce token usage.
 * Instead of full JSON, send only essential info.
 */
function createResumeSummary(data: ResumeData): string {
  const lines: string[] = [];
  
  // Basics - compact format
  lines.push(`Name: ${data.basics.name || '[empty]'}`);
  lines.push(`Title: ${data.basics.label || '[empty]'}`);
  lines.push(`Email: ${data.basics.email || '[empty]'}`);
  if (data.basics.summary) {
    lines.push(`Summary: ${data.basics.summary.substring(0, 100)}${data.basics.summary.length > 100 ? '...' : ''}`);
  }
  
  // Work - just company and position
  if (data.work.length > 0) {
    lines.push(`Work (${data.work.length}): ${data.work.map(w => `${w.position}@${w.company}`).join(', ')}`);
  }
  
  // Education - compact
  if (data.education.length > 0) {
    lines.push(`Education (${data.education.length}): ${data.education.map(e => `${e.studyType} ${e.area}@${e.institution}`).join(', ')}`);
  }
  
  // Skills - just names
  if (data.skills.length > 0) {
    lines.push(`Skills (${data.skills.length} categories): ${data.skills.map(s => s.name).join(', ')}`);
  }
  
  // Counts for other sections
  if (data.projects.length > 0) lines.push(`Projects: ${data.projects.length}`);
  if (data.achievements.length > 0) lines.push(`Achievements: ${data.achievements.length}`);
  if (data.certifications.length > 0) lines.push(`Certifications: ${data.certifications.length}`);
  
  return lines.join('\n');
}

/**
 * Hook to register all resume-related readable context for CopilotKit.
 * Uses compact format to minimize token usage and avoid rate limits.
 */
export function useResumeReadableContext(
  resumeData: ResumeData,
  selectedTemplateId: string
) {
  // Expose compact resume summary (not full JSON to save tokens)
  useCopilotReadable({
    description: "Resume summary",
    value: createResumeSummary(resumeData),
  });

  // Expose template list compactly (just id:name)
  useCopilotReadable({
    description: "Templates: id|name",
    value: getAllTemplates().map((t) => `${t.metadata.id}|${t.metadata.name}`).join(', '),
  });

  // Selected template
  useCopilotReadable({
    description: "Selected template",
    value: selectedTemplateId,
  });
}

/**
 * Hook to register all resume manipulation tools for CopilotKit.
 */
export function useResumeTools(
  resumeData: ResumeData,
  updateData: (data: ResumeData) => void,
  selectedTemplateId: string,
  onTemplateChange: (templateId: string) => void
) {
  // ===== BASIC INFO TOOLS =====

  useCopilotAction({
    name: "updateBasicInfo",
    description: "Update the user's basic information (name, title, email, phone, location, summary)",
    parameters: [
      { name: "name", type: "string", description: "Full name", required: false },
      { name: "label", type: "string", description: "Professional title (e.g., 'Senior Software Engineer')", required: false },
      { name: "email", type: "string", description: "Email address", required: false },
      { name: "phone", type: "string", description: "Phone number", required: false },
      { name: "location", type: "string", description: "City, Country", required: false },
      { name: "summary", type: "string", description: "Professional summary (2-4 sentences)", required: false },
    ],
    handler: async (args) => {
      const updatedBasics = { ...resumeData.basics };
      if (args.name) updatedBasics.name = args.name;
      if (args.label) updatedBasics.label = args.label;
      if (args.email) updatedBasics.email = args.email;
      if (args.phone) updatedBasics.phone = args.phone;
      if (args.location) updatedBasics.location = args.location;
      if (args.summary !== undefined) updatedBasics.summary = args.summary;

      updateData({ ...resumeData, basics: updatedBasics });
      return "Basic information updated successfully";
    },
  });

  // ===== WORK EXPERIENCE TOOLS =====

  useCopilotAction({
    name: "addWorkExperience",
    description: "Add a new work experience entry",
    parameters: [
      { name: "company", type: "string", description: "Company name", required: true },
      { name: "position", type: "string", description: "Job title", required: true },
      { name: "startDate", type: "string", description: "Start date (e.g., 'Jan 2020')", required: true },
      { name: "endDate", type: "string", description: "End date or 'PRESENT'", required: true },
      { name: "location", type: "string", description: "Job location", required: true },
      { name: "type", type: "string", description: "Employment type (Full-time, Part-time, Contract, Internship)", required: true },
      { name: "highlights", type: "string[]", description: "Achievement bullet points (use action verbs)", required: true },
    ],
    handler: async (args) => {
      const newWork: Work = {
        company: args.company,
        position: args.position,
        startDate: args.startDate,
        endDate: args.endDate,
        location: args.location,
        type: args.type,
        highlights: args.highlights,
      };
      updateData({ ...resumeData, work: [...resumeData.work, newWork] });
      return `Added work experience at ${args.company}`;
    },
  });

  useCopilotAction({
    name: "updateWorkExperience",
    description: "Update an existing work experience entry by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the work experience to update (0-based)", required: true },
      { name: "company", type: "string", description: "Company name", required: false },
      { name: "position", type: "string", description: "Job title", required: false },
      { name: "startDate", type: "string", description: "Start date", required: false },
      { name: "endDate", type: "string", description: "End date", required: false },
      { name: "location", type: "string", description: "Job location", required: false },
      { name: "type", type: "string", description: "Employment type", required: false },
      { name: "highlights", type: "string[]", description: "Achievement bullet points", required: false },
    ],
    handler: async (args) => {
      const newWork = [...resumeData.work];
      if (args.index < 0 || args.index >= newWork.length) {
        return `Invalid index: ${args.index}. There are ${newWork.length} work experiences.`;
      }
      const updated = { ...newWork[args.index] };
      if (args.company) updated.company = args.company;
      if (args.position) updated.position = args.position;
      if (args.startDate) updated.startDate = args.startDate;
      if (args.endDate) updated.endDate = args.endDate;
      if (args.location) updated.location = args.location;
      if (args.type) updated.type = args.type;
      if (args.highlights) updated.highlights = args.highlights;
      newWork[args.index] = updated;
      updateData({ ...resumeData, work: newWork });
      return `Updated work experience at ${updated.company}`;
    },
  });

  useCopilotAction({
    name: "removeWorkExperience",
    description: "Remove a work experience entry by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the work experience to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.work.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.work.length} work experiences.`;
      }
      const removed = resumeData.work[args.index];
      const newWork = resumeData.work.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, work: newWork });
      return `Removed work experience at ${removed.company}`;
    },
  });

  // ===== EDUCATION TOOLS =====

  useCopilotAction({
    name: "addEducation",
    description: "Add a new education entry",
    parameters: [
      { name: "institution", type: "string", description: "School/University name", required: true },
      { name: "area", type: "string", description: "Field of study (e.g., 'Computer Science')", required: true },
      { name: "studyType", type: "string", description: "Degree type (e.g., 'Bachelor of Science')", required: true },
      { name: "startDate", type: "string", description: "Start date", required: true },
      { name: "endDate", type: "string", description: "End date or expected graduation", required: true },
      { name: "location", type: "string", description: "Location", required: true },
      { name: "gpa", type: "string", description: "GPA (optional)", required: false },
      { name: "note", type: "string", description: "Additional notes (honors, relevant coursework)", required: false },
    ],
    handler: async (args) => {
      const newEdu: Education = {
        institution: args.institution,
        area: args.area,
        studyType: args.studyType,
        startDate: args.startDate,
        endDate: args.endDate,
        location: args.location,
        gpa: args.gpa,
        note: args.note,
      };
      updateData({ ...resumeData, education: [...resumeData.education, newEdu] });
      return `Added education at ${args.institution}`;
    },
  });

  useCopilotAction({
    name: "updateEducation",
    description: "Update an existing education entry by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the education to update (0-based)", required: true },
      { name: "institution", type: "string", description: "School/University name", required: false },
      { name: "area", type: "string", description: "Field of study", required: false },
      { name: "studyType", type: "string", description: "Degree type", required: false },
      { name: "startDate", type: "string", description: "Start date", required: false },
      { name: "endDate", type: "string", description: "End date", required: false },
      { name: "location", type: "string", description: "Location", required: false },
      { name: "gpa", type: "string", description: "GPA", required: false },
      { name: "note", type: "string", description: "Additional notes", required: false },
    ],
    handler: async (args) => {
      const newEdu = [...resumeData.education];
      if (args.index < 0 || args.index >= newEdu.length) {
        return `Invalid index: ${args.index}. There are ${newEdu.length} education entries.`;
      }
      const updated = { ...newEdu[args.index] };
      if (args.institution) updated.institution = args.institution;
      if (args.area) updated.area = args.area;
      if (args.studyType) updated.studyType = args.studyType;
      if (args.startDate) updated.startDate = args.startDate;
      if (args.endDate) updated.endDate = args.endDate;
      if (args.location) updated.location = args.location;
      if (args.gpa !== undefined) updated.gpa = args.gpa;
      if (args.note !== undefined) updated.note = args.note;
      newEdu[args.index] = updated;
      updateData({ ...resumeData, education: newEdu });
      return `Updated education at ${updated.institution}`;
    },
  });

  useCopilotAction({
    name: "removeEducation",
    description: "Remove an education entry by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the education to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.education.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.education.length} education entries.`;
      }
      const removed = resumeData.education[args.index];
      const newEdu = resumeData.education.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, education: newEdu });
      return `Removed education at ${removed.institution}`;
    },
  });

  // ===== SKILLS TOOLS =====

  useCopilotAction({
    name: "addSkillCategory",
    description: "Add a new skill category with keywords",
    parameters: [
      { name: "name", type: "string", description: "Category name (e.g., 'Programming Languages', 'Frameworks')", required: true },
      { name: "keywords", type: "string[]", description: "List of skills in this category", required: true },
    ],
    handler: async (args) => {
      const newSkill: Skill = {
        name: args.name,
        keywords: args.keywords,
      };
      updateData({ ...resumeData, skills: [...resumeData.skills, newSkill] });
      return `Added skill category: ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateSkillCategory",
    description: "Update an existing skill category by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the skill category to update (0-based)", required: true },
      { name: "name", type: "string", description: "Category name", required: false },
      { name: "keywords", type: "string[]", description: "List of skills", required: false },
    ],
    handler: async (args) => {
      const newSkills = [...resumeData.skills];
      if (args.index < 0 || args.index >= newSkills.length) {
        return `Invalid index: ${args.index}. There are ${newSkills.length} skill categories.`;
      }
      const updated = { ...newSkills[args.index] };
      if (args.name) updated.name = args.name;
      if (args.keywords) updated.keywords = args.keywords;
      newSkills[args.index] = updated;
      updateData({ ...resumeData, skills: newSkills });
      return `Updated skill category: ${updated.name}`;
    },
  });

  useCopilotAction({
    name: "removeSkillCategory",
    description: "Remove a skill category by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the skill category to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.skills.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.skills.length} skill categories.`;
      }
      const removed = resumeData.skills[args.index];
      const newSkills = resumeData.skills.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, skills: newSkills });
      return `Removed skill category: ${removed.name}`;
    },
  });

  // ===== PROJECT TOOLS =====

  useCopilotAction({
    name: "addProject",
    description: "Add a new project entry",
    parameters: [
      { name: "name", type: "string", description: "Project name", required: true },
      { name: "description", type: "string", description: "Brief project description", required: true },
      { name: "highlights", type: "string[]", description: "Key achievements or features", required: true },
      { name: "url", type: "string", description: "Project URL (optional)", required: false },
    ],
    handler: async (args) => {
      const newProject: Project = {
        name: args.name,
        description: args.description,
        highlights: args.highlights,
        url: args.url || "",
      };
      updateData({ ...resumeData, projects: [...resumeData.projects, newProject] });
      return `Added project: ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateProject",
    description: "Update an existing project by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the project to update (0-based)", required: true },
      { name: "name", type: "string", description: "Project name", required: false },
      { name: "description", type: "string", description: "Project description", required: false },
      { name: "highlights", type: "string[]", description: "Key achievements", required: false },
      { name: "url", type: "string", description: "Project URL", required: false },
    ],
    handler: async (args) => {
      const newProjects = [...resumeData.projects];
      if (args.index < 0 || args.index >= newProjects.length) {
        return `Invalid index: ${args.index}. There are ${newProjects.length} projects.`;
      }
      const updated = { ...newProjects[args.index] };
      if (args.name) updated.name = args.name;
      if (args.description) updated.description = args.description;
      if (args.highlights) updated.highlights = args.highlights;
      if (args.url !== undefined) updated.url = args.url;
      newProjects[args.index] = updated;
      updateData({ ...resumeData, projects: newProjects });
      return `Updated project: ${updated.name}`;
    },
  });

  useCopilotAction({
    name: "removeProject",
    description: "Remove a project by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the project to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.projects.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.projects.length} projects.`;
      }
      const removed = resumeData.projects[args.index];
      const newProjects = resumeData.projects.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, projects: newProjects });
      return `Removed project: ${removed.name}`;
    },
  });

  // ===== ACHIEVEMENTS & CERTIFICATIONS TOOLS =====

  useCopilotAction({
    name: "addAchievement",
    description: "Add a new achievement",
    parameters: [
      { name: "achievement", type: "string", description: "Achievement description", required: true },
    ],
    handler: async (args) => {
      updateData({ ...resumeData, achievements: [...resumeData.achievements, args.achievement] });
      return `Added achievement: ${args.achievement}`;
    },
  });

  useCopilotAction({
    name: "removeAchievement",
    description: "Remove an achievement by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the achievement to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.achievements.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.achievements.length} achievements.`;
      }
      const removed = resumeData.achievements[args.index];
      const newAchievements = resumeData.achievements.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, achievements: newAchievements });
      return `Removed achievement: ${removed}`;
    },
  });

  useCopilotAction({
    name: "addCertification",
    description: "Add a new certification",
    parameters: [
      { name: "certification", type: "string", description: "Certification name and details", required: true },
    ],
    handler: async (args) => {
      updateData({ ...resumeData, certifications: [...resumeData.certifications, args.certification] });
      return `Added certification: ${args.certification}`;
    },
  });

  useCopilotAction({
    name: "removeCertification",
    description: "Remove a certification by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the certification to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.certifications.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.certifications.length} certifications.`;
      }
      const removed = resumeData.certifications[args.index];
      const newCerts = resumeData.certifications.filter((_, i) => i !== args.index);
      updateData({ ...resumeData, certifications: newCerts });
      return `Removed certification: ${removed}`;
    },
  });

  // ===== TEMPLATE TOOLS =====

  useCopilotAction({
    name: "selectTemplate",
    description: "Change the resume template",
    parameters: [
      { name: "templateId", type: "string", description: "Template ID to switch to", required: true },
    ],
    handler: async (args) => {
      const templates = getAllTemplates();
      const template = templates.find((t) => t.metadata.id === args.templateId);
      if (!template) {
        const available = templates.map((t) => t.metadata.id).join(", ");
        return `Template '${args.templateId}' not found. Available templates: ${available}`;
      }
      onTemplateChange(args.templateId);
      return `Switched to ${template.metadata.name} template`;
    },
  });

  // ===== SOCIAL PROFILE TOOLS =====

  useCopilotAction({
    name: "addSocialProfile",
    description: "Add a social/professional profile link",
    parameters: [
      { name: "network", type: "string", description: "Network name (LinkedIn, GitHub, Portfolio, etc.)", required: true },
      { name: "url", type: "string", description: "Profile URL", required: true },
      { name: "label", type: "string", description: "Display label (optional)", required: false },
    ],
    handler: async (args) => {
      const newProfile = {
        network: args.network,
        url: args.url,
        label: args.label,
      };
      const newBasics = {
        ...resumeData.basics,
        profiles: [...resumeData.basics.profiles, newProfile],
      };
      updateData({ ...resumeData, basics: newBasics });
      return `Added ${args.network} profile`;
    },
  });

  useCopilotAction({
    name: "removeSocialProfile",
    description: "Remove a social profile by index",
    parameters: [
      { name: "index", type: "number", description: "Index of the profile to remove (0-based)", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= resumeData.basics.profiles.length) {
        return `Invalid index: ${args.index}. There are ${resumeData.basics.profiles.length} profiles.`;
      }
      const removed = resumeData.basics.profiles[args.index];
      const newProfiles = resumeData.basics.profiles.filter((_, i) => i !== args.index);
      const newBasics = { ...resumeData.basics, profiles: newProfiles };
      updateData({ ...resumeData, basics: newBasics });
      return `Removed ${removed.network} profile`;
    },
  });
}
