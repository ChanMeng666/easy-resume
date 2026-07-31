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
 * The same blind spot covers the conversational edit agent, which is the only
 * `streamText` + tool-loop call in the codebase and reads three literal part
 * types off `onStepFinish` — so that shape is pinned here too.
 *
 * Keep the option list here in sync with the agents. If a future SDK major
 * renames something (v7 deprecated `experimental_telemetry` in favour of
 * `telemetry`, for instance), this is the test that should fail first.
 */

import { describe, it, expect } from 'vitest';
import { generateObject, streamText, stepCountIs, tool } from 'ai';
import { MockLanguageModelV3, convertArrayToReadableStream } from 'ai/test';
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
      // Both openai provider options the agents set: strict-mode opt-out (our
      // schemas use numeric bounds / optional fields it rejects) and the tier's
      // reasoning effort.
      providerOptions: { openai: { strictJsonSchema: false, reasoningEffort: 'low' } },
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

const STREAM_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

describe('AI SDK streamText tool-loop contract', () => {
  it('accepts the option shape the edit agent passes and exposes the three tool part types', async () => {
    // Two calls in one step: one tool succeeds, one throws. In v6/v7 a thrown or
    // invalid tool surfaces as a 'tool-error' content part and is ABSENT from
    // step.toolResults — editAgent.ts iterates step.content precisely so neither
    // is dropped. This pins all three literals it switches on.
    const steps = [
      [
        { type: 'stream-start', warnings: [] },
        { type: 'tool-call', toolCallId: 'c1', toolName: 'ok', input: '{"value":"x"}' },
        { type: 'tool-call', toolCallId: 'c2', toolName: 'boom', input: '{"reason":"why"}' },
        { type: 'finish', finishReason: 'tool-calls', usage: STREAM_USAGE },
      ],
      [
        { type: 'stream-start', warnings: [] },
        { type: 'text-start', id: 't1' },
        { type: 'text-delta', id: 't1', delta: 'all ' },
        { type: 'text-delta', id: 't1', delta: 'done' },
        { type: 'text-end', id: 't1' },
        { type: 'finish', finishReason: 'stop', usage: STREAM_USAGE },
      ],
    ];
    let call = 0;
    const model = new MockLanguageModelV3({
      doStream: async () => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stream: convertArrayToReadableStream(steps[Math.min(call++, steps.length - 1)] as any),
      }),
    });

    const seenPartTypes = new Set<string>();
    const deltas: string[] = [];
    let streamError: unknown;

    const result = streamText({
      model,
      system: 'you edit resumes',
      messages: [{ role: 'user', content: 'tighten my summary' }],
      tools: {
        ok: tool({
          description: 'succeeds',
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => ({ echoed: value }),
        }),
        boom: tool({
          description: 'throws',
          inputSchema: z.object({ reason: z.string() }),
          // Annotated: a body that only throws infers `never`, which the tool
          // helper cannot use as an output type.
          execute: async (): Promise<{ ok: boolean }> => {
            throw new Error('tool exploded');
          },
        }),
      },
      stopWhen: stepCountIs(2),
      maxRetries: 0,
      providerOptions: { openai: { reasoningEffort: 'low' } },
      abortSignal: new AbortController().signal,
      experimental_telemetry: { isEnabled: false, functionId: 'sdk-contract-test-stream' },
      onError: ({ error }) => {
        streamError = streamError ?? error;
      },
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta' && chunk.text) deltas.push(chunk.text);
      },
      onStepFinish: (step) => {
        for (const part of step.content) seenPartTypes.add(part.type);
      },
    });

    const text = await result.text;

    expect(streamError).toBeUndefined();
    expect(text).toBe('all done');
    // Token-level streaming still arrives as multiple deltas.
    expect(deltas.length).toBeGreaterThan(1);
    // The three literals editAgent.ts branches on.
    expect(seenPartTypes).toContain('tool-call');
    expect(seenPartTypes).toContain('tool-result');
    expect(seenPartTypes).toContain('tool-error');
    // The step cap really stopped the loop.
    expect(model.doStreamCalls.length).toBe(2);
  });
});
