import { type ParsedJD } from "./jd-parser";

/**
 * Each candidate template and the industry/level signals that vote for it.
 * Order in this list is also the deterministic tie-break order (earlier wins),
 * so keep the more specific buckets above the generic "two-column" default.
 */
interface TemplateRule {
  id: string;
  /** Substrings matched against the JD industry (case-insensitive). */
  industry: string[];
  /** Exact experience-level matches (case-insensitive). */
  levels?: string[];
}

const TEMPLATE_RULES: TemplateRule[] = [
  {
    id: "executive",
    industry: ["executive", "director", "vp", "c-suite", "chief"],
    levels: ["executive", "lead"],
  },
  { id: "academic", industry: ["academic", "research", "university", "education", "phd", "postdoc"] },
  { id: "banking", industry: ["finance", "banking", "accounting", "investment", "audit"] },
  { id: "creative", industry: ["creative", "design", "art", "media", "ux", "ui", "brand"] },
  { id: "two-column", industry: ["tech", "software", "engineering", "it", "developer", "data"] },
  { id: "modern-cv", industry: ["consulting", "management", "business", "operations", "strategy"] },
  { id: "compact", industry: [], levels: ["entry", "intern", "internship", "junior"] },
];

const DEFAULT_TEMPLATE = "two-column";

/**
 * Selects the best resume template for a parsed job description.
 *
 * Uses weighted scoring rather than first-match: every industry-keyword hit
 * scores 2 and an experience-level hit scores 3, so a "tech consultant" whose JD
 * leans technical lands on the tech template instead of being hijacked by the
 * first rule that happens to match. Ties break by rule order (most specific
 * first). Fully deterministic.
 */
export function selectTemplate(jd: ParsedJD): string {
  const industry = jd.industry.toLowerCase();
  const level = jd.experienceLevel.toLowerCase().trim();

  let best = DEFAULT_TEMPLATE;
  let bestScore = 0;

  for (const rule of TEMPLATE_RULES) {
    let score = 0;
    for (const kw of rule.industry) {
      if (industry.includes(kw)) score += 2;
    }
    if (rule.levels?.some((l) => level === l)) score += 3;

    // Strictly-greater keeps the earliest (most specific) rule on ties.
    if (score > bestScore) {
      bestScore = score;
      best = rule.id;
    }
  }

  return best;
}
