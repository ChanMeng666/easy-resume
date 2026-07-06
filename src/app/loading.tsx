/**
 * Loading component displayed while page content is loading.
 * Required for Stack Auth's Suspense boundary requirements. Minimal centered
 * state — a periwinkle spinner over the Paper canvas.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-periwinkle border-t-transparent" />
        <p className="text-body-sm text-muted-foreground">Preparing…</p>
      </div>
    </div>
  );
}
