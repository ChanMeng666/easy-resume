import { describe, it, expect, vi } from 'vitest';

// store.ts top-level-imports the Neon client, whose module body runs
// `neon(process.env.DATABASE_URL!)`. Stub it so importing the store for its pure
// helper never needs a real connection string (same approach as reserveJob.test).
vi.mock('@/lib/db/client', () => ({ db: {} }));

import { resolveAppliedAt } from './store';
import {
  applicationCreateSchema,
  applicationUpdateSchema,
  APPLICATION_STATUSES,
} from '@/lib/validation/schema';

// The store's DB/owner-check paths are exercised by integration runs; here we
// pin the pure status-transition logic and the request validation, mirroring the
// persist.test.ts approach (test pure helpers, not the DB).

const NOW = new Date('2026-06-28T12:00:00.000Z');

describe('resolveAppliedAt — applied_at stamping', () => {
  it('stamps applied_at the first time status becomes "applied"', () => {
    expect(resolveAppliedAt('applied', { status: 'draft', appliedAt: null }, NOW)).toEqual(NOW);
  });

  it('preserves the original stamp when already applied before', () => {
    const original = new Date('2026-06-01T00:00:00.000Z');
    // Moving applied -> interview keeps the original stamp (no overwrite).
    expect(
      resolveAppliedAt('interview', { status: 'applied', appliedAt: original }, NOW)
    ).toBeUndefined();
  });

  it('keeps an existing stamp if re-entering applied', () => {
    const original = new Date('2026-06-01T00:00:00.000Z');
    expect(
      resolveAppliedAt('applied', { status: 'interview', appliedAt: original }, NOW)
    ).toEqual(original);
  });

  it('does not stamp for non-applied transitions from a never-applied state', () => {
    expect(resolveAppliedAt('interview', { status: 'draft', appliedAt: null }, NOW)).toBeUndefined();
    expect(resolveAppliedAt('rejected', { status: 'draft', appliedAt: null }, NOW)).toBeUndefined();
  });

  it('returns undefined (no change) when status is unchanged or absent', () => {
    expect(resolveAppliedAt(undefined, { status: 'draft', appliedAt: null }, NOW)).toBeUndefined();
    expect(resolveAppliedAt('draft', { status: 'draft', appliedAt: null }, NOW)).toBeUndefined();
  });
});

describe('applicationCreateSchema', () => {
  it('accepts a minimal valid payload and defaults nothing it should not', () => {
    const r = applicationCreateSchema.safeParse({ company: 'Acme', position: 'SWE' });
    expect(r.success).toBe(true);
  });

  it('accepts an optional status, notes, and generationJobId', () => {
    const r = applicationCreateSchema.safeParse({
      company: 'Acme',
      position: 'SWE',
      status: 'applied',
      notes: 'Referred by a friend',
      generationJobId: '11111111-1111-4111-8111-111111111111',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a missing company/position', () => {
    expect(applicationCreateSchema.safeParse({ position: 'SWE' }).success).toBe(false);
    expect(applicationCreateSchema.safeParse({ company: 'Acme' }).success).toBe(false);
  });

  it('rejects an unknown status and a non-uuid generationJobId', () => {
    expect(
      applicationCreateSchema.safeParse({ company: 'A', position: 'B', status: 'ghosted' }).success
    ).toBe(false);
    expect(
      applicationCreateSchema.safeParse({ company: 'A', position: 'B', generationJobId: 'nope' })
        .success
    ).toBe(false);
  });
});

describe('applicationUpdateSchema', () => {
  it('allows every status in the state machine', () => {
    for (const status of APPLICATION_STATUSES) {
      expect(applicationUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('accepts an empty notes string (clearing notes)', () => {
    expect(applicationUpdateSchema.safeParse({ notes: '' }).success).toBe(true);
  });

  it('accepts an empty object (route enforces at-least-one separately)', () => {
    expect(applicationUpdateSchema.safeParse({}).success).toBe(true);
  });
});
