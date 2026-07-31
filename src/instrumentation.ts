/**
 * Next.js startup hook — runs once per server process, before the first request.
 *
 * Its only job today is to answer a question that was previously unanswerable
 * from outside a running container: **which models is this deployment actually
 * using?**
 *
 * `deploy.yml` forwards eight `AI_*` GitHub repository variables into the
 * container so a model or reasoning effort can be changed without a code change.
 * That override path has an ugly failure mode: a variable that never arrives
 * (typo, missing from the `envs:` list, unset upstream) falls back to the code
 * default silently — no error, no warning, and an operator who believes they
 * switched models. That is the same shape as the `minimal` effort incident,
 * where every layer read correctly and only the live API disagreed.
 *
 * One structured line at boot makes the resolved configuration observable via
 * `docker logs` / the `logs.yml` workflow, so "did my override apply?" is a
 * question with an answer.
 */

export async function register(): Promise<void> {
  // Only the Node.js server runtime: the edge runtime has no need for this and
  // pulling the agent module in there would drag the AI SDK into an edge bundle.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Imported lazily so this module stays cheap for any runtime that skips above.
  const [{ TIER_FINGERPRINTS }, { logger }] = await Promise.all([
    import('@/lib/agent/models'),
    import('@/server/log/logger'),
  ]);

  logger.info('ai.models.resolved', { ...TIER_FINGERPRINTS });
}
