import { describe, it, expect, vi } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { runEditTurn } from './editAgent';
import type { EditEvent } from './editAgent.types';
import type { ResumeData } from '@/lib/validation/schema';

// The edit agent has NO billing dependency by construction: EditAgentDeps carries
// only { model, render, onEvent, logger, maxSteps } — no meter / creditService —
// so a chat turn can never charge. These tests inject a fake model (no network)
// and a spy renderer (no real Typst) to pin the tool-loop behavior.

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

type Step = {
  content: Array<{ type: string; [k: string]: unknown }>;
  finishReason: string;
  usage: typeof USAGE;
  warnings: never[];
};

function toolCallStep(id: string, toolName: string, args: unknown): Step {
  return {
    content: [{ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(args) }],
    finishReason: 'tool-calls',
    usage: USAGE,
    warnings: [],
  };
}

function textStep(text: string): Step {
  return { content: [{ type: 'text', text }], finishReason: 'stop', usage: USAGE, warnings: [] };
}

/** A mock model that returns the scripted steps in order (clamping at the last). */
function scriptedModel(steps: Step[]): MockLanguageModelV3 {
  let i = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new MockLanguageModelV3({ doGenerate: async () => steps[Math.min(i++, steps.length - 1)] as any });
}

function makeResume(): ResumeData {
  return {
    basics: { name: 'Ada Lovelace', label: 'Engineer', summary: 'Original summary.', profiles: [] },
    education: [],
    skills: [{ name: 'Languages', keywords: ['TypeScript'] }],
    work: [
      {
        company: 'Acme',
        position: 'Engineer',
        startDate: 'Jan 2020',
        endDate: 'PRESENT',
        location: 'Remote',
        type: 'Full-time',
        highlights: ['Did a thing'],
      },
    ],
    projects: [],
    achievements: [],
    certifications: [],
  };
}

const baseArgs = (userMessage: string) => ({
  baseResume: makeResume(),
  templateId: 'two-column',
  history: [],
  userMessage,
});

describe('runEditTurn', () => {
  it('applies a tool edit, re-renders for free, and streams events', async () => {
    const model = scriptedModel([
      toolCallStep('c1', 'editSummary', { summary: 'Tightened, leadership-focused summary.' }),
      textStep('Done — I tightened your summary.'),
    ]);
    const events: EditEvent[] = [];
    const render = vi.fn((d: ResumeData, t: string) => `TYPST(${t}):${d.basics.summary ?? ''}`);

    const res = await runEditTurn(baseArgs('tighten my summary'), {
      model,
      render,
      onEvent: (e) => events.push(e),
    });

    expect(res.changed).toBe(true);
    expect(res.resumeData.basics.summary).toBe('Tightened, leadership-focused summary.');
    expect(res.assistantText).toMatch(/tightened/i);
    expect(res.toolCalls.map((c) => c.toolName)).toContain('editSummary');
    expect(res.typstCode).toContain('Tightened');

    // Streamed events in clean order: tool-call → tool-result → resume → text.
    expect(events.some((e) => e.type === 'tool-call' && e.toolName === 'editSummary')).toBe(true);
    expect(events.some((e) => e.type === 'tool-result' && e.toolName === 'editSummary')).toBe(true);
    expect(events.some((e) => e.type === 'resume')).toBe(true);
    expect(events.some((e) => e.type === 'text')).toBe(true);
    // Free re-render path was used (no LLM re-tailor, no compile here).
    expect(render).toHaveBeenCalled();
  });

  it('bounds the loop with maxSteps (no infinite tool-call ping-pong)', async () => {
    // A model that ALWAYS asks for another edit. Without the step cap this would
    // loop forever; stopWhen(stepCountIs(maxSteps)) must halt it.
    let n = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        n += 1;
        return {
          content: [{ type: 'tool-call', toolCallId: `c${n}`, toolName: 'editSummary', input: JSON.stringify({ summary: `v${n}` }) }],
          finishReason: 'tool-calls',
          usage: USAGE,
          warnings: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      },
    });

    const res = await runEditTurn(baseArgs('keep editing'), { model, render: (d) => `T:${d.basics.summary}`, maxSteps: 3 });

    expect(model.doGenerateCalls.length).toBe(3);
    expect(res.changed).toBe(true);
  });

  it('gracefully rejects an out-of-range edit without mutating the resume', async () => {
    const model = scriptedModel([
      toolCallStep('c1', 'editWorkHighlights', { index: 99, highlights: ['Led a team'] }),
      textStep('I could not find that work entry.'),
    ]);
    const events: EditEvent[] = [];

    const res = await runEditTurn(baseArgs('edit job 99'), {
      model,
      render: (d) => `T:${d.basics.summary}`,
      onEvent: (e) => events.push(e),
    });

    expect(res.changed).toBe(false);
    const toolResult = events.find((e) => e.type === 'tool-result');
    expect(String((toolResult as { toolResult: unknown }).toolResult)).toMatch(/out of range/i);
    // No resume snapshot emitted because nothing changed.
    expect(events.some((e) => e.type === 'resume')).toBe(false);
  });

  it('rejects a malformed tool input via the zod inputSchema and records the tool error', async () => {
    // editWorkHighlights requires a non-empty highlights array of strings; sending
    // a string must be rejected by the SDK before execute, leaving the resume intact
    // — and the resulting tool-error must be streamed/recorded, not silently dropped.
    const model = scriptedModel([
      toolCallStep('c1', 'editWorkHighlights', { index: 0, highlights: 'not-an-array' }),
      textStep('That request was invalid.'),
    ]);
    const events: EditEvent[] = [];
    const res = await runEditTurn(baseArgs('break it'), {
      model,
      render: (d) => `T:${d.basics.summary}`,
      onEvent: (e) => events.push(e),
    });
    expect(res.changed).toBe(false);
    expect(res.resumeData.work[0].highlights).toEqual(['Did a thing']);
    // The invalid call surfaced as a recorded tool result (the error), not dropped.
    expect(res.toolCalls.some((c) => c.toolName === 'editWorkHighlights')).toBe(true);
    expect(events.some((e) => e.type === 'tool-result' && e.toolName === 'editWorkHighlights')).toBe(true);
  });

  it('clamps an invalid maxSteps to the default cap (0/NaN cannot disable the loop bound)', async () => {
    // maxSteps: 0 would make stepCountIs(0) never match → unbounded loop without the
    // clamp. With the clamp it falls back to the default cap and still terminates.
    let n = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        n += 1;
        return {
          content: [{ type: 'tool-call', toolCallId: `c${n}`, toolName: 'editSummary', input: JSON.stringify({ summary: `v${n}` }) }],
          finishReason: 'tool-calls',
          usage: USAGE,
          warnings: [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      },
    });
    await runEditTurn(baseArgs('loop'), { model, render: (d) => `T:${d.basics.summary}`, maxSteps: 0 });
    // Default cap (8) applied, not unbounded.
    expect(model.doGenerateCalls.length).toBe(8);
  });
});
