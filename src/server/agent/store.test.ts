import { describe, it, expect, vi } from 'vitest';

// store.ts top-level-imports the Neon client, whose module body runs
// `neon(process.env.DATABASE_URL!)`. Stub it so importing the store for its pure
// helpers never needs a real connection string (same approach as the
// applications/reserveJob store tests).
vi.mock('@/lib/db/client', () => ({ db: {} }));

import {
  assertTurnBounds,
  deriveThreadTitle,
  pickLatestSnapshot,
  selectSnapshotIdsToGc,
  type ResumeSnapshot,
  type StoredMessage,
  type TurnMessageInput,
} from './store';
import type { ResumeData } from '@/lib/validation/schema';

// The store's DB/owner-check paths (getThread → NotFound cross-user, appendTurn
// sequence assignment + unique-conflict retry) are exercised by integration runs
// against Postgres; here we pin the pure, money-irrelevant helpers.

function makeResume(label: string): ResumeData {
  return {
    basics: { name: 'Ada Lovelace', label, profiles: [] },
    education: [],
    skills: [],
    work: [],
    projects: [],
    achievements: [],
    certifications: [],
  };
}

function snapshot(label: string, typst = '#set page()'): ResumeSnapshot {
  return { resumeData: makeResume(label), typstCode: typst, templateId: 'two-column' };
}

function assistantMsg(seq: number, snap: ResumeSnapshot | null): Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'> {
  return { role: 'assistant', sequenceNum: seq, toolResult: snap };
}

describe('deriveThreadTitle', () => {
  it('prefers the job title', () => {
    expect(deriveThreadTitle({ title: 'Senior Engineer @ Acme', result: { resumeData: makeResume('x') } })).toBe(
      'Senior Engineer @ Acme'
    );
  });

  it('falls back to the candidate label when no title', () => {
    expect(deriveThreadTitle({ title: null, result: { resumeData: makeResume('Backend Developer') } })).toBe(
      'Backend Developer'
    );
  });

  it('falls back to a generic label when nothing is available', () => {
    expect(deriveThreadTitle({ title: '   ', result: null })).toBe('Resume chat');
    expect(deriveThreadTitle({})).toBe('Resume chat');
  });

  it('truncates an overly long title', () => {
    const long = 'A'.repeat(200);
    const out = deriveThreadTitle({ title: long });
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('pickLatestSnapshot', () => {
  const fallback = snapshot('Baseline');

  it('returns the fallback when there are no messages', () => {
    expect(pickLatestSnapshot([], fallback)).toBe(fallback);
  });

  it('returns the fallback when no assistant message carries a snapshot', () => {
    const msgs = [
      { role: 'user', sequenceNum: 1, toolResult: null },
      { role: 'tool', sequenceNum: 2, toolResult: { ok: true } },
    ] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[];
    expect(pickLatestSnapshot(msgs, fallback)).toBe(fallback);
  });

  it('returns the highest-sequence assistant snapshot regardless of input order', () => {
    const msgs = [
      assistantMsg(5, snapshot('Latest')),
      assistantMsg(1, snapshot('First')),
      assistantMsg(3, snapshot('Middle')),
    ];
    const out = pickLatestSnapshot(msgs, fallback);
    expect(out.resumeData.basics.label).toBe('Latest');
  });

  it('ignores assistant messages whose toolResult lacks a valid snapshot', () => {
    const msgs = [
      assistantMsg(2, snapshot('Valid')),
      { role: 'assistant', sequenceNum: 9, toolResult: { resumeData: undefined } },
      { role: 'assistant', sequenceNum: 10, toolResult: { resumeData: makeResume('NoTypst') } }, // missing typstCode
    ] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[];
    const out = pickLatestSnapshot(msgs, fallback);
    expect(out.resumeData.basics.label).toBe('Valid');
  });

  it('returns the latest VALID snapshot even when many higher-sequence assistant turns are text-only', () => {
    // Simulates a long no-edit chat after an edit: the real snapshot is at seq 2,
    // followed by 30 text-only assistant turns (null toolResult). pickLatestSnapshot
    // must skip the nulls and return the seq-2 snapshot, not the fallback.
    const msgs: Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[] = [
      assistantMsg(2, snapshot('RealEdit')),
      ...Array.from({ length: 30 }, (_, i) => ({ role: 'assistant', sequenceNum: i + 3, toolResult: null })),
    ];
    expect(pickLatestSnapshot(msgs, fallback).resumeData.basics.label).toBe('RealEdit');
  });

  it('skips a structurally-invalid stored snapshot rather than returning it', () => {
    const msgs = [
      assistantMsg(2, snapshot('Good')),
      { role: 'assistant', sequenceNum: 9, toolResult: { resumeData: { not: 'a resume' }, typstCode: '#x' } },
    ] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[];
    expect(pickLatestSnapshot(msgs, fallback).resumeData.basics.label).toBe('Good');
  });

  it('coerces a non-string templateId to the fallback', () => {
    const bad = { role: 'assistant', sequenceNum: 4, toolResult: { resumeData: makeResume('X'), typstCode: '#x', templateId: { evil: 1 } } };
    const out = pickLatestSnapshot([bad] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[], fallback);
    expect(out.templateId).toBe('two-column');
  });

  it('inherits the fallback templateId when a snapshot omits it', () => {
    const partial = { role: 'assistant', sequenceNum: 4, toolResult: { resumeData: makeResume('NoTemplate'), typstCode: '#x' } };
    const out = pickLatestSnapshot([partial] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[], fallback);
    expect(out.templateId).toBe('two-column');
    expect(out.resumeData.basics.label).toBe('NoTemplate');
  });

  it('carries the snapshot cover letter forward when the snapshot recorded one', () => {
    const fb: ResumeSnapshot = { ...snapshot('Baseline'), coverLetter: 'anchor letter', coverLetterTypst: 'anchorTypst' };
    const withLetter = { role: 'assistant', sequenceNum: 3, toolResult: { ...snapshot('Edited'), coverLetter: 'edited letter', coverLetterTypst: 'editedTypst' } };
    const out = pickLatestSnapshot([withLetter] as Pick<StoredMessage, 'role' | 'toolResult' | 'sequenceNum'>[], fb);
    expect(out.coverLetter).toBe('edited letter');
    expect(out.coverLetterTypst).toBe('editedTypst');
  });

  it('falls back to the anchor cover letter when the latest snapshot lacks letter fields (backward compat)', () => {
    // Simulates a resume-only edit snapshot OR an old pre-letter snapshot: it has
    // no coverLetter/coverLetterTypst, so the anchor's letter must be preserved
    // rather than dropped.
    const fb: ResumeSnapshot = { ...snapshot('Baseline'), coverLetter: 'anchor letter', coverLetterTypst: 'anchorTypst' };
    const noLetter = assistantMsg(4, snapshot('ResumeOnlyEdit'));
    const out = pickLatestSnapshot([noLetter], fb);
    expect(out.resumeData.basics.label).toBe('ResumeOnlyEdit');
    expect(out.coverLetter).toBe('anchor letter');
    expect(out.coverLetterTypst).toBe('anchorTypst');
  });
});

describe('assertTurnBounds', () => {
  it('accepts a normal turn (user + tool + assistant snapshot)', () => {
    const turn: TurnMessageInput[] = [
      { role: 'user', content: 'Tighten my summary' },
      { role: 'tool', content: '', toolName: 'editSummary', toolArgs: { summary: 'x' }, toolResult: { ok: true } },
      { role: 'assistant', content: 'Done — summary tightened.', toolResult: snapshot('Updated') },
    ];
    expect(() => assertTurnBounds(turn)).not.toThrow();
  });

  it('rejects a turn with too many messages', () => {
    const turn: TurnMessageInput[] = Array.from({ length: 65 }, () => ({ role: 'tool', content: '' }));
    expect(() => assertTurnBounds(turn)).toThrow(/too many messages/i);
  });

  it('rejects an over-long message content', () => {
    const turn: TurnMessageInput[] = [{ role: 'user', content: 'a'.repeat(100_001) }];
    expect(() => assertTurnBounds(turn)).toThrow(/too large/i);
  });

  it('rejects an oversized tool payload', () => {
    const turn: TurnMessageInput[] = [
      { role: 'tool', content: '', toolName: 'x', toolResult: { blob: 'z'.repeat(20_001) } },
    ];
    expect(() => assertTurnBounds(turn)).toThrow(/tool payload is too large/i);
  });

  it('rejects an assistant snapshot whose resume violates the manual-version bounds', () => {
    const huge = snapshot('Huge');
    // Blow past MANUAL_VERSION_MAX_NESTED (50) on a nested array.
    huge.resumeData.skills = [{ name: 'Many', keywords: Array.from({ length: 200 }, (_, i) => `k${i}`) }];
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: huge }];
    expect(() => assertTurnBounds(turn)).toThrow(/invalid or too large/i);
  });

  it('rejects an assistant snapshot with pathological typst length', () => {
    const big = snapshot('BigTypst', '#'.repeat(200_001));
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: big }];
    expect(() => assertTurnBounds(turn)).toThrow(/too large/i);
  });

  it('rejects an assistant snapshot carrying unexpected fields (no unbounded-JSON smuggling)', () => {
    const sneaky = { ...snapshot('Sneaky'), junk: 'z'.repeat(500_000) };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: sneaky }];
    expect(() => assertTurnBounds(turn)).toThrow(/unexpected fields/i);
  });

  it('counts UTF-8 bytes, not chars, for the tool-payload cap (CJK cannot undercount)', () => {
    // 7000 CJK chars = 21,000 UTF-8 bytes (> 20KB) but only ~7000 UTF-16 units, so
    // a char-length cap would wrongly pass it.
    const turn: TurnMessageInput[] = [
      { role: 'tool', content: '', toolName: 'x', toolResult: { blob: '語'.repeat(7000) } },
    ];
    expect(() => assertTurnBounds(turn)).toThrow(/tool payload is too large/i);
  });

  it('rejects an assistant snapshot whose typstCode is not a string', () => {
    const bad = { resumeData: makeResume('Bad'), typstCode: { huge: 'z'.repeat(500_000) }, templateId: 'two-column' };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: bad }];
    expect(() => assertTurnBounds(turn)).toThrow(/invalid or too large/i);
  });

  it('accepts a snapshot carrying cover letter fields within bounds', () => {
    const snap = { ...snapshot('WithLetter'), coverLetter: 'Dear Hiring Manager,\n\nHello.', coverLetterTypst: '#set page()\nDear' };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: snap }];
    expect(() => assertTurnBounds(turn)).not.toThrow();
  });

  it('still accepts an OLD snapshot without cover letter fields (backward compat)', () => {
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: snapshot('NoLetter') }];
    expect(() => assertTurnBounds(turn)).not.toThrow();
  });

  it('rejects a snapshot whose cover letter exceeds the size cap', () => {
    const snap = { ...snapshot('BigLetter'), coverLetter: 'z'.repeat(10_001) };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: snap }];
    expect(() => assertTurnBounds(turn)).toThrow(/cover letter snapshot is invalid or too large/i);
  });

  it('rejects a snapshot whose cover letter Typst exceeds the size cap', () => {
    const snap = { ...snapshot('BigLetterTypst'), coverLetter: 'ok', coverLetterTypst: '#'.repeat(200_001) };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: snap }];
    expect(() => assertTurnBounds(turn)).toThrow(/cover letter snapshot is invalid or too large/i);
  });

  it('rejects a snapshot whose cover letter is a non-string', () => {
    const snap = { ...snapshot('BadLetter'), coverLetter: { evil: 1 } as unknown as string };
    const turn: TurnMessageInput[] = [{ role: 'assistant', content: 'ok', toolResult: snap }];
    expect(() => assertTurnBounds(turn)).toThrow(/cover letter snapshot is invalid or too large/i);
  });
});

describe('selectSnapshotIdsToGc', () => {
  const row = (id: string, sequenceNum: number) => ({ id, sequenceNum });

  it('keeps the newest 3 snapshots (by sequence) and selects the rest for GC', () => {
    const rows = [row('a', 1), row('b', 5), row('c', 3), row('d', 9), row('e', 7)];
    // Newest three by sequence: d(9), e(7), b(5). GC: c(3), a(1) — newest-first order.
    expect(selectSnapshotIdsToGc(rows)).toEqual(['c', 'a']);
  });

  it('selects nothing when at or under the keep count', () => {
    expect(selectSnapshotIdsToGc([row('a', 1), row('b', 2), row('c', 3)])).toEqual([]);
    expect(selectSnapshotIdsToGc([])).toEqual([]);
  });

  it('does not mutate the input row order', () => {
    const rows = [row('a', 1), row('b', 5), row('c', 3), row('d', 9)];
    selectSnapshotIdsToGc(rows);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('honors a custom keep count', () => {
    const rows = [row('a', 1), row('b', 2), row('c', 3)];
    expect(selectSnapshotIdsToGc(rows, 1)).toEqual(['b', 'a']);
    expect(selectSnapshotIdsToGc(rows, 0)).toEqual(['c', 'b', 'a']);
  });
});
