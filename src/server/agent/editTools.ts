/**
 * Controlled, structured edit tools for the conversational resume editor (P2-1).
 *
 * Every tool mutates ONLY specific fields of a working ResumeData — none accepts
 * free-text Typst/HTML/URLs/paths, so there is no Typst-injection / SSRF surface.
 * All string inputs are sanitized (prompt-injection defang) and every edit is
 * validated against the manual-version render bounds (size + array caps) BEFORE it
 * is committed; an out-of-bounds or out-of-range edit is rejected without mutating
 * the working copy, and the model receives an error string it can react to.
 *
 * The tools are a closure over a mutable EditContext, so the loop accumulates
 * edits in memory; the resume is re-rendered (free) after each successful edit and
 * streamed via the optional event sink. No billing — editing is free.
 */

import 'server-only';
import { tool } from 'ai';
import { z } from 'zod';
import { manualVersionCreateSchema, type ResumeData } from '@/lib/validation/schema';
import { generateCoverLetterTypst } from '@/lib/typst/cover-letter';
import { sanitizeDeep } from '@/server/core/sanitize';
import type { DesignTokens } from '@/lib/design/tokens';
import type { EditAgentDeps } from './editAgent.types';

/** Mutable working state threaded through every tool in a turn. */
export interface EditContext {
  resume: ResumeData;
  templateId: string;
  /** The resume's design tokens (palette + density), passed to every re-render so
   * an edit stays in the same colors the resume was generated with. */
  tokens: DesignTokens;
  typstCode: string;
  changed: boolean;
  /** Bumped on every successful edit so the agent can detect per-step changes
   * and emit a single up-to-date resume snapshot (clean event ordering). */
  version: number;
  /**
   * The working cover letter body ('' when the anchored resume has no letter).
   * Tracked INDEPENDENTLY of the resume: a letter edit never sets `changed` or
   * re-renders the resume Typst, and vice versa.
   */
  coverLetter: string;
  /** The rendered Typst for `coverLetter` ('' when there is no letter). */
  coverLetterTypst: string;
  /** Whether any tool changed the cover letter this turn. */
  coverLetterChanged: boolean;
  /** Bumped on every successful letter edit, mirroring `version` for the resume,
   * so the agent can emit a single up-to-date cover-letter snapshot per step. */
  coverLetterVersion: number;
}

// Caps mirror the conversational nature of an edit: a handful of bullets/keywords
// per call. The whole-resume bounds (manualVersionCreateSchema) are still enforced
// after every edit, so these are just early, friendlier guards.
const MAX_BULLETS = 30;
const MAX_KEYWORDS = 40;
const MAX_FIELD_LEN = 4_000;
// Whole-letter cap, matching manualVersionCreateSchema.coverLetter (10k chars) so a
// letter authored/edited here can always be persisted as a manual version.
const MAX_COVER_LETTER_LEN = 10_000;
// Returned verbatim when a letter tool is called on a thread whose resume has no
// cover letter — a clear string the model reads and relays, never a throw.
const NO_COVER_LETTER = 'Error: this resume has no cover letter.';

const bulletList = z.array(z.string().min(1).max(MAX_FIELD_LEN)).max(MAX_BULLETS);
const keywordList = z.array(z.string().min(1).max(200)).max(MAX_KEYWORDS);

/** Split a cover letter into its logical blocks (greeting, body paragraphs,
 * closing, signature). Blocks are separated by a blank line; trimmed + empties
 * dropped so preview and rewrite share one consistent 0-based indexing. */
function splitCoverLetterBlocks(letter: string): string[] {
  return letter
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

/**
 * Apply a mutation to a CLONE of the working resume, validate it against the
 * render bounds, and commit only on success. Returns a confirmation string on
 * success or an `Error: ...` string the model can read and recover from — never
 * throws into the SDK loop, and never leaves a partially-applied edit. The agent
 * emits the resume snapshot from onStepFinish (see version counter) for clean
 * event ordering, so this only updates the working state.
 */
function applyEdit(
  ctx: EditContext,
  deps: EditAgentDeps,
  mutate: (draft: ResumeData) => void,
  okMessage: string
): string {
  const next = structuredClone(ctx.resume);
  try {
    mutate(next);
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : 'invalid edit'}; no change applied.`;
  }
  const parsed = manualVersionCreateSchema.safeParse({ resumeData: next, templateId: ctx.templateId });
  if (!parsed.success) {
    return 'Error: that change would make the resume invalid or exceed size limits; no change applied.';
  }
  // Render BEFORE committing so a render failure leaves the working state intact
  // (no partially-applied edit / stale typstCode). Commit atomically only on success.
  let typstCode: string;
  try {
    typstCode = deps.render(next, ctx.templateId, ctx.tokens);
  } catch (err) {
    return `Error: could not render that change (${err instanceof Error ? err.message : 'render error'}); no change applied.`;
  }
  ctx.resume = next;
  ctx.typstCode = typstCode;
  ctx.changed = true;
  ctx.version += 1;
  return okMessage;
}

/** Throw if an array index is out of range (caught by applyEdit → error string). */
function assertIndex(index: number, length: number, label: string): void {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new Error(`${label} index ${index} is out of range (0..${length - 1})`);
  }
}

/**
 * Commit a new cover letter body: bound + render-then-commit, mirroring applyEdit
 * but for the letter artifact. Renders the letter Typst BEFORE committing so a
 * render failure leaves the working state intact (no partial edit / stale Typst).
 * Never sets the resume `changed` flag or re-renders the resume — the two
 * artifacts' change tracking is independent. Returns a confirmation string on
 * success or an `Error: ...` string the model can recover from — never throws.
 */
function applyCoverLetterEdit(
  ctx: EditContext,
  deps: EditAgentDeps,
  nextLetter: string,
  okMessage: string
): string {
  const trimmed = nextLetter.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_COVER_LETTER_LEN) {
    return `Error: the cover letter text is empty or exceeds ${MAX_COVER_LETTER_LEN} characters; no change applied.`;
  }
  const render = deps.renderCoverLetter ?? generateCoverLetterTypst;
  let typstCode: string;
  try {
    typstCode = render(trimmed, ctx.resume);
  } catch (err) {
    return `Error: could not render that cover letter change (${err instanceof Error ? err.message : 'render error'}); no change applied.`;
  }
  ctx.coverLetter = trimmed;
  ctx.coverLetterTypst = typstCode;
  ctx.coverLetterChanged = true;
  ctx.coverLetterVersion += 1;
  return okMessage;
}

/**
 * Build the conservative edit tool set bound to a working context. Each tool's
 * inputs are zod-validated by the SDK, then sanitized here before use.
 */
export function buildEditTools(ctx: EditContext, deps: EditAgentDeps) {
  return {
    editSummary: tool({
      description:
        'Replace the professional summary with a tightened/retargeted version. Rewrite existing facts only — never invent experience.',
      inputSchema: z.object({
        summary: z.string().min(1).max(MAX_FIELD_LEN).describe('The new professional summary text.'),
      }),
      execute: async (input) => {
        const { summary } = sanitizeDeep(input);
        return applyEdit(ctx, deps, (r) => { r.basics.summary = summary; }, 'Updated the professional summary.');
      },
    }),

    editBasics: tool({
      description:
        'Update the candidate name, professional title (label), and/or location. Does NOT touch email/phone (never invent contact details).',
      inputSchema: z.object({
        name: z.string().min(1).max(200).optional(),
        label: z.string().min(1).max(200).optional().describe('Professional title, e.g. "Senior Backend Engineer".'),
        location: z.string().max(200).optional(),
      }),
      execute: async (input) => {
        const clean = sanitizeDeep(input);
        if (clean.name === undefined && clean.label === undefined && clean.location === undefined) {
          return 'Error: provide at least one of name, label, or location.';
        }
        return applyEdit(
          ctx,
          deps,
          (r) => {
            if (clean.name !== undefined) r.basics.name = clean.name;
            if (clean.label !== undefined) r.basics.label = clean.label;
            if (clean.location !== undefined) r.basics.location = clean.location;
          },
          'Updated the basics.'
        );
      },
    }),

    editWorkHighlights: tool({
      description:
        'Replace ALL bullet points of one work experience entry (0-based index). Use for adding/removing/reordering bullets; to change a SINGLE bullet prefer editWorkHighlight. Rewrite/reorder existing achievements — do not fabricate.',
      inputSchema: z.object({
        index: z.number().int().min(0).describe('0-based index into the work array.'),
        highlights: bulletList.describe('The full new list of bullet points for this entry.'),
      }),
      execute: async (input) => {
        const { index, highlights } = sanitizeDeep(input);
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(index, r.work.length, 'work');
            r.work[index].highlights = highlights;
          },
          `Updated highlights for work entry ${index}.`
        );
      },
    }),

    editWorkHighlight: tool({
      description:
        'Replace ONE bullet point of a work experience entry (both 0-based). PREFER this over editWorkHighlights when changing a single bullet — it avoids resending (and risking corruption of) the whole list. Rewrite the existing achievement — do not fabricate.',
      inputSchema: z.object({
        entryIndex: z.number().int().min(0).describe('0-based index into the work array.'),
        highlightIndex: z.number().int().min(0).describe('0-based index of the bullet to replace.'),
        text: z.string().min(1).max(MAX_FIELD_LEN).describe('The new text for that single bullet.'),
      }),
      execute: async (input) => {
        const { entryIndex, highlightIndex, text } = sanitizeDeep(input);
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(entryIndex, r.work.length, 'work');
            assertIndex(highlightIndex, r.work[entryIndex].highlights.length, 'highlight');
            r.work[entryIndex].highlights[highlightIndex] = text;
          },
          `Updated bullet ${highlightIndex} of work entry ${entryIndex}.`
        );
      },
    }),

    editProjectHighlights: tool({
      description:
        'Replace ALL bullet points of one project entry (0-based index). Use for adding/removing/reordering bullets; to change a SINGLE bullet prefer editProjectHighlight. Rewrite/reorder existing achievements — do not fabricate.',
      inputSchema: z.object({
        index: z.number().int().min(0).describe('0-based index into the projects array.'),
        highlights: bulletList.describe('The full new list of bullet points for this project.'),
      }),
      execute: async (input) => {
        const { index, highlights } = sanitizeDeep(input);
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(index, r.projects.length, 'project');
            r.projects[index].highlights = highlights;
          },
          `Updated highlights for project ${index}.`
        );
      },
    }),

    editProjectHighlight: tool({
      description:
        'Replace ONE bullet point of a project entry (both 0-based). PREFER this over editProjectHighlights when changing a single bullet — it avoids resending the whole list. Rewrite the existing achievement — do not fabricate.',
      inputSchema: z.object({
        entryIndex: z.number().int().min(0).describe('0-based index into the projects array.'),
        highlightIndex: z.number().int().min(0).describe('0-based index of the bullet to replace.'),
        text: z.string().min(1).max(MAX_FIELD_LEN).describe('The new text for that single bullet.'),
      }),
      execute: async (input) => {
        const { entryIndex, highlightIndex, text } = sanitizeDeep(input);
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(entryIndex, r.projects.length, 'project');
            assertIndex(highlightIndex, r.projects[entryIndex].highlights.length, 'highlight');
            r.projects[entryIndex].highlights[highlightIndex] = text;
          },
          `Updated bullet ${highlightIndex} of project ${entryIndex}.`
        );
      },
    }),

    addSkillCategory: tool({
      description: 'Add a new skill category with its keywords (e.g. "DevOps": ["Docker", "Kubernetes"]).',
      inputSchema: z.object({
        name: z.string().min(1).max(200).describe('The category name.'),
        keywords: keywordList.min(1).describe('Skills in this category.'),
      }),
      execute: async (input) => {
        const { name, keywords } = sanitizeDeep(input);
        return applyEdit(
          ctx,
          deps,
          (r) => { r.skills.push({ name, keywords }); },
          `Added skill category "${name}".`
        );
      },
    }),

    editSkillCategory: tool({
      description: 'Rename a skill category and/or replace its keywords (0-based index).',
      inputSchema: z.object({
        index: z.number().int().min(0).describe('0-based index into the skills array.'),
        name: z.string().min(1).max(200).optional(),
        keywords: keywordList.min(1).optional(),
      }),
      execute: async (input) => {
        const clean = sanitizeDeep(input);
        if (clean.name === undefined && clean.keywords === undefined) {
          return 'Error: provide a new name and/or keywords.';
        }
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(clean.index, r.skills.length, 'skill');
            if (clean.name !== undefined) r.skills[clean.index].name = clean.name;
            if (clean.keywords !== undefined) r.skills[clean.index].keywords = clean.keywords;
          },
          `Updated skill category ${clean.index}.`
        );
      },
    }),

    removeSkillCategory: tool({
      description: 'Remove a skill category by 0-based index.',
      inputSchema: z.object({
        index: z.number().int().min(0).describe('0-based index into the skills array.'),
      }),
      execute: async (input) => {
        const { index } = input;
        return applyEdit(
          ctx,
          deps,
          (r) => {
            assertIndex(index, r.skills.length, 'skill');
            r.skills.splice(index, 1);
          },
          `Removed skill category ${index}.`
        );
      },
    }),

    reorderSkills: tool({
      description:
        'Reorder skill categories. `order` is a permutation of all current 0-based indices (e.g. [2,0,1] to move the third category first).',
      inputSchema: z.object({
        order: z.array(z.number().int().min(0)).min(1).max(100).describe('A permutation of all current skill indices.'),
      }),
      execute: async (input) => {
        const { order } = input;
        return applyEdit(
          ctx,
          deps,
          (r) => {
            const n = r.skills.length;
            const isPermutation =
              order.length === n && new Set(order).size === n && order.every((i) => i >= 0 && i < n);
            if (!isPermutation) {
              throw new Error(`order must be a permutation of all ${n} skill indices`);
            }
            r.skills = order.map((i) => r.skills[i]);
          },
          'Reordered skill categories.'
        );
      },
    }),

    previewResume: tool({
      description:
        'Inspect the current working resume state (after any edits made this turn). Returns the structured data — call this if you need to re-check content before editing.',
      inputSchema: z.object({}),
      // Sanitize the payload: the working resume contains the user's own (possibly
      // unedited) text, and returning it raw as a tool result would re-inject it
      // into the model's next step. sanitizeDeep defangs injection vectors the same
      // way the embedded system-prompt copy is sanitized.
      execute: async () =>
        sanitizeDeep({
          basics: { name: ctx.resume.basics.name, label: ctx.resume.basics.label, summary: ctx.resume.basics.summary },
          work: ctx.resume.work.map((w, i) => ({ index: i, company: w.company, position: w.position, highlights: w.highlights })),
          projects: ctx.resume.projects.map((p, i) => ({ index: i, name: p.name, highlights: p.highlights })),
          skills: ctx.resume.skills.map((s, i) => ({ index: i, name: s.name, keywords: s.keywords })),
        }),
    }),

    rewriteCoverLetterParagraph: tool({
      description:
        'Rewrite ONE block of the cover letter, identified by 0-based index. The letter is split on blank lines into blocks: index 0 is the greeting, the last blocks are the closing/signature, so the body paragraphs are typically indices 1..n-2. Call previewCoverLetter first to see the indexed blocks. Rewrite existing content only — never invent facts. Only works when a cover letter already exists.',
      inputSchema: z.object({
        paragraphIndex: z.number().int().min(0).describe('0-based index of the block to replace (see previewCoverLetter).'),
        text: z.string().min(1).max(MAX_FIELD_LEN).describe('The new text for that block.'),
      }),
      execute: async (input) => {
        if (!ctx.coverLetter.trim()) return NO_COVER_LETTER;
        const { paragraphIndex, text } = sanitizeDeep(input);
        const blocks = splitCoverLetterBlocks(ctx.coverLetter);
        if (!Number.isInteger(paragraphIndex) || paragraphIndex < 0 || paragraphIndex >= blocks.length) {
          return `Error: paragraph index ${paragraphIndex} is out of range (0..${blocks.length - 1}); no change applied.`;
        }
        const trimmed = text.trim();
        if (!trimmed) return 'Error: the replacement text is empty; no change applied.';
        blocks[paragraphIndex] = trimmed;
        return applyCoverLetterEdit(ctx, deps, blocks.join('\n\n'), `Rewrote cover letter block ${paragraphIndex}.`);
      },
    }),

    setCoverLetterText: tool({
      description:
        'Replace the ENTIRE cover letter with new text (blocks separated by blank lines: greeting, body paragraphs, closing, signature). Use this to author a letter when none exists yet, or for a holistic rewrite. Rewrite existing facts only — never fabricate.',
      inputSchema: z.object({
        text: z.string().min(1).max(MAX_COVER_LETTER_LEN).describe('The full cover letter text.'),
      }),
      execute: async (input) => {
        const { text } = sanitizeDeep(input);
        return applyCoverLetterEdit(ctx, deps, text, 'Updated the cover letter.');
      },
    }),

    previewCoverLetter: tool({
      description:
        'Inspect the current working cover letter (after any edits this turn). Returns the letter split into 0-based indexed blocks so you can target rewriteCoverLetterParagraph. Only works when a cover letter exists.',
      inputSchema: z.object({}),
      // Sanitize the payload for the same reason previewResume does: the letter is
      // the user's own text, and returning it raw would re-inject it into the
      // model's next step. sanitizeDeep defangs injection vectors identically.
      execute: async () => {
        if (!ctx.coverLetter.trim()) return NO_COVER_LETTER;
        return sanitizeDeep({
          blocks: splitCoverLetterBlocks(ctx.coverLetter).map((text, index) => ({ index, text })),
        });
      },
    }),
  };
}

export type EditTools = ReturnType<typeof buildEditTools>;
