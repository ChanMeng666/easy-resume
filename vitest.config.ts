import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Server code guards itself with `server-only`, which throws outside a
      // Next bundle. Stub it so pure logic can be unit-tested in Node.
      'server-only': path.resolve(root, 'test/stubs/server-only.ts'),
      '@': path.resolve(root, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
