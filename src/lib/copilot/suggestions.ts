"use client";

import { useMemo } from "react";
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { ResumeData } from "@/lib/validation/schema";

/**
 * Generate dynamic chat suggestions based on resume completeness.
 * Provides context-aware actions to help users build their resume.
 */
export function useResumeSuggestions(resumeData: ResumeData, selectedTemplateId: string) {
  // Analyze resume completeness
  const analysis = useMemo(() => analyzeResumeCompleteness(resumeData), [resumeData]);

  // Generate suggestion instructions based on analysis
  const suggestionInstructions = useMemo(() => {
    const instructions: string[] = [
      "Based on the current resume state, suggest helpful actions:",
    ];

    // Missing sections
    if (!analysis.hasBasicInfo) {
      instructions.push("- Basic info is incomplete: suggest adding contact details");
    }
    if (!analysis.hasSummary) {
      instructions.push("- Summary is empty: suggest writing a professional summary");
    }
    if (analysis.workCount === 0) {
      instructions.push("- No work experience: suggest adding work history");
    }
    if (analysis.educationCount === 0) {
      instructions.push("- No education: suggest adding educational background");
    }
    if (analysis.skillsCount === 0) {
      instructions.push("- No skills: suggest adding relevant skills");
    }
    if (analysis.projectsCount === 0) {
      instructions.push("- No projects: suggest adding portfolio projects");
    }

    // Improvement suggestions
    if (analysis.workCount > 0 && analysis.avgHighlightsPerWork < 3) {
      instructions.push("- Work highlights are sparse: suggest improving bullet points");
    }
    if (analysis.skillsCount > 0 && analysis.avgSkillsPerCategory < 4) {
      instructions.push("- Skills categories are light: suggest adding more skills");
    }

    // Template suggestion
    if (selectedTemplateId === "two-column") {
      instructions.push("- Using default template: suggest exploring other templates");
    }

    return instructions.join("\n");
  }, [analysis, selectedTemplateId]);

  // Register suggestions with CopilotKit
  useCopilotChatSuggestions({
    instructions: suggestionInstructions,
    minSuggestions: 2,
    maxSuggestions: 4,
  }, [resumeData, selectedTemplateId]);

  return analysis;
}

/**
 * Resume completeness analysis result.
 */
export interface ResumeAnalysis {
  hasBasicInfo: boolean;
  hasSummary: boolean;
  workCount: number;
  educationCount: number;
  skillsCount: number;
  projectsCount: number;
  achievementsCount: number;
  certificationsCount: number;
  avgHighlightsPerWork: number;
  avgSkillsPerCategory: number;
  completenessScore: number;
  missingFields: string[];
  suggestions: string[];
}

/**
 * Analyze resume data for completeness.
 */
export function analyzeResumeCompleteness(data: ResumeData): ResumeAnalysis {
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  // Basic info check
  const hasBasicInfo = Boolean(
    data.basics.name &&
    data.basics.email &&
    data.basics.label
  );
  if (!hasBasicInfo) {
    missingFields.push("basic info");
    suggestions.push("Add your name, email, and professional title");
  }

  // Summary check
  const hasSummary = Boolean(data.basics.summary && data.basics.summary.length > 20);
  if (!hasSummary) {
    missingFields.push("professional summary");
    suggestions.push("Write a compelling professional summary");
  }

  // Count sections
  const workCount = data.work.length;
  const educationCount = data.education.length;
  const skillsCount = data.skills.length;
  const projectsCount = data.projects.length;
  const achievementsCount = data.achievements.length;
  const certificationsCount = data.certifications.length;

  // Check missing sections
  if (workCount === 0) {
    missingFields.push("work experience");
    suggestions.push("Add your work experience");
  }
  if (educationCount === 0) {
    missingFields.push("education");
    suggestions.push("Add your educational background");
  }
  if (skillsCount === 0) {
    missingFields.push("skills");
    suggestions.push("Add your technical and soft skills");
  }

  // Calculate averages
  const avgHighlightsPerWork = workCount > 0
    ? data.work.reduce((sum, w) => sum + w.highlights.length, 0) / workCount
    : 0;
  
  const avgSkillsPerCategory = skillsCount > 0
    ? data.skills.reduce((sum, s) => sum + s.keywords.length, 0) / skillsCount
    : 0;

  // Quality suggestions
  if (workCount > 0 && avgHighlightsPerWork < 3) {
    suggestions.push("Add more achievement bullet points to your work experience");
  }
  if (skillsCount > 0 && avgSkillsPerCategory < 4) {
    suggestions.push("Add more skills to each category");
  }
  if (projectsCount === 0 && workCount < 3) {
    suggestions.push("Add projects to showcase your abilities");
  }

  // Calculate completeness score (0-100)
  let score = 0;
  if (hasBasicInfo) score += 20;
  if (hasSummary) score += 10;
  if (workCount > 0) score += 25;
  if (educationCount > 0) score += 15;
  if (skillsCount > 0) score += 15;
  if (projectsCount > 0) score += 10;
  if (achievementsCount > 0) score += 5;

  return {
    hasBasicInfo,
    hasSummary,
    workCount,
    educationCount,
    skillsCount,
    projectsCount,
    achievementsCount,
    certificationsCount,
    avgHighlightsPerWork,
    avgSkillsPerCategory,
    completenessScore: Math.min(100, score),
    missingFields,
    suggestions,
  };
}

/**
 * Get quick action suggestions based on current state.
 */
export function getQuickActions(analysis: ResumeAnalysis): { label: string; prompt: string }[] {
  const actions: { label: string; prompt: string }[] = [];

  if (!analysis.hasBasicInfo) {
    actions.push({
      label: "Add Contact Info",
      prompt: "Help me add my basic contact information",
    });
  }

  if (!analysis.hasSummary) {
    actions.push({
      label: "Write Summary",
      prompt: "Help me write a professional summary",
    });
  }

  if (analysis.workCount === 0) {
    actions.push({
      label: "Add Work Experience",
      prompt: "Help me add my most recent work experience",
    });
  }

  if (analysis.educationCount === 0) {
    actions.push({
      label: "Add Education",
      prompt: "Help me add my educational background",
    });
  }

  if (analysis.skillsCount === 0) {
    actions.push({
      label: "Add Skills",
      prompt: "Help me add my technical skills",
    });
  }

  if (analysis.projectsCount === 0) {
    actions.push({
      label: "Add Project",
      prompt: "Help me add a project to my resume",
    });
  }

  // Always include these
  if (actions.length < 4) {
    actions.push({
      label: "Improve Content",
      prompt: "Review my resume and suggest improvements",
    });
  }

  if (actions.length < 4) {
    actions.push({
      label: "Choose Template",
      prompt: "Help me choose the best template for my profile",
    });
  }

  return actions.slice(0, 4);
}

/**
 * Get contextual suggestions based on what section the user is working on.
 */
export function getContextualSuggestions(
  currentSection: string | null
): string[] {
  if (!currentSection) {
    return [
      "What section would you like to work on?",
      "Tell me about your target job",
      "Review my resume for ATS compatibility",
    ];
  }

  switch (currentSection) {
    case "basics":
      return [
        "Improve my professional title",
        "Make my summary more impactful",
        "Add a LinkedIn profile",
      ];
    
    case "work":
      return [
        "Add quantified achievements",
        "Use stronger action verbs",
        "Add another work experience",
      ];
    
    case "education":
      return [
        "Add relevant coursework",
        "Include academic achievements",
        "Add certifications",
      ];
    
    case "skills":
      return [
        "Organize skills by category",
        "Add industry-specific keywords",
        "Remove outdated skills",
      ];
    
    case "projects":
      return [
        "Highlight technical challenges",
        "Add project metrics",
        "Include project links",
      ];
    
    default:
      return [
        "Continue editing this section",
        "Move to the next section",
        "Review everything so far",
      ];
  }
}
