import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from './logger';

// The logger is the only window into production failures; a wrapped error that
// drops its cause chain makes root causes (401/429/schema mismatch under a
// PipelineStepError) unrecoverable from logs. Pin the chain serialization.

afterEach(() => vi.restoreAllMocks());

function lastErrorLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);
  return JSON.parse(String(call?.[0]));
}

describe('logger error serialization', () => {
  it('follows the cause chain', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = new Error('OpenAI says 401');
    const wrapped = new Error('Pipeline step "parse_jd" failed', { cause: root });

    createLogger({}).error('generate.failed', {}, wrapped);

    const line = lastErrorLine(spy);
    const err = line.error as { message: string; cause?: { message: string } };
    expect(err.message).toContain('parse_jd');
    expect(err.cause?.message).toBe('OpenAI says 401');
  });

  it('bounds the chain depth (no infinite recursion on cyclic causes)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    // Cycle: a.cause -> b
    (a as Error & { cause?: unknown }).cause = b;

    createLogger({}).error('boom', {}, b);

    const line = lastErrorLine(spy);
    // Serialization terminated (JSON.stringify succeeded) — depth cap held.
    expect(JSON.stringify(line).length).toBeLessThan(10_000);
  });
});
