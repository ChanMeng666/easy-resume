import { defineConfig } from 'tsup';

// Single CLI entrypoint. The `vitex mcp` subcommand is dispatched inside cli.ts,
// so there is exactly one bundled file with a shebang. No dts (this is an app,
// not a library) and no minify (keep the published output auditable).
export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  dts: false,
  minify: false,
  sourcemap: false,
});
