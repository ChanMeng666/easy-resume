import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client instance.
 * Used for temporary share links with TTL support.
 * Note: Environment variables are trimmed to remove any whitespace/newlines
 * that may be added by shell piping during Vercel CLI env setup.
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL?.trim() ?? "",
  token: process.env.KV_REST_API_TOKEN?.trim() ?? "",
});
