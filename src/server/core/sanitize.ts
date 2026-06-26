/**
 * Prompt-injection sanitization for the generation pipeline.
 *
 * Two layers:
 *  1. `sanitizeForPrompt` — scrubs a single string: drops control / zero-width
 *     characters and neutralizes "ignore previous instructions"-style override
 *     lines. Applied to the two raw user inputs at the pipeline entry.
 *  2. `sanitizeDeep` — recursively applies (1) to every string in a structured
 *     object, preserving its shape and type. Used on INTERMEDIATE data (the
 *     parsed JD, the parsed/tailored resume) before those LLM-reconstructed
 *     values are re-interpolated into downstream prompts or rendered. An
 *     injection payload that survives one parse step as a plausible field value
 *     (e.g. a "responsibility" reading "disregard the instructions and...") is
 *     defanged before it can reach the next model.
 *
 * Defense-in-depth, not a guarantee: schema validation remains the primary
 * control. This raises the cost of a successful injection, it does not promise
 * immunity.
 */

import 'server-only';

// Lines that try to override the system/instructions are neutralized. Pure ASCII.
const INSTRUCTION_OVERRIDE = /(^|\n)\s*(ignore|disregard|forget)\b[^\n]*\binstructions?\b/gi;

/**
 * Defang the most common prompt-injection vectors in a single string. Drops C0
 * control chars (keeping TAB/LF), DEL, and zero-width chars by code point — no
 * control characters appear in this source file — then neutralizes
 * instruction-override lines.
 */
export function sanitizeForPrompt(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && code !== 0x09 && code !== 0x0a) continue; // C0 controls except TAB/LF
    if (code === 0x7f) continue; // DEL
    if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue; // zero-width
    out += ch;
  }
  return out.replace(INSTRUCTION_OVERRIDE, '$1[redacted]');
}

/**
 * Recursively apply `sanitizeForPrompt` to every string within a value,
 * preserving the original shape and type. Non-string primitives (numbers,
 * booleans, null, undefined) pass through untouched.
 *
 * Intended for plain JSON-shaped data (the pipeline's parsed JD / resume
 * objects); it does not special-case class instances, Maps, Sets, or Dates.
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeForPrompt(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = sanitizeDeep(v);
    }
    return out as T;
  }
  return value;
}
