import { EditSection } from "./sections";

/**
 * Minimal system instructions for the Vitex AI Resume Assistant.
 * Kept ultra-compact to minimize token usage.
 */
export const RESUME_AI_INSTRUCTIONS = `You are Vitex AI, a resume assistant.

RULES:
- Use action verbs (Led, Developed, Optimized)
- Quantify achievements with numbers
- Keep bullets under 15 words
- Escape LaTeX chars (%, $, &, #)

Be concise. Only use tools for the active section.`;

/**
 * Get section-specific instructions (optional enhancement).
 */
export function getSectionInstructions(section: EditSection): string {
  const base = RESUME_AI_INSTRUCTIONS;
  const sectionHints: Record<EditSection, string> = {
    basics: "Focus on name, title, contact info, and professional summary.",
    work: "Focus on work experience with achievement-focused bullet points.",
    education: "Focus on degrees, institutions, dates, and relevant coursework.",
    skills: "Focus on organizing skills into logical categories.",
    projects: "Focus on project descriptions with technical details and impact.",
    extras: "Focus on achievements, certifications, and social links.",
  };
  return `${base}\n\nCurrent: ${section.toUpperCase()} - ${sectionHints[section]}`;
}

/**
 * Chat UI labels.
 */
export const CHAT_LABELS = {
  title: "Vitex AI",
  initial: "Hi! Select a section above, then tell me what to add or improve.",
  placeholder: "Ask me to help...",
};
