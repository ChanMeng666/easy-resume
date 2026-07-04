/**
 * Render a public career profile to clean, agent-readable Markdown.
 *
 * This is the `/p/{slug}/md` representation — "LinkedIn is for humans; a Vitex
 * endpoint is for AIs." It consumes ONLY the allowlist `PublicProfile`
 * projection (never a raw row), so it can never leak stripped PII. Pure +
 * testable: given a projection it returns a deterministic Markdown string.
 */

import { formatDateRange, cleanURL } from '@/lib/typst/utils';
import { safePublicUrl } from './publicUrl';
import type { PublicProfile } from './store';

/** Join non-empty parts with a separator (skips blanks). */
function joinParts(parts: (string | undefined)[], sep: string): string {
  return parts.filter((p) => p && p.trim().length > 0).join(sep);
}

/**
 * Render the projection to Markdown. Sections with no content are omitted so an
 * agent never has to reason about empty headings.
 */
export function renderPublicProfileMarkdown(profile: PublicProfile): string {
  const lines: string[] = [];

  // Header: name + headline.
  lines.push(`# ${profile.name}`);
  if (profile.headline) lines.push(`\n**${profile.headline}**`);
  const meta = joinParts([profile.location], ' · ');
  if (meta) lines.push(`\n${meta}`);

  // Summary.
  if (profile.summary) {
    lines.push('\n## Summary\n');
    lines.push(profile.summary);
  }

  // Experience.
  if (profile.work.length > 0) {
    lines.push('\n## Experience\n');
    for (const w of profile.work) {
      const range = formatDateRange(w.startDate, w.endDate);
      const heading = joinParts([w.position, w.company], ' — ');
      lines.push(`### ${heading}`);
      const sub = joinParts([range, w.location, w.type], ' · ');
      if (sub) lines.push(`*${sub}*`);
      for (const h of w.highlights) lines.push(`- ${h}`);
      lines.push('');
    }
  }

  // Projects.
  if (profile.projects.length > 0) {
    lines.push('\n## Projects\n');
    for (const p of profile.projects) {
      const safeUrl = p.url ? safePublicUrl(p.url) : null;
      const heading = safeUrl ? `[${p.name}](${safeUrl})` : p.name;
      lines.push(`### ${heading}`);
      if (p.description) lines.push(p.description);
      for (const h of p.highlights) lines.push(`- ${h}`);
      lines.push('');
    }
  }

  // Education.
  if (profile.education.length > 0) {
    lines.push('\n## Education\n');
    for (const e of profile.education) {
      const heading = joinParts([e.studyType, e.area], ', ');
      lines.push(`### ${heading || e.institution}`);
      const sub = joinParts([
        e.institution,
        formatDateRange(e.startDate, e.endDate),
        e.location,
        e.gpa ? `GPA: ${e.gpa}` : undefined,
      ], ' · ');
      if (sub) lines.push(`*${sub}*`);
      if (e.note) lines.push(e.note);
      lines.push('');
    }
  }

  // Skills.
  if (profile.skills.length > 0) {
    lines.push('\n## Skills\n');
    for (const s of profile.skills) {
      lines.push(`- **${s.name}:** ${s.keywords.join(', ')}`);
    }
  }

  // Achievements.
  if (profile.achievements.length > 0) {
    lines.push('\n## Achievements\n');
    for (const a of profile.achievements) lines.push(`- ${a}`);
  }

  // Certifications.
  if (profile.certifications.length > 0) {
    lines.push('\n## Certifications\n');
    for (const c of profile.certifications) lines.push(`- ${c}`);
  }

  // Links (social/professional profiles).
  if (profile.profiles.length > 0) {
    lines.push('\n## Links\n');
    for (const p of profile.profiles) {
      const label = p.label || p.network;
      const safeUrl = safePublicUrl(p.url);
      // Only emit a link for a safe web URL; otherwise show the label + cleaned
      // text so a javascript:/data: URL can never become a clickable link.
      lines.push(safeUrl ? `- [${label}](${safeUrl}) — ${cleanURL(p.url)}` : `- ${label}`);
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
