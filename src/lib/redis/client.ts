import { Redis } from "@upstash/redis";

/**
 * Create a per-request Upstash Redis client.
 * Workers require I/O bindings to be created within the request context.
 */
export function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL?.trim() ?? "",
    token: process.env.KV_REST_API_TOKEN?.trim() ?? "",
  });
}
