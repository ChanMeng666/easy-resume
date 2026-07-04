/**
 * Design tokens — a small, bounded set of tasteful per-resume style variations.
 *
 * A deterministic, rule-based selector (see selectDesignTokens) picks these from
 * the parsed JD plus a stable candidate seed, so a resume gets subtle per-user
 * variety that is fully reproducible: the same inputs always resolve to the same
 * tokens, and a rendered PDF is a build artifact that rebuilds identically
 * forever. Tokens change colors (and, in a future PR, spacing) only — never the
 * layout structure, so ATS compatibility is untouched.
 */

import { z } from 'zod';

/**
 * The bounded palette set. Each entry is a (primary, accent) color pair a
 * template applies to its headings/rules/tags. `slate` is the historical default
 * and MUST reproduce the pre-tokens two-column output exactly (see resolvePalette
 * / generateTypstCode).
 */
export const ACCENT_PAIRS = {
  slate: { primary: '#0E5484', accent: '#2E86AB' }, // current default — reproduces today's output exactly
  indigo: { primary: '#3730A3', accent: '#6366F1' },
  emerald: { primary: '#065F46', accent: '#10B981' },
  crimson: { primary: '#9F1239', accent: '#E11D48' },
  amber: { primary: '#92400E', accent: '#D97706' },
  graphite: { primary: '#1F2937', accent: '#475569' },
} as const;

/** A palette name (key of ACCENT_PAIRS). */
export type AccentPair = keyof typeof ACCENT_PAIRS;

/** Vertical-rhythm density. Persisted now; not yet consumed by any generator. */
export type Density = 'comfortable' | 'compact';

/** The resolved design tokens attached to a generated resume. */
export interface DesignTokens {
  palette: AccentPair;
  density: Density;
}

/** The default tokens — today's exact look (slate palette, comfortable density). */
export const DEFAULT_TOKENS: DesignTokens = { palette: 'slate', density: 'comfortable' };

/**
 * Zod schema for DesignTokens with both fields defaulted, so a partial or absent
 * `tokens` (e.g. an old persisted job) parses cleanly to DEFAULT_TOKENS.
 */
export const designTokensSchema = z.object({
  palette: z
    .enum(['slate', 'indigo', 'emerald', 'crimson', 'amber', 'graphite'])
    .default(DEFAULT_TOKENS.palette),
  density: z.enum(['comfortable', 'compact']).default(DEFAULT_TOKENS.density),
});

/**
 * Resolve a token set's palette to concrete hex colors. Falls back to the slate
 * pair for an unrecognized palette name so a malformed/legacy value can never
 * produce an undefined color.
 *
 * @param tokens - The design tokens to resolve.
 * @returns The `{ primary, accent }` hex color pair.
 */
export function resolvePalette(tokens: DesignTokens): { primary: string; accent: string } {
  return ACCENT_PAIRS[tokens.palette] ?? ACCENT_PAIRS.slate;
}

/**
 * Resolved vertical-spacing scale for a token set. `scale` multiplies the
 * inter-block `v(...em)` rhythm only — micro header gaps, page margins,
 * paragraph leading, tag insets, and column gutters stay fixed.
 */
export interface Spacing {
  scale: number;
}

/**
 * Resolve a token set's density to a single vertical-spacing scale factor:
 * comfortable = 1.0 (today's look), compact = 0.8 (tighter block rhythm).
 *
 * @param tokens - The design tokens to resolve.
 * @returns The `{ scale }` factor to apply to inter-block em gaps.
 */
export function resolveSpacing(tokens: DesignTokens): Spacing {
  return { scale: tokens.density === 'compact' ? 0.8 : 1 };
}

/**
 * Format a scaled em gap for Typst. At scale === 1 (comfortable) the base value
 * is emitted verbatim — the byte-compatibility guarantee that comfortable output
 * reproduces today's literals exactly. Otherwise the value is scaled and rounded
 * to two decimals.
 *
 * @param baseEm - The comfortable-density gap in em.
 * @param s - The resolved spacing scale.
 * @returns A Typst length string such as `"0.8em"` or `"0.64em"`.
 */
export function emGap(baseEm: number, s: Spacing): string {
  return s.scale === 1 ? `${baseEm}em` : `${Math.round(baseEm * s.scale * 100) / 100}em`;
}
