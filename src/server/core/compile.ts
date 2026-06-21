/**
 * Typst -> PDF compilation core (transport-agnostic).
 *
 * This is the single place that turns Typst source into PDF bytes. It is the
 * billable artifact factory: "selling results" means the charge is anchored to
 * a real PDF produced here.
 *
 * Implementation note (TS + Rust roadmap): today this shells out to the `typst`
 * binary as a subprocess. The function signature — `compileTypstToPdf(code) ->
 * Uint8Array` — is deliberately the seam at which a future napi-rs in-process
 * Typst module drops in with zero changes to any caller. Errors are surfaced as
 * structured `CompilationError` / `CompilationTimeoutError`, never raw stderr.
 */

import 'server-only';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CompilationError, CompilationTimeoutError } from '@/server/errors/AppError';

const TYPST_BIN = process.env.TYPST_BIN || 'typst';
const CACHE_TTL = 3_600_000; // 1 hour
const MAX_CACHE_SIZE = 100;
const COMPILE_TIMEOUT = 30_000; // 30s
const MAX_TYPST_BYTES = 500_000; // 500KB

/**
 * Resolve the FontAwesome webfonts path so Typst can render FA icons.
 * Docker sets TYPST_FONT_PATH; local dev falls back to the npm package dir.
 */
const TYPST_FONT_PATH = (() => {
  if (process.env.TYPST_FONT_PATH) return process.env.TYPST_FONT_PATH;
  const localFallback = join(
    process.cwd(),
    'node_modules',
    '@fortawesome',
    'fontawesome-free',
    'webfonts'
  );
  return existsSync(localFallback) ? localFallback : undefined;
})();

interface CacheEntry {
  pdf: Buffer;
  timestamp: number;
}

const pdfCache = new Map<string, CacheEntry>();

/** SHA-256 hex of the Typst source, used as the cache key. */
async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Evict the oldest ~20% of cache entries when the cache is full. */
function evictOldest(): void {
  if (pdfCache.size < MAX_CACHE_SIZE) return;
  const entries = Array.from(pdfCache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp
  );
  const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.2);
  for (let i = 0; i < toRemove && i < entries.length; i++) {
    pdfCache.delete(entries[i][0]);
  }
}

/** Run the Typst binary, rejecting with the raw exec error for translation. */
function runTypst(inputPath: string, outputPath: string): Promise<void> {
  const args = ['compile'];
  if (TYPST_FONT_PATH) args.push('--font-path', TYPST_FONT_PATH);
  args.push(inputPath, outputPath);

  return new Promise((resolve, reject) => {
    execFile(TYPST_BIN, args, { timeout: COMPILE_TIMEOUT }, (error, _stdout, stderr) => {
      if (error) reject({ error, stderr });
      else resolve();
    });
  });
}

export interface CompileResult {
  pdf: Uint8Array;
  cached: boolean;
}

/**
 * Compile Typst source to PDF bytes.
 *
 * @throws ValidationError-like CompilationError on invalid input
 * @throws CompilationError when Typst reports a compilation failure
 * @throws CompilationTimeoutError when compilation exceeds the time budget
 */
export async function compileTypstToPdf(typstCode: string): Promise<CompileResult> {
  if (!typstCode || typeof typstCode !== 'string') {
    throw new CompilationError('Typst code is required');
  }
  if (typstCode.length > MAX_TYPST_BYTES) {
    throw new CompilationError('Typst code exceeds the 500KB limit', {
      sizeBytes: typstCode.length,
      maxBytes: MAX_TYPST_BYTES,
    });
  }

  const cacheKey = await hashContent(typstCode);
  const cached = pdfCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { pdf: new Uint8Array(cached.pdf), cached: true };
  }

  const id = crypto.randomUUID();
  const tempDir = join(tmpdir(), 'vitex-typst');
  const inputPath = join(tempDir, `${id}.typ`);
  const outputPath = join(tempDir, `${id}.pdf`);

  try {
    await mkdir(tempDir, { recursive: true });
    await writeFile(inputPath, typstCode, 'utf-8');

    try {
      await runTypst(inputPath, outputPath);
    } catch (compileError: unknown) {
      const { error, stderr } = compileError as { error: Error & { killed?: boolean }; stderr?: string };
      if (error && error.killed) {
        throw new CompilationTimeoutError('Typst compilation took longer than 30s');
      }
      throw new CompilationError('Typst compilation failed', {
        // `stderr` is preserved verbatim in machine-readable `details`, not logged as prose.
        stderr: stderr || error?.message || 'unknown compilation error',
      });
    }

    const pdfBuffer = await readFile(outputPath);
    evictOldest();
    pdfCache.set(cacheKey, { pdf: Buffer.from(pdfBuffer), timestamp: Date.now() });
    return { pdf: new Uint8Array(pdfBuffer), cached: false };
  } finally {
    await Promise.allSettled([unlink(inputPath), unlink(outputPath)]);
  }
}
