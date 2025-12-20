"use client";

import { CopilotTextarea as CopilotTextareaOriginal } from "@copilotkit/react-textarea";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

// Type assertion to fix React 19 compatibility issue with CopilotTextarea
// The library was built for React 18 and has incompatible JSX element types
const CopilotTextarea = CopilotTextareaOriginal as React.FC<ComponentProps<typeof CopilotTextareaOriginal>>;

/**
 * Props for AIEnhancedTextarea components.
 */
interface AITextareaBaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

/**
 * AI-enhanced textarea for professional summary.
 * Provides intelligent autocomplete and suggestions for resume summaries.
 */
export function AISummaryTextarea({
  value,
  onChange,
  placeholder = "Write your professional summary...",
  className,
  disabled = false,
  rows = 4,
  jobTitle = "",
  industry = "",
}: AITextareaBaseProps & {
  jobTitle?: string;
  industry?: string;
}) {
  const purposePrompt = jobTitle
    ? `Professional resume summary for a ${jobTitle}${industry ? ` in ${industry}` : ""}`
    : "Professional resume summary highlighting key achievements and career goals";

  return (
    <CopilotTextarea
      className={cn(
        "w-full px-4 py-3 rounded-lg",
        "border-2 border-black",
        "bg-white",
        "font-medium text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]",
        "transition-all duration-200",
        "resize-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
      autosuggestionsConfig={{
        textareaPurpose: purposePrompt,
        chatApiConfigs: {},
      }}
    />
  );
}

/**
 * AI-enhanced textarea for work experience highlights.
 * Suggests achievement-focused bullet points with action verbs.
 */
export function AIWorkHighlightTextarea({
  value,
  onChange,
  placeholder = "Describe your achievement...",
  className,
  disabled = false,
  position = "",
  company = "",
}: AITextareaBaseProps & {
  position?: string;
  company?: string;
}) {
  const purposePrompt = position
    ? `Achievement bullet point for ${position}${company ? ` at ${company}` : ""}. Use action verbs and quantify results.`
    : "Achievement bullet point for work experience. Start with an action verb and quantify impact.";

  return (
    <CopilotTextarea
      className={cn(
        "w-full px-4 py-2 rounded-lg",
        "border-2 border-black",
        "bg-white",
        "font-medium text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]",
        "transition-all duration-200",
        "resize-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={2}
      autosuggestionsConfig={{
        textareaPurpose: purposePrompt,
        chatApiConfigs: {},
      }}
    />
  );
}

/**
 * AI-enhanced textarea for project descriptions.
 * Suggests technical descriptions with impact focus.
 */
export function AIProjectDescriptionTextarea({
  value,
  onChange,
  placeholder = "Describe your project...",
  className,
  disabled = false,
  projectName = "",
  techStack = [],
}: AITextareaBaseProps & {
  projectName?: string;
  techStack?: string[];
}) {
  const techContext = techStack.length > 0 ? ` using ${techStack.join(", ")}` : "";
  const purposePrompt = projectName
    ? `Technical project description for ${projectName}${techContext}. Focus on challenges solved and impact.`
    : "Technical project description. Highlight the problem solved, technologies used, and impact achieved.";

  return (
    <CopilotTextarea
      className={cn(
        "w-full px-4 py-3 rounded-lg",
        "border-2 border-black",
        "bg-white",
        "font-medium text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]",
        "transition-all duration-200",
        "resize-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
      autosuggestionsConfig={{
        textareaPurpose: purposePrompt,
        chatApiConfigs: {},
      }}
    />
  );
}

/**
 * AI-enhanced textarea for education notes.
 * Suggests relevant coursework, honors, and activities.
 */
export function AIEducationNotesTextarea({
  value,
  onChange,
  placeholder = "Add relevant coursework, honors, activities...",
  className,
  disabled = false,
  degree = "",
  field = "",
}: AITextareaBaseProps & {
  degree?: string;
  field?: string;
}) {
  const purposePrompt = degree
    ? `Education notes for ${degree}${field ? ` in ${field}` : ""}. Include relevant coursework, academic honors, or activities.`
    : "Education notes including relevant coursework, academic achievements, and extracurricular activities.";

  return (
    <CopilotTextarea
      className={cn(
        "w-full px-4 py-2 rounded-lg",
        "border-2 border-black",
        "bg-white",
        "font-medium text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]",
        "transition-all duration-200",
        "resize-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={2}
      autosuggestionsConfig={{
        textareaPurpose: purposePrompt,
        chatApiConfigs: {},
      }}
    />
  );
}

/**
 * Generic AI-enhanced textarea with custom purpose.
 * Use this for any text field that could benefit from AI suggestions.
 */
export function AIGenericTextarea({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  disabled = false,
  rows = 3,
  purpose = "Resume content",
}: AITextareaBaseProps & {
  purpose?: string;
}) {
  return (
    <CopilotTextarea
      className={cn(
        "w-full px-4 py-3 rounded-lg",
        "border-2 border-black",
        "bg-white",
        "font-medium text-sm",
        "placeholder:text-muted-foreground",
        "focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]",
        "transition-all duration-200",
        "resize-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
      autosuggestionsConfig={{
        textareaPurpose: purpose,
        chatApiConfigs: {},
      }}
    />
  );
}
