/**
 * Client-side LaTeX compilation service
 * Handles API calls to the compile endpoint with caching
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

export interface CompileOptions {
  engine?: 'pdflatex' | 'xelatex' | 'lualatex';
}

/**
 * Simple hash function for client-side caching
 */
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/**
 * Client-side cache for PDF blobs
 */
const clientCache = new Map<string, { blob: Blob; url: string; timestamp: number }>();
const CLIENT_CACHE_TTL = 600000; // 10 minutes

/**
 * Clean up expired cache entries and revoke old blob URLs
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
 * Compile LaTeX code to PDF via the API
 * @param latexCode - Complete LaTeX document code
 * @param options - Compilation options
 * @returns CompileResult with PDF blob or error
 */
export async function compilePdf(
  latexCode: string,
  options: CompileOptions = {}
): Promise<CompileResult> {
  const { engine = 'pdflatex' } = options;

  try {
    // Clean up old cache entries
    cleanupCache();

    // Check client cache first
    const cacheKey = await simpleHash(latexCode + engine);
    const cached = clientCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return {
        success: true,
        pdfBlob: cached.blob,
        pdfUrl: cached.url,
        cached: true,
      };
    }

    // Make API request
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ latexCode, engine }),
    });

    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 422) {
        return {
          success: false,
          error: {
            type: 'compilation',
            message: errorData.message || 'LaTeX compilation failed',
            log: errorData.log,
          },
        };
      }

      if (response.status === 504) {
        return {
          success: false,
          error: {
            type: 'timeout',
            message: 'Compilation took too long. Try again or use Overleaf.',
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

    // Create blob and URL
    const pdfBlob = await response.blob();
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const isCacheHit = response.headers.get('X-Cache') === 'HIT';

    // Cache the result
    clientCache.set(cacheKey, {
      blob: pdfBlob,
      url: pdfUrl,
      timestamp: Date.now(),
    });

    return {
      success: true,
      pdfBlob,
      pdfUrl,
      cached: isCacheHit,
    };
  } catch (error) {
    // Network error
    return {
      success: false,
      error: {
        type: 'network',
        message: error instanceof Error
          ? `Network error: ${error.message}`
          : 'Failed to connect to compilation service',
      },
    };
  }
}

/**
 * Revoke a PDF blob URL to free memory
 * @param url - Blob URL to revoke
 */
export function revokePdfUrl(url: string): void {
  URL.revokeObjectURL(url);

  // Also remove from cache
  for (const [key, entry] of clientCache.entries()) {
    if (entry.url === url) {
      clientCache.delete(key);
      break;
    }
  }
}

/**
 * Clear all cached PDFs
 */
export function clearCache(): void {
  for (const entry of clientCache.values()) {
    URL.revokeObjectURL(entry.url);
  }
  clientCache.clear();
}
