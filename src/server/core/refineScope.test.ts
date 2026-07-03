import { describe, it, expect } from 'vitest';
import { inferRefineScope } from './refineScope';

describe('inferRefineScope', () => {
  describe('cover_letter', () => {
    const coverLetterCases = [
      'make the cover letter warmer',
      'the cover-letter is too formal',
      'shorten my coverletter',
      'make the letter warmer',
      'rewrite the opening of the letter',
      'The Cover Letter needs a stronger closing', // case-insensitive
    ];
    for (const feedback of coverLetterCases) {
      it(`"${feedback}" → cover_letter`, () => {
        expect(inferRefineScope(feedback)).toBe('cover_letter');
      });
    }
  });

  describe('resume', () => {
    const resumeCases = [
      'tighten my summary',
      'add more data analysis skills',
      'reorder the experience section',
      'emphasize leadership', // nothing artifact-specific → default
      'make my resume more concise', // resume alone stays resume, not both
      'shorten the bullet points',
    ];
    for (const feedback of resumeCases) {
      it(`"${feedback}" → resume`, () => {
        expect(inferRefineScope(feedback)).toBe('resume');
      });
    }
  });

  describe('both', () => {
    const bothCases = [
      'update both',
      'change everything to be more concise',
      'make the resume and the cover letter more formal', // co-mention
      'polish my cv and letter',
      'apply this to all of it',
      'tone down the resume, and warm up the cover letter', // mixed mentions
    ];
    for (const feedback of bothCases) {
      it(`"${feedback}" → both`, () => {
        expect(inferRefineScope(feedback)).toBe('both');
      });
    }
  });

  it('is case-insensitive', () => {
    expect(inferRefineScope('MAKE THE COVER LETTER WARMER')).toBe('cover_letter');
    expect(inferRefineScope('UPDATE BOTH')).toBe('both');
    expect(inferRefineScope('TIGHTEN MY SUMMARY')).toBe('resume');
  });

  it('does not false-match "letter" inside unrelated words', () => {
    // "letterhead" / "lettering" must not trip the bare-letter hint.
    expect(inferRefineScope('add a letterhead style to the top')).toBe('resume');
  });

  it('treats an explicit both-phrase as both even without artifact words', () => {
    expect(inferRefineScope('improve everything')).toBe('both');
  });
});
