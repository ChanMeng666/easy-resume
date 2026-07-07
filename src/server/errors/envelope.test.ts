import { describe, it, expect } from 'vitest';
import { toErrorEnvelope } from './envelope';
import { PipelineStepError, ValidationError, InsufficientCreditsError } from './AppError';

describe('toErrorEnvelope', () => {
  it('surfaces the underlying cause chain of a PipelineStepError in details.cause', () => {
    // Simulate the real failure: parseBackground throws an OpenAI-style API error
    // that makeStepRunner wraps in a PipelineStepError (cause = original error).
    const apiError = Object.assign(new Error('401 Incorrect API key provided'), {
      name: 'AI_APICallError',
      statusCode: 401,
      isRetryable: false,
    });
    const stepError = new PipelineStepError(
      'parse_background',
      'Pipeline step "parse_background" failed',
      apiError
    );

    const envelope = toErrorEnvelope(stepError, 'req-123');

    expect(envelope.error.code).toBe('PIPELINE_STEP_FAILED');
    expect(envelope.error.step).toBe('parse_background');
    expect(envelope.error.requestId).toBe('req-123');
    // The real reason must travel to the caller, not just the generic wrapper.
    const cause = envelope.error.details?.cause as Record<string, unknown>;
    expect(cause).toBeDefined();
    expect(cause.name).toBe('AI_APICallError');
    expect(cause.message).toBe('401 Incorrect API key provided');
    expect(cause.statusCode).toBe(401);
  });

  it('recursively unwinds a nested cause chain', () => {
    const root = new Error('ECONNREFUSED');
    const mid = new Error('fetch failed', { cause: root });
    const stepError = new PipelineStepError('parse_jd', 'wrapper', mid);

    const envelope = toErrorEnvelope(stepError);
    const cause = envelope.error.details?.cause as Record<string, unknown>;
    expect(cause.message).toBe('fetch failed');
    expect((cause.cause as Record<string, unknown>).message).toBe('ECONNREFUSED');
  });

  it('leaves details undefined when there is no cause and no details', () => {
    const envelope = toErrorEnvelope(new InsufficientCreditsError());
    expect(envelope.error.code).toBe('INSUFFICIENT_CREDITS');
    expect(envelope.error.details).toBeUndefined();
  });

  it('preserves existing details while adding the cause', () => {
    const err = new ValidationError('bad input', { issues: ['field required'] });
    const envelope = toErrorEnvelope(err);
    expect(envelope.error.details?.issues).toEqual(['field required']);
  });
});
