/**
 * Client-side Typst compilation service.
 * Handles API calls to the compile endpoint, clipboard operations,
 * and .typ file downloads.
 */

export interface CompileResult {
  success: boolean;
  pdfBlob?: Blob;
  pdfUrl?: string;
  error?: CompileError;
  cached?: boolean;
}

export interface CompileError {
  type: 'compilation' | 'network' | 'timeout' | 'server';
  message: string;
  log?: string;
}

/**
 * Simple SHA-256 hash (truncated) for client-side caching.
 */
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/** Client-side cache for compiled PDF blobs. */
const clientCache = new Map<
  string,
  { blob: Blob; url: string; timestamp: number }
>();
const CLIENT_CACHE_TTL = 600_000; // 10 minutes

/**
 * Evict expired cache entries and revoke their blob URLs.
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of clientCache.entries()) {
    if (now - entry.timestamp > CLIENT_CACHE_TTL) {
      URL.revokeObjectURL(entry.url);
      clientCache.delete(key);
    }
  }
}

/**
 * Compile Typst code to PDF via the server-side API.
 * Results are cached on the client for 10 minutes.
 * @param typstCode - Complete Typst document source
 * @returns CompileResult with a PDF blob URL on success, or an error
 */
export async function compilePdf(typstCode: string): Promise<CompileResult> {
  try {
    cleanupCache();

    // Check client cache
    const cacheKey = await simpleHash(typstCode);
    const cached = clientCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return {
        success: true,
        pdfBlob: cached.blob,
        pdfUrl: cached.url,
        cached: true,
      };
    }

    // Call the compile API
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typstCode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 422) {
        return {
          success: false,
          error: {
            type: 'compilation',
            message: errorData.message || 'Typst compilation failed',
            log: errorData.log,
          },
        };
      }

      if (response.status === 504) {
        return {
          success: false,
          error: {
            type: 'timeout',
            message: 'Compilation took too long. Please try again.',
          },
        };
      }

      return {
        success: false,
        error: {
          type: 'server',
          message: errorData.message || 'Server error occurred',
        },
      };
    }

    const pdfBlob = await response.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const isCacheHit = response.headers.get('X-Cache') === 'HIT';

    clientCache.set(cacheKey, {
      blob: pdfBlob,
      url: pdfUrl,
      timestamp: Date.now(),
    });

    return { success: true, pdfBlob, pdfUrl, cached: isCacheHit };
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'network',
        message:
          error instanceof Error
            ? `Network error: ${error.message}`
            : 'Failed to connect to compilation service',
      },
    };
  }
}

/**
 * Download Typst source code as a .typ file.
 * Creates a temporary anchor element to trigger the browser download.
 * @param typstCode - Complete Typst document source
 * @param filename - Output filename (defaults to "resume.typ")
 */
export function downloadTypFile(
  typstCode: string,
  filename: string = 'resume.typ'
): void {
  const blob = new Blob([typstCode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

/**
 * Copy Typst source code to the clipboard.
 * @param typstCode - Complete Typst document source
 * @throws If the Clipboard API is unavailable or the copy fails
 */
export async function copyToClipboard(typstCode: string): Promise<void> {
  await navigator.clipboard.writeText(typstCode);
}

/**
 * Revoke a previously-created PDF blob URL to free memory.
 * Also removes the corresponding entry from the client cache.
 * @param url - Blob URL to revoke
 */
export function revokePdfUrl(url: string): void {
  URL.revokeObjectURL(url);

  for (const [key, entry] of clientCache.entries()) {
    if (entry.url === url) {
      clientCache.delete(key);
      break;
    }
  }
}

/**
 * Clear all cached PDF blobs and revoke their URLs.
 */
export function clearCache(): void {
  for (const entry of clientCache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  clientCache.clear();
}
