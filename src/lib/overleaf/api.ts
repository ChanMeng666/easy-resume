/**
 * Overleaf API integration
 * Provides functions to open LaTeX code in Overleaf
 */

export interface OverleafOptions {
  /**
   * LaTeX engine to use
   * @default 'pdflatex'
   */
  engine?: 'pdflatex' | 'xelatex' | 'lualatex' | 'latex_dvipdf';

  /**
   * Open in Visual Editor mode (formerly Rich Text)
   * @default false
   */
  visualEditor?: boolean;
}

/**
 * Open LaTeX code in Overleaf using POST form submission
 * This method avoids URL length limitations by posting data directly
 * @param latexCode - Complete LaTeX document code
 * @param options - Overleaf configuration options
 */
export function openInOverleaf(
  latexCode: string,
  options: OverleafOptions = {}
): void {
  const { engine = 'pdflatex', visualEditor = false } = options;

  try {
    // Create a hidden form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    form.style.display = 'none';

    // Add encoded snippet
    const encodedSnipInput = document.createElement('input');
    encodedSnipInput.type = 'hidden';
    encodedSnipInput.name = 'encoded_snip';
    encodedSnipInput.value = encodeURIComponent(latexCode);
    form.appendChild(encodedSnipInput);

    // Add engine parameter
    const engineInput = document.createElement('input');
    engineInput.type = 'hidden';
    engineInput.name = 'engine';
    engineInput.value = engine;
    form.appendChild(engineInput);

    // Add visual editor parameter if requested
    if (visualEditor) {
      const visualEditorInput = document.createElement('input');
      visualEditorInput.type = 'hidden';
      visualEditorInput.name = 'visual_editor';
      visualEditorInput.value = 'true';
      form.appendChild(visualEditorInput);
    }

    // Append form to body, submit, and remove
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  } catch (error) {
    console.error('Failed to open in Overleaf:', error);
    throw new Error('Failed to submit to Overleaf. Please try downloading the .tex file instead.');
  }
}

/**
 * Encode string to Base64 (handles Unicode)
 * @param str - String to encode
 * @returns Base64 encoded string
 */
function encodeToBase64(str: string): string {
  // Use TextEncoder for proper Unicode handling
  const bytes = new TextEncoder().encode(str);

  // Convert bytes to binary string
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  // Encode to Base64
  return btoa(binary);
}

/**
 * Build Overleaf URL with query parameters
 * @param snipUri - Data URL or file URL
 * @param engine - LaTeX engine
 * @param visualEditor - Whether to use Visual Editor
 * @returns Complete Overleaf URL
 */
function buildOverleafURL(
  snipUri: string,
  engine: string,
  visualEditor: boolean
): string {
  const baseUrl = 'https://www.overleaf.com/docs';
  const params = new URLSearchParams();

  params.set('snip_uri', snipUri);
  params.set('engine', engine);

  if (visualEditor) {
    params.set('visual_editor', 'true');
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Download LaTeX code as .tex file
 * @param latexCode - Complete LaTeX document code
 * @param filename - Filename without extension
 */
export function downloadTexFile(latexCode: string, filename: string = 'resume'): void {
  const blob = new Blob([latexCode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.tex`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Copy LaTeX code to clipboard
 * @param latexCode - Complete LaTeX document code
 * @returns Promise that resolves when copy is complete
 */
export async function copyToClipboard(latexCode: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(latexCode);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = latexCode;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Check if LaTeX code size is within Overleaf URL limits
 * @param latexCode - LaTeX code to check
 * @returns true if within limits, false otherwise
 */
export function isWithinURLLimit(latexCode: string): boolean {
  const base64 = encodeToBase64(latexCode);
  const dataUrl = `data:application/x-tex;base64,${base64}`;
  const fullUrl = buildOverleafURL(dataUrl, 'pdflatex', false);

  // Most browsers support ~2000 characters in URLs
  // Be conservative and use 1800 as limit
  const URL_LIMIT = 8000; // Actually most modern browsers support much more

  return fullUrl.length <= URL_LIMIT;
}
