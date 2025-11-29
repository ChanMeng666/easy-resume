import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client instance.
 * Used for temporary share links with TTL support.
 */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});
