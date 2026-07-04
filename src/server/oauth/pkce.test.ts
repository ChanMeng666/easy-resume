import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyChallenge, isValidCodeVerifier, isValidCodeChallenge } from './pkce';

/** Derive the correct S256 challenge for a verifier (what a compliant client sends). */
function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

const VALID_VERIFIER = 'a'.repeat(43); // shortest legal verifier, all-unreserved

describe('isValidCodeVerifier — RFC 7636 charset/length', () => {
  it('accepts 43 and 128 char unreserved strings', () => {
    expect(isValidCodeVerifier('a'.repeat(43))).toBe(true);
    expect(isValidCodeVerifier('a'.repeat(128))).toBe(true);
    expect(isValidCodeVerifier('Az0-._~'.repeat(7))).toBe(true); // 49 chars, all unreserved
  });

  it('rejects too-short (<43) and too-long (>128)', () => {
    expect(isValidCodeVerifier('a'.repeat(42))).toBe(false);
    expect(isValidCodeVerifier('a'.repeat(129))).toBe(false);
  });

  it('rejects reserved/invalid characters and non-strings', () => {
    expect(isValidCodeVerifier('a'.repeat(42) + '+')).toBe(false); // '+' not unreserved
    expect(isValidCodeVerifier('a'.repeat(42) + '/')).toBe(false);
    expect(isValidCodeVerifier('a'.repeat(42) + ' ')).toBe(false);
    expect(isValidCodeVerifier(12345 as unknown)).toBe(false);
    expect(isValidCodeVerifier(undefined as unknown)).toBe(false);
  });
});

describe('isValidCodeChallenge — shape', () => {
  it('accepts an S256 digest and full 43-128 unreserved range', () => {
    expect(isValidCodeChallenge(s256(VALID_VERIFIER))).toBe(true);
    expect(isValidCodeChallenge('a'.repeat(43))).toBe(true);
  });

  it('rejects empty, too-short, and non-strings', () => {
    expect(isValidCodeChallenge('')).toBe(false);
    expect(isValidCodeChallenge('a'.repeat(42))).toBe(false);
    expect(isValidCodeChallenge(null as unknown)).toBe(false);
  });
});

describe('verifyChallenge — S256 only', () => {
  it('passes for a correct verifier/challenge pair', () => {
    expect(verifyChallenge(VALID_VERIFIER, s256(VALID_VERIFIER))).toBe(true);
  });

  it('fails for a wrong verifier', () => {
    const otherVerifier = 'b'.repeat(43);
    expect(verifyChallenge(otherVerifier, s256(VALID_VERIFIER))).toBe(false);
  });

  it('rejects a "plain"-style challenge (challenge === verifier)', () => {
    // A plain-method client would send the verifier itself as the challenge; S256
    // verification must never accept that.
    expect(verifyChallenge(VALID_VERIFIER, VALID_VERIFIER)).toBe(false);
  });

  it('fails when the verifier is malformed regardless of challenge', () => {
    expect(verifyChallenge('short', s256('short'))).toBe(false);
    expect(verifyChallenge(VALID_VERIFIER, '')).toBe(false);
  });
});
