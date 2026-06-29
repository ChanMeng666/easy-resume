import { Suspense } from 'react';
import { AssistantContent } from './AssistantContent';

/**
 * Conversational resume editor page (P2-1). The route id is the generation job
 * (resume) being edited; AssistantContent opens/loads its thread and drives the
 * chat + live PDF. Editing is FREE (no credit).
 */
export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="min-h-screen baseline-grid bg-[#f0f0f0] flex items-center justify-center">
          <p className="font-mono text-sm font-medium text-muted-foreground animate-pulse">loading…</p>
        </div>
      }
    >
      <AssistantContent jobId={id} />
    </Suspense>
  );
}
