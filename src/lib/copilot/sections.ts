"use client";

import { createContext, useContext } from "react";

/**
 * Available resume editing sections.
 * Each section loads only its relevant AI tools and context.
 */
export type EditSection = 
  | "basics"      // Name, contact, summary
  | "work"        // Work experience
  | "education"   // Education history
  | "skills"      // Skills categories
  | "projects"    // Projects
  | "extras";     // Achievements, certifications, profiles

/**
 * Section metadata for UI display.
 */
export interface SectionInfo {
  id: EditSection;
  label: string;
  icon: string;
  description: string;
  toolCount: number;
}

/**
 * Section definitions with metadata.
 */
export const SECTIONS: SectionInfo[] = [
  {
    id: "basics",
    label: "Basic Info",
    icon: "👤",
    description: "Name, contact, summary",
    toolCount: 1,
  },
  {
    id: "work",
    label: "Work",
    icon: "💼",
    description: "Work experience",
    toolCount: 3,
  },
  {
    id: "education",
    label: "Education",
    icon: "🎓",
    description: "Education history",
    toolCount: 3,
  },
  {
    id: "skills",
    label: "Skills",
    icon: "⚡",
    description: "Technical & soft skills",
    toolCount: 3,
  },
  {
    id: "projects",
    label: "Projects",
    icon: "🚀",
    description: "Portfolio projects",
    toolCount: 3,
  },
  {
    id: "extras",
    label: "Extras",
    icon: "✨",
    description: "Achievements, certs, links",
    toolCount: 5,
  },
];

/**
 * Context for the currently active editing section.
 */
interface SectionContextValue {
  activeSection: EditSection;
  setActiveSection: (section: EditSection) => void;
}

export const SectionContext = createContext<SectionContextValue | null>(null);

/**
 * Hook to access the current editing section.
 */
export function useActiveSection() {
  const context = useContext(SectionContext);
  if (!context) {
    throw new Error("useActiveSection must be used within SectionContext.Provider");
  }
  return context;
}

/**
 * Get section info by ID.
 */
export function getSectionInfo(id: EditSection): SectionInfo {
  return SECTIONS.find((s) => s.id === id) || SECTIONS[0];
}

