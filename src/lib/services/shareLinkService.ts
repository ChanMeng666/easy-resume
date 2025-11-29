import { redis } from "@/lib/redis/client";
import { nanoid } from "nanoid";
import type { ResumeData } from "@/lib/validation/schema";

/**
 * Default TTL for temporary share links: 72 hours in seconds.
 */
const DEFAULT_TTL_SECONDS = 72 * 60 * 60;

/**
 * Redis key prefix for share links.
 */
const SHARE_LINK_PREFIX = "share:";

/**
 * Data stored for each share link.
 */
interface ShareLinkData {
  resumeId: string;
  userId: string;
  resumeData: ResumeData;
  templateId: string;
  title: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Service for managing temporary share links with Redis.
 * Links automatically expire after 72 hours.
 */
export const shareLinkService = {
  /**
   * Create a temporary share link for a resume.
   * @param resumeId - The resume ID
   * @param userId - The owner's user ID
   * @param resumeData - The resume content to share
   * @param templateId - The template used
   * @param title - The resume title
   * @param ttlSeconds - Time to live in seconds (default: 72 hours)
   * @returns The share token and expiry time
   */
  async create(
    resumeId: string,
    userId: string,
    resumeData: ResumeData,
    templateId: string,
    title: string,
    ttlSeconds: number = DEFAULT_TTL_SECONDS
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = nanoid(12);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);

    const data: ShareLinkData = {
      resumeId,
      userId,
      resumeData,
      templateId,
      title,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await redis.set(`${SHARE_LINK_PREFIX}${token}`, JSON.stringify(data), {
      ex: ttlSeconds,
    });

    return { token, expiresAt };
  },

  /**
   * Get a shared resume by token.
   * @param token - The share token
   * @returns The shared resume data or null if expired/not found
   */
  async get(token: string): Promise<ShareLinkData | null> {
    const data = await redis.get<string>(`${SHARE_LINK_PREFIX}${token}`);
    if (!data) {
      return null;
    }

    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  },

  /**
   * Revoke a share link before it expires.
   * @param token - The share token to revoke
   * @param userId - The user ID (for authorization check)
   * @returns True if revoked successfully
   */
  async revoke(token: string, userId: string): Promise<boolean> {
    const data = await this.get(token);
    if (!data || data.userId !== userId) {
      return false;
    }

    await redis.del(`${SHARE_LINK_PREFIX}${token}`);
    return true;
  },

  /**
   * Get the remaining TTL for a share link.
   * @param token - The share token
   * @returns TTL in seconds, or -1 if not found
   */
  async getTtl(token: string): Promise<number> {
    const ttl = await redis.ttl(`${SHARE_LINK_PREFIX}${token}`);
    return ttl;
  },

  /**
   * List all active share links for a user.
   * Note: This scans all keys, use sparingly.
   * @param userId - The user ID
   * @returns Array of active share tokens with their data
   */
  async listByUser(
    userId: string
  ): Promise<Array<{ token: string; data: ShareLinkData }>> {
    const keys = await redis.keys(`${SHARE_LINK_PREFIX}*`);
    const results: Array<{ token: string; data: ShareLinkData }> = [];

    for (const key of keys) {
      const data = await redis.get<string>(key);
      if (data) {
        try {
          const parsed: ShareLinkData =
            typeof data === "string" ? JSON.parse(data) : data;
          if (parsed.userId === userId) {
            results.push({
              token: key.replace(SHARE_LINK_PREFIX, ""),
              data: parsed,
            });
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    return results;
  },
};
