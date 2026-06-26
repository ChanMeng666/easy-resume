/**
 * Deterministic keyword / skill coverage.
 *
 * LLM numeric scores drift run-to-run (identical input can swing ±7-8 points),
 * and an LLM grading a resume it just wrote is not an independent check. Coverage
 * — the backbone of any honest ATS score — is therefore computed here in plain,
 * reproducible code: the same input always yields the same number. The LLM is
 * reserved for qualitative feedback, never the headline score.
 */

import type { ResumeData } from "@/lib/validation/schema";

/** Lowercased, whitespace-collapsed form for case-insensitive matching. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export interface CoverageResult {
  found: string[];
  missing: string[];
  /** 0-100, deterministic: round(found / total * 100); 100 when nothing to match. */
  score: number;
}

/**
 * Compute which of `keywords` appear within the `haystack` text fragments.
 * A keyword matches when its normalized form is a substring of the normalized,
 * concatenated haystack. Duplicate keywords (case-insensitive) are counted once.
 * Fully deterministic.
 */
export function computeKeywordCoverage(
  haystack: string[],
  keywords: string[]
): CoverageResult {
  const blob = normalize(haystack.join(" \n "));
  const found: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const kw of keywords) {
    const n = normalize(kw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (blob.includes(n)) found.push(kw);
    else missing.push(kw);
  }

  const total = found.length + missing.length;
  const score = total === 0 ? 100 : Math.round((found.length / total) * 100);
  return { found, missing, score };
}

/**
 * Bidirectional skill overlap (used by the match analysis): a JD skill counts as
 * matched if it contains, or is contained by, any resume skill token. Duplicate
 * JD skills (case-insensitive) are counted once. Deterministic.
 */
export function computeSkillOverlap(
  resumeSkills: string[],
  jdSkills: string[]
): { matched: string[]; missing: string[] } {
  const normalizedResume = resumeSkills.map(normalize).filter(Boolean);
  const matched: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const skill of jdSkills) {
    const n = normalize(skill);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    if (normalizedResume.some((rs) => rs.includes(n) || n.includes(rs))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

/**
 * Flatten the resume into the text fragments an ATS would scan for keywords:
 * summary, skill keywords, work highlights, project names/highlights,
 * achievements, and certifications. Pure.
 */
export function resumeKeywordHaystack(resume: ResumeData): string[] {
  const fragments: string[] = [];
  if (resume.basics.summary) fragments.push(resume.basics.summary);
  fragments.push(resume.basics.label);
  for (const s of resume.skills) {
    fragments.push(s.name, ...s.keywords);
  }
  for (const w of resume.work) {
    fragments.push(w.position, ...w.highlights);
  }
  for (const p of resume.projects) {
    fragments.push(p.name, p.description, ...p.highlights);
  }
  fragments.push(...resume.achievements, ...resume.certifications);
  return fragments.filter(Boolean);
}
