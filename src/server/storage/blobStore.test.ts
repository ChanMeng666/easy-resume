import { describe, it, expect } from 'vitest';
import { getBlobStore, resumePdfKey, coverLetterPdfKey } from './blobStore';

/**
 * Pins the storage seam's defaults: stable keys and a safe no-op store when R2
 * is unconfigured (the env vars are absent in the test environment), so PDF
 * routes fall back to recompiling rather than erroring.
 */

describe('blob keys', () => {
  it('derive stable, namespaced keys per job', () => {
    expect(resumePdfKey('abc-123')).toBe('resumes/abc-123.pdf');
    expect(coverLetterPdfKey('abc-123')).toBe('cover-letters/abc-123.pdf');
  });
});

describe('getBlobStore (unconfigured)', () => {
  it('returns a disabled no-op store that never throws', async () => {
    const store = getBlobStore();
    expect(store.enabled).toBe(false);
    expect(await store.put('k', new Uint8Array([1]), 'application/pdf')).toBe(false);
    expect(await store.get('k')).toBeNull();
    expect(await store.delete('k')).toBe(false);
  });
});
