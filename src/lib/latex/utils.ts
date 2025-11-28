/**
 * LaTeX utility functions for escaping special characters and formatting
 */

/**
 * Escape special LaTeX characters
 * @param text - Text to escape
 * @returns Escaped text safe for LaTeX
 */
export function escapeLaTeX(text: string): string {
  if (!text) return '';

  const replacements: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
  };

  // First pass: replace backslash
  let escaped = text.replace(/\\/g, replacements['\\']);

  // Second pass: replace other special characters
  escaped = escaped.replace(/[&%$#_{}~^]/g, (char) => replacements[char] || char);

  return escaped;
}

/**
 * Format date for LaTeX CV (e.g., "Nov 2023--Dec 2024")
 * @param startDate - Start date string
 * @param endDate - End date string (can be "PRESENT")
 * @returns Formatted date range
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  if (!startDate) return endDate || '';
  if (!endDate) return startDate;

  const formattedEnd = endDate.toUpperCase() === 'PRESENT' ? 'Present' : endDate;
  return `${startDate}--${formattedEnd}`;
}

/**
 * Convert array of strings to LaTeX itemize environment
 * @param items - Array of item strings
 * @param indent - Indentation level
 * @returns LaTeX itemize block
 */
export function arrayToLatexItemize(items: string[], indent: string = ''): string {
  if (!items || items.length === 0) return '';

  const itemLines = items.map(item => `${indent}\\item ${escapeLaTeX(item)}`);

  return `${indent}\\begin{itemize}\n${itemLines.join('\n')}\n${indent}\\end{itemize}`;
}

/**
 * Format location (for education/work)
 * @param location - Location string
 * @returns Formatted location
 */
export function formatLocation(location: string): string {
  return escapeLaTeX(location);
}

/**
 * Split full name into first and last name
 * @param fullName - Full name string
 * @returns Object with firstName and lastName
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

/**
 * Convert network name to moderncv social command
 * @param network - Network name (e.g., "LinkedIn", "GitHub")
 * @returns moderncv social identifier
 */
export function networkToSocialType(network: string): string {
  const networkMap: Record<string, string> = {
    'linkedin': 'linkedin',
    'github': 'github',
    'twitter': 'twitter',
    'gitlab': 'gitlab',
    'stackoverflow': 'stackoverflow',
    'portfolio': 'homepage',
    'website': 'homepage',
  };

  return networkMap[network.toLowerCase()] || 'homepage';
}

/**
 * Clean URL for LaTeX (remove protocol if needed)
 * @param url - Full URL
 * @returns Cleaned URL
 */
export function cleanURL(url: string): string {
  // For moderncv, we usually want the domain or clean URL
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Escape URL for use in LaTeX \href command
 * Special handling for characters that can break \href
 * @param url - URL string
 * @returns Escaped URL safe for \href
 */
export function escapeURL(url: string): string {
  if (!url) return '';

  // In \href{}{}, the URL (first argument) needs special escaping
  // Escape LaTeX special characters that can break the command
  return url
    .replace(/%/g, '\\%')   // Percent signs
    .replace(/#/g, '\\#')    // Hash symbols
    .replace(/&/g, '\\&')    // Ampersands
    .replace(/_/g, '\\_');   // Underscores
}

/**
 * Join multiple text pieces with LaTeX line breaks
 * @param pieces - Array of text pieces
 * @returns Joined text with \\ separators
 */
export function joinWithLineBreaks(pieces: string[]): string {
  return pieces.filter(Boolean).join(' \\\\ ');
}

/**
 * Convert array of keywords to altacv cvtag commands
 * @param keywords - Array of skill keywords
 * @returns LaTeX cvtag commands
 */
export function arrayToCvTags(keywords: string[]): string {
  if (!keywords || keywords.length === 0) return '';
  return keywords.map(keyword => `\\cvtag{${escapeLaTeX(keyword)}}`).join('\n');
}

/**
 * Convert array of strings to compact bullet list
 * Uses consistent spacing between items
 * @param items - Array of item strings
 * @returns LaTeX itemize block with compact spacing
 */
export function arrayToCompactItemize(items: string[]): string {
  if (!items || items.length === 0) return '';

  const itemLines = items.map(item => `  \\item \\strut ${escapeLaTeX(item)}`);

  return `\\begin{itemize}[leftmargin=*,itemsep=0.3em,parsep=0em,topsep=0.3em]\n${itemLines.join('\n')}\n\\end{itemize}`;
}
