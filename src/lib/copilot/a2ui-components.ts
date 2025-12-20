"use client";

/**
 * A2UI Component Types.
 * Defines the structure for agent-generated declarative UI components.
 */

export type A2UIComponentType = 
  | "resume-section-preview"
  | "work-entry"
  | "education-entry"
  | "skill-tags"
  | "project-card"
  | "template-grid"
  | "generation-progress"
  | "content-diff"
  | "ats-score"
  | "agent-status";

/**
 * Base props for all A2UI components.
 */
export interface A2UIBaseProps {
  className?: string;
}

/**
 * Resume section preview props.
 */
export interface ResumeSectionPreviewProps extends A2UIBaseProps {
  title: string;
  content: string;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

/**
 * Work entry props.
 */
export interface WorkEntryProps extends A2UIBaseProps {
  company: string;
  position: string;
  dates: string;
  highlights: string[];
  isNew?: boolean;
}

/**
 * Education entry props.
 */
export interface EducationEntryProps extends A2UIBaseProps {
  institution: string;
  degree: string;
  dates: string;
  gpa?: string;
  notes?: string;
}

/**
 * Skill tags props.
 */
export interface SkillTagsProps extends A2UIBaseProps {
  skills: string[];
  category?: string;
}

/**
 * Project card props.
 */
export interface ProjectCardProps extends A2UIBaseProps {
  name: string;
  description: string;
  highlights: string[];
  url?: string;
}

/**
 * Template grid props.
 */
export interface TemplateGridProps extends A2UIBaseProps {
  templates: {
    id: string;
    name: string;
    description: string;
    previewUrl?: string;
  }[];
  selected?: string;
  onSelect?: (templateId: string) => void;
}

/**
 * Generation progress props.
 */
export interface GenerationProgressProps extends A2UIBaseProps {
  progress: number;
  currentStep: string;
  steps: string[];
}

/**
 * Content diff props.
 */
export interface ContentDiffProps extends A2UIBaseProps {
  before: string;
  after: string;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * ATS score props.
 */
export interface ATSScoreProps extends A2UIBaseProps {
  score: number;
  keywords: string[];
  suggestions: string[];
}

/**
 * Agent status props.
 */
export interface AgentStatusProps extends A2UIBaseProps {
  agents: {
    name: string;
    status: "idle" | "running" | "completed" | "error";
    progress?: number;
  }[];
}

/**
 * A2UI Component Catalog.
 * Maps component types to their configurations.
 */
export const A2UI_COMPONENT_CATALOG: Record<A2UIComponentType, {
  type: "card" | "inline" | "grid" | "progress";
  props: string[];
  description: string;
}> = {
  "resume-section-preview": {
    type: "card",
    props: ["title", "content", "actions"],
    description: "Preview card for a resume section",
  },
  "work-entry": {
    type: "card",
    props: ["company", "position", "dates", "highlights"],
    description: "Work experience entry card",
  },
  "education-entry": {
    type: "card",
    props: ["institution", "degree", "dates", "gpa", "notes"],
    description: "Education entry card",
  },
  "skill-tags": {
    type: "inline",
    props: ["skills", "category"],
    description: "Inline skill tags display",
  },
  "project-card": {
    type: "card",
    props: ["name", "description", "highlights", "url"],
    description: "Project card with details",
  },
  "template-grid": {
    type: "grid",
    props: ["templates", "selected", "onSelect"],
    description: "Grid of template options",
  },
  "generation-progress": {
    type: "progress",
    props: ["progress", "currentStep", "steps"],
    description: "Progress indicator for generation",
  },
  "content-diff": {
    type: "card",
    props: ["before", "after", "onApprove", "onReject"],
    description: "Side-by-side content comparison",
  },
  "ats-score": {
    type: "card",
    props: ["score", "keywords", "suggestions"],
    description: "ATS compatibility score display",
  },
  "agent-status": {
    type: "progress",
    props: ["agents"],
    description: "Multi-agent status display",
  },
};

/**
 * Helper function to create A2UI component data.
 */
export function createA2UIComponent<T extends A2UIComponentType>(
  type: T,
  props: Record<string, unknown>
): { type: T; props: Record<string, unknown> } {
  return { type, props };
}

/**
 * Type guard to check if an object is a valid A2UI component.
 */
export function isA2UIComponent(obj: unknown): obj is { type: A2UIComponentType; props: Record<string, unknown> } {
  if (typeof obj !== "object" || obj === null) return false;
  const component = obj as Record<string, unknown>;
  return (
    typeof component.type === "string" &&
    component.type in A2UI_COMPONENT_CATALOG &&
    typeof component.props === "object" &&
    component.props !== null
  );
}

/**
 * Get component configuration from catalog.
 */
export function getComponentConfig(type: A2UIComponentType) {
  return A2UI_COMPONENT_CATALOG[type];
}
