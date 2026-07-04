import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run } from './cli.js';

/** Capture stdout/stderr writes so assertions can inspect CLI output. */
function captureOutput() {
  const out: string[] = [];
  const err: string[] = [];
  const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation((c: unknown) => {
    out.push(String(c));
    return true;
  });
  const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation((c: unknown) => {
    err.push(String(c));
    return true;
  });
  return {
    out: () => out.join(''),
    err: () => err.join(''),
    restore: () => {
      outSpy.mockRestore();
      errSpy.mockRestore();
    },
  };
}

let cap: ReturnType<typeof captureOutput>;
beforeEach(() => {
  cap = captureOutput();
});
afterEach(() => {
  cap.restore();
  vi.unstubAllGlobals();
  delete process.env.VITEX_API_KEY;
});

describe('run — usage and meta (no network)', () => {
  it('--version prints the version and exits 0, matching package.json', async () => {
    const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    const code = await run(['--version']);
    expect(code).toBe(0);
    expect(cap.out().trim()).toBe(pkg.version);
  });

  it('--help exits 0 and teaches auth + billing', async () => {
    const code = await run(['--help']);
    expect(code).toBe(0);
    const text = cap.out();
    expect(text).toContain('VITEX_API_KEY');
    expect(text).toContain('1 credit');
  });

  it('no args prints help and exits 0', async () => {
    expect(await run([])).toBe(0);
    expect(cap.out()).toContain('USAGE');
  });

  it('unknown command exits 2', async () => {
    const code = await run(['frobnicate']);
    expect(code).toBe(2);
    expect(cap.err()).toContain("unknown command 'frobnicate'");
  });

  it('unknown flag exits 2', async () => {
    const code = await run(['job', 'x', '--bogus']);
    expect(code).toBe(2);
    expect(cap.err()).toContain('USAGE');
  });

  it('missing API key exits 2 without a network call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const code = await run(['whoami']);
    expect(code).toBe(2);
    expect(cap.err()).toContain('VITEX_API_KEY');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a command missing its id exits 2 before any network call', async () => {
    process.env.VITEX_API_KEY = 'vitex_p_secret';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const code = await run(['job']);
    expect(code).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('an invalid --scope exits 2', async () => {
    process.env.VITEX_API_KEY = 'vitex_p_secret';
    const code = await run(['refine', 'id', '--feedback', 'x', '--scope', 'nonsense']);
    expect(code).toBe(2);
    expect(cap.err()).toContain('--scope');
  });
});

describe('run — API interactions (stubbed fetch)', () => {
  beforeEach(() => {
    process.env.VITEX_API_KEY = 'vitex_p_secret';
  });

  it('job on an API 404 exits 3 and prints the envelope code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Job not found', retriable: false, requestId: 'req_9' } }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const code = await run(['job', 'missing']);
    expect(code).toBe(3);
    expect(cap.err()).toContain('error NOT_FOUND');
    expect(cap.err()).toContain('req_9');
  });

  it('generate --wait on a failed job exits 3', async () => {
    const jdPath = join(tmpdir(), `vitex-cli-test-jd-${Date.now()}.txt`);
    const bgPath = join(tmpdir(), `vitex-cli-test-bg-${Date.now()}.txt`);
    writeFileSync(jdPath, 'Senior Backend Engineer');
    writeFileSync(bgPath, '8 years of payments');
    const responses = [
      new Response(JSON.stringify({ id: 'j1', status: 'queued' }), { status: 202, headers: { 'content-type': 'application/json' } }),
      new Response(JSON.stringify({ id: 'j1', status: 'failed', error: { code: 'PIPELINE_STEP_FAILED', message: 'boom' } }), { status: 200, headers: { 'content-type': 'application/json' } }),
    ];
    let i = 0;
    vi.stubGlobal('fetch', vi.fn(async () => responses[i++]!));
    const code = await run(['generate', '--jd', jdPath, '--background', bgPath, '--wait']);
    rmSync(jdPath, { force: true });
    rmSync(bgPath, { force: true });
    expect(code).toBe(3);
    // A failed *waited* job is reported on stdout (humanJobRecord), not stderr.
    expect(cap.out()).toContain('failed (PIPELINE_STEP_FAILED');
  });

  it('whoami on a valid key exits 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
    const code = await run(['whoami', '--json']);
    expect(code).toBe(0);
    expect(cap.out()).toContain('"ok": true');
  });

  it('never echoes the API key in output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } })),
    );
    await run(['whoami']);
    expect(cap.out()).not.toContain('vitex_p_secret');
    expect(cap.err()).not.toContain('vitex_p_secret');
  });
});
