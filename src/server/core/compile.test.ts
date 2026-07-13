import { describe, it, expect } from 'vitest';
import { buildTypstArgs, compileTypstToPdf } from './compile';
import { CompilationError } from '@/server/errors/AppError';

describe('buildTypstArgs', () => {
  const inputPath = '/tmp/vitex-typst/abc/main.typ';
  const outputPath = '/tmp/vitex-typst/abc/main.pdf';
  const rootDir = '/tmp/vitex-typst/abc';
  const fontPath = '/app/fonts';

  it('confines Typst with --root pointing at the per-request dir', () => {
    const args = buildTypstArgs(inputPath, outputPath, rootDir);
    const rootIdx = args.indexOf('--root');
    expect(rootIdx).toBeGreaterThanOrEqual(0);
    expect(args[rootIdx + 1]).toBe(rootDir);
  });

  it('includes --font-path only when a font path is provided', () => {
    const withFont = buildTypstArgs(inputPath, outputPath, rootDir, fontPath);
    expect(withFont).toContain('--font-path');
    expect(withFont[withFont.indexOf('--font-path') + 1]).toBe(fontPath);

    const withoutFont = buildTypstArgs(inputPath, outputPath, rootDir);
    expect(withoutFont).not.toContain('--font-path');
  });

  it('emits the exact arg order with a font path', () => {
    expect(buildTypstArgs(inputPath, outputPath, rootDir, fontPath)).toEqual([
      'compile',
      '--root',
      rootDir,
      '--font-path',
      fontPath,
      inputPath,
      outputPath,
    ]);
  });

  it('emits the exact arg order without a font path', () => {
    expect(buildTypstArgs(inputPath, outputPath, rootDir)).toEqual([
      'compile',
      '--root',
      rootDir,
      inputPath,
      outputPath,
    ]);
  });
});

describe('compileTypstToPdf input validation', () => {
  // These inputs are rejected before any subprocess is spawned (the guards are
  // the first statements in compileTypstToPdf), so no `typst` binary is needed.
  it('rejects empty code with a CompilationError', async () => {
    await expect(compileTypstToPdf('')).rejects.toBeInstanceOf(CompilationError);
  });

  it('rejects code over the 500KB limit with a CompilationError', async () => {
    const tooBig = 'a'.repeat(500_001);
    await expect(compileTypstToPdf(tooBig)).rejects.toMatchObject({
      code: 'PIPELINE_COMPILATION_FAILED',
      details: { maxBytes: 500_000 },
    });
  });
});
