"use client";

import { useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { ResumeData, Work, Education, Project, Skill } from "@/lib/validation/schema";
import { getAllTemplates } from "@/templates/registry";
import { EditSection } from "./sections";

/**
 * Compact context generator for each section.
 * Only sends relevant data to minimize token usage.
 */
function getSectionContext(data: ResumeData, section: EditSection): string {
  switch (section) {
    case "basics":
      return [
        `Name: ${data.basics.name || "[empty]"}`,
        `Title: ${data.basics.label || "[empty]"}`,
        `Email: ${data.basics.email || "[empty]"}`,
        `Phone: ${data.basics.phone || "[empty]"}`,
        `Location: ${data.basics.location || "[empty]"}`,
        `Summary: ${data.basics.summary || "[empty]"}`,
        `Profiles: ${data.basics.profiles.length} links`,
      ].join("\n");

    case "work":
      if (data.work.length === 0) return "No work experience yet.";
      return data.work
        .map((w, i) => 
          `[${i}] ${w.position} @ ${w.company} (${w.startDate}-${w.endDate})\n    ${w.highlights.length} bullets`
        )
        .join("\n");

    case "education":
      if (data.education.length === 0) return "No education yet.";
      return data.education
        .map((e, i) => 
          `[${i}] ${e.studyType} ${e.area} @ ${e.institution} (${e.startDate}-${e.endDate})`
        )
        .join("\n");

    case "skills":
      if (data.skills.length === 0) return "No skills yet.";
      return data.skills
        .map((s, i) => `[${i}] ${s.name}: ${s.keywords.join(", ")}`)
        .join("\n");

    case "projects":
      if (data.projects.length === 0) return "No projects yet.";
      return data.projects
        .map((p, i) => `[${i}] ${p.name}: ${p.description.substring(0, 50)}...`)
        .join("\n");

    case "extras":
      return [
        `Achievements (${data.achievements.length}): ${data.achievements.slice(0, 2).join("; ")}${data.achievements.length > 2 ? "..." : ""}`,
        `Certifications (${data.certifications.length}): ${data.certifications.slice(0, 2).join("; ")}${data.certifications.length > 2 ? "..." : ""}`,
        `Profiles (${data.basics.profiles.length}): ${data.basics.profiles.map(p => p.network).join(", ")}`,
      ].join("\n");

    default:
      return "";
  }
}

/**
 * Register section-specific readable context.
 * Only exposes data relevant to the current editing section.
 */
export function useSectionReadableContext(
  data: ResumeData,
  section: EditSection,
  templateId: string
) {
  // Compact summary of entire resume (always available)
  useCopilotReadable({
    description: "Resume overview",
    value: `Editing: ${section.toUpperCase()}\nWork: ${data.work.length}, Edu: ${data.education.length}, Skills: ${data.skills.length}, Projects: ${data.projects.length}`,
  });

  // Section-specific detailed context
  useCopilotReadable({
    description: `${section} section data`,
    value: getSectionContext(data, section),
  });

  // Template (compact)
  useCopilotReadable({
    description: "Template",
    value: templateId,
  });
}

/**
 * Hook for basics section tools (1 tool).
 */
export function useBasicsTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void
) {
  useCopilotAction({
    name: "updateBasicInfo",
    description: "Update name, title, email, phone, location, or summary",
    parameters: [
      { name: "name", type: "string", description: "Full name", required: false },
      { name: "label", type: "string", description: "Professional title", required: false },
      { name: "email", type: "string", description: "Email", required: false },
      { name: "phone", type: "string", description: "Phone", required: false },
      { name: "location", type: "string", description: "City, Country", required: false },
      { name: "summary", type: "string", description: "Professional summary", required: false },
    ],
    handler: async (args) => {
      const updated = { ...data.basics };
      if (args.name) updated.name = args.name;
      if (args.label) updated.label = args.label;
      if (args.email) updated.email = args.email;
      if (args.phone) updated.phone = args.phone;
      if (args.location) updated.location = args.location;
      if (args.summary !== undefined) updated.summary = args.summary;
      updateData({ ...data, basics: updated });
      return "Updated basic info";
    },
  });
}

/**
 * Hook for work section tools (3 tools).
 */
export function useWorkTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void
) {
  useCopilotAction({
    name: "addWork",
    description: "Add work experience",
    parameters: [
      { name: "company", type: "string", description: "Company", required: true },
      { name: "position", type: "string", description: "Title", required: true },
      { name: "startDate", type: "string", description: "Start (e.g. Jan 2020)", required: true },
      { name: "endDate", type: "string", description: "End or PRESENT", required: true },
      { name: "location", type: "string", description: "Location", required: true },
      { name: "type", type: "string", description: "Full-time/Part-time/Contract", required: true },
      { name: "highlights", type: "string[]", description: "Achievement bullets", required: true },
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
      updateData({ ...data, work: [...data.work, newWork] });
      return `Added ${args.position} at ${args.company}`;
    },
  });

  useCopilotAction({
    name: "updateWork",
    description: "Update work by index",
    parameters: [
      { name: "index", type: "number", description: "Index (0-based)", required: true },
      { name: "company", type: "string", required: false },
      { name: "position", type: "string", required: false },
      { name: "startDate", type: "string", required: false },
      { name: "endDate", type: "string", required: false },
      { name: "location", type: "string", required: false },
      { name: "type", type: "string", required: false },
      { name: "highlights", type: "string[]", required: false },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.work.length) {
        return `Invalid index. Have ${data.work.length} entries.`;
      }
      const work = [...data.work];
      const updated = { ...work[args.index] };
      if (args.company) updated.company = args.company;
      if (args.position) updated.position = args.position;
      if (args.startDate) updated.startDate = args.startDate;
      if (args.endDate) updated.endDate = args.endDate;
      if (args.location) updated.location = args.location;
      if (args.type) updated.type = args.type;
      if (args.highlights) updated.highlights = args.highlights;
      work[args.index] = updated;
      updateData({ ...data, work });
      return `Updated ${updated.company}`;
    },
  });

  useCopilotAction({
    name: "removeWork",
    description: "Remove work by index",
    parameters: [
      { name: "index", type: "number", description: "Index", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.work.length) {
        return `Invalid index. Have ${data.work.length} entries.`;
      }
      const removed = data.work[args.index];
      updateData({ ...data, work: data.work.filter((_, i) => i !== args.index) });
      return `Removed ${removed.company}`;
    },
  });
}

/**
 * Hook for education section tools (3 tools).
 */
export function useEducationTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void
) {
  useCopilotAction({
    name: "addEducation",
    description: "Add education",
    parameters: [
      { name: "institution", type: "string", description: "School", required: true },
      { name: "area", type: "string", description: "Field", required: true },
      { name: "studyType", type: "string", description: "Degree", required: true },
      { name: "startDate", type: "string", required: true },
      { name: "endDate", type: "string", required: true },
      { name: "location", type: "string", required: true },
      { name: "gpa", type: "string", required: false },
      { name: "note", type: "string", required: false },
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
      updateData({ ...data, education: [...data.education, newEdu] });
      return `Added ${args.studyType} at ${args.institution}`;
    },
  });

  useCopilotAction({
    name: "updateEducation",
    description: "Update education by index",
    parameters: [
      { name: "index", type: "number", required: true },
      { name: "institution", type: "string", required: false },
      { name: "area", type: "string", required: false },
      { name: "studyType", type: "string", required: false },
      { name: "startDate", type: "string", required: false },
      { name: "endDate", type: "string", required: false },
      { name: "location", type: "string", required: false },
      { name: "gpa", type: "string", required: false },
      { name: "note", type: "string", required: false },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.education.length) {
        return `Invalid index. Have ${data.education.length} entries.`;
      }
      const edu = [...data.education];
      const updated = { ...edu[args.index] };
      if (args.institution) updated.institution = args.institution;
      if (args.area) updated.area = args.area;
      if (args.studyType) updated.studyType = args.studyType;
      if (args.startDate) updated.startDate = args.startDate;
      if (args.endDate) updated.endDate = args.endDate;
      if (args.location) updated.location = args.location;
      if (args.gpa !== undefined) updated.gpa = args.gpa;
      if (args.note !== undefined) updated.note = args.note;
      edu[args.index] = updated;
      updateData({ ...data, education: edu });
      return `Updated ${updated.institution}`;
    },
  });

  useCopilotAction({
    name: "removeEducation",
    description: "Remove education by index",
    parameters: [
      { name: "index", type: "number", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.education.length) {
        return `Invalid index. Have ${data.education.length} entries.`;
      }
      const removed = data.education[args.index];
      updateData({ ...data, education: data.education.filter((_, i) => i !== args.index) });
      return `Removed ${removed.institution}`;
    },
  });
}

/**
 * Hook for skills section tools (3 tools).
 */
export function useSkillsTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void
) {
  useCopilotAction({
    name: "addSkillCategory",
    description: "Add skill category",
    parameters: [
      { name: "name", type: "string", description: "Category name", required: true },
      { name: "keywords", type: "string[]", description: "Skills list", required: true },
    ],
    handler: async (args) => {
      const newSkill: Skill = { name: args.name, keywords: args.keywords };
      updateData({ ...data, skills: [...data.skills, newSkill] });
      return `Added ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateSkillCategory",
    description: "Update skill category by index",
    parameters: [
      { name: "index", type: "number", required: true },
      { name: "name", type: "string", required: false },
      { name: "keywords", type: "string[]", required: false },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.skills.length) {
        return `Invalid index. Have ${data.skills.length} categories.`;
      }
      const skills = [...data.skills];
      const updated = { ...skills[args.index] };
      if (args.name) updated.name = args.name;
      if (args.keywords) updated.keywords = args.keywords;
      skills[args.index] = updated;
      updateData({ ...data, skills });
      return `Updated ${updated.name}`;
    },
  });

  useCopilotAction({
    name: "removeSkillCategory",
    description: "Remove skill category by index",
    parameters: [
      { name: "index", type: "number", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.skills.length) {
        return `Invalid index. Have ${data.skills.length} categories.`;
      }
      const removed = data.skills[args.index];
      updateData({ ...data, skills: data.skills.filter((_, i) => i !== args.index) });
      return `Removed ${removed.name}`;
    },
  });
}

/**
 * Hook for projects section tools (3 tools).
 */
export function useProjectsTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void
) {
  useCopilotAction({
    name: "addProject",
    description: "Add project",
    parameters: [
      { name: "name", type: "string", required: true },
      { name: "description", type: "string", required: true },
      { name: "highlights", type: "string[]", required: true },
      { name: "url", type: "string", required: false },
    ],
    handler: async (args) => {
      const newProject: Project = {
        name: args.name,
        description: args.description,
        highlights: args.highlights,
        url: args.url || "",
      };
      updateData({ ...data, projects: [...data.projects, newProject] });
      return `Added ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateProject",
    description: "Update project by index",
    parameters: [
      { name: "index", type: "number", required: true },
      { name: "name", type: "string", required: false },
      { name: "description", type: "string", required: false },
      { name: "highlights", type: "string[]", required: false },
      { name: "url", type: "string", required: false },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.projects.length) {
        return `Invalid index. Have ${data.projects.length} projects.`;
      }
      const projects = [...data.projects];
      const updated = { ...projects[args.index] };
      if (args.name) updated.name = args.name;
      if (args.description) updated.description = args.description;
      if (args.highlights) updated.highlights = args.highlights;
      if (args.url !== undefined) updated.url = args.url;
      projects[args.index] = updated;
      updateData({ ...data, projects });
      return `Updated ${updated.name}`;
    },
  });

  useCopilotAction({
    name: "removeProject",
    description: "Remove project by index",
    parameters: [
      { name: "index", type: "number", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.projects.length) {
        return `Invalid index. Have ${data.projects.length} projects.`;
      }
      const removed = data.projects[args.index];
      updateData({ ...data, projects: data.projects.filter((_, i) => i !== args.index) });
      return `Removed ${removed.name}`;
    },
  });
}

/**
 * Hook for extras section tools (5 tools: achievements, certifications, profiles, template).
 */
export function useExtrasTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void,
  onTemplateChange: (id: string) => void
) {
  useCopilotAction({
    name: "addAchievement",
    description: "Add achievement",
    parameters: [
      { name: "text", type: "string", required: true },
    ],
    handler: async (args) => {
      updateData({ ...data, achievements: [...data.achievements, args.text] });
      return `Added achievement`;
    },
  });

  useCopilotAction({
    name: "removeAchievement",
    description: "Remove achievement by index",
    parameters: [
      { name: "index", type: "number", required: true },
    ],
    handler: async (args) => {
      if (args.index < 0 || args.index >= data.achievements.length) {
        return `Invalid index.`;
      }
      updateData({ ...data, achievements: data.achievements.filter((_, i) => i !== args.index) });
      return `Removed achievement`;
    },
  });

  useCopilotAction({
    name: "addCertification",
    description: "Add certification",
    parameters: [
      { name: "text", type: "string", required: true },
    ],
    handler: async (args) => {
      updateData({ ...data, certifications: [...data.certifications, args.text] });
      return `Added certification`;
    },
  });

  useCopilotAction({
    name: "addProfile",
    description: "Add social/professional profile link",
    parameters: [
      { name: "network", type: "string", description: "LinkedIn/GitHub/Portfolio", required: true },
      { name: "url", type: "string", required: true },
    ],
    handler: async (args) => {
      const newProfile = { network: args.network, url: args.url };
      updateData({
        ...data,
        basics: { ...data.basics, profiles: [...data.basics.profiles, newProfile] },
      });
      return `Added ${args.network}`;
    },
  });

  useCopilotAction({
    name: "selectTemplate",
    description: "Change template",
    parameters: [
      { name: "templateId", type: "string", required: true },
    ],
    handler: async (args) => {
      const templates = getAllTemplates();
      const template = templates.find((t) => t.metadata.id === args.templateId);
      if (!template) {
        return `Template not found. Available: ${templates.map(t => t.metadata.id).join(", ")}`;
      }
      onTemplateChange(args.templateId);
      return `Switched to ${template.metadata.name}`;
    },
  });
}

/**
 * Main hook that registers tools based on active section.
 * Only loads tools relevant to the current editing section.
 */
export function useSectionTools(
  data: ResumeData,
  updateData: (data: ResumeData) => void,
  section: EditSection,
  onTemplateChange: (id: string) => void
) {
  // Always register the section-specific tools based on active section
  // React hooks must be called unconditionally, so we use a wrapper pattern

  // Basics tools
  const basicsEnabled = section === "basics";
  useCopilotAction({
    name: "updateBasicInfo",
    description: basicsEnabled ? "Update name, title, email, phone, location, or summary" : "N/A",
    disabled: !basicsEnabled,
    parameters: basicsEnabled ? [
      { name: "name", type: "string", required: false },
      { name: "label", type: "string", required: false },
      { name: "email", type: "string", required: false },
      { name: "phone", type: "string", required: false },
      { name: "location", type: "string", required: false },
      { name: "summary", type: "string", required: false },
    ] : [],
    handler: async (args) => {
      if (!basicsEnabled) return "Switch to Basic Info section first";
      const updated = { ...data.basics };
      if (args.name) updated.name = args.name;
      if (args.label) updated.label = args.label;
      if (args.email) updated.email = args.email;
      if (args.phone) updated.phone = args.phone;
      if (args.location) updated.location = args.location;
      if (args.summary !== undefined) updated.summary = args.summary;
      updateData({ ...data, basics: updated });
      return "Updated basic info";
    },
  });

  // Work tools
  const workEnabled = section === "work";
  useCopilotAction({
    name: "addWork",
    description: workEnabled ? "Add work experience" : "N/A",
    disabled: !workEnabled,
    parameters: workEnabled ? [
      { name: "company", type: "string", required: true },
      { name: "position", type: "string", required: true },
      { name: "startDate", type: "string", required: true },
      { name: "endDate", type: "string", required: true },
      { name: "location", type: "string", required: true },
      { name: "type", type: "string", required: true },
      { name: "highlights", type: "string[]", required: true },
    ] : [],
    handler: async (args) => {
      if (!workEnabled) return "Switch to Work section first";
      const newWork: Work = {
        company: args.company,
        position: args.position,
        startDate: args.startDate,
        endDate: args.endDate,
        location: args.location,
        type: args.type,
        highlights: args.highlights,
      };
      updateData({ ...data, work: [...data.work, newWork] });
      return `Added ${args.position} at ${args.company}`;
    },
  });

  useCopilotAction({
    name: "updateWork",
    description: workEnabled ? "Update work by index" : "N/A",
    disabled: !workEnabled,
    parameters: workEnabled ? [
      { name: "index", type: "number", required: true },
      { name: "company", type: "string", required: false },
      { name: "position", type: "string", required: false },
      { name: "highlights", type: "string[]", required: false },
    ] : [],
    handler: async (args) => {
      if (!workEnabled) return "Switch to Work section first";
      if (args.index < 0 || args.index >= data.work.length) return `Invalid index.`;
      const work = [...data.work];
      const updated = { ...work[args.index] };
      if (args.company) updated.company = args.company;
      if (args.position) updated.position = args.position;
      if (args.highlights) updated.highlights = args.highlights;
      work[args.index] = updated;
      updateData({ ...data, work });
      return `Updated work`;
    },
  });

  useCopilotAction({
    name: "removeWork",
    description: workEnabled ? "Remove work by index" : "N/A",
    disabled: !workEnabled,
    parameters: workEnabled ? [{ name: "index", type: "number", required: true }] : [],
    handler: async (args) => {
      if (!workEnabled) return "Switch to Work section first";
      if (args.index < 0 || args.index >= data.work.length) return `Invalid index.`;
      updateData({ ...data, work: data.work.filter((_, i) => i !== args.index) });
      return `Removed work`;
    },
  });

  // Education tools
  const eduEnabled = section === "education";
  useCopilotAction({
    name: "addEducation",
    description: eduEnabled ? "Add education" : "N/A",
    disabled: !eduEnabled,
    parameters: eduEnabled ? [
      { name: "institution", type: "string", required: true },
      { name: "area", type: "string", required: true },
      { name: "studyType", type: "string", required: true },
      { name: "startDate", type: "string", required: true },
      { name: "endDate", type: "string", required: true },
      { name: "location", type: "string", required: true },
    ] : [],
    handler: async (args) => {
      if (!eduEnabled) return "Switch to Education section first";
      const newEdu: Education = {
        institution: args.institution,
        area: args.area,
        studyType: args.studyType,
        startDate: args.startDate,
        endDate: args.endDate,
        location: args.location,
      };
      updateData({ ...data, education: [...data.education, newEdu] });
      return `Added education`;
    },
  });

  useCopilotAction({
    name: "updateEducation",
    description: eduEnabled ? "Update education by index" : "N/A",
    disabled: !eduEnabled,
    parameters: eduEnabled ? [
      { name: "index", type: "number", required: true },
      { name: "institution", type: "string", required: false },
      { name: "area", type: "string", required: false },
    ] : [],
    handler: async (args) => {
      if (!eduEnabled) return "Switch to Education section first";
      if (args.index < 0 || args.index >= data.education.length) return `Invalid index.`;
      const edu = [...data.education];
      const updated = { ...edu[args.index] };
      if (args.institution) updated.institution = args.institution;
      if (args.area) updated.area = args.area;
      edu[args.index] = updated;
      updateData({ ...data, education: edu });
      return `Updated education`;
    },
  });

  useCopilotAction({
    name: "removeEducation",
    description: eduEnabled ? "Remove education by index" : "N/A",
    disabled: !eduEnabled,
    parameters: eduEnabled ? [{ name: "index", type: "number", required: true }] : [],
    handler: async (args) => {
      if (!eduEnabled) return "Switch to Education section first";
      if (args.index < 0 || args.index >= data.education.length) return `Invalid index.`;
      updateData({ ...data, education: data.education.filter((_, i) => i !== args.index) });
      return `Removed education`;
    },
  });

  // Skills tools
  const skillsEnabled = section === "skills";
  useCopilotAction({
    name: "addSkillCategory",
    description: skillsEnabled ? "Add skill category" : "N/A",
    disabled: !skillsEnabled,
    parameters: skillsEnabled ? [
      { name: "name", type: "string", required: true },
      { name: "keywords", type: "string[]", required: true },
    ] : [],
    handler: async (args) => {
      if (!skillsEnabled) return "Switch to Skills section first";
      const newSkill: Skill = { name: args.name, keywords: args.keywords };
      updateData({ ...data, skills: [...data.skills, newSkill] });
      return `Added ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateSkillCategory",
    description: skillsEnabled ? "Update skill category" : "N/A",
    disabled: !skillsEnabled,
    parameters: skillsEnabled ? [
      { name: "index", type: "number", required: true },
      { name: "name", type: "string", required: false },
      { name: "keywords", type: "string[]", required: false },
    ] : [],
    handler: async (args) => {
      if (!skillsEnabled) return "Switch to Skills section first";
      if (args.index < 0 || args.index >= data.skills.length) return `Invalid index.`;
      const skills = [...data.skills];
      const updated = { ...skills[args.index] };
      if (args.name) updated.name = args.name;
      if (args.keywords) updated.keywords = args.keywords;
      skills[args.index] = updated;
      updateData({ ...data, skills });
      return `Updated skill`;
    },
  });

  useCopilotAction({
    name: "removeSkillCategory",
    description: skillsEnabled ? "Remove skill category" : "N/A",
    disabled: !skillsEnabled,
    parameters: skillsEnabled ? [{ name: "index", type: "number", required: true }] : [],
    handler: async (args) => {
      if (!skillsEnabled) return "Switch to Skills section first";
      if (args.index < 0 || args.index >= data.skills.length) return `Invalid index.`;
      updateData({ ...data, skills: data.skills.filter((_, i) => i !== args.index) });
      return `Removed skill`;
    },
  });

  // Projects tools
  const projectsEnabled = section === "projects";
  useCopilotAction({
    name: "addProject",
    description: projectsEnabled ? "Add project" : "N/A",
    disabled: !projectsEnabled,
    parameters: projectsEnabled ? [
      { name: "name", type: "string", required: true },
      { name: "description", type: "string", required: true },
      { name: "highlights", type: "string[]", required: true },
    ] : [],
    handler: async (args) => {
      if (!projectsEnabled) return "Switch to Projects section first";
      const newProject: Project = {
        name: args.name,
        description: args.description,
        highlights: args.highlights,
        url: "",
      };
      updateData({ ...data, projects: [...data.projects, newProject] });
      return `Added ${args.name}`;
    },
  });

  useCopilotAction({
    name: "updateProject",
    description: projectsEnabled ? "Update project" : "N/A",
    disabled: !projectsEnabled,
    parameters: projectsEnabled ? [
      { name: "index", type: "number", required: true },
      { name: "name", type: "string", required: false },
      { name: "description", type: "string", required: false },
      { name: "highlights", type: "string[]", required: false },
    ] : [],
    handler: async (args) => {
      if (!projectsEnabled) return "Switch to Projects section first";
      if (args.index < 0 || args.index >= data.projects.length) return `Invalid index.`;
      const projects = [...data.projects];
      const updated = { ...projects[args.index] };
      if (args.name) updated.name = args.name;
      if (args.description) updated.description = args.description;
      if (args.highlights) updated.highlights = args.highlights;
      projects[args.index] = updated;
      updateData({ ...data, projects });
      return `Updated project`;
    },
  });

  useCopilotAction({
    name: "removeProject",
    description: projectsEnabled ? "Remove project" : "N/A",
    disabled: !projectsEnabled,
    parameters: projectsEnabled ? [{ name: "index", type: "number", required: true }] : [],
    handler: async (args) => {
      if (!projectsEnabled) return "Switch to Projects section first";
      if (args.index < 0 || args.index >= data.projects.length) return `Invalid index.`;
      updateData({ ...data, projects: data.projects.filter((_, i) => i !== args.index) });
      return `Removed project`;
    },
  });

  // Extras tools (achievements, certifications, profiles, template)
  const extrasEnabled = section === "extras";
  useCopilotAction({
    name: "addAchievement",
    description: extrasEnabled ? "Add achievement" : "N/A",
    disabled: !extrasEnabled,
    parameters: extrasEnabled ? [{ name: "text", type: "string", required: true }] : [],
    handler: async (args) => {
      if (!extrasEnabled) return "Switch to Extras section first";
      updateData({ ...data, achievements: [...data.achievements, args.text] });
      return `Added achievement`;
    },
  });

  useCopilotAction({
    name: "addCertification",
    description: extrasEnabled ? "Add certification" : "N/A",
    disabled: !extrasEnabled,
    parameters: extrasEnabled ? [{ name: "text", type: "string", required: true }] : [],
    handler: async (args) => {
      if (!extrasEnabled) return "Switch to Extras section first";
      updateData({ ...data, certifications: [...data.certifications, args.text] });
      return `Added certification`;
    },
  });

  useCopilotAction({
    name: "addProfile",
    description: extrasEnabled ? "Add social link" : "N/A",
    disabled: !extrasEnabled,
    parameters: extrasEnabled ? [
      { name: "network", type: "string", required: true },
      { name: "url", type: "string", required: true },
    ] : [],
    handler: async (args) => {
      if (!extrasEnabled) return "Switch to Extras section first";
      updateData({
        ...data,
        basics: { ...data.basics, profiles: [...data.basics.profiles, { network: args.network, url: args.url }] },
      });
      return `Added ${args.network}`;
    },
  });

  useCopilotAction({
    name: "selectTemplate",
    description: extrasEnabled ? "Change template" : "N/A",
    disabled: !extrasEnabled,
    parameters: extrasEnabled ? [{ name: "templateId", type: "string", required: true }] : [],
    handler: async (args) => {
      if (!extrasEnabled) return "Switch to Extras section first";
      const templates = getAllTemplates();
      const template = templates.find((t) => t.metadata.id === args.templateId);
      if (!template) return `Not found. Available: ${templates.map(t => t.metadata.id).join(", ")}`;
      onTemplateChange(args.templateId);
      return `Switched to ${template.metadata.name}`;
    },
  });
}

