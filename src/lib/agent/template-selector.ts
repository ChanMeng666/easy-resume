import { type ParsedJD } from "./jd-parser";
import type { AccentPair, DesignTokens } from "@/lib/design/tokens";

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

/**
 * Industry → palette shortlist. Each shortlist holds ~2 tasteful palettes for a
 * bucket; the per-candidate seed hash then picks one deterministically. Reuses
 * the same keyword buckets as selectTemplate so the color choice tracks the same
 * industry signal. First matching rule wins (order = specificity).
 */
interface PaletteRule {
  industry: string[];
  palettes: AccentPair[];
}

const PALETTE_RULES: PaletteRule[] = [
  { industry: ["finance", "banking", "accounting", "investment", "audit"], palettes: ["graphite", "slate"] },
  { industry: ["creative", "design", "art", "media", "ux", "ui", "brand"], palettes: ["crimson", "amber"] },
  { industry: ["academic", "research", "university", "education", "phd", "postdoc"], palettes: ["slate", "graphite"] },
  { industry: ["tech", "software", "engineering", "it", "developer", "data"], palettes: ["indigo", "emerald"] },
];

/** Fallback shortlist when no industry keyword matches. */
const DEFAULT_SHORTLIST: AccentPair[] = ["slate", "indigo"];

/** Experience levels that map to a compact density (persisted, unconsumed for now). */
const COMPACT_LEVELS = new Set(["entry", "intern", "internship", "junior"]);

/**
 * 32-bit FNV-1a hash of a string. Small, pure, dependency-free, and stable across
 * runs/platforms (operates on UTF-16 code units), so it yields a reproducible
 * index into a palette shortlist. NOT for security — only for deterministic
 * spreading of candidates across a small set of choices.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Deterministically select design tokens for a resume.
 *
 * Rule-based, no LLM, no randomness: the JD industry picks a palette shortlist
 * and the stable candidate `seed` (email → name → '') hashes to one entry of it,
 * so the same candidate + posting always resolves to the same palette. Seniority
 * maps to density (entry/intern/junior → compact) — persisted for reproducibility
 * but not yet consumed by any generator. An empty seed resolves to the first
 * shortlist entry (a stable default rather than a hash of '').
 *
 * @param jd - The parsed job description (reads `industry` + `experienceLevel`).
 * @param seed - A stable per-candidate string (email, else name, else '').
 * @returns The resolved, reproducible design tokens.
 */
export function selectDesignTokens(jd: ParsedJD, seed: string): DesignTokens {
  const industry = jd.industry.toLowerCase();
  const shortlist =
    PALETTE_RULES.find((r) => r.industry.some((kw) => industry.includes(kw)))?.palettes ??
    DEFAULT_SHORTLIST;

  // Empty seed → the shortlist's first (default) palette; otherwise hash-pick.
  const index = seed ? fnv1a(seed) % shortlist.length : 0;
  const palette = shortlist[index];

  const level = jd.experienceLevel.toLowerCase().trim();
  const density = COMPACT_LEVELS.has(level) ? "compact" : "comfortable";

  return { palette, density };
}
