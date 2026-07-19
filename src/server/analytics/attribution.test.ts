import { describe, it, expect } from 'vitest';
import { sanitizeAttribution } from './attribution';

/**
 * sanitizeAttribution is the allowlist projection shared by the capture
 * (middleware) and the read (signup emit) paths. It must keep ONLY the known
 * UTM/ref keys, trim + length-bound values, and reject anything unusable — so
 * arbitrary cookie/query content can never widen what lands in analytics props.
 */

describe('sanitizeAttribution', () => {
  it('keeps only allowlisted keys and drops unknown ones', () => {
    expect(
      sanitizeAttribution({
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'launch',
        ref: 'partner',
        evil: 'drop-me',
        userId: 'u1',
      })
    ).toEqual({
      utm_source: 'newsletter',
      utm_medium: 'email',
      utm_campaign: 'launch',
      ref: 'partner',
    });
  });

  it('trims and length-bounds values', () => {
    const long = 'x'.repeat(500);
    const out = sanitizeAttribution({ utm_source: '  google  ', utm_campaign: long });
    expect(out?.utm_source).toBe('google');
    expect(out?.utm_campaign?.length).toBe(200);
  });

  it('ignores empty/whitespace and non-string values', () => {
    expect(sanitizeAttribution({ utm_source: '   ', utm_medium: 42, ref: null })).toBeUndefined();
  });

  it('returns undefined for non-objects', () => {
    expect(sanitizeAttribution(null)).toBeUndefined();
    expect(sanitizeAttribution('utm_source=x')).toBeUndefined();
    expect(sanitizeAttribution(undefined)).toBeUndefined();
  });
});
