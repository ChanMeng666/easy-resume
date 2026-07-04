import { describe, it, expect } from 'vitest';
import { validateRedirectUri, isValidRegistrationRedirectUri } from './redirect';

describe('validateRedirectUri — exact match only', () => {
  const registered = ['https://app.example.com/callback'];

  it('accepts a byte-identical URI', () => {
    expect(validateRedirectUri(registered, 'https://app.example.com/callback')).toBe(true);
  });

  it('rejects a subpath', () => {
    expect(validateRedirectUri(registered, 'https://app.example.com/callback/extra')).toBe(false);
  });

  it('rejects a host swap', () => {
    expect(validateRedirectUri(registered, 'https://evil.example.com/callback')).toBe(false);
    expect(validateRedirectUri(registered, 'https://app.example.com.evil.com/callback')).toBe(false);
  });

  it('rejects a scheme swap', () => {
    expect(validateRedirectUri(registered, 'http://app.example.com/callback')).toBe(false);
  });

  it('rejects an added query string', () => {
    expect(validateRedirectUri(registered, 'https://app.example.com/callback?x=1')).toBe(false);
  });

  it('rejects a trailing-slash difference', () => {
    expect(validateRedirectUri(registered, 'https://app.example.com/callback/')).toBe(false);
  });

  it('rejects empty supplied / non-array registered', () => {
    expect(validateRedirectUri(registered, '')).toBe(false);
    expect(validateRedirectUri(undefined as unknown as string[], 'https://app.example.com/callback')).toBe(false);
  });

  it('matches against any exact entry in a multi-URI list', () => {
    const many = ['https://a.example.com/cb', 'https://b.example.com/cb'];
    expect(validateRedirectUri(many, 'https://b.example.com/cb')).toBe(true);
    expect(validateRedirectUri(many, 'https://c.example.com/cb')).toBe(false);
  });
});

describe('isValidRegistrationRedirectUri — registration-time rules', () => {
  it('accepts https URIs', () => {
    expect(isValidRegistrationRedirectUri('https://app.example.com/callback')).toBe(true);
  });

  it('accepts http ONLY on loopback hosts', () => {
    expect(isValidRegistrationRedirectUri('http://localhost:1455/callback')).toBe(true);
    expect(isValidRegistrationRedirectUri('http://127.0.0.1:8080/cb')).toBe(true);
    expect(isValidRegistrationRedirectUri('http://[::1]/cb')).toBe(true);
  });

  it('rejects http on non-loopback hosts', () => {
    expect(isValidRegistrationRedirectUri('http://app.example.com/callback')).toBe(false);
  });

  it('rejects URIs with a fragment', () => {
    expect(isValidRegistrationRedirectUri('https://app.example.com/callback#frag')).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isValidRegistrationRedirectUri('ftp://app.example.com/cb')).toBe(false);
    expect(isValidRegistrationRedirectUri('javascript:alert(1)')).toBe(false);
  });

  it('rejects unparseable / empty / non-string values', () => {
    expect(isValidRegistrationRedirectUri('not a url')).toBe(false);
    expect(isValidRegistrationRedirectUri('')).toBe(false);
    expect(isValidRegistrationRedirectUri(42 as unknown)).toBe(false);
  });
});
