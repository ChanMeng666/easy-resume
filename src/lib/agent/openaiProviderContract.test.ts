/**
 * Contract test for what the OpenAI provider actually puts ON THE WIRE.
 *
 * models.ts encodes three provider behaviors that are invisible from our side:
 *  1. `reasoningEffort` becomes a `reasoning: { effort }` field — but ONLY for
 *     reasoning models.
 *  2. `temperature` is stripped client-side on a reasoning model unless the effort
 *     is exactly 'none' and the model supports non-reasoning parameters. It is
 *     never an API error, so a wrong assumption is silent.
 *  3. Passing NO reasoning effort does not mean "default effort" in our code — it
 *     means the request carries no reasoning field at all and OpenAI picks the
 *     tier. (That was the edit agent's behavior before it joined the CHAT tier.)
 *
 * All three are asserted by intercepting the outbound request with a fake
 * `fetch`, so this costs zero API calls. If a provider upgrade changes any of
 * them, this file fails before production does.
 */

import { describe, it, expect } from 'vitest';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

/** Minimal well-formed OpenAI Responses API payload (one assistant message). */
const RESPONSE_BODY = {
  id: 'resp_test',
  created_at: 0,
  model: 'test',
  output: [
    {
      type: 'message',
      role: 'assistant',
      id: 'msg_test',
      content: [{ type: 'output_text', text: 'ok', annotations: [] }],
    },
  ],
  usage: { input_tokens: 1, output_tokens: 1 },
};

interface Captured {
  body: Record<string, unknown>;
}

/** A provider whose fetch records the request body instead of making one. */
function capturingProvider(captured: Captured) {
  return createOpenAI({
    apiKey: 'test-key',
    fetch: (async (_input: unknown, init?: { body?: unknown }) => {
      captured.body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify(RESPONSE_BODY), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch,
  });
}

async function callWith(options: {
  modelId: string;
  temperature?: number;
  reasoningEffort?: string;
}) {
  const captured: Captured = { body: {} };
  const provider = capturingProvider(captured);
  const result = await generateText({
    model: provider(options.modelId),
    maxRetries: 0,
    prompt: 'say ok',
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    providerOptions: {
      openai: options.reasoningEffort === undefined ? {} : { reasoningEffort: options.reasoningEffort },
    },
  });
  return { body: captured.body, warnings: result.warnings };
}

describe('OpenAI provider request contract', () => {
  it('sends reasoning.effort and DROPS temperature on a reasoning model at low effort', async () => {
    const { body, warnings } = await callWith({
      modelId: 'gpt-5.5-2026-04-23',
      temperature: 0.42,
      reasoningEffort: 'low',
    });

    expect((body.reasoning as { effort?: string } | undefined)?.effort).toBe('low');
    // Silently stripped, not rejected — the reason models.ts never sends it.
    expect(body.temperature).toBeUndefined();
    expect(warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unsupported', feature: 'temperature' })])
    );
  });

  it("actually sends temperature on a gpt-5.1+ reasoning model at effort 'none'", async () => {
    const { body } = await callWith({
      modelId: 'gpt-5.5-2026-04-23',
      temperature: 0.42,
      reasoningEffort: 'none',
    });

    expect(body.temperature).toBe(0.42);
    expect((body.reasoning as { effort?: string } | undefined)?.effort).toBe('none');
  });

  it('omits the reasoning field entirely when no effort is passed', async () => {
    // Not a neutral default: with no reasoning field OpenAI applies its own
    // default effort tier, which is what the edit agent silently did before.
    const { body } = await callWith({ modelId: 'gpt-5.5-2026-04-23' });

    expect(body.reasoning).toBeUndefined();
  });

  it('warns instead of erroring when reasoningEffort is sent to a classic model', async () => {
    const { body, warnings } = await callWith({ modelId: 'gpt-4o', reasoningEffort: 'low' });

    expect(body.reasoning).toBeUndefined();
    expect(warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'unsupported', feature: 'reasoningEffort' })])
    );
  });
});
