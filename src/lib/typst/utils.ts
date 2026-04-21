/**
 * Typst utility functions for escaping special characters and formatting.
 * Replaces the LaTeX utils with Typst-compatible equivalents.
 */

/**
 * Escape special Typst characters in content mode.
 * In Typst content mode, these characters have special meaning and must be
 * escaped with a preceding backslash: * _ ` $ # < > @ \
 * @param text - Raw text to escape
 * @returns Text safe for Typst content mode
 */
export function escapeTypst(text: string): string {
  if (!text) return '';

  // Order matters: escape backslash first to avoid double-escaping
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/@/g, '\\@');
}

/**
 * Format a date range for display in a resume.
 * Uses an en dash (–) as the separator between dates.
 * @param startDate - Start date string (e.g., "Mar 2025")
 * @param endDate - End date string (e.g., "Dec 2025" or "PRESENT")
 * @returns Formatted date range (e.g., "Mar 2025 – Dec 2025")
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return '';
  if (!startDate) return endDate || '';
  if (!endDate) return startDate;

  const formattedEnd = endDate.toUpperCase() === 'PRESENT' ? 'Present' : endDate;
  return `${startDate} – ${formattedEnd}`;
}

/**
 * Remove protocol prefix and trailing slash from a URL for cleaner display.
 * @param url - Full URL string
 * @returns Cleaned URL without https:// prefix or trailing slash
 */
export function cleanURL(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Split a full name into first name and last name components.
 * If the name has only one part, lastName will be an empty string.
 * @param fullName - Full name string
 * @returns Object with firstName and lastName properties
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
 * Map a social network name to a Typst-compatible icon representation.
 * Uses Unicode symbols since standard Typst does not include FontAwesome.
 * @param network - Network name (e.g., "LinkedIn", "GitHub")
 * @returns Unicode symbol string for the network
 */
export function networkToIcon(network: string): string {
  const iconMap: Record<string, string> = {
    linkedin: '🔗',
    github: '💻',
    twitter: '🐦',
    gitlab: '🦊',
    stackoverflow: '📚',
    portfolio: '🌐',
    website: '🌐',
  };

  return iconMap[network.toLowerCase()] || '🌐';
}

/**
 * Import statement for the FontAwesome Typst package.
 * Place at the top of any Typst document that uses `fa-*` icon functions
 * below. Relies on FontAwesome 6 webfont files being on the compiler's
 * font search path.
 */
export const FONTAWESOME_IMPORT = '#import "@preview/fontawesome:0.5.0": *';

/**
 * Map a social network name to a FontAwesome Typst function call.
 * Produces Typst source like `#fa-github()` or `#fa-linkedin()` that the
 * document compiles to a real vector icon — no emoji, no fallback glyphs,
 * no unpredictable advance widths.
 * @param network - Network name (e.g., "LinkedIn", "GitHub", "Portfolio")
 * @returns Typst source string that renders the matching FA icon
 */
export function networkToFaIcon(network: string): string {
  const key = network.toLowerCase();
  const brandMap: Record<string, string> = {
    linkedin: '#fa-linkedin()',
    github: '#fa-github()',
    twitter: '#fa-x-twitter()',
    x: '#fa-x-twitter()',
    gitlab: '#fa-gitlab()',
    stackoverflow: '#fa-stack-overflow()',
    'stack-overflow': '#fa-stack-overflow()',
    medium: '#fa-medium()',
    dribbble: '#fa-dribbble()',
    behance: '#fa-behance()',
    youtube: '#fa-youtube()',
    instagram: '#fa-instagram()',
    facebook: '#fa-facebook()',
  };
  if (brandMap[key]) return brandMap[key];

  // Default: generic website / portfolio globe icon (Free Solid set).
  return '#fa-globe(solid: true)';
}
