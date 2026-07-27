/**
 * Contract test for the AI SDK call shape the pipeline agents rely on.
 *
 * Every agent under src/lib/agent (jd-parser, background-parser,
 * matching-engine, resume-tailor, resume-reviser, cover-letter,
 * cover-letter-reviser) calls `generateObject` with the same option shape, and
 * each of them builds its own model from models.ts rather than taking one by
 * injection — so `pipeline.test.ts`'s DI fakes stub the agents out entirely and
 * no test ever exercises a real `generateObject` call.
 *
 * That left the single most load-bearing AI SDK surface uncovered: an `ai`
 * major could rename or drop one of these options and the whole suite would
 * still pass, with the break only surfacing as a runtime failure on a paid
 * generation. This test closes that gap using `ai/test`'s mock model, so it
 * costs no API calls.
 *
 * Keep the option list here in sync with the agents. If a future SDK major
 * renames something (v7 deprecated `experimental_telemetry` in favour of
 * `telemetry`, for instance), this is the test that should fail first.
 */

import { describe, it, expect } from 'vitest';
import { generateObject } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import type { LanguageModelV3GenerateResult } from '@ai-sdk/provider';
import { z } from 'zod';

/** A model that returns one fixed JSON payload, mimicking a structured reply. */
function fixedJsonModel(json: string): MockLanguageModelV3 {
  const result: LanguageModelV3GenerateResult = {
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    content: [{ type: 'text', text: json }],
    warnings: [],
  };
  return new MockLanguageModelV3({ doGenerate: async () => result });
}

describe('AI SDK generateObject contract', () => {
  it('accepts the option shape every pipeline agent passes', async () => {
    const { object } = await generateObject({
      model: fixedJsonModel('{"title":"Staff Engineer","seniority":"senior"}'),
      // Agents disable SDK-level retry so it cannot compound with the pipeline's
      // own bounded retry in src/server/core/step.ts.
      maxRetries: 0,
      schema: z.object({ title: z.string(), seniority: z.string() }),
      providerOptions: { openai: { strictJsonSchema: false } },
      experimental_telemetry: { isEnabled: false, functionId: 'sdk-contract-test' },
      prompt: 'parse this job description',
    });

    expect(object).toEqual({ title: 'Staff Engineer', seniority: 'senior' });
  });

  it('surfaces a schema mismatch rather than returning a malformed object', async () => {
    await expect(
      generateObject({
        model: fixedJsonModel('{"title":"Staff Engineer"}'),
        maxRetries: 0,
        schema: z.object({ title: z.string(), seniority: z.string() }),
        prompt: 'parse this job description',
      })
    ).rejects.toThrow();
  });
});
