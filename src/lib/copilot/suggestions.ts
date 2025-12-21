"use client";

import { EditSection } from "./sections";

/**
 * Static suggestions for each editing section.
 * These are displayed immediately without AI generation.
 */
export const SECTION_SUGGESTIONS: Record<EditSection, Array<{ title: string; message: string }>> = {
  basics: [
    { title: "📝 Write Summary", message: "Help me write a professional summary for my resume" },
    { title: "📋 Add Contact", message: "Update my contact information" },
    { title: "🎯 Improve Title", message: "Suggest a better professional title for my target role" },
  ],
  work: [
    { title: "💼 Add Experience", message: "Help me add my work experience with strong bullet points" },
    { title: "💪 Improve Bullets", message: "Improve my work experience bullet points with action verbs and metrics" },
    { title: "🎯 Tailor for Job", message: "Help me tailor my work experience for a specific job" },
  ],
  education: [
    { title: "🎓 Add Degree", message: "Help me add my educational background" },
    { title: "📚 Add Coursework", message: "Help me add relevant coursework and achievements" },
    { title: "🏆 Add Honors", message: "Add academic honors and distinctions" },
  ],
  skills: [
    { title: "⚡ Add Skills", message: "Help me add my technical skills organized by category" },
    { title: "🔧 Technical Skills", message: "Add programming languages, frameworks, and tools I know" },
    { title: "💡 Soft Skills", message: "Add soft skills relevant to my target role" },
  ],
  projects: [
    { title: "🚀 Add Project", message: "Help me add a project that showcases my abilities" },
    { title: "📊 Add Metrics", message: "Help me quantify the impact of my projects" },
    { title: "🔗 Add Links", message: "Add links to my project repositories or demos" },
  ],
  extras: [
    { title: "🏆 Add Achievement", message: "Help me add notable achievements and awards" },
    { title: "📜 Add Certification", message: "Add my professional certifications" },
    { title: "🎨 Change Template", message: "Help me choose a better template for my resume" },
  ],
};

/**
 * Get static suggestions for the current editing section.
 */
export function getSectionSuggestions(section: EditSection) {
  return SECTION_SUGGESTIONS[section] || SECTION_SUGGESTIONS.basics;
}

/**
 * Default fallback suggestions (used when section is not set).
 */
export const STATIC_SUGGESTIONS = [
  { title: "📝 Write Summary", message: "Help me write a professional summary" },
  { title: "💼 Add Work", message: "Help me add work experience" },
  { title: "🎓 Add Education", message: "Help me add education" },
  { title: "⚡ Add Skills", message: "Help me add skills" },
];
