/**
 * Tests for the model tiering layer.
 *
 * This file exists because models.ts is the one module where a mistake is both
 * silent and expensive. The SDK's model-id type ends in `(string & {})`, so a
 * typo'd id type-checks; the provider strips an unsupported `temperature`
 * client-side instead of erroring; and an omitted `reasoningEffort` just means
 * "whatever OpenAI defaults to". None of those show up in CI without an
 * assertion — the first signal would be a paid production generation.
 *
 * The tier values are resolved at MODULE LOAD, so the env-driven cases re-import
 * the module under `vi.resetModules()` + `vi.stubEnv()`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isReasoningModel, acceptsTemperature, type ReasoningEffort } from './models';

/** Every env var models.ts reads — cleared before each scenario so a developer's
 * local shell (or a CI variable) can never make these tests lie. */
const MODEL_ENV_VARS = [
  'AI_MODEL_EXTRACT',
  'AI_MODEL_REASON',
  'AI_MODEL_CHAT',
  'AI_REASONING_EFFORT_EXTRACT',
  'AI_REASONING_EFFORT_REASON',
  'AI_REASONING_EFFORT_CHAT',
  'AI_TEMPERATURE_EXTRACT',
  'AI_TEMPERATURE_WRITING',
] as const;

/** Re-import models.ts with a fully controlled environment. */
async function loadModels(env: Partial<Record<(typeof MODEL_ENV_VARS)[number], string>> = {}) {
  vi.resetModules();
  for (const name of MODEL_ENV_VARS) vi.stubEnv(name, undefined);
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import('./models');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('isReasoningModel', () => {
  const reasoning = [
    'gpt-5.6-luna',
    'gpt-5.6-terra',
    'gpt-5.6-sol',
    'gpt-5.6',
    'gpt-5.5-2026-04-23',
    'gpt-5.4-mini-2026-03-17',
    'gpt-5',
    'o1',
    'o3',
    'o4-mini',
    // Any gpt-<major >= 5> non-chat id counts, per the provider's own rule
    // (@ai-sdk/openai dist/index.js:53). Classifying this as NON-reasoning would
    // make us send a temperature that gets stripped and omit reasoningEffort —
    // i.e. silently fall back to OpenAI's default effort tier.
    'gpt-50-hypothetical',
  ];
  const classic = ['gpt-5-chat-latest', 'gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini'];

  it.each(reasoning)('treats %s as a reasoning model', (id) => {
    expect(isReasoningModel(id)).toBe(true);
  });

  it.each(classic)('treats %s as a classic chat model', (id) => {
    expect(isReasoningModel(id)).toBe(false);
  });
});

describe('acceptsTemperature', () => {
  // Only `effort: 'none'` on a model that supports non-reasoning parameters
  // (gpt major > 5, or major 5 with minor >= 1) actually puts temperature on the
  // wire — see openaiProviderContract.test.ts for the proof against the provider.
  const cases: Array<[string, ReasoningEffort, boolean]> = [
    // The two shipped tier configurations, first.
    ['gpt-5.5-2026-04-23', 'low', false], // REASON / CHAT
    ['gpt-5.4-mini-2026-03-17', 'none', true], // EXTRACT
    ['gpt-5.5-2026-04-23', 'none', true],
    ['gpt-5.6-terra', 'low', false],
    ['gpt-5.6-terra', 'none', true],
    ['gpt-5', 'none', false], // no minor version → pre-5.1 semantics
    ['gpt-4o', 'low', true], // not a reasoning model at all
    ['o3', 'none', false], // o-series never supports it
  ];

  it.each(cases)('acceptsTemperature(%s, %s) === %s', (id, effort, expected) => {
    expect(acceptsTemperature(id, effort)).toBe(expected);
  });
});

describe('tier defaults', () => {
  it('pins the default model id of every tier', async () => {
    // THE typo guard. `openai('gpt-5.5-2026-04-32')` type-checks fine; only these
    // assertions fail. Read back off the constructed model instance so the id is
    // verified where it actually lands, not just where it was declared.
    // These are also the outcome of the 2026-07 A/B that DECLINED gpt-5.6 — see
    // the models.ts header before changing them.
    const m = await loadModels();
    const idOf = (model: unknown) => (model as { modelId: string }).modelId;

    expect(idOf(m.extractModel)).toBe('gpt-5.4-mini-2026-03-17');
    expect(idOf(m.reasonModel)).toBe('gpt-5.5-2026-04-23');
    // CHAT shares REASON's model on purpose; the tier exists for its effort.
    expect(idOf(m.chatModel)).toBe('gpt-5.5-2026-04-23');
    expect(m.EXTRACT_TIER_FINGERPRINT).toBe('gpt-5.4-mini-2026-03-17@none');
    expect(m.reasonReasoning()).toEqual({ reasoningEffort: 'low' });
    expect(m.chatReasoning()).toEqual({ reasoningEffort: 'low' });
    expect(m.extractReasoning()).toEqual({ reasoningEffort: 'none' });
  });

  it('keeps every default effort inside the set the API actually accepts', async () => {
    // The single offline defense against the 4711ad7 class of outage: an effort
    // the model rejects is a hard 400 on every call of that tier, and nothing
    // upstream (types, SDK, lint, build) catches it. This is the set the gpt-5.4/
    // 5.5 snapshots we run actually accept — `minimal` is accepted by nothing, and
    // `max` only by gpt-5.6, which the A/B declined.
    const API_SUPPORTED = ['none', 'low', 'medium', 'high', 'xhigh'];
    const m = await loadModels();

    for (const effort of [
      m.extractReasoning().reasoningEffort,
      m.reasonReasoning().reasoningEffort,
      m.chatReasoning().reasoningEffort,
    ]) {
      expect(API_SUPPORTED).toContain(effort);
    }
  });

  it('sends the temperature on EXTRACT (effort none) and omits it on the thinking tiers', async () => {
    // EXTRACT runs at `none` on gpt-5.4-mini, which is exactly the case where a
    // gpt-5.1+ model still honors temperature — so EXTRACT_TEMPERATURE = 0 really
    // applies and JD parsing stays reproducible for jdParseCache. REASON/CHAT
    // think, so theirs is stripped and must not be sent.
    const m = await loadModels();
    expect(m.extractSampling(0)).toEqual({ temperature: 0 });
    expect(m.reasonSampling(0.5)).toEqual({});
    expect(m.chatSampling(0.5)).toEqual({});
  });

  it('falls back to the default id when the env var is set but EMPTY', async () => {
    // A deploy pipeline that references an undefined variable injects `FOO=`.
    // With `??` instead of `||` that empty string would become the model id.
    const m = await loadModels({ AI_MODEL_EXTRACT: '' });
    expect(m.EXTRACT_TIER_FINGERPRINT).toBe('gpt-5.4-mini-2026-03-17@none');
  });

  it('flips to classic-model behavior when pointed at a non-reasoning model', async () => {
    const m = await loadModels({ AI_MODEL_EXTRACT: 'gpt-4o' });
    expect(m.extractSampling(0)).toEqual({ temperature: 0 });
    expect(m.extractReasoning()).toEqual({});
  });
});

describe('EXTRACT_TIER_FINGERPRINT', () => {
  it('changes when the model id changes', async () => {
    const base = await loadModels();
    const other = await loadModels({ AI_MODEL_EXTRACT: 'gpt-5.5-2026-04-23' });
    expect(other.EXTRACT_TIER_FINGERPRINT).not.toBe(base.EXTRACT_TIER_FINGERPRINT);
  });

  it('changes when only the reasoning effort changes', async () => {
    // The whole point of salting the JD cache with the fingerprint rather than the
    // bare model id: retuning effort must not serve pre-change parses for an hour.
    const base = await loadModels();
    const other = await loadModels({ AI_REASONING_EFFORT_EXTRACT: 'high' });
    expect(other.EXTRACT_TIER_FINGERPRINT).not.toBe(base.EXTRACT_TIER_FINGERPRINT);
  });
});

describe('TIER_FINGERPRINTS', () => {
  // This is what instrumentation.ts logs at boot. It is the only external signal
  // of which models a deployment resolved to, so an env override that silently
  // failed to apply would otherwise be indistinguishable from one that worked.
  it('reports every tier as `<model id>@<effort>`', async () => {
    const m = await loadModels();
    expect(m.TIER_FINGERPRINTS).toEqual({
      extract: 'gpt-5.4-mini-2026-03-17@none',
      reason: 'gpt-5.5-2026-04-23@low',
      chat: 'gpt-5.5-2026-04-23@low',
    });
  });

  it('reflects an env override, so the boot log proves the override applied', async () => {
    const m = await loadModels({
      AI_MODEL_REASON: 'gpt-5.6-terra',
      AI_REASONING_EFFORT_REASON: 'medium',
    });
    expect(m.TIER_FINGERPRINTS.reason).toBe('gpt-5.6-terra@medium');
    // Untouched tiers must not move — a rollback has to be surgical.
    expect(m.TIER_FINGERPRINTS.extract).toBe('gpt-5.4-mini-2026-03-17@none');
  });
});

describe('env parsing', () => {
  it('normalizes a padded / uppercased effort', async () => {
    const m = await loadModels({ AI_REASONING_EFFORT_REASON: ' HIGH ' });
    expect(m.reasonReasoning()).toEqual({ reasoningEffort: 'high' });
  });

  // Both of these are 400s on the models we actually run, so neither may be
  // reachable through configuration. `minimal` is not a hypothetical — it was the
  // shipped extract-tier default and the API rejects it on gpt-5.4-mini / gpt-5.5
  // / gpt-5.6-luna / gpt-5.6-terra alike. `max` exists only on gpt-5.6, which the
  // 2026-07 A/B declined; it would 400 on today's gpt-5.4/5.5 defaults.
  it.each(['minimal', 'max'])('rejects %o, which the default models 400 on', async (raw) => {
    const m = await loadModels({ AI_REASONING_EFFORT_REASON: raw });
    expect(m.reasonReasoning()).toEqual({ reasoningEffort: 'low' });
  });

  it.each(['turbo', ''])('falls back to the default effort for %o', async (raw) => {
    const m = await loadModels({ AI_REASONING_EFFORT_REASON: raw });
    expect(m.reasonReasoning()).toEqual({ reasoningEffort: 'low' });
  });

  it('reads a valid temperature, including the falsy "0"', async () => {
    const m = await loadModels({ AI_TEMPERATURE_WRITING: '0' });
    expect(m.WRITING_TEMPERATURE).toBe(0);
  });

  it.each(['abc', ''])('falls back to the default temperature for %o', async (raw) => {
    const m = await loadModels({ AI_TEMPERATURE_WRITING: raw });
    expect(m.WRITING_TEMPERATURE).toBe(0.5);
  });
});
