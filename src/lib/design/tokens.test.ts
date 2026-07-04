import { describe, it, expect } from 'vitest';
import {
  ACCENT_PAIRS,
  DEFAULT_TOKENS,
  designTokensSchema,
  resolvePalette,
  resolveSpacing,
  emGap,
  type DesignTokens,
} from './tokens';

describe('design tokens', () => {
  it('slate reproduces the historical two-column default hexes exactly', () => {
    expect(ACCENT_PAIRS.slate).toEqual({ primary: '#0E5484', accent: '#2E86AB' });
  });

  it('DEFAULT_TOKENS is slate + comfortable', () => {
    expect(DEFAULT_TOKENS).toEqual({ palette: 'slate', density: 'comfortable' });
  });

  it('resolvePalette returns the pair for the selected palette', () => {
    expect(resolvePalette({ palette: 'indigo', density: 'comfortable' })).toEqual(
      ACCENT_PAIRS.indigo
    );
  });

  it('resolvePalette falls back to slate for an unknown palette', () => {
    const bad = { palette: 'neon' as unknown, density: 'comfortable' } as DesignTokens;
    expect(resolvePalette(bad)).toEqual(ACCENT_PAIRS.slate);
  });

  it('schema defaults both fields when absent', () => {
    expect(designTokensSchema.parse({})).toEqual(DEFAULT_TOKENS);
  });

  it('schema defaults density but keeps a supplied palette', () => {
    expect(designTokensSchema.parse({ palette: 'emerald' })).toEqual({
      palette: 'emerald',
      density: 'comfortable',
    });
  });

  it('schema rejects an out-of-set palette', () => {
    expect(designTokensSchema.safeParse({ palette: 'chartreuse' }).success).toBe(false);
  });

  it('every ACCENT_PAIRS entry is a valid #RRGGBB pair', () => {
    for (const pair of Object.values(ACCENT_PAIRS)) {
      expect(pair.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(pair.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('spacing resolver', () => {
  it('resolveSpacing maps comfortable → 1 and compact → 0.8', () => {
    expect(resolveSpacing({ palette: 'slate', density: 'comfortable' })).toEqual({ scale: 1 });
    expect(resolveSpacing({ palette: 'slate', density: 'compact' })).toEqual({ scale: 0.8 });
  });

  it('emGap emits the base literal verbatim at comfortable (byte-compat)', () => {
    const sp = resolveSpacing(DEFAULT_TOKENS);
    expect(emGap(0.8, sp)).toBe('0.8em');
    expect(emGap(0.4, sp)).toBe('0.4em');
    expect(emGap(1, sp)).toBe('1em');
    expect(emGap(0.15, sp)).toBe('0.15em');
  });

  it('emGap scales and rounds to two decimals at compact', () => {
    const sp: ReturnType<typeof resolveSpacing> = { scale: 0.8 };
    expect(emGap(0.8, sp)).toBe('0.64em'); // 0.8 * 0.8 = 0.64
    expect(emGap(0.5, sp)).toBe('0.4em'); //  0.5 * 0.8 = 0.40 → 0.4
    expect(emGap(0.3, sp)).toBe('0.24em');
    expect(emGap(0.15, sp)).toBe('0.12em');
    expect(emGap(1, sp)).toBe('0.8em');
    expect(emGap(0.6, sp)).toBe('0.48em');
  });

  it('emGap rounds a repeating product to two decimals', () => {
    // 0.55 * 0.8 = 0.44 exactly; use a value that would otherwise trail digits.
    expect(emGap(0.35, { scale: 0.8 })).toBe('0.28em');
    // 0.8 factor keeps two-decimal results, but guard the rounding contract:
    expect(emGap(0.125, { scale: 0.8 })).toBe('0.1em'); // 0.1 exactly
  });
});
