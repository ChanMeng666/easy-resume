/**
 * Loading component displayed while page content is loading.
 * Required for Stack Auth's Suspense boundary requirements. Styled as a
 * "compile" proof loader to match the typeset identity.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center baseline-grid bg-[#f0f0f0]">
      <div className="flex items-center gap-3 rounded-xl border-2 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Compiling…
        </p>
      </div>
    </div>
  );
}
