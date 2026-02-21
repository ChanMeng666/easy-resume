import { getDb } from "@/lib/db/client";
import { jobDescriptions, NewJobDescription } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Service for managing job description records.
 */
export const jdService = {
  /** Create a new job description record. */
  async create(data: Omit<NewJobDescription, "id" | "createdAt" | "updatedAt">) {
    const db = getDb();
    const [jd] = await db.insert(jobDescriptions).values(data).returning();
    return jd;
  },

  /** Get all job descriptions for a user. */
  async getByUser(userId: string) {
    const db = getDb();
    return db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.userId, userId))
      .orderBy(desc(jobDescriptions.createdAt));
  },

  /** Get a single job description by ID. */
  async getById(id: string) {
    const db = getDb();
    const [jd] = await db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.id, id))
      .limit(1);
    return jd;
  },

  /** Delete a job description. */
  async delete(id: string, userId: string) {
    const db = getDb();
    await db
      .delete(jobDescriptions)
      .where(and(eq(jobDescriptions.id, id), eq(jobDescriptions.userId, userId)));
  },
};
