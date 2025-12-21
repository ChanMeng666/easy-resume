"use client";

import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { useCopilotChatSuggestions } from "@copilotkit/react-ui";
import { ResumeData } from "@/lib/validation/schema";

/**
 * Configuration for dynamic suggestions with rate limit handling.
 */
const SUGGESTION_CONFIG = {
  /** Minimum delay between suggestion API calls (ms) */
  MIN_DELAY_MS: 15000,
  /** Maximum number of retry attempts */
  MAX_RETRIES: 2,
  /** Base delay for exponential backoff (ms) */
  RETRY_BASE_DELAY_MS: 5000,
};

/**
 * Static fallback suggestions for resume editing.
 * These are displayed when dynamic suggestions fail or are loading.
 */
export const STATIC_SUGGESTIONS = [
  {
    title: "📝 Write Summary",
    message: "Help me write a professional summary for my resume based on my experience",
  },
  {
    title: "💼 Add Work",
    message: "Help me add my most recent work experience with achievement-focused bullet points",
  },
  {
    title: "🎓 Add Education",
    message: "Help me add my educational background to the resume",
  },
  {
    title: "✨ Improve Resume",
    message: "Review my resume and suggest improvements for better ATS compatibility",
  },
];

/**
 * Context-aware suggestions that change based on resume completeness.
 */
export function getContextAwareSuggestions(analysis: ResumeAnalysis): typeof STATIC_SUGGESTIONS {
  const suggestions: typeof STATIC_SUGGESTIONS = [];

  // Add suggestions based on missing sections
  if (!analysis.hasBasicInfo) {
    suggestions.push({
      title: "📋 Add Contact Info",
      message: "Help me add my basic contact information (name, email, phone, location)",
    });
  }

  if (!analysis.hasSummary) {
    suggestions.push({
      title: "📝 Write Summary",
      message: "Help me write a professional summary for my resume based on my experience",
    });
  }

  if (analysis.workCount === 0) {
    suggestions.push({
      title: "💼 Add Work Experience",
      message: "Help me add my most recent work experience with achievement-focused bullet points",
    });
  }

  if (analysis.educationCount === 0) {
    suggestions.push({
      title: "🎓 Add Education",
      message: "Help me add my educational background to the resume",
    });
  }

  if (analysis.skillsCount === 0) {
    suggestions.push({
      title: "⚡ Add Skills",
      message: "Help me add my technical and soft skills organized by category",
    });
  }

  if (analysis.projectsCount === 0) {
    suggestions.push({
      title: "🚀 Add Project",
      message: "Help me add a project that showcases my abilities",
    });
  }

  // If resume has some content, suggest improvements
  if (analysis.workCount > 0 && analysis.avgHighlightsPerWork < 3) {
    suggestions.push({
      title: "💪 Enhance Bullet Points",
      message: "Help me improve my work experience bullet points with stronger action verbs and quantified achievements",
    });
  }

  if (suggestions.length < 3) {
    suggestions.push({
      title: "✨ Review Resume",
      message: "Review my resume and suggest improvements for better ATS compatibility",
    });
  }

  if (suggestions.length < 4) {
    suggestions.push({
      title: "🎨 Change Template",
      message: "Help me choose the best template for my professional profile",
    });
  }

  return suggestions.slice(0, 4);
}

/**
 * Generate dynamic chat suggestions based on resume completeness.
 * Uses useCopilotChatSuggestions with throttling to avoid rate limits.
 * Falls back to static suggestions when API calls fail.
 */
export function useResumeSuggestions(resumeData: ResumeData) {
  // Analyze resume completeness
  const analysis = useMemo(() => analyzeResumeCompleteness(resumeData), [resumeData]);

  // Get context-aware static suggestions as fallback
  const staticSuggestions = useMemo(
    () => getContextAwareSuggestions(analysis),
    [analysis]
  );

  // Track if dynamic suggestions should be enabled
  // Start disabled to avoid immediate API call on page load
  const [isDynamicEnabled, setIsDynamicEnabled] = useState(false);
  const lastApiCallRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);

  // Enable dynamic suggestions after a delay to avoid rate limits on page load
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCallRef.current;
      
      // Only enable if enough time has passed since last API call
      if (timeSinceLastCall >= SUGGESTION_CONFIG.MIN_DELAY_MS) {
        setIsDynamicEnabled(true);
        lastApiCallRef.current = now;
      }
    }, SUGGESTION_CONFIG.MIN_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  // Generate minimal suggestion instructions to reduce token usage
  const suggestionInstructions = useMemo(() => {
    // Build compact instruction based on missing sections
    const missing: string[] = [];
    if (!analysis.hasBasicInfo) missing.push("contact");
    if (!analysis.hasSummary) missing.push("summary");
    if (analysis.workCount === 0) missing.push("work");
    if (analysis.educationCount === 0) missing.push("education");
    if (analysis.skillsCount === 0) missing.push("skills");
    
    // Keep instruction minimal to save tokens
    if (missing.length > 0) {
      return `Suggest adding: ${missing.join(", ")}`;
    }
    return "Suggest improvements for resume";
  }, [analysis]);

  // Throttled callback to handle rate limit errors
  const handleSuggestionError = useCallback(() => {
    retryCountRef.current += 1;
    
    if (retryCountRef.current <= SUGGESTION_CONFIG.MAX_RETRIES) {
      // Disable and re-enable with exponential backoff
      setIsDynamicEnabled(false);
      const delay = SUGGESTION_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryCountRef.current - 1);
      
      setTimeout(() => {
        lastApiCallRef.current = Date.now();
        setIsDynamicEnabled(true);
      }, delay);
    } else {
      // Max retries exceeded, stay with static suggestions
      setIsDynamicEnabled(false);
    }
  }, []);

  // Register dynamic suggestions with CopilotKit
  // When disabled, use minimal config to prevent API calls
  // Reduced minSuggestions to 1 and maxSuggestions to 3 to save tokens
  useCopilotChatSuggestions(
    {
      instructions: isDynamicEnabled 
        ? suggestionInstructions 
        : "No suggestions",
      minSuggestions: isDynamicEnabled ? 1 : 0,
      maxSuggestions: isDynamicEnabled ? 3 : 0,
    },
    [isDynamicEnabled, suggestionInstructions]
  );

  return { 
    analysis, 
    staticSuggestions, 
    isDynamicEnabled,
    handleSuggestionError,
  };
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
