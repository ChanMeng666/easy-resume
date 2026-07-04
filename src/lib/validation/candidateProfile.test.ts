import { describe, it, expect } from 'vitest';
import {
  candidateProfileInputSchema,
  candidateProfileUpdateSchema,
} from './schema';

/**
 * Pins the optional voiceSample field on the profile create/update payloads:
 * absent is fine, present is trimmed, and an over-long sample is rejected.
 */
describe('candidateProfile voiceSample validation', () => {
  it('accepts a payload without a voiceSample', () => {
    const parsed = candidateProfileInputSchema.parse({ rawBackground: '8 years in payments.' });
    expect(parsed.voiceSample).toBeUndefined();
  });

  it('trims the voiceSample', () => {
    const parsed = candidateProfileInputSchema.parse({
      rawBackground: '8 years in payments.',
      voiceSample: '   my writing voice   ',
    });
    expect(parsed.voiceSample).toBe('my writing voice');
  });

  it('accepts a 4000-char voiceSample but rejects 4001', () => {
    const base = { rawBackground: '8 years in payments.' };
    expect(() =>
      candidateProfileInputSchema.parse({ ...base, voiceSample: 'a'.repeat(4000) })
    ).not.toThrow();
    expect(() =>
      candidateProfileInputSchema.parse({ ...base, voiceSample: 'a'.repeat(4001) })
    ).toThrow();
  });

  it('allows voiceSample on the update payload too', () => {
    const parsed = candidateProfileUpdateSchema.parse({ voiceSample: 'updated voice' });
    expect(parsed.voiceSample).toBe('updated voice');
  });
});
