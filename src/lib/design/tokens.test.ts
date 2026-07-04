import { describe, it, expect } from 'vitest';
import {
  ACCENT_PAIRS,
  DEFAULT_TOKENS,
  designTokensSchema,
  resolvePalette,
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
