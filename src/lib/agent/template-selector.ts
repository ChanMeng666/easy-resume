import { type ParsedJD } from "./jd-parser";

/**
 * Selects the best resume template based on parsed job description attributes.
 * Uses rule-based matching on industry and experience level.
 */
export function selectTemplate(jd: ParsedJD): string {
  const industry = jd.industry.toLowerCase();
  const level = jd.experienceLevel.toLowerCase();

  if (
    industry.includes("executive") ||
    industry.includes("director") ||
    industry.includes("vp") ||
    industry.includes("c-suite") ||
    level === "executive"
  ) {
    return "executive";
  }

  if (
    industry.includes("academic") ||
    industry.includes("research") ||
    industry.includes("university") ||
    industry.includes("education")
  ) {
    return "academic";
  }

  if (
    industry.includes("finance") ||
    industry.includes("banking") ||
    industry.includes("accounting")
  ) {
    return "banking";
  }

  if (
    industry.includes("creative") ||
    industry.includes("design") ||
    industry.includes("art") ||
    industry.includes("media")
  ) {
    return "creative";
  }

  if (
    industry.includes("tech") ||
    industry.includes("software") ||
    industry.includes("engineering") ||
    industry.includes("it")
  ) {
    return "two-column";
  }

  if (
    industry.includes("consulting") ||
    industry.includes("management") ||
    industry.includes("business")
  ) {
    return "modern-cv";
  }

  if (level === "entry" || level === "intern") {
    return "compact";
  }

  return "two-column";
}
