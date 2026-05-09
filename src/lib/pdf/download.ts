/**
 * Trigger a browser download of a PDF at the given URL using a synthetic anchor.
 * Works for both blob: URLs (compiled in-memory PDFs) and remote http(s) URLs.
 */
export function downloadPdfFromUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open a PDF in a new browser tab. On iOS Safari this is the most reliable way
 * to view a PDF blob, since iframe rendering of blob URLs is unstable there.
 */
export function openPdfInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
