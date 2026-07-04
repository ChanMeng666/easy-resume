import { describe, it, expect, vi } from 'vitest';
import { VitexClient, ApiError, PollTimeoutError } from './client.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A recording fetch that returns queued Responses in order. */
function makeFetch(responses: Response[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('no more queued responses');
    return next;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function headerOf(init: RequestInit, name: string): string | null {
  const h = init.headers as Record<string, string> | undefined;
  if (!h) return null;
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? h[key]! : null;
}

function client(fetchImpl: typeof fetch) {
  return new VitexClient({ baseUrl: 'https://api.test', apiKey: 'vitex_p_secret', fetch: fetchImpl });
}

describe('VitexClient auth + idempotency headers', () => {
  it('attaches a Bearer token on every request', async () => {
    const { fetchImpl, calls } = makeFetch([jsonResponse(200, { id: 'j1', status: 'queued' })]);
    await client(fetchImpl).getJob('j1');
    expect(headerOf(calls[0]!.init, 'authorization')).toBe('Bearer vitex_p_secret');
  });

  it('sends a UUID Idempotency-Key on createResume', async () => {
    const { fetchImpl, calls } = makeFetch([jsonResponse(202, { id: 'j1', status: 'queued' })]);
    await client(fetchImpl).createResume({ jobDescription: 'JD', background: 'BG' });
    const key = headerOf(calls[0]!.init, 'idempotency-key');
    expect(key).toMatch(UUID_RE);
  });

  it('sends a UUID Idempotency-Key on refine', async () => {
    const { fetchImpl, calls } = makeFetch([jsonResponse(202, { id: 'j2', status: 'queued' })]);
    await client(fetchImpl).refine('parent', 'tighten it', 'both');
    const key = headerOf(calls[0]!.init, 'idempotency-key');
    expect(key).toMatch(UUID_RE);
  });

  it('does NOT send an Idempotency-Key on GETs', async () => {
    const { fetchImpl, calls } = makeFetch([
      jsonResponse(200, { id: 'j1', status: 'succeeded' }),
      jsonResponse(200, { items: [] }),
    ]);
    const c = client(fetchImpl);
    await c.getJob('j1');
    await c.listProfiles();
    expect(headerOf(calls[0]!.init, 'idempotency-key')).toBeNull();
    expect(headerOf(calls[1]!.init, 'idempotency-key')).toBeNull();
  });

  it('generate and refine use distinct idempotency keys', async () => {
    const { fetchImpl, calls } = makeFetch([
      jsonResponse(202, { id: 'a', status: 'queued' }),
      jsonResponse(202, { id: 'b', status: 'queued' }),
    ]);
    const c = client(fetchImpl);
    await c.createResume({ jobDescription: 'JD', background: 'BG' });
    await c.refine('a', 'fb');
    const k1 = headerOf(calls[0]!.init, 'idempotency-key');
    const k2 = headerOf(calls[1]!.init, 'idempotency-key');
    expect(k1).not.toBe(k2);
  });

  it('serializes the create body with profile_id (snake_case) and templateId', async () => {
    const { fetchImpl, calls } = makeFetch([jsonResponse(202, { id: 'j', status: 'queued' })]);
    await client(fetchImpl).createResume({ jobDescription: 'JD', profileId: 'pid', templateId: 'two-column' });
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toEqual({ jobDescription: 'JD', templateId: 'two-column', profile_id: 'pid' });
  });
});

describe('VitexClient error envelope mapping', () => {
  it('maps a standard envelope into a typed ApiError', async () => {
    const envelope = {
      error: { code: 'NOT_FOUND', message: 'Job not found', retriable: false, requestId: 'req_1' },
    };
    const { fetchImpl } = makeFetch([jsonResponse(404, envelope)]);
    await expect(client(fetchImpl).getJob('missing')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NOT_FOUND',
      httpStatus: 404,
      retriable: false,
      requestId: 'req_1',
    });
  });

  it('synthesizes an ApiError for a non-envelope error body', async () => {
    const { fetchImpl } = makeFetch([
      new Response('<html>502 Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    ]);
    const err = await client(fetchImpl)
      .getJob('x')
      .catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.httpStatus).toBe(502);
    expect(err.retriable).toBe(true);
  });

  it('flags a 429 as retriable when the body is not an envelope', async () => {
    const { fetchImpl } = makeFetch([new Response('rate limited', { status: 429 })]);
    const err = await client(fetchImpl)
      .getJob('x')
      .catch((e) => e);
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retriable).toBe(true);
  });
});

describe('VitexClient.pollJob', () => {
  it('polls through queued → running → succeeded', async () => {
    const { fetchImpl } = makeFetch([
      jsonResponse(200, { id: 'j', status: 'queued' }),
      jsonResponse(200, { id: 'j', status: 'running' }),
      jsonResponse(200, { id: 'j', status: 'succeeded', result: { atsScore: 91 } }),
    ]);
    const job = await client(fetchImpl).pollJob('j', { intervalMs: 0, maxAttempts: 10 });
    expect(job.status).toBe('succeeded');
    expect(job.result?.atsScore).toBe(91);
  });

  it('returns a failed job (does not throw)', async () => {
    const { fetchImpl } = makeFetch([
      jsonResponse(200, { id: 'j', status: 'running' }),
      jsonResponse(200, { id: 'j', status: 'failed', error: { code: 'PIPELINE_STEP_FAILED' } }),
    ]);
    const job = await client(fetchImpl).pollJob('j', { intervalMs: 0, maxAttempts: 10 });
    expect(job.status).toBe('failed');
    expect(job.error?.code).toBe('PIPELINE_STEP_FAILED');
  });

  it('throws PollTimeoutError when the job never settles', async () => {
    const responses = Array.from({ length: 5 }, () => jsonResponse(200, { id: 'j', status: 'running' }));
    const { fetchImpl } = makeFetch(responses);
    await expect(
      client(fetchImpl).pollJob('j', { intervalMs: 0, maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(PollTimeoutError);
  });
});

describe('VitexClient.getPdf', () => {
  it('returns raw PDF bytes as a Uint8Array', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const { fetchImpl, calls } = makeFetch([
      new Response(bytes, { status: 200, headers: { 'content-type': 'application/pdf' } }),
    ]);
    const out = await client(fetchImpl).getPdf('j');
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([0x25, 0x50, 0x44, 0x46]);
    expect(headerOf(calls[0]!.init, 'accept')).toBe('application/pdf');
  });
});

describe('VitexClient base URL handling', () => {
  it('strips a trailing slash so paths do not double up', async () => {
    const { fetchImpl, calls } = makeFetch([jsonResponse(200, { items: [] })]);
    const c = new VitexClient({ baseUrl: 'https://api.test/', apiKey: 'k', fetch: fetchImpl });
    await c.listProfiles();
    expect(calls[0]!.url).toBe('https://api.test/api/profiles');
  });
});
