// Ambient declarations for non-code assets imported for their side effects.
//
// TypeScript 6.0 tightened side-effect imports: `import "./globals.css"` now
// raises TS2882 ("Cannot find module or type declarations for side-effect
// import") unless the extension has a module declaration. Next's generated
// `next-env.d.ts` does not cover this case, and that file is regenerated on
// every build so it must not be edited.
//
// Declaring the module keeps `src/app/layout.tsx`'s stylesheet import valid
// without loosening anything else — the import has no runtime value, it is
// consumed by the bundler.
declare module "*.css";
