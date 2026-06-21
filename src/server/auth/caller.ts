/**
 * Unified caller resolution.
 *
 * One helper resolves either an API key (Authorization: Bearer ...) OR a Stack
 * Auth cookie session into a `Caller`. This is what lets the web UI and AI
 * agents share the exact same core: the web client authenticates via cookies,
 * agents via a Bearer key — neither path requires the other.
 *
 * The cookie branch is unchanged behavior from the previous routes
 * (`stackServerApp.getUser()`), so existing logged-in flows are untouched.
 */

import 'server-only';
import { stackServerApp } from '@/lib/auth/stack';
import { verifyApiKey } from './apiKeys';
import type { Caller } from '@/server/core/pipeline.types';

export type { Caller };

/**
 * Resolve the caller from a request. Returns null if neither a valid Bearer key
 * nor a valid cookie session is present.
 */
export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    const key = await verifyApiKey(token);
    return key ? { userId: key.userId, via: 'api_key', apiKeyId: key.id } : null;
  }

  // Cookie session (web UI). Behavior identical to the prior routes.
  const user = await stackServerApp.getUser();
  return user ? { userId: user.id, via: 'session' } : null;
}
