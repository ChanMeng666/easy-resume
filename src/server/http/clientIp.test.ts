import { describe, it, expect } from 'vitest';
import { clientIp } from './clientIp';

/** Build a Request carrying the given headers. */
function reqWith(headers: Record<string, string>): Request {
  return new Request('https://example.com', { headers });
}

describe('clientIp', () => {
  it('prefers CF-Connecting-IP over X-Forwarded-For', () => {
    const req = reqWith({
      'cf-connecting-ip': '9.9.9.9',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
      'x-real-ip': '7.7.7.7',
    });
    expect(clientIp(req)).toBe('9.9.9.9');
  });

  it('returns the LAST X-Forwarded-For hop (ignores spoofed left-most entry)', () => {
    const req = reqWith({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(clientIp(req)).toBe('5.6.7.8');
  });

  it('handles a single-entry X-Forwarded-For', () => {
    const req = reqWith({ 'x-forwarded-for': '5.6.7.8' });
    expect(clientIp(req)).toBe('5.6.7.8');
  });

  it('trims whitespace and skips empty XFF segments', () => {
    const req = reqWith({ 'x-forwarded-for': '1.2.3.4,  , 5.6.7.8 ,' });
    expect(clientIp(req)).toBe('5.6.7.8');
  });

  it('falls back to X-Real-IP when no CF/XFF header', () => {
    const req = reqWith({ 'x-real-ip': '7.7.7.7' });
    expect(clientIp(req)).toBe('7.7.7.7');
  });

  it('returns "unknown" when no headers are present', () => {
    expect(clientIp(reqWith({}))).toBe('unknown');
  });
});
