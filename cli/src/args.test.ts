import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs so readInput/readFeedback can be driven without touching disk or
// a real stdin. readFileSync(0, ...) is the stdin path; a string is a file path.
const readFileSync = vi.fn();
vi.mock('node:fs', () => ({ readFileSync: (...args: unknown[]) => readFileSync(...args) }));

const { readInput, readFeedback, readStdin, UsageError } = await import('./args.js');

beforeEach(() => {
  readFileSync.mockReset();
  readFileSync.mockImplementation((target: unknown) => {
    if (target === 0) return 'FROM_STDIN';
    if (target === 'good.txt') return 'FROM_FILE';
    throw new Error('ENOENT');
  });
});

describe('readInput', () => {
  it("reads stdin for '-'", () => {
    expect(readInput('-')).toBe('FROM_STDIN');
    expect(readFileSync).toHaveBeenCalledWith(0, 'utf8');
  });

  it('reads a file path', () => {
    expect(readInput('good.txt')).toBe('FROM_FILE');
    expect(readFileSync).toHaveBeenCalledWith('good.txt', 'utf8');
  });

  it('raises a UsageError for a missing file', () => {
    expect(() => readInput('missing.txt')).toThrow(UsageError);
  });
});

describe('readFeedback', () => {
  it('returns literal text as-is', () => {
    expect(readFeedback('tighten the summary')).toBe('tighten the summary');
    expect(readFileSync).not.toHaveBeenCalled();
  });

  it("reads a file for '@file'", () => {
    expect(readFeedback('@good.txt')).toBe('FROM_FILE');
    expect(readFileSync).toHaveBeenCalledWith('good.txt', 'utf8');
  });

  it("reads stdin for '-'", () => {
    expect(readFeedback('-')).toBe('FROM_STDIN');
  });

  it('raises a UsageError for a bare @', () => {
    expect(() => readFeedback('@')).toThrow(UsageError);
  });

  it('raises a UsageError for a missing @file', () => {
    expect(() => readFeedback('@missing.txt')).toThrow(UsageError);
  });
});

describe('readStdin', () => {
  it('reads fd 0 as utf8', () => {
    expect(readStdin()).toBe('FROM_STDIN');
    expect(readFileSync).toHaveBeenCalledWith(0, 'utf8');
  });
});
