/**
 * Liveness probe for the container HEALTHCHECK and the deploy health gate.
 *
 * Deliberately dependency-free: no DB call, no auth, no rate limit. It answers
 * only "is this process up and serving HTTP", so it can never flap on a
 * downstream outage (Neon, OpenAI, Stripe, R2). Readiness/DB checks belong
 * elsewhere — keep this one incapable of failing for the wrong reason.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true });
}
