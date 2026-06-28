/**
 * Faithfulness check — a grounding gate between tailoring and rendering.
 *
 * Tailoring is instructed to "weave in keywords" and "highlight transferable
 * skills", which is exactly where an LLM can drift into invention: a skill the
 * candidate never listed, an employer that wasn't there, a date that changed.
 * Nothing else in the pipeline verifies that the tailored resume is still
 * grounded in the original. This module does — DETERMINISTICALLY, so it's fast,
 * free, and reproducible — and emits feedback the pipeline can feed back into a
 * single corrective re-tailor pass.
 *
 * It is intentionally pure (no I/O, no LLM): it compares two ResumeData objects.
 */

import type { ResumeData } from "@/lib/validation/schema";

export type Severity = "high" | "low";

export interface FaithfulnessViolation {
  /** Which area drifted: "skill" | "company" | "institution" | "date". */
  field: string;
  /** The fabricated value found in the tailored resume. */
  tailoredValue: string;
  severity: Severity;
}

export interface FaithfulnessResult {
  /** True when there are no high-severity (fabricated fact) violations. */
  isFaithful: boolean;
  violations: FaithfulnessViolation[];
  /** Human-readable correction notes for a re-tailor pass (empty when faithful). */
  feedback: string;
}

/** Lowercased, whitespace-collapsed form for case-insensitive comparison. */
function norm(s: string): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Common skill abbreviation ⇄ full-form equivalences, keyed by normalized form.
 * Tailoring legitimately rewrites "Machine Learning" as "ML" (and vice-versa);
 * without this map the substring check would flag that as a fabricated skill and
 * trigger a needless re-tailor. Mapping every variant to ONE canonical form lets
 * the grounding check treat them as the same skill.
 *
 * Only UNAMBIGUOUS technical abbreviations belong here. An ambiguous alias (e.g.
 * "CV" = computer vision OR curriculum vitae) is deliberately excluded: mapping
 * it would let a base "CV" ground a fabricated "Computer Vision" — a real
 * false-negative. When in doubt, leave it out (a needless re-tailor is cheaper
 * than passing a fabrication). Extend conservatively.
 */
const SKILL_SYNONYMS: Record<string, string> = {
  ml: "machine learning",
  "machine learning": "machine learning",
  nlp: "natural language processing",
  "natural language processing": "natural language processing",
  js: "javascript",
  javascript: "javascript",
  ecmascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  postgres: "postgresql",
  postgre: "postgresql",
  postgresql: "postgresql",
  "node.js": "node",
  nodejs: "node",
  node: "node",
  "react.js": "react",
  reactjs: "react",
  react: "react",
  gcp: "google cloud platform",
  "google cloud": "google cloud platform",
  "google cloud platform": "google cloud platform",
  aws: "amazon web services",
  "amazon web services": "amazon web services",
  "ci/cd": "continuous integration and delivery",
  cicd: "continuous integration and delivery",
};

/** Map a skill to its canonical form (norm + abbreviation expansion). */
function canonicalSkill(s: string): string {
  const n = norm(s);
  return SKILL_SYNONYMS[n] ?? n;
}

/** Build a normalized set, skipping empties. */
function normSet(values: Array<string | undefined>): Set<string> {
  const set = new Set<string>();
  for (const v of values) {
    const n = norm(v ?? "");
    if (n) set.add(n);
  }
  return set;
}

/**
 * Compare a tailored resume against its base and flag fabricated facts.
 *
 * Defensive by design: both inputs may be partially-shaped (arrays absent), so
 * every section is read through a `?? []` guard and never throws.
 *
 * Detected (high severity — fabricated facts):
 *  - skill keywords present in tailored but absent from base
 *  - employers (work.company) present in tailored but absent from base
 *  - institutions (education.institution) present in tailored but absent from base
 * Detected (low severity — likely formatting drift, not auto-corrected):
 *  - work/education date strings present in tailored but absent from base
 */
export function checkFaithfulness(
  base: ResumeData,
  tailored: ResumeData
): FaithfulnessResult {
  const violations: FaithfulnessViolation[] = [];

  // --- Skills: no new skill keywords may appear in the tailored resume ---
  // Compare on CANONICAL forms so "ML" ⇄ "Machine Learning" (and similar
  // abbreviations) aren't mistaken for fabricated skills.
  const baseSkillCanon = new Set(
    (base.skills ?? []).flatMap((s) => s.keywords ?? []).map(canonicalSkill).filter(Boolean)
  );
  const tailoredSkills = (tailored.skills ?? []).flatMap((s) => s.keywords ?? []);
  for (const kw of tailoredSkills) {
    const c = canonicalSkill(kw);
    if (!c) continue;
    // A tailored skill is fabricated only if no base skill contains it or is
    // contained by it (covers "React" vs "React.js" style rephrasings), after
    // canonicalization.
    const grounded = [...baseSkillCanon].some((b) => b.includes(c) || c.includes(b));
    if (!grounded) {
      violations.push({ field: "skill", tailoredValue: kw, severity: "high" });
    }
  }

  // --- Employers must come from the base resume ---
  const baseCompanies = normSet((base.work ?? []).map((w) => w.company));
  for (const w of tailored.work ?? []) {
    const n = norm(w.company);
    if (n && !baseCompanies.has(n)) {
      violations.push({ field: "company", tailoredValue: w.company, severity: "high" });
    }
  }

  // --- Institutions must come from the base resume ---
  const baseInstitutions = normSet((base.education ?? []).map((e) => e.institution));
  for (const e of tailored.education ?? []) {
    const n = norm(e.institution);
    if (n && !baseInstitutions.has(n)) {
      violations.push({
        field: "institution",
        tailoredValue: e.institution,
        severity: "high",
      });
    }
  }

  // --- Dates should be preserved verbatim (low severity: often just reformatting) ---
  const baseDates = normSet([
    ...(base.work ?? []).flatMap((w) => [w.startDate, w.endDate]),
    ...(base.education ?? []).flatMap((e) => [e.startDate, e.endDate]),
  ]);
  const tailoredDates = [
    ...(tailored.work ?? []).flatMap((w) => [w.startDate, w.endDate]),
    ...(tailored.education ?? []).flatMap((e) => [e.startDate, e.endDate]),
  ];
  for (const d of tailoredDates) {
    const n = norm(d);
    if (n && !baseDates.has(n)) {
      violations.push({ field: "date", tailoredValue: d, severity: "low" });
    }
  }

  const hasHigh = violations.some((v) => v.severity === "high");
  const feedback = hasHigh ? buildFeedback(violations) : "";

  return { isFaithful: !hasHigh, violations, feedback };
}

/** Turn high-severity violations into terse, actionable correction notes. */
function buildFeedback(violations: FaithfulnessViolation[]): string {
  const lines: string[] = [];
  const byField = (f: string) =>
    violations.filter((v) => v.severity === "high" && v.field === f).map((v) => v.tailoredValue);

  const skills = byField("skill");
  if (skills.length) {
    lines.push(
      `- Remove these skills — they are not in the candidate's original resume: ${skills.join(", ")}.`
    );
  }
  const companies = byField("company");
  if (companies.length) {
    lines.push(
      `- These employers were not in the original resume and must not appear: ${companies.join(", ")}.`
    );
  }
  const institutions = byField("institution");
  if (institutions.length) {
    lines.push(
      `- These institutions were not in the original resume and must not appear: ${institutions.join(", ")}.`
    );
  }
  return lines.join("\n");
}
