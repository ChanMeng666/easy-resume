import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SUPPORTED_EFFORTS, RESOLVED_EFFORTS, type ReasoningEffort } from '@/lib/agent/models';

/**
 * Guard for the 2026-07-07 → 2026-07-31 outage: the EXTRACT tier defaulted to
 * reasoning effort "minimal", which the OpenAI Responses API rejects with a hard
 * 400 on every model this repo targets. Production sets no AI_* env vars, so it
 * ran that default and every `parse_jd` — step 1 of the generation pipeline —
 * failed for three weeks.
 *
 * Two things made it invisible, and both are why this file exists:
 *  - the provider forwards `reasoningEffort` verbatim and neither normalizes nor
 *    validates it, so a bad value is only ever a runtime 400; and
 *  - the project's standard cheap verification is a free refine, which reuses the
 *    parent job's persisted `parsedJD` and therefore never exercises `parse_jd`.
 *
 * Nothing offline can prove the API accepts a value. What it CAN prove is that
 * the shipped defaults stay inside the set we have actually observed to work.
 */

/** Verified against the live API on 2026-07-31 for every model this repo targets. */
const API_VERIFIED_EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh'] as const;

describe('reasoning effort allowlist', () => {
  it('offers only efforts the API accepts on every targeted model', () => {
    expect([...SUPPORTED_EFFORTS].sort()).toEqual([...API_VERIFIED_EFFORTS].sort());
  });

  it('does not offer "minimal" — the API 400s on it', () => {
    expect(SUPPORTED_EFFORTS as readonly string[]).not.toContain('minimal');
  });

  it('does not offer "max" — gpt-5.6 only, would 400 on the gpt-5.4/5.5 defaults', () => {
    expect(SUPPORTED_EFFORTS as readonly string[]).not.toContain('max');
  });

  it.each(Object.entries(RESOLVED_EFFORTS))(
    'resolves the %s tier to an API-accepted effort',
    (_tier, effort) => {
      expect(API_VERIFIED_EFFORTS as readonly string[]).toContain(effort);
    },
  );

  it('keeps ReasoningEffort in sync with the allowlist at the type level', () => {
    // Compile-time assertion: every allowlist member is a ReasoningEffort.
    const all: ReasoningEffort[] = [...SUPPORTED_EFFORTS];
    expect(all.length).toBe(SUPPORTED_EFFORTS.length);
  });
});

describe('reasoning effort env override', () => {
  // The tier constants bind at module load, so each case needs a fresh import.
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to the default when handed the value that caused the outage', async () => {
    vi.stubEnv('AI_REASONING_EFFORT_EXTRACT', 'minimal');
    const { RESOLVED_EFFORTS: resolved } = await import('@/lib/agent/models');
    expect(resolved.extract).toBe('none');
  });

  it('falls back when handed an effort only newer models support', async () => {
    vi.stubEnv('AI_REASONING_EFFORT_EXTRACT', 'max');
    const { RESOLVED_EFFORTS: resolved } = await import('@/lib/agent/models');
    expect(resolved.extract).toBe('none');
  });

  it('honors a supported override', async () => {
    vi.stubEnv('AI_REASONING_EFFORT_REASON', 'medium');
    const { RESOLVED_EFFORTS: resolved } = await import('@/lib/agent/models');
    expect(resolved.reason).toBe('medium');
  });
});
