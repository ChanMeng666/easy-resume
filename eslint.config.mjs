// eslint-config-next@16 ships native flat-config exports (`./core-web-vitals`,
// `./typescript`), so `FlatCompat` from `@eslint/eslintrc` is no longer needed —
// and must not be reintroduced. Routing the old string-based presets through
// `compat.extends("next/core-web-vitals", "next/typescript")` builds a config
// object containing eslint-plugin-react-hooks' self-referencing plugin, and
// FlatCompat's JSON-serialization step throws on it:
//   Converting circular structure to JSON
//       --> starting at object with constructor 'Object'
//       |     property 'configs' -> object with constructor 'Object'
//       --- property 'react' closes the circle
// (upstream: eslint/eslint#20237). Importing the flat configs directly avoids
// FlatCompat entirely. Note eslint-config-next@16 declares peers on `eslint` and
// `typescript` only — it has NO peer dependency on `next`, so running it against
// next 15 is supported.
//
// The `lint` script is `eslint .`, not `next lint`: `next lint` is deprecated as
// of Next 15.5 and removed in Next 16, so this is also a prerequisite for that
// upgrade.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next@16 additionally turns on the React Compiler rule
    // family as errors. `react-hooks/set-state-in-effect` fires 6 times in this
    // codebase and every hit is the same shape: a mount-time, one-shot read of a
    // source that does not exist during SSR (sessionStorage, `window`, or a
    // fetch) followed by setState. Under the App Router that is the normal way
    // to do it. Making those Compiler-clean means restructuring the editor's
    // job-load path and the homepage -> editor handoff — the entry to the
    // generation flow — so it needs its own change with real browser
    // verification rather than riding along with a lint-infrastructure swap.
    //
    // Downgraded to `warn` so the violations stay visible without masking real
    // failures from every other rule, all of which remain errors. Tracked in
    // issue #103; remove this override once those six call sites are reworked.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    "src/lib/gradient/Gradient.js",
    "cli/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
