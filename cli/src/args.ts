/**
 * Input helpers for the CLI: reading job descriptions / backgrounds from a file,
 * stdin (`-`), or an `@file` reference. Kept separate from cli.ts so they can be
 * unit-tested without spawning the process.
 */

import { readFileSync } from 'node:fs';

/** A thrown UsageError maps to exit code 2 in cli.ts. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

/** Read all of stdin synchronously (fd 0). Used for the `-` sentinel. */
export function readStdin(): string {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    throw new UsageError('failed to read from stdin');
  }
}

/**
 * Resolve a `<file|->` argument: `-` reads stdin, anything else is a file path.
 * Used for --jd, --background, --voice.
 */
export function readInput(fileOrDash: string): string {
  if (fileOrDash === '-') return readStdin();
  try {
    return readFileSync(fileOrDash, 'utf8');
  } catch {
    throw new UsageError(`cannot read file: ${fileOrDash}`);
  }
}

/**
 * Resolve a `<text|@file>` argument (used for --feedback): a leading `@` reads a
 * file, `-` reads stdin, otherwise the value is literal text.
 */
export function readFeedback(value: string): string {
  if (value === '-') return readStdin();
  if (value.startsWith('@')) {
    const path = value.slice(1);
    if (!path) throw new UsageError('--feedback @file requires a path after @');
    try {
      return readFileSync(path, 'utf8');
    } catch {
      throw new UsageError(`cannot read feedback file: ${path}`);
    }
  }
  return value;
}
