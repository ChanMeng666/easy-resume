import { Redis } from "@upstash/redis";

/** Singleton Upstash Redis client. */
export const redis = new Redis({
  url: process.env.KV_REST_API_URL?.trim() ?? "",
  token: process.env.KV_REST_API_TOKEN?.trim() ?? "",
});

/** @deprecated Use `redis` directly. Kept for migration compatibility. */
export function getRedis() {
  return redis;
}
