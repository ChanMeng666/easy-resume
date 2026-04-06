/**
 * Typst compilation API route
 * Compiles Typst code to PDF locally using the Typst binary
 */

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const TYPST_BIN = process.env.TYPST_BIN || 'typst';
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached PDFs
const COMPILE_TIMEOUT = 30000; // 30 second timeout

/**
 * Simple LRU-like cache for compiled PDFs
 */
interface CacheEntry {
  pdf: Buffer;
  timestamp: number;
}

const pdfCache = new Map<string, CacheEntry>();

/**
 * Generate a hash key from Typst code using Web Crypto API
 */
async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Evict oldest entries if cache is full
 */
function evictOldestEntries(): void {
  if (pdfCache.size >= MAX_CACHE_SIZE) {
    const entries = Array.from(pdfCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      pdfCache.delete(entries[i][0]);
    }
  }
}

/**
 * Clean up temporary files, ignoring errors if files don't exist
 */
async function cleanupFiles(...paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map(p => unlink(p)));
}

/**
 * Compile Typst code to PDF using the local Typst binary
 */
function compileTypst(inputPath: string, outputPath: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      TYPST_BIN,
      ['compile', inputPath, outputPath],
      { timeout: COMPILE_TIMEOUT },
      (error, stdout, stderr) => {
        if (error) {
          reject({ error, stdout, stderr });
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

/**
 * POST handler for Typst compilation
 */
export async function POST(request: NextRequest) {
  const id = crypto.randomUUID();
  const tempDir = join(tmpdir(), 'vitex-typst');
  const inputPath = join(tempDir, `${id}.typ`);
  const outputPath = join(tempDir, `${id}.pdf`);

  try {
    const body = await request.json();
    const { typstCode } = body;

    // Validate input
    if (!typstCode || typeof typstCode !== 'string') {
      return NextResponse.json(
        { error: 'Invalid Typst code', message: 'Typst code is required' },
        { status: 400 }
      );
    }

    if (typstCode.length > 500000) {
      return NextResponse.json(
        { error: 'Typst code too large', message: 'Maximum size is 500KB' },
        { status: 413 }
      );
    }

    // Check cache
    const cacheKey = await generateHash(typstCode);
    const cached = pdfCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(new Uint8Array(cached.pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true });

    // Write Typst code to temp file
    await writeFile(inputPath, typstCode, 'utf-8');

    try {
      // Compile Typst to PDF
      await compileTypst(inputPath, outputPath);

      // Read the output PDF
      const pdfBuffer = await readFile(outputPath);

      // Cache the result
      evictOldestEntries();
      pdfCache.set(cacheKey, { pdf: Buffer.from(pdfBuffer), timestamp: Date.now() });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (compileError: unknown) {
      const { error, stderr } = compileError as { error: Error; stdout: string; stderr: string };

      // Check if it was a timeout
      if (error && 'killed' in error && error.killed) {
        return NextResponse.json(
          { error: 'Timeout', message: 'Compilation took too long (>30s)' },
          { status: 504 }
        );
      }

      // Return Typst compilation error
      console.error('Typst compilation error:', stderr || error?.message);
      return NextResponse.json(
        {
          error: 'Compilation failed',
          message: stderr || error?.message || 'Typst compilation error',
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Compile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process compilation request' },
      { status: 500 }
    );
  } finally {
    await cleanupFiles(inputPath, outputPath);
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
