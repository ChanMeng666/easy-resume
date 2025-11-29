/**
 * LaTeX compilation API route
 * Proxies requests to LaTeX.Online for PDF generation
 */

import { NextRequest, NextResponse } from 'next/server';

// LaTeX-on-HTTP API (supports POST with large payloads)
const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';
const CACHE_TTL = 3600000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 100; // Maximum number of cached PDFs

/**
 * Simple LRU-like cache for compiled PDFs
 */
interface CacheEntry {
  pdf: Buffer;
  timestamp: number;
}

const pdfCache = new Map<string, CacheEntry>();

/**
 * Generate a hash key from LaTeX code using Web Crypto API
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
 * POST handler for LaTeX compilation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latexCode, engine = 'pdflatex' } = body;

    // Validate input
    if (!latexCode || typeof latexCode !== 'string') {
      return NextResponse.json(
        { error: 'Invalid LaTeX code', message: 'LaTeX code is required' },
        { status: 400 }
      );
    }

    if (latexCode.length > 500000) {
      return NextResponse.json(
        { error: 'LaTeX code too large', message: 'Maximum size is 500KB' },
        { status: 413 }
      );
    }

    // Check cache
    const cacheKey = await generateHash(latexCode + engine);
    const cached = pdfCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(cached.pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // Compile via LaTeX-on-HTTP API (supports large payloads via POST)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    // Build request body for LaTeX-on-HTTP API
    const requestBody = JSON.stringify({
      compiler: engine,
      resources: [{
        main: true,
        content: latexCode,
      }],
    });

    try {
      const response = await fetch(LATEX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';

      // LaTeX-on-HTTP returns JSON on error, PDF on success
      if (!response.ok || contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const logContent = errorData.log_files?.['__main_document__.log'] || '';
        console.error('LaTeX compilation error:', errorData.error, logContent.slice(0, 500));

        return NextResponse.json(
          {
            error: 'Compilation failed',
            message: errorData.error || 'LaTeX compilation error',
            log: logContent.slice(0, 5000) // Limit log size
          },
          { status: 422 }
        );
      }

      // Check if response is actually a PDF
      if (!contentType.includes('application/pdf')) {
        const errorText = await response.text();
        return NextResponse.json(
          {
            error: 'Compilation failed',
            message: 'Did not receive PDF response',
            log: errorText.slice(0, 5000)
          },
          { status: 422 }
        );
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());

      // Cache the result
      evictOldestEntries();
      pdfCache.set(cacheKey, { pdf: pdfBuffer, timestamp: Date.now() });

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'X-Cache': 'MISS',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Timeout', message: 'Compilation took too long (>60s)' },
          { status: 504 }
        );
      }

      // Handle network errors with more detail
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error('LaTeX.Online fetch error:', errorMessage);

      return NextResponse.json(
        {
          error: 'Network error',
          message: `Failed to connect to LaTeX.Online: ${errorMessage}. Please try "Open in Overleaf" instead.`
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Compile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process compilation request' },
      { status: 500 }
    );
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
